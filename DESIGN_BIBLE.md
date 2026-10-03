# TRAUMABRIDGE AI — DESIGN BIBLE
> Version 2.0 · Hospital Console Foundation & Design Tokens · October 2026

## 1. CREATIVE DIRECTION & QUALITY BENCHMARK

The visual foundation for the TraumaBridge Hospital Receiving Console takes direct inspiration from the refined modern productivity interface of the reference design (**Donezo**):
- **Hero Tile:** One dominant hero tile with rich presence, large typography, and tactile status.
- **Oversized Numerals:** Clean, high-legibility stat values (44px–64px) with count-up animations.
- **Generous Spacing & Depth:** Large radius (20px) tiles resting on an ultra-light tinted well (`#F8FBFF`) with barely-there physical elevation shadows.
- **Tactile Micro-interactions:** Pill buttons, circular outlined action buttons (36px), sliding segmented tabs, and diagonal-stripe pattern for pending segments.
- **Clinical Sobriety:** No decorative colors, no navy dominance, no cyberpunk/glowing elements, no purple, no glassmorphism.

---

## 2. LOCKED TOKENS

All colors, depths, and surfaces are strictly locked. Component code must reference these tokens via CSS variables or Tailwind theme utilities—never raw ad-hoc hex values.

### Surfaces & Neutral Ink
| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `well` | `#F8FBFF` | Viewport canvas / base well |
| `tile` | `#FFFFFF` | Primary module surface |
| `border` | `#E3EAF2` | 1px subtle structural border |
| `ink` | `#111827` | Primary text & high-contrast figures |
| `ink-2` | `#64748B` | Secondary text, clinical labels, metadata |

### Primary & Action
| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `primary` | `#2878D7` | TraumaBridge interactive action & focus |
| `primary-soft` | `#EEF5FF` | Active selection, tab indicator, soft highlight |
| `primary-deep` | `#0F3F82` | Hero tile gradient start (used to `#1B5FB4`) |
| `hero-to` | `#1B5FB4` | Hero tile gradient end |

### Semantic State System (State Only — Never Decorative)
| State | Solid Ink | Soft Background | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Success** | `#19A974` | `#ECF9F3` | Confirmed Ready / Normal / Complete |
| **Warning** | `#D99000` | `#FFF6E4` | Urgent / In Progress / Attention Required |
| **Critical** | `#D92D20` | `#FFF1EF` | P1 Critical Alert / Severe / Vital Collapse |

---

## 3. SHAPE & PHYSICAL DEPTH

- **Tile Radius:** `20px` (`rounded-tile` / `rounded-[20px]`)
- **Inner Elements / Insets:** `12px` (`rounded-inner` / `rounded-[12px]`)
- **Pills / Status Chips:** `999px` (`rounded-pill` / `rounded-full`)
- **Tile Shadow:** `0 1px 2px rgba(17,24,39,.04), 0 12px 28px -16px rgba(17,24,39,.12)`
- **Border:** `1px solid var(--border)` (`#E3EAF2`)
- **Hierarchy Rule:** Never nest a card inside a card with the same radius. Prefer spacing, background contrast, and typographic hierarchy over borders.

---

## 4. TYPOGRAPHY SCALE (MINIMUM 12px RULE)

**Zero text below 12px anywhere.** Tabular numerals (`tabular-nums`) on all numbers, vitals, countdowns, and timestamps.

| Role | Font Family | Size / Weight | Color | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Numeral** | `Geist` | `64px` / `800` | `ink` / `white` (hero) | ETA countdown, hero score |
| **Stat Numeral** | `Geist` | `44px` / `800` | `ink` | Primary vital figures (HR, BP, SpO₂) |
| **Tile Title** | `Geist` | `15px` / `600` | `ink` | Module and tile headings |
| **Body Large** | `Geist` | `14px` / `400`–`500` | `ink` | Patient notes, incident details |
| **Body Small** | `Geist` | `13px` / `400` | `ink` / `ink-2` | List rows, secondary descriptions |
| **Labels / Meta** | `Geist` | `12px` / `500` | `ink-2` | Baseline ranges, time since update |
| **Telemetry / Code** | `Geist Mono` | `12px`–`14px` | `ink` / `ink-2` | Case IDs, timestamps, GCS codes |

---

## 5. SPACING (4px Base Grid)

| Token | Pixels | Application |
| :--- | :--- | :--- |
| `space-1` | 4px | Icon gap, chip padding |
| `space-2` | 8px | Micro gaps, badge margins |
| `space-3` | 12px | Inner element padding, row spacing |
| `space-4` | 16px | Standard tile internal padding |
| `space-5` | 20px | Generous tile padding |
| `space-6` | 24px | Section gaps, grid gutters |
| `space-8` | 32px | Page margins |

---

## 6. MOTION TABLE (Motion for React / `src/lib/motion.ts`)

| Interaction | Values | Specs |
| :--- | :--- | :--- |
| **Cubic Bezier Ease** | `[0.22, 1, 0.36, 1]` | Global clinical curve |
| **Spring Preset** | `{ type: "spring", stiffness: 380, damping: 32 }` | Segmented sliding indicators |
| **Durations** | `fast: 120ms`, `base: 200ms`, `gentle: 320ms`, `countUp: 900ms` | Unified timing scale |
| **Tile Entrance** | Fade + Rise 12px, staggered 45ms | On initial mount |
| **Hover Feedback** | Lift -2px + shadow step-up, 180ms | Interactive tiles & rows |
| **Press Feedback** | Scale `0.98`, 120ms | Button & tab clicks |
| **Tab Content** | Crossfade + 8px slide, 220ms (`mode="wait"`) | Switching between workspace tabs |
| **Number Count-Up** | `useCountUp(value, { duration: 0.9 })` | Mount & tween on value update |
| **Reduced Motion** | Replaces all physical translation with opacity-only | WCAG AA compliance |

---

## 7. DO / DON'T LIST

### DO:
- Keep the shell strictly within `100dvh` with `overflow: hidden`.
- Provide one dominant hero tile with rich visual focus using `.tile-hero`.
- Use `.tile-hero` and `.pattern-stripes` plain CSS classes (never rely on complex Tailwind utilities for critical gradients/patterns).
- Use hard or clamp() sizes for tiles (never 1fr rows that stretch into empty voids).
- Use circular outlined arrow buttons (36px) on tile headers.
- Show units (`bpm`, `mmHg`, `%`, `/min`) and timestamp sources on all clinical data.
- Use diagonal-stripe SVG fill patterns for pending/in-progress segments.
- Keep the persistent patient header visible across all tabs.

### DON'T:
- NEVER introduce page-level vertical scrolling.
- NEVER render text smaller than 12px.
- NEVER use navy panels, dark mode containers, or cyberpunk glowing borders.
- NEVER use generic purple, teal, or rainbow badges.
- NEVER nest cards with the same radius inside each other.
- NEVER let animations loop continuously (only live sync dot and countdown tick).
- NEVER use raw inline hex codes in component files.

