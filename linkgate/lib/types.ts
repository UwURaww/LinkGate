export type StepType = "info" | "timer" | "ad" | "discord" | "tip" | "custom_script";

export interface GateStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  skippable?: boolean;

  // type: "timer"
  seconds?: number;

  // type: "ad"
  adUrl?: string;
  adButtonLabel?: string;

  // type: "discord"
  discordInvite?: string;

  // type: "tip"
  tipUrl?: string;
  tipLabel?: string;

  // type: "custom_script" - for the user's own monetization script
  scriptUrl?: string;
  scriptInline?: string;
}

export interface Gate {
  id: string;
  slug: string;
  title: string;
  destinationUrl: string;
  steps: GateStep[];
  stats: {
    views: number;
    completions: number;
  };
  createdAt: string;
  updatedAt: string;
}

/** What the public gate page is allowed to see. Never includes destinationUrl. */
export type PublicGate = Omit<Gate, "destinationUrl" | "stats">;

export interface SiteSettings {
  siteName: string;
  tagline: string;
  accentColor: string;
  backgroundColor: string;
  logoUrl?: string;
  discordWebhookUrl?: string;
}

export interface StoreData {
  gates: Gate[];
  settings: SiteSettings;
}

export function defaultSettings(): SiteSettings {
  return {
    siteName: "Checkpoint",
    tagline: "One stop, then through.",
    accentColor: "#E8A33D",
    backgroundColor: "#0E1013",
    logoUrl: "",
    discordWebhookUrl: "",
  };
}
