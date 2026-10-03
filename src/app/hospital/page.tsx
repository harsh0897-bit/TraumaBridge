'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Activity, Clock, Bell, Check, AlertTriangle, ChevronRight,
  Radio, Droplets, User, MapPin, Heart, RefreshCw, Search, X,
  Shield, CheckCircle2, AlertCircle, Stethoscope, Building2,
  ExternalLink, Wind, Eye, FileText, Bed, Zap, Layers,
  ChevronDown
} from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { DEMO_RUN, DEMO_SECONDARY_CASE } from '@/data/demoRun'
import type { EmergencyRun, HospitalPrep, BloodBankStatus, RunEvent, VitalObservation } from '@/types/run'
import { Button } from '@/components/ui'
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

type HospitalTab = 'overview' | 'clinical' | 'preparation' | 'activity'

// ─── MAIN HOSPITAL APPLICATION (SINGLE SCREEN VIEWPORT) ────────────────────────

export default function HospitalPage() {
  const {
    activeRun,
    loadDemoRun,
    acknowledgeAlert,
    updateHospitalPrep,
    updateBloodStatus,
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

  // Selected case & active tab
  const [selectedCaseId, setSelectedCaseId] = useState<'primary' | 'secondary'>('primary')
  const [activeTab, setActiveTab] = useState<HospitalTab>('overview')
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

  // Active cases setup
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
        title: primaryRun.patient.name ?? `Unknown · ~${primaryRun.patient.estimatedAge ?? 38}M`,
        mechanism: primaryRun.incident.mechanism ?? 'Road Traffic Collision',
        callsign: primaryRun.callsign,
        eta: primaryRun.eta ?? 4,
        status: primaryRun.alertStatus,
      },
      {
        id: 'secondary' as const,
        run: secondaryRun,
        urgency: 'urgent' as const,
        title: secondaryRun.patient.name ? `${secondaryRun.patient.name} · 52F` : 'Sarah Mitchell · 52F',
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
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-white text-[#111827] flex flex-col font-sans selection:bg-[#2878D7] selection:text-white antialiased">
      {/* ── Demo Safeguards Banner (Ultra-compact 1-line) ──────────────────── */}
      <div className="flex-shrink-0 bg-[#FFF6E4] border-b border-[#E3EAF2] px-4 sm:px-6 py-1 flex items-center justify-between text-[11px] text-[#8C5E00]">
        <div className="flex items-center gap-2">
          <span className="bg-[#D99000] text-white font-bold px-1.5 py-0.2 rounded text-[9px] tracking-wider uppercase">
            Demo Mode
          </span>
          <span className="font-medium text-[#8C5E00] hidden sm:inline">
            Hospital Receiving Workspace · Synthetic clinical telemetry · NHS Spine simulated
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#19A974] animate-pulse" />
            <span className="text-[#19A974] font-semibold">Live Telemetry Sync</span>
          </span>
          <span className="text-[#D99000]/40">|</span>
          <span suppressHydrationWarning className="font-mono text-slate-600 font-medium">
            {now.toLocaleTimeString('en-GB')}
          </span>
        </div>
      </div>

      {/* ── Top Header (Clean, spacious, compact height) ───────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-[#E3EAF2] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brandmark & Hospital Identity */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#2878D7] flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[#111827] block leading-none">
                Trauma<span className="text-[#2878D7]">Bridge</span>
              </span>
              <span className="text-[10px] text-[#64748B] font-medium tracking-wide block mt-0.5">
                Hospital Console
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#E3EAF2]">
            <Building2 className="w-4 h-4 text-[#2878D7] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#111827] leading-tight">
                St. Bartholomew's Major Trauma Centre
              </p>
              <p className="text-[10px] text-[#64748B]">
                Resuscitation Bays 1–4 · Receiving Lead On-Duty
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDemoRun()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] bg-white border border-[#E3EAF2] hover:bg-[#F8FBFF] hover:text-[#111827] transition-colors shadow-xs cursor-pointer"
            title="Reload demonstration dataset"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          <Link
            href="/ambulance"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#2878D7] text-white hover:bg-[#1E67C0] transition-colors shadow-xs"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Ambulance Terminal</span>
            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
          </Link>
        </div>
      </header>

      {/* ── Main Application Workspace Body (100dvh, No Global Scroll) ─────── */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* ── LEFT CASE RAIL (~280px-310px, Compact Rows) ─────────────────── */}
        <aside className="w-72 sm:w-80 flex-shrink-0 bg-white border-r border-[#E3EAF2] flex flex-col min-h-0">
          {/* Rail Header & Search */}
          <div className="p-3 border-b border-[#E3EAF2] space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#2878D7]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                  Incoming Cases
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF5FF] text-[#2878D7]">
                {caseRailItems.length} En Route
              </span>
            </div>

            {/* Compact Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search unit, patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-[#E3EAF2] bg-[#F8FBFF] text-xs text-[#111827] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#2878D7] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#111827]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Clean Case Rows (Separated by subtle dividers, no giant cards) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E3EAF2] min-h-0">
            {caseRailItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                No incoming cases match filter
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
                      'p-3.5 transition-colors cursor-pointer text-left relative select-none group',
                      isSelected
                        ? 'bg-[#EEF5FF]'
                        : 'bg-white hover:bg-[#F8FBFF]'
                    )}
                  >
                    {/* Small left accent bar on active row */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2878D7]" />
                    )}

                    {/* Top Row: Unit, Urgency, ETA */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-[#111827]">
                          {item.callsign}
                        </span>
                        <span className="text-[#64748B]">·</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              isItemCritical ? 'bg-[#D92D20]' : 'bg-[#D99000]'
                            )}
                          />
                          <span className={cn(
                            'text-[10px] font-bold uppercase',
                            isItemCritical ? 'text-[#D92D20]' : 'text-[#D99000]'
                          )}>
                            {item.urgency}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-[#2878D7]">
                        ETA {item.eta} min
                      </span>
                    </div>

                    {/* Patient Line */}
                    <h3 className="font-bold text-xs text-[#111827] truncate">
                      {item.title}
                    </h3>

                    {/* Mechanism */}
                    <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                      {item.mechanism}
                    </p>

                    {/* Bottom Status Row */}
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] mt-1.5 pt-1 border-t border-[#E3EAF2]/60">
                      <span className="capitalize">{item.status.replace('-', ' ')}</span>
                      {item.run.bloodBankRequest && item.run.bloodBankRequest.status !== 'not-requested' && (
                        <span className="inline-flex items-center gap-0.5 text-[#D92D20] font-bold bg-[#FFF1EF] px-1.5 py-0.2 rounded">
                          <Droplets className="w-2.5 h-2.5 fill-[#D92D20]" />
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

        {/* ── MAIN WORKSPACE: Active Case Workspace ────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#FFFFFF]">
          {/* ── A. PERSISTENT PATIENT HEADER (Visible Across Every Tab) ─────── */}
          <div className="flex-shrink-0 bg-white border-b border-[#E3EAF2] px-5 sm:px-7 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Identity & Demographics */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                    {currentRun.patient.name ?? `Unknown ${currentRun.patient.sex ?? 'Male'}`}
                  </h1>

                  {/* Urgency Badge */}
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase',
                    isCritical
                      ? 'bg-[#FFF1EF] text-[#D92D20] border border-[#D92D20]/20'
                      : 'bg-[#FFF6E4] text-[#D99000] border border-[#D99000]/20'
                  )}>
                    {urgencyLabel}
                  </span>

                  {/* Identity status */}
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F8FBFF] text-[#64748B] border border-[#E3EAF2] capitalize">
                    {currentRun.patient.identityStatus.replace('-', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
                  <span>Age: <strong className="text-[#111827]">~{currentRun.patient.estimatedAge ?? 38}</strong></span>
                  <span>·</span>
                  <span>Sex: <strong className="capitalize text-[#111827]">{currentRun.patient.sex ?? 'Male'}</strong></span>
                  <span>·</span>
                  <span>Unit: <strong className="text-[#111827]">{currentRun.callsign}</strong> ({currentRun.crewLead ?? 'Crew En Route'})</span>
                  {currentRun.patient.allergies && currentRun.patient.allergies.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-[#D92D20] font-bold">
                        Allergies: {currentRun.patient.allergies.join(', ')}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    ID: #{currentRun.id.slice(0, 10)}
                  </span>
                </div>
              </div>

              {/* Destination, ETA & Quick Pre-Alert Action */}
              <div className="flex items-center gap-3 sm:border-l sm:pl-5 border-[#E3EAF2] flex-shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Destination
                  </span>
                  <span className="text-xs font-extrabold text-[#111827] block">
                    Resus Bay 2
                  </span>
                </div>

                <div className="bg-[#EEF5FF] border border-[#2878D7]/30 rounded-xl px-3 py-1.5 text-center min-w-[75px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#2878D7] block">
                    ETA
                  </span>
                  <span className="text-lg font-black text-[#2878D7] font-mono block leading-none mt-0.5">
                    {currentRun.eta ?? 4} min
                  </span>
                </div>

                {currentRun.alertStatus !== 'acknowledged' ? (
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#111827] text-white hover:bg-[#1f2937] transition-colors shadow-xs cursor-pointer"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ECF9F3] text-[#19A974] text-xs font-bold border border-[#19A974]/30">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Pre-Alert Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── B. CASE NAVIGATION TABS (Segmented navigation bar) ────────────── */}
          <div className="flex-shrink-0 px-5 sm:px-7 pt-2.5 pb-2 bg-white border-b border-[#E3EAF2]">
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'overview', label: 'Overview', badge: null },
                  { id: 'clinical', label: 'Clinical', badge: `${currentRun.injuries.length} Injuries` },
                  { id: 'preparation', label: 'Preparation', badge: `${prepReadyCount}/${prepTotalCount} Ready` },
                  { id: 'activity', label: 'Activity', badge: `${currentRun.events.length} Events` },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none',
                      isActive
                        ? 'text-[#2878D7] bg-[#EEF5FF]'
                        : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FBFF]'
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                          isActive
                            ? 'bg-[#2878D7] text-white'
                            : 'bg-[#F8FBFF] text-[#64748B] border border-[#E3EAF2]'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 border border-[#2878D7]/30 rounded-xl pointer-events-none"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── C. TAB CONTENT CONTAINER (Single screen, controlled bounds) ──── */}
          <div className="flex-1 overflow-hidden min-h-0 p-5 sm:p-6 bg-white">
            <AnimatePresence mode="wait">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: OVERVIEW (NO PAGE SCROLL)                              */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <motion.div
                  key="tab-overview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full flex flex-col gap-4 overflow-hidden"
                >
                  {/* Restrained Alert Banner (1-line) */}
                  <div className={cn(
                    'flex-shrink-0 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs',
                    isCritical
                      ? 'bg-[#FFF1EF] border-[#D92D20]/20 text-[#D92D20]'
                      : 'bg-[#FFF6E4] border-[#D99000]/20 text-[#D99000]'
                  )}>
                    <div className="flex items-center gap-2">
                      {isCritical ? (
                        <AlertTriangle className="w-4 h-4 text-[#D92D20] flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#D99000] flex-shrink-0" />
                      )}
                      <span className="font-bold text-[#111827]">
                        {currentRun.incident.mechanism}
                      </span>
                      <span className="text-[#64748B] hidden md:inline">
                        — {currentRun.incident.detail || 'High impact trauma pre-alert.'}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold uppercase font-mono">
                      Protocol: {isCritical ? 'Primary Resus' : 'Urgent Assessment'}
                    </span>
                  </div>

                  {/* 3-Column Overview Grid (Fits comfortably within viewport) */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                    {/* LEFT COLUMN: Latest Vitals (approx 3.8 / 12) */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E3EAF2] p-4 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <div className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-[#2878D7]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                              Latest Vitals
                            </h3>
                          </div>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {formatRelativeMinutes(latestVitals?.timestamp)}
                          </span>
                        </div>

                        {/* Vitals Rows */}
                        <div className="mt-3 space-y-2.5">
                          {/* Heart Rate */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-[#D92D20]" />
                              <div>
                                <span className="text-xs font-bold text-[#111827] block">Heart Rate</span>
                                <span className="text-[10px] text-[#64748B]">Norm 60–100 bpm</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-lg font-black text-[#111827]">
                                {latestVitals?.hr?.value ?? 112}
                              </span>
                              <span className="text-[10px] text-[#64748B] ml-1">bpm</span>
                            </div>
                          </div>

                          {/* Blood Pressure */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-[#2878D7]" />
                              <div>
                                <span className="text-xs font-bold text-[#111827] block">Blood Pressure</span>
                                <span className="text-[10px] text-[#64748B]">Norm 120/80 mmHg</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                'font-mono text-lg font-black',
                                (latestVitals?.sbp?.value ?? 98) < 95 ? 'text-[#D92D20]' : 'text-[#111827]'
                              )}>
                                {latestVitals?.sbp?.value ?? 98}/{latestVitals?.dbp?.value ?? 64}
                              </span>
                              <span className="text-[10px] text-[#64748B] ml-1">mmHg</span>
                            </div>
                          </div>

                          {/* SpO2 & Resp Rate Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                              <span className="text-[10px] font-bold text-[#64748B] block">SpO₂ Oxygen</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-mono text-base font-black text-[#111827]">
                                  {latestVitals?.spo2?.value ?? 97}%
                                </span>
                                <span className="text-[10px] text-[#19A974] font-semibold">Norm</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                              <span className="text-[10px] font-bold text-[#64748B] block">Resp. Rate</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-mono text-base font-black text-[#111827]">
                                  {latestVitals?.rr?.value ?? 20}
                                </span>
                                <span className="text-[10px] text-[#64748B]">/min</span>
                              </div>
                            </div>
                          </div>

                          {/* GCS Score */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EEF5FF] border border-[#2878D7]/20">
                            <div>
                              <span className="text-xs font-bold text-[#2878D7] block">GCS Assessment</span>
                              <span className="text-[10px] font-mono text-[#2878D7]">
                                E{latestVitals?.gcs?.components?.eye ?? 4} V{latestVitals?.gcs?.components?.verbal ?? 4} M{latestVitals?.gcs?.components?.motor ?? 6}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-lg font-black text-[#2878D7]">
                                {latestVitals?.gcs?.total ?? 14}
                              </span>
                              <span className="text-[10px] text-[#2878D7] ml-0.5">/ 15</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDrawerType('vitals-trend')}
                        className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-[#2878D7] bg-[#EEF5FF] hover:bg-[#2878D7] hover:text-white transition-colors text-center cursor-pointer"
                      >
                        Inspect Vitals Trend ({vitalsList.length} Readings)
                      </button>
                    </div>

                    {/* CENTER COLUMN: Key Clinical Findings (approx 4.8 / 12) */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E3EAF2] p-4 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-[#2878D7]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                              Key Clinical Findings
                            </h3>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF1EF] text-[#D92D20]">
                            {currentRun.injuries.length} Injuries
                          </span>
                        </div>

                        {/* Mechanism & Injury Highlights */}
                        <div className="mt-3 space-y-2.5">
                          {/* Incident location & detail */}
                          <div className="p-3 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                              Mechanism of Injury
                            </span>
                            <p className="text-xs font-extrabold text-[#111827] leading-snug">
                              {currentRun.incident.mechanism}
                            </p>
                            <p className="text-[11px] text-[#64748B] leading-relaxed">
                              {currentRun.incident.detail}
                            </p>
                          </div>

                          {/* Injury List Rows */}
                          <div className="space-y-1.5">
                            {currentRun.injuries.slice(0, 3).map((inj) => {
                              const isSevere = inj.severity === 'severe' || inj.severity === 'critical'
                              return (
                                <div
                                  key={inj.id}
                                  className={cn(
                                    'p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2',
                                    isSevere
                                      ? 'bg-[#FFF1EF] border-[#D92D20]/20'
                                      : 'bg-[#F8FBFF] border-[#E3EAF2]'
                                  )}
                                >
                                  <div>
                                    <span className="font-extrabold text-[#111827] capitalize block">
                                      {inj.region.replace(/-/g, ' ')} — {inj.type}
                                    </span>
                                    {inj.notes && (
                                      <span className="text-[11px] text-[#64748B] line-clamp-1">
                                        {inj.notes}
                                      </span>
                                    )}
                                  </div>

                                  <span className={cn(
                                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded',
                                    isSevere
                                      ? 'bg-[#D92D20] text-white'
                                      : 'bg-white text-[#64748B] border border-[#E3EAF2]'
                                  )}>
                                    {inj.severity}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDrawerType('body-map')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-[#2878D7] bg-[#EEF5FF] hover:bg-[#2878D7] hover:text-white transition-colors text-center cursor-pointer"
                        >
                          3D Injury Map
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('clinical')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-[#111827] bg-[#F8FBFF] border border-[#E3EAF2] hover:bg-slate-100 transition-colors text-center cursor-pointer"
                        >
                          All Clinical Details →
                        </button>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Arrival / Preparation Summary (approx 3.2 / 12) */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E3EAF2] p-4 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#19A974]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                              Readiness Status
                            </h3>
                          </div>
                          <span className="text-xs font-extrabold text-[#19A974]">
                            {prepReadyCount}/{prepTotalCount}
                          </span>
                        </div>

                        {/* Preparation Mini Checklist */}
                        <div className="mt-3 space-y-2">
                          <div className="p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                            <span className="text-[10px] text-[#64748B] font-bold block uppercase">
                              Assigned Bay
                            </span>
                            <span className="font-extrabold text-sm text-[#111827] block">
                              Resus Bay 2 (Ready)
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2]">
                            <span className="text-[10px] text-[#64748B] font-bold block uppercase">
                              Trauma Team
                            </span>
                            <span className="font-extrabold text-sm text-[#111827] block">
                              Level 1 Trauma Activated
                            </span>
                          </div>

                          {/* Blood Bank Mini Status */}
                          <div className={cn(
                            'p-2.5 rounded-xl border',
                            hasBlood
                              ? 'bg-[#FFF1EF] border-[#D92D20]/20'
                              : 'bg-[#F8FBFF] border-[#E3EAF2]'
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-[#D92D20]">
                                Blood Products
                              </span>
                              <span className="text-[10px] font-bold text-[#D92D20] capitalize">
                                {bloodReq?.status ?? 'None'}
                              </span>
                            </div>
                            <span className="font-extrabold text-xs text-[#111827] block mt-0.5">
                              {bloodReq?.unitsRequested ?? 4} Units O-Negative PRBCs
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('preparation')}
                        className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-[#111827] bg-[#EEF5FF] border border-[#2878D7]/20 hover:bg-[#2878D7] hover:text-white transition-colors text-center cursor-pointer"
                      >
                        Open Preparation Board ({prepReadyCount}/{prepTotalCount})
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: CLINICAL (Controlled inner scroll)                     */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'clinical' && (
                <motion.div
                  key="tab-clinical"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full overflow-y-auto pr-1 space-y-4"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Mechanism & Structured Injuries */}
                    <div className="space-y-4">
                      {/* Mechanism Module */}
                      <div className="bg-white rounded-2xl border border-[#E3EAF2] p-4 shadow-xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                            Mechanism of Injury
                          </span>
                          <span className="text-[11px] text-[#64748B] font-mono">
                            Time: {currentRun.incident.time ?? 'Scene'}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-[#111827]">
                          {currentRun.incident.mechanism}
                        </h4>
                        <p className="text-xs text-[#64748B] leading-relaxed">
                          {currentRun.incident.detail}
                        </p>
                        {currentRun.incident.location && (
                          <div className="flex items-center gap-1.5 text-xs text-[#64748B] pt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#2878D7]" />
                            <span className="font-mono">{currentRun.incident.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Injuries Module */}
                      <div className="bg-white rounded-2xl border border-[#E3EAF2] p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                              Documented Injuries
                            </span>
                            <span className="text-xs font-bold px-2 py-0.2 rounded-full bg-[#FFF1EF] text-[#D92D20]">
                              {currentRun.injuries.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDrawerType('body-map')}
                            className="text-xs font-bold text-[#2878D7] hover:underline cursor-pointer"
                          >
                            Open 3D Map
                          </button>
                        </div>

                        <div className="space-y-2">
                          {currentRun.injuries.map((inj) => (
                            <div
                              key={inj.id}
                              className="p-3 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#111827] capitalize">
                                  {inj.region.replace(/-/g, ' ')}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-white text-[#64748B] border border-[#E3EAF2]">
                                  {inj.type} · {inj.severity}
                                </span>
                              </div>
                              {inj.notes && (
                                <p className="text-[#64748B] leading-snug">{inj.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Treatments & Structured MIST */}
                    <div className="space-y-4">
                      {/* Pre-Hospital Treatments */}
                      <div className="bg-white rounded-2xl border border-[#E3EAF2] p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                            Pre-Hospital Interventions ({currentRun.treatments.length})
                          </span>
                          <span className="text-[10px] text-[#64748B]">Administered en route</span>
                        </div>

                        <div className="space-y-2">
                          {currentRun.treatments.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-2.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#111827] block">{tx.description}</span>
                                <span className="text-[11px] text-[#64748B]">{tx.detail}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#64748B]">
                                {formatRelativeMinutes(tx.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* MIST Protocol Summary */}
                      <div className="bg-white rounded-2xl border border-[#E3EAF2] p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E3EAF2]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                            Structured MIST Protocol
                          </span>
                          <button
                            type="button"
                            onClick={() => setDrawerType('mist-full')}
                            className="text-xs font-bold text-[#2878D7] hover:underline cursor-pointer"
                          >
                            Full Report
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-[#EEF5FF] border border-[#2878D7]/20">
                            <span className="font-bold text-[#2878D7] text-[10px] block">M · MECHANISM</span>
                            <span className="text-[#111827] line-clamp-2 mt-0.5">{currentRun.mist?.mechanism ?? currentRun.incident.mechanism}</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#FFF1EF] border border-[#D92D20]/20">
                            <span className="font-bold text-[#D92D20] text-[10px] block">I · INJURIES</span>
                            <span className="text-[#111827] line-clamp-2 mt-0.5">{currentRun.mist?.injuries ?? 'Pelvis, scalp, chest'}</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#FFF6E4] border border-[#D99000]/20">
                            <span className="font-bold text-[#D99000] text-[10px] block">S · SIGNS / VITALS</span>
                            <span className="text-[#111827] line-clamp-2 mt-0.5">{currentRun.mist?.signs ?? 'BP 98/64, HR 112, SpO2 97%'}</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#ECF9F3] border border-[#19A974]/20">
                            <span className="font-bold text-[#19A974] text-[10px] block">T · TREATMENT</span>
                            <span className="text-[#111827] line-clamp-2 mt-0.5">{currentRun.mist?.treatment ?? 'O2, IV Access, Pelvic binder'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: PREPARATION (ACTIONABLE BOARD, NO SCROLL)              */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'preparation' && (
                <motion.div
                  key="tab-preparation"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Board Header & Progress Meter */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E3EAF2]">
                      <div>
                        <h2 className="text-base font-extrabold text-[#111827]">
                          Hospital Readiness Board
                        </h2>
                        <p className="text-xs text-[#64748B]">
                          Click any department card to cycle readiness (Pending → In Progress → Ready)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-[#19A974]">
                          {prepReadyCount} / {prepTotalCount} READY
                        </span>
                        <div className="w-32 h-2.5 rounded-full bg-[#E3EAF2] overflow-hidden">
                          <div
                            className="h-full bg-[#19A974] rounded-full transition-all duration-300"
                            style={{ width: `${prepPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 6 Preparation Cards Grid (Direct Actionable Modules) */}
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
                              'p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none shadow-xs',
                              isReady
                                ? 'bg-[#ECF9F3] border-[#19A974]/30 text-[#0F5132]'
                                : isInProgress
                                ? 'bg-[#FFF6E4] border-[#D99000]/30 text-[#8C5E00]'
                                : 'bg-[#F8FBFF] border-[#E3EAF2] text-[#111827] hover:bg-slate-50'
                            )}
                          >
                            <div>
                              <span className="font-extrabold text-sm block">{item.label}</span>
                              <span className="text-[11px] text-[#64748B] block mt-0.5">
                                Dept: {item.team} · <span className="capitalize font-semibold">{item.status.replace('-', ' ')}</span>
                              </span>
                            </div>

                            <div className="flex-shrink-0">
                              {isReady ? (
                                <span className="w-7 h-7 rounded-full bg-[#19A974] text-white flex items-center justify-center text-xs font-bold">
                                  ✓
                                </span>
                              ) : isInProgress ? (
                                <span className="w-7 h-7 rounded-full bg-[#D99000] text-white flex items-center justify-center text-xs font-bold">
                                  ◐
                                </span>
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-[#E3EAF2] text-[#64748B] flex items-center justify-center text-xs font-bold">
                                  ○
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Dedicated Emergency Blood Bank Subordinate Action */}
                  {hasBlood && (
                    <div className="p-4 rounded-2xl bg-[#FFF1EF] border border-[#D92D20]/20 text-xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#D92D20] text-white flex items-center justify-center flex-shrink-0">
                          <Droplets className="w-5 h-5 fill-white" />
                        </div>
                        <div>
                          <span className="font-extrabold text-sm text-[#D92D20] block">
                            Emergency Blood Requisition: {bloodReq?.unitsRequested ?? 4} Units O-Negative PRBCs
                          </span>
                          <span className="text-[#64748B] text-xs">
                            Status: <strong className="uppercase font-mono">{bloodReq?.status}</strong> · Standby recipient: Resus Bay 2
                          </span>
                        </div>
                      </div>

                      {isPrimary && bloodReq?.status === 'preparing' && (
                        <button
                          type="button"
                          onClick={() => updateBloodStatus('ready', { recipient: 'Bay 2 Standby' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D92D20] text-white hover:bg-[#b02217] transition-colors shadow-xs cursor-pointer flex-shrink-0"
                        >
                          Confirm Blood Arrived at Bay 2
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 4: ACTIVITY (Controlled inner timeline)                   */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'activity' && (
                <motion.div
                  key="tab-activity"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E3EAF2] flex-shrink-0">
                    <div>
                      <h2 className="text-base font-extrabold text-[#111827]">
                        Chronological Case Activity Stream
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Real-time audit log of synthetic clinical events and hospital handoffs
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#64748B]">
                      {currentRun.events.length} Events Logged
                    </span>
                  </div>

                  {/* Controlled Inner Timeline Scroll */}
                  <div className="flex-1 overflow-y-auto min-h-0 pt-4 pl-6 relative before:absolute before:left-2 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#E3EAF2]">
                    <div className="space-y-4">
                      {[...currentRun.events].reverse().map((ev, i) => (
                        <div key={ev.id} className="relative text-xs">
                          {/* Timeline dot (Newest event has strongest visual emphasis) */}
                          <span
                            className={cn(
                              'absolute -left-6 top-1 rounded-full border-2 bg-white',
                              i === 0
                                ? 'w-3 h-3 -ml-0.5 border-[#2878D7] bg-[#2878D7]'
                                : 'w-2.5 h-2.5 border-[#E3EAF2]'
                            )}
                          />

                          <div className="flex items-center justify-between gap-4">
                            <span className={cn(
                              'font-bold',
                              i === 0 ? 'text-sm text-[#111827]' : i < 3 ? 'text-xs text-[#111827]' : 'text-xs text-[#64748B]'
                            )}>
                              {ev.description}
                            </span>
                            <span className="font-mono text-[10px] text-[#64748B] flex-shrink-0">
                              {formatClockTime(ev.timestamp)}
                            </span>
                          </div>

                          {ev.operator && (
                            <span className="text-[11px] text-[#64748B] block mt-0.5 font-mono">
                              Logged by {ev.operator} · {ev.source}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── PROGRESSIVE DISCLOSURE MODALS / DRAWERS ─────────────────────────── */}
      <AnimatePresence>
        {drawerType !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl border border-[#E3EAF2] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[#111827]"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#E3EAF2] flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#111827]">
                    {drawerType === 'vitals-trend' && 'Physiological Vitals Trend'}
                    {drawerType === 'body-map' && 'Interactive Anatomical Body Map'}
                    {drawerType === 'mist-full' && 'Complete MIST Handover Report'}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Patient: {currentRun.patient.name ?? 'Unknown Male'} · Unit {currentRun.callsign}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerType('none')}
                  className="p-1.5 rounded-xl text-[#64748B] hover:text-[#111827] hover:bg-[#F8FBFF] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto flex-1">
                {/* 1. Vitals Trend Table */}
                {drawerType === 'vitals-trend' && (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#E3EAF2] text-[#64748B] uppercase text-[10px]">
                          <th className="py-2">Time</th>
                          <th className="py-2">Source</th>
                          <th className="py-2">HR (bpm)</th>
                          <th className="py-2">BP (mmHg)</th>
                          <th className="py-2">SpO₂ (%)</th>
                          <th className="py-2">RR (/min)</th>
                          <th className="py-2">GCS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3EAF2]">
                        {vitalsList.map((v) => (
                          <tr key={v.id} className="hover:bg-[#F8FBFF]">
                            <td className="py-2.5 font-semibold text-[#111827]">{formatClockTime(v.timestamp)}</td>
                            <td className="py-2.5 text-[#64748B] font-sans text-xs">{v.assessedBy ?? v.source}</td>
                            <td className="py-2.5 font-bold text-[#111827]">{v.hr?.value ?? '—'}</td>
                            <td className="py-2.5 font-bold text-[#111827]">{v.sbp?.value ?? '—'}/{v.dbp?.value ?? '—'}</td>
                            <td className="py-2.5 font-bold text-[#111827]">{v.spo2?.value ?? '—'}%</td>
                            <td className="py-2.5 font-bold text-[#111827]">{v.rr?.value ?? '—'}</td>
                            <td className="py-2.5 font-bold text-[#2878D7]">{v.gcs?.total ?? '—'}/15</td>
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
                  <div className="space-y-3 text-xs font-sans">
                    <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] space-y-1">
                      <span className="font-bold text-[#2878D7] uppercase">M · Mechanism of Injury</span>
                      <p className="text-[#111827] leading-relaxed">
                        {currentRun.mist?.mechanism ?? currentRun.incident.mechanism}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] space-y-1">
                      <span className="font-bold text-[#D92D20] uppercase">I · Injuries Found</span>
                      <p className="text-[#111827] leading-relaxed whitespace-pre-line">
                        {currentRun.mist?.injuries ?? 'Pelvic instability, scalp laceration'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] space-y-1">
                      <span className="font-bold text-[#D99000] uppercase">S · Signs & Vital Readings</span>
                      <p className="text-[#111827] leading-relaxed">
                        {currentRun.mist?.signs ?? 'HR 112, BP 98/64, SpO2 97%, GCS 14'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#E3EAF2] space-y-1">
                      <span className="font-bold text-[#19A974] uppercase">T · Treatment Given</span>
                      <p className="text-[#111827] leading-relaxed whitespace-pre-line">
                        {currentRun.mist?.treatment ?? 'Oxygen, IV fluids, pelvic binder'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[#64748B] text-[11px]">
                      <span>Confirmed by: {currentRun.mist?.confirmedBy ?? 'Para. J. Chen'}</span>
                      <span>Timestamp: {formatClockTime(currentRun.mist?.confirmedAt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3 border-t border-[#E3EAF2] flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDrawerType('none')}
                  className="rounded-xl font-bold text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
