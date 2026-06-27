import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";

export async function GET() {
  const store = await readStore();
  if (hasAdminSession()) {
    return NextResponse.json({ settings: store.settings });
  }
  // Public callers (the gate pages) only get what they need to render a theme.
  const { discordWebhookUrl, ...publicSettings } = store.settings;
  return NextResponse.json({ settings: publicSettings });
}

export async function PUT(req: NextRequest) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request body." }, { status: 400 });

  const settings = await updateStore((data) => {
    data.settings = { ...data.settings, ...body };
    return data.settings;
  });

  return NextResponse.json({ settings });
}
