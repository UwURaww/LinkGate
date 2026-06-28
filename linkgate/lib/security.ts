import crypto from "crypto";
import { NextRequest } from "next/server";
import { SecurityState, StoreData } from "./types";

const FAILED_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // count attempts within this window
const FAILED_ATTEMPT_THRESHOLD = 5; // this many invalid attempts...
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // ...triggers a lockout this long

/** Best-effort client IP from the headers Vercel forwards. */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function ensureSecurity(data: StoreData): void {
  if (!data.security) {
    data.security = { failedAttempts: {}, usedTokens: {} };
  }
}

export function isLocked(
  security: SecurityState,
  ip: string
): { locked: boolean; retryAfterMs?: number } {
  const entry = security.failedAttempts[ip];
  if (!entry?.lockedUntil) return { locked: false };
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, retryAfterMs: remaining };
}

/** Call this whenever a request looks like a bypass attempt (forged token,
 * replayed token, steps claimed complete that weren't). After enough of
 * these from one IP within the window, that IP gets locked out for a while. */
export function recordFailedAttempt(security: SecurityState, ip: string): void {
  const now = Date.now();
  const entry = security.failedAttempts[ip];
  if (!entry || now - entry.firstAt > FAILED_ATTEMPT_WINDOW_MS) {
    security.failedAttempts[ip] = { count: 1, firstAt: now };
    return;
  }
  entry.count += 1;
  if (entry.count >= FAILED_ATTEMPT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isTokenUsed(security: SecurityState, tokenHash: string): boolean {
  const exp = security.usedTokens[tokenHash];
  return typeof exp === "number" && exp > Date.now();
}

export function markTokenUsed(security: SecurityState, tokenHash: string, expiresAt: number): void {
  security.usedTokens[tokenHash] = expiresAt;
}

/** Drop expired lockouts/tokens so this doesn't grow forever. Call on every write. */
export function pruneSecurity(security: SecurityState): void {
  const now = Date.now();
  for (const [ip, entry] of Object.entries(security.failedAttempts)) {
    const stillLocked = !!entry.lockedUntil && entry.lockedUntil > now;
    const withinWindow = now - entry.firstAt <= FAILED_ATTEMPT_WINDOW_MS;
    if (!stillLocked && !withinWindow) delete security.failedAttempts[ip];
  }
  for (const [hash, exp] of Object.entries(security.usedTokens)) {
    if (exp <= now) delete security.usedTokens[hash];
  }
}
