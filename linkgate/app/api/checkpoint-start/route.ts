import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/blob";
import { updateSecurity } from "@/lib/security-store";
import { TOKEN_MAX_AGE_MS, issueGateToken, verifyChallengeAnswer, verifyGateToken, VerifiedToken } from "@/lib/token";
import {
  getClientIp,
  hashToken,
  isLocked,
  isTokenUsed,
  markTokenUsed,
  pruneSecurity,
  recordFailedAttempt,
} from "@/lib/security";
import { PublicGate } from "@/lib/types";

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
  const { startToken, challengeAnswer, turnstileToken, humanInteraction } = body || {};

  if (typeof startToken !== "string") {
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

      const result = verifyGateToken(startToken);
      if (!result) {
        recordFailedAttempt(security, ip);
        return { lockoutMs: 0, ok: false, verified: null, tokenHash: "" };
      }

      const hash = hashToken(startToken);
      if (isTokenUsed(security, hash)) {
        recordFailedAttempt(security, ip);
        return { lockoutMs: 0, ok: false, verified: null, tokenHash: "" };
      }

      return { lockoutMs: 0, ok: true, verified: result, tokenHash: hash };
    });
  } catch (err) {
    console.error("Failed to check security state:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (precheck.lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(precheck.lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }
  if (!precheck.ok || !precheck.verified) {
    return NextResponse.json({ error: "This check expired. Refresh the page and try again." }, { status: 401 });
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
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
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
      markTokenUsed(security, precheck.tokenHash, verified.issuedAt + TOKEN_MAX_AGE_MS);
    });
  } catch (err) {
    console.error("Failed to mark start token used:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const activeSteps = (gate.shuffleSteps ? shuffle(gate.steps) : gate.steps).filter(
    (s) => s.type !== "verify"
  );
  const publicGate: PublicGate = {
    id: gate.id,
    slug: gate.slug,
    title: gate.title,
    steps: activeSteps,
    createdAt: gate.createdAt,
    updatedAt: gate.updatedAt,
    bannerUrl: gate.bannerUrl,
    bannerType: gate.bannerType,
    backgroundTheme: gate.backgroundTheme,
    shuffleSteps: gate.shuffleSteps,
  };
  const token = issueGateToken(gate.slug, gate.steps.length);

  return NextResponse.json({ gate: publicGate, token });
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
