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
  Package, Shield, CheckCircle2, Stethoscope, Camera, Upload, ArrowLeft,
  HelpCircle, Sparkles, Mic, Phone, Building2
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
  patient: 'Run & Patient',
  incident: 'Incident',
  injuries: 'Injuries',
  vitals: 'Vitals',
  treatments: 'Treatment',
  mist: 'MIST Handover',
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

  // Explicit session state to fix the "skipping steps / opening on last tab" bug
  const [sessionActive, setSessionActive] = useState(false)

  // Current step normalization
  const currentStep = (activeRun?.currentStep === 'handover' ? 'review' : activeRun?.currentStep) ?? 'patient'
  const completed = activeRun ? getCompletedSteps(currentStep) : []

  const handleStartNewRun = () => {
    startNewRun('Alpha 7', 'Para. J. Chen', 'hosp-001')
    setStep('patient')
    setSessionActive(true)
  }

  const handleLoadDemo = () => {
    // Explicitly start at Step 1: Patient
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
      setStep(STEPS[idx + 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const back = () => {
    if (!activeRun) return
    const idx = stepIndex(currentStep)
    if (idx > 0) {
      setStep(STEPS[idx - 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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
        'min-h-screen flex flex-col font-sans transition-colors duration-200 select-none pb-24',
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
        onStepClick={(id) => setStep(id as WizardStep)}
      />

      {/* ── Patient Context Strip (Once identified) ──────────────────────── */}
      <PatientContextBar run={activeRun} nightMode={nightMode} />

      {/* ── Main Guided Content Workspace ─────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {currentStep === 'patient' && <StepPatient nightMode={nightMode} />}
            {currentStep === 'incident' && <StepIncident nightMode={nightMode} />}
            {currentStep === 'injuries' && <StepInjuries nightMode={nightMode} />}
            {currentStep === 'vitals' && <StepVitals nightMode={nightMode} />}
            {currentStep === 'treatments' && <StepTreatments nightMode={nightMode} />}
            {currentStep === 'mist' && <StepMIST nightMode={nightMode} />}
            {currentStep === 'review' && (
              <StepReview nightMode={nightMode} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Fixed Bottom Action Bar (Vaidya Kiosk Pattern) ────────────────── */}
      <footer
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 px-4 sm:px-8 py-3.5 border-t backdrop-blur-md transition-colors',
          nightMode
            ? 'bg-[#0F1E38]/90 border-[#1E3A5F]'
            : 'bg-white/95 border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]'
        )}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={back}
            disabled={stepIndex(currentStep) === 0}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold border transition-all',
              stepIndex(currentStep) === 0
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : nightMode
                ? 'border-[#1E3A5F] bg-[#162744] text-slate-200 hover:bg-[#1E3559]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Center: Step indicators / Status */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Step {stepIndex(currentStep) + 1} of {STEPS.length}</span>
            <span>·</span>
            <span className="text-slate-600 font-semibold">{STEP_LABELS[currentStep]}</span>
          </div>

          {/* Primary Action Button */}
          {!isLastStep ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={advance}
              className="px-6 sm:px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20"
            >
              <span>Next: {nextStepName}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-600 font-semibold hidden md:inline">
                {activeRun.alertStatus === 'sent' || activeRun.alertStatus === 'acknowledged'
                  ? '✓ Pre-Alert Transmitted'
                  : 'Ready to Send'}
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
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col font-sans">
      <DemoBanner />

      <header className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-sm">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tight text-slate-900">
            TRAUMA<span className="text-sky-500">BRIDGE</span> AI
          </span>
          <span className="text-xs text-slate-400 font-mono ml-2">Ambulance Terminal</span>
        </div>

        <Link
          href="/hospital"
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
        >
          <span>Hospital Console</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <div className="text-center mb-8">
          <Badge variant="sky" size="md" className="mb-3">
            EMERGENCY INTAKE PORTAL
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ambulance Intake & Handover
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Guided clinical intake terminal for pre-hospital care and Major Trauma Centre pre-alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Start Fresh Run */}
          <div
            onClick={onStartNew}
            className="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Play className="w-6 h-6 fill-sky-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Start New Emergency Run</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Begin a clean patient intake sequence starting at <strong>Step 1: Run & Patient</strong>.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-sky-600">
              <span>Begin Intake</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Load Demo Case */}
          <div
            onClick={onLoadDemo}
            className="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Load Demonstration Case</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pre-populated RTC on M25 (Alpha 7) with injuries, telemetry, and pre-alert. Starts at <strong>Step 1</strong> for interactive review.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-teal-600">
              <span>Explore Demo Run</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Existing Draft Card (if stored) */}
        {existingRun && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Saved Draft Detected
              </span>
              <p className="text-xs font-semibold text-slate-800">
                Unit {existingRun.callsign} · {existingRun.patient.name ?? 'Unknown Male'} · Step: {STEP_LABELS[existingRun.currentStep] ?? existingRun.currentStep}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={onResumeDraft}>
              Resume Draft
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Persistent Header ────────────────────────────────────────────────────────

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
        nightMode ? 'bg-[#0F1E38] border-[#1E3A5F]' : 'bg-white border-slate-200 shadow-sm'
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Unit info */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={cn('font-mono text-xs font-bold tracking-tight hidden sm:inline', nightMode ? 'text-white' : 'text-slate-900')}>
              TRAUMA<span className="text-sky-500">BRIDGE</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-slate-200">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 border border-sky-500/30">
              {run.callsign}
            </span>
            <span className="font-mono text-[10px] text-slate-400 hidden md:inline">
              #{run.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Center: Stepper (Progress pills) */}
        <div className="flex-1 max-w-xl mx-2">
          <WizardProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            nightMode={nightMode}
          />
        </div>

        {/* Right: Connectivity, Timer, Dark toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 font-mono text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{elapsed}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-mono hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Sync</span>
          </div>

          <button
            type="button"
            onClick={onNightToggle}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              nightMode ? 'bg-[#162744] border-[#1E3A5F] text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600'
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

// ─── Persistent Patient Bar ───────────────────────────────────────────────────

function PatientContextBar({ run, nightMode }: { run: EmergencyRun; nightMode: boolean }) {
  const hospital = AVAILABLE_HOSPITALS.find((h) => h.id === run.destinationHospitalId)

  return (
    <div
      className={cn(
        'px-4 sm:px-6 py-2 border-b text-xs flex items-center justify-between gap-4 font-mono',
        nightMode ? 'bg-[#091426] border-[#162B4A] text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
      )}
    >
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-500" />
            {run.patient.name ?? `Unknown ${run.patient.sex ?? 'Male'}, ~${run.patient.estimatedAge ?? 38}y`}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 capitalize">{run.patient.identityStatus.replace('-', ' ')}</span>
          {run.patient.allergies && run.patient.allergies.length > 0 && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-red-500 font-semibold">Allergies: {run.patient.allergies.join(', ')}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-slate-500 hidden sm:inline">Destination:</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            {hospital?.shortName ?? 'St. Bartholomew’s'}
          </span>
          {run.eta && (
            <span className="font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              ETA {run.eta}m
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 1: RUN & PATIENT ("Who are we transporting?") ───────────────────────

function StepPatient({ nightMode }: { nightMode: boolean }) {
  const { activeRun, updatePatient } = useRunStore()
  if (!activeRun) return null

  const p = activeRun.patient
  const identityStatus = p.identityStatus

  const [idName, setIdName] = useState(p.name ?? '')
  const [idAge, setIdAge] = useState(p.estimatedAge ? String(p.estimatedAge) : '')
  const [idSex, setIdSex] = useState<'male' | 'female' | 'unknown'>(p.sex ?? 'unknown')
  const [idAbha, setIdAbha] = useState(p.abhaId ?? '')
  const [showDocUpload, setShowDocUpload] = useState(false)

  const handleModeChange = (mode: EmergencyRun['patient']['identityStatus']) => {
    updatePatient({
      identityStatus: mode,
      name: mode === 'known' ? (idName || 'John Doe') : undefined,
      sex: idSex,
      estimatedAge: parseInt(idAge) || 38,
    })
  }

  const handleUpdateDetails = () => {
    updatePatient({
      name: idName.trim() || undefined,
      estimatedAge: parseInt(idAge) || undefined,
      sex: idSex,
      abhaId: idAbha.trim() || undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Question Header (Vaidya Principle) */}
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Who are we transporting?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Select identity status. Emergency care is never delayed by missing identification.
        </p>
      </div>

      {/* 4 Large Tactile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'known', label: 'Known Patient', desc: 'Patient is conscious or carrying confirmed ID' },
          { key: 'unknown', label: 'Unknown Patient', desc: 'Unidentified at scene, temporary ID assigned' },
          { key: 'cannot-respond', label: 'Cannot Respond', desc: 'Unconscious, intubated, or altered mental status' },
          { key: 'pending', label: 'Identity Pending', desc: 'Crew searching belongings / rapid transit' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleModeChange(item.key as any)}
            className={cn(
              'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[110px]',
              identityStatus === item.key
                ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div>
              <span className="font-bold text-sm text-slate-900 block">{item.label}</span>
              <span className="text-xs text-slate-500 block mt-1 leading-snug">{item.desc}</span>
            </div>
            {identityStatus === item.key && (
              <span className="text-[11px] font-bold text-sky-600 mt-2 flex items-center gap-1">
                ✓ Active Selection
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detailed Form (Progressive Disclosure) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Patient Demographics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {identityStatus === 'known' ? (
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. David Miller"
                value={idName}
                onChange={(e) => {
                  setIdName(e.target.value)
                  updatePatient({ name: e.target.value })
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Temporary System Identifier</label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-slate-600">
                PT-UNKNOWN-{activeRun.id.slice(0, 6).toUpperCase()}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {identityStatus === 'known' ? 'Age' : 'Estimated Age'}
            </label>
            <input
              type="number"
              placeholder="e.g. 38"
              value={idAge}
              onChange={(e) => {
                setIdAge(e.target.value)
                updatePatient({ estimatedAge: parseInt(e.target.value) || undefined })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Sex Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">Biological / Observed Sex</label>
          <div className="flex gap-2">
            {[
              { key: 'male', label: 'Male' },
              { key: 'female', label: 'Female' },
              { key: 'unknown', label: 'Unknown' },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setIdSex(s.key as any)
                  updatePatient({ sex: s.key as any })
                }}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
                  idSex === s.key
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Section: Found Identification */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-bold text-xs text-slate-800 block">Found Identification or Documents?</span>
              <p className="text-[11px] text-slate-500">
                Aadhaar card, driving licence, hospital OPD card, or prescription found on person.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Camera className="w-3.5 h-3.5" />}
              onClick={() => setShowDocUpload(!showDocUpload)}
            >
              {showDocUpload ? 'Hide' : 'Attach Document'}
            </Button>
          </div>

          {showDocUpload && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const demoDoc: IdentityDocument = {
                      id: Math.random().toString(36).slice(2, 8),
                      type: 'driving-licence',
                      title: 'Driving Licence found in wallet',
                      photoUrl: '/images/hero-handover.jpg',
                      extractedText: 'NAME: DAVID M. DOB: 14/08/1986',
                      confirmedByStaff: false,
                      timestamp: new Date().toISOString(),
                      source: 'Uploaded by crew',
                    }
                    const prev = p.foundDocuments ?? []
                    updatePatient({ foundDocuments: [...prev, demoDoc] })
                  }}
                >
                  Simulate Capture Driving Licence
                </Button>
              </div>

              {p.foundDocuments && p.foundDocuments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {p.foundDocuments.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{doc.title}</span>
                        <span className="font-mono text-[10px] text-amber-600 block mt-0.5">
                          ⚠ Needs crew confirmation — do not assume identity belongs to patient without staff review
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold">Image Saved</span>
                    </div>
                  ))}
                </div>
              )}
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
    { code: 'rtc', label: 'Road Traffic Collision', desc: 'Driver, passenger, or pedestrian impact' },
    { code: 'fall', label: 'Fall from Height', desc: 'Ground level or > 2 metres' },
    { code: 'assault', label: 'Physical Assault', desc: 'Blunt force or weapon' },
    { code: 'industrial', label: 'Workplace / Industrial', desc: 'Heavy machinery, collapse' },
    { code: 'penetrating', label: 'Penetrating Trauma', desc: 'Stab wound or ballistic' },
    { code: 'burn', label: 'Burn / Thermal Injury', desc: 'Flame, scald, or chemical' },
    { code: 'crush', label: 'Crush Injury', desc: 'Structural entrapment' },
    { code: 'other', label: 'Other / Medical Trauma', desc: 'Unspecified trauma incident' },
  ]

  const TIME_OPTIONS = [
    'Just now (< 15 min)',
    '15–30 min ago',
    '30–60 min ago',
    '1–3 hours ago',
    'Unknown time',
  ]

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          What happened?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Select the primary mechanism of injury and scene timeline.
        </p>
      </div>

      {/* Mechanism Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MECHANISMS.map((m) => {
          const isSelected = inc.mechanismCode === m.code || inc.mechanism === m.label
          return (
            <button
              key={m.code}
              type="button"
              onClick={() => updateIncident({ mechanism: m.label, mechanismCode: m.code })}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[90px]',
                isSelected
                  ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div>
                <span className="font-bold text-sm text-slate-900 block">{m.label}</span>
                <span className="text-[11px] text-slate-500 block mt-1 leading-snug">{m.desc}</span>
              </div>
              {isSelected && (
                <span className="text-[10px] font-bold text-sky-600 mt-2">✓ Selected</span>
              )}
            </button>
          )
        })}
      </div>

      {/* When did it happen? */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-2">When did it happen?</label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateIncident({ time: t })}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                  inc.time === t
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scene detail */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Scene Notes / Specific Impact (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. High-speed frontal impact on M25 J18. Airbag deployed, driver unrestrained."
            value={inc.detail ?? ''}
            onChange={(e) => updateIncident({ detail: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3: INJURIES ("Interactive Injury Map") ─────────────────────────────

function StepInjuries({ nightMode }: { nightMode: boolean }) {
  const { activeRun, addInjury, removeInjury } = useRunStore()
  if (!activeRun) return null

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Document injuries
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Rotate views (Anterior / Posterior / Lateral) and tap anatomical zones to record findings.
        </p>
      </div>

      <InjuryMap
        injuries={activeRun.injuries}
        onAdd={addInjury}
        onRemove={removeInjury}
        nightMode={nightMode}
      />
    </div>
  )
}

// ─── STEP 4: VITALS ("Record vital signs") ────────────────────────────────────

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
      assessedBy: source === 'manual' ? 'Para. J. Chen' : 'Lifepak 15 (auto)',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Record vital signs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter manual observations or synchronize telemetry from ambulance monitor.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Radio className="w-3.5 h-3.5 text-sky-500 animate-pulse" />}
          onClick={() => handleSaveObservation('monitor')}
        >
          Sync from Lifepak 15 (Telemetry)
        </Button>
      </div>

      {/* Main Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">HR (bpm)</span>
          <input
            type="number"
            value={hr}
            onChange={(e) => setHr(e.target.value)}
            className="w-full text-2xl font-extrabold font-mono text-slate-900 bg-transparent border-none outline-none mt-1"
          />
          <span className="font-mono text-[10px] text-slate-400 block">Normal 60–100</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">BP (mmHg)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono text-2xl font-extrabold text-slate-900">
            <input
              type="number"
              value={sbp}
              onChange={(e) => setSbp(e.target.value)}
              className="w-12 bg-transparent border-none outline-none"
            />
            <span className="text-slate-400 font-normal">/</span>
            <input
              type="number"
              value={dbp}
              onChange={(e) => setDbp(e.target.value)}
              className="w-12 bg-transparent border-none outline-none"
            />
          </div>
          <span className="font-mono text-[10px] text-slate-400 block">Normal 120/80</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">SpO₂ (%)</span>
          <input
            type="number"
            value={spo2}
            onChange={(e) => setSpo2(e.target.value)}
            className="w-full text-2xl font-extrabold font-mono text-slate-900 bg-transparent border-none outline-none mt-1"
          />
          <span className="font-mono text-[10px] text-slate-400 block">Normal 95–100%</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Resp. Rate</span>
          <input
            type="number"
            value={rr}
            onChange={(e) => setRr(e.target.value)}
            className="w-full text-2xl font-extrabold font-mono text-slate-900 bg-transparent border-none outline-none mt-1"
          />
          <span className="font-mono text-[10px] text-slate-400 block">Normal 12–20</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">Temp (°C)</span>
          <input
            type="number"
            step="0.1"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="w-full text-2xl font-extrabold font-mono text-slate-900 bg-transparent border-none outline-none mt-1"
          />
          <span className="font-mono text-[10px] text-slate-400 block">Normal 36.5–37.5</span>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 shadow-sm">
          <span className="font-mono text-[10px] uppercase font-bold text-sky-700 block">GCS Total</span>
          <div className="text-2xl font-extrabold font-mono text-sky-900 mt-1">
            {gcsTotal} <span className="text-xs font-normal text-sky-600">/ 15</span>
          </div>
          <span className="font-mono text-[10px] text-sky-600 block">E{gcsEye} V{gcsVerbal} M{gcsMotor}</span>
        </div>
      </div>

      {/* GCS Component Selectors */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
          Glasgow Coma Scale Assessment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">Eye Opening (1–4)</label>
            <div className="grid grid-cols-4 gap-1 font-mono">
              {[1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsEye(v)}
                  className={cn(
                    'py-2 rounded-lg font-bold border transition-colors',
                    gcsEye === v ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1.5">Verbal Response (1–5)</label>
            <div className="grid grid-cols-5 gap-1 font-mono">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsVerbal(v)}
                  className={cn(
                    'py-2 rounded-lg font-bold border transition-colors',
                    gcsVerbal === v ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1.5">Motor Response (1–6)</label>
            <div className="grid grid-cols-6 gap-1 font-mono">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGcsMotor(v)}
                  className={cn(
                    'py-2 rounded-lg font-bold border transition-colors',
                    gcsMotor === v ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700'
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
          >
            + Log Manual Observation Reading
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

  const TREATMENTS_LIST: { cat: TreatmentCategory; label: string; defaultDetail: string }[] = [
    { cat: 'oxygen', label: 'High-Flow Oxygen', defaultDetail: '15L/min via non-rebreather mask' },
    { cat: 'iv-access', label: 'IV Cannulation', defaultDetail: '18G IV right antecubital fossa' },
    { cat: 'fluids', label: 'IV Fluids Running', defaultDetail: '500ml Hartmann’s solution' },
    { cat: 'haemorrhage-control', label: 'Pelvic Binder', defaultDetail: 'SAM Pelvic Sling II applied' },
    { cat: 'splinting', label: 'Limb Splint / Traction', defaultDetail: 'Traction splint applied to lower leg' },
    { cat: 'airway', label: 'Airway Adjunct', defaultDetail: 'Oropharyngeal airway inserted' },
    { cat: 'analgesia', label: 'Analgesia Administered', defaultDetail: 'Entonox / Morphine given' },
    { cat: 'cpr', label: 'Chest Compressions / CPR', defaultDetail: 'Manual CPR in progress' },
    { cat: 'packaging', label: 'Spinal Packaging', defaultDetail: 'Scoop stretcher & cervical collar' },
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
        performedBy: 'Para. J. Chen',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          What has already been done?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Document interventions administered at the scene or in transit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TREATMENTS_LIST.map((tx) => {
          const isApplied = appliedCategories.includes(tx.cat)
          return (
            <button
              key={tx.cat}
              type="button"
              onClick={() => toggleTreatment(tx)}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[90px]',
                isApplied
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div>
                <span className="font-bold text-sm text-slate-900 block">{tx.label}</span>
                <span className="text-[11px] text-slate-500 block mt-1 leading-snug">{tx.defaultDetail}</span>
              </div>
              {isApplied && (
                <span className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                  ✓ Administered
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
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            MIST Handover Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Mechanism · Injuries · Signs · Treatment synthesized from your entries.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={generateMIST}
        >
          Regenerate from Data
        </Button>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        {/* M */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500 text-white font-mono font-bold flex items-center justify-center text-sm flex-shrink-0">
            M
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-sky-600 uppercase tracking-wider block mb-1">
              Mechanism of Injury
            </span>
            <textarea
              rows={2}
              value={mist?.mechanism ?? 'Unknown mechanism'}
              onChange={(e) => updateMIST({ mechanism: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* I */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500 text-white font-mono font-bold flex items-center justify-center text-sm flex-shrink-0">
            I
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
              Injuries Found or Suspected
            </span>
            <textarea
              rows={3}
              value={mist?.injuries ?? 'No injuries recorded'}
              onChange={(e) => updateMIST({ injuries: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>
        </div>

        {/* S */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-mono font-bold flex items-center justify-center text-sm flex-shrink-0">
            S
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">
              Signs & Vital Readings
            </span>
            <textarea
              rows={2}
              value={mist?.signs ?? 'Vitals pending'}
              onChange={(e) => updateMIST({ signs: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>
        </div>

        {/* T */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-mono font-bold flex items-center justify-center text-sm flex-shrink-0">
            T
          </div>
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              Treatment Administered
            </span>
            <textarea
              rows={3}
              value={mist?.treatment ?? 'No treatments recorded'}
              onChange={(e) => updateMIST({ treatment: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Confirmation signature */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {mist?.confirmedBy ? `✓ Signed by ${mist.confirmedBy}` : 'Unsigned'}
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => confirmMIST('Para. J. Chen')}
          >
            Confirm & Sign Handover
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 7: REVIEW & SEND ("Ready to send to the hospital?") ─────────────────

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
      clinicalJustification: 'Unstable trauma patient, suspected pelvic haemorrhage',
      recipient: hospital?.name ?? 'MTC Blood Bank',
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Ready to send to the hospital?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Review the pre-alert package before transmitting to the receiving emergency team.
        </p>
      </div>

      {/* Hospital Destination Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase text-slate-400 block">
            Receiving Facility
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">{hospital?.name}</h3>
          <p className="text-xs text-slate-500">{hospital?.address} · {hospital?.type}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block">Estimated Arrival</span>
            <span className="text-lg font-bold text-sky-600">{activeRun.eta ?? 4} min</span>
          </div>
          <span className="w-px h-8 bg-slate-200" />
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block">Bay Assignment</span>
            <span className="text-lg font-bold text-slate-900">Bay 2</span>
          </div>
        </div>
      </div>

      {/* Package Summary Overview */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Handover Summary Review
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Patient</span>
            <span className="font-bold text-slate-900 block mt-0.5">
              {activeRun.patient.name ?? `Unknown ${activeRun.patient.sex ?? 'Male'}`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Mechanism</span>
            <span className="font-bold text-slate-900 block mt-0.5 truncate">
              {activeRun.incident.mechanism ?? 'RTC'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Injuries Mapped</span>
            <span className="font-bold text-red-600 block mt-0.5">
              {activeRun.injuries.length} anatomical {activeRun.injuries.length === 1 ? 'injury' : 'injuries'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Interventions</span>
            <span className="font-bold text-emerald-600 block mt-0.5">
              {activeRun.treatments.length} administered
            </span>
          </div>
        </div>

        {/* Optional Blood Bank Card */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-slate-800">
              Blood products may be required?
            </span>
            <div className="flex gap-1.5">
              {(['yes', 'no', 'unknown'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBloodBankRequired(opt)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                    activeRun.bloodBankRequired === opt
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {activeRun.bloodBankRequired === 'yes' && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-700">Emergency O-Negative Requisition</span>
                <span className="font-mono text-[10px] text-red-600">Simulated LIMS</span>
              </div>
              <p className="text-xs text-slate-600">
                Haemodynamically unstable trauma patient. Requesting 4 units O-negative on standby.
              </p>
              {!activeRun.bloodBankRequest && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleSendBlood}
                >
                  Confirm Blood Bank Pre-Alert
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pre-Alert Send Action Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
        {isSent ? (
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Pre-Alert Successfully Transmitted</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Received by {hospital?.name}. ED Trauma Bay 2 is assigned and resuscitation team is notified.
            </p>
            <div className="pt-2">
              <Link
                href="/hospital"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200"
              >
                <span>View Hospital Receiving Console</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="primary"
              size="xl"
              icon={<Send className="w-5 h-5 text-white" />}
              onClick={sendPreAlert}
              className="w-full max-w-md mx-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 text-base rounded-2xl shadow-lg shadow-emerald-600/25"
            >
              Send Pre-Alert to Hospital
            </Button>
            <p className="text-[11px] text-slate-400 font-mono">
              Simulated demonstration transmission · Transmits to hospital console via BroadcastChannel
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
