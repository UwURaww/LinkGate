import crypto from "crypto";

export const TOKEN_MAX_AGE_MS = 1000 * 60 * 30; // 30 minutes to finish a gate

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

/**
 * Creates a signed token that proves "this visitor was issued this gate,
 * with exactly this many steps, at this time". The real destination link
 * is never embedded anywhere the client can read it directly - it's only
 * handed over once this token comes back validated. This isn't meant to be
 * unbreakable (no client-side check ever fully is), it just means the link
 * can't be lifted from page source or the initial network response.
 */
export function issueGateToken(slug: string, stepCount: number): string {
  const ts = Date.now().toString();
  const payload = `${slug}|${stepCount}|${ts}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export interface VerifiedToken {
  slug: string;
  stepCount: number;
  issuedAt: number;
}

export function verifyGateToken(token: string): VerifiedToken | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (sign(payload) !== sig) return null;

  const [slug, stepCountStr, tsStr] = payload.split("|");
  const stepCount = Number(stepCountStr);
  const issuedAt = Number(tsStr);
  if (!slug || Number.isNaN(stepCount) || Number.isNaN(issuedAt)) return null;
  if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return null;

  return { slug, stepCount, issuedAt };
}
