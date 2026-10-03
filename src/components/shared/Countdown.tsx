'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export interface CountdownProps {
  initialSeconds?: number
  targetMinutes?: number
  label?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg' | 'hero'
  onExpire?: () => void
  className?: string
  urgentThresholdSeconds?: number
}

export function Countdown({
  initialSeconds,
  targetMinutes = 4,
  label = 'Estimated Arrival',
  showIcon = true,
  size = 'md',
  onExpire,
  className,
  urgentThresholdSeconds = 120, // 2 mins
}: CountdownProps) {
  const totalSecs = initialSeconds ?? targetMinutes * 60
  const [remaining, setRemaining] = useState<number>(totalSecs)

  useEffect(() => {
    setRemaining(totalSecs)
  }, [totalSecs])

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.()
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remaining, onExpire])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isUrgent = remaining <= urgentThresholdSeconds && remaining > 0

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    hero: 'text-[44px] leading-none',
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${mins} minutes, ${secs} seconds remaining`}
      className={cn('inline-flex items-center gap-2', className)}
    >
      {showIcon && (
        <Clock
          className={cn(
            'flex-shrink-0',
            size === 'hero' ? 'w-8 h-8' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4',
            isUrgent ? 'text-critical' : 'text-primary'
          )}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-col">
        {label && size !== 'hero' && (
          <span className="text-[12px] font-medium text-ink-2 leading-tight">
            {label}
          </span>
        )}

        <span
          className={cn(
            'font-mono font-bold tabular-nums tracking-tight',
            sizeStyles[size],
            isUrgent ? 'text-critical' : 'text-ink'
          )}
        >
          {formatted}
        </span>
      </div>
    </div>
  )
}
