'use client'

import React, { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SegmentedTabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  layoutId?: string
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedTabs({
  tabs,
  activeId,
  onChange,
  layoutId = 'segmentedTabIndicator',
  className,
  size = 'md',
}: SegmentedTabsProps) {
  const reducedMotion = useReducedMotion()
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let targetIndex: number | null = null

    if (e.key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      targetIndex = 0
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1
    }

    if (targetIndex !== null) {
      e.preventDefault()
      const targetTab = tabs[targetIndex]
      if (!targetTab.disabled) {
        onChange(targetTab.id)
        tabRefs.current.get(targetTab.id)?.focus()
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex items-center gap-1 p-1 bg-tile rounded-pill border border-border select-none shadow-none',
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId

        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el)
              else tabRefs.current.delete(tab.id)
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'relative rounded-pill font-semibold transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              // Strict >=12px rule
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]',
              isActive ? 'text-primary-ink' : 'text-ink-2 hover:text-ink hover:bg-well',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {/* Sliding Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId={reducedMotion ? undefined : layoutId}
                className="absolute inset-0 bg-primary-soft border border-primary/20 rounded-pill"
                transition={spring}
              />
            )}

            {/* Tab Content */}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </span>

            {/* Optional Count Badge */}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'relative z-10 font-bold px-2 py-0.5 rounded-pill text-xs tabular-nums',
                  isActive
                    ? 'bg-primary-ink text-white'
                    : 'bg-well text-ink-2 border border-border'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
