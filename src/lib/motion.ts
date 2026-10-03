/**
 * TRAUMABRIDGE AI — LOCKED MOTION SPECIFICATION
 * Motion for React (motion/react) v13+
 *
 * All motion values must be imported from this file.
 * Never define ad-hoc animation magic numbers inline.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useReducedMotion, animate, type Variants, type Transition } from 'motion/react'

// ─── Easing ──────────────────────────────────────────────────────────────────
export const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Backward-compatible easing map
export const easing = {
  default: ease,
  easeIn:  [0.4, 0, 1, 1] as const,
  easeOut: ease,
  bounce:  [0.34, 1.56, 0.64, 1] as const,
} as const

// ─── Durations (in seconds) ───────────────────────────────────────────────────
export const durations = {
  fast: 0.12,     // 120ms
  base: 0.20,     // 200ms
  gentle: 0.32,   // 320ms
  countUp: 0.90,  // 900ms
} as const

// Backward-compatible duration map
export const duration = {
  instant:   0,
  fast:      durations.fast,
  snappy:    0.15,
  base:      durations.base,
  gentle:    durations.gentle,
  slow:      0.5,
  cinematic: 0.8,
} as const

// ─── Spring Preset ───────────────────────────────────────────────────────────
export const spring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
}

// ─── Tile Entrance ───────────────────────────────────────────────────────────
// Tiles fade + rise 12px, staggered 45ms
export const tileEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.gentle,
      ease,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: durations.fast,
      ease,
    },
  },
}

// Stagger container for tiles (stagger 45ms)
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045, // 45ms
      delayChildren: 0.02,
    },
  },
}

// Backward-compatible alias for existing landing components
export const staggerContainer: Variants = stagger
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

// ─── Tab Content ─────────────────────────────────────────────────────────────
// Crossfade + 8px slide, 220ms, for AnimatePresence mode="wait"
export const tabContent: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
      ease,
    },
  },
}

// ─── Hover Lift & Press ──────────────────────────────────────────────────────
// Lift -2px + shadow step-up, 180ms | press scale 0.98
export const hoverLift = {
  y: -2,
  transition: {
    duration: 0.18,
    ease,
  },
}

export const press = {
  scale: 0.98,
  transition: {
    duration: durations.fast,
    ease,
  },
}

// Backward-compatible hover/press aliases
export const hoverScale = { scale: 1.02, transition: { duration: durations.fast, ease } }
export const hoverScaleLarge = { scale: 1.04, transition: { duration: durations.fast, ease } }
export const pressScale = press
export const pressBrighter = { scale: 0.98, filter: 'brightness(1.1)' }

// ─── Additional Shared Variants & Backwards Compatibility ────────────────────
export const slideUpIn: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.gentle, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: durations.fast, ease } },
}

export const slideDownIn: Variants = {
  hidden:  { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.gentle, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: durations.fast, ease } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: spring },
  exit:    { opacity: 0, x: 24, transition: { duration: durations.fast, ease } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: spring },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: durations.fast, ease } },
}

export const heroEntrance: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  exit:    { opacity: 0, transition: { duration: durations.fast } },
}

export const cardEntrance: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.gentle, ease } },
}

export const eventSlideIn: Variants = {
  hidden:  { opacity: 0, y: -12, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto', transition: spring },
  exit:    { opacity: 0, x: -16, transition: { duration: durations.fast, ease } },
}

export const singlePulse: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.04, 1],
    transition: {
      duration: 0.45,
      ease,
      repeat: 0,
    },
  },
}

export const criticalPulse: Variants = singlePulse

export const viewportOnce = { once: true, margin: '-40px' }
export const viewportRepeat = { once: false, margin: '-40px' }

// ─── useCountUp Hook ─────────────────────────────────────────────────────────
/**
 * Hook to count up numbers on mount and tween smoothly on value changes.
 * Respects prefers-reduced-motion (instant update without tweening).
 */
export function useCountUp(
  targetValue: number,
  options?: { duration?: number }
): number {
  const reducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState<number>(() => targetValue)
  const prevTargetRef = useRef<number>(targetValue)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(targetValue)
      prevTargetRef.current = targetValue
      return
    }

    const start = isFirstRender.current ? 0 : prevTargetRef.current
    isFirstRender.current = false
    prevTargetRef.current = targetValue

    const animDuration = options?.duration ?? durations.countUp

    const controls = animate(start, targetValue, {
      duration: animDuration,
      ease,
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest))
      },
    })

    return () => controls.stop()
  }, [targetValue, reducedMotion, options?.duration])

  return displayValue
}
