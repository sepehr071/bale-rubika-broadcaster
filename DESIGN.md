# Design — Persian Social Bot Broadcaster

## Theme decision

**Scene sentence:** A Tehran shop owner on a 14-inch laptop, in their workshop in the mid-afternoon, glancing between WhatsApp on their phone and this panel to push the day's announcement to ~10 groups. Mixed-light office, not dim. They want low eye strain after staring at three other apps, but they need text contrast strong enough to read Persian script at small sizes.

**Theme:** Light, warm violet-tinted neutrals — not the flat-white SaaS look, not the cold blue-grey SRE dashboard look. Background hue leans toward violet so Persian text on it feels printed-on, not glowing. Single accent (violet) carries selection state and primary CTA; mint reserved for success confirmation only.

## Color strategy

**Restrained** — tinted neutrals + one accent for selection/CTA, one secondary for success. Encoded in HSL because `oklch`/`color-mix`/`lab` silently drop on older Chromium and break the entire color layer.

### Tokens (HSL)

```css
/* surfaces — warm neutrals tinted toward violet hue 270° */
--bg:            hsl(270 30% 98%);   /* page background */
--surface-1:     hsl(0 0% 100%);     /* cards */
--surface-2:     hsl(270 25% 96%);   /* inputs, secondary panels */
--surface-3:     hsl(270 22% 93%);   /* hover, raised */
--border:        hsl(270 18% 88%);   /* hairlines */
--border-strong: hsl(270 22% 78%);   /* focus, emphasis */

/* text */
--text:    hsl(270 18% 14%);
--text-2:  hsl(270 14% 32%);
--muted:   hsl(270 10% 50%);

/* accent — violet (CTA, selection, focus rings) */
--accent:        hsl(258 80% 62%);
--accent-strong: hsl(258 80% 50%);
/* soft variant applied at usage site with the alpha slash form, e.g. hsl(var(--accent) / 0.12) */

/* success — mint */
--ok:        hsl(160 55% 38%);

/* warn — amber, fallbacks, retries */
--warn:      hsl(38 90% 48%);

/* danger — red, errors / destructive only */
--danger:    hsl(355 75% 52%);
```

Tailwind v3 consumes these via `hsl(var(--accent) / <alpha-value>)`; soft variants are applied at the call site with `/ 0.12` or `/ 0.14`. **Do not** introduce `oklch()` / `color-mix()` / `color()` / `lab()` — Chromium versions older than 111 drop these silently, breaking the entire color layer.

## Typography

- **Family — body:** Vazirmatn (Persian + Latin), weights 400/500/600/700.
- **Family — mono:** JetBrains Mono, 400/500, scoped to chat IDs and file names (LTR).
- **Scale** (1.25 ratio):
  - `--fs-xs`: 11px / 1.5
  - `--fs-sm`: 12.5px / 1.55
  - `--fs-md`: 14px / 1.65
  - `--fs-lg`: 17.5px / 1.5
  - `--fs-xl`: 22px / 1.4
  - `--fs-2xl`: 28px / 1.3 (header only)
- **Weight contrast:** body 400, ui labels 500, CTA + section titles 600, page H1 700.
- **Persian-specific:** never letter-space Persian. `letter-spacing: 0` for any element containing Persian text. Latin-only labels can use `0.01em` for small caps style.

## Layout

- **Wrap width:** max 960px (was 880px — gives chats grid more room).
- **Vertical rhythm:** 8px base. Card padding 22px; gutters 14–18px; tight rows 10px.
- **No nested cards.** Sub-panels use `--surface-2` background, no border.
- **Two-column chats grid** at ≥720px; single column below. Independent scroll per platform group.

## Components

### Buttons

Four variants. Sizing: regular 36px tall, small 28px, large 44px.

- **Primary** — solid `--accent`, white text, font-weight 600. The send/save action.
- **Tonal** — `--accent-soft` background, `--accent-strong` text, no border. The "load preset" / "save preset" actions — important but not the page CTA.
- **Ghost** — transparent, `--text-2`, `--border` hairline. Secondary actions (refresh, rename, delete, clear).
- **Danger-ghost** — transparent, `--danger` text, no border until hover; for "delete preset".

States:
- Disabled: opacity 0.4, no cursor.
- Busy: spinner inside, content swapped, `cursor: progress`.
- Focus: 2px ring of `--accent` at 0.5 alpha, 2px offset.

### Inputs

- Background `--surface-2`, border `--border`, focus border `--accent-strong` + soft ring.
- Persian placeholder color `--muted`, italics off.
- Textarea minimum 140px height, resizable vertically only.

### Chat row

A row is `[checkbox] [type-pill] [title] [chat-id]` aligned start, height 36px, full RTL. Hover surface `--surface-3`, selected state has `--accent-soft` background and `--accent` left-border-INLINE-START 2px (intentionally 2px max to avoid the side-stripe ban — anything more is forbidden).

### Pills

Type pills (group/channel/private): 11px, `--surface-3` bg, `--text-2` color. Active selection pill: `--accent-soft` + `--accent-strong`.

### Toasts

Bottom-centered stack. Border-tinted by tone. Always dismissable on click. 3.5s default, 4.5s for warnings.

## Motion

- Standard ease: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart). 180ms for hovers, 220ms for state changes.
- Toast in/out: 220ms transform-y + opacity. Never animate width/height.
- Spinner: linear, 700ms rotation.
- No bounce, no elastic, no spring overshoot.

## Iconography

Single Unicode glyphs only. Approved:
- ⚙ settings
- ✓ ✕ ↻ result tones
- ＋ create
- ✎ rename
- 🗑 delete (only when needed; avoid otherwise)
- ⌄ caret for select/details

No icon font, no SVG sprite. Glyphs sit at the start of buttons or inside circular badges.

## Elevation

Three levels.
1. **Flat** — `--surface-1` no shadow. Default for cards in the document flow.
2. **Raised** — `--surface-1` + `0 1px 2px rgba(0,0,0,0.3)`. Sticky header on scroll.
3. **Floating** — `--surface-2` + `0 8px 32px rgba(0,0,0,0.45)`. Toasts, modals (rare).

## Accessibility

- Color contrast target: ≥ 4.5:1 for body text, ≥ 3:1 for UI controls.
- All interactive controls reachable by keyboard; focus rings always visible.
- Persian/Arabic numerals in body text; Latin digits OK in chat IDs only.
- Toast also conveyed via pill state — not color alone.

## Anti-patterns for THIS project

- The hero metric layout (giant numbers + label + sparkline) — not what this app does.
- Identical card grids of "feature tiles" — wrong register.
- Gradient text, glassmorphism — banned per impeccable shared laws.
- Side-stripe colored borders > 2px — banned. The chat-row selected state's 2px inline-start border is the maximum allowed.
