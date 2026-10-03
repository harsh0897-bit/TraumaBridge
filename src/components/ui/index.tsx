'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:   'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-[0_0_16px_-4px_rgba(14,165,233,0.4)] hover:shadow-[0_0_20px_-4px_rgba(14,165,233,0.5)]',
    secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200',
    ghost:     'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600',
    danger:    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
    success:   'bg-emerald-500 hover:bg-emerald-600 text-white',
  }
  const sizes: Record<string, string> = {
    sm:  'px-3 py-1.5 text-xs gap-1.5 rounded-lg min-h-[32px]',
    md:  'px-4 py-2.5 text-sm gap-2 rounded-xl min-h-[40px]',
    lg:  'px-5 py-3 text-sm gap-2 rounded-xl min-h-[48px]',
    xl:  'px-6 py-4 text-base gap-2.5 rounded-2xl min-h-[56px]',
  }

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
      {iconRight}
    </motion.button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  nightMode?: boolean
}

export function Input({ label, hint, error, nightMode, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-xs font-semibold', nightMode ? 'text-slate-400' : 'text-slate-600')}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-4 py-3 rounded-xl border font-sans text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1',
          nightMode
            ? 'bg-[#162440] border-[#1E3A5F] text-white placeholder-slate-500 focus:border-sky-500'
            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-400',
          error ? 'border-red-400 focus:ring-red-400' : '',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  nightMode?: boolean
}

export function Textarea({ label, hint, nightMode, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={cn('text-xs font-semibold', nightMode ? 'text-slate-400' : 'text-slate-600')}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full px-4 py-3 rounded-xl border font-sans text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 resize-none',
          nightMode
            ? 'bg-[#162440] border-[#1E3A5F] text-white placeholder-slate-500'
            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
          className
        )}
        rows={3}
        {...props}
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  nightMode?: boolean
  elevated?: boolean
  onClick?: () => void
}

export function Card({ children, className, nightMode, elevated, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-colors duration-200',
        nightMode
          ? elevated
            ? 'bg-[#162440] border-[#1E3A5F]'
            : 'bg-[#0F1E35] border-[#1E3A5F]'
          : elevated
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-white border-slate-100',
        onClick ? 'cursor-pointer hover:border-sky-300' : '',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'default' | 'sky' | 'teal' | 'amber' | 'red' | 'emerald' | 'slate'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-600',
    sky:     'bg-sky-100 text-sky-700',
    teal:    'bg-teal-100 text-teal-700',
    amber:   'bg-amber-100 text-amber-700',
    red:     'bg-red-100 text-red-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate:   'bg-slate-800 text-slate-300',
  }
  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  }
  return (
    <span className={cn('inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

// ─── SelectChip — for mechanism / category selection ─────────────────────────

interface SelectChipProps {
  selected?: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
  nightMode?: boolean
}

export function SelectChip({ selected, onClick, icon, label, nightMode }: SelectChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 min-h-[80px] text-center',
        selected
          ? 'border-sky-500 bg-sky-500/10 text-sky-600'
          : nightMode
          ? 'border-[#1E3A5F] bg-[#0F1E35] text-slate-400 hover:border-sky-700 hover:text-slate-200'
          : 'border-slate-200 bg-white text-slate-500 hover:border-sky-300 hover:text-slate-700'
      )}
    >
      {icon && <div className="w-6 h-6 flex items-center justify-center">{icon}</div>}
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </motion.button>
  )
}

// ─── Severity Selector ────────────────────────────────────────────────────────

const SEVERITIES = [
  { key: 'minor', label: 'Minor', color: 'emerald' },
  { key: 'moderate', label: 'Moderate', color: 'amber' },
  { key: 'severe', label: 'Severe', color: 'red' },
  { key: 'critical', label: 'Critical', color: 'red' },
  { key: 'unknown', label: 'Unknown', color: 'slate' },
] as const

export function SeveritySelector({
  value,
  onChange,
}: {
  value?: string
  onChange: (v: string) => void
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-emerald-300',
    amber:   'bg-amber-100 text-amber-700 border-amber-300 ring-amber-300',
    red:     'bg-red-100 text-red-700 border-red-300 ring-red-300',
    slate:   'bg-slate-100 text-slate-600 border-slate-300 ring-slate-300',
  }
  return (
    <div className="flex flex-wrap gap-2">
      {SEVERITIES.map((s) => {
        const isSelected = value === s.key
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150',
              isSelected
                ? cn(colorMap[s.color], 'ring-2 ring-offset-1')
                : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Vital Input Row ──────────────────────────────────────────────────────────

interface VitalInputProps {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  normal?: string
  statusColor?: string
  nightMode?: boolean
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: number
}

export function VitalInput({ label, unit, value, onChange, normal, statusColor, nightMode, type = 'number', min, max, step }: VitalInputProps) {
  return (
    <div className={cn('rounded-xl border p-4 transition-colors', nightMode ? 'bg-[#0F1E35] border-[#1E3A5F]' : 'bg-white border-slate-200')}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {normal && <span className="font-mono text-[10px] text-slate-400">Normal: {normal}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-full font-mono text-2xl font-bold bg-transparent border-none outline-none focus:outline-none',
            statusColor ?? (nightMode ? 'text-white' : 'text-slate-900')
          )}
          placeholder="—"
        />
        <span className="font-mono text-sm text-slate-400 flex-shrink-0">{unit}</span>
      </div>
    </div>
  )
}

// ─── Demo Warning Banner ──────────────────────────────────────────────────────

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 font-mono">
      <span className="font-bold">⚠ DEMO ONLY</span>
      <span className="opacity-70">—</span>
      <span>No real patient data · No real clinical transmissions · Not for clinical use</span>
    </div>
  )
}

// ─── Step Progress Indicator ──────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: 'patient', label: 'Patient' },
  { id: 'incident', label: 'Incident' },
  { id: 'injuries', label: 'Injuries' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'treatments', label: 'Treatment' },
  { id: 'mist', label: 'MIST' },
  { id: 'review', label: 'Review & Send' },
] as const

type StepId = typeof WIZARD_STEPS[number]['id']

interface WizardProgressProps {
  currentStep: string
  completedSteps: string[]
  onStepClick?: (id: string) => void
  nightMode?: boolean
}

export function WizardProgress({ currentStep, completedSteps, onStepClick, nightMode }: WizardProgressProps) {
  // Normalize review / handover
  const activeNormalized = currentStep === 'handover' ? 'review' : currentStep

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
      {WIZARD_STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.id) || (step.id === 'review' && completedSteps.includes('handover'))
        const isCurrent = activeNormalized === step.id
        const isClickable = (isCompleted || isCurrent) && onStepClick

        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 select-none',
                isCurrent
                  ? 'bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/30'
                  : isCompleted
                  ? nightMode
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 cursor-pointer'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/60 cursor-pointer'
                  : nightMode
                  ? 'text-slate-500 bg-transparent cursor-default'
                  : 'text-slate-400 bg-transparent cursor-default'
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  isCurrent
                    ? 'bg-white text-sky-600'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : nightMode
                    ? 'bg-[#1E3A5F] text-slate-400'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {isCompleted ? '✓' : i + 1}
              </span>
              <span className="hidden md:inline whitespace-nowrap">{step.label}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-2.5 sm:w-4 h-[2px] rounded-full',
                  isCompleted
                    ? 'bg-emerald-400'
                    : nightMode
                    ? 'bg-[#1E3A5F]'
                    : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Status Chip ─────────────────────────────────────────────────────────────

interface StatusChipProps {
  status: string
  dot?: boolean
  size?: 'sm' | 'md'
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  'transporting':    { bg: 'bg-sky-500/15',    text: 'text-sky-400',    dot: 'bg-sky-400' },
  'on-scene':        { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  'dispatch':        { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400' },
  'en-route-scene':  { bg: 'bg-sky-400/15',    text: 'text-sky-300',    dot: 'bg-sky-300' },
  'arrived':         { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-400' },
  'acknowledged':    { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-500' },
  'sent':            { bg: 'bg-sky-500/15',    text: 'text-sky-400',    dot: 'bg-sky-400' },
  'not-sent':        { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400' },
  'preparing':       { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  'ready':           { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-500' },
  'info-requested':  { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  'demo':            { bg: 'bg-amber-500/15',  text: 'text-amber-500',  dot: 'bg-amber-400' },
}

export function StatusChip({ status, dot = true, size = 'sm' }: StatusChipProps) {
  const s = statusStyles[status] ?? { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono font-semibold tracking-widest uppercase rounded-full', s.bg, s.text, size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1')}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />}
      {status.replace(/-/g, ' ')}
    </span>
  )
}
