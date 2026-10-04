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
          'w-9 h-9 max-h-[799px]:w-8 max-h-[799px]:h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer flex-shrink-0',
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
        'relative rounded-tile p-5 max-h-[799px]:p-3.5 overflow-hidden border transition-shadow flex flex-col',
        isHero
          ? 'tile-hero border-transparent shadow-tile text-white'
          : 'bg-tile text-ink border-border shadow-tile',
        className
      )}
    >
      {/* Tile Header (if title or action is provided) */}
      {(title || ActionButton) && (
        <div className="relative z-10 flex items-center justify-between gap-3 mb-3 max-h-[799px]:mb-1.5 flex-shrink-0">
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
      <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  )
}
