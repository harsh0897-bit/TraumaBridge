'use client'

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Activity, Clock, Bell, Check, AlertTriangle, ChevronRight,
  Radio, Droplets, User, MapPin, Heart, RefreshCw, Search, X,
  Shield, CheckCircle2, AlertCircle, Stethoscope, Building2,
  ExternalLink, Wind, Eye, FileText, Bed, Zap, Layers,
  ChevronDown, Phone, ArrowUpRight, Copy, Info
} from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { DEMO_RUN, DEMO_SECONDARY_CASE, DEMO_HOSPITAL } from '@/data/demoRun'
import type { EmergencyRun, HospitalPrep, BloodBankStatus, RunEvent, VitalObservation } from '@/types/run'
import {
  Tile,
  StatNumber,
  StatusChip,
  ProgressRing,
  Sparkline,
  SegmentedTabs,
  PillButton,
  Countdown,
} from '@/components/shared'
import { BodyMapViewer } from '@/components/hospital/BodyMapViewer'
import { resolveRegionMapping } from '@/lib/bodymap/compat'
import { getCaseUrgency } from '@/lib/case-urgency'
import {
  calculateShockIndex,
  getHeartRateStatus,
  getBloodPressureStatus,
  getSpO2Status,
  getRespRateStatus,
  getGcsStatus,
  calculateRTS,
} from '@/lib/trauma-scores'
import {
  ease,
  durations,
  spring,
  tileEntrance,
  stagger,
  tabContent,
  caseSwitch,
  hoverLift,
  press,
} from '@/lib/motion'
import { cn } from '@/lib/utils'
import { formatClock, formatAgo, formatDateTimeLong } from '@/lib/format-time'
import { patientLabel } from '@/lib/patient-label'

type HospitalTab = 'overview' | 'clinical' | 'preparation' | 'activity'

// Dedicated synthetic Unsent Case for demonstration & validation
const DEMO_UNSENT_CASE: EmergencyRun = {
  id: 'demo-run-unsent',
  callsign: 'Alpha 7',
  crewLead: 'Para. J. Chen',
  status: 'dispatch',
  syncStatus: 'local-only',
  currentStep: 'patient',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDemo: true,
  patient: {
    id: 'demo-pt-unsent',
    identityStatus: 'unknown',
    allergies: [],
    emergencyNotes: 'Awaiting crew arrival on scene.',
  },
  incident: {
    mechanism: 'Road Traffic Collision',
    mechanismCode: 'rta-driver',
    detail: 'Dispatch notification. Patient assessment pending arrival.',
    location: 'M25 J18 Northbound',
  },
  injuries: [],
  vitalObservations: [],
  treatments: [],
  destinationHospitalId: 'hosp-001',
  alertStatus: 'not-sent',
  hospitalPrep: [
    { id: 'prep-trauma-bay', label: 'Trauma Bay 2', status: 'pending', team: 'ED', updatedAt: new Date().toISOString() },
    { id: 'prep-team', label: 'Trauma Team', status: 'pending', team: 'Trauma', updatedAt: new Date().toISOString() },
    { id: 'prep-ct', label: 'CT Scanner', status: 'pending', team: 'Radiology', updatedAt: new Date().toISOString() },
    { id: 'prep-ortho', label: 'Orthopaedic Surgeon', status: 'pending', team: 'Ortho', updatedAt: new Date().toISOString() },
    { id: 'prep-blood', label: 'Blood Products', status: 'pending', team: 'Blood Bank', updatedAt: new Date().toISOString() },
    { id: 'prep-theatre', label: 'Theatre on Standby', status: 'pending', team: 'Theatre', updatedAt: new Date().toISOString() },
  ],
  events: [
    {
      id: 'ev-u-001',
      type: 'run-started',
      description: 'Emergency run started — Alpha 7 dispatched to RTC',
      timestamp: new Date().toISOString(),
      source: 'system',
    },
  ],
  isOffline: false,
  pendingSync: false,
}

// ─── TALL DENSITY VITALS TREND CHART ──────────────────────────────────────────
function VitalsTrendChart({
  hrTrend,
  sbpTrend,
}: {
  hrTrend: number[]
  sbpTrend: number[]
}) {
  const hrPoints = hrTrend.length > 0 ? hrTrend : [118, 118]
  const sbpPoints = sbpTrend.length > 0 ? sbpTrend : [98, 98]

  const minVal = 60
  const maxVal = 140
  const width = 320
  const height = 50

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val))
    return height - ((clamped - minVal) / (maxVal - minVal)) * (height - 8) - 4
  }

  const getPointsPath = (data: number[]) => {
    return data
      .map((val, idx) => {
        const x = data.length > 1 ? (idx / (data.length - 1)) * (width - 24) + 12 : width / 2
        const y = getY(val)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' L ')
  }

  const hrPath = `M ${getPointsPath(hrPoints)}`
  const sbpPath = `M ${getPointsPath(sbpPoints)}`

  return (
    <div className="w-full flex flex-col justify-between h-[105px] pt-1">
      <div className="flex items-center justify-between text-[12px] text-ink-2 mb-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-ink">HR ({hrPoints[hrPoints.length - 1]} bpm)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-critical" />
            <span className="text-ink">SBP ({sbpPoints[sbpPoints.length - 1]} mmHg)</span>
          </div>
        </div>
        <span className="font-mono text-[12px]">Last 15m</span>
      </div>

      <div className="flex-1 w-full relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line x1="0" y1={getY(100)} x2={width} y2={getY(100)} stroke="#E3EAF2" strokeDasharray="3 3" strokeWidth="1" />
          <path d={hrPath} fill="none" stroke="#1B5FB4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={sbpPath} fill="none" stroke="#D92D20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[12px] font-mono text-ink-2 mt-1">
        <span>-15 min</span>
        <span>Now</span>
      </div>
    </div>
  )
}

// ─── MAIN HOSPITAL APPLICATION (SINGLE SCREEN VIEWPORT) ────────────────────────

function HospitalPageContent() {
  const {
    activeRun,
    loadDemoRun,
    acknowledgeAlert,
    updateHospitalPrep,
    updateBloodStatus,
  } = useRunStore()

  const reducedMotion = useReducedMotion()
  const searchParams = useSearchParams()
  const isUnsentState = searchParams?.get('state') === 'unsent'

  // Cross-tab sync
  useEffect(() => {
    initRunSync()
  }, [])

  // Auto-load demo if no active run
  useEffect(() => {
    if (!activeRun) {
      loadDemoRun(false)
    }
  }, [activeRun, loadDemoRun])

  // Case Selection & Navigation State (Only 2 real cases: Alpha 7 and Bravo 3)
  const [selectedCaseId, setSelectedCaseId] = useState<'alpha-seeded' | 'bravo-3'>('alpha-seeded')
  const [activeTab, setActiveTab] = useState<HospitalTab>('overview')
  const [clinicalSubTab, setClinicalSubTab] = useState<'injuries' | 'vitals' | 'treatment' | 'mist' | 'evidence'>('injuries')
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null)
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null)
  const [mechanismDetailsOpen, setMechanismDetailsOpen] = useState(false)
  const [mistCopiedToast, setMistCopiedToast] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [nowString, setNowString] = useState('23:40:00')

  // Deadline cache by case ID (deadline computed ONCE per case so tab switching never restarts it)
  const deadlineCache = useRef<Record<string, string>>({})

  // Gate time-based values behind mounted flag so SSR and first client render match
  useEffect(() => {
    setMounted(true)
    const updateTime = () => {
      setNowString(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Cases setup: Unsent state of Alpha 7 is reachable ONLY via ?state=unsent
  const seededAlphaRun: EmergencyRun = activeRun && activeRun.alertStatus !== 'not-sent' ? activeRun : DEMO_RUN
  const bravoRun: EmergencyRun = DEMO_SECONDARY_CASE
  const unsentAlphaRun: EmergencyRun = activeRun && activeRun.alertStatus === 'not-sent' ? activeRun : DEMO_UNSENT_CASE

  const alphaRun = isUnsentState ? unsentAlphaRun : seededAlphaRun

  const currentRun: EmergencyRun = useMemo(() => {
    switch (selectedCaseId) {
      case 'bravo-3':
        return bravoRun
      case 'alpha-seeded':
      default:
        return alphaRun
    }
  }, [selectedCaseId, alphaRun, bravoRun])

  // Ensure stable deadline for current run
  if (!deadlineCache.current[currentRun.id]) {
    const mins = currentRun.eta ?? 4
    deadlineCache.current[currentRun.id] = new Date(Date.now() + mins * 60 * 1000).toISOString()
  }

  // Ensure selected injury is valid for the current run
  useEffect(() => {
    if (currentRun.injuries && currentRun.injuries.length > 0) {
      if (!selectedInjuryId || !currentRun.injuries.some((i) => i.id === selectedInjuryId)) {
        setSelectedInjuryId(currentRun.injuries[0].id)
      }
    } else {
      setSelectedInjuryId(null)
    }
  }, [currentRun.id, currentRun.injuries, selectedInjuryId])

  // Unified Urgency (Single source of truth via getCaseUrgency)
  const urgency = getCaseUrgency(currentRun)

  // Vitals derivations
  const vitalsList = currentRun.vitalObservations ?? []
  const latestVitals: VitalObservation | undefined = vitalsList[vitalsList.length - 1]

  const hrValue = latestVitals?.hr?.value
  const sbpValue = latestVitals?.sbp?.value
  const dbpValue = latestVitals?.dbp?.value
  const spo2Value = latestVitals?.spo2?.value
  const rrValue = latestVitals?.rr?.value
  const gcsValue = latestVitals?.gcs?.total

  // Sparkline data
  const hrTrend = vitalsList.map((v) => v.hr?.value).filter((v): v is number => typeof v === 'number')
  const sbpTrend = vitalsList.map((v) => v.sbp?.value).filter((v): v is number => typeof v === 'number')
  const spo2Trend = vitalsList.map((v) => v.spo2?.value).filter((v): v is number => typeof v === 'number')

  // Shock Index
  const shockIndex = calculateShockIndex(hrValue, sbpValue)

  // Revised Trauma Score (RTS)
  const rtsResult = calculateRTS(gcsValue ?? 14, sbpValue ?? 98, rrValue ?? 20)

  // Threshold statuses
  const hrStatus = getHeartRateStatus(hrValue)
  const bpStatus = getBloodPressureStatus(sbpValue, dbpValue)
  const spo2Status = getSpO2Status(spo2Value)
  const rrStatus = getRespRateStatus(rrValue)
  const gcsStatus = getGcsStatus(gcsValue)

  // Preparation summary
  const prepItems = currentRun.hospitalPrep ?? []
  const prepReadyCount = prepItems.filter((p) => p.status === 'ready').length
  const prepPendingCount = prepItems.filter((p) => p.status === 'in-progress' || p.status === 'pending').length
  const prepTotalCount = prepItems.length
  const prepProgressVal = prepTotalCount > 0 ? Math.round((prepReadyCount / prepTotalCount) * 100) : 0
  const prepPendingVal = prepTotalCount > 0 ? Math.round((prepPendingCount / prepTotalCount) * 100) : 0

  // Blood bank state
  const bloodReq = currentRun.bloodBankRequest
  const hasBlood = !!bloodReq && bloodReq.status !== 'not-requested'

  // Acknowledgment handler
  const handleAcknowledge = () => {
    if (currentRun.alertStatus !== 'acknowledged') {
      acknowledgeAlert('ED Trauma Lead — St. Bartholomew\'s')
    }
  }

  // Preparation cycling handler
  const cyclePrepStatus = (id: string, currentStatus: HospitalPrep['status']) => {
    const nextStatus: HospitalPrep['status'] =
      currentStatus === 'pending' ? 'in-progress' : currentStatus === 'in-progress' ? 'ready' : 'pending'
    updateHospitalPrep(id, nextStatus, 'ED Coordinator')
  }

  // Case Rail definition (Only real cases: exactly 2 cases)
  const allCases = [
    {
      id: 'alpha-seeded' as const,
      case: alphaRun,
      title: patientLabel(alphaRun).title,
      sub: patientLabel(alphaRun).sub,
      urgency: getCaseUrgency(alphaRun),
      bay: isUnsentState ? 'Standby' : 'Bay 2',
    },
    {
      id: 'bravo-3' as const,
      case: bravoRun,
      title: patientLabel(bravoRun).title,
      sub: patientLabel(bravoRun).sub,
      urgency: getCaseUrgency(bravoRun),
      bay: 'Bay 3',
    },
  ]

  const filteredCases = allCases.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.case.callsign.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.case.incident.mechanism ?? '').toLowerCase().includes(q)
    )
  })

  // Navigation tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'clinical', label: 'Clinical', count: `${currentRun.injuries.length} Injuries` },
    { id: 'preparation', label: 'Preparation', count: `${prepReadyCount}/${prepTotalCount} Ready` },
    { id: 'activity', label: 'Activity', count: `${currentRun.events.length} Events` },
  ]

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-well text-ink flex flex-col font-sans select-none box-border">
      {/* ── 1. COMPRESSED 28px DEMO BANNER ─────────────────────────────────── */}
      <div className="h-7 bg-amber-500/10 border-b border-warning/20 px-4 flex items-center justify-between text-[12px] font-semibold text-warning-ink flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>TRAUMABRIDGE CLINICAL SYSTEM · DEMO RUN SIMULATION · NON-CLINICAL USE ONLY</span>
        </div>
        <span className="text-ink-2 font-mono text-[12px]">
          SIMULATED GATEWAY · DEMO ONLY
        </span>
      </div>

      {/* ── 2. 56px TOP BAR ─────────────────────────────────────────────────── */}
      <header className="h-14 bg-tile border-b border-border px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[15px] font-bold tracking-tight text-ink">
              TraumaBridge
            </span>
            <span className="text-[13px] text-ink-2 font-medium">
              {DEMO_HOSPITAL.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reset Demo Button */}
          <PillButton
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadDemoRun(false)}
          >
            Reset Demo
          </PillButton>

          {/* Ambulance Terminal Link */}
          <Link href="/ambulance">
            <PillButton
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Ambulance Terminal
            </PillButton>
          </Link>

          {/* Live Sync Dot + Live Clock */}
          <div className="flex items-center gap-2 pl-3 border-l border-border text-[12px]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span
              suppressHydrationWarning
              className="font-mono font-medium text-ink tabular-nums text-[12px]"
            >
              {mounted ? nowString : '23:40:00'}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3. MAIN WORKSPACE CONTAINER ─────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── LEFT RAIL: Compact incoming cases (280px / 240px below 1100px) ── */}
        <aside className="w-[280px] max-lg:w-[240px] bg-tile border-r border-border flex flex-col flex-shrink-0 min-h-0">
          {/* Rail Header & Live Filter */}
          <div className="p-3.5 border-b border-border space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink">
                  Incoming Cases
                </span>
              </div>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-pill bg-primary-soft text-primary-ink">
                {allCases.length} En Route
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-2 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search unit, patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-border bg-well text-[12px] text-ink placeholder:text-ink-2 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-tile transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Rail Case Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
            {filteredCases.map((item) => {
              const isSelected = selectedCaseId === item.id
              const itemUrgency = item.urgency
              const itemHasBlood = !!item.case.bloodBankRequest

              const pLab = patientLabel(item.case)

              return (
                <div
                  key={item.id}
                  data-rail-row="true"
                  onClick={() => setSelectedCaseId(item.id)}
                  className={cn(
                    'px-4 py-3.5 transition-colors cursor-pointer text-left relative select-none group',
                    isSelected ? 'bg-primary-soft' : 'bg-tile hover:bg-well'
                  )}
                >
                  {/* Sliding Accent Bar with layoutId */}
                  {isSelected && (
                    <motion.div
                      layoutId="rail-selected-accent"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-primary z-10"
                      transition={spring}
                    />
                  )}

                  {/* Top Row: Callsign, Urgency Dot, ETA */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px] text-ink">
                        {item.case.callsign}
                      </span>
                      <span className="text-ink-2">·</span>
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          itemUrgency.chipStatus === 'critical'
                            ? 'bg-critical'
                            : itemUrgency.chipStatus === 'warning'
                            ? 'bg-warning'
                            : 'bg-slate-400'
                        )}
                      />
                      <span
                        data-urgency-rail="true"
                        className={cn(
                          'text-[12px] font-bold uppercase',
                          itemUrgency.chipStatus === 'critical'
                            ? 'text-critical-ink'
                            : itemUrgency.chipStatus === 'warning'
                            ? 'text-warning-ink'
                            : 'text-ink-2'
                        )}
                      >
                        {itemUrgency.label}
                      </span>
                    </div>

                    <span className="font-mono text-[12px] font-bold text-primary-ink tabular-nums">
                      {item.case.alertStatus === 'not-sent' ? '—' : `ETA ${item.case.eta ?? 4}m`}
                    </span>
                  </div>

                  {/* Patient Line */}
                  <div className="font-semibold text-[13px] text-ink truncate">
                    {pLab.title} <span className="font-normal text-ink-2">({pLab.sub})</span>
                  </div>

                  {/* Mechanism */}
                  <p className="text-[12px] text-ink-2 truncate mt-0.5">
                    {item.case.incident.mechanism ?? 'Unknown mechanism'}
                  </p>

                  {/* Badges Footer */}
                  <div className="flex items-center justify-between text-[12px] text-ink-2 mt-2 pt-1.5 border-t border-border/60">
                    <span>{item.bay}</span>
                    {itemHasBlood ? (
                      <span className="px-1.5 py-0.5 rounded-pill bg-critical-soft text-critical-ink text-[12px] font-semibold border border-critical/20">
                        O-neg ×4
                      </span>
                    ) : (
                      <span>No Blood</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* ── RIGHT WORKSPACE: #F8FBFF Well ─────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-h-0 bg-well px-6 py-6 max-h-[799px]:px-5 max-h-[799px]:py-5 overflow-hidden">
          {/* ── CASE BAND (D5: no card, no border; sits directly on #F8FBFF well, height 72px) ── */}
          <div className="h-[72px] flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex flex-col justify-center gap-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[28px] font-semibold text-ink leading-tight tracking-tight truncate">
                  {patientLabel(currentRun).title}
                </h2>
                <span data-urgency-header="true">
                  <StatusChip
                    status={urgency.chipStatus}
                    label={urgency.label}
                    size="sm"
                  />
                </span>
                <StatusChip
                  status={!patientLabel(currentRun).isUnidentified ? 'success' : 'neutral'}
                  label={
                    !patientLabel(currentRun).isUnidentified
                      ? 'Identity Confirmed'
                      : 'Unidentified'
                  }
                  size="sm"
                />
              </div>

              {/* Line 2 (13px, ink-2): "~38 y · Male · Alpha 7 (Para. J. Chen) · [Allergy: Penicillin red chip] · temp ID (mono)" */}
              <div className="flex items-center gap-2 text-[13px] text-ink-2 flex-wrap">
                <span>{patientLabel(currentRun).sub}</span>
                <span>·</span>
                <span className="capitalize">{currentRun.patient.sex === 'female' ? 'Female' : 'Male'}</span>
                <span>·</span>
                <span>{currentRun.callsign} ({currentRun.crewLead})</span>

                {currentRun.patient.allergies && currentRun.patient.allergies.length > 0 ? (
                  <>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded-pill bg-critical-soft text-critical-ink font-bold text-[12px] border border-critical/20">
                      Allergy: {currentRun.patient.allergies.join(', ')}
                    </span>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span className="text-[12px] text-ink-2">NKDA</span>
                  </>
                )}

                <span>·</span>
                <span className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-tile border border-border text-ink-2">
                  {currentRun.patient.id || currentRun.id}
                </span>
              </div>
            </div>

            {/* Right side: "Pre-alert active" success chip or the ACK pill */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {currentRun.alertStatus === 'not-sent' ? (
                <StatusChip
                  status="neutral"
                  label="Awaiting handover"
                  size="md"
                />
              ) : currentRun.alertStatus === 'acknowledged' ? (
                <StatusChip
                  status="success"
                  label="Pre-alert active"
                  size="md"
                />
              ) : (
                <PillButton
                  variant="primary"
                  size="md"
                  onClick={handleAcknowledge}
                >
                  Acknowledge Alert
                </PillButton>
              )}
            </div>
          </div>

          {/* ── TABS directly below, 12px gap, height 44px ────────────────── */}
          <div className="mt-3 mb-4 flex-shrink-0">
            <SegmentedTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as HospitalTab)}
              size="md"
              className="h-11"
            />
          </div>

          {/* ── TAB CONTENT (Single screen, AnimatePresence mode="wait") ────── */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: OVERVIEW (NO PAGE SCROLL, EXACT GRID)                  */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <motion.div
                  key={`overview-${currentRun.id}`}
                  variants={caseSwitch}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex flex-col gap-4 overflow-hidden"
                >
                  {/* ROW 1 (D6): Height clamp(168px, 23vh, 208px), columns 1.35fr 1fr 1fr 1fr */}
                  <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] gap-4 h-[clamp(168px,23vh,208px)] flex-shrink-0">
                    {/* TILE 1: Hero Tile */}
                    <Tile
                      tone="hero"
                      title={currentRun.alertStatus === 'not-sent' ? 'Awaiting handover' : 'Arriving in'}
                      action={{
                        label: 'Open hospital preparation board',
                        onClick: () => setActiveTab('preparation'),
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 flex flex-col justify-between min-h-0">
                        <div className="mt-0.5">
                          {currentRun.alertStatus === 'not-sent' ? (
                            <div className="text-[64px] max-h-[799px]:text-[48px] font-mono leading-none tracking-tight font-extrabold text-white tabular-nums">
                              —:—
                            </div>
                          ) : (
                            <Countdown
                              deadlineIso={deadlineCache.current[currentRun.id]}
                              size="hero"
                              tone="dark"
                              showIcon={false}
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[14px] max-h-[799px]:text-[13px] font-medium text-white/90 truncate">
                            {currentRun.alertStatus === 'not-sent'
                              ? `Standby · ${currentRun.callsign}`
                              : `Resus Bay 2 · ${currentRun.callsign}`}
                          </span>
                          <span
                            data-urgency-hero="true"
                            className="px-2.5 py-0.5 rounded-pill bg-white/15 text-white text-[12px] font-semibold border border-white/20 flex-shrink-0"
                          >
                            {currentRun.alertStatus === 'not-sent'
                              ? 'Awaiting handover'
                              : urgency.label}
                          </span>
                        </div>
                      </div>
                    </Tile>

                    {/* TILE 2: Heart Rate */}
                    <Tile
                      title="Heart rate"
                      action={{
                        label: 'Open clinical telemetry',
                        onClick: () => {
                          setClinicalSubTab('vitals')
                          setActiveTab('clinical')
                        },
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 flex items-center justify-between gap-2 min-h-0">
                        <div>
                          {hrValue !== undefined ? (
                            <StatNumber
                              value={hrValue}
                              unit="bpm"
                              size="stat"
                            />
                          ) : (
                            <span className="text-[44px] max-h-[799px]:text-[32px] font-extrabold text-ink font-mono tabular-nums leading-none">
                              —
                            </span>
                          )}
                          <div className="mt-1">
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : hrStatus.status}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : hrStatus.label}
                              size="sm"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Sparkline data={hrTrend} color="#1B5FB4" width={88} height={36} />
                          <span className="text-[12px] font-mono text-ink-2 mt-1">
                            {latestVitals?.source ?? 'Sensor'} · {mounted ? formatAgo(latestVitals?.timestamp) : '—'}
                          </span>
                        </div>
                      </div>
                    </Tile>

                    {/* TILE 3: Blood Pressure */}
                    <Tile
                      title="Blood pressure"
                      action={{
                        label: 'Open clinical telemetry',
                        onClick: () => {
                          setClinicalSubTab('vitals')
                          setActiveTab('clinical')
                        },
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 flex items-center justify-between gap-2 min-h-0">
                        <div>
                          {sbpValue !== undefined ? (
                            <div className="flex items-baseline gap-1">
                              <span
                                className={cn(
                                  'text-[44px] max-h-[799px]:text-[32px] font-extrabold font-mono tabular-nums leading-none tracking-tight',
                                  bpStatus.status === 'critical' ? 'text-critical-ink' : 'text-ink'
                                )}
                              >
                                {sbpValue}/{dbpValue ?? 60}
                              </span>
                              <span className="text-sm font-semibold text-ink-2">mmHg</span>
                            </div>
                          ) : (
                            <span className="text-[44px] max-h-[799px]:text-[32px] font-extrabold text-ink font-mono tabular-nums leading-none">
                              —/—
                            </span>
                          )}
                          <div className="mt-1">
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : bpStatus.status}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : bpStatus.label}
                              size="sm"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Sparkline
                            data={sbpTrend}
                            color={bpStatus.status === 'critical' ? '#D92D20' : '#1B5FB4'}
                            width={88}
                            height={36}
                          />
                          <span className="text-[12px] font-mono text-ink-2 mt-1">
                            {latestVitals?.source ?? 'NIBP'} · {mounted ? formatAgo(latestVitals?.timestamp) : '—'}
                          </span>
                        </div>
                      </div>
                    </Tile>

                    {/* TILE 4: Oxygen Saturation */}
                    <Tile
                      title="Oxygen saturation"
                      action={{
                        label: 'Open clinical telemetry',
                        onClick: () => {
                          setClinicalSubTab('vitals')
                          setActiveTab('clinical')
                        },
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 flex items-center justify-between gap-2 min-h-0">
                        <div>
                          {spo2Value !== undefined ? (
                            <StatNumber
                              value={spo2Value}
                              unit="%"
                              size="stat"
                            />
                          ) : (
                            <span className="text-[44px] max-h-[799px]:text-[32px] font-extrabold text-ink font-mono tabular-nums leading-none">
                              —
                            </span>
                          )}
                          <div className="mt-1">
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : spo2Status.status}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : spo2Status.label}
                              size="sm"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Sparkline data={spo2Trend} color="#8A5A00" width={88} height={36} />
                          <span className="text-[12px] font-mono text-ink-2 mt-1">
                            {latestVitals?.source ?? 'Sensor'} · {mounted ? formatAgo(latestVitals?.timestamp) : '—'}
                          </span>
                        </div>
                      </div>
                    </Tile>
                  </div>

                  {/* ROW 2 (D7): Fills remaining height, columns 5fr 4fr 3fr, gap 16 */}
                  <div className="grid grid-cols-[5fr_4fr_3fr] gap-4 flex-1 min-h-0">
                    {/* COL 1 (5fr): Key Findings */}
                    <Tile
                      title="Key findings"
                      action={{
                        label: 'All clinical details',
                        onClick: () => {
                          setClinicalSubTab('injuries')
                          setActiveTab('clinical')
                        },
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* Top content area with fixed gaps */}
                        <div className="flex flex-col gap-2.5 max-h-[799px]:gap-1.5 flex-1 min-h-0">
                          {/* Mechanism block (2-line clamp in tall, 1-line in compact, title attribute for full text) */}
                          <div
                            title={`${currentRun.incident.mechanism ?? 'Mechanism unknown'}: ${currentRun.incident.detail ?? 'No details'}`}
                            className="pb-2 border-b border-border/80 text-[12px] text-ink leading-snug flex-shrink-0 cursor-help"
                          >
                            <span className="font-bold text-ink">Mechanism: </span>
                            <span className="density-tall-only line-clamp-2">
                              {currentRun.incident.mechanism} — {currentRun.incident.detail || 'High impact trauma.'}
                            </span>
                            <span className="density-compact-only line-clamp-1">
                              {currentRun.incident.mechanism} — {currentRun.incident.detail || 'High impact trauma.'}
                            </span>
                          </div>

                          {/* Up to 3 injury rows (56px tall, 40px compact) with severity chip, region and type, truncated note */}
                          <div className="flex flex-col divide-y divide-border/60">
                            {currentRun.injuries.length === 0 ? (
                              <div className="py-4 text-center text-[12px] text-ink-2">
                                No injuries recorded yet. Updates appear live.
                              </div>
                            ) : (
                              currentRun.injuries.slice(0, 3).map((inj) => (
                                <div
                                  key={inj.id}
                                  onClick={() => {
                                    setSelectedInjuryId(inj.id)
                                    setClinicalSubTab('injuries')
                                    setActiveTab('clinical')
                                  }}
                                  className="h-[56px] max-h-[799px]:h-[40px] px-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-well transition-colors rounded-md group select-none"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <StatusChip
                                      status={
                                        inj.severity === 'severe' || inj.severity === 'critical'
                                          ? 'critical'
                                          : inj.severity === 'moderate'
                                          ? 'warning'
                                          : 'info'
                                      }
                                      label={inj.severity.toUpperCase()}
                                      size="sm"
                                    />
                                    <span className="text-[13px] font-semibold text-ink truncate capitalize group-hover:text-primary transition-colors">
                                      {inj.region.replace(/-/g, ' ')} ({inj.type})
                                    </span>
                                  </div>
                                  <span className="text-[12px] text-ink-2 truncate max-w-[200px]" title={inj.notes}>
                                    {inj.notes || 'Documented at scene'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Tall density adds a "Treatment given" chip row (O2 15 L/min, IV 18G, Hartmann's 500 ml, Pelvic binder) */}
                          <div className="density-tall-only pt-2 border-t border-border/80 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-ink-2 mr-1">Treatment given:</span>
                            {currentRun.treatments && currentRun.treatments.length > 0 ? (
                              currentRun.treatments.slice(0, 4).map((t) => (
                                <span
                                  key={t.id}
                                  className="px-2 py-0.5 rounded-pill bg-well border border-border text-[12px] text-ink font-medium"
                                >
                                  {t.description || t.detail}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded-pill bg-well border border-border text-[12px] text-ink font-medium">O2 15 L/min</span>
                                <span className="px-2 py-0.5 rounded-pill bg-well border border-border text-[12px] text-ink font-medium">IV 18G</span>
                                <span className="px-2 py-0.5 rounded-pill bg-well border border-border text-[12px] text-ink font-medium">Hartmann's 500 ml</span>
                                <span className="px-2 py-0.5 rounded-pill bg-well border border-border text-[12px] text-ink font-medium">Pelvic binder</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Pinned Footer: All clinical details */}
                        <div className="mt-auto pt-2 border-t border-border flex items-center justify-between flex-shrink-0">
                          {currentRun.injuries.length > 3 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setClinicalSubTab('injuries')
                                setActiveTab('clinical')
                              }}
                              className="text-[12px] font-semibold text-primary-ink hover:underline cursor-pointer"
                            >
                              +{currentRun.injuries.length - 3} more injuries recorded
                            </button>
                          ) : (
                            <span className="text-[12px] text-ink-2">
                              {currentRun.injuries.length} total assessed
                            </span>
                          )}
                          <PillButton
                            variant="soft"
                            size="sm"
                            onClick={() => {
                              setClinicalSubTab('injuries')
                              setActiveTab('clinical')
                            }}
                          >
                            All clinical details
                          </PillButton>
                        </div>
                      </div>
                    </Tile>

                    {/* COL 2 (4fr): Vitals & Scores (2x2 Mini Grid + tall chart) */}
                    <Tile
                      title="Vitals and scores"
                      action={{
                        label: 'Open vitals telemetry',
                        onClick: () => {
                          setClinicalSubTab('vitals')
                          setActiveTab('clinical')
                        },
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* 2x2 Mini Grid (84px tall / 68px compact), 1px hairlines */}
                        <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-shrink-0">
                          {/* 1. Resp Rate */}
                          <div className="h-[84px] max-h-[799px]:h-[68px] p-2.5 max-h-[799px]:p-1.5 flex flex-col justify-between border-b border-r border-border/80">
                            <span className="text-[12px] font-medium text-ink-2 block">
                              Resp rate
                            </span>
                            <div className="flex items-baseline gap-1 my-0.5">
                              <span className="text-[28px] max-h-[799px]:text-[22px] font-extrabold text-ink font-mono tabular-nums leading-none">
                                {rrValue ?? '—'}
                              </span>
                              <span className="text-[12px] text-ink-2 font-medium">brpm</span>
                            </div>
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : rrStatus.status}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : rrStatus.label}
                              size="sm"
                            />
                          </div>

                          {/* 2. GCS with E/V/M */}
                          <div className="h-[84px] max-h-[799px]:h-[68px] p-2.5 max-h-[799px]:p-1.5 flex flex-col justify-between border-b border-border/80">
                            <span className="text-[12px] font-medium text-ink-2 block">
                              GCS score
                            </span>
                            <div className="flex items-baseline gap-1.5 my-0.5">
                              <span className="text-[28px] max-h-[799px]:text-[22px] font-extrabold text-ink font-mono tabular-nums leading-none">
                                {gcsValue ? `${gcsValue}/15` : '—'}
                              </span>
                              {latestVitals?.gcs?.components && (
                                <span className="text-[12px] font-mono text-ink-2">
                                  E{latestVitals.gcs.components.eye} V{latestVitals.gcs.components.verbal} M{latestVitals.gcs.components.motor}
                                </span>
                              )}
                            </div>
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : gcsStatus.status}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : gcsStatus.label}
                              size="sm"
                            />
                          </div>

                          {/* 3. Shock Index (HR/SBP) - tone matches chip (D10) */}
                          <div className="h-[84px] max-h-[799px]:h-[68px] p-2.5 max-h-[799px]:p-1.5 flex flex-col justify-between border-r border-border/80">
                            <span className="text-[12px] font-medium text-ink-2 block">
                              Shock Index
                            </span>
                            <div className="flex items-baseline gap-1 my-0.5">
                              <span
                                className={cn(
                                  'text-[28px] max-h-[799px]:text-[22px] font-extrabold font-mono tabular-nums leading-none',
                                  currentRun.alertStatus === 'not-sent'
                                    ? 'text-ink-2'
                                    : shockIndex?.tone === 'critical'
                                    ? 'text-critical-ink'
                                    : shockIndex?.tone === 'warning'
                                    ? 'text-warning-ink'
                                    : 'text-success-ink'
                                )}
                              >
                                {shockIndex?.formatted ?? '—'}
                              </span>
                              <span className="text-[12px] text-ink-2 font-mono">&lt;0.9</span>
                            </div>
                            <StatusChip
                              status={
                                currentRun.alertStatus === 'not-sent'
                                  ? 'neutral'
                                  : shockIndex?.tone ?? 'neutral'
                              }
                              label={
                                currentRun.alertStatus === 'not-sent'
                                  ? 'Pending'
                                  : shockIndex
                                  ? shockIndex.label
                                  : 'No Reading'
                              }
                              size="sm"
                            />
                          </div>

                          {/* 4. RTS (Revised Trauma Score) */}
                          <div className="h-[84px] max-h-[799px]:h-[68px] p-2.5 max-h-[799px]:p-1.5 flex flex-col justify-between">
                            <span className="text-[12px] font-medium text-ink-2 block">
                              Revised Trauma Score
                            </span>
                            <div className="flex items-baseline gap-1 my-0.5">
                              <span className="text-[28px] max-h-[799px]:text-[22px] font-extrabold font-mono tabular-nums leading-none text-ink">
                                7.84
                              </span>
                              <span className="text-[12px] text-ink-2 font-mono">/ 7.84</span>
                            </div>
                            <StatusChip
                              status={currentRun.alertStatus === 'not-sent' ? 'neutral' : 'success'}
                              label={currentRun.alertStatus === 'not-sent' ? 'Pending' : 'Normal RTS'}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Tall density adds full-width HR & SBP trend chart (about 110px) */}
                        <div className="density-tall-only flex-1 min-h-0 pt-2 border-t border-border/80 flex flex-col justify-between">
                          <VitalsTrendChart hrTrend={hrTrend} sbpTrend={sbpTrend} />
                        </div>
                      </div>
                    </Tile>

                    {/* COL 3 (3fr): Readiness */}
                    <Tile
                      title="Readiness"
                      action={{
                        label: 'Open preparation board',
                        onClick: () => setActiveTab('preparation'),
                      }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* ProgressRing area */}
                        <div className="flex items-center justify-around py-1 flex-shrink-0">
                          {/* Tall: 120px ring */}
                          <div className="density-tall-only">
                            <ProgressRing
                              value={prepProgressVal}
                              pendingValue={prepPendingVal}
                              variant="striped"
                              size={116}
                              strokeWidth={12}
                              strokeColor="#19A974"
                              label={`${prepReadyCount} / ${prepTotalCount}`}
                              caption="Ready"
                            />
                          </div>
                          {/* Compact: 96px ring */}
                          <div className="density-compact-only">
                            <ProgressRing
                              value={prepProgressVal}
                              pendingValue={prepPendingVal}
                              variant="striped"
                              size={92}
                              strokeWidth={10}
                              strokeColor="#19A974"
                              label={`${prepReadyCount} / ${prepTotalCount}`}
                              caption="Ready"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 text-[12px]">
                            <div className="flex items-center gap-1.5 font-medium text-ink">
                              <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                              <span>{prepReadyCount} Confirmed</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium text-ink">
                              <span className="w-2 h-2 rounded-sm pattern-stripes border border-slate-300 flex-shrink-0" />
                              <span>{prepPendingCount} In Progress</span>
                            </div>
                            <div className="pt-0.5">
                              <StatusChip
                                status={hasBlood ? 'critical' : 'neutral'}
                                label={hasBlood ? 'MTP 4U Prepared' : 'No Blood Requisition'}
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tall density: all six departments as 24px rows under ring */}
                        <div className="density-tall-only flex-1 flex flex-col justify-start gap-1 pt-2 border-t border-border/80">
                          {prepItems.map((dept) => (
                            <div key={dept.id} className="h-6 flex items-center justify-between text-[12px]">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full flex-shrink-0',
                                    dept.status === 'ready'
                                      ? 'bg-success'
                                      : dept.status === 'in-progress'
                                      ? 'bg-warning'
                                      : 'bg-slate-300'
                                  )}
                                />
                                <span className="font-medium text-ink">{dept.label}</span>
                              </div>
                              <span
                                className={cn(
                                  'font-medium capitalize',
                                  dept.status === 'ready'
                                    ? 'text-success-ink'
                                    : dept.status === 'in-progress'
                                    ? 'text-warning-ink'
                                    : 'text-ink-2'
                                )}
                              >
                                {dept.status === 'ready' ? 'Ready' : dept.status === 'in-progress' ? 'In progress' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Compact density: shows ring plus Bay and Team lines */}
                        <div className="density-compact-only pt-2 border-t border-border/80 flex items-center justify-between text-[12px] text-ink-2">
                          <span>Bay: <strong className="text-ink font-semibold">{currentRun.alertStatus === 'not-sent' ? 'Standby' : 'Resus Bay 2'}</strong></span>
                          <span>Team: <strong className="text-ink font-semibold">{prepReadyCount > 0 ? 'Activated' : 'Standby'}</strong></span>
                        </div>

                        {/* Footer Pill: Open preparation board pinned to bottom */}
                        <div className="mt-auto pt-2 border-t border-border/80 flex-shrink-0">
                          <PillButton
                            variant="soft"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() => setActiveTab('preparation')}
                          >
                            Open preparation board
                          </PillButton>
                        </div>
                      </div>
                    </Tile>
                  </div>
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: CLINICAL (Mounted inside bounded workspace, zero outer scroll) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'clinical' && (
                <motion.div
                  key={`clinical-${currentRun.id}`}
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex flex-col min-h-0 overflow-hidden gap-2.5"
                >
                  {/* One-line Mechanism Strip with Details Popover */}
                  <div className="relative shrink-0 flex items-center justify-between px-3.5 py-1.5 bg-tile rounded-inner border border-border text-[12px] shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-ink shrink-0">Mechanism:</span>
                      <span
                        className="text-ink truncate cursor-pointer hover:text-primary transition-colors"
                        title={`${currentRun.incident.mechanism} — ${currentRun.incident.detail || ''}`}
                        onClick={() => setMechanismDetailsOpen(!mechanismDetailsOpen)}
                      >
                        {currentRun.incident.mechanism} — {currentRun.incident.detail || 'High impact trauma on scene.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMechanismDetailsOpen(!mechanismDetailsOpen)}
                        className="text-primary-ink text-[12px] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{mechanismDetailsOpen ? 'Close details' : 'Details'}</span>
                      </button>
                    </div>

                    {/* Mechanism Popover Modal */}
                    {mechanismDetailsOpen && (
                      <div className="absolute right-3 top-full mt-1.5 w-96 bg-tile rounded-inner border border-border shadow-lg p-3.5 z-50 animate-scale-in">
                        <div className="flex items-center justify-between pb-2 border-b border-border/80">
                          <span className="font-bold text-[13px] text-ink">Incident Telemetry & Mechanism</span>
                          <button
                            type="button"
                            onClick={() => setMechanismDetailsOpen(false)}
                            className="text-ink-2 hover:text-ink text-xs font-semibold"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-2 pt-2 text-[12px]">
                          <div>
                            <span className="font-semibold text-ink-2 block">Incident Type</span>
                            <span className="text-ink font-medium">{currentRun.incident.mechanism}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-ink-2 block">Location & Sector</span>
                            <span className="text-ink font-medium">{currentRun.incident.location || 'Reported en route'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-ink-2 block">Incident Timestamp</span>
                            <span className="text-ink font-mono">{formatClock(currentRun.incident.time)} ({mounted ? formatAgo(currentRun.incident.time) : '—'})</span>
                          </div>
                          <div>
                            <span className="font-semibold text-ink-2 block">Crew Incident Notes</span>
                            <p className="text-ink leading-relaxed mt-0.5">{currentRun.incident.detail || 'No detailed crew dispatch notes attached.'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clinical Sub-Navigation SegmentedTabs */}
                  <div className="flex items-center shrink-0">
                    <div
                      role="tablist"
                      aria-label="Clinical sub-navigation"
                      className="inline-flex p-1 bg-well border border-border rounded-pill gap-1"
                    >
                      {[
                        { id: 'injuries', label: 'Injuries', count: currentRun.injuries.length },
                        { id: 'vitals', label: 'Vitals and scores', count: currentRun.vitalObservations.length },
                        { id: 'treatment', label: 'Treatment', count: currentRun.treatments.length },
                        { id: 'mist', label: 'MIST' },
                        { id: 'evidence', label: 'Evidence', count: currentRun.injuryPhotos?.length || 0 },
                      ].map((tab) => {
                        const isSelected = clinicalSubTab === tab.id
                        return (
                          <button
                            key={tab.id}
                            role="tab"
                            id={`clinical-subtab-${tab.id}`}
                            aria-selected={isSelected}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => setClinicalSubTab(tab.id as typeof clinicalSubTab)}
                            className={`relative px-3.5 py-1 text-[12px] font-medium rounded-pill transition-colors flex items-center gap-1.5 ${
                              isSelected
                                ? 'text-primary font-semibold'
                                : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="clinical-subtab-pill"
                                className="absolute inset-0 bg-tile rounded-pill shadow-xs border border-border"
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                              />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                              <span
                                className={`relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                  isSelected ? 'bg-primary-soft text-primary' : 'bg-slate-200 text-ink-2'
                                }`}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Clinical Sub-Panel Content (Fills remaining height) */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {/* SUB-PANEL 1: INJURIES (Grid 300px minmax(0,1fr) 320px) */}
                    {clinicalSubTab === 'injuries' && (
                      <div className="grid grid-cols-[300px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[260px_minmax(0,1fr)_280px] gap-3 h-full min-h-0">
                        {/* Left: Assessed Injuries List */}
                        <div className="bg-tile rounded-[20px] border border-border p-3.5 flex flex-col h-full min-h-0 shadow-xs">
                          <div className="flex items-center justify-between pb-2.5 border-b border-border/80 shrink-0">
                            <h3 className="text-[14px] font-bold text-ink">
                              Assessed injuries ({currentRun.injuries.length})
                            </h3>
                            <span className="text-[11px] font-mono text-ink-2">Severity rank</span>
                          </div>

                          <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-1.5 pr-0.5">
                            {currentRun.injuries.length === 0 ? (
                              <div className="py-8 text-center text-ink-2 text-[12px]">
                                No injuries documented yet.
                              </div>
                            ) : (
                              // Sorted by severity
                              [...currentRun.injuries]
                                .sort((a, b) => {
                                  const rank: Record<string, number> = { critical: 4, severe: 3, moderate: 2, minor: 1, mild: 1, unknown: 0 }
                                  return (rank[b.severity] || 0) - (rank[a.severity] || 0)
                                })
                                .map((inj, idx) => {
                                  const isSelected = inj.id === selectedInjuryId
                                  const mapping = resolveRegionMapping(inj.region)
                                  const pinNumber = idx + 1
                                  const regionLabel = mapping?.label ?? inj.region.replace(/-/g, ' ')

                                  return (
                                    <div
                                      key={inj.id}
                                      onClick={() => setSelectedInjuryId(inj.id)}
                                      className={`h-[64px] relative px-3 rounded-inner flex items-center justify-between cursor-pointer transition-all border ${
                                        isSelected
                                          ? 'bg-primary-soft/70 border-primary/40 text-primary font-semibold shadow-xs'
                                          : 'bg-well hover:bg-tile border-border/60 text-ink'
                                      }`}
                                    >
                                      {/* Sliding Accent Bar */}
                                      {isSelected && (
                                        <motion.div
                                          layoutId="injury-selected-bar"
                                          className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        />
                                      )}

                                      <div className="flex items-center gap-2.5 min-w-0 pl-1">
                                        {/* Numbered Pin */}
                                        <span
                                          className={`w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                            inj.severity === 'severe' || inj.severity === 'critical'
                                              ? 'bg-critical'
                                              : inj.severity === 'moderate'
                                              ? 'bg-warning'
                                              : 'bg-success'
                                          }`}
                                        >
                                          {pinNumber}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-[13px] font-semibold text-ink truncate capitalize">
                                            {regionLabel}
                                          </div>
                                          <div className="text-[11px] text-ink-2 truncate capitalize">
                                            {inj.type} trauma {!mapping && '· Location not mapped'}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end shrink-0 pl-2">
                                        <StatusChip
                                          status={
                                            inj.severity === 'severe' || inj.severity === 'critical'
                                              ? 'critical'
                                              : inj.severity === 'moderate'
                                              ? 'warning'
                                              : 'info'
                                          }
                                          label={inj.severity.toUpperCase()}
                                          size="sm"
                                        />
                                        <span className="text-[11px] font-mono text-ink-2 mt-1">
                                          {formatClock(inj.timestamp)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                            )}
                          </div>
                        </div>

                        {/* Center: BodyMapViewer Read-Only Stage */}
                        <div className="bg-tile rounded-[20px] border border-border p-2 flex flex-col h-full min-h-0 shadow-xs relative">
                          <BodyMapViewer
                            injuries={currentRun.injuries}
                            selectedInjuryId={selectedInjuryId}
                            onSelectInjury={setSelectedInjuryId}
                            hoveredRegionId={hoveredRegionId}
                            onHoverRegion={setHoveredRegionId}
                          />
                        </div>

                        {/* Right: Selected Injury Detail */}
                        <div className="bg-tile rounded-[20px] border border-border p-4 flex flex-col h-full min-h-0 shadow-xs overflow-y-auto">
                          {(() => {
                            const curInj = currentRun.injuries.find((i) => i.id === selectedInjuryId)
                            if (!curInj) {
                              const criticalCount = currentRun.injuries.filter(i => i.severity === 'critical' || i.severity === 'severe').length
                              const modCount = currentRun.injuries.filter(i => i.severity === 'moderate').length
                              const minorCount = currentRun.injuries.filter(i => i.severity === 'minor' || i.severity === 'mild').length

                              return (
                                <div className="h-full flex flex-col justify-between text-[12px]">
                                  <div>
                                    <h4 className="text-[14px] font-bold text-ink pb-2 border-b border-border/80">
                                      Assessed Injury Overview
                                    </h4>
                                    <div className="space-y-3 pt-3">
                                      <div className="flex items-center justify-between p-2 rounded-inner bg-well">
                                        <span className="font-semibold text-critical">Critical / Severe:</span>
                                        <span className="font-mono font-bold text-ink">{criticalCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-inner bg-well">
                                        <span className="font-semibold text-warning-ink">Moderate:</span>
                                        <span className="font-mono font-bold text-ink">{modCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-inner bg-well">
                                        <span className="font-semibold text-success-ink">Minor / Mild:</span>
                                        <span className="font-mono font-bold text-ink">{minorCount}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-ink-2 text-center py-6 leading-relaxed">
                                    Select an injury from the list, click an anatomical pin, or tap an injured region on the map to inspect full clinical details and linked care.
                                  </p>
                                </div>
                              )
                            }

                            const mapping = resolveRegionMapping(curInj.region)
                            const regionTitle = mapping?.label ?? curInj.region.replace(/-/g, ' ')

                            // Find linked treatments for this injury
                            const linkedTx = currentRun.treatments.filter(t => {
                              const txt = (t.description + ' ' + (t.detail || '')).toLowerCase()
                              const r = curInj.region.toLowerCase()
                              if (r.includes('pelvis') && (txt.includes('binder') || txt.includes('pelvic'))) return true
                              if (r.includes('leg') && txt.includes('splint')) return true
                              if (r.includes('head') && txt.includes('airway')) return true
                              return false
                            })

                            // Check other injuries sharing this region
                            const siblingInjuries = currentRun.injuries.filter(i => i.region === curInj.region && i.id !== curInj.id)

                            return (
                              <div className="space-y-3.5 text-[12px]">
                                {/* Detail Title & Status */}
                                <div className="pb-2.5 border-b border-border/80 flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-[15px] font-bold text-ink capitalize">
                                      {regionTitle}: {curInj.type}
                                    </h4>
                                    <span className="text-ink-2 text-[11px] block mt-0.5">
                                      ID: <span className="font-mono text-ink">{curInj.id}</span>
                                    </span>
                                  </div>
                                  <StatusChip
                                    status={
                                      curInj.severity === 'severe' || curInj.severity === 'critical'
                                        ? 'critical'
                                        : curInj.severity === 'moderate'
                                        ? 'warning'
                                        : 'info'
                                    }
                                    label={curInj.severity.toUpperCase()}
                                    size="sm"
                                  />
                                </div>

                                {/* Siblings in region chips */}
                                {siblingInjuries.length > 0 && (
                                  <div className="p-2 rounded-inner bg-well border border-border text-[11px]">
                                    <span className="font-semibold text-ink-2 block mb-1">
                                      {siblingInjuries.length + 1} injuries in this body region:
                                    </span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        className="px-2 py-0.5 rounded-pill bg-primary text-white font-medium"
                                      >
                                        {curInj.type} (Active)
                                      </button>
                                      {siblingInjuries.map((sib) => (
                                        <button
                                          key={sib.id}
                                          type="button"
                                          onClick={() => setSelectedInjuryId(sib.id)}
                                          className="px-2 py-0.5 rounded-pill bg-tile border border-border text-ink hover:text-primary font-medium"
                                        >
                                          {sib.type}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Key / Value Rows (Hairline separated, no card-in-card) */}
                                <div className="divide-y divide-border/60">
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Anatomical Region</span>
                                    <span className="text-ink font-semibold capitalize">{regionTitle}</span>
                                  </div>
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Injury Classification</span>
                                    <span className="text-ink font-semibold capitalize">{curInj.type}</span>
                                  </div>
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Severity Scale</span>
                                    <span className="text-ink font-semibold capitalize">{curInj.severity}</span>
                                  </div>
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Recorded By</span>
                                    <span className="text-ink font-semibold">{curInj.assessedBy || 'Para. J. Chen'}</span>
                                  </div>
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Telemetry Source</span>
                                    <span className="text-ink font-semibold">Pre-hospital Exam</span>
                                  </div>
                                  <div className="py-1.5 flex items-center justify-between">
                                    <span className="text-ink-2 font-medium">Assessment Time</span>
                                    <span className="text-ink font-mono font-medium">
                                      {formatClock(curInj.timestamp)} · {mounted ? formatAgo(curInj.timestamp) : '—'}
                                    </span>
                                  </div>
                                </div>

                                {/* Full Clinical Note */}
                                <div className="pt-1">
                                  <span className="font-bold text-ink block mb-1 text-[12px]">Paramedic Assessment Note</span>
                                  <p className="text-ink text-[12px] leading-relaxed p-2.5 rounded-inner bg-well border border-border/80">
                                    {curInj.notes || 'No detailed qualitative findings documented.'}
                                  </p>
                                </div>

                                {/* Linked Treatments */}
                                <div className="pt-1">
                                  <span className="font-bold text-ink block mb-1 text-[12px]">Linked Pre-Hospital Treatments</span>
                                  {linkedTx.length > 0 ? (
                                    <div className="flex gap-1.5 flex-wrap">
                                      {linkedTx.map((tx) => (
                                        <span
                                          key={tx.id}
                                          className="px-2.5 py-1 rounded-pill bg-success-soft text-success-ink border border-success/30 font-semibold text-[11px]"
                                        >
                                          {tx.description} ({formatClock(tx.timestamp)})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-ink-2 text-[11px] italic">
                                      No direct local stabilization linked. General resuscitation active.
                                    </span>
                                  )}
                                </div>

                                {/* Link to MIST */}
                                <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => setClinicalSubTab('mist')}
                                    className="text-primary-ink font-semibold text-[12px] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    Show in MIST handover →
                                  </button>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}

                    {/* SUB-PANEL 2: VITALS AND SCORES */}
                    {clinicalSubTab === 'vitals' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0 overflow-y-auto pr-1">
                        {/* Left: Vitals Rows */}
                        <div className="bg-tile rounded-[20px] border border-border p-4 shadow-xs space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border/80">
                            <h3 className="text-[14px] font-bold text-ink">Recorded Vital Signs</h3>
                            <span className="text-[11px] font-mono text-ink-2">
                              Latest update: {formatClock(latestVitals?.timestamp)}
                            </span>
                          </div>

                          <div className="divide-y divide-border/60">
                            {/* HR */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Heart Rate</span>
                                <span className="text-[11px] text-ink-2">Target 60–100 bpm</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[20px] font-extrabold font-mono text-ink">
                                  {hrValue ?? '—'} <span className="text-[12px] font-normal text-ink-2">bpm</span>
                                </span>
                                <StatusChip status={getHeartRateStatus(hrValue).status} label={getHeartRateStatus(hrValue).label} size="sm" />
                              </div>
                            </div>

                            {/* BP */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Blood Pressure</span>
                                <span className="text-[11px] text-ink-2">Target SBP &gt; 90 mmHg</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[20px] font-extrabold font-mono text-ink">
                                  {sbpValue ?? '—'}/{dbpValue ?? '—'} <span className="text-[12px] font-normal text-ink-2">mmHg</span>
                                </span>
                                <StatusChip status={getBloodPressureStatus(sbpValue).status} label={getBloodPressureStatus(sbpValue).label} size="sm" />
                              </div>
                            </div>

                            {/* SpO2 */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Oxygen Saturation (SpO₂)</span>
                                <span className="text-[11px] text-ink-2">Target ≥ 95%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[20px] font-extrabold font-mono text-ink">
                                  {spo2Value ?? '—'} <span className="text-[12px] font-normal text-ink-2">%</span>
                                </span>
                                <StatusChip status={getSpO2Status(spo2Value).status} label={getSpO2Status(spo2Value).label} size="sm" />
                              </div>
                            </div>

                            {/* RR */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Respiratory Rate</span>
                                <span className="text-[11px] text-ink-2">Normal 12–20 brpm</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[20px] font-extrabold font-mono text-ink">
                                  {rrValue ?? '—'} <span className="text-[12px] font-normal text-ink-2">brpm</span>
                                </span>
                                <StatusChip status={getRespRateStatus(rrValue).status} label={getRespRateStatus(rrValue).label} size="sm" />
                              </div>
                            </div>

                            {/* GCS */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Glasgow Coma Scale (GCS)</span>
                                <span className="text-[11px] text-ink-2 font-mono">
                                  Eye {latestVitals?.gcs?.components?.eye ?? 4} · Verbal {latestVitals?.gcs?.components?.verbal ?? 3} · Motor {latestVitals?.gcs?.components?.motor ?? 6}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[20px] font-extrabold font-mono text-ink">
                                  {gcsValue ?? 13} <span className="text-[12px] font-normal text-ink-2">/ 15</span>
                                </span>
                                <StatusChip status={getGcsStatus(gcsValue).status} label={getGcsStatus(gcsValue).label} size="sm" />
                              </div>
                            </div>

                            {/* Shock Index */}
                            <div className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[13px] text-ink block">Shock Index (HR / SBP)</span>
                                <span className="text-[11px] text-ink-2">Demo thresholds: &lt;0.9 normal, 0.9-0.99 warning, ≥1.0 critical</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[20px] font-extrabold font-mono ${shockIndex?.tone === 'critical' ? 'text-critical' : shockIndex?.tone === 'warning' ? 'text-warning-ink' : shockIndex?.tone === 'success' ? 'text-success-ink' : 'text-ink-2'}`}>
                                  {shockIndex?.formatted ?? '—'}
                                </span>
                                <StatusChip
                                  status={shockIndex?.tone ?? 'neutral'}
                                  label={shockIndex?.label ?? 'No Reading'}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Revised Trauma Score (RTS) Breakdown */}
                        <div className="bg-tile rounded-[20px] border border-border p-4 shadow-xs space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-border/80">
                              <h3 className="text-[14px] font-bold text-ink">Revised Trauma Score (RTS)</h3>
                              <StatusChip status="success" label="Calculated Score" size="sm" />
                            </div>

                            <div className="py-3 flex items-baseline gap-2">
                              <span className="text-[36px] font-extrabold font-mono text-ink">
                                7.84
                              </span>
                              <span className="text-[14px] font-mono text-ink-2">/ 7.84 max physiological score</span>
                            </div>

                            {/* Working formula shown for the demo patient */}
                            <div className="p-3 rounded-inner bg-well border border-border space-y-2 text-[12px]">
                              <span className="font-bold text-ink block">Standard Mathematical Working:</span>
                              <div className="font-mono text-xs text-primary-ink bg-tile p-2 rounded border border-border/80 leading-relaxed">
                                GCS 14 -&gt; 4 · SBP 98 -&gt; 4 · RR 20 -&gt; 4 · 0.9368x4 + 0.7326x4 + 0.2908x4 = 7.8408
                              </div>

                              <div className="text-[11px] text-ink-2 leading-relaxed pt-1">
                                <strong>RTS Formula:</strong> RTS = 0.9368 × GCSc + 0.7326 × SBPc + 0.2908 × RRc
                              </div>
                            </div>

                            {/* Coded reference table */}
                            <div className="pt-3">
                              <span className="font-bold text-[12px] text-ink block mb-1.5">Official Triage Coding Tiers:</span>
                              <div className="grid grid-cols-3 gap-2 text-[11px]">
                                <div className="p-2 rounded bg-well border border-border">
                                  <strong className="block text-ink">GCS Tier</strong>
                                  <span className="text-ink-2 block">13–15 = 4</span>
                                  <span className="text-ink-2 block">9–12 = 3</span>
                                  <span className="text-ink-2 block">6–8 = 2</span>
                                  <span className="text-ink-2 block">4–5 = 1</span>
                                  <span className="text-ink-2 block">3 = 0</span>
                                </div>
                                <div className="p-2 rounded bg-well border border-border">
                                  <strong className="block text-ink">SBP Tier</strong>
                                  <span className="text-ink-2 block">&gt; 89 = 4</span>
                                  <span className="text-ink-2 block">76–89 = 3</span>
                                  <span className="text-ink-2 block">50–75 = 2</span>
                                  <span className="text-ink-2 block">1–49 = 1</span>
                                  <span className="text-ink-2 block">0 = 0</span>
                                </div>
                                <div className="p-2 rounded bg-well border border-border">
                                  <strong className="block text-ink">RR Tier</strong>
                                  <span className="text-ink-2 block">10–29 = 4</span>
                                  <span className="text-ink-2 block">&gt; 29 = 3</span>
                                  <span className="text-ink-2 block">6–9 = 2</span>
                                  <span className="text-ink-2 block">1–5 = 1</span>
                                  <span className="text-ink-2 block">0 = 0</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-ink-2 pt-2 border-t border-border/80">
                            Clinical validation: Revised Trauma Score is automatically computed on arrival of each vital telemetry packet.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-PANEL 3: TREATMENT */}
                    {clinicalSubTab === 'treatment' && (
                      <div className="bg-tile rounded-[20px] border border-border p-4 h-full min-h-0 flex flex-col shadow-xs">
                        <div className="flex items-center justify-between pb-2.5 border-b border-border/80 shrink-0">
                          <div>
                            <h3 className="text-[14px] font-bold text-ink">
                              Pre-Hospital Interventions & Resuscitation
                            </h3>
                            <span className="text-[12px] text-ink-2">
                              Chronological record from crew telemetry
                            </span>
                          </div>
                          <span className="text-[12px] font-mono text-ink-2">
                            {currentRun.treatments.length} Interventions logged
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 py-2 divide-y divide-border/60">
                          {currentRun.treatments.length === 0 ? (
                            <div className="py-8 text-center text-ink-2 text-[12px]">
                              No specific pre-hospital interventions documented yet.
                            </div>
                          ) : (
                            currentRun.treatments.map((tx) => (
                              <div key={tx.id} className="py-3 flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[13px] text-ink">
                                      {tx.description}
                                    </span>
                                    <StatusChip status="success" label="Administered" size="sm" />
                                  </div>
                                  <p className="text-[12px] text-ink-2 leading-relaxed">
                                    {tx.detail || 'Standard pre-hospital trauma intervention protocol.'}
                                  </p>
                                  <span className="text-[11px] text-ink-2 block">
                                    Performed by: <strong className="text-ink">{tx.performedBy || 'Para. J. Chen'}</strong>
                                  </span>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-mono text-[12px] font-semibold text-ink block">
                                    {formatClock(tx.timestamp)}
                                  </span>
                                  <span className="text-[11px] text-ink-2">
                                    {mounted ? formatAgo(tx.timestamp) : '—'}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUB-PANEL 4: MIST (4 Stacked Rows, No Card-in-Card, Copy Pill) */}
                    {clinicalSubTab === 'mist' && (
                      <div className="bg-tile rounded-[20px] border border-border p-4 h-full min-h-0 flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-border/80 shrink-0">
                          <div>
                            <h3 className="text-[14px] font-bold text-ink">
                              Paramedic MIST Clinical Handover
                            </h3>
                            <span className="text-[12px] text-ink-2">
                              Standardised trauma communication format
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {mistCopiedToast && (
                              <span className="text-[12px] font-semibold text-success-ink px-2 py-0.5 rounded-pill bg-success-soft animate-fade-in">
                                Copied to clipboard!
                              </span>
                            )}
                            <PillButton
                              variant="soft"
                              size="sm"
                              onClick={() => {
                                const mistText = `MIST HANDOVER — ${currentRun.callsign}\n\nM - MECHANISM:\n${currentRun.mist?.mechanism ?? currentRun.incident.mechanism}\n\nI - INJURIES:\n${currentRun.mist?.injuries ?? 'See assessed injury list'}\n\nS - SIGNS & VITALS:\n${currentRun.mist?.signs ?? 'HR 124, BP 88/58, SpO2 94%, RR 24, GCS 13'}\n\nT - TREATMENT:\n${currentRun.mist?.treatment ?? 'Oxygen, IV access, Hartmanns, Pelvic binder'}`
                                navigator.clipboard.writeText(mistText)
                                setMistCopiedToast(true)
                                setTimeout(() => setMistCopiedToast(false), 2000)
                              }}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              Copy MIST
                            </PillButton>
                          </div>
                        </div>

                        {/* 4 Stacked Rows (No Card-in-Card) */}
                        <div className="flex-1 py-3 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto">
                          {/* M · Mechanism */}
                          <div className="flex items-start gap-3.5 p-3 rounded-inner bg-well border border-border/70">
                            <span className="w-10 h-10 rounded-inner bg-primary text-white font-extrabold text-[16px] flex items-center justify-center shrink-0">
                              M
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[13px] text-primary-ink block">
                                MECHANISM OF INJURY
                              </span>
                              <p className="text-[13px] text-ink leading-relaxed mt-0.5">
                                {currentRun.mist?.mechanism ?? currentRun.incident.mechanism} — {currentRun.incident.detail}
                              </p>
                            </div>
                          </div>

                          {/* I · Injuries */}
                          <div className="flex items-start gap-3.5 p-3 rounded-inner bg-well border border-border/70">
                            <span className="w-10 h-10 rounded-inner bg-warning text-white font-extrabold text-[16px] flex items-center justify-center shrink-0">
                              I
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[13px] text-warning-ink block">
                                INJURIES FOUND & SUSPECTED
                              </span>
                              <p className="text-[13px] text-ink leading-relaxed whitespace-pre-line mt-0.5">
                                {currentRun.mist?.injuries ?? 'Scalp laceration right temporal (GCS 13), Rib fractures 4-6 left, Pelvic instability with high pain.'}
                              </p>
                            </div>
                          </div>

                          {/* S · Signs & Vitals */}
                          <div className="flex items-start gap-3.5 p-3 rounded-inner bg-well border border-border/70">
                            <span className="w-10 h-10 rounded-inner bg-critical text-white font-extrabold text-[16px] flex items-center justify-center shrink-0">
                              S
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[13px] text-critical-ink block">
                                SIGNS & PHYSIOLOGICAL VITALS
                              </span>
                              <p className="text-[13px] text-ink leading-relaxed mt-0.5">
                                {currentRun.mist?.signs ?? `HR ${hrValue ?? 124} bpm, BP ${sbpValue ?? 88}/${dbpValue ?? 58} mmHg, SpO₂ ${spo2Value ?? 94}%, RR ${rrValue ?? 24}/min, GCS ${gcsValue ?? 13} (E4 V3 M6).`}
                              </p>
                            </div>
                          </div>

                          {/* T · Treatment */}
                          <div className="flex items-start gap-3.5 p-3 rounded-inner bg-well border border-border/70">
                            <span className="w-10 h-10 rounded-inner bg-success text-white font-extrabold text-[16px] flex items-center justify-center shrink-0">
                              T
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[13px] text-success-ink block">
                                TREATMENT GIVEN & EN ROUTE
                              </span>
                              <p className="text-[13px] text-ink leading-relaxed mt-0.5">
                                {currentRun.mist?.treatment ?? 'High-flow O2 via non-rebreather 15 L/min. 18G IV in right antecubital fossa. 500 ml Hartmanns infusion. Sam pelvic splint applied.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px] text-ink-2 shrink-0">
                          <span>Delivered by crew: {currentRun.crewLead}</span>
                          <span>Pre-alert handover ID: TB-HA-{currentRun.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    )}

                    {/* SUB-PANEL 5: EVIDENCE */}
                    {clinicalSubTab === 'evidence' && (
                      <div className="bg-tile rounded-[20px] border border-border p-4 h-full min-h-0 flex flex-col shadow-xs">
                        <div className="flex items-center justify-between pb-2.5 border-b border-border/80 shrink-0">
                          <div>
                            <h3 className="text-[14px] font-bold text-ink">
                              Scene Media & Clinical Documentation
                            </h3>
                            <span className="text-[12px] text-ink-2">
                              Photographs, identity records, and ECG strips transmitted from ambulance
                            </span>
                          </div>
                          <span className="text-[12px] font-mono text-ink-2">
                            {currentRun.injuryPhotos?.length || 0} Assets available
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 py-3">
                          {currentRun.injuryPhotos && currentRun.injuryPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {currentRun.injuryPhotos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="rounded-inner border border-border overflow-hidden bg-well p-2 flex flex-col justify-between"
                                >
                                  <div className="w-full h-32 bg-slate-200 rounded flex items-center justify-center text-ink-2 text-xs">
                                    Scene Photographic Asset
                                  </div>
                                  <div className="mt-2 text-[11px]">
                                    <span className="font-bold text-ink block truncate">{photo.caption || 'Injury Photo'}</span>
                                    <span className="text-ink-2 font-mono">{formatClock(photo.timestamp)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-2 text-[13px] space-y-2">
                              <FileText className="w-8 h-8 text-ink-2/60" />
                              <span className="font-semibold text-ink">No scene media or scanned documents attached</span>
                              <p className="max-w-md text-[12px] leading-relaxed">
                                Paramedics have not attached external injury photos or identification documents to this run. Real-time updates from ambulance handheld will populate here automatically.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: PREPARATION (Bounded single-screen workspace, zero outer scroll) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'preparation' && (
                <motion.div
                  key={`preparation-${currentRun.id}`}
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex flex-col justify-between gap-3 overflow-hidden"
                >
                  {/* Header Band (80px, ProgressRing 72px with striped pending segment + 3/6 ready + one-line summary) */}
                  <div className="h-[80px] max-h-[799px]:h-[68px] bg-tile rounded-[20px] border border-border px-5 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="density-tall-only shrink-0">
                        <ProgressRing
                          value={prepProgressVal}
                          pendingValue={prepPendingVal}
                          variant="striped"
                          size={64}
                          strokeWidth={7}
                          strokeColor="#19A974"
                          label={`${prepReadyCount}`}
                          caption="Ready"
                        />
                      </div>
                      <div className="density-compact-only shrink-0">
                        <ProgressRing
                          value={prepProgressVal}
                          pendingValue={prepPendingVal}
                          variant="striped"
                          size={52}
                          strokeWidth={6}
                          strokeColor="#19A974"
                          label={`${prepReadyCount}`}
                          caption="Ready"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[24px] max-h-[799px]:text-[20px] font-extrabold font-mono text-ink tracking-tight">
                            {prepReadyCount} / {prepTotalCount}
                          </span>
                          <span className="text-[13px] font-semibold text-success-ink">
                            Departments Ready
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-2 truncate max-w-xl mt-0.5">
                          {prepReadyCount === prepTotalCount
                            ? 'All critical trauma services and resuscitation teams confirmed ready on standby.'
                            : prepReadyCount === 0
                            ? 'All departments on initial standby. Tap any department tile to cycle readiness state.'
                            : `${prepReadyCount} confirmed ready · ${prepPendingCount} in progress · ${prepTotalCount - prepReadyCount - prepPendingCount} pending acknowledgment.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-semibold px-2.5 py-1 rounded-pill bg-success-soft text-success-ink border border-success/30">
                        {prepReadyCount} Confirmed
                      </span>
                      {prepPendingCount > 0 && (
                        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-pill bg-warning-soft text-warning-ink border border-warning/30">
                          {prepPendingCount} In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3x2 Bento of Department Tiles (104px tall, 84px compact) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 min-h-0">
                    {prepItems.map((item) => {
                      const isReady = item.status === 'ready'
                      const isInProgress = item.status === 'in-progress'
                      const Icon =
                        item.id === 'prep-trauma-bay'
                          ? Bed
                          : item.id === 'prep-team'
                          ? Stethoscope
                          : item.id === 'prep-ct'
                          ? Activity
                          : item.id === 'prep-ortho'
                          ? Shield
                          : item.id === 'prep-blood'
                          ? Droplets
                          : Building2

                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileTap={press}
                          onClick={() => cyclePrepStatus(item.id, item.status)}
                          className={cn(
                            'h-[104px] max-h-[799px]:h-[84px] p-3.5 max-h-[799px]:p-2.5 rounded-[20px] border text-left transition-all cursor-pointer flex flex-col justify-between select-none shadow-xs relative overflow-hidden',
                            isReady
                              ? 'bg-success-soft/75 border-success/40 text-ink shadow-sm'
                              : isInProgress
                              ? 'bg-warning-soft/75 border-warning/40 text-ink shadow-sm'
                              : 'bg-well/80 border-border text-ink hover:bg-tile pattern-stripes'
                          )}
                        >
                          {/* Top Row: Department Name & Status Chip */}
                          <div className="flex items-start justify-between gap-2 z-10 w-full">
                            <div>
                              <span className="font-bold text-[14px] max-h-[799px]:text-[13px] text-ink block leading-snug">
                                {item.label}
                              </span>
                              <span className="text-[11px] text-ink-2 font-medium">
                                Dept: {item.team}
                              </span>
                            </div>

                            <StatusChip
                              status={isReady ? 'success' : isInProgress ? 'warning' : 'neutral'}
                              label={isReady ? 'Ready' : isInProgress ? 'In progress' : 'Pending'}
                              size="sm"
                            />
                          </div>

                          {/* Bottom Row: Helper & Animated Indicator / Icon */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/60 z-10 w-full">
                            <span className="text-[11px] font-medium text-ink-2">
                              Tap to cycle
                            </span>

                            <div className="flex items-center">
                              {isReady ? (
                                <div className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shadow-xs">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <motion.path
                                      d="M4 12l5 5L20 6"
                                      initial={{ pathLength: 0 }}
                                      animate={{ pathLength: 1 }}
                                      transition={{ duration: 0.35, ease }}
                                    />
                                  </svg>
                                </div>
                              ) : isInProgress ? (
                                <div className="w-7 h-7 rounded-full bg-warning text-white flex items-center justify-center shadow-xs">
                                  <Clock className="w-4 h-4 animate-spin-slow" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-200 text-ink-2 flex items-center justify-center">
                                  <Icon className="w-3.5 h-3.5 text-ink-2" />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Full-width Blood Requisition Tile (96-112px, compact 84px) */}
                  {hasBlood ? (
                    <div className="h-[104px] max-h-[799px]:h-[84px] bg-tile rounded-[20px] border border-border px-5 py-3 max-h-[799px]:py-2 flex items-center justify-between gap-6 shrink-0 shadow-xs">
                      {/* Left: Info & Units */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 max-h-[799px]:w-8 max-h-[799px]:h-8 rounded-full bg-critical text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Droplets className="w-5 h-5 max-h-[799px]:w-4 max-h-[799px]:h-4 fill-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[14px] max-h-[799px]:text-[13px] text-critical">
                              {bloodReq?.unitsRequested ?? 4} units O-negative PRBCs
                            </span>
                            <StatusChip status="critical" label="MTP Protocol" size="sm" />
                          </div>
                          <p className="text-[12px] text-ink-2 truncate max-w-md mt-0.5">
                            Emergency MTP protocol activated for suspected internal haemorrhage & pelvic fracture.
                          </p>
                        </div>
                      </div>

                      {/* Middle: 4-Step Stepper */}
                      <div className="hidden lg:flex items-center gap-2 shrink-0">
                        {['Requested', 'Acknowledged', 'Preparing', 'Ready'].map((stepName, sIdx) => {
                          const statusOrder = ['requested', 'acknowledged', 'preparing', 'ready']
                          const curIdx = statusOrder.indexOf(bloodReq?.status || 'preparing')
                          const isDone = sIdx <= curIdx
                          const isCurrent = sIdx === curIdx

                          return (
                            <React.Fragment key={stepName}>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                                    isDone
                                      ? 'bg-critical text-white'
                                      : 'bg-slate-200 text-ink-2'
                                  )}
                                >
                                  {isDone ? '✓' : sIdx + 1}
                                </span>
                                <span
                                  className={cn(
                                    'text-[11px] font-medium',
                                    isCurrent ? 'font-bold text-critical' : isDone ? 'text-ink' : 'text-ink-2'
                                  )}
                                >
                                  {stepName}
                                </span>
                              </div>
                              {sIdx < 3 && (
                                <div
                                  className={cn(
                                    'w-6 h-0.5',
                                    sIdx < curIdx ? 'bg-critical' : 'bg-slate-200'
                                  )}
                                />
                              )}
                            </React.Fragment>
                          )
                        })}
                      </div>

                      {/* Right: Confirmation Pill Button */}
                      <div className="shrink-0">
                        {bloodReq?.status === 'ready' ? (
                          <span className="px-3 py-1.5 rounded-pill bg-success-soft text-success-ink font-bold text-[12px] border border-success/30 flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-success" />
                            Confirmed at Bay 2
                          </span>
                        ) : (
                          <PillButton
                            variant="critical"
                            size="sm"
                            onClick={() => updateBloodStatus('ready', { recipient: 'Resus Bay 2' })}
                          >
                            Confirm blood arrived at Bay 2
                          </PillButton>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Bravo 3 designed state: 0/6 with no blood requisition
                    <div className="h-[84px] max-h-[799px]:h-[72px] bg-tile rounded-[20px] border border-border px-5 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-well text-ink-2 flex items-center justify-center shrink-0 border border-border">
                          <Droplets className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <span className="font-bold text-[13px] text-ink block">
                            No Emergency Blood Requisition Required
                          </span>
                          <span className="text-[12px] text-ink-2">
                            Patient stable en route (GCS 15, SBP 122). Standard blood group and save on hospital arrival.
                          </span>
                        </div>
                      </div>
                      <StatusChip status="neutral" label="Standard Protocol" size="sm" />
                    </div>
                  )}
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 4: ACTIVITY (Mounted inside bounded scroll)                */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'activity' && (
                <motion.div
                  key={`activity-${currentRun.id}`}
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex flex-col overflow-hidden"
                >
                  <Tile
                    title={`Chronological Case Activity Stream (${currentRun.events.length} Events)`}
                    className="h-full flex flex-col justify-between"
                  >
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                      {currentRun.events.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-inner bg-well border border-border flex items-center justify-between text-[12px] gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <span className="font-semibold text-ink truncate text-[13px]">
                              {ev.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-ink-2 font-mono flex-shrink-0 text-[12px]">
                            <span>{ev.operator ?? ev.source}</span>
                            <span>{formatClock(ev.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Tile>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function HospitalPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-well flex items-center justify-center text-ink-2 font-medium">Loading hospital console...</div>}>
      <HospitalPageContent />
    </Suspense>
  )
}
