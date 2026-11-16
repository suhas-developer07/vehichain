# UI Redesign — Product & Design Plan

## Product framing

The registry is not a CRUD demo. It is a **trust instrument** used at the highest-stakes
moment in a vehicle's life: the moment money changes hands. The interface should feel like a
precision tool used by an assessor — calm, dense with evidence, and unmistakably credible.

**Design concept:** *Trust, made tangible.*

- **Obsidian + signal light.** Deep navy/black surfaces make hashes, timestamps, and trust
  signals feel like instrumentation. Mint, indigo, amber, and rose are reserved for meaning,
  never decoration.
- **Evidence over ornament.** Every visual flourish reinforces a fact: a verified photo, a
  chain event, a failed check, a fingerprint.
- **One command surface.** A persistent left rail, quick VIN lookup, live network status, and
  wallet identity are always one glance away.
- **Two moods, one system.** A dark "night shift" theme for operations and a light "porcelain"
  theme for daylight reviews and printing, both driven by the same tokens.

## Design principles

1. **Hierarchy before decoration.** Eyebrow → headline → supporting copy → action. No page
   starts with an unlabelled `<h1>`.
2. **Semantic colour only.** Green = clear, amber = review, rose = blocked, mint/indigo = brand
   and navigation. Colour never carries meaning alone; every state also has a label and icon.
3. **Readable evidence.** Hashes and addresses use a dedicated monospace face, truncate with
   a full-value tooltip, and never wrap into unreadable columns.
4. **Progressive density.** Public pages are spacious and editorial. Operator pages are denser
   with forms, tables, and status rails.
5. **Motion with restraint.** 150–250 ms transitions, one entrance animation per page, no
   looping distractions. Respect `prefers-reduced-motion`.
6. **Accessible by default.** Visible focus rings, 4.5:1 body contrast, keyboard-operable
   navigation, labelled icon buttons, and a print stylesheet that removes all chrome.

## Design tokens

| Token | Dark (default) | Light |
|---|---|---|
| Canvas | `#05070d` | `#f4f1ea` (porcelain) |
| Surface | translucent `#0f172a` | translucent `#fffdf8` |
| Text | `#e9effb` | `#191712` |
| Muted | `#8290aa` | `#6b6355` |
| Accent | mint `#5eead4` | teal `#0f766e` |
| Secondary | indigo `#818cf8` | indigo `#4f46e5` |
| Success | `#34d399` | `#047857` |
| Warning | `#fbbf24` | `#a16207` |
| Danger | `#fb7185` | `#be123c` |
| Radius | 8 / 14 / 20 / 26 px | same |
| Display type | Space Grotesk | same |
| Body type | Inter | same |
| Evidence type | JetBrains Mono | same |

## Shell & navigation

- **Left rail (272 px):** brand mark, grouped navigation, network card, theme switch.
  Groups: *Explore* (Lookup, Dashboard, Buyer Check), *Operate* (Register, Add Record,
  Transfer), *Control* (Admin).
- **Top bar:** breadcrumb, quick VIN lookup, network pill, theme toggle, wallet + role.
- **Mobile:** the rail becomes an overlay drawer; the top bar keeps menu, lookup, and wallet.
- **Theme:** dark by default, persisted in `localStorage`, with an inline boot script to avoid
  a flash of the wrong theme.

## Screen-by-screen treatment

### Vehicle Lookup (`/`, `/vehicle/:vin`)
- Editorial hero with a live-truth badge, large promise headline, three proof points, and a
  command-style VIN search.
- Loaded state becomes a **vehicle dossier**: photo, identity chips, owner, record count, and
  a prominent trust instrument.
- History becomes a vertical evidence timeline with typed icons and anchor hashes.

### Register Vehicle (`/register`)
- Two-column form card with a labelled photo dropzone/preview and a clear signing pipeline.
- Empty/denied states use a designed state panel, not a bare warning line.

### Add Record (`/add-record`)
- Dense operator form with role-aware access state.
- Immutable-write notice, evidence hash field, and transaction status rail.

### Transfer Ownership (`/transfer`)
- VIN check step, ownership verification banner, then the transfer form.
- Clear separation between "verify" and "irreversible transfer".

### Admin Console (`/admin`)
- Role assignment card plus a visual role legend.
- Admin-signed watchlist manager with severity language and resolved-state styling.

### Dashboard (`/dashboard`)
- KPI row with icons and semantic accents.
- 14-day activity chart, trust distribution, record mix, top makes, live feed, recent vehicles.
- Live/paused pill and refresh controls in the page header.

### Buyer Due Diligence (`/due-diligence/:vin`)
- Search-first entry, then a **verdict hero** with a status-coloured glow, oversized trust
  ring, reasons, and metadata.
- 12-check checklist, red-flag rail, ownership timeline, two-vehicle comparison, and report
  fingerprint.
- Fully print-friendly.

### Vehicle Passport (`/passport/:vin`)
- A certificate-grade white document on the dark canvas: guilloche texture, double rule,
  registry seal, framed photo, QR verification block, trust instrument, history timeline, and
  document fingerprint.
- Toolbar with back, buyer report, PDF, and print actions.

## Motion & interaction

- Page entrance: 12 px rise + fade, 240 ms.
- Cards lift 2 px and brighten their border on hover.
- Buttons compress on active, glow on hover.
- Score rings and gauges reveal their live value with a soft scale/fade entrance.
- Skeleton shimmer for loading states.
- Reduced-motion media query disables transforms and infinite pulses.

## Verification plan

1. `npm run build` must pass.
2. Every route renders without console-breaking imports.
3. Theme toggle persists and survives reload.
4. Mobile drawer opens/closes; navigation closes it.
5. Print preview contains only the passport/report content.
6. No inline colours that become unreadable in either theme.
7. Contrast and focus states checked by token design and manual CSS audit.

## Implementation status

- `npm run build` passes (Vite production build).
- All eight routes are wired through the new shell; backend health, analytics, and
  due-diligence APIs were re-checked against the running services.
- Theme boot script + `useTheme` persistence are in place; both token palettes are defined.
- Shared design system lives in `frontend/src/styles/` and is imported by `App.css`:
  `tokens.css`, `components.css`, `pages.css`, `passport.css`.
- Print stylesheet targets the passport document and strips the app chrome.
- Verification remains build- and API-based in this environment (no browser capture
  available), so visual QA should be confirmed in a real browser at 1440 px and 390 px.
