export type StepType = "info" | "timer" | "ad" | "discord" | "tip" | "social" | "custom_script";

export type IconKey =
  | "none"
  | "link"
  | "play"
  | "heart"
  | "star"
  | "userPlus"
  | "gift"
  | "megaphone"
  | "clock"
  | "info"
  | "message";

export type BackgroundTheme = "solid" | "starfield" | "matrix" | "grid" | "nebula";

export interface GateStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  skippable?: boolean;
  icon?: IconKey;

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

  // type: "social" - a generic "follow / subscribe / like" step for any
  // platform (YouTube, Instagram, TikTok, X, etc.)
  socialUrl?: string;
  socialActionLabel?: string;

  // type: "custom_script" - for the user's own monetization script
  scriptUrl?: string;
  scriptInline?: string;

  // applies to "ad" | "discord" | "tip" | "social": an honest, visible wait
  // ("Continue in 18s") required after clicking the action link, before the
  // visitor can move on. This is a plain timer, not a claim that anything
  // was verified.
  postActionWaitSeconds?: number;
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

  // optional header media shown above the steps, unique per gate
  bannerUrl?: string;
  bannerType?: "image" | "video" | "youtube";

  // optional per-gate override of the site's default background theme
  backgroundTheme?: BackgroundTheme;
}

/** What the public gate page is allowed to see. Never includes destinationUrl. */
export type PublicGate = Omit<Gate, "destinationUrl" | "stats">;

export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  accentColor: string;
  backgroundColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  cornerStyle?: "rounded" | "sharp";
  backgroundTheme?: BackgroundTheme;
  discordWebhookUrl?: string;
  /** Saved links (e.g. your YouTube channel, Discord server) you can drop
   * into any step with one click instead of retyping them every time. */
  quickLinks?: QuickLink[];
}

/** Per-IP anti-bypass bookkeeping. Lives in the same store since this app
 * has no separate database - kept small and pruned on every write. */
export interface SecurityState {
  failedAttempts: Record<string, { count: number; firstAt: number; lockedUntil?: number }>;
  /** hash(token) -> expiry timestamp, so a completed token can't be replayed */
  usedTokens: Record<string, number>;
}

export interface StoreData {
  gates: Gate[];
  settings: SiteSettings;
  security: SecurityState;
}

export function defaultSettings(): SiteSettings {
  return {
    siteName: "Checkpoint",
    tagline: "One stop, then through.",
    accentColor: "#E8A33D",
    backgroundColor: "#0E1013",
    logoUrl: "",
    faviconUrl: "",
    cornerStyle: "rounded",
    backgroundTheme: "solid",
    discordWebhookUrl: "",
    quickLinks: [],
  };
}

export function defaultSecurity(): SecurityState {
  return { failedAttempts: {}, usedTokens: {} };
}
