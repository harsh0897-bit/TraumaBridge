/**
 * TRAUMABRIDGE AI — Unified Time & Date Formatting
 * Timezone: Europe/London (24-hour clock)
 * Strict requirement: No raw ISO string may ever appear in visible text.
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Format a timestamp into 24h clock string in Europe/London timezone.
 * Example output: "23:36"
 */
export function formatClock(ts?: string | number | Date | null): string {
  if (!ts) return '—'
  try {
    const d = typeof ts === 'object' && ts instanceof Date ? ts : new Date(ts)
    if (isNaN(d.getTime())) return '—'

    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return '—'
  }
}

/**
 * Format a timestamp into human-readable relative time.
 * E.g., "12 min ago", "Just now", "2 hr ago"
 */
export function formatAgo(ts?: string | number | Date | null): string {
  if (!ts) return '—'
  try {
    const d = typeof ts === 'object' && ts instanceof Date ? ts : new Date(ts)
    if (isNaN(d.getTime())) return '—'

    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hr ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} d ago`
  } catch {
    return '—'
  }
}

/**
 * Hook to safely compute formatAgo only after mounting on the client.
 * Prevents SSR / client hydration mismatches.
 */
export function useFormatAgo(ts?: string | number | Date | null): string {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !ts) return '—'
  return formatAgo(ts)
}

/**
 * Format full date and time for tooltips and accessible titles.
 * Example: "04 Oct 2026, 23:36 (Europe/London)"
 */
export function formatDateTimeLong(ts?: string | number | Date | null): string {
  if (!ts) return ''
  try {
    const d = typeof ts === 'object' && ts instanceof Date ? ts : new Date(ts)
    if (isNaN(d.getTime())) return ''

    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d)

    return `${formatted} (Europe/London)`
  } catch {
    return ''
  }
}
