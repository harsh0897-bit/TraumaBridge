'use client'

import React, { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ease, durations } from '@/lib/motion'

export interface ProgressRingProps {
  value: number // 0 to 100
  pendingValue?: number // 0 to 100 (for striped segment)
  size?: number
  strokeWidth?: number
  variant?: 'solid' | 'striped'
  strokeColor?: string
  trackColor?: string
  label?: React.ReactNode
  caption?: string
  className?: string
}

export function ProgressRing({
  value,
  pendingValue = 0,
  size = 120,
  strokeWidth = 10,
  variant = 'solid',
  strokeColor = '#2878D7',
  trackColor = '#E3EAF2',
  label,
  caption,
  className,
}: ProgressRingProps) {
  const reducedMotion = useReducedMotion()
  const patternId = useId()

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const clampedValue = Math.min(Math.max(value, 0), 100)
  const clampedPending = Math.min(Math.max(pendingValue, 0), 100 - clampedValue)

  const strokeDashoffset = circumference - (clampedValue / 100) * circumference
  const pendingDasharray = `${(clampedPending / 100) * circumference} ${circumference}`
  const pendingOffset = circumference - (clampedValue / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          {/* Diagonal stripe pattern for pending segment (as in Donezo reference) */}
          <pattern
            id={patternId}
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Base Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Pending Striped Segment (if pendingValue > 0 or variant === 'striped') */}
        {(clampedPending > 0 || (variant === 'striped' && clampedValue < 100)) && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${patternId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={
              clampedPending > 0
                ? pendingDasharray
                : `${circumference} ${circumference}`
            }
            strokeDashoffset={clampedPending > 0 ? -pendingOffset : strokeDashoffset}
            strokeLinecap="round"
          />
        )}

        {/* Active Progress Stroke */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? { strokeDashoffset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: durations.gentle, ease }}
        />
      </svg>

      {/* Center Content Slot */}
      {(label || caption) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none select-none">
          {typeof label === 'string' || typeof label === 'number' ? (
            <span className="text-xl font-extrabold text-ink tabular-nums leading-none">
              {label}
            </span>
          ) : (
            label
          )}
          {caption && (
            <span className="text-xs font-medium text-ink-2 mt-0.5 leading-none">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
