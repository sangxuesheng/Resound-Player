# Gemini Music

> A Vue 3 music streaming player with glassmorphism aesthetic, green accent, light/dark theme support.

## Visual Theme & Atmosphere

**Mood:** Clean, airy, translucent — modern music player with a premium glass feel. Surfaces are frosted glass, backgrounds are radial gradients, and the green accent (default `#22c55e`) provides a lively, natural energy point.

**Density:** Comfortable whitespace; cards have padding `--space-4` (16px), sections gap `--space-4`, lists have compact spacing but never cramped.

**Philosophy:** "Glass over gradient" — layered translucent surfaces on top of a soft radial gradient background. The glass effect is implemented via `backdrop-filter: blur()` + `box-shadow` + inset highlights. Every surface has a 1px border at reduced opacity. A `data-glass="off"` attribute provides a solid-surface fallback for performance-sensitive environments.

**Light mode:** Warm blue-white radial gradient background (`#f7fbff` → `#eef4ff`). Glass surfaces at 34% white opacity. Text is dark navy (`#0f172a`).

**Dark mode:** Deep navy radial gradient background (`#0d1a31` → `#070d19`). Glass surfaces at 46% dark opacity. Text is soft white (`#e2e8f0`).

## Color Palette & Roles

### Base surfaces

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg-app` | `radial-gradient(1200px 900px at 8% 8%, #f7fbff, #edf4ff, #e9f2ff, #eef4ff)` | `radial-gradient(1400px 900px at 14% 10%, #0d1a31, #0a1426, #090f1e, #070d19)` | Page background, root gradient |
| `--bg-surface` | `rgba(255,255,255,.34)` | `rgba(17,25,40,.46)` | Card/surface default, translucent |
| `--bg-muted` | `rgba(255,255,255,.22)` | `rgba(15,23,42,.4)` | Muted surface, lower emphasis |
| `--bg-soft` | `rgba(245,249,255,.36)` | `rgba(13,20,38,.5)` | Soft variant for sidebar |
| `--bg-solid` | `#f4f8ff` | `#0f1728` | Fully opaque surface (popups, modals, footer bar) |

### Text

| Token | Light | Dark | Role |
|---|---|---|---|
| `--text-main` | `#0f172a` | `#e2e8f0` | Primary headings, body text |
| `--text-sub` | `#475569` | `#b8c6d8` | Secondary text, artist names, descriptions |
| `--text-soft` | `#64748b` | `#93a5bb` | Placeholder, muted info, timestamps |

### Borders

| Token | Light | Dark |
|---|---|---|
| `--border` | `rgba(255,255,255,.58)` | `rgba(203,213,225,.28)` |
| `--border-soft` | `rgba(255,255,255,.34)` | `rgba(148,163,184,.26)` |

### Accent system

Primary accent is green (`#22c55e` / `--accent`). Four alternative accent colors are switchable via `data-accent` attribute:

| Variant | Hex | Token |
|---|---|---|
| Green (default) | `#22c55e` | `--accent-green` |
| Blue | `#3b82f6` | `--accent-blue` |
| Purple | `#a855f7` | `--accent-purple` |
| Orange | `#f97316` | `--accent-orange` |

Derived accent tokens:

| Token | Formula |
|---|---|
| `--accent-soft` | `color-mix(in srgb, var(--accent) 14-22%, var(--bg-surface))` |
| `--theme-primary` | `var(--accent)` |
| `--theme-primary-soft` | `color-mix(in srgb, var(--theme-primary) 14%, var(--bg-surface))` |
| `--theme-primary-hover` | `color-mix(in srgb, var(--theme-primary) 18%, var(--bg-surface))` |
| `--theme-primary-active` | `color-mix(in srgb, var(--theme-primary) 26%, var(--bg-surface))` |

### Semantic colors

| Token | Value | Role |
|---|---|---|
| `--danger` | `#ef4444` (light) / `#f87171` (dark) | Danger actions, error states |
| `--danger-soft` | `color-mix(in srgb, var(--danger) 14-18%, var(--bg-surface))` | Danger surface tint |
| `--warning` | `#eab308` | Warning states, buffering indicators |
| `--warning-soft` | `color-mix(in srgb, var(--warning) 14%, var(--bg-surface))` | Warning surface tint |
| `--info` | `#3b82f6` (blue) | Info/announcement, helper badges |
| `--info-soft` | `color-mix(in srgb, var(--info) 14%, var(--bg-surface))` | Info surface tint |

> **Note vs Spotify:** Spotify defines three semantic accent colors — negative red (`#f3727f`), warning orange (`#ffa42b`), and announcement blue (`#539df5`). Gemini Music uses the accent switch feature (`data-accent`) instead; the blue accent variant can serve as an info color. Adding explicit warning/info tokens makes the semantic boundary clearer for agents.

### Interactive states

| Token | Formula |
|---|---|
| `--control-hover` | `color-mix(in srgb, var(--accent) 14%, var(--bg-surface))` |
| `--control-active` | `color-mix(in srgb, var(--accent) 22%, var(--bg-surface))` |
| `--control-disabled-bg` | `color-mix(in srgb, var(--bg-muted) 72%, transparent)` |
| `--control-disabled-text` | `color-mix(in srgb, var(--text-soft) 70%, transparent)` |

## Typography Rules

**Font stack:** System-native — no custom typeface loaded. Uses browser default sans-serif.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
             Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue",
             sans-serif;
```

### Hierarchy

| Element | Size | Weight | Line Height | Color |
|---|---|---|---|---|
| Detail page title | 38px | bold (700) | 1.15 | `--text-main` |
| Section heading | ~18-20px | 600-700 | ~1.2 | `--text-main` |
| Song name / item title | ~14px | 600 | ~1.3 | `--text-main` |
| Secondary text (artist, desc) | 13px | normal (400) | 1.5 | `--text-sub` |
| Soft / muted info | 12px | normal | ~1.3 | `--text-soft` |
| Button text | 12-13px | 700 | normal | `--text-main` |

All headings (`h1`–`h6`), labels, and titles explicitly set `color: var(--text-main)`. Paragraphs, descriptions, artist names, and muted text use `var(--text-sub)`.

### Inline interaction

- Artist-inline buttons: transparent background, on hover turn accent color + underline
- Interactive text (links, names): `color` transition on hover to `var(--accent)` with `text-shadow` glow

## Component Stylings

### Glass system (applies to all cards, panels, dialogs)

```css
border-radius: var(--radius-lg) (14px);
background: var(--glass-reflection), var(--bg-solid);
border: 1px solid var(--border);
backdrop-filter: blur(var(--glass-blur)) saturate(145%);
box-shadow: var(--glass-shadow), var(--glass-highlight);
```

Fallback via `data-glass="off"`: solid `--bg-solid` background, no blur, simpler shadow.

### Button system

**Standard surface button (`.button-surface`):**

| State | Background | Border | Shadow |
|---|---|---|---|
| Default | `var(--glass-reflection), var(--bg-muted)` | `color-mix(in srgb, var(--border) 88%, transparent)` | `var(--glass-highlight)` |
| Hover | `var(--glass-reflection), color-mix(in srgb, var(--accent) 12%, var(--bg-surface))` | `color-mix(in srgb, var(--accent) 32%, var(--border))` | `0 12px 24px color-mix(...accent 10%..., transparent), var(--glass-highlight)` |
| Active | `var(--glass-reflection), color-mix(in srgb, var(--accent) 18%, var(--bg-surface))` | `color-mix(in srgb, var(--accent) 42%, var(--border))` | Same as hover |

- Height: `--button-height-md` (34px), `--button-height-lg` (40px)
- Radius: `--button-radius-pill` (999px), `--button-radius-md` (10px)

**Danger button (`.button-surface--danger`):**

| State | Background | Border |
|---|---|---|
| Default | `var(--glass-reflection), color-mix(in srgb, #ef4444 10-12%, var(--bg-surface))` | `color-mix(in srgb, #ef4444 28-30%, var(--border))` |
| Hover | `color-mix(in srgb, #ef4444 16-18%, var(--bg-surface))` | `color-mix(in srgb, #ef4444 40-42%, var(--border))` |

**Primary action button (`.ctrl.main`, `.play-btn`, `.search-btn`):**

```css
background: linear-gradient(160deg,
  color-mix(in srgb, var(--accent) 92%, #fff),
  color-mix(in srgb, var(--accent) 74%, #000));
border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
color: #ffffff;
box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 34%, transparent), var(--glass-highlight);
```

**Play icon button (`.play-icon-btn`):**

- 32px circle, uses `--theme-primary-soft` background
- SVG triangle icon in `currentColor` (16x16)
- Hover: brighter background + lift shadow

**Buttons marked as exceptions (NOT standard surface):**
- `PlayPauseButton` — list inline playback control
- `BookmarkIconButton` — bookmark/like entry point

### Cards

All cards share the glass system base. Common types:

- `.featured-card`, `.rank-card`, `.global-card`, `.entity-card`, `.genre-card` — media cards with cover images
- `.top-mini-card` — compact horizontal mini card
- `.curated-card` — curated playlist card
- `.sidebar` — navigation sidebar using `--bg-soft`
- `.detail-card` / `.detail-panel` — detail page container with accent background gradient (`:before`/`:after` pseudo-elements with blurred cover overlay)
- `.playlist-gradient-card` / `.album-gradient-card` — gradient-tinted cards with cover image overlay, used for curated playlists and album promotions. Background is a `color-mix(in srgb, var(--accent)...)` gradient that adapts to the current accent color.
- `.gradient-card` name pattern in global selectors — all gradient-variant cards use the same glass border + backdrop-filter base, with an additional semi-transparent accent gradient overlay layer.

**Card hover:** `translateY(-1px)` lift + accent-tinted shadow (`0 14px 30px color-mix(in srgb, var(--accent) 12%, ...)`).

### Cover images

All cover images (`.cover`, `.song-cover`, `.rank-cover`, etc.) use the unified `--image-hover-scale` (1.05x) from `animations.css`:

```css
transition: transform var(--image-hover-duration) var(--image-hover-ease);
@media (hover: hover) and (pointer: fine) {
  .cover:hover { transform: scale(var(--image-hover-scale)); }
}
```

Cover scale is NEVER defined per-component. Always uses the token.

### Popups / Dropdowns / Menus

**Content panel:** Must use `var(--bg-solid)` (opaque), never semi-transparent.

```css
.popup { background: var(--bg-solid); }
.popup-item:hover { background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid)); }
.popup-item.active { background: color-mix(in srgb, var(--accent) 12%, var(--bg-solid)); }
```

Exceptions: backdrop overlays keep semi-transparent black. Decorative gradient overlays keep transparency.

### Inputs / Search

```css
.search-input, .input, .select {
  border-radius: var(--radius-sm) (10px);
  background: var(--glass-reflection), var(--bg-muted);
  border: 1px solid var(--border);
  color: var(--text-main);
  box-shadow: var(--glass-highlight);
}
::placeholder { color: var(--text-soft); }
```

Hover: accent-tinted border + `var(--control-hover)` background.

### Range sliders (volume, progress)

```css
input[type='range']::-webkit-slider-runnable-track {
  height: 4px; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 36%, var(--bg-muted));
}
input[type='range']::-webkit-slider-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
}
```

### Hover play button

Floating play button overlay on media cards. Initially hidden; fades in + slides up on card hover.

```css
.hover-play-button {
  position: absolute; right: 10px; bottom: 10px;
  width: 36px; height: 36px; border-radius: 999px;
  background: radial-gradient(...) , linear-gradient(...);
  backdrop-filter: blur(12px);
  opacity: 0; transform: translateY(lift) scale(0.92);
}
.hover-play-button-trigger:hover .hover-play-button {
  opacity: 1; transform: translateY(0) scale(1);
}
```

Sizes: `--sm` (30px), `--md` (36px), `--lg` (42px).

### Currently playing indicator

`.song-item--playing` gets a green-tinted gradient background + green accent border + green shadow. Text color switches to `--accent`.

## Layout Principles

### Spacing scale

| Token | Value | Usage |
|---|---|---|
| `--space-0` | 0 | Reset |
| `--space-1` | 4px | Tight gap, inline spacing |
| `--space-2` | 8px | Control gap, card inner padding |
| `--space-3` | 12px | Section gap, input padding |
| `--space-4` | 16px | Page gap, card padding (default) |
| `--space-5` | 20px | Loose variant |
| `--space-6` | 24px | Wide section gap |
| `--space-8` | 32px | Major section separation |

All `gap`, `padding`, `margin` use these tokens. No hardcoded spacing values.

### Border-radius scale

| Level | Token | Value | Usage |
|---|---|---|---|
| Small | `--radius-sm` | 10px | Inputs, search fields, inline controls |
| Medium | `--radius-md` | 12px | Play buttons, compact elements |
| Large (default) | `--radius-lg` | 14px | Cards, panels, dialogs, list items |
| Extra large | `--radius-xl` | 16px | Detail page covers, hero media |
| Pill | `--button-radius-pill` | 999px | Primary buttons, pills, chips |
| Circle | `--button-radius-md` | 10px | Icon buttons (circular via equal w/h + radius) |
| Detail cover | (custom) | 16px | Album art in hero area |

> **Comparison:** Spotify uses pill geometry heavily (500px-9999px for buttons, 50% for circular controls). Gemini Music takes a moderate approach — standard radius for general surfaces, pill only for specific button classes. This avoids the "everything is a pill" trap while keeping touch-friendly rounded corners on all interactive elements.

### Page structure

```css
.page-stack { display: grid; gap: var(--layout-page-gap); }
.page-stack--compact { gap: var(--layout-section-gap); }
.page-stack--loose { gap: var(--space-6); }
```

### Detail page layout

Two-column grid for hero area:

```css
.header {
  display: grid;
  grid-template-columns: 269px 1fr;
  gap: var(--space-4);
}
.cover { width: 269px; height: 269px; border-radius: 16px; }
.title { font-size: 38px; }
.desc  { font-size: 13px; }
```

Song list items:

```css
.song-item {
  display: grid;
  grid-template-columns: 40px 52px 1fr auto;
  gap: var(--space-3);
  padding: 10px 12px;
}
.song-cover { width: 52px; height: 52px; border-radius: 10px; }
```

### Layout utility classes

| Class | Pattern |
|---|---|
| `.page-stack` / `.stack` | `display: grid; gap: token` |
| `.cluster` / `.inline-cluster` | `display: flex; flex-wrap: wrap; align-items: center` |
| `.ui-safe-rail` | `overflow-x: auto; overflow-y: visible; padding-top: 2px; scrollbar-width: none` |
| `.ui-safe-group` | `overflow: visible; padding-top: 2px` |

### Glass system config

| Token | Light | Dark |
|---|---|---|
| `--glass-blur` | 18px | 20px |
| `--glass-shadow` | `0 14px 34px rgba(15,23,42,.14), 0 2px 10px rgba(15,23,42,.08)` | `0 16px 38px rgba(2,6,23,.45), 0 3px 14px rgba(2,6,23,.3)` |
| `--glass-highlight` | `inset 0 1px 0 rgba(255,255,255,.62), inset 0 -1px 0 rgba(255,255,255,.16)` | `inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(255,255,255,.08)` |
| `--glass-reflection` | `linear-gradient(155deg, rgba(255,255,255,.42), rgba(255,255,255,.2), rgba(255,255,255,.06), rgba(255,255,255,.02))` | `linear-gradient(155deg, rgba(255,255,255,.18), rgba(255,255,255,.08), rgba(255,255,255,.03), transparent)` |

## Depth & Elevation

Cards use a layered elevation model:

1. **Page background** (`--bg-app`): radial gradient, no shadow
2. **Surface cards** (`.card`, `.panel`): glass blur + `--glass-shadow` + 1px border
3. **Interactive hover**: `translateY(-1px)` lift + accent-tinted extended shadow
4. **Active press**: `translateY(0) scale(0.99)` — slight scale-down
5. **Currently playing**: green gradient background + green border + green-tinted shadow
6. **Modal/overlay**: dark semi-transparent backdrop (`color-mix(in srgb, #000 34%, transparent)`)

```css
/* Surface stack example */
.card {
  background: var(--glass-reflection), var(--bg-solid);
  border: 1px solid var(--border);
  backdrop-filter: blur(var(--glass-blur)) saturate(145%);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
}
.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px color-mix(in srgb, var(--accent) 12%, rgba(15,23,42,.14));
}
```

### Themed range/progress sliders

- Track: 4px height, 999px radius, accent-tinted muted background
- Thumb: 14px circle, accent green, 3px semi-transparent glow ring, dark drop-shadow

### Focus-visible

```css
button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: 1px;
}
```

## Do's and Don'ts

### Do
- Use CSS token variables (`--space-*`, `--bg-*`, `--text-*`, `--accent*`, `--radius-*`) instead of hardcoded values
- Use `--image-hover-scale` for all cover image hover effects — never define per-component
- Apply `.button-surface` to all standard buttons (tabs, chips, menu items, dropdown triggers)
- Apply `.ui-safe-rail` / `.ui-safe-group` for horizontal scroll containers with hover-lift children
- Use `color-mix()` with accent for interactive/active surface tints
- Use `var(--bg-solid)` for popup/dropdown/modal content panels (opaque only)
- Respect `prefers-reduced-motion` — disable all animations
- Use `AnimatedAppear` component for consistent entrance animations with rhythm offsets
- Use `BookmarkIconButton` for all bookmark/like entries — never write custom heart buttons
- Let album art and cover imagery provide environmental color — the UI chrome stays neutral, covers carry the visual drama
- Use the accent green functionally (play button, active state, primary CTA, currently-playing indicator) — it's a signal, not decoration
- Keep typography compact for scanning — this is a music player, list-heavy, not an article layout
- Let the glass highlight (`--glass-highlight`) define surface edges on dark mode instead of heavy borders

> **Comparison vs Spotify:** Spotify uses green (`#1ed760`) strictly for functional highlights — play controls, active states, and CTAs. It never appears as a background fill or decorative element. Album art provides all environmental color. Gemini Music follows the same philosophy: the accent is a signal, not a theme.
>
> **Comparison vs ElevenLabs:** ElevenLabs uses warm-tinted shadows to give surfaces tactile quality. Gemini Music achieves this via `--glass-reflection` + `--glass-highlight` — the inset highlight creates edge definition without shadow weight.

### Don't
- Don't hardcode hex colors in component scoped CSS — use tokens
- Don't define cover hover scale in component CSS — always use `var(--image-hover-scale)`
- Don't write custom glass button styles in pages — use `.button-surface`
- Don't use `var(--bg-surface)` or `var(--bg-muted)` for popup/menu backgrounds — use `var(--bg-solid)`
- Don't add `overflow: hidden` to parents of hover-lift buttons without checking for clipping
- Don't implement bookmark/like logic in page components — use the standard data flow
- Don't write `padding-top: 2px` + `overflow-x: auto` as page-specific fixes — use `.ui-safe-rail`
- Don't use wildcard selectors like `[class*='cover']`
- Don't use semi-transparent backgrounds on toast notifications
- Don't use accent green as page background or decorative fill — it's functional only (play, active state, CTA)
- Don't add additional brand colors beyond the accent system — the palette is intentionally restrained
- Don't use relaxed line-heights (>1.5) on list items — music lists need compact scanning density
- Don't expose raw gray borders on dark mode surfaces — let the glass border + highlight system do edge definition
- Don't flatten all corners to a single radius — use the radius scale purposefully by component type
- Don't override player layout tokens in page-specific CSS (e.g. footer bar height, sidebar width) — they're centralized

> **Comparison vs Apple:** Apple uses radius tiers purposefully (8px for controls, 16-18px for cards, 50% for circular). Gemini Music follows the same principle with `--radius-sm/md/lg/xl + --button-radius-pill/md`.
>
> **Comparison vs ElevenLabs:** ElevenLabs avoids heavy shadows entirely. Gemini Music uses moderate shadow weight — enough to lift on hover, not enough to feel heavy. The `--glass-highlight` inset replaces the need for high-opacity shadows on dark surfaces.

## Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | `≤ 767px` | Detail page: single column; cover shrinks to 140px; title to 26px |
| Desktop | `≥ 768px` | Two-column header; full layout |

### Mobile adjustments

```css
@media (max-width: 767px) {
  .header { grid-template-columns: 1fr; }
  .cover { width: 140px; height: 140px; }
  .title { font-size: 26px; }
}
```

### Touch support

- Touch devices get `:active` scale feedback (1.02x) on covers instead of hover
- All interactive elements have `min-height` sufficient for touch targets
- No hover-dependent interactions without touch alternative

### Accessibility

- `prefers-reduced-motion`: all animations/transitions disabled, cover hover scales reset to `none`
- `aria-pressed` on bookmark buttons
- `aria-label` on icon buttons
- `user-select: none` on body, re-enabled on inputs and contenteditable areas

## Motion & Animation

### Timing tokens

| Token | Value |
|---|---|
| `--an-duration-fast` | 320ms |
| `--an-duration-base` | 380ms |
| `--an-duration-slow` | 460ms |
| `--an-stagger-step` | 48ms |
| `--an-ease` | ease-out |
| `--an-rhythm-step` | 42ms |

### Rhythm offsets

| Token | Index | Purpose |
|---|---|---|
| `--an-rhythm-shell` | 0 | Sidebar, outer shell |
| `--an-rhythm-head` | 1 | Top bar |
| `--an-rhythm-title` | 2 | Page titles |
| `--an-rhythm-body` | 3 | Content cards, media |
| `--an-rhythm-actions` | 4 | Action buttons, controls |
| `--an-rhythm-list` | 5 | List items (staggered) |
| `--an-rhythm-overlay` | 6 | Modals, overlays |

### Entrance animations

| Keyframe | Class | Effect |
|---|---|---|
| `anFadeUp` | `.an-enter` / `.an-enter-card` / `.an-enter-text` | opacity 0→1, translateY(12px→0) |
| `anSlideLeft` | `.an-enter-nav` / `.an-sidebar-enter` | opacity 0→1, translateX(-16px→0) |
| `anDropIn` | `.an-title-enter` | opacity 0→1, translateY(-14px→0) |
| `anPopUp` | `.an-enter-media` | opacity 0→1, translateY(14px) scale(0.96→1) |
| `anScaleIn` | `.an-enter-control` | opacity 0→1, scale(0.9→1) |
| `anModalIn` | `.an-enter-modal` | opacity 0→1, scale(0.94→1) |

### Vinyl record animation

```css
@keyframes playerCoverRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Interactive transitions

All interactive elements use a 220ms ease-out transition on `transform`, `box-shadow`, `border-color`, `background-color`, `color`, `opacity`.

Hover lift: `translateY(-1px)` with 220ms ease.
Active press: `translateY(0) scale(0.99)`.

### Hover play button transitions

```css
.hover-play-button {
  transition: opacity 0.24s ease, transform 0.24s ease, filter 0.24s ease;
}
```

## Anti-Patterns

- **Don't mix spacing scales** — never use both `--space-*` and hardcoded px on the same page
- **Don't hardcode glass values** — use `--glass-*` tokens; if glass is off, surfaces fall back to solid
- **Don't repeat card/panel background declarations per page** — the universal `.card` / `.panel` selectors in `theme.css` apply to all; only override when structurally necessary
- **Don't write per-component entrance animations** — use `AnimatedAppear` with rhythm offsets
- **Don't override the player footer bar background** — it must stay `--bg-solid` at all times
- **Don't add new accent color presets outside `theme.css`** — they're defined in `:root[data-accent='*']` blocks
- **Don't treat light and dark modes as separate design systems** — core tokens are shared; only surface/background values differ
- **Don't skip the glass highlight inset** on dark surfaces — it provides edge definition that shadows alone cannot on dark backgrounds
- **Don't expose the glass system as a per-component concern** — it's applied globally via universal selectors in `theme.css`; individual components only need to use `--bg-*` tokens
- **Don't add custom button styles that repeat the glass surface pattern** — `.button-surface` already handles the reflection + border + highlight stack
- **Don't use `!important` in component scoped CSS for layout properties** — the glass system in `theme.css` uses it intentionally for universal selectors, but page-level overrides should use the cascade instead

## Agent Prompt Guide

### Quick color reference

```css
/* Green accent tokens */
--accent: #22c55e;
--accent-soft: rgba(34, 197, 94, 0.18);

/* Surface background priority: */
--bg-app          /* page background gradient */
--bg-surface      /* translucent card surface */
--bg-muted        /* lower emphasis surface */
--bg-solid        /* opaque surface for popups, footer */

/* Text hierarchy: */
--text-main       /* headings, body */
--text-sub        /* secondary, artist, desc */
--text-soft       /* placeholder, muted */

/* Spacing: 0, 4px, 8px, 12px, 16px, 20px, 24px, 32px */
--space-0 through --space-8

/* Radius: */
--radius-sm: 10px; --radius-md: 12px; --radius-lg: 14px; --radius-xl: 16px;

/* Buttons: standard → .button-surface, danger → .button-surface--danger */
/* Primary actions: gradient background with accent */
/* Play icon button: 32px circle → .play-icon-btn */

/* Container safety: */
.ui-safe-rail   /* horizontal scroll + hover lift */
.ui-safe-group  /* compact button group + hover lift */
```

### Ready-to-use prompt

> "Build a [component/page] for Gemini Music using the design tokens from `DESIGN.md`. Use glass surfaces (`var(--bg-surface)`), green accent (`var(--accent)`), system font stack, and `--space-*` for spacing. Apply `.button-surface` to standard buttons, `.ui-safe-rail` for horizontal scroll containers. Entrance animation uses `AnimatedAppear` with appropriate rhythm offset. Cover images use `var(--image-hover-scale)` for hover effect."

### File structure

```
src/
  styles/
    theme.css         # Design tokens (1186 lines) — color, spacing, buttons, glass, layout
    animations.css    # Animation keyframes, rhythm system, cover hover (382 lines)
    detail-page.css   # Detail page layout shell (406 lines)
    hover-play-button.css  # Floating play button overlay (104 lines)
    interactive-media.css  # Interactive media hover scale (39 lines)
  components/
    ui/               # Atomic UI components (FancySwitch, BookmarkIconButton, etc.)
  api/
    music.ts          # Music API
    auth.ts           # Auth API
  stores/
    player.ts         # Player state (reactive singleton)
    user.ts           # User/auth state
    lyricsSettings.ts # Lyrics display settings
```