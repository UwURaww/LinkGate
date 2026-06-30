import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "linkgate_admin";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

/** Builds the value stored in the admin session cookie after a correct login. */
export function createSessionCookieValue(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

/** Returns true if a session cookie value is correctly signed and not expired. */
export function isValidSession(value: string | undefined | null): boolean {
  if (!value) return false;
  const [ts, sig] = value.split(".");
  if (!ts || !sig) return false;
  if (sig !== sign(ts)) return false;
  const age = Date.now() - Number(ts);
  return age >= 0 && age < SESSION_MAX_AGE_MS;
}

export function checkPassword(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  // Constant-time-ish comparison to avoid trivial timing leaks.
  const a = Buffer.from(input);
  const b = Buffer.from(real);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Convenience check for route handlers: is the caller a signed-in admin? */
export function hasAdminSession(): boolean {
  const value = cookies().get(ADMIN_COOKIE)?.value;
  return isValidSession(value);
}
