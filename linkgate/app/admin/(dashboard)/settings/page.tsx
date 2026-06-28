"use client";

import { useEffect, useState } from "react";
import { BackgroundTheme, QuickLink, SiteSettings, defaultSettings } from "@/lib/types";

const BG_THEME_OPTIONS: { value: BackgroundTheme; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "starfield", label: "Starfield (space)" },
  { value: "matrix", label: "Matrix rain (code)" },
  { value: "grid", label: "Energy grid (stellar / void)" },
  { value: "nebula", label: "Nebula" },
];

function newLinkId() {
  return `link_${Math.random().toString(36).slice(2, 9)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => d.settings && setSettings({ ...defaultSettings(), ...d.settings }));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function field<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function addQuickLink() {
    const next: QuickLink[] = [...(settings.quickLinks || []), { id: newLinkId(), label: "", url: "" }];
    field("quickLinks", next);
  }

  function updateQuickLink(id: string, patch: Partial<QuickLink>) {
    const next = (settings.quickLinks || []).map((q) => (q.id === id ? { ...q, ...patch } : q));
    field("quickLinks", next);
  }

  function removeQuickLink(id: string) {
    field("quickLinks", (settings.quickLinks || []).filter((q) => q.id !== id));
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>Settings</h1>

      <form onSubmit={handleSave}>
        <div className="panel settings-form">
          <div className="field">
            <label className="field-label">Site name</label>
            <input className="input" value={settings.siteName} onChange={(e) => field("siteName", e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Tagline</label>
            <input className="input" value={settings.tagline} onChange={(e) => field("tagline", e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Logo URL (shown above the steps on every gate)</label>
            <input className="input" value={settings.logoUrl || ""} onChange={(e) => field("logoUrl", e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Favicon URL (the small browser-tab icon, optional)</label>
            <input className="input" value={settings.faviconUrl || ""} onChange={(e) => field("faviconUrl", e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field field-grow">
              <label className="field-label">Accent color</label>
              <input
                type="color"
                className="input color-input"
                value={settings.accentColor}
                onChange={(e) => field("accentColor", e.target.value)}
              />
            </div>
            <div className="field field-grow">
              <label className="field-label">Background color</label>
              <input
                type="color"
                className="input color-input"
                value={settings.backgroundColor}
                onChange={(e) => field("backgroundColor", e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field field-grow">
              <label className="field-label">Corner style</label>
              <select
                className="input"
                value={settings.cornerStyle || "rounded"}
                onChange={(e) => field("cornerStyle", e.target.value as SiteSettings["cornerStyle"])}
              >
                <option value="rounded">Rounded</option>
                <option value="sharp">Sharp</option>
              </select>
            </div>
            <div className="field field-grow">
              <label className="field-label">Background theme (default for all gates)</label>
              <select
                className="input"
                value={settings.backgroundTheme || "solid"}
                onChange={(e) => field("backgroundTheme", e.target.value as BackgroundTheme)}
              >
                {BG_THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Discord webhook URL (optional, pings on each unlock)</label>
            <input
              className="input"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.discordWebhookUrl || ""}
              onChange={(e) => field("discordWebhookUrl", e.target.value)}
            />
          </div>
        </div>

        <div className="panel settings-form" style={{ marginTop: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>Saved links</h2>
          <p style={{ marginBottom: "1rem" }}>
            Save links you reuse a lot (your YouTube channel, Discord server, Ko-fi) so you can drop
            them into any step with one click instead of retyping them.
          </p>

          {(settings.quickLinks || []).map((link) => (
            <div key={link.id} className="quick-link-row">
              <input
                className="input"
                placeholder="Label (e.g. My YouTube)"
                value={link.label}
                onChange={(e) => updateQuickLink(link.id, { label: e.target.value })}
              />
              <input
                className="input"
                placeholder="https://"
                value={link.url}
                onChange={(e) => updateQuickLink(link.id, { url: e.target.value })}
              />
              <button type="button" className="btn btn-danger" onClick={() => removeQuickLink(link.id)}>
                Remove
              </button>
            </div>
          ))}

          <button type="button" className="btn" onClick={addQuickLink}>
            + Add saved link
          </button>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: "1.25rem" }} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
