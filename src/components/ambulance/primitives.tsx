/**
 * TRAUMABRIDGE AI — Ambulance Terminal UI primitives
 *
 * Large-target building blocks (≥56px) shared by every intake step.
 * All primitives read night mode from the run store so steps stay prop-light.
 */

'use client'

import { motion } from 'motion/react'
import { Mic, Plus, Minus, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRunStore } from '@/lib/runStore'
import { useVoiceStore, type VoiceTarget } from '@/lib/voice'
import type { Tone } from '@/lib/clinical'

export const useNight = () => useRunStore((s) => s.nightMode)

// ─── Tone palette ────────────────────────────────────────────────────────────

export type TileTone = 'sky' | 'emerald' | 'amber' | 'red'

const SELECTED: Record<TileTone, { day: string; night: string; icon: string }> = {
  sky: {
    day: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200/70',
    night: 'border-sky-400 bg-sky-950/40 ring-2 ring-sky-500/30',
    icon: 'bg-sky-500 text-white',
  },
  emerald: {
    day: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200/70',
    night: 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-500/30',
    icon: 'bg-emerald-500 text-white',
  },
  amber: {
    day: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200/70',
    night: 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-500/30',
    icon: 'bg-amber-500 text-white',
  },
  red: {
    day: 'border-red-500 bg-red-50 ring-2 ring-red-200/70',
    night: 'border-red-400 bg-red-950/40 ring-2 ring-red-500/30',
    icon: 'bg-red-500 text-white',
  },
}

export const toneText = (tone: Tone, night: boolean) =>
  tone === 'red'
    ? 'text-red-500'
    : tone === 'amber'
    ? 'text-amber-500'
    : tone === 'ok'
    ? night
      ? 'text-white'
      : 'text-slate-900'
    : 'text-slate-400'

export const toneBorder = (tone: Tone, night: boolean) =>
  tone === 'red'
    ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20'
    : tone === 'amber'
    ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/15'
    : night
    ? 'border-[#1D3455] bg-[#0E1A2F]'
    : 'border-slate-200 bg-white'

// ─── Step header ─────────────────────────────────────────────────────────────

export function StepHeader({
  index,
  label,
  title,
  subtitle,
  right,
}: {
  index: number
  label: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  const night = useNight()
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP {String(index).padStart(2, '0')} OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400 uppercase">{label}</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', night ? 'text-white' : 'text-slate-900')}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn('text-xs sm:text-sm font-medium', night ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  )
}

// ─── Panel / Label ───────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  title,
  right,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  right?: React.ReactNode
}) {
  const night = useNight()
  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-3xl border space-y-5 transition-colors shadow-sm',
        night ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90',
        className
      )}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h3 className={cn('text-xs font-mono font-bold uppercase tracking-wider', night ? 'text-slate-300' : 'text-slate-600')}>
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function FieldLabel({
  children,
  right,
  done,
}: {
  children: React.ReactNode
  right?: React.ReactNode
  done?: boolean
}) {
  const night = useNight()
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <label className={cn('text-sm font-bold flex items-center gap-2', night ? 'text-slate-200' : 'text-slate-800')}>
        {children}
        {done && (
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[3]" />
          </span>
        )}
      </label>
      {right}
    </div>
  )
}

// ─── Tile (large choice card) ────────────────────────────────────────────────

export function Tile({
  selected,
  onClick,
  icon: Icon,
  title,
  desc,
  tone = 'sky',
  className,
}: {
  selected?: boolean
  onClick: () => void
  icon?: LucideIcon
  title: string
  desc?: string
  tone?: TileTone
  className?: string
}) {
  const night = useNight()
  const sel = SELECTED[tone]
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-pressed={!!selected}
      className={cn(
        'p-4 rounded-3xl border-2 text-left transition-all duration-150 flex items-start gap-3 min-h-[88px] cursor-pointer',
        selected
          ? night
            ? sel.night
            : sel.day
          : night
          ? 'border-[#1D3455] bg-[#0E1A2F] hover:border-slate-600'
          : 'border-slate-200 bg-white hover:border-slate-300',
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
            selected ? sel.icon : night ? 'bg-[#152742] text-slate-400' : 'bg-slate-100 text-slate-500'
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('font-black text-base block leading-tight', night ? 'text-white' : 'text-slate-900')}>
          {title}
        </span>
        {desc && <span className="text-xs text-slate-400 block mt-1 leading-snug">{desc}</span>}
      </span>
      {selected && (
        <span className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', sel.icon)}>
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
      )}
    </motion.button>
  )
}

// ─── Chip (pill choice, 56px target) ─────────────────────────────────────────

const CHIP_SELECTED: Record<TileTone, string> = {
  sky: 'bg-sky-500 text-white border-sky-500 shadow-sm',
  emerald: 'bg-emerald-500 text-white border-emerald-500 shadow-sm',
  amber: 'bg-amber-500 text-white border-amber-500 shadow-sm',
  red: 'bg-red-500 text-white border-red-500 shadow-sm',
}

export function Chip({
  selected,
  onClick,
  children,
  tone = 'sky',
  className,
  disabled,
}: {
  selected?: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: TileTone
  className?: string
  disabled?: boolean
}) {
  const night = useNight()
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!selected}
      className={cn(
        'px-5 min-h-[56px] rounded-2xl text-sm font-bold border-2 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 text-center disabled:opacity-40',
        selected
          ? CHIP_SELECTED[tone]
          : night
          ? 'bg-[#152742] text-slate-200 border-[#223F68] hover:bg-[#1C3559]'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
        className
      )}
    >
      {selected && <Check className="w-4 h-4 stroke-[3]" />}
      {children}
    </motion.button>
  )
}

// ─── Big stepper buttons ─────────────────────────────────────────────────────

export function StepBtn({
  onClick,
  children,
  className,
}: {
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  const night = useNight()
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'min-h-[56px] min-w-[56px] rounded-2xl border-2 font-mono font-black text-base flex items-center justify-center cursor-pointer select-none transition-colors',
        night
          ? 'bg-[#152742] border-[#223F68] text-slate-100 hover:bg-[#1C3559] active:bg-sky-900/60'
          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 active:bg-sky-100',
        className
      )}
    >
      {children}
    </motion.button>
  )
}

/** −  value  +  stepper for single numbers (age, units, minutes) — no keyboard */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  bigStep,
  unit,
  placeholder = '—',
  startAt,
}: {
  value?: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  bigStep?: number
  unit?: string
  placeholder?: string
  /** First tap on an empty value jumps here */
  startAt?: number
}) {
  const night = useNight()
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const bump = (d: number) => {
    // First tap on an empty value jumps to a sensible starting point
    if (value === undefined) onChange(clamp(startAt ?? min))
    else onChange(clamp(value + d))
  }
  return (
    <div className="flex items-center gap-2">
      {bigStep && <StepBtn onClick={() => bump(-bigStep)}>−{bigStep}</StepBtn>}
      <StepBtn onClick={() => bump(-step)} className="w-14">
        <Minus className="w-5 h-5" />
      </StepBtn>
      <div
        className={cn(
          'flex-1 min-w-[88px] min-h-[56px] rounded-2xl border-2 flex items-baseline justify-center gap-1.5 px-3 py-2',
          night ? 'bg-[#0A1424] border-[#223F68]' : 'bg-white border-slate-200'
        )}
      >
        <span className={cn('font-mono text-3xl font-black', night ? 'text-white' : 'text-slate-900')}>
          {value === undefined ? placeholder : value}
        </span>
        {unit && <span className="font-mono text-sm text-slate-400">{unit}</span>}
      </div>
      <StepBtn onClick={() => bump(step)} className="w-14">
        <Plus className="w-5 h-5" />
      </StepBtn>
      {bigStep && <StepBtn onClick={() => bump(bigStep)}>+{bigStep}</StepBtn>}
    </div>
  )
}

// ─── Per-field mic ───────────────────────────────────────────────────────────

/** One-shot dictation into a specific field (overrides the step's default target) */
export function FieldMic({ target, className }: { target: VoiceTarget; className?: string }) {
  const start = useVoiceStore((s) => s.start)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => start({ target })}
      aria-label={`Dictate ${target.label}`}
      title={`Dictate ${target.label}`}
      className={cn(
        'w-12 h-12 rounded-full bg-sky-500/10 text-sky-500 border-2 border-sky-500/30 flex items-center justify-center flex-shrink-0 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer',
        className
      )}
    >
      <Mic className="w-5 h-5" />
    </motion.button>
  )
}

// ─── Text field (large) ──────────────────────────────────────────────────────

export function TextField({
  value,
  onChange,
  placeholder,
  mic,
  className,
  multiline,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mic?: VoiceTarget
  className?: string
  multiline?: boolean
}) {
  const night = useNight()
  const cls = cn(
    'w-full px-4 py-3.5 rounded-2xl border-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
    night
      ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white',
    className
  )
  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(cls, 'resize-none')} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(cls, 'min-h-[56px]')} />
      )}
      {mic && <FieldMic target={mic} />}
    </div>
  )
}
