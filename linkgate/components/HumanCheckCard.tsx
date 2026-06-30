"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import TurnstileWidget from "./TurnstileWidget";

export default function HumanCheckCard({
  title,
  description,
  turnstileEnabled,
  turnstileSiteKey,
  challengeQuestion,
  submitting,
  error,
  onSubmit,
}: {
  title: string;
  description: string;
  turnstileEnabled: boolean;
  turnstileSiteKey?: string;
  challengeQuestion?: string;
  submitting: boolean;
  error: string;
  onSubmit: (answer: { challengeAnswer?: number; turnstileToken?: string }, trusted: boolean) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    // Turnstile passing IS the proof of humanness here - no extra click needed.
    if (turnstileToken) onSubmit({ turnstileToken }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileToken]);

  return (
    <div>
      <div className="gate-step-title">
        <Icon name="shield" size={20} />
        <h1 style={{ fontSize: "1.25rem" }}>{title}</h1>
      </div>
      <p style={{ marginBottom: "1.25rem" }}>{description}</p>

      <div style={{ marginBottom: "1.5rem" }}>
        {turnstileEnabled && turnstileSiteKey ? (
          <TurnstileWidget siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
        ) : (
          <>
            <p className="mono" style={{ fontSize: "1.1rem", marginBottom: "0.6rem", color: "var(--accent)" }}>
              {challengeQuestion || "Loading..."}
            </p>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </>
        )}
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>}

      {!(turnstileEnabled && turnstileSiteKey) && (
        <button
          className="btn btn-primary gate-continue"
          disabled={submitting || !answer.trim()}
          onClick={(e) => onSubmit({ challengeAnswer: Number(answer) }, e.isTrusted)}
        >
          {submitting ? "Checking..." : "Continue"}
        </button>
      )}

      {turnstileEnabled && turnstileSiteKey && submitting && (
        <p className="mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Checking...
        </p>
      )}
    </div>
  );
}
