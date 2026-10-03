/**
 * TRAUMABRIDGE AI — CENTRALIZED MOTION SYSTEM
 * Built on Motion for React (motion/react) v13+
 *
 * Import from this file instead of defining animation values ad-hoc.
 * This ensures consistent motion behavior across all surfaces.
 */

import type { Variants, Transition } from 'motion/react'

// ─── Durations (in seconds) ─────────────────────────────────────────────────
export const duration = {
  instant:   0,
  fast:      0.1,
  snappy:    0.15,
  base:      0.2,
  gentle:    0.3,
  slow:      0.5,
  cinematic: 0.8,
} as const

// ─── Easing ──────────────────────────────────────────────────────────────────
export const easing = {
  default: [0.4, 0, 0.2, 1] as const,
  easeIn:  [0.4, 0, 1, 1]   as const,
  easeOut: [0, 0, 0.2, 1]   as const,
  bounce:  [0.34, 1.56, 0.64, 1] as const,
} as const

// ─── Spring Presets ──────────────────────────────────────────────────────────
export const spring = {
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 35,
    mass: 1,
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 20,
    mass: 0.6,
  },
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 40,
    mass: 1,
  },
} as const

// ─── Standard Transitions ────────────────────────────────────────────────────
export const transition = {
  fast:     { duration: duration.fast,    ease: easing.easeOut } satisfies Transition,
  snappy:   { duration: duration.snappy,  ease: easing.easeOut } satisfies Transition,
  base:     { duration: duration.base,    ease: easing.default } satisfies Transition,
  gentle:   { duration: duration.gentle,  ease: easing.default } satisfies Transition,
  slow:     { duration: duration.slow,    ease: easing.easeOut } satisfies Transition,
  cinematic:{ duration: duration.cinematic, ease: easing.easeOut } satisfies Transition,
  spring:   spring.snappy satisfies Transition,
  springGentle: spring.gentle satisfies Transition,
} as const

// ─── Enter / Exit Variants ───────────────────────────────────────────────────

/** Fade in from transparent */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.gentle },
  exit:   { opacity: 0, transition: transition.fast },
}

/** Slide up and fade in — default for section entrances */
export const slideUpIn: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transition.gentle },
  exit:    { opacity: 0, y: -12, transition: transition.fast },
}

/** Slide down and fade in — for dropdowns, drawers opening from top */
export const slideDownIn: Variants = {
  hidden:  { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: transition.gentle },
  exit:    { opacity: 0, y: -8, transition: transition.fast },
}

/** Slide in from the right — for side panels and drawers */
export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: spring.gentle },
  exit:    { opacity: 0, x: 40, transition: transition.snappy },
}

/** Scale and fade — for modals and dialogs */
export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: spring.snappy },
  exit:    { opacity: 0, scale: 0.96, transition: transition.snappy },
}

/** Cinematic hero entrance — for landing page hero elements */
export const heroEntrance: Variants = {
  hidden:  { opacity: 0, y: 40, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: duration.cinematic, ease: easing.easeOut } },
  exit:    { opacity: 0, transition: transition.slow },
}

/** Staggered children — apply to parent container */
export const staggerContainer: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

/** Staggered children — slower stagger for editorial sections */
export const staggerContainerSlow: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

/** Card entrance — for feature cards */
export const cardEntrance: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
}

/** Hospital event — new incoming events slide in from top */
export const eventSlideIn: Variants = {
  hidden:  { opacity: 0, y: -16, height: 0 },
  visible: { opacity: 1, y: 0,  height: 'auto', transition: spring.gentle },
  exit:    { opacity: 0, x: -24, transition: transition.snappy },
}

/** Status badge — for pulsing critical states */
export const criticalPulse: Variants = {
  normal:   { scale: 1, opacity: 1 },
  critical: {
    scale: [1, 1.06, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: easing.easeOut,
    },
  },
}

// ─── Hover & Press States (for use with whileHover / whileTap) ───────────────
export const hoverScale = { scale: 1.02 }
export const hoverScaleLarge = { scale: 1.04 }
export const pressScale = { scale: 0.97 }
export const pressBrighter = { scale: 0.98, filter: 'brightness(1.1)' }

// ─── Ambient / Floating ──────────────────────────────────────────────────────
export const float: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-6, 6, -6],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ─── Page Transition Wrappers ────────────────────────────────────────────────
export const pageTransition: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.slow, ease: easing.easeOut } },
  exit:    { opacity: 0, transition: { duration: duration.base } },
}

// ─── Reduced Motion Safe Defaults ────────────────────────────────────────────
/**
 * Use these in the reduce-motion context.
 * All transitions become instant; no transforms, no filters.
 */
export const reducedMotionVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit:    { opacity: 0, transition: { duration: 0 } },
}

// ─── Viewport Settings ───────────────────────────────────────────────────────
/** Standard viewport trigger for scroll-activated entrances */
export const viewportOnce = { once: true, margin: '-60px' }
export const viewportRepeat = { once: false, margin: '-40px' }
