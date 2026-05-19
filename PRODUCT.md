# Persian Social Bot Broadcaster

## Product Purpose

Localhost admin panel for broadcasting a text + optional image/video to selected groups and channels across two Iranian messaging platforms: **Bale** (Telegram-clone) and **Rubika**. Runs only on `127.0.0.1` — never publicly hosted, no auth.

A small-business operator or shop admin uses this to push a single announcement (a new product, a sale, a daily message) to every group/channel where their bot is a member, on both platforms at once, without having to repeat the post in each app.

## Register

**product** — utility tool. Design serves the task; the panel is a control surface, not a marketing artifact.

## Users

- **Primary:** Iranian small-business owners and shop managers running their own announcements. Persian-first, RTL native, varied Windows/laptop usage. They are not developers. They want to paste a token, see their groups, click send, and move on.
- **Secondary:** A technician or family member who configured the bot for them and may revisit `/setup` to swap tokens.
- **Tertiary (rare):** The developer maintaining the local install, reading logs.

The primary user has likely never used a Telegram bot admin panel. The interface must be self-explanatory in Persian, with no jargon, no required dev knowledge.

## Brand and tone

- **Language:** Persian only in the UI. JetBrains Mono for chat IDs (LTR direction), Vazirmatn for everything else (RTL).
- **Voice:** Calm, direct, helpful. Short Persian sentences. No marketing copy, no exclamation points, no emoji in UI.
- **Confidence signal:** Every action confirms quickly (toast or pill). Errors translated into one short Persian summary; the raw error stays available behind a "جزئیات" toggle.

## Strategic principles

1. **The selection list is the workhorse.** The whole panel revolves around picking groups/channels. It must be scannable, RTL-correct, and never overflow into a wall of generic checkboxes.
2. **Presets are first-class.** Repetitive ad sends to the same customer subset are the main repeat task. Saving, loading, renaming, and deleting a preset must be at most one obvious click each, with a clear empty state when no presets exist.
3. **Feedback before silence.** Async actions (test token, refresh chats, send broadcast) must show progress within ~100ms — spinner on the triggering control plus a toast at the end. Nothing silently blocks.
4. **Discovery limits explained, not hidden.** Neither Bale nor Rubika has a "list all my chats" API; chats only appear after a message arrives. The UI must tell the user this calmly, without sounding broken, so they don't conclude "it's not working."
5. **Localhost trust, no scaffolding.** No auth, no roles, no per-user state. The boundary is the loopback bind. Don't add login screens or two-factor.

## Anti-references

Do NOT make this look like:

- A generic dark SaaS dashboard (Linear / Vercel clone) — wrong audience, wrong language, wrong register.
- A Telegram Bot API docs page — too dev-facing.
- A "Material 3" admin template — wrong cultural fit, wrong density.
- A landing page with a hero banner. This is a tool, not a product page.

## Constraints

- **No frontend framework.** Vanilla JS, vanilla CSS, hand-written DOM via the `el()` helper in `app/static/util.js`. No build step.
- **RTL throughout** (`dir="rtl"`). Persian first; English/Latin tokens (chat IDs, file names) must keep LTR locally without breaking flow.
- **Two fonts only.** Vazirmatn (Persian + Latin body), JetBrains Mono (chat IDs, monospace identifiers).
- **No images, no SVG icon font.** Unicode glyphs (⚙, ✓, ✕, ↻) or single-character cues only.
- **Touchable controls.** Buttons ≥ 32px tall — primary users are sometimes on laptops with imprecise trackpads.
- **No HTML injection.** All dynamic strings rendered as text nodes via `textContent` / `el()` — Rubika error responses can carry raw HTML.
