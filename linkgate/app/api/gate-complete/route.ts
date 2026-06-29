import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/blob";
import { updateSecurity } from "@/lib/security-store";
import { incrementGateStat } from "@/lib/stats";
import { TOKEN_MAX_AGE_MS, verifyChallengeAnswer, verifyGateToken, VerifiedToken } from "@/lib/token";
import {
  getClientIp,
  hashToken,
  isLocked,
  isTokenUsed,
  markTokenUsed,
  pruneSecurity,
  recordFailedAttempt,
} from "@/lib/security";

type InvalidReason = "bad-token" | "already-used" | "not-found" | "stale" | "incomplete" | "wrong-answer" | "";

const ERROR_MESSAGES: Record<Exclude<InvalidReason, "">, { message: string; status: number }> = {
  "bad-token": { message: "This link expired. Refresh the page and try again.", status: 401 },
  "already-used": { message: "This link was already used. Refresh the page to get a new one.", status: 409 },
  "not-found": { message: "This gate no longer exists.", status: 404 },
  stale: { message: "This link expired. Refresh the page and try again.", status: 401 },
  incomplete: { message: "Couldn't verify the steps were completed.", status: 400 },
  "wrong-answer": { message: "That answer wasn't right. Refresh the page and try again.", status: 400 },
};

function errorResponse(reason: Exclude<InvalidReason, "">) {
  const { message, status } = ERROR_MESSAGES[reason];
  return NextResponse.json({ error: message }, { status });
}

async function recordFailure(ip: string) {
  try {
    await updateSecurity((security) => {
      pruneSecurity(security);
      recordFailedAttempt(security, ip);
    });
  } catch (err) {
    console.error("Failed to record a failed attempt (non-fatal):", err);
  }
}

async function verifyTurnstile(secret: string, responseToken: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: responseToken, remoteip: ip }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const { slug, token, completedStepIds, challengeAnswer, turnstileToken, humanInteraction } = body || {};

  if (typeof slug !== "string" || typeof token !== "string" || !Array.isArray(completedStepIds)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // --- Step 1: lockout, token signature/expiry, and replay check ---
  let lockoutMs = 0;
  let invalidReason: InvalidReason = "";
  let verified: VerifiedToken | null = null;
  let tokenHash = "";

  try {
    await updateSecurity((security) => {
      pruneSecurity(security);

      const lock = isLocked(security, ip);
      if (lock.locked) {
        lockoutMs = lock.retryAfterMs || 0;
        return;
      }

      const result = verifyGateToken(token);
      if (!result || result.slug !== slug) {
        invalidReason = "bad-token";
        recordFailedAttempt(security, ip);
        return;
      }

      const hash = hashToken(token);
      if (isTokenUsed(security, hash)) {
        invalidReason = "already-used";
        recordFailedAttempt(security, ip);
        return;
      }

      verified = result;
      tokenHash = hash;
    });
  } catch (err) {
    console.error("Failed to check security state:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  if (lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }
  if (invalidReason) return errorResponse(invalidReason);
  if (!verified) return errorResponse("bad-token");

  // --- Step 2: look up the gate (read-only - admin edits write here, not public traffic) ---
  let store;
  try {
    store = await readStore();
  } catch (err) {
    console.error("Failed to load gate config:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  const gate = store.gates.find((g) => g.slug === slug);
  if (!gate) return errorResponse("not-found");

  if (gate.steps.length !== verified.stepCount) {
    await recordFailure(ip);
    return errorResponse("stale");
  }

  const requiredIds = gate.steps.filter((s) => !s.skippable).map((s) => s.id);
  const completedSet = new Set(completedStepIds);
  const allRequiredDone = requiredIds.every((id) => completedSet.has(id));
  if (!allRequiredDone) {
    await recordFailure(ip);
    return errorResponse("incomplete");
  }

  // Browsers mark script-dispatched clicks (element.click(), dispatchEvent())
  // as untrusted - real engine-level user input, including keyboard/touch
  // activation, is always trusted. A userscript driving the page via
  // .click() calls can't fake this; it's enforced by the browser, not by
  // page JS. (It does nothing against a script that skips the page entirely
  // and calls this API directly with a fabricated true - that's still only
  // as defended as the token/answer checks above and below allow.)
  if (humanInteraction === false) {
    await recordFailure(ip);
    return errorResponse("incomplete");
  }

  // A real visitor reading steps and clicking through them takes some
  // minimum amount of time; a script blasting through doesn't. Generous on
  // purpose to avoid flagging genuinely fast humans on short gates.
  const minExpectedMs = Math.max(1200, gate.steps.length * 450);
  if (Date.now() - verified.issuedAt < minExpectedMs) {
    await recordFailure(ip);
    return errorResponse("incomplete");
  }

  const requiresVerify = gate.steps.some((s) => s.type === "verify" && !s.skippable);
  if (requiresVerify) {
    const usingTurnstile = !!store.settings.turnstileSiteKey && !!store.settings.turnstileSecretKey;
    let ok = false;
    if (usingTurnstile) {
      ok =
        typeof turnstileToken === "string" &&
        turnstileToken.length > 0 &&
        (await verifyTurnstile(store.settings.turnstileSecretKey as string, turnstileToken, ip));
    } else {
      const submitted = typeof challengeAnswer === "number" ? challengeAnswer : Number(challengeAnswer);
      ok = verifyChallengeAnswer(verified.challengeAnswerHash, submitted);
    }
    if (!ok) {
      await recordFailure(ip);
      return errorResponse("wrong-answer");
    }
  }

  // --- Step 3: success - burn the token, bump the per-gate counter ---
  try {
    await updateSecurity((security) => {
      markTokenUsed(security, tokenHash, (verified as VerifiedToken).issuedAt + TOKEN_MAX_AGE_MS);
    });
  } catch (err) {
    console.error("Failed to mark token used:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  try {
    await incrementGateStat(gate.id, "completions", gate.stats);
  } catch (err) {
    console.error("Failed to record completion (non-fatal):", err);
  }

  if (store.settings.discordWebhookUrl) {
    fetch(store.settings.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `Gate "${gate.title}" was just unlocked.` }),
    }).catch(() => {
      /* notifications are best-effort, never block the redirect on them */
    });
  }

  return NextResponse.json({ destinationUrl: gate.destinationUrl });
}
