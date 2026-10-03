'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { press } from '@/lib/motion'

export interface PillButtonProps {
  variant?: 'primary' | 'outline' | 'soft' | 'critical'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
}

export function PillButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  onClick,
  disabled = false,
  className,
  type = 'button',
  'aria-label': ariaLabel,
}: PillButtonProps) {
  const reducedMotion = useReducedMotion()

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-[#1E67C0] border border-transparent shadow-xs',
    outline:
      'bg-tile text-ink border border-border hover:bg-well hover:border-ink/20 shadow-xs',
    soft:
      'bg-primary-soft text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-xs',
    critical:
      'bg-critical text-white hover:bg-[#B02217] border border-transparent shadow-xs',
  }

  const sizeStyles = {
    // Strict >=12px rule
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
    md: 'px-4 py-2 text-[13px] gap-2 min-h-[38px]',
    lg: 'px-5 py-2.5 text-sm gap-2 min-h-[44px]',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={reducedMotion || disabled ? undefined : press}
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-pill transition-colors cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  )
}
