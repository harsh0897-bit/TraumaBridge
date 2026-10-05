'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'warning' | 'critical' | 'info' | 'neutral'

export interface StatusChipProps {
  status: StatusVariant
  label: string
  showDot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function StatusChip({
  status,
  label,
  showDot = true,
  size = 'sm',
  className,
}: StatusChipProps) {
  const styles: Record<StatusVariant, { chip: string; dot: string }> = {
    success: {
      chip: 'bg-success-soft text-success-ink border-success/30',
      dot: 'bg-success',
    },
    warning: {
      chip: 'bg-warning-soft text-warning-ink border-warning/30',
      dot: 'bg-warning',
    },
    critical: {
      chip: 'bg-critical-soft text-critical-ink border-critical/30',
      dot: 'bg-critical',
    },
    info: {
      chip: 'bg-primary-soft text-primary-ink border-primary/30',
      dot: 'bg-primary',
    },
    neutral: {
      chip: 'bg-well text-ink-2 border-border',
      dot: 'bg-ink-2',
    },
  }

  const currentStyle = styles[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-pill border select-none',
        // Note: Strict adherence to >=12px rule
        size === 'sm' ? 'px-2.5 py-1 text-xs leading-none' : 'px-3 py-1.5 text-[13px] leading-none',
        currentStyle.chip,
        className
      )}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', currentStyle.dot)}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  )
}
