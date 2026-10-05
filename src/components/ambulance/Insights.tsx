/**
 * TRAUMABRIDGE AI — Computed scores + protocol suggestions
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, X, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmergencyRun } from '@/types/run'
import {
  computeRts,
  getSuggestions,
  latestVitals,
  shockIndex,
  shockIndexLabel,
  SURVEY_LABELS,
  type Tone,
} from '@/lib/clinical'
import { useNight, toneText } from './primitives'

// ─── Score cards (Shock Index · T-RTS · AVPU) ────────────────────────────────

function ScoreCard({
  label,
  value,
  sub,
  tone,
  note,
}: {
  label: string
  value: string
  sub: string
  tone: Tone
  note?: string
}) {
  const night = useNight()
  return (
    <div
      className={cn(
        'p-4 rounded-2xl border-2 flex flex-col justify-between min-h-[108px]',
        tone === 'red'
          ? 'border-red-500/60 bg-red-500/5'
          : tone === 'amber'
          ? 'border-amber-500/60 bg-amber-500/5'
          : night
          ? 'border-[#1D3455] bg-[#0E1A2F]'
          : 'border-slate-200 bg-white'
      )}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div>
        <span className={cn('font-mono text-3xl font-black leading-none', toneText(tone, night))}>{value}</span>
        {note && <span className="font-mono text-xs text-slate-400 ml-1.5">{note}</span>}
      </div>
      <span className={cn('text-xs font-bold', tone === 'none' ? 'text-slate-400' : toneText(tone, night))}>{sub}</span>
    </div>
  )
}

export function ScoreCards({ run, className }: { run: EmergencyRun; className?: string }) {
  const v = useMemo(() => latestVitals(run.vitalObservations), [run.vitalObservations])
  const si = shockIndex(v.hr, v.sbp)
  const siInfo = shockIndexLabel(si)
  const rts = computeRts(v)
  const avpu = run.primarySurvey?.avpu

  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      <ScoreCard
        label="Shock Index"
        value={si === null ? '—' : si.toFixed(2)}
        sub={siInfo.label}
        tone={siInfo.tone}
        note={si !== null ? (si >= 1 ? '▲' : undefined) : undefined}
      />
      <ScoreCard
        label="T-RTS (0–12)"
        value={rts ? String(rts.trts) : '—'}
        sub={rts ? rts.label : 'Needs GCS · SBP · RR'}
        tone={rts ? rts.tone : 'none'}
        note={rts ? `RTS ${rts.rts.toFixed(1)}` : undefined}
      />
      <ScoreCard
        label="AVPU (Survey)"
        value={avpu ?? '—'}
        sub={avpu ? SURVEY_LABELS.avpu[avpu] : 'Not assessed'}
        tone={avpu === 'U' ? 'red' : avpu === 'P' ? 'red' : avpu === 'V' ? 'amber' : avpu === 'A' ? 'ok' : 'none'}
      />
    </div>
  )
}

// ─── Protocol suggestions panel ──────────────────────────────────────────────

export function ProtocolPanel({ run, nightMode }: { run: EmergencyRun; nightMode: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Dismissals belong to a run
  useEffect(() => {
    setDismissed(new Set())
  }, [run.id])

  const all = useMemo(() => getSuggestions(run), [run])
  const visible = all.filter((s) => !dismissed.has(s.id))
  const open = visible.filter((s) => !s.doneLabel)
  const hasCritical = open.some((s) => s.level === 'critical')

  if (visible.length === 0) return null

  return (
    <div className="fixed z-20 right-3 top-[8.25rem] w-[min(92vw,22rem)] flex flex-col items-end gap-2 pointer-events-none">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className={cn(
          'pointer-events-auto min-h-[48px] px-4 rounded-2xl border-2 shadow-lg flex items-center gap-2.5 font-bold text-sm cursor-pointer transition-colors',
          hasCritical
            ? 'bg-red-500 border-red-400 text-white'
            : open.length
            ? 'bg-amber-500 border-amber-400 text-white'
            : 'bg-emerald-500 border-emerald-400 text-white'
        )}
      >
        {hasCritical ? (
          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <ShieldAlert className="w-5 h-5" />
          </motion.span>
        ) : open.length ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
        <span>{open.length ? `${open.length} suggestion${open.length > 1 ? 's' : ''}` : 'All actioned'}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'pointer-events-auto w-full max-h-[55vh] overflow-y-auto rounded-3xl border-2 p-3 space-y-2.5 shadow-2xl',
              nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center gap-2 px-1 pt-1">
              <Lightbulb className="w-4 h-4 text-sky-500" />
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-400">
                Protocol suggestions · decision support only
              </span>
            </div>

            {visible.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'p-3.5 rounded-2xl border-2 flex items-start gap-3',
                  s.doneLabel
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : s.level === 'critical'
                    ? 'border-red-500/60 bg-red-500/5'
                    : 'border-amber-500/60 bg-amber-500/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-black leading-tight', nightMode ? 'text-white' : 'text-slate-900')}>
                    {s.doneLabel ? '✓ ' : ''}
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    {s.doneLabel ? <span className="font-bold text-emerald-600">{s.doneLabel}</span> : s.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissed((d) => new Set(d).add(s.id))}
                  aria-label={`Dismiss ${s.title}`}
                  className="w-10 h-10 -m-1 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
