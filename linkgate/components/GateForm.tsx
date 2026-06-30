"use client";

import { useState } from "react";
import { BackgroundTheme, Gate, GateStep, QuickLink } from "@/lib/types";
import StepBuilder from "./StepBuilder";

export interface GateFormValue {
  title: string;
  slug: string;
  destinationUrl: string;
  steps: GateStep[];
  bannerUrl: string;
  bannerType: "image" | "video" | "youtube";
  backgroundTheme: BackgroundTheme | "";
  shuffleSteps: boolean;
  requireHumanCheck: boolean;
}

const BG_THEME_OPTIONS: { value: BackgroundTheme | ""; label: string }[] = [
  { value: "", label: "Use site default" },
  { value: "solid", label: "Solid" },
  { value: "starfield", label: "Starfield (space)" },
  { value: "matrix", label: "Matrix rain (code)" },
  { value: "grid", label: "Energy grid (stellar / void)" },
  { value: "nebula", label: "Nebula" },
];

export default function GateForm({
  initial,
  submitLabel,
  quickLinks = [],
  onSubmit,
}: {
  initial?: Partial<Gate>;
  submitLabel: string;
  quickLinks?: QuickLink[];
  onSubmit: (value: GateFormValue) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [destinationUrl, setDestinationUrl] = useState(initial?.destinationUrl || "");
  const [steps, setSteps] = useState<GateStep[]>(initial?.steps || []);
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl || "");
  const [bannerType, setBannerType] = useState<"image" | "video" | "youtube">(initial?.bannerType || "image");
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme | "">(initial?.backgroundTheme || "");
  const [shuffleSteps, setShuffleSteps] = useState(!!initial?.shuffleSteps);
  const [requireHumanCheck, setRequireHumanCheck] = useState(!!initial?.requireHumanCheck);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !destinationUrl.trim()) {
      setError("Title and destination link are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        title,
        slug,
        destinationUrl,
        steps,
        bannerUrl,
        bannerType,
        backgroundTheme,
        shuffleSteps,
        requireHumanCheck,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div className="field">
          <label className="field-label">Gate title (internal, for your dashboard)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">Short link slug</label>
          <input
            className="input"
            placeholder="leave blank to auto-generate"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label">Real destination link (only revealed after the end check passes)</label>
          <input
            className="input"
            placeholder="https://"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Security</h2>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={requireHumanCheck}
            onChange={(e) => setRequireHumanCheck(e.target.checked)}
          />
          Require a human check before the steps are shown, and again before the link is released
        </label>
        <p style={{ fontSize: "0.8rem", margin: "0.4rem 0 1rem" }}>
          Both checks are enforced by the server - the steps and the real link genuinely aren't sent
          to the browser until each one passes, not just hidden in the UI. Uses Turnstile if you've
          set it up in Settings, otherwise a fresh math question each time.
        </p>

        <label className="checkbox-row">
          <input type="checkbox" checked={shuffleSteps} onChange={(e) => setShuffleSteps(e.target.checked)} />
          Show steps in a random order each visit - makes it harder for a hardcoded script to assume
          step positions
        </label>
      </div>

      <div className="panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Banner (optional, unique to this gate)</h2>
        <div className="field-row">
          <div className="field field-grow">
            <label className="field-label">Image URL, direct video URL, or YouTube link</label>
            <input
              className="input"
              placeholder="https://"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />
          </div>
          <div className="field field-icon-col">
            <label className="field-label">Type</label>
            <select className="input" value={bannerType} onChange={(e) => setBannerType(e.target.value as typeof bannerType)}>
              <option value="image">Image</option>
              <option value="video">Video (direct file URL)</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label">Background theme for this gate</label>
          <select
            className="input"
            value={backgroundTheme}
            onChange={(e) => setBackgroundTheme(e.target.value as BackgroundTheme | "")}
          >
            {BG_THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Steps</h2>
      <StepBuilder steps={steps} onChange={setSteps} quickLinks={quickLinks} />

      {error && <p style={{ color: "var(--danger)", margin: "1rem 0" }}>{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1.5rem" }} disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
