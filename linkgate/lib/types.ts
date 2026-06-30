export type StepType = "info" | "timer" | "ad" | "discord" | "tip" | "social" | "verify" | "custom_script";

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
  | "message"
  | "shield";

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

export interface GateStats {
  views: number;
  completions: number;
}

export interface Gate {
  id: string;
  slug: string;
  title: string;
  destinationUrl: string;
  steps: GateStep[];
  /** Legacy/display seed only - the live counters live in their own
   * per-gate file (see lib/stats.ts) so busy traffic on one gate can't
   * clobber another gate's count or get clobbered by security bookkeeping. */
  stats: GateStats;
  createdAt: string;
  updatedAt: string;

  // optional header media shown above the steps, unique per gate
  bannerUrl?: string;
  bannerType?: "image" | "video" | "youtube";

  // optional per-gate override of the site's default background theme
  backgroundTheme?: BackgroundTheme;

  // shows steps (other than the human-check, if present) in a random order
  // each session, so a hardcoded bypass script can't assume step positions
  shuffleSteps?: boolean;

  // requires a fresh human check (Turnstile if configured, else a math
  // question) BEFORE the steps are revealed at all, and AGAIN after they're
  // completed, before the real link is released. Both checks are enforced
  // server-side - the steps/token aren't sent to the browser until the
  // first one passes, and the destination link isn't sent until the second
  // one does.
  requireHumanCheck?: boolean;
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
  /** Cloudflare Turnstile (free, unlimited, privacy-friendly CAPTCHA).
   * Site key is public and shipped to the browser; secret key is never
   * exposed to the public settings endpoint. If unset, the "Human check"
   * step falls back to a simple auto-generated math question. */
  turnstileSiteKey?: string;
  turnstileSecretKey?: string;
}

/** What the public gate page actually receives from /api/settings. The
 * client can see turnstileSiteKey (it's meant to be public) but can never
 * see whether a secret key is also configured - so the server computes
 * turnstileEnabled once and hands that over instead of making the client
 * guess from siteKey's presence alone (which could disagree with the
 * server's own decision if only one of the two keys were set). */
export type PublicSiteSettings = Omit<SiteSettings, "discordWebhookUrl" | "turnstileSecretKey"> & {
  turnstileEnabled: boolean;
};

/** Per-IP anti-bypass bookkeeping. Stored in its own file, separate from
 * gates/settings, since it's written on nearly every public request and
 * shouldn't contend with admin edits or per-gate stats. */
export interface SecurityState {
  failedAttempts: Record<string, { count: number; firstAt: number; lockedUntil?: number }>;
  /** hash(token) -> expiry timestamp, so a completed token can't be replayed */
  usedTokens: Record<string, number>;
  /** throttles raw /api/gate-session calls (view-count spam, slug scraping) */
  sessionStarts: Record<string, { count: number; firstAt: number }>;
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
    faviconUrl: "",
    cornerStyle: "rounded",
    backgroundTheme: "solid",
    discordWebhookUrl: "",
    quickLinks: [],
    turnstileSiteKey: "",
    turnstileSecretKey: "",
  };
}

export function defaultSecurity(): SecurityState {
  return { failedAttempts: {}, usedTokens: {}, sessionStarts: {} };
}

export function defaultStats(): GateStats {
  return { views: 0, completions: 0 };
}
