"use client";

import { useEffect, useState } from "react";
import { SiteSettings, defaultSettings } from "@/lib/types";

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

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>Settings</h1>

      <form onSubmit={handleSave} className="panel" style={{ padding: "1.5rem", maxWidth: 480 }}>
        <div className="field">
          <label className="field-label">Site name</label>
          <input className="input" value={settings.siteName} onChange={(e) => field("siteName", e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">Tagline</label>
          <input className="input" value={settings.tagline} onChange={(e) => field("tagline", e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">Logo URL (optional)</label>
          <input className="input" value={settings.logoUrl || ""} onChange={(e) => field("logoUrl", e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label">Accent color</label>
            <input
              type="color"
              className="input"
              style={{ height: 42, padding: "0.25rem" }}
              value={settings.accentColor}
              onChange={(e) => field("accentColor", e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label">Background color</label>
            <input
              type="color"
              className="input"
              style={{ height: 42, padding: "0.25rem" }}
              value={settings.backgroundColor}
              onChange={(e) => field("backgroundColor", e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Discord webhook URL (optional, pings on each unlock)</label>
          <input
            className="input"
            placeholder="https://discord.com/api/webhooks/..."
            value={settings.discordWebhookUrl || ""}
            onChange={(e) => field("discordWebhookUrl", e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
