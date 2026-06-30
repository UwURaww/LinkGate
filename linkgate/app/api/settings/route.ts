import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/blob";

export async function GET() {
  const store = await readStore();
  const turnstileEnabled = !!store.settings.turnstileSiteKey && !!store.settings.turnstileSecretKey;

  if (hasAdminSession()) {
    return NextResponse.json({ settings: { ...store.settings, turnstileEnabled } });
  }
  // Public callers (the gate pages) only get what they need to render a theme
  // and the Turnstile site key (which is meant to be public). The secret key
  // and webhook URL never leave the server.
  const { discordWebhookUrl, turnstileSecretKey, ...rest } = store.settings;
  return NextResponse.json({ settings: { ...rest, turnstileEnabled } });
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
