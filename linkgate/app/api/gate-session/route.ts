import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/blob";
import { updateSecurity } from "@/lib/security-store";
import { incrementGateStat } from "@/lib/stats";
import { generateMathChallenge, issueGateToken } from "@/lib/token";
import {
  getClientIp,
  isLocked,
  isSessionRateLimited,
  pruneSecurity,
  recordSessionStart,
} from "@/lib/security";
import { PublicGate } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const slug = body?.slug;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  let lockoutMs = 0;
  let rateLimited = false;

  try {
    await updateSecurity((security) => {
      pruneSecurity(security);
      const lock = isLocked(security, ip);
      if (lock.locked) {
        lockoutMs = lock.retryAfterMs || 0;
        return;
      }
      if (isSessionRateLimited(security, ip)) {
        rateLimited = true;
        return;
      }
      recordSessionStart(security, ip);
    });
  } catch (err) {
    console.error("Failed to check session limits:", err);
    return NextResponse.json({ error: "Something went wrong loading this link." }, { status: 500 });
  }

  if (lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }

  if (rateLimited) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again shortly." }, { status: 429 });
  }

  let store;
  try {
    store = await readStore();
  } catch (err) {
    console.error("Failed to load gate:", err);
    return NextResponse.json({ error: "Something went wrong loading this link." }, { status: 500 });
  }

  const gate = store.gates.find((g) => g.slug === slug);
  if (!gate) {
    return NextResponse.json({ error: "This link doesn't exist or was removed." }, { status: 404 });
  }

  incrementGateStat(gate.id, "views", gate.stats).catch((err) => {
    console.error("Failed to record a view (non-fatal):", err);
  });

  const hasVerifyStep = gate.steps.some((s) => s.type === "verify");
  const usingTurnstile = hasVerifyStep && !!store.settings.turnstileSiteKey && !!store.settings.turnstileSecretKey;
  let challengeQuestion: string | undefined;
  let answerHash: string | undefined;

  if (hasVerifyStep && !usingTurnstile) {
    const challenge = generateMathChallenge();
    challengeQuestion = challenge.question;
    answerHash = challenge.answerHash;
  }

  const steps = gate.shuffleSteps ? shuffle(gate.steps) : gate.steps;

  const publicGate: PublicGate = {
    id: gate.id,
    slug: gate.slug,
    title: gate.title,
    steps,
    createdAt: gate.createdAt,
    updatedAt: gate.updatedAt,
    bannerUrl: gate.bannerUrl,
    bannerType: gate.bannerType,
    backgroundTheme: gate.backgroundTheme,
    shuffleSteps: gate.shuffleSteps,
  };

  const token = issueGateToken(gate.slug, gate.steps.length, answerHash);

  return NextResponse.json({ gate: publicGate, token, challengeQuestion });
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
