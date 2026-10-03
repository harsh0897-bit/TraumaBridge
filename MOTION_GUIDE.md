# TRAUMABRIDGE AI — MOTION GUIDE
> Centralized motion system using Motion for React (motion/react) v13+

## Quick Reference

Import all motion values from src/lib/motion.ts — never define animation values inline.

## Package

`
motion@^13 (stable as of Oct 2026)
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react'
`

## Usage Patterns

### Page Entrance (section scroll trigger)
`	sx
import { motion } from 'motion/react'
import { slideUpIn, staggerContainer, viewportOnce } from '@/lib/motion'

<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={viewportOnce}
  variants={staggerContainer}
>
  <motion.h2 variants={slideUpIn}>Heading</motion.h2>
  <motion.p variants={slideUpIn}>Body text</motion.p>
</motion.div>
`

### Tab / Panel Transitions
`	sx
import { AnimatePresence, motion } from 'motion/react'

<AnimatePresence mode="wait">
  {activeTab === 'vitals' && (
    <motion.div
      key="vitals"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
    >
      {/* content */}
    </motion.div>
  )}
</AnimatePresence>
`

### Layout-aware (tab indicator)
`	sx
<motion.div layoutId="tab-indicator" className="h-0.5 bg-sky-500" />
`

### Button hover/press
`	sx
import { hoverScale, pressScale } from '@/lib/motion'

<motion.button whileHover={hoverScale} whileTap={pressScale}>
  Click me
</motion.button>
`

### Parallax scroll
`	sx
const { scrollYProgress } = useScroll({ target: ref })
const y = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
<motion.div style={{ y }} />
`

## Reduced Motion

Always import iewportOnce for scroll triggers.
The global CSS prefers-reduced-motion rule ensures no transforms run.

For explicit handling:
`	sx
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const variants = prefersReduced ? reducedMotionVariants : slideUpIn
`

## Surface Rules

| Surface | Motion Budget |
|---------|--------------|
| Landing page | Full — cinematic, scroll-driven, springs |
| Ambulance terminal | Minimal — tab switch only (150ms), no decorative |
| Hospital dashboard | Restrained — event slide-in, tab transition |

## Never Do

- Animate critical vital values
- Use entrance animations that delay data rendering
- Add motion to warning/alert states (use CSS pulse only)
- Compete with clinical status colors in animation
- Install multiple animation libraries (GSAP not needed for Phase 1)
