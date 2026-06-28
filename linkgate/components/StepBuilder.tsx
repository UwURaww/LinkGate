"use client";

import { GateStep, StepType, IconKey } from "@/lib/types";
import { Icon, ICON_LABELS } from "./icons";

const STEP_LABELS: Record<StepType, string> = {
  info: "Info message",
  timer: "Timer",
  ad: "Ad / affiliate link",
  discord: "Join Discord",
  tip: "Tip to support",
  social: "Follow / subscribe / like",
  custom_script: "Your own script (.js)",
};

const ICON_KEYS: IconKey[] = [
  "none",
  "link",
  "play",
  "heart",
  "star",
  "userPlus",
  "gift",
  "megaphone",
  "clock",
  "info",
  "message",
];

function defaultIconFor(type: StepType): IconKey {
  switch (type) {
    case "timer":
      return "clock";
    case "ad":
      return "megaphone";
    case "discord":
      return "message";
    case "tip":
      return "gift";
    case "social":
      return "userPlus";
    case "info":
      return "info";
    default:
      return "none";
  }
}

function blankStep(type: StepType): GateStep {
  const id = `step_${Math.random().toString(36).slice(2, 9)}`;
  const icon = defaultIconFor(type);
  switch (type) {
    case "timer":
      return { id, type, icon, title: "Hang tight", description: "Your link unlocks in a moment.", seconds: 8 };
    case "ad":
      return { id, type, icon, title: "Check out our sponsor", adUrl: "", adButtonLabel: "Visit sponsor" };
    case "discord":
      return { id, type, icon, title: "Join the Discord", discordInvite: "" };
    case "tip":
      return {
        id,
        type,
        icon,
        title: "Enjoying the tool?",
        description: "Totally optional - skip if you'd rather not.",
        tipUrl: "",
        tipLabel: "Leave a tip",
        skippable: true,
      };
    case "social":
      return {
        id,
        type,
        icon,
        title: "Follow to continue",
        socialUrl: "",
        socialActionLabel: "Follow",
      };
    case "custom_script":
      return { id, type, icon, title: "One sec...", scriptUrl: "" };
    default:
      return { id, type: "info", icon, title: "Welcome", description: "" };
  }
}

export default function StepBuilder({
  steps,
  onChange,
}: {
  steps: GateStep[];
  onChange: (steps: GateStep[]) => void;
}) {
  function update(index: number, patch: Partial<GateStep>) {
    const next = steps.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = steps.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add(type: StepType) {
    onChange([...steps, blankStep(type)]);
  }

  return (
    <div>
      {steps.map((step, i) => (
        <div key={step.id} className="panel step-card">
          <div className="step-card-header">
            <span className="badge">
              <Icon name={step.icon} size={14} />
              {STEP_LABELS[step.type]}
            </span>
            <div className="step-card-actions">
              <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" className="btn btn-ghost" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>↓</button>
              <button type="button" className="btn btn-danger" onClick={() => remove(i)}>Remove</button>
            </div>
          </div>

          <div className="field-row">
            <div className="field field-grow">
              <label className="field-label">Title shown to visitors</label>
              <input
                className="input"
                value={step.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            </div>
            <div className="field field-icon-col">
              <label className="field-label">Icon</label>
              <select
                className="input"
                value={step.icon || "none"}
                onChange={(e) => update(i, { icon: e.target.value as IconKey })}
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key === "none" ? "No icon" : ICON_LABELS[key as Exclude<IconKey, "none">]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(step.type === "info" || step.type === "timer" || step.type === "tip") && (
            <div className="field">
              <label className="field-label">Description (optional)</label>
              <input
                className="input"
                value={step.description || ""}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </div>
          )}

          {step.type === "timer" && (
            <div className="field">
              <label className="field-label">Seconds to wait</label>
              <input
                type="number"
                min={1}
                max={120}
                className="input"
                value={step.seconds ?? 8}
                onChange={(e) => update(i, { seconds: Number(e.target.value) })}
              />
            </div>
          )}

          {step.type === "ad" && (
            <>
              <div className="field">
                <label className="field-label">Ad / affiliate URL</label>
                <input
                  className="input"
                  placeholder="https://"
                  value={step.adUrl || ""}
                  onChange={(e) => update(i, { adUrl: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Button text</label>
                <input
                  className="input"
                  value={step.adButtonLabel || ""}
                  onChange={(e) => update(i, { adButtonLabel: e.target.value })}
                />
              </div>
            </>
          )}

          {step.type === "discord" && (
            <div className="field">
              <label className="field-label">Discord invite link</label>
              <input
                className="input"
                placeholder="https://discord.gg/..."
                value={step.discordInvite || ""}
                onChange={(e) => update(i, { discordInvite: e.target.value })}
              />
            </div>
          )}

          {step.type === "tip" && (
            <>
              <div className="field">
                <label className="field-label">Tip link (Ko-fi, Buy Me a Coffee, etc.)</label>
                <input
                  className="input"
                  placeholder="https://ko-fi.com/..."
                  value={step.tipUrl || ""}
                  onChange={(e) => update(i, { tipUrl: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Button text</label>
                <input
                  className="input"
                  value={step.tipLabel || ""}
                  onChange={(e) => update(i, { tipLabel: e.target.value })}
                />
              </div>
            </>
          )}

          {step.type === "social" && (
            <>
              <div className="field">
                <label className="field-label">Profile / post / channel link</label>
                <input
                  className="input"
                  placeholder="https://youtube.com/@yourchannel"
                  value={step.socialUrl || ""}
                  onChange={(e) => update(i, { socialUrl: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Button text (e.g. "Subscribe on YouTube")</label>
                <input
                  className="input"
                  placeholder="Subscribe on YouTube"
                  value={step.socialActionLabel || ""}
                  onChange={(e) => update(i, { socialActionLabel: e.target.value })}
                />
              </div>
            </>
          )}

          {step.type === "custom_script" && (
            <>
              <div className="field">
                <label className="field-label">External script URL (e.g. your ad network's tag)</label>
                <input
                  className="input"
                  placeholder="https://example.com/your-script.js"
                  value={step.scriptUrl || ""}
                  onChange={(e) => update(i, { scriptUrl: e.target.value, scriptInline: "" })}
                />
              </div>
              <div className="field">
                <label className="field-label">...or paste inline JavaScript instead</label>
                <textarea
                  className="input"
                  rows={4}
                  value={step.scriptInline || ""}
                  onChange={(e) => update(i, { scriptInline: e.target.value, scriptUrl: "" })}
                />
              </div>
              <p style={{ fontSize: "0.8rem" }}>
                This runs in the visitor&apos;s browser with full page access. Only use scripts from
                networks you trust.
              </p>
            </>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!step.skippable}
              onChange={(e) => update(i, { skippable: e.target.checked })}
            />
            Visitors can skip this step
          </label>
        </div>
      ))}

      <div className="add-step-row">
        {(Object.keys(STEP_LABELS) as StepType[]).map((type) => (
          <button key={type} type="button" className="btn" onClick={() => add(type)}>
            + {STEP_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
