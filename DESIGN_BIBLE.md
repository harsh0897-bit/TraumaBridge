# TRAUMABRIDGE AI — DESIGN BIBLE
> Version 1.0 · Phase 1 Foundation · October 2026

## 1. CREATIVE DIRECTION

**Positioning:** TraumaBridge exists at the precise moment when information transfer saves a life. Every design decision must reflect that weight without dramatising it. The product must feel *reliable*, *swift*, and *human-first*.

**Three tones, one identity:**

| Surface | Tone | Priority |
|---------|------|----------|
| Public website | Editorial, confident, cinematic | Brand story |
| Ambulance terminal | High-contrast, tactile, unambiguous | Speed & accuracy |
| Hospital workspace | Calm, information-rich, hierarchical | Comprehension |

## 2. VISUAL IDENTITY

### Wordmark
- **Logotype:** TRAUMABRIDGE in Geist — geometric, authoritative
- **Symbol:** Bridge arc bisected by pulse line — ambulance-to-hospital continuity
- **Colour:** Navy #0F1E35 on light; accent #0EA5E9 pulse line

## 3. COLOR PALETTE

### Base
- navy-950: #0A1628
- navy-900: #0F1E35 (brand primary)
- navy-800: #162440
- slate-50: #F8FAFC (app background)
- slate-900: #0F172A (heading)

### Clinical Accent
- sky-500: #0EA5E9 (primary action)
- teal-500: #14B8A6 (secondary accent)

### Semantic
- red-500: #EF4444 (critical only)
- amber-400: #FBBF24 (warning only)
- emerald-500: #10B981 (stable/positive)

## 4. TYPOGRAPHY

- **Geist** (sans) for all UI — Display 4.5rem → Caption 0.75rem
- **Geist Mono** for data values, timestamps, codes
- Ambulance minimum: 18px for touch-label text

## 5. SPACING — 4px base unit (space-1 through space-32)

## 6. LAYOUT

- 12-column grid, 24px gutter, 1440px max
- Breakpoints: 480/768/1024/1280/1536

## 7. SURFACE HIERARCHY

Public: Hero → Features → Stats → CTA
Ambulance: Header(48px) → Workspace → Status(40%) → ActionBar(72px)
Hospital: Sidebar(220px) → Feed → Detail → EventTrail

## 8. ICONOGRAPHY — Lucide React, 1.5px stroke, 20px default, 48px touch target

## 9. INTERACTION STATES

Default → Hover(8% darker) → Focus(sky-500 ring) → Pressed(scale 0.97) → Loading(pulse) → Disabled(40% opacity)

Ambulance: 56x56px minimum touch, 400ms hold for critical actions

## 10. MOTION LANGUAGE — See MOTION_GUIDE.md

Durations: instant(0) → fast(100ms) → base(200ms) → gentle(300ms) → slow(500ms) → cinematic(800ms)

## 11. ACCESSIBILITY — WCAG 2.1 AA+, prefers-reduced-motion, 4.5:1 min contrast

## 12. IMAGE ART DIRECTION

- Realistic + refined post-processing
- Cool blue-white primary light, warm amber fill
- hero-handover.webp, ambulance-interior.webp, ed-coordination.webp, data-bridge.webp

## 13. DESIGN PRINCIPLES FOR EMERGENCY WORKSPACES

1. Glanceability — critical info readable in under 2 seconds
2. Hierarchy over decoration
3. Error prevention over recovery
4. Persistent orientation (patient, mission, status always visible)
5. Graceful degradation (offline-capable UI)
6. No animation at cost — never delay critical data render
7. Semantic colour discipline — red = danger always
8. Label everything with units and source
9. Timestamp all events
10. Confirm before transmitting
