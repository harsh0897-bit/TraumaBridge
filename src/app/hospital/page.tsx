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
  ChevronDown, Phone, ArrowUpRight
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
import { InjuryMap } from '@/components/ambulance/InjuryMap'
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
              {/* TAB 2: CLINICAL (Mounted inside bounded scroll)                */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'clinical' && (
                <motion.div
                  key={`clinical-${currentRun.id}`}
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full overflow-y-auto pr-1 space-y-4"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Mechanism & Structured Injuries */}
                    <div className="space-y-4">
                      {/* Mechanism Module */}
                      <Tile title="Mechanism of Injury">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-ink-2">
                              Reported Mechanism
                            </span>
                            <span className="text-[12px] text-ink-2 font-mono" title={formatDateTimeLong(currentRun.incident.time)}>
                              Time: {formatClock(currentRun.incident.time)}
                            </span>
                          </div>
                          <h4 className="text-[14px] font-bold text-ink">
                            {currentRun.incident.mechanism}
                          </h4>
                          <p className="text-[13px] text-ink-2 leading-relaxed">
                            {currentRun.incident.detail}
                          </p>
                          {currentRun.incident.location && (
                            <div className="flex items-center gap-1.5 text-[12px] text-ink-2 pt-1">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="font-mono">{currentRun.incident.location}</span>
                            </div>
                          )}
                        </div>
                      </Tile>

                      {/* Injuries Module */}
                      <Tile title={`Assessed Injuries (${currentRun.injuries.length})`}>
                        <div className="space-y-2.5">
                          {currentRun.injuries.length === 0 ? (
                            <p className="text-[13px] text-ink-2">No injuries documented yet.</p>
                          ) : (
                            currentRun.injuries.map((inj) => (
                              <div
                                key={inj.id}
                                className="p-3 rounded-inner bg-well border border-border flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
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
                                    <span className="font-bold text-[13px] text-ink capitalize">
                                      {inj.region.replace(/-/g, ' ')} ({inj.type})
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-ink-2 mt-1">
                                    {inj.notes || 'No clinician notes'}
                                  </p>
                                </div>
                                <span className="text-[12px] font-mono text-ink-2 flex-shrink-0">
                                  {inj.assessedBy}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </Tile>
                    </div>

                    {/* Right: Anatomical Injury Map & MIST summary */}
                    <div className="space-y-4">
                      <Tile title="Anatomical Trauma Map">
                        <div className="h-[280px] flex items-center justify-center bg-well rounded-inner border border-border p-2">
                          <InjuryMap
                            injuries={currentRun.injuries}
                            onAdd={() => {}}
                            onRemove={() => {}}
                          />
                        </div>
                      </Tile>

                      {/* MIST Summary */}
                      <Tile title="Paramedic MIST Handover">
                        <div className="space-y-2 text-[13px]">
                          <div className="p-2.5 rounded-inner bg-well border border-border">
                            <strong className="text-primary text-[12px] block">M · MECHANISM</strong>
                            <p className="text-ink text-[12px] mt-0.5">{currentRun.mist?.mechanism ?? 'Pending'}</p>
                          </div>
                          <div className="p-2.5 rounded-inner bg-well border border-border">
                            <strong className="text-warning text-[12px] block">I · INJURIES</strong>
                            <p className="text-ink text-[12px] whitespace-pre-line mt-0.5">{currentRun.mist?.injuries ?? 'Pending'}</p>
                          </div>
                          <div className="p-2.5 rounded-inner bg-well border border-border">
                            <strong className="text-critical text-[12px] block">S · SIGNS & VITALS</strong>
                            <p className="text-ink text-[12px] mt-0.5">{currentRun.mist?.signs ?? 'Pending'}</p>
                          </div>
                          <div className="p-2.5 rounded-inner bg-well border border-border">
                            <strong className="text-success text-[12px] block">T · TREATMENT</strong>
                            <p className="text-ink text-[12px] mt-0.5">{currentRun.mist?.treatment ?? 'Pending'}</p>
                          </div>
                        </div>
                      </Tile>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: PREPARATION (Mounted inside bounded space)              */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'preparation' && (
                <motion.div
                  key={`preparation-${currentRun.id}`}
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex flex-col justify-between overflow-y-auto pr-1 gap-4"
                >
                  <Tile title="Hospital Readiness Board">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div>
                          <p className="text-[13px] text-ink-2">
                            Interactive department status. Click any module to cycle (Pending → In Progress → Ready).
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] font-bold text-success">
                            {prepReadyCount} / {prepTotalCount} CONFIRMED READY
                          </span>
                        </div>
                      </div>

                      {/* 6 Preparation Cards Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {prepItems.map((item) => {
                          const isReady = item.status === 'ready'
                          const isInProgress = item.status === 'in-progress'
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => cyclePrepStatus(item.id, item.status)}
                              className={cn(
                                'p-4 rounded-inner border text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none shadow-xs',
                                isReady
                                  ? 'bg-success-soft border-success/30 text-ink'
                                  : isInProgress
                                  ? 'bg-warning-soft border-warning/30 text-ink'
                                  : 'bg-well border-border text-ink hover:bg-tile'
                              )}
                            >
                              <div>
                                <span className="font-bold text-[14px] block">{item.label}</span>
                                <span className="text-[12px] text-ink-2 block mt-0.5">
                                  Dept: {item.team} · <span className="capitalize font-semibold">{item.status.replace('-', ' ')}</span>
                                </span>
                              </div>

                              <div className="flex-shrink-0">
                                {isReady ? (
                                  <span className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center text-[12px] font-bold">
                                    ✓
                                  </span>
                                ) : isInProgress ? (
                                  <span className="w-7 h-7 rounded-full bg-warning text-white flex items-center justify-center text-[12px] font-bold">
                                    ◐
                                  </span>
                                ) : (
                                  <span className="w-7 h-7 rounded-full bg-slate-200 text-ink-2 flex items-center justify-center text-[12px] font-bold">
                                    ○
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </Tile>

                  {/* Blood Bank Action Card */}
                  {hasBlood && (
                    <Tile title="Emergency Blood Requisition">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-critical text-white flex items-center justify-center flex-shrink-0">
                            <Droplets className="w-5 h-5 fill-white" />
                          </div>
                          <div>
                            <span className="font-bold text-[14px] text-critical block">
                              MTP Requisition: {bloodReq?.unitsRequested ?? 4} Units O-Negative PRBCs
                            </span>
                            <span className="text-ink-2 text-[12px]">
                              Status: <strong className="uppercase font-mono">{bloodReq?.status}</strong> · Standby: Resus Bay 2
                            </span>
                          </div>
                        </div>

                        {bloodReq?.status === 'preparing' && (
                          <PillButton
                            variant="critical"
                            size="md"
                            onClick={() => updateBloodStatus('ready', { recipient: 'Resus Bay 2' })}
                          >
                            Confirm Blood Delivery at Bay 2
                          </PillButton>
                        )}
                      </div>
                    </Tile>
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
