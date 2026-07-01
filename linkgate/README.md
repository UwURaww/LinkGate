# Checkpoint

A self-hosted link gate you fully control: pick your own steps (timer, ad/affiliate
link, Discord join, tip jar, your own monetization script), theme it, and share a
short link. No Linkvertise/LootLabs/Work.ink account, no third-party ad network
required (though you can plug one in).

## What this deliberately doesn't do

Tools like this usually compete on being "unbypassable" by trapping visitors -
devtools blocking, fake adblock walls, countdown timers that silently reset,
disabled right-click, etc. None of that is in here. Every step always has a
real way through (including a "skippable" option you can turn on per step), and
nothing here tries to detect or punish people for using an adblocker or opening
devtools.

What it *does* do to raise the bar above a plain shortlink:

- The real destination link is never sent to the browser until the visitor has
  cleared every required step. It's not sitting in the page source or the
  first network response.
- Completion is checked with a signed, time-limited token, so the "give me the
  link" request can't just be replayed forever or guessed.

No client-side gate (this one included, and that includes the big paid
services) can *prove* a visitor actually watched an ad or read a message - that
would require the ad network's own SDK. This raises the floor without resorting
to coercive tricks.

## Stack

- Next.js 14 (App Router) + TypeScript, no UI framework dependency
- Storage: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - JSON
  files (gates/settings, security bookkeeping, and per-gate stats each live
  separately - see "Storage layout" below), no Redis/Postgres account needed
- Deploy target: Vercel, connected to a GitHub repo

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in ADMIN_PASSWORD and SESSION_SECRET in .env.local
npm run dev
```

Open `http://localhost:3000/admin` and sign in with `ADMIN_PASSWORD`.

Blob storage needs a real Vercel project to work (see deploy steps below) - until
then, the app falls back to in-memory storage locally, so anything you create
will reset when the dev server restarts.

## Deploying

1. Push this folder to a new GitHub repo.
2. In Vercel: **New Project** → import that repo.
3. Before the first deploy (or right after), go to your project's **Storage**
   tab → **Create Database** → **Blob**. When asked for an access mode,
   choose **Private** (the app's code is written for a private store).
   Connect it to this project; Vercel adds the `BLOB_READ_WRITE_TOKEN` and
   `BLOB_STORE_ID` env vars for you automatically.
4. In **Settings → Environment Variables**, add:
   - `ADMIN_PASSWORD` - whatever you'll type in at `/admin`
   - `SESSION_SECRET` - any long random string (`openssl rand -hex 32`)
   - `DISCORD_WEBHOOK_URL` - optional
5. Deploy. Visit `yourproject.vercel.app/admin`, sign in, create a gate, and
   copy its link from the dashboard.

## Sharing a gate

Copy the link from `/admin` - it looks like
`yourproject.vercel.app/checkpoint#your-slug`. The part after `#` is the
fragment: browsers never send it to the server, so it never shows up in
server logs or a Referer header. The address bar also scrubs it down to
just `/checkpoint` (nothing after it) within a moment of the page loading,
so even glancing at the bar afterward shows nothing gate-specific. The old
`/g/your-slug` path still works too, for any links you already shared before
this existed.

`/verify` isn't a link you hand out yourself - it's where a visitor lands
automatically partway through, if the gate has "Require a human check"
turned on (Security section of the gate editor). It runs the second
(end-of-flow) check and is the page that actually hands over the real link
once that passes.

## Using your own monetization script

Each gate step can be type **"Your own script"**. Point it at an external
`.js` URL (e.g. an ad network's tag, your own analytics, whatever you're
running) or paste inline JavaScript directly. It runs in the visitor's browser
on that step. Since it runs with full page access, only point this at scripts
from sources you trust - a malicious one could do anything an attacker
controlling the page could do.

## Customizing the look

`/admin/settings` covers site name, tagline, logo, favicon, accent color,
background color, corner style, a default background theme, and a default
layout style - no code edits needed. Each gate can also override the
background theme and layout style individually, and have its own banner
(image, direct video URL, or YouTube link), via the gate editor.

**Background themes:** Solid, Starfield (space), Matrix rain (code), Energy
grid (stellar/void), Nebula, Aurora (flowing color waves), and Particles
(floating boost-style dots).

**Layout styles:**
- **Wizard** (default) - one step at a time, same as before.
- **Stack** - every step renders as a drawer-style list. Completed steps
  collapse into a slim row with a checkmark and stay stacked at the top; the
  current step stays expanded; later steps show locked and collapsed below.
  The same single Continue/action button at the bottom still drives it - the
  list just visually reorganizes itself as you go.

Saved links (your YouTube channel, Discord server, Ko-fi, etc.) live in
Settings too - add one once, then insert it into any step with one click
instead of retyping it.

## The "Watch a video" step

Shows a small, draggable floating player over the checkpoint - drag it
anywhere, tap the corner button to play/pause, tap the header's minimize
button to shrink it to a pill without stopping playback. Works with a
YouTube link (via YouTube's own IFrame Player API) or a direct video file
URL (native `<video>` element).

The step only unlocks on the real "video ended" event - YouTube's own
`PlayerState.ENDED`, or the native `ended` event for a direct file - not a
timer standing in for it. There's no scrub bar in the custom player chrome
(reduces the easiest click-to-skip-ahead path), though as with every other
part of this app, nothing client-side can be made truly bypass-proof against
a script willing to reach into the page directly - see "Anti-bypass
hardening" below for what that section's honesty framing already covers.

## Storage layout (and why)

Three separate files instead of one, so a busy moment in one place can't
clobber a write somewhere unrelated:

- `linkgate-store.json` - gates + settings. Only written by admin actions
  (create/edit/delete a gate, save settings), so it's rarely contended.
- `linkgate-security.json` - IP lockouts, used-token tracking, session-rate
  bookkeeping. Written on nearly every public request, kept separate so it
  never competes with your actual gate data.
- `linkgate-stats-{gateId}.json` - one tiny file per gate, just `{views,
  completions}`. Isolates the counters so traffic on one gate can never
  stomp a write to another gate's counters (or get stomped by a settings
  save). If you ever saw a completion not get counted, this was almost
  certainly why - everything used to share one file.

None of these are real transactions - if two requests hit the *same* file at
the exact same instant, the last write still wins. Splitting the files makes
that collision far less likely (it now only happens between two things that
are *actually* related), not impossible. If you outgrow this, swap the three
files in `lib/blob.ts` / `lib/security-store.ts` / `lib/stats.ts` for a real
database - nothing else in the app touches storage directly.

## Anti-bypass hardening

- Tokens are one-time-use: once a gate is completed, that exact token can't
  be replayed.
- Repeated invalid completion attempts from the same IP (forged tokens,
  claiming steps were done when they weren't) trigger a temporary lockout for
  that IP. Normal visitors going through the wizard never trigger this.
- Raw requests to start a gate session are also throttled per IP (separate,
  softer limit) - this stops scripts from spamming view counts or scraping
  slugs without ever loading the page.
- An optional, gate-level **"Require a human check"** toggle (in the gate
  editor, under Security) runs a fresh check at two points: before the steps
  are shown at all, and again before the real link is released. Both are
  enforced by the server, not just hidden in the UI - the steps/token genuinely
  aren't sent to the browser until the first check passes (`/checkpoint`
  withholds them entirely until then), and the destination link genuinely
  isn't sent until the second check passes (handled at `/verify`, a separate
  page/token exchange a script has to survive a real navigation to reach).
  By default this is a fresh, simple math question each time - no setup
  needed. The expected answer is never sent to the browser in the clear;
  it's a one-way hash signed into the token, so even someone who decodes the
  token can't read the answer off it.
- For a real CAPTCHA instead of the math question, add a free
  [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
  site key + secret key in `/admin/settings`. Once both are set, every human
  check (start and end, on every gate that has it enabled) automatically
  switches to the real widget - no per-gate setup. Leave either field blank
  and it falls back to the math question.
- Every click that advances a step is checked for `event.isTrusted` - a
  property the browser itself sets, which JavaScript can't fake. A userscript
  driving the page with `element.click()` or `dispatchEvent()` produces
  untrusted clicks; real mouse, touch, and keyboard activation never does.
  This specifically targets the common "Tampermonkey auto-clicks through the
  gate" pattern.
- Completing a gate faster than a real person plausibly could (reading and
  clicking through every step) is treated the same as not finishing it. The
  threshold is generous on purpose so genuinely fast humans never trip it.
- Per-gate "shuffle step order" option (in the gate editor) shows the steps
  in a random order each visit, so a script that hardcodes step positions
  breaks.
- The "wait after clicking" option on ad/social/tip/Discord steps is an
  honest, visible timer ("Continue in 18s") - not a fake "verifying..." state.

Worth being honest about: none of this - including the real CAPTCHA, the
click-trust check, and the timing check - can stop a script that skips the
page entirely and talks straight to the API, since at that point it's just
choosing what to put in a JSON body, including a fabricated "yes this was a
trusted click." Those three are specifically aimed at scripts that drive the
*page itself* (which is the overwhelming majority of public bypass
userscripts in the wild - directly reverse-engineering a specific site's API
is a lot more work than calling `.click()` on some buttons). What stops
direct-API attempts is everything earlier in this list: the signed token,
the answer/Turnstile check, and the lockout. And none of it can *prove* a
visitor actually watched an ad or read a message; that would require the ad
network's own SDK. It also can't stop someone who's actually willing to sit
and click through the page like a normal visitor, because that's
indistinguishable from one. What it does stop is automation that tries to
skip straight to the end without ever doing that.

