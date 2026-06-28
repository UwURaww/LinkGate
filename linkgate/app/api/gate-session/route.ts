import { NextRequest, NextResponse } from "next/server";
import { updateStore } from "@/lib/blob";
import { issueGateToken } from "@/lib/token";
import { ensureSecurity, getClientIp, isLocked, pruneSecurity } from "@/lib/security";
import { Gate, PublicGate } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const slug = body?.slug;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  let lockoutMs = 0;
  let gate: Gate | undefined;

  try {
    await updateStore((data) => {
      ensureSecurity(data);
      pruneSecurity(data.security);

      const lock = isLocked(data.security, ip);
      if (lock.locked) {
        lockoutMs = lock.retryAfterMs || 0;
        return;
      }

      const g = data.gates.find((gate) => gate.slug === slug);
      if (g) g.stats.views += 1;
      gate = g;
    });
  } catch (err) {
    console.error("Failed to start gate session:", err);
    return NextResponse.json({ error: "Something went wrong loading this link." }, { status: 500 });
  }

  if (lockoutMs > 0) {
    return NextResponse.json(
      { error: `Too many invalid attempts from this connection. Try again in ${Math.ceil(lockoutMs / 60000)} minute(s).` },
      { status: 429 }
    );
  }

  if (!gate) {
    return NextResponse.json({ error: "This link doesn't exist or was removed." }, { status: 404 });
  }

  const publicGate: PublicGate = {
    id: gate.id,
    slug: gate.slug,
    title: gate.title,
    steps: gate.steps,
    createdAt: gate.createdAt,
    updatedAt: gate.updatedAt,
    bannerUrl: gate.bannerUrl,
    bannerType: gate.bannerType,
    backgroundTheme: gate.backgroundTheme,
  };

  const token = issueGateToken(gate.slug, gate.steps.length);

  return NextResponse.json({ gate: publicGate, token });
}
