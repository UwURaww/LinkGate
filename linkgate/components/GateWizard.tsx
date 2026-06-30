"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicGate, PublicSiteSettings } from "@/lib/types";
import { Icon } from "./icons";
import CustomScriptSlot from "./CustomScriptSlot";
import BannerMedia from "./BannerMedia";
import BackgroundFX from "./BackgroundFX";
import HumanCheckCard from "./HumanCheckCard";

type Phase = "loading" | "start-check" | "steps" | "not-found" | "error";

export default function GateWizard({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  // start-check state
  const [startToken, setStartToken] = useState("");
  const [startQuestion, setStartQuestion] = useState("");
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [startError, setStartError] = useState("");

  // steps state
  const [gate, setGate] = useState<PublicGate | null>(null);
  const [token, setToken] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [actionTaken, setActionTaken] = useState(false);
  const [waitLeft, setWaitLeft] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [humanInteraction, setHumanInteraction] = useState(true);

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

        const settingsData = await settingsRes.json().catch(() => ({ settings: null }));
        setSettings(settingsData.settings ?? null);

        if (sessionRes.status === 404) {
          setPhase("not-found");
          return;
        }
        if (!sessionRes.ok) {
          const errBody = await sessionRes.json().catch(() => ({}));
          setLoadError(errBody.error || "");
          setPhase("error");
          return;
        }

        const sessionData = await sessionRes.json();
        if (sessionData.requiresStartCheck) {
          setStartToken(sessionData.startToken);
          setStartQuestion(sessionData.challengeQuestion || "");
          setPhase("start-check");
        } else {
          setGate(sessionData.gate);
          setToken(sessionData.token);
          setPhase("steps");
        }
      } catch {
        setPhase("error");
      }
    })();
  }, [slug]);

  async function handleStartCheckSubmit(
    answer: { challengeAnswer?: number; turnstileToken?: string },
    trusted: boolean
  ) {
    setStartSubmitting(true);
    setStartError("");
    try {
      const res = await fetch("/api/checkpoint-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startToken, ...answer, humanInteraction: trusted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data.error || "Something went wrong.");
        setStartSubmitting(false);
        return;
      }
      setGate(data.gate);
      setToken(data.token);
      setPhase("steps");
    } catch {
      setStartError("Couldn't reach the server. Try again.");
      setStartSubmitting(false);
    }
  }

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

  function handleAction(e: React.MouseEvent) {
    if (!e.isTrusted) setHumanInteraction(false);
    setActionTaken(true);
    if (currentStep?.postActionWaitSeconds) {
      setWaitLeft(currentStep.postActionWaitSeconds);
    }
  }

  async function handleAdvance(stepId: string, clickTrusted: boolean) {
    const trustedSoFar = humanInteraction && clickTrusted;
    if (!clickTrusted) setHumanInteraction(false);
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
          humanInteraction: trustedSoFar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFinishError(data.error || "Something went wrong.");
        setFinishing(false);
        return;
      }
      if (data.needsVerification) {
        const bundle = btoa(JSON.stringify({ token: data.verifyToken, question: data.challengeQuestion || "" }));
        window.location.href = `/verify#${encodeURIComponent(bundle)}`;
        return;
      }
      window.location.href = data.destinationUrl;
    } catch {
      setFinishError("Couldn't reach the server. Try again.");
      setFinishing(false);
    }
  }

  if (phase === "loading") {
    return <Centered settings={settings}><p>Loading...</p></Centered>;
  }

  if (phase === "not-found") {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Link not found</h1>
        <p>This link doesn&apos;t exist, or it was removed by its owner.</p>
      </Centered>
    );
  }

  if (phase === "error") {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p>{loadError || "Refresh the page to try again."}</p>
      </Centered>
    );
  }

  if (phase === "start-check") {
    return (
      <div style={{ ...themeVars }} className="gate-screen">
        <BackgroundFX theme={bgTheme} accent={accent} background={background} />
        <div className="panel gate-card">
          {settings?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="gate-logo" />
          )}
          <HumanCheckCard
            title="Quick check"
            description="Just to make sure you're not a bot, before we show you anything."
            turnstileEnabled={!!settings?.turnstileEnabled}
            turnstileSiteKey={settings?.turnstileSiteKey}
            challengeQuestion={startQuestion}
            submitting={startSubmitting}
            error={startError}
            onSubmit={handleStartCheckSubmit}
          />
        </div>
      </div>
    );
  }

  if (!gate || !currentStep) {
    return (
      <Centered settings={settings}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p>Refresh the page to try again.</p>
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
          onClick={(e) => handleAdvance(currentStep.id, e.isTrusted)}
        >
          {finishing
            ? "Finishing up..."
            : waitLeft > 0
              ? `Wait ${waitLeft}s`
              : stepIndex + 1 === gate.steps.length
                ? "Continue"
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
