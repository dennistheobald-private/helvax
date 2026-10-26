# Helvax UI (v0.3)

Reusable HTML/CSS component library for the security simulation platform (Phase 0 of the app design).

## Files
- `tokens.css`: all design tokens (color, type, spacing, radii, shadows, motion, breakpoints, z-index). Light only.
- `components.css`: 36 components, all prefixed `hx-`. Wrap the app in `.hx-root`.
- `components.js`: dependency-free behaviour wired by `data-hx-*` attributes. Exposes `window.HelvaxUI` (`init`, `toast`, `lineChart`, `barChart`, `sparkline`, `setLoading`).
- `index.html`: the showcase / design-system page with live demos, copyable HTML and per-component specs (props, HTML, keyboard, states, a11y, responsive).

## Use
```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<body class="hx-root"> ... <script src="components.js"></script>
```

## Notes
- Fonts: Plus Jakarta Sans, Inter and IBM Plex Mono are all SIL OFL. The showcase loads them from Google Fonts; for production self-host the WOFF2 files with `font-display: swap`.
- Contrast: `brand-600` (#D94F1C) is 4.1:1 on white, below AA for small text, so the library adds `brand-700` (#B4400F, 5.7:1) for orange text. Primary buttons use ink text on orange (5.8:1).
- Open `index.html` directly in a browser (or serve this folder) to view the showcase. A hosted copy is at https://claude.ai/artifact/UCZjvCZCEqUTHNDkhLy6sY.
- Product name: Helvax. The logo is the Split mark (a flat orange disc pulled apart, the breach a simulation finds) beside a lowercase "helvax" wordmark in Plus Jakarta Sans ExtraBold, outlined. SVGs for the mark, horizontal lockup (plus `-dark` with a white wordmark for dark backgrounds) and favicon are in `logo/`. All example data is fictional.
- React wrappers live in `react/` and are imported as `@helvax/ui/react`: `Icon`, `LogoMark`, `AppIcon`, `Button`, `ButtonLink`, `buttonClass`, `Badge`, `Card`, `StatCard`, `Alert`, `Field`, `EmptyState`, `Navbar` and `AppShell`. They render the same markup as the snippets, which stay the contract. Apps import `@helvax/ui/tokens.css` and `@helvax/ui/components.css` once in their root layout. More wrappers get added as screens need them.

## v0.3: light only
- No dark theme. Light grey page, warm stone panels, white floating navbar, lighter display weights.
- New: `.hx-window` inbox preview with `.hx-mailrow`, `.hx-grain--sage`, `.hx-grain--bleed`.

## v0.2 style (Vowen + noon direction)
- Pill buttons; primary is orange with a soft glow, `--soft` is the light grey secondary, `--secondary` stays ink.
- Two-tone `.hx-headline` (ink line + grey `__sub` line), `.hx-appicon`, floating `.hx-navbar`, `.hx-clouds` peach haze.
- Warm stone `.hx-panel`, grainy orange `.hx-grain`, outlined `.hx-status` pills, `.hx-incident` card with a mono header strip, `.hx-item`, `.hx-tag`, `.hx-kicker`, `.hx-title`, `.hx-tabs--track` / `--caps`.
- New tokens: `--radius-btn`, `--radius-panel`, `--soft`, `--headline-2`, `--cloud-*`, `--stone-*`, `--nav-*`, `--glow-brand`.
