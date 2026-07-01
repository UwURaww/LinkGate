"use client";

import { GateStep } from "@/lib/types";
import { Icon } from "./icons";
import CustomScriptSlot from "./CustomScriptSlot";
import FloatingVideoPlayer from "./FloatingVideoPlayer";

export default function StepContent({
  step,
  secondsLeft,
  actionTaken,
  waitLeft,
  videoWatched,
  onAction,
  onVideoComplete,
}: {
  step: GateStep;
  secondsLeft: number;
  actionTaken: boolean;
  waitLeft: number;
  videoWatched: boolean;
  onAction: (e: React.MouseEvent) => void;
  onVideoComplete: () => void;
}) {
  const requiresAction = ["ad", "discord", "tip", "social"].includes(step.type);

  return (
    <>
      <div className="gate-step-title">
        <Icon name={step.icon} size={20} />
        <h1 style={{ fontSize: "1.25rem" }}>{step.title}</h1>
      </div>

      {step.description && <p style={{ marginBottom: "1.25rem" }}>{step.description}</p>}

      <div style={{ marginBottom: "1.5rem" }}>
        {step.type === "info" && null}

        {step.type === "timer" && (
          <p className="mono" style={{ fontSize: "2rem", color: "var(--accent)" }}>
            {secondsLeft > 0 ? secondsLeft : "Ready"}
          </p>
        )}

        {step.type === "ad" && (
          <a
            href={step.adUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-icon"
            onClick={onAction}
          >
            <Icon name={step.icon} size={16} />
            {step.adButtonLabel || "Visit sponsor"}
          </a>
        )}

        {step.type === "discord" && (
          <a
            href={step.discordInvite || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-icon"
            onClick={onAction}
          >
            <Icon name={step.icon} size={16} />
            Join the Discord
          </a>
        )}

        {step.type === "tip" && (
          <a
            href={step.tipUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-icon"
            onClick={onAction}
          >
            <Icon name={step.icon} size={16} />
            {step.tipLabel || "Leave a tip"}
          </a>
        )}

        {step.type === "social" && (
          <a
            href={step.socialUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-icon"
            onClick={onAction}
          >
            <Icon name={step.icon} size={16} />
            {step.socialActionLabel || "Follow"}
          </a>
        )}

        {step.type === "video" &&
          (step.videoUrl ? (
            <FloatingVideoPlayer
              videoUrl={step.videoUrl}
              sourceType={step.videoSourceType === "direct" ? "direct" : "youtube"}
              onComplete={onVideoComplete}
            />
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No video configured for this step.</p>
          ))}

        {step.type === "custom_script" && (
          <CustomScriptSlot scriptUrl={step.scriptUrl} scriptInline={step.scriptInline} />
        )}

        {requiresAction && actionTaken && waitLeft > 0 && (
          <p className="mono" style={{ fontSize: "0.8rem", marginTop: "0.6rem", color: "var(--text-muted)" }}>
            You can continue in {waitLeft}s
          </p>
        )}

        {step.type === "video" && videoWatched && (
          <p className="mono" style={{ fontSize: "0.8rem", marginTop: "0.6rem", color: "var(--success)" }}>
            Watched - you&apos;re good to continue
          </p>
        )}
      </div>
    </>
  );
}
