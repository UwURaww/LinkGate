import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";
import { slugify } from "@/lib/id";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const store = await readStore();
  const gate = store.gates.find((g) => g.id === params.id);
  if (!gate) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
  return NextResponse.json({ gate });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

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
    gate.updatedAt = new Date().toISOString();
    return gate;
  });

  if (!updated) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
  return NextResponse.json({ gate: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const removed = await updateStore((data) => {
    const before = data.gates.length;
    data.gates = data.gates.filter((g) => g.id !== params.id);
    return data.gates.length < before;
  });

  if (!removed) return NextResponse.json({ error: "Gate not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
