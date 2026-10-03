'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Activity, Clock, Bell, Check, AlertTriangle, ChevronRight,
  Radio, Droplets, User, MapPin, Heart, RefreshCw, Search, X,
  Shield, CheckCircle2, AlertCircle, Stethoscope, Building2,
  ExternalLink, ChevronDown, Thermometer, Wind, Eye, FileText,
  Calendar, ArrowRight, CheckCircle, RotateCw, Filter, ShieldAlert,
  Flame, Package, Car, Bed, SlidersHorizontal
} from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { DEMO_RUN, DEMO_SECONDARY_CASE, AVAILABLE_HOSPITALS } from '@/data/demoRun'
import type { EmergencyRun, HospitalPrep, BloodBankStatus, RunEvent, VitalObservation } from '@/types/run'
import { Button, Badge, StatusChip } from '@/components/ui'
import { InjuryMap } from '@/components/ambulance/InjuryMap'

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatClockTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatRelativeMinutes(iso?: string) {
  if (!iso) return '—'
  try {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
    if (diff === 0) return 'Just now'
    return `${diff}m ago`
  } catch {
    return iso
  }
}

// ─── MAIN HOSPITAL RECEIVING CONSOLE ───────────────────────────────────────────

export default function HospitalPage() {
  const {
    activeRun,
    loadDemoRun,
    acknowledgeAlert,
    updateHospitalPrep,
    updateBloodStatus,
    addEvent,
  } = useRunStore()

  // Cross-tab sync
  useEffect(() => {
    initRunSync()
  }, [])

  // Auto-load demo if no active run
  useEffect(() => {
    if (!activeRun) {
      loadDemoRun()
    }
  }, [activeRun, loadDemoRun])

  // Selected case state: 'primary' (activeRun ?? DEMO_RUN) vs 'secondary' (DEMO_SECONDARY_CASE)
  const [selectedCaseId, setSelectedCaseId] = useState<'primary' | 'secondary'>('primary')
  const [now, setNow] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'urgent'>('all')

  // Progressive disclosure modal/drawer state
  const [drawerType, setDrawerType] = useState<'none' | 'vitals-trend' | 'body-map' | 'mist-full'>('none')

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Cases setup
  const primaryRun = activeRun ?? DEMO_RUN
  const secondaryRun = DEMO_SECONDARY_CASE

  const currentRun: EmergencyRun = selectedCaseId === 'secondary' ? secondaryRun : primaryRun
  const isPrimary = selectedCaseId === 'primary'

  // Severity derivation
  const isCritical = currentRun.id === 'demo-run-001' || (currentRun.vitalObservations?.[currentRun.vitalObservations.length - 1]?.sbp?.value ?? 120) < 95
  const urgencyLabel = isCritical ? 'Critical' : 'Urgent'

  // Latest observation
  const vitalsList = currentRun.vitalObservations ?? []
  const latestVitals: VitalObservation | undefined = vitalsList[vitalsList.length - 1]

  // Preparation summary
  const prepItems = currentRun.hospitalPrep ?? []
  const prepReadyCount = prepItems.filter((p) => p.status === 'ready').length
  const prepTotalCount = prepItems.length
  const prepPercent = prepTotalCount > 0 ? Math.round((prepReadyCount / prepTotalCount) * 100) : 0

  // Blood bank state
  const bloodReq = currentRun.bloodBankRequest
  const hasBlood = !!bloodReq && bloodReq.status !== 'not-requested'

  // Acknowledgment handler
  const handleAcknowledge = () => {
    if (isPrimary && currentRun.alertStatus !== 'acknowledged') {
      acknowledgeAlert('ED Trauma Lead — St. Bartholomew\'s')
    }
  }

  // Prep item status cycle
  const cyclePrepStatus = (itemId: string, currentStatus: HospitalPrep['status']) => {
    if (!isPrimary) return
    const nextStatusMap: Record<HospitalPrep['status'], HospitalPrep['status']> = {
      'pending': 'in-progress',
      'in-progress': 'ready',
      'ready': 'pending',
      'unavailable': 'pending',
    }
    const next = nextStatusMap[currentStatus] ?? 'ready'
    updateHospitalPrep(itemId, next, 'ED Receiving Staff')
  }

  // Filter cases for the left rail
  const caseRailItems = useMemo(() => {
    const list = [
      {
        id: 'primary' as const,
        run: primaryRun,
        urgency: 'critical' as const,
        urgencyTag: 'P1 CRITICAL',
        title: primaryRun.patient.name ?? `Unknown ${primaryRun.patient.sex ?? 'Male'} (~${primaryRun.patient.estimatedAge ?? 38}y)`,
        mechanism: primaryRun.incident.mechanism ?? 'Road Traffic Collision',
        callsign: primaryRun.callsign,
        eta: primaryRun.eta ?? 4,
        status: primaryRun.alertStatus,
      },
      {
        id: 'secondary' as const,
        run: secondaryRun,
        urgency: 'urgent' as const,
        urgencyTag: 'P2 URGENT',
        title: secondaryRun.patient.name ?? 'Sarah Mitchell (52F)',
        mechanism: secondaryRun.incident.mechanism ?? 'Fall from Height',
        callsign: secondaryRun.callsign,
        eta: secondaryRun.eta ?? 11,
        status: secondaryRun.alertStatus,
      },
    ]

    return list.filter((item) => {
      if (urgencyFilter === 'critical' && item.urgency !== 'critical') return false
      if (urgencyFilter === 'urgent' && item.urgency !== 'urgent') return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchCallsign = item.callsign.toLowerCase().includes(q)
        const matchMech = item.mechanism.toLowerCase().includes(q)
        return matchTitle || matchCallsign || matchMech
      }
      return true
    })
  }, [primaryRun, secondaryRun, urgencyFilter, searchQuery])

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white antialiased">
      {/* ── Subtle Ambient Background Texture ────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(240,246,255,0.45)_0%,_rgba(255,255,255,0)_70%)] z-0" />

      {/* ── Demo Safeguards Banner ─────────────────────────────────────────── */}
      <div className="relative z-10 bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-900 font-sans">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-white font-black px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider">
            DEMO RECEIVING CONSOLE
          </span>
          <span className="font-medium text-amber-800 hidden sm:inline">
            Simulated hospital receiving dashboard · Synthetic clinical events · Not connected to live NHS Spine
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-amber-800">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Stream Live</span>
          </span>
          <span className="text-amber-300">|</span>
          <span className="font-semibold">{now.toLocaleTimeString('en-GB')}</span>
        </div>
      </div>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="relative z-10 bg-white border-b border-[#E4EAF1] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand & Receiving Facility */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-sm font-black tracking-tight text-slate-900 block leading-tight">
                TRAUMA<span className="text-sky-500">BRIDGE</span> AI
              </span>
              <span className="text-[10px] text-slate-400 font-sans font-bold tracking-wider uppercase block">
                Hospital Receiving Console
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
            <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                St. Bartholomew's Major Trauma Centre
              </p>
              <p className="text-[11px] text-slate-400 font-sans">
                Emergency Department · Resuscitation Bays 1–4
              </p>
            </div>
          </div>
        </div>

        {/* Center: Minimal Navigation Pills */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600">
          <a
            href="#incoming"
            className="px-3 py-1 rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/40"
          >
            Inbound Cases ({caseRailItems.length})
          </a>
          <a
            href="#active-case"
            className="px-3 py-1 rounded-lg hover:text-slate-900 transition-colors"
          >
            Active Case Workspace
          </a>
          <a
            href="#preparation"
            className="px-3 py-1 rounded-lg hover:text-slate-900 transition-colors"
          >
            Preparation ({prepReadyCount}/{prepTotalCount})
          </a>
          <a
            href="#activity"
            className="px-3 py-1 rounded-lg hover:text-slate-900 transition-colors"
          >
            Live Activity
          </a>
        </nav>

        {/* Right: Quick actions & Link to Ambulance */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadDemoRun()}
            className="rounded-xl text-xs font-bold border-[#E4EAF1] text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
            title="Reload demonstration data"
          >
            Reset Demo
          </Button>

          <Link
            href="/ambulance"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Ambulance Terminal</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </Link>
        </div>
      </header>

      {/* ── Main Two-Column Layout ────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── LEFT RAIL: Incoming Cases (~340px) ───────────────────────────── */}
        <aside
          id="incoming"
          className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0 bg-[#FBFDFE] border-r border-[#E4EAF1] flex flex-col"
        >
          {/* Rail Header */}
          <div className="p-4 border-b border-[#E4EAF1] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
                  Incoming Cases
                </h2>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {caseRailItems.length} En Route
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, unit, or mechanism..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUrgencyFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  urgencyFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('critical')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  urgencyFilter === 'critical'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                )}
              >
                Critical (P1)
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('urgent')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  urgencyFilter === 'urgent'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                )}
              >
                Urgent (P2)
              </button>
            </div>
          </div>

          {/* Cases List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {caseRailItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-bold text-slate-500">No incoming cases match filter</p>
                <p className="text-[11px] text-slate-400">Clear your search term or select "All".</p>
              </div>
            ) : (
              caseRailItems.map((item) => {
                const isSelected = selectedCaseId === item.id
                const isItemCritical = item.urgency === 'critical'

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCaseId(item.id)}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative shadow-xs select-none',
                      isSelected
                        ? 'bg-[#F0F6FD] border-sky-400 ring-1 ring-sky-300 shadow-sm'
                        : 'bg-white border-[#E4EAF1] hover:border-slate-300 hover:bg-slate-50/50'
                    )}
                  >
                    {/* Active Accent Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-sky-500 rounded-r-full" />
                    )}

                    {/* Top Row: Unit, Urgency Badge, ETA */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {item.callsign}
                        </span>
                        <span className={cn(
                          'text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border',
                          isItemCritical
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {item.urgencyTag}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-sky-700">
                        <Clock className="w-3 h-3 text-sky-500" />
                        <span>{item.eta}m</span>
                      </div>
                    </div>

                    {/* Patient Line */}
                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Mechanism */}
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {item.mechanism}
                    </p>

                    {/* Bottom Status Row */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 font-sans">
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="capitalize">{item.status.replace('-', ' ')}</span>
                      </span>

                      {item.run.bloodBankRequest && item.run.bloodBankRequest.status !== 'not-requested' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                          <Droplets className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                          <span>Blood Req</span>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ── MAIN WORKSPACE: Active Case ───────────────────────────────────── */}
        <main
          id="active-case"
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-6xl mx-auto w-full"
        >
          {/* ── 1. PATIENT HEADER & PRIMARY IDENTITY ────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Left Identity Block */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {currentRun.patient.name ?? `Unknown ${currentRun.patient.sex ?? 'Male'}`}
                  </h1>
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase border',
                    isCritical
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {urgencyLabel} Arrival
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 capitalize">
                    {currentRun.patient.identityStatus.replace('-', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>Age: <strong>~{currentRun.patient.estimatedAge ?? 38} years</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Sex: <strong className="capitalize">{currentRun.patient.sex ?? 'Male'}</strong></span>
                  {currentRun.patient.allergies && currentRun.patient.allergies.length > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-rose-600 font-bold">
                        Allergies: {currentRun.patient.allergies.join(', ')}
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    ID: #{currentRun.id.slice(0, 10)}
                  </span>
                </div>
              </div>

              {/* Right Transit & ETA Block */}
              <div className="flex items-center gap-4 sm:border-l sm:pl-6 border-slate-200 flex-shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Ambulance Unit
                  </span>
                  <span className="font-mono text-base font-black text-slate-900 block">
                    {currentRun.callsign}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">
                    {currentRun.crewLead ?? 'Crew En Route'}
                  </span>
                </div>

                <div className="bg-sky-50 border border-sky-200/80 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 font-mono block">
                    ETA
                  </span>
                  <span className="text-2xl font-black text-sky-700 font-mono block leading-none mt-0.5">
                    {currentRun.eta ?? 4}m
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. RESTRAINED CRITICAL / URGENT ALERT BAND ──────────────────── */}
            <div
              className={cn(
                'p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors',
                isCritical
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              )}
            >
              <div className="flex items-center gap-2.5">
                {isCritical ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <div className="space-y-0.5">
                  <span className="font-bold tracking-tight uppercase font-mono text-[11px] block">
                    {isCritical ? 'CRITICAL ARRIVAL PROTOCOL' : 'URGENT RECEIVING PRE-ALERT'}
                  </span>
                  <p className="font-medium text-slate-700">
                    {currentRun.incident.mechanism} — {currentRun.incident.detail || 'High-risk trauma alert. Prepare primary survey resuscitation team.'}
                  </p>
                </div>
              </div>

              {currentRun.alertStatus !== 'acknowledged' ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAcknowledge}
                  className="rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0 shadow-xs"
                >
                  Acknowledge Pre-Alert
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Acknowledged</span>
                </span>
              )}
            </div>
          </section>

          {/* ── 3. LATEST CLINICAL SNAPSHOT (OBSERVATIONS) ───────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Latest Physiological Observations
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Source: {latestVitals?.assessedBy ?? 'Lifepak 15 Telemetry'} · {formatRelativeMinutes(latestVitals?.timestamp)}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerType('vitals-trend')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Trend ({vitalsList.length} Readings)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Structured Vital Readout Strips (Not 6 giant equal cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Heart Rate */}
              <div className="bg-[#F8FAFD] rounded-xl p-3.5 border border-[#E8EFF6]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase font-mono">Heart Rate</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                    {latestVitals?.hr?.value ?? '112'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">bpm</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm 60–100</span>
              </div>

              {/* Blood Pressure */}
              <div className="bg-[#F8FAFD] rounded-xl p-3.5 border border-[#E8EFF6]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase font-mono">Blood Pressure</span>
                  <Activity className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className={cn(
                    'text-2xl sm:text-3xl font-black font-mono',
                    (latestVitals?.sbp?.value ?? 98) < 95 ? 'text-rose-600' : 'text-slate-900'
                  )}>
                    {latestVitals?.sbp?.value ?? '98'}/{latestVitals?.dbp?.value ?? '64'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm 120/80</span>
              </div>

              {/* SpO2 */}
              <div className="bg-[#F8FAFD] rounded-xl p-3.5 border border-[#E8EFF6]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase font-mono">SpO₂</span>
                  <Wind className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                    {latestVitals?.spo2?.value ?? '97'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm 95–100%</span>
              </div>

              {/* Respiratory Rate */}
              <div className="bg-[#F8FAFD] rounded-xl p-3.5 border border-[#E8EFF6]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase font-mono">Resp. Rate</span>
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                    {latestVitals?.rr?.value ?? '20'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/min</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm 12–20</span>
              </div>

              {/* Glasgow Coma Scale */}
              <div className="bg-sky-50/80 rounded-xl p-3.5 border border-sky-200/80 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-sky-700 mb-1">
                  <span className="text-[11px] font-bold uppercase font-mono">GCS Score</span>
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-sky-900">
                    {latestVitals?.gcs?.total ?? 14}
                  </span>
                  <span className="text-xs text-sky-600 font-medium">/ 15</span>
                </div>
                <span className="text-[10px] text-sky-700 mt-1 block font-mono">
                  E{latestVitals?.gcs?.components?.eye ?? 4} V{latestVitals?.gcs?.components?.verbal ?? 4} M{latestVitals?.gcs?.components?.motor ?? 6}
                </span>
              </div>
            </div>
          </section>

          {/* ── 4. CLINICAL OVERVIEW (2-COLUMN INFORMATION ARRANGEMENT) ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: Mechanism & Structured Injuries */}
            <div className="space-y-6">
              {/* Mechanism Block */}
              <div className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Mechanism of Injury
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Time: {currentRun.incident.time ?? 'Scene'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {currentRun.incident.mechanism}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {currentRun.incident.detail || 'High-impact collision with prolonged vehicle extrication.'}
                  </p>
                  {currentRun.incident.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 font-mono">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{currentRun.incident.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Structured Injuries Block */}
              <div className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Documented Injuries
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {currentRun.injuries.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerType('body-map')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect 3D Body Map</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {currentRun.injuries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No specific anatomical injuries documented.</p>
                ) : (
                  <div className="space-y-2.5">
                    {currentRun.injuries.map((inj) => {
                      const isSevere = inj.severity === 'severe' || inj.severity === 'critical'
                      return (
                        <div
                          key={inj.id}
                          className={cn(
                            'p-3.5 rounded-xl border text-xs space-y-1 transition-colors',
                            isSevere
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-slate-50/70 border-slate-200'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-slate-900 capitalize">
                              {inj.region.replace(/-/g, ' ')}
                            </span>
                            <span className={cn(
                              'text-[10px] font-mono font-bold uppercase px-2 py-0.2 rounded border',
                              isSevere
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            )}>
                              {inj.type} · {inj.severity}
                            </span>
                          </div>
                          {inj.notes && (
                            <p className="text-xs text-slate-600 leading-snug">
                              {inj.notes}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                            <span>Assessed by: {inj.assessedBy ?? 'Crew Lead'}</span>
                            <span>{formatRelativeMinutes(inj.timestamp)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Key Signs & Pre-Hospital Treatment */}
            <div className="space-y-6">
              {/* Signs / Key Observations */}
              <div className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Key Signs & System Findings
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">Primary Survey Summary</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-500 text-[10px] uppercase font-mono block">Airway</span>
                    <span className="font-black text-slate-800 mt-0.5 block">Patent & Maintained</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">High-flow O₂ running via NRM</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-500 text-[10px] uppercase font-mono block">Breathing</span>
                    <span className="font-black text-slate-800 mt-0.5 block">SpO₂ 97% · RR 20</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Left lateral rib tenderness noted</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-500 text-[10px] uppercase font-mono block">Circulation</span>
                    <span className={cn('font-black mt-0.5 block', (latestVitals?.sbp?.value ?? 98) < 95 ? 'text-rose-600' : 'text-slate-800')}>
                      BP 98/64 · HR 112 bpm
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Pelvic binder applied for stability</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-500 text-[10px] uppercase font-mono block">Disability / GCS</span>
                    <span className="font-black text-slate-800 mt-0.5 block">GCS 14 / 15 (E4 V4 M6)</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Pupils equal, reactive to light</span>
                  </div>
                </div>
              </div>

              {/* Pre-Hospital Treatment Timeline */}
              <div className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Pre-Hospital Interventions ({currentRun.treatments.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Administered en route</span>
                </div>

                <div className="space-y-2">
                  {currentRun.treatments.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-[#F7FAFD] border border-[#E8EFF6] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900">{tx.description}</span>
                        </div>
                        <p className="text-slate-600 text-xs pl-4">{tx.detail}</p>
                      </div>

                      <div className="text-right text-[10px] font-mono text-slate-400 flex-shrink-0">
                        <span>{formatRelativeMinutes(tx.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. HOSPITAL PREPARATION & BLOOD BANK SECTION ─────────────────── */}
          <section
            id="preparation"
            className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                    Hospital Preparation Status
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Click any department item to toggle readiness (Pending → In Progress → Ready).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono text-slate-700">
                  {prepReadyCount} of {prepTotalCount} Confirmed Ready
                </span>
                <div className="w-28 h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${prepPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Preparation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prepItems.map((item) => {
                const isReady = item.status === 'ready'
                const isInProgress = item.status === 'in-progress'
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cyclePrepStatus(item.id, item.status)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none',
                      isReady
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isInProgress
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div>
                      <span className="font-extrabold text-xs block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                        Dept: {item.team} · {formatRelativeMinutes(item.updatedAt)}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      {isReady ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      ) : isInProgress ? (
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                          ◐
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                          ○
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ── DEDICATED BLOOD BANK SUBORDINATE MODULE ───────────────────── */}
            {hasBlood && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-rose-600 fill-rose-600" />
                    <span className="font-black text-rose-900 uppercase font-mono tracking-wider text-[11px]">
                      Emergency Blood Products Requisition
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                    Status: {bloodReq?.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 bg-white/80 p-3 rounded-lg border border-rose-200/60 font-sans">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Requested Product</span>
                    <strong className="text-slate-900 text-xs">{bloodReq?.unitsRequested ?? 4} Units O-Negative PRBCs</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Clinical Justification</span>
                    <span className="text-slate-900 text-xs truncate block">{bloodReq?.clinicalJustification ?? 'Haemodynamically unstable trauma'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Coordinating Facility</span>
                    <span className="text-slate-900 text-xs block">{bloodReq?.recipient ?? 'St. Bartholomew\'s MTC Blood Bank'}</span>
                  </div>
                </div>

                {isPrimary && bloodReq?.status === 'preparing' && (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => updateBloodStatus('ready', { recipient: 'Bay 2 Standby' })}
                      className="rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white"
                    >
                      Confirm Blood Products Arrived in Bay 2
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── 6. LIVE CHRONOLOGICAL ACTIVITY STREAM ───────────────────────── */}
          <section
            id="activity"
            className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Live Chronological Activity
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {currentRun.events.length} Recorded Events
              </span>
            </div>

            {/* Chronological List (Newest on top) */}
            <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {[...currentRun.events].reverse().slice(0, 7).map((ev, i) => (
                <div key={ev.id} className="relative text-xs space-y-0.5">
                  {/* Timeline dot */}
                  <span
                    className={cn(
                      'absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 bg-white',
                      i === 0 ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                    )}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('font-bold', i === 0 ? 'text-slate-900' : 'text-slate-700')}>
                      {ev.description}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">
                      {formatClockTime(ev.timestamp)}
                    </span>
                  </div>

                  {ev.operator && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Logged by {ev.operator} · {ev.source}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── 7. MIST HANDOVER CONCISE BLOCK ──────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E4EAF1] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Structured MIST Protocol Summary
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDrawerType('mist-full')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Signed Handover</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1">
                <span className="font-black text-sky-700 uppercase font-mono text-[11px] block">M · Mechanism</span>
                <p className="text-slate-700 line-clamp-3 leading-snug">
                  {currentRun.mist?.mechanism ?? currentRun.incident.mechanism}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/80 space-y-1">
                <span className="font-black text-red-700 uppercase font-mono text-[11px] block">I · Injuries Found</span>
                <p className="text-slate-700 line-clamp-3 leading-snug">
                  {currentRun.mist?.injuries ?? 'Pelvic instability, right temporal scalp laceration, left lateral chest contusion'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <span className="font-black text-amber-700 uppercase font-mono text-[11px] block">S · Signs / Vitals</span>
                <p className="text-slate-700 line-clamp-3 leading-snug">
                  {currentRun.mist?.signs ?? `HR ${latestVitals?.hr?.value ?? 112} · BP ${latestVitals?.sbp?.value ?? 98}/${latestVitals?.dbp?.value ?? 64} · SpO₂ ${latestVitals?.spo2?.value ?? 97}% · GCS ${latestVitals?.gcs?.total ?? 14}`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <span className="font-black text-emerald-700 uppercase font-mono text-[11px] block">T · Treatment Given</span>
                <p className="text-slate-700 line-clamp-3 leading-snug">
                  {currentRun.mist?.treatment ?? 'High-flow O₂ 15L, 18G IV right AC, 500ml Hartmann\'s running, SAM Pelvic Binder II'}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ── PROGRESSIVE DISCLOSURE MODALS / DRAWERS ───────────────────────── */}
      <AnimatePresence>
        {drawerType !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl border border-[#E4EAF1] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-900"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {drawerType === 'vitals-trend' && 'Physiological Vitals Trend'}
                    {drawerType === 'body-map' && 'Interactive Anatomical Body Map'}
                    {drawerType === 'mist-full' && 'Complete MIST Handover Report'}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Patient: {currentRun.patient.name ?? 'Unknown Male'} · Unit {currentRun.callsign}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerType('none')}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* 1. Vitals Trend Table */}
                {drawerType === 'vitals-trend' && (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                          <th className="py-2">Time</th>
                          <th className="py-2">Source</th>
                          <th className="py-2">HR (bpm)</th>
                          <th className="py-2">BP (mmHg)</th>
                          <th className="py-2">SpO₂ (%)</th>
                          <th className="py-2">RR (/min)</th>
                          <th className="py-2">GCS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vitalsList.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="py-3 font-semibold text-slate-900">{formatClockTime(v.timestamp)}</td>
                            <td className="py-3 text-slate-500 font-sans text-xs">{v.assessedBy ?? v.source}</td>
                            <td className="py-3 font-bold text-slate-900">{v.hr?.value ?? '—'}</td>
                            <td className="py-3 font-bold text-slate-900">{v.sbp?.value ?? '—'}/{v.dbp?.value ?? '—'}</td>
                            <td className="py-3 font-bold text-slate-900">{v.spo2?.value ?? '—'}%</td>
                            <td className="py-3 font-bold text-slate-900">{v.rr?.value ?? '—'}</td>
                            <td className="py-3 font-bold text-sky-700">{v.gcs?.total ?? '—'}/15</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. Body Map Modal */}
                {drawerType === 'body-map' && (
                  <div className="space-y-4">
                    <InjuryMap
                      injuries={currentRun.injuries}
                      onAdd={() => {}}
                      onRemove={() => {}}
                      nightMode={false}
                    />
                  </div>
                )}

                {/* 3. Full MIST Protocol Modal */}
                {drawerType === 'mist-full' && (
                  <div className="space-y-4 text-xs font-sans">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-mono text-xs font-bold text-sky-700 uppercase">M · Mechanism of Injury</span>
                      <p className="text-slate-800 leading-relaxed font-mono">
                        {currentRun.mist?.mechanism ?? currentRun.incident.mechanism}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-mono text-xs font-bold text-red-700 uppercase">I · Injuries Found</span>
                      <p className="text-slate-800 leading-relaxed font-mono whitespace-pre-line">
                        {currentRun.mist?.injuries ?? 'Pelvic instability, scalp laceration'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-mono text-xs font-bold text-amber-700 uppercase">S · Signs & Vital Readings</span>
                      <p className="text-slate-800 leading-relaxed font-mono">
                        {currentRun.mist?.signs ?? 'HR 112, BP 98/64, SpO2 97%, GCS 14'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-mono text-xs font-bold text-emerald-700 uppercase">T · Treatment Given</span>
                      <p className="text-slate-800 leading-relaxed font-mono whitespace-pre-line">
                        {currentRun.mist?.treatment ?? 'Oxygen, IV fluids, pelvic binder'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>Confirmed by: {currentRun.mist?.confirmedBy ?? 'Para. J. Chen'}</span>
                      <span>Timestamp: {formatClockTime(currentRun.mist?.confirmedAt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => setDrawerType('none')}
                  className="rounded-xl font-bold text-xs"
                >
                  Close Window
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
