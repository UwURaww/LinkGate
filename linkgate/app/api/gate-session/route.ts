import { NextRequest, NextResponse } from "next/server";
import { updateStore } from "@/lib/blob";
import { issueGateToken } from "@/lib/token";
import { PublicGate } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = body?.slug;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const gate = await updateStore((data) => {
    const g = data.gates.find((gate) => gate.slug === slug);
    if (g) g.stats.views += 1;
    return g;
  });

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
  };

  const token = issueGateToken(gate.slug, gate.steps.length);

  return NextResponse.json({ gate: publicGate, token });
}
