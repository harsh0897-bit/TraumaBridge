'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export interface CountdownProps {
  initialSeconds?: number
  targetMinutes?: number
  deadlineIso?: string
  label?: string
  showIcon?: boolean
  size?: 'hero' | 'inline' | 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
  onExpire?: () => void
  className?: string
  urgentThresholdSeconds?: number
}

export function Countdown({
  initialSeconds,
  targetMinutes = 4,
  deadlineIso,
  label = 'Estimated Arrival',
  showIcon = true,
  size = 'md',
  tone = 'light',
  onExpire,
  className,
  urgentThresholdSeconds = 120, // 2 mins
}: CountdownProps) {
  const [mounted, setMounted] = useState(false)
  const defaultTotalSecs = initialSeconds ?? targetMinutes * 60
  const [remaining, setRemaining] = useState<number>(defaultTotalSecs)

  useEffect(() => {
    setMounted(true)
    if (deadlineIso) {
      const diffSecs = Math.max(0, Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000))
      setRemaining(diffSecs)
    } else {
      setRemaining(defaultTotalSecs)
    }
  }, [deadlineIso, defaultTotalSecs])

  useEffect(() => {
    if (!mounted) return
    if (remaining <= 0) {
      onExpire?.()
      return
    }

    const timer = setInterval(() => {
      if (deadlineIso) {
        const diffSecs = Math.max(0, Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000))
        setRemaining(diffSecs)
        if (diffSecs <= 0) {
          clearInterval(timer)
          onExpire?.()
        }
      } else {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            onExpire?.()
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [mounted, remaining, deadlineIso, onExpire])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isUrgent = remaining <= urgentThresholdSeconds && remaining > 0
  const isDark = tone === 'dark'

  const sizeClasses = {
    hero: 'text-[64px] max-h-[799px]:text-[48px] font-mono leading-none tracking-tight font-bold tabular-nums',
    inline: 'text-[16px] font-mono leading-tight font-semibold tabular-nums',
    sm: 'text-[12px] font-mono leading-tight font-medium tabular-nums',
    md: 'text-[14px] font-mono leading-tight font-semibold tabular-nums',
    lg: 'text-[20px] font-mono leading-tight font-bold tabular-nums',
  }

  const textColor = isDark
    ? isUrgent
      ? 'text-white' // High contrast on hero gradient (contrast > 9:1)
      : 'text-white'
    : isUrgent
    ? 'text-critical'
    : 'text-ink'

  const iconColor = isDark ? 'text-white/80' : isUrgent ? 'text-critical' : 'text-primary'

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${mins} minutes, ${secs} seconds remaining`}
      className={cn(
        'inline-flex',
        size === 'hero' ? 'flex-col gap-1' : 'items-center gap-2',
        className
      )}
    >
      {label && size !== 'hero' && (
        <span
          className={cn(
            'text-[12px] font-medium leading-tight',
            isDark ? 'text-white/80' : 'text-ink-2'
          )}
        >
          {label}
        </span>
      )}

      <div className="flex items-center gap-2">
        {showIcon && (
          <Clock
            className={cn(
              'flex-shrink-0',
              size === 'hero' ? 'w-8 h-8' : size === 'lg' ? 'w-5 h-5' : size === 'inline' ? 'w-4 h-4' : 'w-3.5 h-3.5',
              iconColor
            )}
            aria-hidden="true"
          />
        )}

        <span className={cn(sizeClasses[size], textColor)}>
          {formatted}
        </span>
      </div>
    </div>
  )
}
