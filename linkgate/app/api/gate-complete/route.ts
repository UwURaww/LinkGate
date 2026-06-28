import { NextRequest, NextResponse } from "next/server";
import { updateStore } from "@/lib/blob";
import { TOKEN_MAX_AGE_MS, verifyGateToken } from "@/lib/token";
import {
  ensureSecurity,
  getClientIp,
  hashToken,
  isLocked,
  isTokenUsed,
  markTokenUsed,
  pruneSecurity,
  recordFailedAttempt,
} from "@/lib/security";

type InvalidReason = "bad-token" | "already-used" | "not-found" | "stale" | "incomplete" | "";

const ERROR_MESSAGES: Record<Exclude<InvalidReason, "">, { message: string; status: number }> = {
  "bad-token": { message: "This link expired. Refresh the page and try again.", status: 401 },
  "already-used": { message: "This link was already used. Refresh the page to get a new one.", status: 409 },
  "not-found": { message: "This gate no longer exists.", status: 404 },
  stale: { message: "This link expired. Refresh the page and try again.", status: 401 },
  incomplete: { message: "Couldn't verify the steps were completed.", status: 400 },
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const { slug, token, completedStepIds } = body || {};

  if (typeof slug !== "string" || typeof token !== "string" || !Array.isArray(completedStepIds)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  let destinationUrl: string | null = null;
  let webhookUrl: string | undefined;
  let gateTitle = "";
  let lockoutMs = 0;
  let invalidReason: InvalidReason = "";

  try {
    await updateStore((data) => {
      ensureSecurity(data);
      pruneSecurity(data.security);

      const lock = isLocked(data.security, ip);
      if (lock.locked) {
        lockoutMs = lock.retryAfterMs || 0;
        return;
      }

      const verified = verifyGateToken(token);
      if (!verified || verified.slug !== slug) {
        invalidReason = "bad-token";
        recordFailedAttempt(data.security, ip);
        return;
      }

      const tokenHash = hashToken(token);
      if (isTokenUsed(data.security, tokenHash)) {
        invalidReason = "already-used";
        recordFailedAttempt(data.security, ip);
        return;
      }

      const gate = data.gates.find((g) => g.slug === slug);
      if (!gate) {
        invalidReason = "not-found";
        return;
      }

      // The token was issued for a specific number of steps. If the gate was
      // edited since, the token no longer matches and we bail out.
      if (gate.steps.length !== verified.stepCount) {
        invalidReason = "stale";
        recordFailedAttempt(data.security, ip);
        return;
      }

      const requiredIds = gate.steps.filter((s) => !s.skippable).map((s) => s.id);
      const completedSet = new Set(completedStepIds);
      const allRequiredDone = requiredIds.every((id) => completedSet.has(id));
      if (!allRequiredDone) {
        invalidReason = "incomplete";
        recordFailedAttempt(data.security, ip);
        return;
      }

      markTokenUsed(data.security, tokenHash, verified.issuedAt + TOKEN_MAX_AGE_MS);
      gate.stats.completions += 1;
      destinationUrl = gate.destinationUrl;
      gateTitle = gate.title;
      webhookUrl = data.settings.discordWebhookUrl;
    });
  } catch (err) {
    console.error("Failed to complete gate:", err);
    return NextResponse.json({ error: "Something went wrong finishing this link." }, { status: 500 });
  }

  if (lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }

  if (!destinationUrl) {
    const fallback = { message: "Couldn't verify the steps were completed.", status: 400 };
    const { message, status } = invalidReason ? ERROR_MESSAGES[invalidReason] : fallback;
    return NextResponse.json({ error: message }, { status });
  }

  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `Gate "${gateTitle}" was just unlocked.` }),
    }).catch(() => {
      /* notifications are best-effort, never block the redirect on them */
    });
  }

  return NextResponse.json({ destinationUrl });
}
