"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicSiteSettings } from "@/lib/types";
import BackgroundFX from "./BackgroundFX";
import HumanCheckCard from "./HumanCheckCard";

type Phase = "loading" | "check" | "invalid" | "finishing";

export default function VerifyStage({ bundle }: { bundle: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);
  const [token, setToken] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(bundle)));
        if (!decoded?.token) {
          setPhase("invalid");
          return;
        }
        setToken(decoded.token);
        setQuestion(decoded.question || "");
      } catch {
        setPhase("invalid");
        return;
      }

      const res = await fetch("/api/settings").catch(() => null);
      const data = await res?.json().catch(() => ({ settings: null }));
      setSettings(data?.settings ?? null);
      setPhase("check");
    })();
  }, [bundle]);

  async function handleSubmit(
    answer: { challengeAnswer?: number; turnstileToken?: string },
    trusted: boolean
  ) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/verify-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...answer, humanInteraction: trusted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      setPhase("finishing");
      window.location.href = data.destinationUrl;
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  const accent = settings?.accentColor || "#e8a33d";
  const background = settings?.backgroundColor || "#0e1013";
  const radius = settings?.cornerStyle === "sharp" ? "2px" : "10px";

  const themeVars = useMemo(
    () =>
      ({
        "--accent": accent,
        "--bg": background,
        "--radius": radius,
      }) as React.CSSProperties,
    [accent, background, radius]
  );

  if (phase === "loading") {
    return <Centered settings={settings}><p>Loading...</p></Centered>;
  }

  if (phase === "invalid") {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Link not found</h1>
        <p>This verification link is missing or malformed. Go back and try the checkpoint again.</p>
      </Centered>
    );
  }

  return (
    <div style={{ ...themeVars }} className="gate-screen">
      <BackgroundFX theme={settings?.backgroundTheme} accent={accent} background={background} />
      <div className="panel gate-card">
        {settings?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="" className="gate-logo" />
        )}
        <HumanCheckCard
          title="One more check"
          description="Last step - confirm you're a real person and your link will be right there."
          turnstileEnabled={!!settings?.turnstileEnabled}
          turnstileSiteKey={settings?.turnstileSiteKey}
          challengeQuestion={question}
          submitting={submitting || phase === "finishing"}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

function Centered({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: PublicSiteSettings | null;
}) {
  const bgVar = {
    "--bg": settings?.backgroundColor || "#0e1013",
  } as React.CSSProperties;

  return (
    <div className="gate-screen" style={{ ...bgVar, textAlign: "center" }}>
      <div className="panel gate-card" style={{ maxWidth: 380 }}>{children}</div>
    </div>
  );
}
