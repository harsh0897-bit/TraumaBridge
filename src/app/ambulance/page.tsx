'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Activity, Radio, MapPin, Clock, User, Send, Check, AlertTriangle,
  Sun, Moon, Wifi, ChevronRight, ChevronLeft, Play, RefreshCw,
  Heart, Thermometer, Wind, Eye, Droplets, FileText, Plus, X, Trash2,
  Package, Shield, ShieldCheck, CheckCircle2, Stethoscope, Camera, Upload,
  HelpCircle, Sparkles, Mic, Phone, Building2, Flame, ShieldAlert,
  Car, UserX, AlertCircle, FileSearch, ArrowRight, Zap, Pill, Siren
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { InjuryMap } from '@/components/ambulance/InjuryMap'
import { VoiceDock } from '@/components/ambulance/VoiceDock'
import { ProtocolPanel, ScoreCards } from '@/components/ambulance/Insights'
import {
  NumberStepper, Tile, Chip, StepBtn, FieldMic, TextField,
  StepHeader, Panel, FieldLabel
} from '@/components/ambulance/primitives'
import {
  vitalTone, shockIndex, computeRts, lifeThreats, buildMist, SURVEY_LABELS, latestVitals
} from '@/lib/clinical'
import { useVoiceTarget } from '@/lib/voice'
import {
  parseVitals, parsePatient, parseIncident, parseSurvey, parseDrugs, gcsFromTotal
} from '@/lib/voiceParsers'
import {
  Button, Badge, WizardProgress, DemoBanner
} from '@/components/ui'
import type {
  WizardStep, VitalObservation, TreatmentEntry, TreatmentCategory,
  EmergencyRun, InjuryRecord, IdentityDocument, PrimarySurvey
} from '@/types/run'
import { AVAILABLE_HOSPITALS } from '@/data/demoRun'

// ─── Step Ordering (ATLS / PHTLS Clinical Sequence) ──────────────────────────

const STEPS: WizardStep[] = [
  'patient',
  'incident',
  'survey',
  'injuries',
  'vitals',
  'treatments',
  'review',
]

const STEP_LABELS: Record<string, string> = {
  patient: '1. Patient',
  incident: '2. Scene',
  survey: '3. Survey (ABCDE)',
  injuries: '4. Injuries',
  vitals: '5. Vitals & Scores',
  treatments: '6. Interventions',
  review: '7. MIST & Pre-Alert',
  mist: '7. MIST & Pre-Alert',
  handover: '7. MIST & Pre-Alert',
}

function stepIndex(s: WizardStep | string) {
  if (s === 'mist' || s === 'handover') return STEPS.indexOf('review')
  return STEPS.indexOf(s as WizardStep)
}

function getCompletedSteps(currentStep: WizardStep | string): string[] {
  const idx = stepIndex(currentStep)
  return STEPS.slice(0, Math.max(0, idx))
}

// ─── Root Ambulance Page ──────────────────────────────────────────────────────

export default function AmbulancePage() {
  const {
    activeRun,
    nightMode,
    loadDemoRun,
    startNewRun,
    setStep,
    setNightMode,
  } = useRunStore()

  // Cross-tab sync
  useEffect(() => {
    const unsub = initRunSync()
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  const [sessionActive, setSessionActive] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  // Normalized current step
  const rawStep = activeRun?.currentStep ?? 'patient'
  const currentStep = (rawStep === 'mist' || rawStep === 'handover' ? 'review' : rawStep) as WizardStep
  const completed = activeRun ? getCompletedSteps(currentStep) : []

  const handleStartNewRun = () => {
    startNewRun('Alpha 7', 'Para. J. Chen', 'hosp-001')
    setStep('patient')
    setSessionActive(true)
  }

  const handleLoadDemo = () => {
    loadDemoRun(true)
    setStep('patient')
    setSessionActive(true)
  }

  const handleResumeDraft = () => {
    setSessionActive(true)
  }

  const advance = () => {
    if (!activeRun) return
    const idx = stepIndex(currentStep)
    if (idx < STEPS.length - 1) {
      setDirection('forward')
      setStep(STEPS[idx + 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const back = () => {
    if (!activeRun) return
    const idx = stepIndex(currentStep)
    if (idx > 0) {
      setDirection('backward')
      setStep(STEPS[idx - 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleStepJump = (id: string) => {
    const targetIdx = stepIndex(id)
    const currentIdx = stepIndex(currentStep)
    setDirection(targetIdx > currentIdx ? 'forward' : 'backward')
    setStep(id as WizardStep)
  }

  const nextStepIdx = stepIndex(currentStep) + 1
  const nextStepName = nextStepIdx < STEPS.length ? STEP_LABELS[STEPS[nextStepIdx]] : 'Complete'

  // If no run or session not yet started in this view, show the Start Portal
  if (!activeRun || !sessionActive) {
    return (
      <StartPortal
        existingRun={activeRun}
        nightMode={nightMode}
        onStartNew={handleStartNewRun}
        onLoadDemo={handleLoadDemo}
        onResumeDraft={handleResumeDraft}
        onNightToggle={() => setNightMode(!nightMode)}
      />
    )
  }

  const isLastStep = currentStep === 'review'

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col font-sans transition-colors duration-200 select-none pb-32',
        nightMode ? 'bg-[#0A1120] text-slate-100' : 'bg-[#F4F7FB] text-slate-900'
      )}
    >
      <DemoBanner />

      {/* ── Persistent Ambulance Context Header ──────────────────────────── */}
      <AmbulanceHeader
        nightMode={nightMode}
        onNightToggle={() => setNightMode(!nightMode)}
        run={activeRun}
        currentStep={currentStep}
        completedSteps={completed}
        onStepClick={handleStepJump}
      />

      {/* ── Patient Context Strip ────────────────────────────────────────── */}
      <PatientContextBar run={activeRun} nightMode={nightMode} />

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Real-time Deterministic Protocol Suggestions Banner */}
        <ProtocolPanel run={activeRun} nightMode={nightMode} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction === 'forward' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 'forward' ? -24 : 24 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="w-full"
          >
            {currentStep === 'patient' && <StepPatient />}
            {currentStep === 'incident' && <StepIncident />}
            {currentStep === 'survey' && <StepSurvey />}
            {currentStep === 'injuries' && <StepInjuries nightMode={nightMode} />}
            {currentStep === 'vitals' && <StepVitals onAdvance={advance} />}
            {currentStep === 'treatments' && <StepTreatments />}
            {currentStep === 'review' && <StepReview nightMode={nightMode} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Persistent Global Voice Dock ─────────────────────────────────── */}
      <VoiceDock nightMode={nightMode} />

      {/* ── Fixed Bottom Action Bar (56px touch target standard) ─────────── */}
      <footer
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 px-4 sm:px-8 py-3.5 border-t backdrop-blur-md transition-colors',
          nightMode
            ? 'bg-[#0F1E38]/95 border-[#1E3A5F]'
            : 'bg-white/95 border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        )}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={back}
            disabled={stepIndex(currentStep) === 0}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-150 min-h-[52px]',
              stepIndex(currentStep) === 0
                ? 'opacity-30 cursor-not-allowed border-transparent text-slate-400'
                : nightMode
                ? 'border-[#1E3A5F] bg-[#162744] text-slate-200 hover:bg-[#1E3559]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            )}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            <span>Back</span>
          </button>

          {/* Center: Step indicators */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="font-semibold text-slate-500">Step {stepIndex(currentStep) + 1} of {STEPS.length}</span>
            <span>·</span>
            <span className="text-sky-500 font-bold uppercase tracking-wider">{STEP_LABELS[currentStep]}</span>
          </div>

          {/* Primary Action Button */}
          {!isLastStep ? (
            <button
              type="button"
              onClick={advance}
              className="px-6 sm:px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 flex items-center gap-2 min-h-[52px] active:scale-95 transition-all"
            >
              <span>Next: {nextStepName}</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-500 font-bold px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                {activeRun.alertStatus === 'sent' || activeRun.alertStatus === 'acknowledged'
                  ? '✓ Pre-Alert Transmitted'
                  : 'Review & Transmit Ready'}
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

// ─── Start Portal (Guarantees Step 1 Start / Draft Resume) ─────────────────────

function StartPortal({
  existingRun,
  nightMode,
  onStartNew,
  onLoadDemo,
  onResumeDraft,
  onNightToggle,
}: {
  existingRun: EmergencyRun | null
  nightMode: boolean
  onStartNew: () => void
  onLoadDemo: () => void
  onResumeDraft: () => void
  onNightToggle: () => void
}) {
  return (
    <div
      className={cn(
        'min-h-screen flex flex-col font-sans transition-colors duration-200 select-none',
        nightMode ? 'bg-[#090F1C] text-slate-100' : 'bg-[#F4F6FA] text-slate-900'
      )}
    >
      <DemoBanner />

      {/* Top Navbar */}
      <header
        className={cn(
          'px-6 py-3.5 border-b flex items-center justify-between transition-colors',
          nightMode ? 'bg-[#0F1B2F] border-[#1E3352]' : 'bg-white border-slate-200 shadow-xs'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-600 to-teal-400 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('font-mono text-sm font-black tracking-tight leading-none', nightMode ? 'text-white' : 'text-slate-900')}>
                TRAUMA<span className="text-sky-500">BRIDGE</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-extrabold uppercase">
                Ambulance Terminal
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
              Unit Alpha 7 · Paramedic Dispatch Kiosk
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNightToggle}
          className={cn(
            'p-2 rounded-xl border transition-colors',
            nightMode ? 'bg-[#152742] border-[#223F68] text-amber-400 hover:bg-[#1C3559]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          )}
          title="Toggle Night Mode"
        >
          {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Hero Portal Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Context Card */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={cn(
                'p-6 sm:p-7 rounded-3xl border space-y-4 transition-colors shadow-sm',
                nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-sky-500 uppercase tracking-wider">
                  Vehicle Status
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  Ready For Dispatch
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-sky-500" /> Unit Callsign
                  </span>
                  <span className={cn('font-bold font-mono text-sm', nightMode ? 'text-white' : 'text-slate-900')}>
                    Alpha 7 (HEMS / Critical Care)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-500" /> Crew Lead
                  </span>
                  <span className={cn('font-bold font-mono', nightMode ? 'text-slate-200' : 'text-slate-800')}>
                    Para. J. Chen (Senior CCP)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-500" /> Receiving MTC
                  </span>
                  <span className={cn('font-bold font-mono', nightMode ? 'text-slate-200' : 'text-slate-800')}>
                    St. Bartholomew's Major Trauma Centre
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-500" /> Resuscitation Bay
                  </span>
                  <span className="font-bold text-red-500 font-mono">
                    Bay 2 Assigned & Standby
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact Action Cards */}
          <div className="lg:col-span-7 space-y-4">
            {/* PRIMARY DOMINANT ACTION */}
            <button
              type="button"
              onClick={onStartNew}
              className="w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-500 via-sky-600 to-sky-700 text-white shadow-xl shadow-sky-500/25 hover:from-sky-600 hover:to-sky-800 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-left flex items-center justify-between group cursor-pointer border border-sky-400/40 relative overflow-hidden"
            >
              <div className="relative z-10 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-mono font-bold uppercase tracking-wider backdrop-blur-xs">
                  <Play className="w-3.5 h-3.5 fill-white" /> Primary Action
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Start New Emergency Run
                </h2>

                <p className="text-xs sm:text-sm text-sky-100 max-w-lg leading-relaxed">
                  Initializes fresh pre-hospital transport. Starts at <strong>Step 1: Patient Identity</strong> with 1-tap rapid entry.
                </p>
              </div>

              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:translate-x-1.5 transition-transform backdrop-blur-xs">
                <ArrowRight className="w-7 h-7 text-white stroke-[2.5]" />
              </div>

              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16 pointer-events-none" />
            </button>

            {/* SECONDARY ACTION: Resume Draft */}
            {existingRun && (
              <div
                className={cn(
                  'p-5 sm:p-6 rounded-3xl border-2 flex items-center justify-between gap-4 transition-all shadow-sm',
                  nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-500">
                      Active Draft in Progress
                    </span>
                  </div>
                  <h3 className={cn('text-base font-extrabold', nightMode ? 'text-white' : 'text-slate-900')}>
                    {existingRun.patient.name ?? 'Unidentified Patient'} · Unit {existingRun.callsign}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Paused at: <span className="font-bold text-sky-500 capitalize">{STEP_LABELS[existingRun.currentStep] ?? existingRun.currentStep}</span>
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={onResumeDraft}
                  className="rounded-2xl font-bold text-xs px-5 py-2.5 flex-shrink-0 min-h-[48px]"
                >
                  Resume Draft
                </Button>
              </div>
            )}

            {/* TERTIARY ACTION: Load Demonstration Case */}
            <div
              className={cn(
                'p-5 sm:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                nightMode ? 'bg-[#0E1A2F]/80 border-[#1D3455]' : 'bg-white/80 border-slate-200/90 shadow-sm'
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Clinical Training & Demonstration
                  </span>
                </div>
                <h4 className={cn('text-sm font-bold', nightMode ? 'text-white' : 'text-slate-900')}>
                  Pre-Populated Case: M25 High-Speed RTC
                </h4>
                <p className="text-xs text-slate-400">
                  Loads a poly-trauma scenario with bilateral rib fractures, pelvic instability, GCS 14, and chest decompression.
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onLoadDemo}
                className="rounded-xl font-bold text-xs flex-shrink-0 min-h-[44px]"
              >
                Load Demo Run
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Persistent Ambulance Header ──────────────────────────────────────────────

function AmbulanceHeader({
  nightMode,
  onNightToggle,
  run,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  nightMode: boolean
  onNightToggle: () => void
  run: EmergencyRun
  currentStep: string
  completedSteps: string[]
  onStepClick: (id: string) => void
}) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const update = () => {
      const start = new Date(run.createdAt).getTime()
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [run.createdAt])

  return (
    <header
      className={cn(
        'sticky top-0 z-20 px-4 sm:px-6 py-2.5 border-b transition-colors',
        nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90 shadow-sm'
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Unit info */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-sm">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className={cn('font-mono text-xs font-black tracking-tight hidden sm:inline', nightMode ? 'text-white' : 'text-slate-900')}>
              TRAUMA<span className="text-sky-500">BRIDGE</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
              {run.callsign}
            </span>
            <span className="font-mono text-[10px] text-slate-400 hidden md:inline">
              #{run.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Center: Stepper (Progress / Step Bar) */}
        <div className="flex-1 max-w-2xl mx-2">
          <WizardProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            nightMode={nightMode}
          />
        </div>

        {/* Right: Connectivity, Elapsed Timer, Night Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className={cn('font-bold', nightMode ? 'text-slate-200' : 'text-slate-700')}>{elapsed}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-mono hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold">Sync Active</span>
          </div>

          <button
            type="button"
            onClick={onNightToggle}
            className={cn(
              'p-2 rounded-xl border transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center',
              nightMode ? 'bg-[#152742] border-[#223F68] text-amber-400 hover:bg-[#1C3559]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            )}
            title="Toggle Night Mode"
          >
            {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Patient Context Strip ────────────────────────────────────────────────────

function PatientContextBar({ run, nightMode }: { run: EmergencyRun; nightMode: boolean }) {
  const hospital = AVAILABLE_HOSPITALS.find((h) => h.id === run.destinationHospitalId)

  return (
    <div
      className={cn(
        'px-4 sm:px-6 py-2 border-b text-xs flex items-center justify-between gap-4 font-mono transition-colors',
        nightMode ? 'bg-[#0B1527] border-[#182C48] text-slate-300' : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
      )}
    >
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className={cn('font-bold flex items-center gap-1.5', nightMode ? 'text-white' : 'text-slate-900')}>
            <User className="w-3.5 h-3.5 text-sky-500" />
            {run.patient.name ?? `Unknown ${run.patient.sex ?? 'Male'}, ~${run.patient.estimatedAge ?? 38}y`}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-slate-500 dark:text-slate-400 capitalize">{run.patient.identityStatus.replace('-', ' ')}</span>
          {run.patient.allergies && run.patient.allergies.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-red-500 font-bold">Allergies: {run.patient.allergies.join(', ')}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-slate-400 hidden sm:inline">Destination:</span>
          <span className={cn('font-semibold flex items-center gap-1', nightMode ? 'text-slate-200' : 'text-slate-800')}>
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            {hospital?.shortName ?? 'St. Bartholomew’s'}
          </span>
          {run.eta && (
            <span className={cn(
              'font-bold px-2 py-0.5 rounded-md border font-mono text-[11px]',
              nightMode
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                : 'text-sky-700 bg-sky-100/70 border-sky-200'
            )}>
              ETA {run.eta}m
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 1: PATIENT ──────────────────────────────────────────────────────────

const ALLERGY_CHIPS = ['NKDA', 'Penicillin', 'NSAIDs', 'Sulfa', 'Opioids', 'Latex']

function StepPatient() {
  const { activeRun, updatePatient } = useRunStore()
  if (!activeRun) return null

  const p = activeRun.patient
  const identityStatus = p.identityStatus

  // Register voice target
  useVoiceTarget({
    label: 'Patient Details',
    hint: 'e.g. 42 year old male named David Miller, allergic to penicillin',
    sample: '42 year old male, allergic to penicillin',
    apply: (t) => {
      const parsed = parsePatient(t)
      const updates: Partial<EmergencyRun['patient']> = {}
      if (parsed.name) updates.name = parsed.name
      if (parsed.age) updates.estimatedAge = parsed.age
      if (parsed.sex) updates.sex = parsed.sex
      if (parsed.allergyNone) updates.allergies = ['NKDA']
      else if (parsed.allergies) updates.allergies = parsed.allergies
      updatePatient(updates)
      return 'Updated patient details'
    },
  })

  const handleModeChange = (mode: EmergencyRun['patient']['identityStatus']) => {
    updatePatient({
      identityStatus: mode,
      name: mode === 'known' ? p.name : undefined,
    })
  }

  const toggleAllergy = (allergy: string) => {
    const current = p.allergies ?? []
    if (allergy === 'NKDA') {
      updatePatient({ allergies: ['NKDA'] })
      return
    }
    const filtered = current.filter((a) => a !== 'NKDA')
    if (filtered.includes(allergy)) {
      const next = filtered.filter((a) => a !== allergy)
      updatePatient({ allergies: next.length === 0 ? ['NKDA'] : next })
    } else {
      updatePatient({ allergies: [...filtered, allergy] })
    }
  }

  const setAge = (val: number) => {
    updatePatient({ estimatedAge: val })
  }

  return (
    <div className="space-y-6">
      <StepHeader
        index={1}
        label="PATIENT IDENTITY"
        title="Who are we transporting?"
        subtitle="Select identity status. Missing identity documents never block emergency care or transport."
      />

      {/* 4 Large Identity Status Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Tile
          selected={identityStatus === 'known'}
          title="Known Patient"
          desc="Patient, relative, or ID card confirmed name"
          icon={User}
          onClick={() => handleModeChange('known')}
        />
        <Tile
          selected={identityStatus === 'unknown'}
          title="Unknown / Unidentified"
          desc="Temporary RFID / tracker ID assigned"
          icon={UserX}
          onClick={() => handleModeChange('unknown')}
        />
        <Tile
          selected={identityStatus === 'cannot-respond'}
          title="Cannot Respond"
          desc="Unconscious, intubated, or severe head trauma"
          icon={ShieldAlert}
          onClick={() => handleModeChange('cannot-respond')}
        />
        <Tile
          selected={identityStatus === 'pending'}
          title="Identity Pending"
          desc="Crew searching belongings en route"
          icon={Clock}
          onClick={() => handleModeChange('pending')}
        />
      </div>

      <Panel className="space-y-6">
        {/* Name input (if known) or Temporary ID banner */}
        {identityStatus === 'known' ? (
          <div>
            <FieldLabel>Patient Full Name</FieldLabel>
            <TextField
              value={p.name ?? ''}
              onChange={(v) => updatePatient({ name: v })}
              placeholder="e.g. David Miller or Jane Doe"
            />
          </div>
        ) : (
          <div>
            <FieldLabel>Temporary Trauma Tracker Code</FieldLabel>
            <div className="px-4 py-3 rounded-2xl border font-mono text-sm font-bold flex items-center justify-between bg-slate-100 dark:bg-[#152742] border-slate-200 dark:border-[#223F68] text-slate-800 dark:text-sky-400">
              <span>PT-TEMP-{activeRun.id.slice(0, 6).toUpperCase()}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-bold">
                Auto-Assigned Barcode Active
              </span>
            </div>
          </div>
        )}

        {/* Biological / Observed Sex */}
        <div>
          <FieldLabel>Biological / Observed Sex</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {[
              { key: 'male', label: 'Male' },
              { key: 'female', label: 'Female' },
              { key: 'unknown', label: 'Indeterminate / Unknown' },
            ].map((s) => (
              <Chip
                key={s.key}
                selected={p.sex === s.key}
                onClick={() => updatePatient({ sex: s.key as any })}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Estimated Age with 56px Stepper + Quick Age Brackets */}
        <div>
          <FieldLabel>Estimated Age (Years)</FieldLabel>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <NumberStepper
              value={p.estimatedAge ?? 38}
              onChange={setAge}
              step={1}
              bigStep={5}
              min={0}
              max={120}
              unit="yrs"
            />

            {/* Quick Brackets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Child (6y)', val: 6 },
                { label: 'Teen (15y)', val: 15 },
                { label: 'Adult (35y)', val: 35 },
                { label: 'Geriatric (72y)', val: 72 },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setAge(b.val)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold border transition-colors min-h-[44px]',
                    p.estimatedAge === b.val
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Allergies: Mandatory Quick Chips */}
        <div>
          <FieldLabel>Known Allergies (1-Tap Selection)</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {ALLERGY_CHIPS.map((chip) => {
              const isSelected = (p.allergies ?? []).includes(chip)
              return (
                <Chip
                  key={chip}
                  selected={isSelected}
                  tone={chip === 'NKDA' ? 'emerald' : 'red'}
                  onClick={() => toggleAllergy(chip)}
                >
                  {chip === 'NKDA' ? '✓ NKDA (No Known Allergies)' : chip}
                </Chip>
              )
            })}
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ─── STEP 2: INCIDENT & SCENE ─────────────────────────────────────────────────

const MECHANISMS = [
  { code: 'rtc', label: 'Road Traffic Collision', desc: 'Driver, passenger, rollover, high-speed', icon: Car },
  { code: 'fall', label: 'Fall from Height', desc: 'Fall > 3m or ground level elderly fall', icon: AlertTriangle },
  { code: 'penetrating', label: 'Penetrating Trauma', desc: 'Stab wound, ballistic, impalement', icon: AlertCircle },
  { code: 'assault', label: 'Blunt Assault', desc: 'Physical assault or blunt weapon impact', icon: ShieldAlert },
  { code: 'burn', label: 'Thermal / Chemical Burn', desc: 'Flame, scald, inhalation, electrical', icon: Flame },
  { code: 'crush', label: 'Crush / Entrapment', desc: 'Heavy structural entrapment or collapse', icon: Package },
  { code: 'industrial', label: 'Industrial / Machinery', desc: 'Entanglement, factory or agricultural', icon: Building2 },
  { code: 'other', label: 'Other Trauma', desc: 'Alternative traumatic mechanism', icon: Activity },
]

const SCENE_HAZARDS = [
  'Hazardous Materials (HazMat)',
  'Fire / Active Smoke',
  'Hostile Scene / Violence',
  'Power Lines Down',
  'Unstable Vehicle',
]

function StepIncident() {
  const { activeRun, updateIncident, updateRunMeta } = useRunStore()
  if (!activeRun) return null

  const inc = activeRun.incident

  useVoiceTarget({
    label: 'Incident Scene',
    hint: 'e.g. Car crash, 2 casualties, trapped 20 minutes',
    sample: 'High-speed RTC, 2 casualties, trapped 20 minutes',
    apply: (t) => {
      const parsed = parseIncident(t)
      const updates: Partial<EmergencyRun['incident']> = {}
      if (parsed.mechanism) updates.mechanism = parsed.mechanism
      if (parsed.mechanismCode) updates.mechanismCode = parsed.mechanismCode
      if (parsed.casualties) updates.casualties = parsed.casualties
      if (parsed.entrapment) updates.entrapment = parsed.entrapment
      if (parsed.flags) updates.flags = parsed.flags
      updateIncident(updates)
      return 'Updated incident details'
    },
  })

  const toggleSafetyFlag = (flag: string) => {
    const current = inc.flags ?? []
    if (current.includes(flag)) {
      updateIncident({ flags: current.filter((f) => f !== flag) })
    } else {
      updateIncident({ flags: [...current, flag] })
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        index={2}
        label="SCENE & MECHANISM"
        title="What happened at the scene?"
        subtitle="Document trauma mechanism, scene hazards, and casualty triage for hospital readiness."
      />

      {/* Mechanism Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {MECHANISMS.map((m) => {
          const isSelected = inc.mechanismCode === m.code || inc.mechanism === m.label
          return (
            <Tile
              key={m.code}
              selected={isSelected}
              title={m.label}
              desc={m.desc}
              icon={m.icon}
              onClick={() => updateIncident({ mechanism: m.label, mechanismCode: m.code })}
            />
          )
        })}
      </div>

      <Panel className="space-y-6">
        {/* Casualty Count (PHTLS / MCI) */}
        <div>
          <FieldLabel>Total Scene Casualties (MCI Flag)</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {[
              { val: '1' as const, label: '1 (Single Patient)' },
              { val: '2-4' as const, label: '2–4 Casualties' },
              { val: '5+' as const, label: '5+ Casualties' },
              { val: 'mci' as const, label: 'MCI (Disaster Triage)' },
            ].map((c) => (
              <Chip
                key={c.val}
                selected={(inc.casualties ?? '1') === c.val}
                tone={c.val === '5+' || c.val === 'mci' ? 'amber' : 'sky'}
                onClick={() => updateIncident({ casualties: c.val })}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Entrapment Duration */}
        <div>
          <FieldLabel>Vehicle / Structural Entrapment</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {[
              { val: 'no' as const, label: 'None / Ambulatory' },
              { val: 'lt30' as const, label: '< 30 min' },
              { val: '30-60' as const, label: '30–60 min' },
              { val: 'gt60' as const, label: '> 60 min (Prolonged Extrication)' },
            ].map((e) => (
              <Chip
                key={e.val}
                selected={(inc.entrapment ?? 'no') === e.val}
                tone={e.val === 'gt60' || e.val === '30-60' ? 'red' : 'sky'}
                onClick={() => updateIncident({ entrapment: e.val })}
              >
                {e.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Scene Hazards / Safety Flags */}
        <div>
          <FieldLabel>Scene Safety & Hazard Flags</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {SCENE_HAZARDS.map((hz) => {
              const active = (inc.flags ?? []).includes(hz)
              return (
                <Chip
                  key={hz}
                  selected={active}
                  tone="amber"
                  onClick={() => toggleSafetyFlag(hz)}
                >
                  {active ? `⚠ ${hz}` : hz}
                </Chip>
              )
            })}
          </div>
        </div>

        {/* ETA Selector */}
        <div>
          <FieldLabel>Estimated Time of Arrival (ETA)</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {[3, 5, 8, 12, 18, 25].map((etaVal) => (
              <Chip
                key={etaVal}
                selected={activeRun.eta === etaVal}
                onClick={() => updateRunMeta({ eta: etaVal })}
              >
                {etaVal} Minutes
              </Chip>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ─── STEP 3: PRIMARY SURVEY (ABCDE) ──────────────────────────────────────────

function StepSurvey() {
  const { activeRun, updatePrimarySurvey } = useRunStore()
  if (!activeRun) return null

  const s = activeRun.primarySurvey ?? {
    airway: 'patent',
    breathSounds: 'normal',
    chestRise: 'symmetrical',
    pulse: 'present',
    haemorrhage: 'none',
    avpu: 'A',
    pupils: 'equal-reactive',
    limbMovement: 'all-four',
    breathingFlags: [],
    exposureFindings: [],
  }

  const threats = lifeThreats(s)

  useVoiceTarget({
    label: 'Primary Survey (ABCDE)',
    hint: 'e.g. Airway patent, bilateral air entry, pulse weak, AVPU Alert, pupils equal',
    sample: 'Airway patent, bilateral air entry, pulse weak, AVPU Alert, pupils equal',
    apply: (t) => {
      const parsed = parseSurvey(t)
      updatePrimarySurvey(parsed)
      return 'Logged primary survey findings'
    },
  })

  const toggleBreathingFlag = (flag: string) => {
    const cur = s.breathingFlags ?? []
    if (cur.includes(flag)) {
      updatePrimarySurvey({ breathingFlags: cur.filter((f) => f !== flag) })
    } else {
      updatePrimarySurvey({ breathingFlags: [...cur, flag] })
    }
  }

  const toggleExposureFinding = (flag: string) => {
    const cur = s.exposureFindings ?? []
    if (cur.includes(flag)) {
      updatePrimarySurvey({ exposureFindings: cur.filter((f) => f !== flag) })
    } else {
      updatePrimarySurvey({ exposureFindings: [...cur, flag] })
    }
  }

  const toggleCSpine = () => {
    const cur = s.airwayAdjuncts ?? []
    if (cur.includes('c-collar')) {
      updatePrimarySurvey({ airwayAdjuncts: cur.filter((a) => a !== 'c-collar') })
    } else {
      updatePrimarySurvey({ airwayAdjuncts: [...cur, 'c-collar'] })
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        index={3}
        label="RAPID PRIMARY SURVEY"
        title="ABCDE Resuscitation Assessment"
        subtitle="Identify and treat immediate life threats before advancing. Standardized ATLS/PHTLS protocol."
      />

      {/* Immediate Life Threats Banner */}
      {threats.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/50 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-500 block">
              Active Immediate Life Threats Detected ({threats.length})
            </span>
            <span className="text-sm font-black text-red-600 dark:text-red-400">
              {threats.join(' · ')}
            </span>
          </div>
        </div>
      )}

      {/* A - Airway */}
      <Panel className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <span className="w-7 h-7 rounded-xl bg-sky-500 text-white font-mono font-black flex items-center justify-center text-xs">
            A
          </span>
          <h3 className="font-black text-base">Airway & Cervical Spine</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['patent', 'compromised', 'obstructed'] as const).map((st) => (
            <Tile
              key={st}
              selected={s.airway === st}
              title={SURVEY_LABELS.airway[st]}
              tone={st === 'patent' ? 'emerald' : st === 'compromised' ? 'amber' : 'red'}
              onClick={() => updatePrimarySurvey({ airway: st })}
            />
          ))}
        </div>
        <div className="pt-2">
          <Chip
            selected={!!s.airwayAdjuncts?.includes('c-collar')}
            tone="sky"
            onClick={toggleCSpine}
          >
            {s.airwayAdjuncts?.includes('c-collar') ? '✓ C-Spine Motion Restricted (Collar/Blocks)' : 'C-Spine Motion Restriction Pending'}
          </Chip>
        </div>
      </Panel>

      {/* B - Breathing */}
      <Panel className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <span className="w-7 h-7 rounded-xl bg-teal-500 text-white font-mono font-black flex items-center justify-center text-xs">
            B
          </span>
          <h3 className="font-black text-base">Breathing & Ventilation</h3>
        </div>
        <div>
          <FieldLabel>Auscultation & Breath Sounds</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {(['normal', 'reduced-left', 'reduced-right', 'absent', 'added'] as const).map((st) => (
              <Tile
                key={st}
                selected={s.breathSounds === st}
                title={SURVEY_LABELS.breathSounds[st]}
                tone={st === 'normal' ? 'emerald' : 'red'}
                onClick={() => updatePrimarySurvey({ breathSounds: st })}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Chip
            selected={!!s.breathingFlags?.includes('tension-ptx')}
            tone="red"
            onClick={() => toggleBreathingFlag('tension-ptx')}
          >
            {s.breathingFlags?.includes('tension-ptx') ? '🚨 Tension Pneumothorax (Decompress!)' : 'No Tension Pneumothorax Signs'}
          </Chip>
          <Chip
            selected={!!s.breathingFlags?.includes('open-chest')}
            tone="red"
            onClick={() => toggleBreathingFlag('open-chest')}
          >
            {s.breathingFlags?.includes('open-chest') ? '⚠ Sucking Chest Wound (Chest Seal Applied)' : 'No Open Chest Wound'}
          </Chip>
          <Chip
            selected={!!s.breathingFlags?.includes('flail')}
            tone="red"
            onClick={() => toggleBreathingFlag('flail')}
          >
            {s.breathingFlags?.includes('flail') ? '⚠ Flail Chest Segment' : 'Chest Wall Stable'}
          </Chip>
        </div>
      </Panel>

      {/* C - Circulation */}
      <Panel className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <span className="w-7 h-7 rounded-xl bg-red-500 text-white font-mono font-black flex items-center justify-center text-xs">
            C
          </span>
          <h3 className="font-black text-base">Circulation & Haemorrhage</h3>
        </div>
        <div>
          <FieldLabel>Radial / Carotid Pulse</FieldLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(['present', 'weak', 'absent'] as const).map((st) => (
              <Tile
                key={st}
                selected={s.pulse === st}
                title={SURVEY_LABELS.pulse[st]}
                tone={st === 'present' ? 'emerald' : st === 'weak' ? 'amber' : 'red'}
                onClick={() => updatePrimarySurvey({ pulse: st })}
              />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Haemorrhage Control Status</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['none', 'controlled', 'uncontrolled', 'internal'] as const).map((h) => (
              <Tile
                key={h}
                selected={s.haemorrhage === h}
                title={SURVEY_LABELS.haemorrhage[h]}
                tone={h === 'none' ? 'emerald' : h === 'controlled' ? 'amber' : 'red'}
                onClick={() => updatePrimarySurvey({ haemorrhage: h })}
              />
            ))}
          </div>
        </div>
      </Panel>

      {/* D - Disability */}
      <Panel className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-mono font-black flex items-center justify-center text-xs">
            D
          </span>
          <h3 className="font-black text-base">Disability (Neurological)</h3>
        </div>

        {/* AVPU */}
        <div>
          <FieldLabel>AVPU Rapid Consciousness Scale</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['A', 'V', 'P', 'U'] as const).map((avpuKey) => (
              <Tile
                key={avpuKey}
                selected={s.avpu === avpuKey}
                title={`${avpuKey} - ${SURVEY_LABELS.avpu[avpuKey]}`}
                tone={avpuKey === 'A' ? 'emerald' : avpuKey === 'V' ? 'amber' : 'red'}
                onClick={() => updatePrimarySurvey({ avpu: avpuKey })}
              />
            ))}
          </div>
        </div>

        {/* Pupils */}
        <div>
          <FieldLabel>Pupillary Reflex</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['equal-reactive', 'unequal', 'fixed-dilated', 'not-assessed'] as const).map((pupilKey) => (
              <Tile
                key={pupilKey}
                selected={s.pupils === pupilKey}
                title={SURVEY_LABELS.pupils[pupilKey]}
                tone={pupilKey === 'equal-reactive' ? 'emerald' : pupilKey === 'not-assessed' ? 'sky' : 'red'}
                onClick={() => updatePrimarySurvey({ pupils: pupilKey })}
              />
            ))}
          </div>
        </div>
      </Panel>

      {/* E - Exposure */}
      <Panel className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <span className="w-7 h-7 rounded-xl bg-purple-500 text-white font-mono font-black flex items-center justify-center text-xs">
            E
          </span>
          <h3 className="font-black text-base">Exposure & Environment</h3>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Chip
            selected={!!s.exposureFindings?.includes('hypothermia')}
            tone="red"
            onClick={() => toggleExposureFinding('hypothermia')}
          >
            {s.exposureFindings?.includes('hypothermia') ? '⚠ Hypothermic Patient (< 35°C, Active Warming)' : 'Normothermic / Warm'}
          </Chip>
          <Chip
            selected={!!s.exposureFindings?.includes('burns')}
            tone="amber"
            onClick={() => toggleExposureFinding('burns')}
          >
            {s.exposureFindings?.includes('burns') ? 'Thermal / Chemical Burn Area' : 'No Significant Burns'}
          </Chip>
          <Chip
            selected={!!s.exposureFindings?.includes('deformity')}
            tone="amber"
            onClick={() => toggleExposureFinding('deformity')}
          >
            {s.exposureFindings?.includes('deformity') ? 'Gross Skeletal Deformity' : 'No Gross Deformity'}
          </Chip>
        </div>
      </Panel>
    </div>
  )
}

// ─── STEP 4: INJURIES ─────────────────────────────────────────────────────────

function StepInjuries({ nightMode }: { nightMode: boolean }) {
  const { activeRun, addInjury, removeInjury } = useRunStore()
  if (!activeRun) return null

  return (
    <div className="space-y-6">
      <StepHeader
        index={4}
        label="ANATOMICAL TRAUMA EXAM"
        title="Document Injuries & Findings"
        subtitle="Tap zones on the anatomical figure. Use ⚡ Quick Mark for 1-tap rapid documentation while moving."
      />

      <InjuryMap
        injuries={activeRun.injuries}
        onAdd={addInjury}
        onRemove={removeInjury}
        nightMode={nightMode}
      />
    </div>
  )
}

// ─── STEP 5: VITALS & SCORES ──────────────────────────────────────────────────

function StepVitals({ onAdvance }: { onAdvance?: () => void }) {
  const { activeRun, addVitalObservation } = useRunStore()
  if (!activeRun) return null

  const latest = useMemo(() => latestVitals(activeRun.vitalObservations), [activeRun.vitalObservations])

  // Working vital draft in state
  const [hr, setHr] = useState(latest.hr ?? 118)
  const [sbp, setSbp] = useState(latest.sbp ?? 88)
  const [dbp, setDbp] = useState(latest.dbp ?? 54)
  const [rr, setRr] = useState(latest.rr ?? 26)
  const [spo2, setSpo2] = useState(latest.spo2 ?? 92)
  const [temp, setTemp] = useState(latest.temp ?? 36.1)

  // GCS
  const [gcsEye, setGcsEye] = useState(4)
  const [gcsVerbal, setGcsVerbal] = useState(4)
  const [gcsMotor, setGcsMotor] = useState(6)
  const gcsTotal = gcsEye + gcsVerbal + gcsMotor

  const commitVitals = useCallback(() => {
    addVitalObservation({
      id: Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      source: 'manual',
      assessedBy: activeRun.crewLead ?? 'Paramedic',
      hr: { value: hr, unit: 'bpm' },
      sbp: { value: sbp, unit: 'mmHg' },
      dbp: { value: dbp, unit: 'mmHg' },
      rr: { value: rr, unit: 'brpm' },
      spo2: { value: spo2, unit: '%' },
      temp: { value: temp, unit: '°C' },
      gcs: {
        total: gcsTotal,
        components: {
          eye: gcsEye as 1 | 2 | 3 | 4,
          verbal: gcsVerbal as 1 | 2 | 3 | 4 | 5,
          motor: gcsMotor as 1 | 2 | 3 | 4 | 5 | 6,
        },
      },
    })
  }, [addVitalObservation, activeRun.crewLead, hr, sbp, dbp, rr, spo2, temp, gcsTotal, gcsEye, gcsVerbal, gcsMotor])

  // Register voice target
  useVoiceTarget({
    label: 'Vitals & GCS',
    hint: 'e.g. Heart rate 110, BP 90 over 60, sats 94, GCS 14',
    sample: 'Heart rate 115, BP 92 over 58, sats 93, GCS 14',
    apply: (t) => {
      const v = parseVitals(t)
      if (v.hr) setHr(v.hr)
      if (v.sbp) setSbp(v.sbp)
      if (v.dbp) setDbp(v.dbp)
      if (v.rr) setRr(v.rr)
      if (v.spo2) setSpo2(v.spo2)
      if (v.temp) setTemp(v.temp)
      if (v.gcs) {
        const { eye, verbal, motor } = gcsFromTotal(v.gcs)
        setGcsEye(eye)
        setGcsVerbal(verbal)
        setGcsMotor(motor)
      }
      return 'Updated vitals draft'
    },
  })

  return (
    <div className="space-y-6">
      <StepHeader
        index={5}
        label="PHYSIOLOGICAL SCORES & VITALS"
        title="Vitals & Resuscitation Scores"
        subtitle="High-contrast tactile inputs. Live Shock Index and Triage-RTS compute automatically."
      />

      {/* Live Computed Score Cards */}
      <ScoreCards run={activeRun} />

      {/* Vitals Grid with 56px Steppers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Heart Rate */}
        <Panel
          className={cn(
            'transition-colors',
            vitalTone('hr', hr) === 'red' ? 'border-red-500/60' : vitalTone('hr', hr) === 'amber' ? 'border-amber-500/60' : ''
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Heart Rate (BPM)</FieldLabel>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase',
              vitalTone('hr', hr) === 'red' ? 'bg-red-500/20 text-red-500' : vitalTone('hr', hr) === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
            )}>
              {hr > 100 ? 'Tachycardia' : hr < 60 ? 'Bradycardia' : 'Normal'}
            </span>
          </div>
          <NumberStepper
            value={hr}
            onChange={setHr}
            step={1}
            bigStep={10}
            min={20}
            max={240}
            unit="bpm"
          />
        </Panel>

        {/* Systolic Blood Pressure */}
        <Panel
          className={cn(
            'transition-colors',
            vitalTone('sbp', sbp) === 'red' ? 'border-red-500/60' : vitalTone('sbp', sbp) === 'amber' ? 'border-amber-500/60' : ''
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Systolic BP (mmHg)</FieldLabel>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase',
              vitalTone('sbp', sbp) === 'red' ? 'bg-red-500/20 text-red-500' : vitalTone('sbp', sbp) === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
            )}>
              {sbp < 90 ? 'Hypotension (Shock)' : sbp > 160 ? 'Hypertensive' : 'Normotensive'}
            </span>
          </div>
          <NumberStepper
            value={sbp}
            onChange={setSbp}
            step={2}
            bigStep={10}
            min={40}
            max={260}
            unit="mmHg"
          />
        </Panel>

        {/* Respiratory Rate */}
        <Panel
          className={cn(
            'transition-colors',
            vitalTone('rr', rr) === 'red' ? 'border-red-500/60' : vitalTone('rr', rr) === 'amber' ? 'border-amber-500/60' : ''
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Respiratory Rate (/min)</FieldLabel>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase',
              vitalTone('rr', rr) === 'red' ? 'bg-red-500/20 text-red-500' : vitalTone('rr', rr) === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
            )}>
              {rr > 24 ? 'Tachypnoea' : rr < 10 ? 'Bradypnoea' : 'Normal'}
            </span>
          </div>
          <NumberStepper
            value={rr}
            onChange={setRr}
            step={1}
            bigStep={5}
            min={0}
            max={60}
            unit="/min"
          />
        </Panel>

        {/* Oxygen Saturation SpO2 */}
        <Panel
          className={cn(
            'transition-colors',
            vitalTone('spo2', spo2) === 'red' ? 'border-red-500/60' : vitalTone('spo2', spo2) === 'amber' ? 'border-amber-500/60' : ''
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Oxygen Saturation SpO2 (%)</FieldLabel>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase',
              vitalTone('spo2', spo2) === 'red' ? 'bg-red-500/20 text-red-500' : vitalTone('spo2', spo2) === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
            )}>
              {spo2 < 90 ? 'Critical Hypoxia' : spo2 < 94 ? 'Moderate Hypoxia' : 'Adequate'}
            </span>
          </div>
          <NumberStepper
            value={spo2}
            onChange={setSpo2}
            step={1}
            bigStep={5}
            min={40}
            max={100}
            unit="%"
          />
        </Panel>

        {/* Temperature */}
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Core Temperature (°C)</FieldLabel>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase',
              vitalTone('temp', temp) === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'
            )}>
              {temp < 35.0 ? 'Hypothermia' : 'Normothermia'}
            </span>
          </div>
          <NumberStepper
            value={temp}
            onChange={setTemp}
            step={0.1}
            bigStep={0.5}
            min={30.0}
            max={42.0}
            unit="°C"
          />
        </Panel>
      </div>

      {/* Glasgow Coma Scale (GCS) Breakdown */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
          <div>
            <span className="font-mono text-xs font-bold text-sky-500 uppercase tracking-wider block">
              Neurological Assessment
            </span>
            <h3 className="text-base font-black">
              Glasgow Coma Scale (Total: {gcsTotal}/15)
            </h3>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-full font-mono text-xs font-black uppercase border',
            vitalTone('gcs', gcsTotal) === 'red'
              ? 'bg-red-500/20 text-red-500 border-red-500/30'
              : vitalTone('gcs', gcsTotal) === 'amber'
              ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
          )}>
            {gcsTotal <= 8 ? 'Severe Coma (GCS ≤ 8)' : gcsTotal <= 12 ? 'Moderate TBI' : 'Mild / Alert'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Eyes */}
          <div>
            <FieldLabel>Eye Opening (1-4)</FieldLabel>
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              {[1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsEye(v)}
                  className={cn(
                    'py-3 rounded-xl font-bold border transition-colors min-h-[48px]',
                    gcsEye === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Verbal */}
          <div>
            <FieldLabel>Verbal Response (1-5)</FieldLabel>
            <div className="grid grid-cols-5 gap-1.5 font-mono">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsVerbal(v)}
                  className={cn(
                    'py-3 rounded-xl font-bold border transition-colors min-h-[48px]',
                    gcsVerbal === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Motor */}
          <div>
            <FieldLabel>Motor Response (1-6)</FieldLabel>
            <div className="grid grid-cols-6 gap-1.5 font-mono">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsMotor(v)}
                  className={cn(
                    'py-3 rounded-xl font-bold border transition-colors min-h-[48px]',
                    gcsMotor === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-commit button */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={commitVitals}
            className="rounded-2xl font-bold min-h-[48px]"
          >
            ✓ Log Current Reading Set
          </Button>
        </div>
      </Panel>
    </div>
  )
}

// ─── STEP 6: TREATMENTS & INTERVENTIONS ───────────────────────────────────────

interface InterventionItem {
  key: string
  cat: TreatmentCategory
  label: string
  detail: string
  icon: LucideIcon
}

const INTERVENTIONS_CATEGORIES: {
  id: string
  title: string
  items: InterventionItem[]
}[] = [
  {
    id: 'airway',
    title: 'Airway & Breathing',
    items: [
      { key: 'o2', cat: 'oxygen', label: 'High-Flow Oxygen (15L)', detail: '15 L/min via Non-Rebreather Mask', icon: Wind },
      { key: 'bvm', cat: 'airway', label: 'Bag-Valve-Mask (BVM)', detail: 'BVM with PEEP valve assistance', icon: Wind },
      { key: 'sga', cat: 'airway', label: 'Supraglottic Airway (i-gel)', detail: 'Size 4 i-gel inserted & confirmed', icon: Stethoscope },
      { key: 'ett', cat: 'airway', label: 'Endotracheal Tube (ETT)', detail: '7.5mm cuffed ETT placed & verified', icon: Stethoscope },
      { key: 'decompression', cat: 'airway', label: 'Needle Decompression', detail: '14G cannula 2nd ICS MCL or 5th ICS AAL', icon: Activity },
      { key: 'chest-seal', cat: 'airway', label: 'Vented Chest Seal', detail: 'Vented flutter valve chest seal applied', icon: Shield },
    ],
  },
  {
    id: 'circulation',
    title: 'Circulation & Haemorrhage',
    items: [
      { key: 'tourniquet', cat: 'haemorrhage-control', label: 'Combat Tourniquet (CAT)', detail: 'CAT applied tightly above wound, time noted', icon: AlertTriangle },
      { key: 'pelvic-binder', cat: 'haemorrhage-control', label: 'Pelvic Binder (SAM)', detail: 'SAM Pelvic Sling II placed at greater trochanters', icon: ShieldCheck },
      { key: 'wound-packing', cat: 'haemorrhage-control', label: 'Wound Packing & Dressing', detail: 'Hemostatic gauze packed and direct pressure', icon: Package },
      { key: 'iv-access', cat: 'iv-access', label: 'Large Bore IV Access', detail: '16G / 18G cannula antecubital fossa', icon: Activity },
      { key: 'io-access', cat: 'iv-access', label: 'Intraosseous (IO) Access', detail: 'Proximal tibia or humeral head IO placed', icon: Activity },
      { key: 'fluids', cat: 'fluids', label: 'IV Fluids (Permissive)', detail: '500 mL Hartmann\'s / Normal Saline running', icon: Droplets },
    ],
  },
  {
    id: 'immobilisation',
    title: 'Spinal & Fracture Immobilisation',
    items: [
      { key: 'c-collar', cat: 'packaging', label: 'Cervical Collar', detail: 'Rigid cervical collar & blocks applied', icon: Shield },
      { key: 'scoop', cat: 'packaging', label: 'Full Spinal Packaging', detail: 'Vacuum mattress or scoop stretcher immobilisation', icon: ShieldCheck },
      { key: 'traction', cat: 'splinting', label: 'Traction Splint', detail: 'Femur fracture traction splint applied', icon: Package },
      { key: 'splint', cat: 'splinting', label: 'Extremity Splint', detail: 'Vacuum / box splint applied to limb', icon: Package },
    ],
  },
  {
    id: 'medications',
    title: 'Emergency Medications',
    items: [
      { key: 'txa', cat: 'analgesia', label: 'Tranexamic Acid (TXA)', detail: '1g IV in 100mL NS over 10 min (<3hr window)', icon: Pill },
      { key: 'fentanyl', cat: 'analgesia', label: 'Analgesia (Fentanyl/Morphine)', detail: 'Fentanyl 50-100mcg IN/IV titrated for pain', icon: Heart },
      { key: 'ketamine', cat: 'analgesia', label: 'Ketamine (Analgesic / Dissociative)', detail: 'Ketamine 0.2-0.5mg/kg IV for severe trauma', icon: Pill },
      { key: 'ondansetron', cat: 'analgesia', label: 'Ondansetron (Antiemetic)', detail: 'Ondansetron 4mg IV slow push', icon: Pill },
    ],
  },
]

function StepTreatments() {
  const { activeRun, addTreatment, removeTreatment } = useRunStore()
  if (!activeRun) return null

  useVoiceTarget({
    label: 'Treatments & Drugs',
    hint: 'e.g. High flow oxygen, 1 gram TXA IV, morphine 5mg',
    sample: 'High flow oxygen, 1g TXA IV, pelvic binder applied',
    apply: (t) => {
      const drugs = parseDrugs(t)
      for (const d of drugs) {
        addTreatment({
          id: Math.random().toString(36).slice(2, 8),
          category: 'analgesia',
          description: d.drug,
          detail: `${d.dose ?? ''}${d.unit ?? ''} ${d.route ?? ''}`.trim(),
          timestamp: new Date().toISOString(),
          performedBy: activeRun.crewLead ?? 'Paramedic',
        })
      }
      return 'Logged treatments'
    },
  })

  const isApplied = (label: string) =>
    activeRun.treatments.some((t) => t.description === label)

  const toggleIntervention = (item: InterventionItem) => {
    const existing = activeRun.treatments.find((t) => t.description === item.label)
    if (existing) {
      removeTreatment(existing.id)
    } else {
      addTreatment({
        id: Math.random().toString(36).slice(2, 8),
        category: item.cat,
        description: item.label,
        detail: item.detail,
        timestamp: new Date().toISOString(),
        performedBy: activeRun.crewLead ?? 'Paramedic (Crew)',
      })
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        index={6}
        label="PRE-HOSPITAL RESUSCITATION"
        title="Administered Interventions"
        subtitle="Select interventions administered at scene or en route. Automatic pre-notification to trauma team."
      />

      {INTERVENTIONS_CATEGORIES.map((cat) => (
        <div key={cat.id} className="space-y-3">
          <h3 className="font-bold text-sm tracking-wide uppercase font-mono opacity-80">
            {cat.title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.items.map((item) => {
              const applied = isApplied(item.label)

              return (
                <Tile
                  key={item.key}
                  selected={applied}
                  title={item.label}
                  desc={item.detail}
                  icon={item.icon}
                  tone={applied ? 'emerald' : 'sky'}
                  onClick={() => toggleIntervention(item)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── STEP 7: MIST & PRE-ALERT TRANSMISSION ───────────────────────────────────

function StepReview({ nightMode }: { nightMode: boolean }) {
  const {
    activeRun,
    generateMIST,
    updateMIST,
    transmitPreAlert,
    setBloodBankRequired,
    createBloodRequest
  } = useRunStore()
  if (!activeRun) return null

  // Ensure MIST is generated
  useEffect(() => {
    if (!activeRun.mist) {
      generateMIST()
    }
  }, [activeRun.mist, generateMIST])

  const mist = activeRun.mist
  const isSent = activeRun.alertStatus === 'sent' || activeRun.alertStatus === 'acknowledged'
  const hospital = AVAILABLE_HOSPITALS.find((h) => h.id === activeRun.destinationHospitalId)

  const handleTransmit = () => {
    transmitPreAlert()
  }

  const handleSendBlood = () => {
    createBloodRequest({
      bloodGroup: 'Unknown',
      productType: 'o-negative',
      unitsRequested: 4,
      clinicalJustification: 'Unstable trauma patient with suspected hemorrhage & high Shock Index',
      recipient: hospital?.name ?? 'MTC Blood Bank',
    })
  }

  return (
    <div className="space-y-6">
      <StepHeader
        index={7}
        label="CLINICAL TRANSMISSION"
        title="Review MIST & Transmit Pre-Alert"
        subtitle="Verify standardized MIST handover summary and initiate high-priority pre-alert to the trauma team."
      />

      {/* Hospital Destination Banner */}
      <Panel className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase text-slate-400 block">
            Receiving Major Trauma Centre
          </span>
          <h3 className="text-xl font-black mt-0.5">
            {hospital?.name}
          </h3>
          <p className="text-xs text-slate-400">{hospital?.address} · {hospital?.type}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Arrival</span>
            <span className="text-2xl font-black text-sky-500">{activeRun.eta ?? 4} min</span>
          </div>
          <span className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Resus Bay</span>
            <span className="text-2xl font-black text-red-500">Bay 2 Standby</span>
          </div>
        </div>
      </Panel>

      {/* MIST Handover Box */}
      <Panel className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            <h3 className="font-black text-base">Standardized MIST Handover</h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={generateMIST}
            className="rounded-xl font-bold min-h-[40px]"
          >
            Regenerate Summary
          </Button>
        </div>

        {/* M */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white font-mono font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            M
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-sky-500 uppercase tracking-wider block mb-1">
              Mechanism & Time
            </span>
            <textarea
              rows={2}
              value={mist?.mechanism ?? 'Unknown'}
              onChange={(e) => updateMIST({ mechanism: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                nightMode ? 'bg-[#152742] border-[#223F68] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
              )}
            />
          </div>
        </div>

        {/* I */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-red-500 text-white font-mono font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            I
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">
              Injuries Found or Suspected
            </span>
            <textarea
              rows={3}
              value={mist?.injuries ?? 'Not assessed'}
              onChange={(e) => updateMIST({ injuries: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono',
                nightMode ? 'bg-[#152742] border-[#223F68] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
              )}
            />
          </div>
        </div>

        {/* S */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-mono font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            S
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-amber-500 uppercase tracking-wider block mb-1">
              Signs & Scores (Shock Index & RTS)
            </span>
            <textarea
              rows={2}
              value={mist?.signs ?? 'Not available'}
              onChange={(e) => updateMIST({ signs: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono',
                nightMode ? 'bg-[#152742] border-[#223F68] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
              )}
            />
          </div>
        </div>

        {/* T */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white font-mono font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            T
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1">
              Treatment Given
            </span>
            <textarea
              rows={2}
              value={mist?.treatment ?? 'None confirmed'}
              onChange={(e) => updateMIST({ treatment: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                nightMode ? 'bg-[#152742] border-[#223F68] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
              )}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Crew Lead: <strong className="text-sky-500">{activeRun.crewLead}</strong></span>
          <span>Diff Tracking: <strong className="text-emerald-500">{activeRun.mist?.isEdited ? 'Edited' : 'Auto-Generated'}</strong></span>
        </div>
      </Panel>

      {/* Blood Products Pre-Order Requisition */}
      <Panel className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-sm block">
              Emergency Blood Bank Requisition?
            </span>
            <span className="text-xs text-slate-400">
              Pre-alerts receiving hospital blood bank for emergency O-Negative PRBCs & FFP.
            </span>
          </div>

          <div className="flex gap-2">
            {(['yes', 'no'] as const).map((opt) => (
              <Chip
                key={opt}
                selected={activeRun.bloodBankRequired === opt}
                tone={opt === 'yes' ? 'red' : 'sky'}
                onClick={() => setBloodBankRequired(opt)}
              >
                {opt.toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>

        {activeRun.bloodBankRequired === 'yes' && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-500">Trauma Pack 1 (O-Neg PRBCs + Plasma)</span>
              <span className="font-mono text-[10px] text-red-400">Rapid Requisition</span>
            </div>
            {!activeRun.bloodBankRequest ? (
              <Button
                size="sm"
                variant="danger"
                onClick={handleSendBlood}
                className="rounded-xl font-bold min-h-[44px]"
              >
                Transmit Blood Request (4 Units O-Neg)
              </Button>
            ) : (
              <span className="inline-block text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                ✓ Blood Bank Request Transmitted
              </span>
            )}
          </div>
        )}
      </Panel>

      {/* Dominant Transmission Action Button */}
      <Panel className="text-center p-8 space-y-4">
        {isSent ? (
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-sm border border-emerald-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-emerald-500">
              PRE-ALERT TRANSMITTED TO {hospital?.shortName ?? 'MTC'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Received and acknowledged by trauma team. Trauma Bay 2 is on active standby with emergency team mobilized.
            </p>
            <div className="pt-2">
              <Link
                href="/hospital"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold border transition-colors min-h-[48px]',
                  nightMode
                    ? 'bg-[#152742] text-sky-400 border-[#223F68] hover:bg-[#1C3559]'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 shadow-xs'
                )}
              >
                <span>View Hospital Live Bay Console</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleTransmit}
              className="w-full max-w-md mx-auto bg-gradient-to-r from-red-600 via-rose-600 to-sky-600 hover:from-red-500 hover:to-sky-500 text-white font-black py-4 px-6 text-base sm:text-lg rounded-2xl shadow-xl shadow-red-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer border border-red-400/40 min-h-[58px]"
            >
              <Siren className="w-6 h-6 text-white animate-pulse" />
              <span>TRANSMIT EMERGENCY PRE-ALERT</span>
            </button>
            <p className="text-[11px] text-slate-400 font-mono">
              Direct telemetry handshake via BroadcastChannel to receiving trauma team
            </p>
          </div>
        )}
      </Panel>
    </div>
  )
}
