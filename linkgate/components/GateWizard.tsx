"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicGate, SiteSettings } from "@/lib/types";
import CustomScriptSlot from "./CustomScriptSlot";

type LoadState = "loading" | "ready" | "not-found" | "error";

export default function GateWizard({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [gate, setGate] = useState<PublicGate | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [token, setToken] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [adVisited, setAdVisited] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");

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
    setAdVisited(false);
  }, [stepIndex]);

  const accent = settings?.accentColor || "#e8a33d";
  const background = settings?.backgroundColor || "#0e1013";

  const themeVars = useMemo(
    () =>
      ({
        "--accent": accent,
        "--bg": background,
      }) as React.CSSProperties,
    [accent, background]
  );

  function markComplete(stepId: string) {
    setCompletedIds((prev) => new Set(prev).add(stepId));
  }

  async function handleAdvance(stepId: string) {
    markComplete(stepId);
    if (!gate) return;

    if (stepIndex + 1 < gate.steps.length) {
      setStepIndex((i) => i + 1);
      return;
    }

    // Last step: finalize with the server and get the real link.
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
        <p>Refresh the page to try again.</p>
      </Centered>
    );
  }

  return (
    <div style={{ ...themeVars, minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="panel" style={{ width: "100%", maxWidth: 440, padding: "2rem" }}>
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
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{currentStep.title}</h1>
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
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setAdVisited(true)}
            >
              {currentStep.adButtonLabel || "Visit sponsor"}
            </a>
          )}

          {currentStep.type === "discord" && (
            <a
              href={currentStep.discordInvite || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setAdVisited(true)}
            >
              Join the Discord
            </a>
          )}

          {currentStep.type === "tip" && (
            <a
              href={currentStep.tipUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setAdVisited(true)}
            >
              {currentStep.tipLabel || "Leave a tip"}
            </a>
          )}

          {currentStep.type === "custom_script" && (
            <CustomScriptSlot scriptUrl={currentStep.scriptUrl} scriptInline={currentStep.scriptInline} />
          )}
        </div>

        {finishError && <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{finishError}</p>}

        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          disabled={
            finishing ||
            (currentStep.type === "timer" && secondsLeft > 0) ||
            (["ad", "discord", "tip"].includes(currentStep.type) && !adVisited && !currentStep.skippable)
          }
          onClick={() => handleAdvance(currentStep.id)}
        >
          {finishing
            ? "Finishing up..."
            : stepIndex + 1 === gate.steps.length
              ? "Get my link"
              : currentStep.skippable
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
  return (
    <div
      style={{
        minHeight: "100vh",
        background: settings?.backgroundColor || "#0e1013",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <div className="panel" style={{ padding: "2rem", maxWidth: 380 }}>{children}</div>
    </div>
  );
}
