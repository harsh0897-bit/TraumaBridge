# TRAUMABRIDGE AI — MOTION GUIDE
> Motion for React (`motion/react`) v13+ · Hospital Receiving Console Spec

## 1. MOTION ARCHITECTURE

All motion logic, timing, and variant definitions are centralized in `src/lib/motion.ts`.
Never define magic animation numbers, custom cubic-bezier curves, or inline durations in component files.

---

## 2. EXPORTED PRIMITIVES (`src/lib/motion.ts`)

| Export | Value / Type | Purpose |
| :--- | :--- | :--- |
| `ease` | `[0.22, 1, 0.36, 1]` | Standard clinical cubic bezier curve |
| `durations` | `{ fast: 0.12, base: 0.20, gentle: 0.32, countUp: 0.90 }` | Seconds scale |
| `spring` | `{ type: "spring", stiffness: 380, damping: 32 }` | Segmented sliding indicators |
| `tileEntrance` | `Variants` (Fade + rise 12px) | Entrance animation for primary tiles |
| `stagger` | `Variants` (45ms children stagger) | Applied to container of tiles |
| `tabContent` | `Variants` (Crossfade + 8px slide, 220ms) | For `AnimatePresence mode="wait"` |
| `hoverLift` | `{ y: -2, transition: { duration: 0.18, ease } }` | Interactive tile hover lift |
| `press` | `{ scale: 0.98, transition: { duration: 0.12, ease } }` | Button & clickable element tap |
| `useCountUp` | `(value: number, { duration? }) => number` | Number tweening hook |

---

## 3. USAGE PATTERNS

### A. Number Count-Up (`useCountUp`)
```tsx
import { useCountUp } from '@/lib/motion'

export function StatNumber({ value }: { value: number }) {
  const display = useCountUp(value)
  return <span className="tabular-nums font-extrabold text-4xl">{display}</span>
}
```

### B. Segmented Tabs with Sliding Indicator (`layoutId`)
```tsx
import { motion } from 'motion/react'
import { spring } from '@/lib/motion'

{isActive && (
  <motion.div
    layoutId="activeTabIndicator"
    className="absolute inset-0 bg-primary-soft rounded-pill"
    transition={spring}
  />
)}
```

### C. Tab Transition with `AnimatePresence`
```tsx
import { AnimatePresence, motion } from 'motion/react'
import { tabContent } from '@/lib/motion'

<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    variants={tabContent}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    {/* Tab screen */}
  </motion.div>
</AnimatePresence>
```

### D. Tile Grid Entrance with Stagger
```tsx
import { motion } from 'motion/react'
import { stagger, tileEntrance, hoverLift } from '@/lib/motion'

<motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-3 gap-5">
  <motion.div variants={tileEntrance} whileHover={hoverLift}>
    {/* Tile content */}
  </motion.div>
</motion.div>
```

---

## 4. CLINICAL SAFETY & ACCESSIBILITY RULES

1. **`useReducedMotion` Compliance:** All translate/slide effects collapse to opacity-only when `prefers-reduced-motion` is active. Numbers update immediately without interpolation.
2. **Never Loop Clinical Alerts:** A critical warning alert may pulse once upon change, but never loop continuously.
3. **Continuous Loops Allowed Only For:**
   - Real-time telemetry connection heartbeat dot
   - ETA countdown clock tick
4. **Zero Layout Shift:** Modals and drawers use fixed positioning and backdrop overlays with scale/opacity entrance.
