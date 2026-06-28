import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";
import { newId, randomSlug, slugify } from "@/lib/id";
import { Gate, GateStep } from "@/lib/types";

export async function GET() {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const store = await readStore();
  return NextResponse.json({ gates: store.gates });
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.destinationUrl !== "string") {
    return NextResponse.json({ error: "Title and destination link are required." }, { status: 400 });
  }

  const steps: GateStep[] = Array.isArray(body.steps) ? body.steps : [];

  const now = new Date().toISOString();
  const requestedSlug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : "";

  const gate: Gate = {
    id: newId("gate"),
    slug: requestedSlug || randomSlug(),
    title: body.title,
    destinationUrl: body.destinationUrl,
    steps,
    stats: { views: 0, completions: 0 },
    createdAt: now,
    updatedAt: now,
    bannerUrl: typeof body.bannerUrl === "string" ? body.bannerUrl : undefined,
    bannerType: ["image", "video", "youtube"].includes(body.bannerType) ? body.bannerType : undefined,
    backgroundTheme: ["solid", "starfield", "matrix", "grid", "nebula"].includes(body.backgroundTheme)
      ? body.backgroundTheme
      : undefined,
  };

  try {
    const result = await updateStore((data) => {
      const slugTaken = data.gates.some((g) => g.slug === gate.slug);
      if (slugTaken) {
        gate.slug = `${gate.slug}-${randomSlug().slice(0, 4)}`;
      }
      data.gates.push(gate);
      return gate;
    });

    return NextResponse.json({ gate: result }, { status: 201 });
  } catch (err) {
    console.error("Failed to save gate:", err);
    return NextResponse.json(
      { error: "Couldn't save the gate. Check that Blob storage is connected." },
      { status: 500 }
    );
  }
}
