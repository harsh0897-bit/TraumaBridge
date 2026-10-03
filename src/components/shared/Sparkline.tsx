'use client'

import React, { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ease, durations } from '@/lib/motion'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  showDot?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 96,
  height = 40,
  color = '#2878D7',
  fillOpacity = 0.18,
  showDot = true,
  className,
}: SparklineProps) {
  const reducedMotion = useReducedMotion()
  const gradientId = useId()

  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className={cn('flex items-center justify-center text-[12px] text-ink-2 font-mono', className)}
      >
        —
      </div>
    )
  }

  const paddingX = 4
  const paddingY = 5
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((val - minVal) / range) * (height - paddingY * 2)
    return { x, y }
  })

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  }, '')

  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible select-none inline-block', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area Fill Under Curve */}
      <path
        d={`${pathD} L ${lastPoint.x},${height} L ${firstPoint.x},${height} Z`}
        fill={`url(#${gradientId})`}
      />

      {/* Main Sparkline Stroke */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: durations.gentle, ease }}
      />

      {/* Last Point Dot */}
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
          transition={{ delay: durations.gentle * 0.7, duration: durations.fast, ease }}
        />
      )}
    </svg>
  )
}
