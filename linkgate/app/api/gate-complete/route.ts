import { NextRequest, NextResponse } from "next/server";
import { updateStore } from "@/lib/blob";
import { verifyGateToken } from "@/lib/token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { slug, token, completedStepIds } = body || {};

  if (typeof slug !== "string" || typeof token !== "string" || !Array.isArray(completedStepIds)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const verified = verifyGateToken(token);
  if (!verified || verified.slug !== slug) {
    return NextResponse.json({ error: "This link expired. Refresh the page and try again." }, { status: 401 });
  }

  let destinationUrl: string | null = null;
  let webhookUrl: string | undefined;
  let gateTitle = "";

  await updateStore((data) => {
    const gate = data.gates.find((g) => g.slug === slug);
    if (!gate) return;

    // The token was issued for a specific number of steps. If the gate was
    // edited since, the token no longer matches and we bail out.
    if (gate.steps.length !== verified.stepCount) return;

    const requiredIds = gate.steps.filter((s) => !s.skippable).map((s) => s.id);
    const completedSet = new Set(completedStepIds);
    const allRequiredDone = requiredIds.every((id) => completedSet.has(id));
    if (!allRequiredDone) return;

    gate.stats.completions += 1;
    destinationUrl = gate.destinationUrl;
    gateTitle = gate.title;
    webhookUrl = data.settings.discordWebhookUrl;
  });

  if (!destinationUrl) {
    return NextResponse.json({ error: "Couldn't verify the steps were completed." }, { status: 400 });
  }

  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `Gate "${gateTitle}" was just unlocked.` }),
    }).catch(() => {
      /* notifications are best-effort, never block the redirect on them */
    });
  }

  return NextResponse.json({ destinationUrl });
}
