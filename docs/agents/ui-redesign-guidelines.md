# UI redesign guidelines — app theme (Design B)

The app uses a centralized theme in `src/app/colours.css` (`--b-*` tokens). Legacy names (`--text-primary`, `.panel`, `.btn-fsm`) are aliases to the same values.

Reference implementations:

| Role | Path |
|------|------|
| Target design | `src/app/components/homescreen/HomescreenDesignB.tsx` |
| Legacy comparison | `src/app/components/homescreen/HomescreenDesignA.tsx` |
| Colour tokens | `src/app/colours.css` (`--b-*` block) |
| Shared control styles | `src/app/globals.css` (`.panel`, `.btn-fsm`, `.app-input`, `.app-btn`) |
| Fonts | `src/app/layout.tsx` (`Fraunces`, `IBM Plex Sans`, `DM Sans`) |
| Release label | `src/lib/app-version.ts` → `RELEASE_VERSION` |

---

## 1. Design intent

### Legacy (FSM theme)

- Dark slate base, **cyan / purple / green** accents
- **Radial gradients** on panels, buttons, chips, avatars
- **Glow** shadows and animated pulse/glow utilities
- Pill-shaped gradient buttons (`btn-fsm`)
- Heavy `.panel` shadows (`--shadow-panel`)
- Noise texture on `body`
- Mixed inline `style={{ }}` overrides on inputs

### Design B (target)

- **Warm neutral** backgrounds (paper / charcoal), not cool slate
- **One strong accent** (crimson / rose) used sparingly
- **Flat surfaces** — solid fills, light border, soft elevation shadow
- **No gradients or glow** on standard UI chrome
- **App layout**: centered column, `max-w-md`, hero + form card
- **Typography**: Fraunces for display, IBM Plex Sans for UI copy
- **Minimal feedback**: 150ms transitions, focus ring, `scale(0.99)` on press only

---

## 2. Token mapping

Use **`--b-*` tokens** for migrated screens. Do not mix FSM gradient variables into new UI.

| Legacy | Design B | Usage |
|--------|----------|--------|
| `--bg-primary`, `--bg-secondary-solid` | `--b-bg` | Page background |
| `--text-primary` | `--b-fg` | Headings, input text |
| `--text-secondary` | `--b-muted` | Subtitles, labels, placeholders |
| `--border-default` | `--b-line` | Input borders |
| `--surface-card` (Design A) | `--b-surface` | Raised card / form panel |
| — | `--b-surface-border` | Card border |
| `--accent` / `--color-primary` (cyan/indigo) | `--b-accent` | CTA, focus, badge text |
| `--accent-hover` | `--b-accent-hover` | Button hover |
| `--accent-foreground` | `--b-accent-foreground` | Text on filled buttons |
| `--ring-focus` | `--b-ring-focus` | Focus ring on inputs |

Both themes support `data-theme="light"` on `<html>` (see `ThemeToggle`).

**Rebrand:** change `--b-accent` / `--b-accent-hover` in `colours.css` (Design B block only).

---

## 3. Typography

| Element | Font | Weight / size notes |
|---------|------|---------------------|
| Display title (h1) | `var(--font-b-display)` (Fraunces) | `font-normal`, `tracking-[-0.02em]`, ~2.25–2.5rem |
| Body, labels, inputs | `var(--font-b-sans)` (IBM Plex Sans) | Labels: `text-xs font-medium`; body: ~15px |
| Version / meta badge | IBM Plex Sans | `text-xs`, accent color |
| Game / data (optional) | `var(--font-app-mono)` (DM Mono) | Unchanged for code-like content |

Set on the screen root:

```tsx
style={{ fontFamily: "var(--font-b-sans)", color: "var(--b-fg)", background: "var(--b-bg)" }}
```

Use Fraunces only on marketing-style headings, not on dense game UI unless intentional.

---

## 4. Layout pattern

Wrap each screen in a **scoped root** (e.g. `className="home-b"` or `game-b` once you namespace game styles):

```
┌─────────────────────────────────────┐
│  flex min-h-dvh items-center        │
│  justify-center px-5 py-12          │
│  ┌──────────────── max-w-md ────┐ │
│  │  header (text-center)          │ │
│  │    badge (optional)            │ │
│  │    h1 (Fraunces)               │ │
│  │    subtitle (b-muted)          │ │
│  │  form card (b-surface)         │ │
│  │    label + input + primary btn │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Rules:

- **Center** hero copy (`text-center`); keep **input text left-aligned** for typing.
- Constrain width with `max-w-md` (or `max-w-lg` for wide game boards).
- Use `gap-8` between hero and card; `p-6 sm:p-7` inside the card.
- Prefer **one primary action** per card (full-width button).

---

## 5. Component replacements

### Panels

| Legacy | Design B |
|--------|----------|
| `<div className="panel">` | Card with `rounded-2xl border`, `background: var(--b-surface)`, `borderColor: var(--b-surface-border)`, light box-shadow |
| `player-panel` + gradient | Flat surface + accent border on “active” state only (no gradient fill) |

### Buttons

| Legacy | Design B |
|--------|----------|
| `btn-fsm` (gradient pill) | `btn home-b-btn` — solid `--b-accent`, `rounded-xl`, `h-12`, full width for primary |
| Secondary actions | `btn btn-ghost` or outline: `border border-[var(--b-line)]`, `background: transparent` |

Shared styles live under `.home-b .home-b-btn` in `globals.css`. Copy that block under a new scope (e.g. `.lobby-b`) when migrating other routes.

### Inputs

| Legacy | Design B |
|--------|----------|
| `input` + inline styles | `input input-bordered home-b-input h-12 rounded-xl` |
| Gradient / glow focus | `--b-ring-focus` via `.home-b-input:focus-visible` |

Use DaisyUI `form-control` + `label` for structure.

### Badges / chips

| Legacy | Design B |
|--------|----------|
| `chip` + `chip-dot` + glow | Pill: `rounded-full px-3 py-1 text-xs`, `color-mix` background from accent |
| Decorative labels | `RELEASE_VERSION` for build label; use chips only for real status |

### Animations

| Legacy | Design B |
|--------|----------|
| `animate-glow-filter`, `animate-pulse-glow` | Remove from chrome; keep only functional motion (shake on error, heart-loss in game) |
| Heavy `animate-health-damage` glow | Tighten to border flash or brief scale without colored glow |

---

## 6. Screen migration checklist

For each route (lobby, site-login, game shell, overlays):

1. **Add a scope class** on the root (`home-b`, `lobby-b`, …).
2. **Swap backgrounds** to `--b-bg`; remove `var(--bg-primary)` and noise reliance on that screen.
3. **Replace `.panel`** with the card pattern from `HomescreenDesignB`.
4. **Replace `btn-fsm`** with `home-b-btn` (or scoped equivalent).
5. **Replace inline input styles** with `home-b-input` + DaisyUI classes.
6. **Recompose copy** into centered hero + card where it fits; game board may stay full-width but should use `--b-*` colours.
7. **Audit accents**: one crimson highlight per view; success/error keep semantic reds/greens but without glow.
8. **Test** `data-theme="light"` and `dark` via ThemeToggle.
9. **Remove** unused inline `style={{ }}` once tokens cover the case.

Suggested order:

1. `site-login/page.tsx` (same shape as homescreen)
2. `lobby/page.tsx`
3. `AppNav.tsx` / `ThemeToggle.tsx` (neutral chrome, no gradient)
4. `game-v2/*` (largest surface area; namespace `.game-b` in `game-v2.css`)

---

## 7. CSS workflow

### Option A — Reuse `.home-b` (fastest)

Use `className="home-b"` on the screen root and `home-b-input` / `home-b-btn` on controls. Good for login and simple forms.

### Option B — Per-route scope (recommended for game)

Duplicate the `.home-b` utility block in `globals.css` as `.lobby-b`, `.game-b`, etc., all pointing at the same `--b-*` variables. Lets you tweak game-specific density without breaking homescreen.

### Option C — Consolidate tokens (later)

When most screens are migrated, rename `--b-*` → `--app-*` and deprecate FSM variables in `colours.css`. Do not do this until game UI no longer depends on `--gradient-*` and `--shadow-panel`.

---

## 8. DaisyUI

Keep using DaisyUI for structure:

- `card`, `card-body`, `form-control`, `input input-bordered`, `btn`
- Override colours via CSS variables + scoped classes, not DaisyUI theme plugins, until you configure a custom Daisy theme matching `--b-*`.

Avoid DaisyUI `btn-primary` colours until the Daisy theme matches Design B.

---

## 9. Do / don’t

**Do**

- Use semantic `--b-*` tokens for colour
- Keep touch targets ≥ 48px (`h-12`)
- Use `color-mix(in srgb, var(--b-accent) 12%, transparent)` for subtle badge backgrounds
- Import `RELEASE_VERSION` for version/meta badges
- Use `font-medium` on buttons; `font-normal` on Fraunces headings

**Don’t**

- Use `var(--gradient-*)` on new components
- Use `var(--shadow-button)` or cyan glow shadows
- Use `btn-fsm` on migrated screens
- Apply `animate-pulse-glow` / `animate-glow-filter` to static UI
- Hardcode hex in components (add tokens to `colours.css` instead)
- Center-align text inside text inputs

---

## 10. Minimal page template

```tsx
export function ExampleScreen() {
  return (
    <div
      className="home-b flex min-h-dvh flex-col items-center justify-center px-5 py-12"
      style={{ background: "var(--b-bg)", color: "var(--b-fg)", fontFamily: "var(--font-b-sans)" }}
    >
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="space-y-4 text-center">
          <h1
            className="text-4xl font-normal tracking-tight"
            style={{ fontFamily: "var(--font-b-display)" }}
          >
            Title
          </h1>
          <p className="text-sm" style={{ color: "var(--b-muted)" }}>
            Subtitle
          </p>
        </header>

        <section
          className="rounded-2xl border p-6"
          style={{
            background: "var(--b-surface)",
            borderColor: "var(--b-surface-border)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          }}
        >
          {/* form controls: home-b-input, home-b-btn */}
        </section>
      </div>
    </div>
  );
}
```

---

## 11. Comparing designs locally

- Design B (default): `/`
- Design A (legacy minimal card): `/?design=a`

Use A only as a reference for the intermediate indigo/zinc system; **B is the product direction.**
