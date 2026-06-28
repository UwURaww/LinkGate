"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicGate, SiteSettings } from "@/lib/types";
import { Icon } from "./icons";
import CustomScriptSlot from "./CustomScriptSlot";
import BannerMedia from "./BannerMedia";
import BackgroundFX from "./BackgroundFX";

type LoadState = "loading" | "ready" | "not-found" | "error";

export default function GateWizard({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [gate, setGate] = useState<PublicGate | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [token, setToken] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [actionTaken, setActionTaken] = useState(false);
  const [waitLeft, setWaitLeft] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, settingsRes] = await Promise.all([
          fetch("/api/gate-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          }),
          fetch("/api/settings"),
        ]);

        if (sessionRes.status === 404) {
          setState("not-found");
          return;
        }
        if (!sessionRes.ok) {
          const errBody = await sessionRes.json().catch(() => ({}));
          setLoadError(errBody.error || "");
          setState("error");
          return;
        }

        const sessionData = await sessionRes.json();
        const settingsData = await settingsRes.json().catch(() => ({ settings: null }));

        setGate(sessionData.gate);
        setToken(sessionData.token);
        setSettings(settingsData.settings ?? null);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, [slug]);

  const currentStep = gate?.steps[stepIndex];

  useEffect(() => {
    if (currentStep?.type === "timer") {
      setSecondsLeft(currentStep.seconds ?? 5);
      const interval = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  useEffect(() => {
    setActionTaken(false);
    setWaitLeft(0);
  }, [stepIndex]);

  useEffect(() => {
    if (waitLeft <= 0) return;
    const id = setTimeout(() => setWaitLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [waitLeft]);

  const accent = settings?.accentColor || "#e8a33d";
  const background = settings?.backgroundColor || "#0e1013";
  const radius = settings?.cornerStyle === "sharp" ? "2px" : "10px";
  const bgTheme = gate?.backgroundTheme || settings?.backgroundTheme || "solid";

  const themeVars = useMemo(
    () =>
      ({
        "--accent": accent,
        "--bg": background,
        "--radius": radius,
      }) as React.CSSProperties,
    [accent, background, radius]
  );

  function markComplete(stepId: string) {
    setCompletedIds((prev) => new Set(prev).add(stepId));
  }

  function handleAction() {
    setActionTaken(true);
    if (currentStep?.postActionWaitSeconds) {
      setWaitLeft(currentStep.postActionWaitSeconds);
    }
  }

  async function handleAdvance(stepId: string) {
    markComplete(stepId);
    if (!gate) return;

    if (stepIndex + 1 < gate.steps.length) {
      setStepIndex((i) => i + 1);
      return;
    }

    setFinishing(true);
    setFinishError("");
    try {
      const res = await fetch("/api/gate-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          token,
          completedStepIds: Array.from(new Set(completedIds).add(stepId)),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFinishError(data.error || "Something went wrong.");
        setFinishing(false);
        return;
      }
      window.location.href = data.destinationUrl;
    } catch {
      setFinishError("Couldn't reach the server. Try again.");
      setFinishing(false);
    }
  }

  if (state === "loading") {
    return <Centered settings={settings}><p>Loading...</p></Centered>;
  }

  if (state === "not-found") {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Link not found</h1>
        <p>This link doesn&apos;t exist, or it was removed by its owner.</p>
      </Centered>
    );
  }

  if (state === "error" || !gate || !currentStep) {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p>{loadError || "Refresh the page to try again."}</p>
      </Centered>
    );
  }

  const requiresAction = ["ad", "discord", "tip", "social"].includes(currentStep.type);

  return (
    <div style={{ ...themeVars }} className="gate-screen">
      <BackgroundFX theme={bgTheme} accent={accent} background={background} />
      <div className="panel gate-card">
        <BannerMedia url={gate.bannerUrl} type={gate.bannerType} />

        {settings?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="" className="gate-logo" />
        )}

        <div className="checkpoint-rail">
          {gate.steps.map((s, i) => (
            <div
              key={s.id}
              className={`segment ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`}
            />
          ))}
        </div>

        <p className="mono" style={{ fontSize: "0.75rem", marginBottom: "0.4rem" }}>
          STEP {stepIndex + 1} OF {gate.steps.length}
        </p>

        <div className="gate-step-title">
          <Icon name={currentStep.icon} size={20} />
          <h1 style={{ fontSize: "1.25rem" }}>{currentStep.title}</h1>
        </div>

        {currentStep.description && (
          <p style={{ marginBottom: "1.25rem" }}>{currentStep.description}</p>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          {currentStep.type === "info" && null}

          {currentStep.type === "timer" && (
            <p className="mono" style={{ fontSize: "2rem", color: "var(--accent)" }}>
              {secondsLeft > 0 ? secondsLeft : "Ready"}
            </p>
          )}

          {currentStep.type === "ad" && (
            <a
              href={currentStep.adUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-icon"
              onClick={handleAction}
            >
              <Icon name={currentStep.icon} size={16} />
              {currentStep.adButtonLabel || "Visit sponsor"}
            </a>
          )}

          {currentStep.type === "discord" && (
            <a
              href={currentStep.discordInvite || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-icon"
              onClick={handleAction}
            >
              <Icon name={currentStep.icon} size={16} />
              Join the Discord
            </a>
          )}

          {currentStep.type === "tip" && (
            <a
              href={currentStep.tipUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-icon"
              onClick={handleAction}
            >
              <Icon name={currentStep.icon} size={16} />
              {currentStep.tipLabel || "Leave a tip"}
            </a>
          )}

          {currentStep.type === "social" && (
            <a
              href={currentStep.socialUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-icon"
              onClick={handleAction}
            >
              <Icon name={currentStep.icon} size={16} />
              {currentStep.socialActionLabel || "Follow"}
            </a>
          )}

          {currentStep.type === "custom_script" && (
            <CustomScriptSlot scriptUrl={currentStep.scriptUrl} scriptInline={currentStep.scriptInline} />
          )}

          {requiresAction && actionTaken && waitLeft > 0 && (
            <p className="mono" style={{ fontSize: "0.8rem", marginTop: "0.6rem", color: "var(--text-muted)" }}>
              You can continue in {waitLeft}s
            </p>
          )}
        </div>

        {finishError && <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{finishError}</p>}

        <button
          className="btn btn-primary gate-continue"
          disabled={
            finishing ||
            (currentStep.type === "timer" && secondsLeft > 0) ||
            (requiresAction && !actionTaken && !currentStep.skippable) ||
            waitLeft > 0
          }
          onClick={() => handleAdvance(currentStep.id)}
        >
          {finishing
            ? "Finishing up..."
            : waitLeft > 0
              ? `Wait ${waitLeft}s`
              : stepIndex + 1 === gate.steps.length
                ? "Get my link"
                : currentStep.skippable && !actionTaken
                  ? "Skip"
                  : "Continue"}
        </button>
      </div>
    </div>
  );
}

function Centered({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettings | null;
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
