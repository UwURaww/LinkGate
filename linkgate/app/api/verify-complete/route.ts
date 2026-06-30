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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const { token, challengeAnswer, turnstileToken, humanInteraction } = body || {};

  if (typeof token !== "string") {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  interface Precheck {
    lockoutMs: number;
    ok: boolean;
    verified: VerifiedToken | null;
    tokenHash: string;
  }

  let precheck: Precheck;
  try {
    precheck = await updateSecurity((security): Precheck => {
      pruneSecurity(security);

      const lock = isLocked(security, ip);
      if (lock.locked) {
        return { lockoutMs: lock.retryAfterMs || 0, ok: false, verified: null, tokenHash: "" };
      }

      const result = verifyGateToken(token);
      if (!result) {
        recordFailedAttempt(security, ip);
        return { lockoutMs: 0, ok: false, verified: null, tokenHash: "" };
      }

      const hash = hashToken(token);
      if (isTokenUsed(security, hash)) {
        recordFailedAttempt(security, ip);
        return { lockoutMs: 0, ok: false, verified: null, tokenHash: "" };
      }

      return { lockoutMs: 0, ok: true, verified: result, tokenHash: hash };
    });
  } catch (err) {
    console.error("Failed to check security state:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  if (precheck.lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(precheck.lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }
  if (!precheck.ok || !precheck.verified) {
    return NextResponse.json(
      { error: "This check expired. Refresh the page and try again." },
      { status: 401 }
    );
  }

  const verified = precheck.verified as VerifiedToken;

  if (humanInteraction === false) {
    await recordFailure(ip);
    return NextResponse.json({ error: "Couldn't verify that. Refresh the page and try again." }, { status: 400 });
  }
  if (Date.now() - verified.issuedAt < 800) {
    await recordFailure(ip);
    return NextResponse.json({ error: "Couldn't verify that. Refresh the page and try again." }, { status: 400 });
  }

  let store;
  try {
    store = await readStore();
  } catch (err) {
    console.error("Failed to load gate config:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  const gate = store.gates.find((g) => g.slug === verified.slug);
  if (!gate) {
    return NextResponse.json({ error: "This gate no longer exists." }, { status: 404 });
  }

  const usingTurnstile = !!store.settings.turnstileSiteKey && !!store.settings.turnstileSecretKey;
  let answerOk = false;
  if (usingTurnstile) {
    answerOk =
      typeof turnstileToken === "string" &&
      turnstileToken.length > 0 &&
      (await verifyTurnstile(store.settings.turnstileSecretKey as string, turnstileToken, ip));
  } else {
    const submitted = typeof challengeAnswer === "number" ? challengeAnswer : Number(challengeAnswer);
    answerOk = verifyChallengeAnswer(verified.challengeAnswerHash, submitted);
  }

  if (!answerOk) {
    await recordFailure(ip);
    return NextResponse.json({ error: "That answer wasn't right. Refresh the page and try again." }, { status: 400 });
  }

  try {
    await updateSecurity((security) => {
      markTokenUsed(security, precheck.tokenHash, (verified as VerifiedToken).issuedAt + TOKEN_MAX_AGE_MS);
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
