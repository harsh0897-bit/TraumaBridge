'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tileEntrance, hoverLift, press } from '@/lib/motion'

export interface TileProps {
  title?: React.ReactNode
  action?: {
    onClick?: () => void
    label?: string
    href?: string
  } | React.ReactNode
  tone?: 'default' | 'hero'
  children: React.ReactNode
  className?: string
  animate?: boolean
}

export function Tile({
  title,
  action,
  tone = 'default',
  children,
  className,
  animate = true,
}: TileProps) {
  const isHero = tone === 'hero'
  const reducedMotion = useReducedMotion()

  const ActionButton = action && (
    React.isValidElement(action) ? (
      action
    ) : typeof action === 'object' && 'onClick' in action ? (
      <motion.button
        type="button"
        onClick={action.onClick}
        aria-label={action.label ?? 'Open tile action'}
        whileHover={reducedMotion ? undefined : { scale: 1.05 }}
        whileTap={reducedMotion ? undefined : press}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer flex-shrink-0',
          isHero
            ? 'border-white/30 text-white hover:bg-white/10'
            : 'border-border text-ink hover:bg-well hover:border-ink/20'
        )}
      >
        <ArrowUpRight className="w-4 h-4" />
      </motion.button>
    ) : null
  )

  return (
    <motion.div
      variants={animate && !reducedMotion ? tileEntrance : undefined}
      whileHover={reducedMotion ? undefined : hoverLift}
      className={cn(
        'relative rounded-tile p-5 overflow-hidden border transition-shadow',
        isHero
          ? 'bg-[linear-gradient(135deg,var(--primary-deep)_0%,var(--hero-to)_100%)] text-white border-transparent shadow-tile'
          : 'bg-tile text-ink border-border shadow-tile',
        className
      )}
    >
      {/* Hero tone faint concentric-arc pattern (SVG, 6% opacity) */}
      {isHero && (
        <svg
          aria-hidden="true"
          className="absolute -right-8 -bottom-8 w-64 h-64 pointer-events-none opacity-6 select-none"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="150" cy="150" r="40" stroke="white" strokeWidth="2.5" />
          <circle cx="150" cy="150" r="70" stroke="white" strokeWidth="2.5" />
          <circle cx="150" cy="150" r="100" stroke="white" strokeWidth="2.5" />
          <circle cx="150" cy="150" r="130" stroke="white" strokeWidth="2.5" />
        </svg>
      )}

      {/* Tile Header (if title or action is provided) */}
      {(title || ActionButton) && (
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          {typeof title === 'string' ? (
            <h3
              className={cn(
                'text-[15px] font-semibold leading-tight tracking-tight',
                isHero ? 'text-white' : 'text-ink'
              )}
            >
              {title}
            </h3>
          ) : (
            title
          )}
          {ActionButton}
        </div>
      )}

      {/* Tile Body */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
