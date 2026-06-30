import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";
import { readEffectiveStats } from "@/lib/stats";
import { slugify } from "@/lib/id";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const store = await readStore();
  const gate = store.gates.find((g) => g.id === params.id);
  if (!gate) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
  const stats = await readEffectiveStats(gate.id, gate.stats);
  return NextResponse.json({ gate: { ...gate, stats } });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  try {
    const updated = await updateStore((data) => {
      const gate = data.gates.find((g) => g.id === params.id);
      if (!gate) return null;

      if (typeof body.title === "string") gate.title = body.title;
      if (typeof body.destinationUrl === "string") gate.destinationUrl = body.destinationUrl;
      if (Array.isArray(body.steps)) gate.steps = body.steps;
      if (typeof body.slug === "string" && body.slug.trim()) {
        const newSlug = slugify(body.slug);
        const taken = data.gates.some((g) => g.slug === newSlug && g.id !== gate.id);
        if (!taken) gate.slug = newSlug;
      }
      if (typeof body.bannerUrl === "string") gate.bannerUrl = body.bannerUrl || undefined;
      if (["image", "video", "youtube"].includes(body.bannerType)) gate.bannerType = body.bannerType;
      if (body.backgroundTheme === "" || body.backgroundTheme === null) {
        gate.backgroundTheme = undefined;
      } else if (["solid", "starfield", "matrix", "grid", "nebula"].includes(body.backgroundTheme)) {
        gate.backgroundTheme = body.backgroundTheme;
      }
      if (typeof body.shuffleSteps === "boolean") gate.shuffleSteps = body.shuffleSteps;
      if (typeof body.requireHumanCheck === "boolean") gate.requireHumanCheck = body.requireHumanCheck;
      gate.updatedAt = new Date().toISOString();
      return gate;
    });

    if (!updated) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
    return NextResponse.json({ gate: updated });
  } catch (err) {
    console.error("Failed to update gate:", err);
    return NextResponse.json(
      { error: "Couldn't save the gate. Check that Blob storage is connected." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const removed = await updateStore((data) => {
      const before = data.gates.length;
      data.gates = data.gates.filter((g) => g.id !== params.id);
      return data.gates.length < before;
    });

    if (!removed) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete gate:", err);
    return NextResponse.json(
      { error: "Couldn't delete the gate. Check that Blob storage is connected." },
      { status: 500 }
    );
  }
}
