"use client";

import { useState } from "react";
import { Gate, GateStep } from "@/lib/types";
import StepBuilder from "./StepBuilder";

export interface GateFormValue {
  title: string;
  slug: string;
  destinationUrl: string;
  steps: GateStep[];
}

export default function GateForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<Gate>;
  submitLabel: string;
  onSubmit: (value: GateFormValue) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [destinationUrl, setDestinationUrl] = useState(initial?.destinationUrl || "");
  const [steps, setSteps] = useState<GateStep[]>(initial?.steps || []);
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
      await onSubmit({ title, slug, destinationUrl, steps });
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

        <div className="field">
          <label className="field-label">Real destination link (only revealed after all steps are done)</label>
          <input
            className="input"
            placeholder="https://"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
          />
        </div>
      </div>

      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Steps</h2>
      <StepBuilder steps={steps} onChange={setSteps} />

      {error && <p style={{ color: "var(--danger)", margin: "1rem 0" }}>{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1.5rem" }} disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
