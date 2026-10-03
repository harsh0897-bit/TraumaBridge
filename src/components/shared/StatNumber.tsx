'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/lib/motion'
import { ArrowUp, ArrowDown } from 'lucide-react'

export interface StatNumberProps {
  value: number
  unit?: string
  size?: 'stat' | 'hero'
  delta?: {
    value: string | number
    label?: string
    trend?: 'up' | 'down' | 'neutral'
  }
  chip?: React.ReactNode
  label?: string
  className?: string
  textColor?: string
}

export function StatNumber({
  value,
  unit,
  size = 'stat',
  delta,
  chip,
  label,
  className,
  textColor,
}: StatNumberProps) {
  const animatedValue = useCountUp(value)

  const isHero = size === 'hero'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-xs font-medium text-ink-2 tracking-wide block mb-0.5">
          {label}
        </span>
      )}

      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={cn(
            'font-extrabold tracking-tight tabular-nums',
            isHero ? 'text-[64px] leading-none' : 'text-[44px] leading-none',
            textColor ?? 'text-ink'
          )}
        >
          {animatedValue}
        </span>

        {unit && (
          <span className="text-sm font-semibold text-ink-2">
            {unit}
          </span>
        )}

        {chip && (
          <div className="ml-auto self-center">{chip}</div>
        )}
      </div>

      {delta && (
        <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-ink-2">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold text-xs',
              delta.trend === 'up'
                ? 'bg-success-soft text-success'
                : delta.trend === 'down'
                ? 'bg-critical-soft text-critical'
                : 'bg-well text-ink-2 border border-border'
            )}
          >
            {delta.trend === 'up' && <ArrowUp className="w-3 h-3" />}
            {delta.trend === 'down' && <ArrowDown className="w-3 h-3" />}
            <span>{delta.value}</span>
          </span>
          {delta.label && <span>{delta.label}</span>}
        </div>
      )}
    </div>
  )
}
