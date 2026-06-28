// Best-effort abuse brake: if the same IP racks up several failed
// gate-complete attempts in a short window (the signature of someone
// poking the API directly rather than a normal visitor), it gets a
// temporary cooldown.
//
// Honest limitation: this lives in memory inside one serverless instance.
// On Vercel that instance can be recycled between requests, especially
// under low traffic, so this raises the cost of casual abuse rather than
// guaranteeing a hard block. For a hardened version, swap this for a
// shared store (e.g. Upstash Redis) the same way the RLLE project's
// backend does it.

interface Bucket {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

const WINDOW_MS = 10 * 60 * 1000; // count failures within a 10 minute window
const MAX_FAILURES = 5; // this many failures trips the cooldown
const BLOCK_MS = 20 * 60 * 1000; // cooldown length

const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function checkBlocked(ip: string): { blocked: boolean; retryAfterSeconds?: number } {
  const bucket = buckets.get(ip);
  if (!bucket) return { blocked: false };
  const remaining = bucket.blockedUntil - Date.now();
  if (remaining > 0) {
    return { blocked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
  }
  return { blocked: false };
}

export function recordFailure(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(ip, { failures: 1, windowStart: now, blockedUntil: 0 });
    return;
  }

  bucket.failures += 1;
  if (bucket.failures >= MAX_FAILURES) {
    bucket.blockedUntil = now + BLOCK_MS;
  }
}

export function recordSuccess(ip: string): void {
  buckets.delete(ip);
}
