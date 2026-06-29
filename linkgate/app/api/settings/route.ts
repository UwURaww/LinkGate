import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";

export async function GET() {
  const store = await readStore();
  if (hasAdminSession()) {
    return NextResponse.json({ settings: store.settings });
  }
  // Public callers (the gate pages) only get what they need to render a theme
  // and the Turnstile site key (which is meant to be public). The secret key
  // and webhook URL never leave the server. turnstileEnabled is computed
  // here so the client's decision always matches the server's.
  const { discordWebhookUrl, turnstileSecretKey, ...rest } = store.settings;
  return NextResponse.json({
    settings: { ...rest, turnstileEnabled: !!store.settings.turnstileSiteKey && !!turnstileSecretKey },
  });
}

export async function PUT(req: NextRequest) {
  if (!hasAdminSession()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request body." }, { status: 400 });

  try {
    const settings = await updateStore((data) => {
      data.settings = { ...data.settings, ...body };
      return data.settings;
    });

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Failed to save settings:", err);
    return NextResponse.json(
      { error: "Couldn't save settings. Check that Blob storage is connected." },
      { status: 500 }
    );
  }
}
