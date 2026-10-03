'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ease, durations } from '@/lib/motion'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showDot?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 100,
  height = 36,
  color = '#2878D7',
  showDot = true,
  className,
}: SparklineProps) {
  const reducedMotion = useReducedMotion()

  if (!data || data.length < 2) {
    return null
  }

  const padding = 4
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - minVal) / range) * (height - padding * 2)
    return { x, y }
  })

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  }, '')

  const lastPoint = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible select-none inline-block', className)}
      aria-hidden="true"
    >
      {/* Background smooth gradient fill under the line */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={`${pathD} L ${lastPoint.x},${height} L ${points[0].x},${height} Z`}
        fill={`url(#sparkline-gradient-${color})`}
      />

      {/* Main Sparkline Stroke */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: durations.gentle, ease }}
      />

      {/* Optional Last Point Dot */}
      {showDot && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="1.5"
          initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: durations.gentle, duration: durations.fast, ease }}
        />
      )}
    </svg>
  )
}
