'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity, Radio, MapPin, Clock, User, Send, Check, AlertTriangle,
  Sun, Moon, Wifi, ChevronRight, ChevronLeft, Play, RefreshCw,
  Heart, Thermometer, Wind, Eye, Droplets, FileText, Plus, X, Trash2,
  Package, Shield, ShieldCheck, CheckCircle2, Stethoscope, Camera, Upload, ArrowLeft,
  HelpCircle, Sparkles, Mic, Phone, Building2, Flame, ShieldAlert,
  Car, UserX, AlertCircle, FileSearch, ArrowRight
} from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { InjuryMap } from '@/components/ambulance/InjuryMap'
import { VoiceInput } from '@/components/ambulance/VoiceInput'
import {
  Button, Input, Textarea, Card, Badge,
  WizardProgress, DemoBanner, StatusChip, VitalInput, SeveritySelector
} from '@/components/ui'
import type {
  WizardStep, VitalObservation, TreatmentEntry, TreatmentCategory,
  EmergencyRun, InjuryRecord, IdentityDocument
} from '@/types/run'
import { AVAILABLE_HOSPITALS, DEMO_RUN } from '@/data/demoRun'

// ─── Step Ordering ────────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  'patient',
  'incident',
  'injuries',
  'vitals',
  'treatments',
  'mist',
  'review',
]

const STEP_LABELS: Record<string, string> = {
  patient: 'Patient',
  incident: 'Incident',
  injuries: 'Injuries',
  vitals: 'Vitals',
  treatments: 'Treatment',
  mist: 'Handover',
  review: 'Review & Send',
  handover: 'Review & Send',
}

function stepIndex(s: WizardStep | string) {
  if (s === 'handover') return STEPS.indexOf('review')
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
    initRunSync()
  }, [])

  // Explicit session state to guarantee:
  // "When Start New Emergency Run is selected: ALWAYS start at STEP 1 - PATIENT. Never reopen the last selected step unless Resume Draft was deliberately selected."
  const [sessionActive, setSessionActive] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  // Current step normalization
  const currentStep = (activeRun?.currentStep === 'handover' ? 'review' : activeRun?.currentStep) ?? 'patient'
  const completed = activeRun ? getCompletedSteps(currentStep) : []

  const handleStartNewRun = () => {
    startNewRun('Alpha 7', 'Para. J. Chen', 'hosp-001')
    setStep('patient')
    setSessionActive(true)
  }

  const handleLoadDemo = () => {
    // Explicitly start at Step 1: Patient as required
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

  // Next step label for bottom button
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
        'min-h-screen flex flex-col font-sans transition-colors duration-200 select-none pb-28',
        nightMode ? 'bg-[#0A1120] text-slate-100' : 'bg-[#F4F7FB] text-slate-900'
      )}
    >
      {/* ── Demo Notice Bar ──────────────────────────────────────────────── */}
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

      {/* ── Patient Context Strip (Once identified) ──────────────────────── */}
      <PatientContextBar run={activeRun} nightMode={nightMode} />

      {/* ── Main Guided Content Workspace (One task at a time) ──────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction === 'forward' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 'forward' ? -24 : 24 }}
            transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
            className="w-full"
          >
            {currentStep === 'patient' && <StepPatient nightMode={nightMode} />}
            {currentStep === 'incident' && <StepIncident nightMode={nightMode} />}
            {currentStep === 'injuries' && <StepInjuries nightMode={nightMode} />}
            {currentStep === 'vitals' && <StepVitals nightMode={nightMode} />}
            {currentStep === 'treatments' && <StepTreatments nightMode={nightMode} />}
            {currentStep === 'mist' && <StepMIST nightMode={nightMode} />}
            {currentStep === 'review' && <StepReview nightMode={nightMode} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Fixed Bottom Action Bar (Vaidya Guided Kiosk Pattern) ─────────── */}
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
              'flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-150',
              stepIndex(currentStep) === 0
                ? 'opacity-30 cursor-not-allowed border-transparent text-slate-400'
                : nightMode
                ? 'border-[#1E3A5F] bg-[#162744] text-slate-200 hover:bg-[#1E3559]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            )}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back</span>
          </button>

          {/* Center: Step indicators / Current status */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="font-semibold text-slate-500">Step {stepIndex(currentStep) + 1} of {STEPS.length}</span>
            <span>·</span>
            <span className="text-sky-600 font-bold uppercase tracking-wider">{STEP_LABELS[currentStep]}</span>
          </div>

          {/* Primary Action Button */}
          {!isLastStep ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={advance}
              className="px-6 sm:px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 flex items-center gap-1.5"
            >
              <span>Next: {nextStepName}</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-600 font-bold hidden md:inline">
                {activeRun.alertStatus === 'sent' || activeRun.alertStatus === 'acknowledged'
                  ? '✓ Pre-Alert Transmitted'
                  : 'Review Complete'}
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

// ─── Start Portal (Guarantees Step 1 Start / Draft Resume) ─────────────────────

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
                TRAUMA<span className="text-sky-500">BRIDGE</span> AI
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20">
                Ambulance Terminal
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              Unit Alpha 7 · GPS Lock Active · Resuscitation Network Online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hospital"
            className={cn(
              'text-xs font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors border',
              nightMode
                ? 'bg-[#152742] text-sky-400 border-[#223F68] hover:bg-[#1C3559]'
                : 'bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100/80 shadow-xs'
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Hospital Receiving Console</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onNightToggle}
            className={cn(
              'p-2 rounded-xl border transition-colors',
              nightMode
                ? 'bg-[#152742] border-[#223F68] text-amber-400 hover:bg-[#1C3559]'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            )}
            title="Toggle Night Mode"
          >
            {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Full-Bleed Cockpit */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Mission & Operational Status (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Emergency Transport Protocol
              </span>

              <h1 className={cn('text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]', nightMode ? 'text-white' : 'text-slate-900')}>
                Guided Ambulance Intake
              </h1>

              <p className={cn('text-sm sm:text-base leading-relaxed', nightMode ? 'text-slate-400' : 'text-slate-600')}>
                Streamlined one-task-at-a-time clinical workflow designed for high-stress transit. Rapid patient indexing, 3D anatomical injury mapping, monitor telemetry sync, and instant MTC pre-alerts.
              </p>
            </div>

            {/* Operational Telemetry Cards */}
            <div
              className={cn(
                'p-5 rounded-3xl border space-y-3',
                nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90 shadow-sm'
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 uppercase font-bold tracking-wider">Active Telemetry Link</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>

              <div className="space-y-2 text-xs">
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

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-amber-500" /> Blood Bank Standby
                  </span>
                  <span className={cn('font-bold font-mono', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                    Trauma Pack 1 (O-Neg) Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact Action Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* PRIMARY DOMINANT ACTION: Start New Emergency Run */}
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
                  Initializes fresh transport dispatch. Guaranteed to start at <strong>Step 1: Patient Identity</strong> with a clean slate.
                </p>
              </div>

              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:translate-x-1.5 transition-transform backdrop-blur-xs">
                <ArrowRight className="w-7 h-7 text-white stroke-[2.5]" />
              </div>

              {/* Subtle ambient highlight */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16 pointer-events-none" />
            </button>

            {/* SECONDARY ACTION: Resume Draft (if an active run is in memory) */}
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
                  className="rounded-2xl font-bold text-xs px-5 py-2.5 flex-shrink-0"
                >
                  Resume Draft
                </Button>
              </div>
            )}

            {/* TERTIARY ACTION: Load Demonstration Case (M25 Multi-Vehicle RTC) */}
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
                className="rounded-xl font-bold text-xs flex-shrink-0"
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
            <span className="text-[11px] font-bold">Live Sync</span>
          </div>

          <button
            type="button"
            onClick={onNightToggle}
            className={cn(
              'p-1.5 rounded-xl border transition-colors',
              nightMode ? 'bg-[#152742] border-[#223F68] text-amber-400 hover:bg-[#1C3559]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            )}
            title="Toggle Night Mode"
          >
            {nightMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
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

// ─── STEP 1: PATIENT ("Who are we transporting?") ─────────────────────────────

function StepPatient({ nightMode }: { nightMode: boolean }) {
  const { activeRun, updatePatient } = useRunStore()
  if (!activeRun) return null

  const p = activeRun.patient
  const identityStatus = p.identityStatus

  const [idName, setIdName] = useState(p.name ?? '')
  const [idAge, setIdAge] = useState(p.estimatedAge ? String(p.estimatedAge) : '')
  const [idSex, setIdSex] = useState<'male' | 'female' | 'unknown'>(p.sex ?? 'unknown')
  const [idAbha, setIdAbha] = useState(p.abhaId ?? '')
  const [showIdPhotoCapture, setShowIdPhotoCapture] = useState(false)
  const [capturedDoc, setCapturedDoc] = useState<IdentityDocument | null>(
    p.foundDocuments && p.foundDocuments.length > 0 ? p.foundDocuments[0] : null
  )

  const handleModeChange = (mode: EmergencyRun['patient']['identityStatus']) => {
    updatePatient({
      identityStatus: mode,
      name: mode === 'known' ? (idName || 'David Miller') : undefined,
      sex: idSex,
      estimatedAge: parseInt(idAge) || 38,
    })
  }

  const handleSimulateIdCapture = () => {
    const demoDoc: IdentityDocument = {
      id: Math.random().toString(36).slice(2, 8),
      type: 'national-id',
      title: 'Found Identification Card (Wallet)',
      photoUrl: '/images/hero-handover.jpg',
      extractedText: 'NAME: DAVID MILLER | DOB: 14/08/1986 | ID: 7492-3819-0211',
      confirmedByStaff: false,
      timestamp: new Date().toISOString(),
      source: 'Uploaded by crew',
    }
    setCapturedDoc(demoDoc)
    updatePatient({
      foundDocuments: [demoDoc],
    })
  }

  return (
    <div className="space-y-6">
      {/* Question Header (Vaidya Guided Principle) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP 01 OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">PATIENT IDENTITY</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
          Who are we transporting?
        </h2>
        <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
          Select patient identity status. Missing identity documents never block emergency transport.
        </p>
      </div>

      {/* 4 Large Tactile Primary Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { key: 'known', label: 'Known Patient', desc: 'Patient or bystander confirmed identity / ID card in hand', icon: User },
          { key: 'unknown', label: 'Unknown Patient', desc: 'Unidentified at scene, temporary tracker ID assigned', icon: UserX },
          { key: 'cannot-respond', label: 'Cannot Respond', desc: 'Unconscious, intubated, or severe head trauma', icon: ShieldAlert },
          { key: 'pending', label: 'Identity Pending', desc: 'Crew searching belongings / rapid scene transit', icon: Clock },
        ].map((item) => {
          const Icon = item.icon
          const isSelected = identityStatus === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleModeChange(item.key as any)}
              className={cn(
                'p-5 rounded-3xl border-2 text-left transition-all duration-150 flex flex-col justify-between min-h-[130px] group cursor-pointer',
                isSelected
                  ? nightMode
                    ? 'border-sky-400 bg-sky-950/40 shadow-md ring-2 ring-sky-500/30'
                    : 'border-sky-500 bg-sky-50/70 shadow-md ring-2 ring-sky-200/60'
                  : nightMode
                  ? 'border-[#1D3455] bg-[#0E1A2F] hover:border-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    'w-9 h-9 rounded-2xl flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-sky-500 text-white'
                      : nightMode
                      ? 'bg-[#152742] text-slate-400'
                      : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <span className={cn('font-black text-base block', nightMode ? 'text-white' : 'text-slate-900')}>
                  {item.label}
                </span>
                <span className="text-xs text-slate-400 block mt-1 leading-snug">
                  {item.desc}
                </span>
              </div>

              {isSelected && (
                <span className="text-[11px] font-bold text-sky-500 mt-2.5 flex items-center gap-1">
                  ✓ Active Selection
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Relevant Fields Revealed on Selection */}
      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border space-y-6 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className={cn('text-sm font-bold', nightMode ? 'text-white' : 'text-slate-900')}>
            Patient Information Details
          </h3>
          <span className="text-xs font-mono text-slate-400 capitalize">
            Mode: {identityStatus.replace('-', ' ')}
          </span>
        </div>

        {/* Known Patient Fields */}
        {identityStatus === 'known' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={cn('text-xs font-bold block mb-1', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. David Miller"
                value={idName}
                onChange={(e) => {
                  setIdName(e.target.value)
                  updatePatient({ name: e.target.value })
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                  nightMode
                    ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                )}
              />
            </div>

            <div>
              <label className={cn('text-xs font-bold block mb-1', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                Age
              </label>
              <input
                type="number"
                placeholder="e.g. 38"
                value={idAge}
                onChange={(e) => {
                  setIdAge(e.target.value)
                  updatePatient({ estimatedAge: parseInt(e.target.value) || undefined })
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                  nightMode
                    ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                )}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={cn('text-xs font-bold block mb-1', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                ABHA ID / National Health Identifier (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 12-3456-7890-1234"
                value={idAbha}
                onChange={(e) => {
                  setIdAbha(e.target.value)
                  updatePatient({ abhaId: e.target.value })
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono transition-colors',
                  nightMode
                    ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                )}
              />
            </div>
          </div>
        )}

        {/* Unknown / Cannot Respond / Pending Fields */}
        {identityStatus !== 'known' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={cn('text-xs font-bold block mb-1', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                Temporary Emergency Identifier
              </label>
              <div
                className={cn(
                  'px-4 py-3 rounded-2xl border font-mono text-sm font-bold flex items-center justify-between',
                  nightMode ? 'bg-[#152742] border-[#223F68] text-sky-400' : 'bg-slate-100 border-slate-200 text-slate-800'
                )}
              >
                <span>PT-TEMP-{activeRun.id.slice(0, 6).toUpperCase()}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-bold">
                  Barcode RFID Active
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Auto-assigned unique barcode/RFID tracker for trauma resuscitation tracking.
              </span>
            </div>

            <div>
              <label className={cn('text-xs font-bold block mb-1', nightMode ? 'text-slate-300' : 'text-slate-700')}>
                Estimated Age
              </label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={idAge}
                onChange={(e) => {
                  setIdAge(e.target.value)
                  updatePatient({ estimatedAge: parseInt(e.target.value) || undefined })
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                  nightMode
                    ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                )}
              />
            </div>
          </div>
        )}

        {/* Biological / Observed Sex */}
        <div>
          <label className={cn('text-xs font-bold block mb-2', nightMode ? 'text-slate-300' : 'text-slate-700')}>
            Biological / Observed Sex
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'male', label: 'Male' },
              { key: 'female', label: 'Female' },
              { key: 'unknown', label: 'Indeterminate / Unknown' },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setIdSex(s.key as any)
                  updatePatient({ sex: s.key as any })
                }}
                className={cn(
                  'px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer',
                  idSex === s.key
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : nightMode
                    ? 'bg-[#152742] text-slate-300 border-[#223F68] hover:bg-[#1C3559]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ID Document / Image Capture Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className={cn('font-bold text-sm block', nightMode ? 'text-white' : 'text-slate-900')}>
                Found an ID or health card on person?
              </span>
              <p className="text-xs text-slate-400">
                Capture photograph of driving licence, hospital slip, or prescription found on person.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Camera className="w-3.5 h-3.5 text-sky-500" />}
                onClick={handleSimulateIdCapture}
                className="rounded-xl font-bold"
              >
                Capture Photo
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5 text-slate-400" />}
                onClick={handleSimulateIdCapture}
                className="rounded-xl font-bold"
              >
                Upload File
              </Button>
            </div>
          </div>

          {capturedDoc && (
            <div className={cn(
              'p-4 rounded-2xl border space-y-3 mt-3',
              nightMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
            )}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                  <Image src={capturedDoc.photoUrl} alt="ID Document" fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-bold text-xs', nightMode ? 'text-white' : 'text-slate-900')}>
                      {capturedDoc.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                      Needs confirmation
                    </span>
                  </div>
                  <p className={cn(
                    'font-mono text-[11px] mt-1 p-2 rounded-lg border',
                    nightMode
                      ? 'bg-[#152742] border-[#223F68] text-slate-300'
                      : 'bg-white/80 border-amber-200/60 text-slate-700'
                  )}>
                    OCR Extracted: {capturedDoc.extractedText}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-1 italic">
                    ⚠ Staff verification required. Extracted name is not yet linked as confirmed legal identity.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedDoc(null)
                    updatePatient({ foundDocuments: [] })
                  }}
                  className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                  title="Remove document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 2: INCIDENT ("What happened?") ──────────────────────────────────────

function StepIncident({ nightMode }: { nightMode: boolean }) {
  const { activeRun, updateIncident } = useRunStore()
  if (!activeRun) return null

  const inc = activeRun.incident

  const MECHANISMS = [
    { code: 'rtc', label: 'Road Traffic Collision', desc: 'Driver, passenger, or pedestrian impact', icon: Car },
    { code: 'fall', label: 'Fall from Height', desc: 'Fall from height or standing level ground', icon: AlertTriangle },
    { code: 'assault', label: 'Assault / Violence', desc: 'Blunt weapon, physical violence, or assault', icon: ShieldAlert },
    { code: 'burn', label: 'Thermal / Scald Burn', desc: 'Thermal flame, scald, or chemical contact', icon: Flame },
    { code: 'crush', label: 'Crush Injury', desc: 'Heavy structural or vehicle entrapment', icon: Package },
    { code: 'penetrating', label: 'Penetrating Wound', desc: 'Stab wound, ballistic, or impalement', icon: AlertCircle },
    { code: 'industrial', label: 'Workplace / Industrial', desc: 'Machinery entanglement, factory incident', icon: Building2 },
    { code: 'other', label: 'Other Mechanism', desc: 'Unspecified traumatic mechanism', icon: Activity },
    { code: 'unknown', label: 'Unknown / Undetermined', desc: 'Unwitnessed scene, mechanism undetermined', icon: HelpCircle },
  ]

  const TIME_OPTIONS = [
    'Just now',
    '<30 min',
    '30–60 min',
    '1–3 hours',
    'Unknown',
  ]

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP 02 OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">INCIDENT & MECHANISM</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
          What happened at the scene?
        </h2>
        <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
          Select the primary trauma mechanism and scene timeline.
        </p>
      </div>

      {/* Large Touch-Friendly Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {MECHANISMS.map((m) => {
          const Icon = m.icon
          const isSelected = inc.mechanismCode === m.code || inc.mechanism === m.label
          return (
            <button
              key={m.code}
              type="button"
              onClick={() => updateIncident({ mechanism: m.label, mechanismCode: m.code })}
              className={cn(
                'p-5 rounded-3xl border-2 text-left transition-all duration-150 flex flex-col justify-between min-h-[105px] group cursor-pointer',
                isSelected
                  ? nightMode
                    ? 'border-sky-400 bg-sky-950/40 shadow-md ring-2 ring-sky-500/30'
                    : 'border-sky-500 bg-sky-50/70 shadow-md ring-2 ring-sky-200/60'
                  : nightMode
                  ? 'border-[#1D3455] bg-[#0E1A2F] hover:border-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-sky-500 text-white'
                      : nightMode
                      ? 'bg-[#152742] text-slate-400'
                      : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <span className={cn('font-black text-sm sm:text-base block', nightMode ? 'text-white' : 'text-slate-900')}>
                  {m.label}
                </span>
                <span className="text-xs text-slate-400 block mt-1 leading-snug">
                  {m.desc}
                </span>
              </div>

              {isSelected && (
                <span className="text-[11px] font-bold text-sky-500 mt-2 flex items-center gap-1">
                  ✓ Selected Mechanism
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Essential Timing & Context Questions */}
      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border space-y-5 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <div>
          <label className={cn('text-xs font-bold block mb-2', nightMode ? 'text-slate-300' : 'text-slate-800')}>
            When did the incident happen?
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateIncident({ time: t })}
                className={cn(
                  'px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer',
                  inc.time === t
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : nightMode
                    ? 'bg-[#152742] text-slate-300 border-[#223F68] hover:bg-[#1C3559]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Incident Detail */}
        <div>
          <label className={cn('text-xs font-bold block mb-1.5', nightMode ? 'text-slate-300' : 'text-slate-800')}>
            Critical Scene Dynamics & Extrication Details (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. High-speed frontal impact. Airbag deployed, driver unrestrained, prolonged 25-minute extrication."
            value={inc.detail ?? ''}
            onChange={(e) => updateIncident({ detail: e.target.value })}
            className={cn(
              'w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
              nightMode
                ? 'bg-[#152742] border-[#223F68] text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
            )}
          />
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3: INJURIES ("Interactive Human Body Map") ─────────────────────────

function StepInjuries({ nightMode }: { nightMode: boolean }) {
  const { activeRun, addInjury, removeInjury } = useRunStore()
  if (!activeRun) return null

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP 03 OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">ANATOMICAL MAPPING</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
          Where are the injuries?
        </h2>
        <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
          Rotate views (Anterior / Posterior / Lateral) and tap anatomical regions to record findings and attach evidence.
        </p>
      </div>

      <div
        className={cn(
          'p-4 sm:p-6 rounded-3xl border shadow-sm transition-colors',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <InjuryMap
          injuries={activeRun.injuries}
          onAdd={addInjury}
          onRemove={removeInjury}
          nightMode={nightMode}
        />
      </div>
    </div>
  )
}

// ─── STEP 4: VITALS ("How is the patient right now?") ────────────────────────

function StepVitals({ nightMode }: { nightMode: boolean }) {
  const { activeRun, addVitalObservation } = useRunStore()
  if (!activeRun) return null

  const obs = activeRun.vitalObservations
  const latest = obs[obs.length - 1]

  const [hr, setHr] = useState(latest?.hr?.value ? String(latest.hr.value) : '112')
  const [sbp, setSbp] = useState(latest?.sbp?.value ? String(latest.sbp.value) : '98')
  const [dbp, setDbp] = useState(latest?.dbp?.value ? String(latest.dbp.value) : '64')
  const [spo2, setSpo2] = useState(latest?.spo2?.value ? String(latest.spo2.value) : '97')
  const [rr, setRr] = useState(latest?.rr?.value ? String(latest.rr.value) : '20')
  const [temp, setTemp] = useState(latest?.temp?.value ? String(latest.temp.value) : '36.8')

  // GCS components
  const [gcsEye, setGcsEye] = useState<number>(latest?.gcs?.components?.eye ?? 4)
  const [gcsVerbal, setGcsVerbal] = useState<number>(latest?.gcs?.components?.verbal ?? 4)
  const [gcsMotor, setGcsMotor] = useState<number>(latest?.gcs?.components?.motor ?? 6)

  const gcsTotal = gcsEye + gcsVerbal + gcsMotor

  const handleSaveObservation = (source: 'manual' | 'monitor') => {
    const newObs: VitalObservation = {
      id: Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      source,
      assessedBy: source === 'manual' ? 'Para. J. Chen (Crew entered)' : 'Lifepak 15 (Simulated monitor)',
      hr: hr ? { value: parseInt(hr), unit: 'bpm' } : undefined,
      sbp: sbp ? { value: parseInt(sbp), unit: 'mmHg' } : undefined,
      dbp: dbp ? { value: parseInt(dbp), unit: 'mmHg' } : undefined,
      spo2: spo2 ? { value: parseInt(spo2), unit: '%' } : undefined,
      rr: rr ? { value: parseInt(rr), unit: 'brpm' } : undefined,
      temp: temp ? { value: parseFloat(temp), unit: '°C' } : undefined,
      gcs: {
        total: gcsTotal,
        components: { eye: gcsEye as any, verbal: gcsVerbal as any, motor: gcsMotor as any },
      },
    }
    addVitalObservation(newObs)
  }

  const gcsSeverity = gcsTotal <= 8 ? 'Severe Trauma (≤8)' : gcsTotal <= 12 ? 'Moderate Trauma (9-12)' : 'Mild / Normal (13-15)'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
              STEP 04 OF 07
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">PHYSIOLOGICAL VITALS</span>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
            How is the patient right now?
          </h2>
          <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
            Document essential physiological observations. Latest reading is transmitted directly to MTC.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={<Radio className="w-4 h-4 text-sky-500 animate-pulse" />}
          onClick={() => handleSaveObservation('monitor')}
          className="rounded-2xl font-bold flex-shrink-0"
        >
          Sync Lifepak 15 Telemetry
        </Button>
      </div>

      {/* Main Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Heart Rate</span>
            <Heart className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className={cn(
            'flex items-baseline gap-1 mt-2 font-mono text-2xl sm:text-3xl font-black',
            nightMode ? 'text-white' : 'text-slate-900'
          )}>
            <input
              type="number"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              className="w-16 bg-transparent border-none outline-none font-black"
            />
            <span className="text-xs font-normal text-slate-400">bpm</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 block mt-1">Norm 60–100</span>
        </div>

        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
            <Activity className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className={cn(
            'flex items-baseline gap-0.5 mt-2 font-mono text-2xl sm:text-3xl font-black',
            nightMode ? 'text-white' : 'text-slate-900'
          )}>
            <input
              type="number"
              value={sbp}
              onChange={(e) => setSbp(e.target.value)}
              className="w-12 bg-transparent border-none outline-none font-black"
            />
            <span className="text-slate-400 font-normal">/</span>
            <input
              type="number"
              value={dbp}
              onChange={(e) => setDbp(e.target.value)}
              className="w-12 bg-transparent border-none outline-none font-black"
            />
          </div>
          <span className="font-mono text-[10px] text-slate-400 block mt-1">Norm 120/80</span>
        </div>

        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">SpO₂</span>
            <Wind className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className={cn(
            'flex items-baseline gap-1 mt-2 font-mono text-2xl sm:text-3xl font-black',
            nightMode ? 'text-white' : 'text-slate-900'
          )}>
            <input
              type="number"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className="w-16 bg-transparent border-none outline-none font-black"
            />
            <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 block mt-1">Norm 95–100%</span>
        </div>

        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Resp. Rate</span>
            <Activity className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className={cn(
            'flex items-baseline gap-1 mt-2 font-mono text-2xl sm:text-3xl font-black',
            nightMode ? 'text-white' : 'text-slate-900'
          )}>
            <input
              type="number"
              value={rr}
              onChange={(e) => setRr(e.target.value)}
              className="w-16 bg-transparent border-none outline-none font-black"
            />
            <span className="text-xs font-normal text-slate-400">/min</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 block mt-1">Norm 12–20</span>
        </div>

        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Temperature</span>
            <Thermometer className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className={cn(
            'flex items-baseline gap-1 mt-2 font-mono text-2xl sm:text-3xl font-black',
            nightMode ? 'text-white' : 'text-slate-900'
          )}>
            <input
              type="number"
              step="0.1"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              className="w-16 bg-transparent border-none outline-none font-black"
            />
            <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 block mt-1">Norm 36.5–37.5</span>
        </div>

        <div className={cn(
          'p-4 sm:p-5 rounded-3xl border transition-colors shadow-xs',
          nightMode
            ? 'bg-sky-950/30 border-sky-500/30'
            : 'bg-sky-50 border-sky-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">GCS Total</span>
            <Eye className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-sky-600 dark:text-sky-400 mt-2">
            {gcsTotal} <span className="text-xs font-normal text-slate-400">/ 15</span>
          </div>
          <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 block mt-1 truncate">
            E{gcsEye} V{gcsVerbal} M{gcsMotor}
          </span>
        </div>
      </div>

      {/* GCS Component Breakdown */}
      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border space-y-5 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className={cn('text-xs font-mono font-bold uppercase tracking-wider', nightMode ? 'text-slate-300' : 'text-slate-700')}>
            Glasgow Coma Scale Assessment Breakdown
          </h3>
          <span className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border',
            gcsTotal <= 8
              ? 'bg-red-500/20 text-red-500 border-red-500/30'
              : gcsTotal <= 12
              ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
          )}>
            {gcsSeverity}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div>
            <label className={cn('font-bold block mb-2', nightMode ? 'text-slate-300' : 'text-slate-800')}>
              Eye Opening (1–4)
            </label>
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              {[1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsEye(v)}
                  className={cn(
                    'py-2.5 rounded-xl font-bold border transition-colors cursor-pointer',
                    gcsEye === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : nightMode
                      ? 'bg-[#152742] text-slate-300 border-[#223F68] hover:bg-[#1C3559]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={cn('font-bold block mb-2', nightMode ? 'text-slate-300' : 'text-slate-800')}>
              Verbal Response (1–5)
            </label>
            <div className="grid grid-cols-5 gap-1.5 font-mono">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsVerbal(v)}
                  className={cn(
                    'py-2.5 rounded-xl font-bold border transition-colors cursor-pointer',
                    gcsVerbal === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : nightMode
                      ? 'bg-[#152742] text-slate-300 border-[#223F68] hover:bg-[#1C3559]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={cn('font-bold block mb-2', nightMode ? 'text-slate-300' : 'text-slate-800')}>
              Motor Response (1–6)
            </label>
            <div className="grid grid-cols-6 gap-1.5 font-mono">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsMotor(v)}
                  className={cn(
                    'py-2.5 rounded-xl font-bold border transition-colors cursor-pointer',
                    gcsMotor === v
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : nightMode
                      ? 'bg-[#152742] text-slate-300 border-[#223F68] hover:bg-[#1C3559]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSaveObservation('manual')}
            className="rounded-2xl font-bold"
          >
            + Log Manual Reading Set
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 5: TREATMENT ("What has already been done?") ─────────────────────────

function StepTreatments({ nightMode }: { nightMode: boolean }) {
  const { activeRun, addTreatment, removeTreatment } = useRunStore()
  if (!activeRun) return null

  const TREATMENTS_LIST: { cat: TreatmentCategory; label: string; defaultDetail: string; icon: any }[] = [
    { cat: 'oxygen', label: 'High-Flow Oxygen', defaultDetail: '15L/min via non-rebreather mask', icon: Wind },
    { cat: 'iv-access', label: 'IV Cannulation', defaultDetail: '18G IV right antecubital fossa', icon: Activity },
    { cat: 'fluids', label: 'IV Fluids Running', defaultDetail: '500ml Hartmann’s solution', icon: Droplets },
    { cat: 'haemorrhage-control', label: 'Bleeding Controlled / Pelvic Binder', defaultDetail: 'SAM Pelvic Sling II applied', icon: Shield },
    { cat: 'splinting', label: 'Splint / Immobilization', defaultDetail: 'Traction splint applied to lower limb', icon: Package },
    { cat: 'airway', label: 'Airway Intervention', defaultDetail: 'Oropharyngeal airway inserted, suctioned', icon: Stethoscope },
    { cat: 'analgesia', label: 'Medication Given', defaultDetail: 'Entonox & IV analgesia administered', icon: Heart },
    { cat: 'cpr', label: 'CPR Administered', defaultDetail: 'Manual CPR in progress', icon: Activity },
    { cat: 'packaging', label: 'Spinal Packaging', defaultDetail: 'Full spinal immobilisation on scoop stretcher', icon: ShieldCheck },
  ]

  const appliedCategories = activeRun.treatments.map((t) => t.category)

  const toggleTreatment = (item: typeof TREATMENTS_LIST[number]) => {
    const existing = activeRun.treatments.find((t) => t.category === item.cat)
    if (existing) {
      removeTreatment(existing.id)
    } else {
      addTreatment({
        id: Math.random().toString(36).slice(2, 8),
        category: item.cat,
        description: item.label,
        detail: item.defaultDetail,
        timestamp: new Date().toISOString(),
        performedBy: 'Para. J. Chen (Ambulance Crew)',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP 05 OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">PRE-HOSPITAL INTERVENTIONS</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
          What interventions have been performed?
        </h2>
        <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
          Document interventions administered at the scene or en route to notify receiving trauma resuscitation team.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {TREATMENTS_LIST.map((tx) => {
          const Icon = tx.icon
          const isApplied = appliedCategories.includes(tx.cat)
          return (
            <button
              key={tx.cat}
              type="button"
              onClick={() => toggleTreatment(tx)}
              className={cn(
                'p-5 rounded-3xl border-2 text-left transition-all duration-150 flex flex-col justify-between min-h-[105px] group cursor-pointer',
                isApplied
                  ? nightMode
                    ? 'border-emerald-400 bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/30'
                    : 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-200/60'
                  : nightMode
                  ? 'border-[#1D3455] bg-[#0E1A2F] hover:border-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                    isApplied
                      ? 'bg-emerald-500 text-white'
                      : nightMode
                      ? 'bg-[#152742] text-slate-400'
                      : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isApplied && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <span className={cn('font-black text-sm sm:text-base block', nightMode ? 'text-white' : 'text-slate-900')}>
                  {tx.label}
                </span>
                <span className="text-xs text-slate-400 block mt-1 leading-snug">
                  {tx.defaultDetail}
                </span>
              </div>

              {isApplied && (
                <span className="text-[11px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
                  ✓ Administered & Logged
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── STEP 6: MIST HANDOVER ────────────────────────────────────────────────────

function StepMIST({ nightMode }: { nightMode: boolean }) {
  const { activeRun, generateMIST, updateMIST, confirmMIST } = useRunStore()
  if (!activeRun) return null

  useEffect(() => {
    if (!activeRun.mist) {
      generateMIST()
    }
  }, [activeRun.mist, generateMIST])

  const mist = activeRun.mist

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
              STEP 06 OF 07
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">MIST PROTOCOL HANDOVER</span>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
            Confirm MIST Handover Summary
          </h2>
          <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
            Standardized Mechanism · Injuries · Signs · Treatment summary formatted for rapid Major Trauma Centre handover.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={generateMIST}
          className="rounded-2xl font-bold flex-shrink-0"
        >
          Regenerate from Current Data
        </Button>
      </div>

      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border space-y-6 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        {/* M */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white font-mono font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            M
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-sky-500 uppercase tracking-wider block mb-1">
              Mechanism of Injury
            </span>
            <textarea
              rows={2}
              value={mist?.mechanism ?? 'Unknown'}
              onChange={(e) => updateMIST({ mechanism: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                nightMode
                  ? 'bg-[#152742] border-[#223F68] text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
                'w-full p-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono transition-colors',
                nightMode
                  ? 'bg-[#152742] border-[#223F68] text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
              Signs & Vital Readings
            </span>
            <textarea
              rows={2}
              value={mist?.signs ?? 'Not available'}
              onChange={(e) => updateMIST({ signs: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono transition-colors',
                nightMode
                  ? 'bg-[#152742] border-[#223F68] text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
              Treatment Administered
            </span>
            <textarea
              rows={3}
              value={mist?.treatment ?? 'None confirmed'}
              onChange={(e) => updateMIST({ treatment: e.target.value })}
              className={cn(
                'w-full p-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors',
                nightMode
                  ? 'bg-[#152742] border-[#223F68] text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
              )}
            />
          </div>
        </div>

        {/* Confirmation Signature */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {mist?.confirmedBy ? `✓ Signed by ${mist.confirmedBy}` : 'Unsigned crew validation'}
          </span>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => confirmMIST('Para. J. Chen')}
            className="rounded-2xl font-bold"
          >
            Confirm & Sign Handover
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 7: REVIEW & SEND ("Ready to send the handover?") ───────────────────

function StepReview({ nightMode }: { nightMode: boolean }) {
  const { activeRun, sendPreAlert, setBloodBankRequired, createBloodRequest } = useRunStore()
  if (!activeRun) return null

  const isSent = activeRun.alertStatus !== 'not-sent' && activeRun.alertStatus !== 'draft'
  const hospital = AVAILABLE_HOSPITALS.find((h) => h.id === activeRun.destinationHospitalId)
  const [bloodUnits, setBloodUnits] = useState('4')

  const handleSendBlood = () => {
    createBloodRequest({
      bloodGroup: 'Unknown',
      productType: 'o-negative',
      unitsRequested: parseInt(bloodUnits) || 4,
      clinicalJustification: 'Haemodynamically unstable trauma patient with suspected pelvic haemorrhage',
      recipient: hospital?.name ?? 'MTC Blood Bank',
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-extrabold uppercase tracking-wider border border-sky-500/20">
            STEP 07 OF 07
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">CLINICAL TRANSMISSION</span>
        </div>
        <h2 className={cn('text-3xl sm:text-4xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
          Ready to transmit the pre-alert?
        </h2>
        <p className={cn('text-xs sm:text-sm font-medium', nightMode ? 'text-slate-400' : 'text-slate-500')}>
          Review the pre-alert clinical package before transmitting to the receiving Major Trauma Centre.
        </p>
      </div>

      {/* Hospital Destination Card */}
      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <div>
          <span className="font-mono text-[10px] font-bold uppercase text-slate-400 block">
            Receiving Major Trauma Centre
          </span>
          <h3 className={cn('text-xl font-black mt-0.5', nightMode ? 'text-white' : 'text-slate-900')}>
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
            <span className="text-[10px] text-slate-400 block uppercase font-bold">ED Bay Status</span>
            <span className="text-2xl font-black text-red-500">Bay 2</span>
          </div>
        </div>
      </div>

      {/* Concise Visual Summary Breakdown */}
      <div
        className={cn(
          'p-6 sm:p-7 rounded-3xl border space-y-5 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        <h3 className={cn('text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800', nightMode ? 'text-white' : 'text-slate-900')}>
          Clinical Handover Overview
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient</span>
            <span className={cn('font-bold block mt-1 text-sm', nightMode ? 'text-white' : 'text-slate-900')}>
              {activeRun.patient.name ?? `Unknown ${activeRun.patient.sex ?? 'Male'}`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Mechanism</span>
            <span className={cn('font-bold block mt-1 text-sm truncate', nightMode ? 'text-white' : 'text-slate-900')}>
              {activeRun.incident.mechanism ?? 'RTC'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Injuries</span>
            <span className="font-bold text-red-500 block mt-1 text-sm">
              {activeRun.injuries.length} anatomical {activeRun.injuries.length === 1 ? 'finding' : 'findings'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Treatments</span>
            <span className="font-bold text-emerald-500 block mt-1 text-sm">
              {activeRun.treatments.length} administered
            </span>
          </div>
        </div>

        {/* Conditional Blood Bank Experience */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <span className={cn('font-bold text-xs block', nightMode ? 'text-white' : 'text-slate-800')}>
                Could blood products be required on arrival?
              </span>
              <span className="text-[11px] text-slate-400">
                Pre-alerts hospital blood-bank for emergency uncrossed PRBCs or Trauma Pack 1.
              </span>
            </div>
            <div className="flex gap-1.5">
              {(['yes', 'no', 'unknown'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBloodBankRequired(opt)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer',
                    activeRun.bloodBankRequired === opt
                      ? 'bg-red-500 text-white shadow-sm'
                      : nightMode
                      ? 'bg-[#152742] text-slate-300 hover:bg-[#1C3559]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {activeRun.bloodBankRequired === 'yes' && (
            <div className={cn(
              'p-4 rounded-2xl border space-y-3 mt-3',
              nightMode ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-500">Emergency O-Negative Standby Requisition</span>
                <span className="font-mono text-[10px] text-red-400">Blood Bank LIMS</span>
              </div>
              <p className="text-xs text-slate-400">
                Patient is haemodynamically unstable with suspected severe pelvic / internal haemorrhage. Standby order: 4 units emergency uncrossmatched O-negative PRBCs.
              </p>
              {!activeRun.bloodBankRequest ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleSendBlood}
                  className="rounded-xl font-bold"
                >
                  Send Blood Bank Pre-Alert (4 Units O-Neg)
                </Button>
              ) : (
                <span className="inline-block text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                  ✓ Blood Bank Pre-Alert Transmitted to {hospital?.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary Pre-Alert Action Card */}
      <div
        className={cn(
          'p-8 rounded-3xl border text-center space-y-4 transition-colors shadow-sm',
          nightMode ? 'bg-[#0E1A2F] border-[#1D3455]' : 'bg-white border-slate-200/90'
        )}
      >
        {isSent ? (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-sm border border-emerald-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className={cn('text-2xl font-black tracking-tight', nightMode ? 'text-white' : 'text-slate-900')}>
              PRE-ALERT TRANSMITTED
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Received and acknowledged by {hospital?.name} Resuscitation Team. Trauma Bay 2 is assigned and on active standby.
            </p>
            <div className="pt-2">
              <Link
                href="/hospital"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold border transition-colors',
                  nightMode
                    ? 'bg-[#152742] text-sky-400 border-[#223F68] hover:bg-[#1C3559]'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 shadow-xs'
                )}
              >
                <span>Open Live Hospital Receiving Console</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={sendPreAlert}
              className="w-full max-w-md mx-auto bg-gradient-to-r from-sky-500 via-sky-600 to-sky-700 hover:from-sky-600 hover:to-sky-800 text-white font-black py-4 px-6 text-base sm:text-lg rounded-2xl shadow-xl shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer border border-sky-400/40"
            >
              <Send className="w-5 h-5 text-white" />
              <span>Transmit Emergency Pre-Alert</span>
            </button>
            <p className="text-[11px] text-slate-400 font-mono">
              Explicit Transmission Trigger · Connects via live simulated BroadcastChannel to receiving ED
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
