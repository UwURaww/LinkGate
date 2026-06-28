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
- Storage: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - a single
  JSON file, no Redis/Postgres account needed
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
   share `yourproject.vercel.app/g/your-slug`.

## Using your own monetization script

Each gate step can be type **"Your own script"**. Point it at an external
`.js` URL (e.g. an ad network's tag, your own analytics, whatever you're
running) or paste inline JavaScript directly. It runs in the visitor's browser
on that step. Since it runs with full page access, only point this at scripts
from sources you trust - a malicious one could do anything an attacker
controlling the page could do.

## Known limitations (it's one JSON file, not a database)

- Two admin edits at the exact same instant can clobber each other (last
  write wins). Fine at hobby scale; if you get to the point where that
  matters, swap `lib/blob.ts` for a real database - it's the only file that
  touches storage.
- View/completion counts are simple counters, not deduplicated per visitor.

## Customizing the look

`/admin/settings` covers site name, tagline, logo, favicon, accent color,
background color, corner style, and a default background theme (Solid,
Starfield, Matrix rain, Energy grid, or Nebula) - no code edits needed. Each
gate can also have its own banner (image, direct video URL, or YouTube link)
and its own background theme override, via the gate editor.

Saved links (your YouTube channel, Discord server, Ko-fi, etc.) live in
Settings too - add one once, then insert it into any step with one click
instead of retyping it.

## Anti-bypass hardening

- Tokens are one-time-use: once a gate is completed, that exact token can't
  be replayed.
- Repeated invalid completion attempts from the same IP (forged tokens,
  claiming steps were done when they weren't) trigger a temporary lockout for
  that IP. Normal visitors going through the wizard never trigger this.
- The "wait after clicking" option on ad/social/tip/Discord steps is an
  honest, visible timer ("Continue in 18s") - not a fake "verifying..." state.
  Nothing here can actually verify a visitor watched an ad or followed a
  link; claiming otherwise would just be lying to them, so the UI never does.

