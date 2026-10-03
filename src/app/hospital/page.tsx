'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Activity, Clock, Bell, Check, AlertTriangle, ChevronRight,
  Radio, Layers, Droplets, User, ArrowLeft, MapPin, Heart,
  RefreshCw, Filter, Search, X, Shield, Send, CheckCircle2,
  AlertCircle, FileText, Stethoscope, Bed, Phone, ExternalLink,
  ChevronDown, HelpCircle, Thermometer, Wind, Eye
} from 'lucide-react'
import { useRunStore, initRunSync } from '@/lib/runStore'
import { DEMO_RUN, DEMO_SECONDARY_CASE, AVAILABLE_HOSPITALS } from '@/data/demoRun'
import type { EmergencyRun, HospitalPrep, BloodBankStatus, RunEvent } from '@/types/run'
import { Button, Input, Textarea, Card, Badge, StatusChip } from '@/components/ui'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type HospitalTab = 'overview' | 'mist' | 'prep' | 'blood' | 'timeline'

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

  // Auto-load demo if no run exists
  useEffect(() => {
    if (!activeRun) {
      loadDemoRun()
    }
  }, [activeRun, loadDemoRun])

  // Selected case state: 'primary' (activeRun ?? DEMO_RUN) vs 'secondary' (DEMO_SECONDARY_CASE)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('primary')
  const [activeTab, setActiveTab] = useState<HospitalTab>('overview')
  const [now, setNow] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'urgent'>('all')

  // Clarification form state
  const [showClarificationInput, setShowClarificationInput] = useState(false)
  const [clarificationText, setClarificationText] = useState('')

  // New ED note form state
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Current primary run
  const primaryRun = activeRun ?? DEMO_RUN
  const secondaryRun = DEMO_SECONDARY_CASE

  // Active displayed run
  const currentRun: EmergencyRun = selectedCaseId === 'secondary' ? secondaryRun : primaryRun
  const isPrimary = selectedCaseId !== 'secondary'

  // Format timestamps
  const formatTime = (iso?: string) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return iso
    }
  }

  const formatShortTime = (iso?: string) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  // Hospital prep counters
  const prepReadyCount = currentRun.hospitalPrep.filter((p) => p.status === 'ready').length
  const prepTotalCount = currentRun.hospitalPrep.length

  // Blood bank status helper
  const bloodStatus = currentRun.bloodBankRequest?.status ?? 'not-requested'

  return (
    <div className="min-h-screen bg-[#0A1120] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* ── Demo Safeguards Banner ─────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[10px]">DEMO CONSOLE</span>
          <span>Simulated hospital receiving dashboard · Synthetic clinical events · Not connected to NHS Spine or live telemetry</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400">Live Sync (BroadcastChannel)</span>
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline">{now.toLocaleTimeString('en-GB')}</span>
        </div>
      </div>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="bg-[#0F1E36] border-b border-[#1E3A5F] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-sm font-bold tracking-tight text-white block leading-none">
                TRAUMA<span className="text-sky-400">BRIDGE</span>
              </span>
              <span className="font-mono text-[9px] text-slate-400 tracking-wider uppercase block mt-0.5">
                Hospital ED Console
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#1E3A5F]">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-semibold text-slate-200 leading-none">
                St. Bartholomew's Major Trauma Centre
              </p>
              <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                Resus Bay 1–4 · London EC1A 7BE
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Ambulance Switcher */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadDemoRun()}
            className="text-xs bg-[#162A4A] border-[#22426E] text-slate-300 hover:text-white"
            title="Reset demonstration data"
          >
            Reset Demo Run
          </Button>

          <Link
            href="/ambulance"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Open Ambulance Terminal</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </Link>
        </div>
      </header>

      {/* ── Main Layout: Sidebar Inbound Cases + Case Workspace ────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── LEFT: Incoming Cases Rail (320px - 380px) ────────────────────── */}
        <aside className="w-full lg:w-[360px] xl:w-[380px] flex-shrink-0 bg-[#0C172B] border-r border-[#1E3A5F] flex flex-col">
          {/* Rail Header */}
          <div className="p-4 border-b border-[#1E3A5F]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-400" />
                <h2 className="font-semibold text-sm text-white">Inbound Emergency Cases</h2>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                2 Active
              </span>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSeverityFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  severityFilter === 'all'
                    ? 'bg-sky-500 text-white'
                    : 'bg-[#16263F] text-slate-400 hover:text-slate-200'
                )}
              >
                All (2)
              </button>
              <button
                onClick={() => setSeverityFilter('critical')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  severityFilter === 'critical'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#16263F] text-slate-400 hover:text-slate-200'
                )}
              >
                Critical (P1)
              </button>
              <button
                onClick={() => setSeverityFilter('urgent')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  severityFilter === 'urgent'
                    ? 'bg-amber-500 text-white'
                    : 'bg-[#16263F] text-slate-400 hover:text-slate-200'
                )}
              >
                Urgent (P2)
              </button>
            </div>
          </div>

          {/* Inbound Cases List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* 1. Primary Synced Case (Alpha 7) */}
            {(severityFilter === 'all' || severityFilter === 'critical') && (
              <div
                onClick={() => setSelectedCaseId('primary')}
                className={cn(
                  'p-3.5 rounded-xl border transition-all cursor-pointer relative',
                  selectedCaseId === 'primary'
                    ? 'bg-[#152744] border-sky-500 shadow-md shadow-sky-500/10'
                    : 'bg-[#101D33] border-[#1D3557] hover:border-slate-600'
                )}
              >
                {selectedCaseId === 'primary' && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-sky-400 rounded-r" />
                )}

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">
                      {primaryRun.callsign}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      #{primaryRun.id.slice(0, 12)}
                    </span>
                  </div>
                  <Badge variant="red" size="sm" className="bg-red-500/20 text-red-400 border border-red-500/30">
                    P1 CRITICAL
                  </Badge>
                </div>

                <p className="text-xs font-semibold text-slate-200 mb-1">
                  {primaryRun.patient.name ?? `Unknown ${primaryRun.patient.sex ?? 'Male'}, ~${primaryRun.patient.estimatedAge ?? 38}y`}
                </p>

                <p className="text-xs text-slate-400 line-clamp-1 mb-2.5">
                  {primaryRun.incident.mechanism ?? 'Road Traffic Collision'}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-[#1C3252]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>ETA: <strong className="text-white">{primaryRun.eta ?? 4} min</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusChip status={primaryRun.alertStatus} size="sm" />
                    {primaryRun.bloodBankRequest && (
                      <span className="w-2 h-2 rounded-full bg-red-500" title="Blood requested" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Secondary Case (Bravo 3) */}
            {(severityFilter === 'all' || severityFilter === 'urgent') && (
              <div
                onClick={() => setSelectedCaseId('secondary')}
                className={cn(
                  'p-3.5 rounded-xl border transition-all cursor-pointer relative',
                  selectedCaseId === 'secondary'
                    ? 'bg-[#152744] border-sky-500 shadow-md shadow-sky-500/10'
                    : 'bg-[#101D33] border-[#1D3557] hover:border-slate-600'
                )}
              >
                {selectedCaseId === 'secondary' && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-sky-400 rounded-r" />
                )}

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">
                      {secondaryRun.callsign}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      #{secondaryRun.id.slice(0, 12)}
                    </span>
                  </div>
                  <Badge variant="amber" size="sm" className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    P2 URGENT
                  </Badge>
                </div>

                <p className="text-xs font-semibold text-slate-200 mb-1">
                  {secondaryRun.patient.name} ({secondaryRun.patient.estimatedAge}y {secondaryRun.patient.sex})
                </p>

                <p className="text-xs text-slate-400 line-clamp-1 mb-2.5">
                  {secondaryRun.incident.mechanism}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-[#1C3252]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>ETA: <strong className="text-white">{secondaryRun.eta ?? 11} min</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusChip status={secondaryRun.alertStatus} size="sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bay Capacity Status Box */}
          <div className="p-3 bg-[#0A1322] border-t border-[#1E3A5F]">
            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              Resuscitation Bays Status
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#122038] border border-[#1E3559]">
                <span className="text-slate-400 block text-[10px]">Bay 1</span>
                <span className="text-amber-400 font-semibold">Occupied (Trauma)</span>
              </div>
              <div className="p-2 rounded-lg bg-[#122038] border border-sky-500/40">
                <span className="text-slate-400 block text-[10px]">Bay 2</span>
                <span className="text-sky-400 font-semibold">Assigned (Alpha 7)</span>
              </div>
              <div className="p-2 rounded-lg bg-[#122038] border border-emerald-500/30">
                <span className="text-slate-400 block text-[10px]">Bay 3</span>
                <span className="text-emerald-400 font-semibold">Ready / Clean</span>
              </div>
              <div className="p-2 rounded-lg bg-[#122038] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Bay 4</span>
                <span className="text-slate-300 font-semibold">Ready / Clean</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT: Selected Case Console (Flex 1) ────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#0A1120]">
          {/* ── Case Hero Banner ───────────────────────────────────────────── */}
          <div className="bg-[#0F1E38] border-b border-[#1E3A5F] p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    UNIT {currentRun.callsign}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    Lead: {currentRun.crewLead}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-xs text-slate-400">
                    Status: <strong className="text-slate-200 capitalize">{currentRun.status.replace(/-/g, ' ')}</strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-xs text-slate-400">
                    Last update: {formatTime(currentRun.updatedAt)}
                  </span>
                </div>

                <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                  <span>{currentRun.patient.name ?? `Unknown ${currentRun.patient.sex ?? 'Male'}, ~${currentRun.patient.estimatedAge ?? 38}y`}</span>
                  <span className="text-sm font-normal text-slate-400 font-mono">
                    [{currentRun.patient.identityStatus === 'known' ? 'ID VERIFIED' : 'UNIDENTIFIED'}]
                  </span>
                </h1>

                <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                  {currentRun.incident.mechanism}
                  {currentRun.incident.detail ? ` — ${currentRun.incident.detail}` : ''}
                </p>
              </div>

              {/* Handover & Pre-Alert Action Panel */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {currentRun.alertStatus === 'sent' && isPrimary ? (
                  <Button
                    id="btn-ack-prealert"
                    variant="success"
                    size="lg"
                    icon={<CheckCircle2 className="w-5 h-5 text-white" />}
                    onClick={() => acknowledgeAlert('Dr. E. Vance (ED Trauma Lead)')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 animate-pulse"
                  >
                    Acknowledge Pre-Alert
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block leading-tight">
                        Pre-Alert Acknowledged
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentRun.alertAcknowledgedBy ?? 'ED Trauma Team Leader'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Blood Bank Shortcut Pill */}
                {currentRun.bloodBankRequest && (
                  <button
                    onClick={() => setActiveTab('blood')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-left"
                  >
                    <Droplets className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-red-400 block leading-tight">
                        Blood Alert: {currentRun.bloodBankRequest.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentRun.bloodBankRequest.unitsRequested}u {currentRun.bloodBankRequest.productType}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1A3356]">
              <div className="bg-[#122340] p-2.5 rounded-xl border border-[#1E3A5F]">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Est. Time of Arrival</span>
                <span className="font-mono text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  {currentRun.eta ?? 4} min
                </span>
              </div>
              <div className="bg-[#122340] p-2.5 rounded-xl border border-[#1E3A5F]">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Bay</span>
                <span className="font-mono text-lg font-bold text-sky-400 flex items-center gap-1.5 mt-0.5">
                  <Bed className="w-4 h-4" />
                  Resus Bay 2
                </span>
              </div>
              <div className="bg-[#122340] p-2.5 rounded-xl border border-[#1E3A5F]">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Hospital Preparation</span>
                <span className="font-mono text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-4 h-4" />
                  {prepReadyCount}/{prepTotalCount} Ready
                </span>
              </div>
              <div className="bg-[#122340] p-2.5 rounded-xl border border-[#1E3A5F]">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Blood Bank Status</span>
                <span className="font-mono text-lg font-bold text-amber-400 flex items-center gap-1.5 mt-0.5 capitalize">
                  <Droplets className="w-4 h-4 text-red-400" />
                  {bloodStatus.replace(/-/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* ── Console Navigation Tabs ────────────────────────────────────── */}
          <div className="px-4 lg:px-6 bg-[#0E1A30] border-b border-[#1E3A5F] flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Clinical Overview & Vitals', icon: Stethoscope },
              { id: 'mist', label: 'MIST Handover', icon: FileText },
              { id: 'prep', label: `Hospital Prep (${prepReadyCount}/${prepTotalCount})`, icon: Layers },
              { id: 'blood', label: 'Blood Bank Coordination', icon: Droplets, highlight: bloodStatus !== 'not-requested' },
              { id: 'timeline', label: `Event Trail (${currentRun.events.length})`, icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon
              const isCurrent = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as HospitalTab)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all',
                    isCurrent
                      ? 'border-sky-400 text-sky-400 bg-sky-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5',
                    tab.highlight && !isCurrent ? 'text-red-400' : ''
                  )}
                >
                  <Icon className={cn('w-4 h-4', tab.highlight ? 'text-red-400' : '')} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── Tab Views ──────────────────────────────────────────────────── */}
          <div className="p-4 lg:p-6 flex-1">
            {/* 1. CLINICAL OVERVIEW & VITALS */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Latest Vitals Panel */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-400" />
                      Latest Vital Observations
                    </h2>
                    {currentRun.vitalObservations.length > 0 && (
                      <span className="font-mono text-xs text-slate-400">
                        Assessed by {currentRun.vitalObservations[currentRun.vitalObservations.length - 1].assessedBy ?? 'Monitor'} · {formatShortTime(currentRun.vitalObservations[currentRun.vitalObservations.length - 1].timestamp)}
                      </span>
                    )}
                  </div>

                  {(() => {
                    const latest = currentRun.vitalObservations[currentRun.vitalObservations.length - 1]
                    if (!latest) {
                      return (
                        <div className="p-6 rounded-2xl bg-[#101D33] border border-[#1E3A5F] text-center text-slate-400">
                          No vital observations recorded yet.
                        </div>
                      )
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* HR */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Heart Rate</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={cn('font-mono text-2xl font-bold', (latest.hr?.value ?? 0) > 100 ? 'text-amber-400' : 'text-white')}>
                              {latest.hr?.value ?? '—'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">bpm</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1">Normal: 60–100</span>
                        </div>

                        {/* BP */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Blood Pressure</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={cn('font-mono text-2xl font-bold', (latest.sbp?.value ?? 120) < 100 ? 'text-red-400' : 'text-white')}>
                              {latest.sbp?.value ?? '—'}/{latest.dbp?.value ?? '—'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">mmHg</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1">Normal: 120/80</span>
                        </div>

                        {/* SpO2 */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">SpO₂ Oxygen</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={cn('font-mono text-2xl font-bold', (latest.spo2?.value ?? 100) < 95 ? 'text-amber-400' : 'text-white')}>
                              {latest.spo2?.value ?? '—'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">%</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1">Normal: 95–100%</span>
                        </div>

                        {/* RR */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Resp. Rate</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={cn('font-mono text-2xl font-bold', (latest.rr?.value ?? 16) > 20 ? 'text-amber-400' : 'text-white')}>
                              {latest.rr?.value ?? '—'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">brpm</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1">Normal: 12–20</span>
                        </div>

                        {/* GCS */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Glasgow Coma Scale</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={cn('font-mono text-2xl font-bold', (latest.gcs?.total ?? 15) < 15 ? 'text-amber-400' : 'text-white')}>
                              {latest.gcs?.total ?? '—'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">/15</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1">
                            E:{latest.gcs?.components?.eye ?? '·'} V:{latest.gcs?.components?.verbal ?? '·'} M:{latest.gcs?.components?.motor ?? '·'}
                          </span>
                        </div>

                        {/* Source */}
                        <div className="p-3.5 rounded-2xl bg-[#11213D] border border-[#1E3A5F]">
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Data Source</span>
                          <span className="inline-block mt-2 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 capitalize">
                            {latest.source}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400 block mt-1.5">
                            {latest.assessedBy ?? 'Direct Entry'}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </section>

                {/* Vitals Trend Table */}
                {currentRun.vitalObservations.length > 1 && (
                  <section className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
                      Physiological Trend Over Time
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="text-slate-400 border-b border-[#1E3A5F] text-left">
                            <th className="pb-2">Time</th>
                            <th className="pb-2">Source</th>
                            <th className="pb-2">HR (bpm)</th>
                            <th className="pb-2">BP (mmHg)</th>
                            <th className="pb-2">SpO₂ (%)</th>
                            <th className="pb-2">RR (brpm)</th>
                            <th className="pb-2">GCS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#182C4E]">
                          {currentRun.vitalObservations.map((obs) => (
                            <tr key={obs.id} className="text-slate-200">
                              <td className="py-2 text-slate-400">{formatShortTime(obs.timestamp)}</td>
                              <td className="py-2 text-sky-400 capitalize">{obs.source}</td>
                              <td className="py-2">{obs.hr?.value ?? '—'}</td>
                              <td className="py-2">{obs.sbp?.value ?? '—'}/{obs.dbp?.value ?? '—'}</td>
                              <td className="py-2">{obs.spo2?.value ?? '—'}%</td>
                              <td className="py-2">{obs.rr?.value ?? '—'}</td>
                              <td className="py-2">{obs.gcs?.total ?? '—'}/15</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Split: Injury Map Summary & Treatments */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recorded Injuries */}
                  <section className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-400" />
                        Recorded Injuries ({currentRun.injuries.length})
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400">Anatomical assessment</span>
                    </div>

                    {currentRun.injuries.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No injuries mapped.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {currentRun.injuries.map((inj) => (
                          <div key={inj.id} className="p-3 rounded-xl bg-[#142440] border border-[#1E3A5F]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-xs text-white capitalize">
                                {inj.laterality !== 'na' ? `${inj.laterality} ` : ''}{inj.region.replace(/-/g, ' ')}
                              </span>
                              <Badge
                                variant={
                                  inj.severity === 'critical' || inj.severity === 'severe'
                                    ? 'red'
                                    : inj.severity === 'moderate'
                                    ? 'amber'
                                    : 'emerald'
                                }
                                size="sm"
                              >
                                {inj.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                              <span className="font-mono capitalize text-sky-400">{inj.type} trauma</span>
                              <span>·</span>
                              <span>Assessed by {inj.assessedBy ?? 'Crew'}</span>
                            </div>
                            {inj.notes && (
                              <p className="text-xs text-slate-300 italic bg-[#0D182B] p-2 rounded-lg mt-1 border border-[#182C4C]">
                                "{inj.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Pre-Hospital Treatments */}
                  <section className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-400" />
                        Pre-Hospital Treatments ({currentRun.treatments.length})
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400">Administered en route</span>
                    </div>

                    {currentRun.treatments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No treatments recorded.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {currentRun.treatments.map((tx) => (
                          <div key={tx.id} className="p-3 rounded-xl bg-[#142440] border border-[#1E3A5F]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-xs text-white">{tx.description}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {formatShortTime(tx.timestamp)}
                              </span>
                            </div>
                            {tx.detail && (
                              <p className="text-xs text-slate-300 mb-1.5">{tx.detail}</p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                              <span className="capitalize text-emerald-400 font-medium">{tx.category.replace(/-/g, ' ')}</span>
                              <span>·</span>
                              <span>By {tx.performedBy ?? 'Crew'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* 2. MIST HANDOVER */}
            {activeTab === 'mist' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-6">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E3A5F] mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">MIST Structured Trauma Handover</h2>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Mechanism · Injuries · Signs · Treatment
                      </p>
                    </div>
                    {currentRun.mist?.confirmedBy ? (
                      <Badge variant="emerald" size="md">
                        ✓ Confirmed by {currentRun.mist.confirmedBy}
                      </Badge>
                    ) : (
                      <Badge variant="amber" size="md">
                        Draft / Pending EMT confirmation
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* M */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center font-mono font-bold text-sky-400 text-lg flex-shrink-0">
                        M
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-xs font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                          Mechanism of Injury
                        </span>
                        <div className="p-3.5 rounded-xl bg-[#14233C] border border-[#1E3A5F] text-sm text-slate-200 leading-relaxed">
                          {currentRun.mist?.mechanism ?? currentRun.incident.mechanism ?? 'Mechanism not specified'}
                        </div>
                      </div>
                    </div>

                    {/* I */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center font-mono font-bold text-red-400 text-lg flex-shrink-0">
                        I
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-xs font-semibold text-red-400 uppercase tracking-wider block mb-1">
                          Injuries Found or Suspected
                        </span>
                        <div className="p-3.5 rounded-xl bg-[#14233C] border border-[#1E3A5F] text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                          {currentRun.mist?.injuries ?? 'No injuries recorded'}
                        </div>
                      </div>
                    </div>

                    {/* S */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-lg flex-shrink-0">
                        S
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                          Signs & Physiological Vitals
                        </span>
                        <div className="p-3.5 rounded-xl bg-[#14233C] border border-[#1E3A5F] text-sm font-mono text-slate-200 leading-relaxed">
                          {currentRun.mist?.signs ?? 'Signs pending'}
                        </div>
                      </div>
                    </div>

                    {/* T */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-400 text-lg flex-shrink-0">
                        T
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                          Treatment Administered
                        </span>
                        <div className="p-3.5 rounded-xl bg-[#14233C] border border-[#1E3A5F] text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                          {currentRun.mist?.treatment ?? 'No pre-hospital treatments recorded'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#1E3A5F] flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Generated: {formatTime(currentRun.mist?.generatedAt)}</span>
                    <span>Patient ID: {currentRun.patient.id}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. HOSPITAL PREPARATION CHECKLIST */}
            {activeTab === 'prep' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-6">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E3A5F] mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Trauma Receiving Preparation Checklist</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Tap any station to toggle readiness status across ED teams. Real-time synchronised with ambulance.
                      </p>
                    </div>
                    <div className="font-mono text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      {prepReadyCount} of {prepTotalCount} Stations Ready
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentRun.hospitalPrep.map((prep) => {
                      const nextStatusMap: Record<HospitalPrep['status'], HospitalPrep['status']> = {
                        pending: 'in-progress',
                        'in-progress': 'ready',
                        ready: 'unavailable',
                        unavailable: 'pending',
                      }

                      return (
                        <div
                          key={prep.id}
                          className={cn(
                            'p-4 rounded-xl border transition-all flex flex-col justify-between gap-3',
                            prep.status === 'ready'
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : prep.status === 'in-progress'
                              ? 'bg-sky-500/10 border-sky-500/30'
                              : prep.status === 'unavailable'
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-[#14233C] border-[#1E3A5F]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-sm text-white block">
                                {prep.label}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                Team: {prep.team ?? 'ED Staff'} · Updated {formatShortTime(prep.updatedAt)}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                prep.status === 'ready'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : prep.status === 'in-progress'
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                  : prep.status === 'unavailable'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              )}
                            >
                              {prep.status}
                            </span>
                          </div>

                          {/* Action toggle buttons */}
                          {isPrimary && (
                            <div className="flex items-center gap-1.5 pt-2 border-t border-[#1C3252]">
                              <button
                                onClick={() => updateHospitalPrep(prep.id, 'ready', 'ED Trauma Lead')}
                                className={cn(
                                  'flex-1 py-1 text-[11px] font-semibold rounded transition-colors',
                                  prep.status === 'ready'
                                    ? 'bg-emerald-500 text-white font-bold'
                                    : 'bg-[#1B2F4E] text-slate-300 hover:text-white'
                                )}
                              >
                                Mark Ready
                              </button>
                              <button
                                onClick={() => updateHospitalPrep(prep.id, 'in-progress', 'ED Trauma Lead')}
                                className={cn(
                                  'flex-1 py-1 text-[11px] font-semibold rounded transition-colors',
                                  prep.status === 'in-progress'
                                    ? 'bg-sky-500 text-white font-bold'
                                    : 'bg-[#1B2F4E] text-slate-300 hover:text-white'
                                )}
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() => updateHospitalPrep(prep.id, 'pending', 'ED Trauma Lead')}
                                className={cn(
                                  'px-2 py-1 text-[11px] font-semibold rounded transition-colors',
                                  prep.status === 'pending'
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'bg-[#1B2F4E] text-slate-400 hover:text-white'
                                )}
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 4. BLOOD BANK COORDINATION */}
            {activeTab === 'blood' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-6">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E3A5F] mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold text-white">Transfusion & Blood Bank Coordination</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Emergency blood requisition workflow between pre-hospital crew and MTC blood laboratory.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[10px] text-amber-500 uppercase tracking-widest block font-bold">
                        DEMO SIMULATION
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Status: <strong className="text-white uppercase">{bloodStatus}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Interactive Workflow Stepper */}
                  <div className="mb-8 p-4 rounded-xl bg-[#0D182B] border border-[#192E4E]">
                    <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-3">
                      Requisition Progression
                    </p>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                      {[
                        { key: 'sent', label: '1. Sent' },
                        { key: 'acknowledged', label: '2. Acknowledged' },
                        { key: 'info-requested', label: '3. Clarification' },
                        { key: 'preparing', label: '4. Preparing' },
                        { key: 'ready', label: '5. Ready' },
                      ].map((step, idx) => {
                        const stepOrder = ['sent', 'acknowledged', 'info-requested', 'preparing', 'ready']
                        const curIdx = stepOrder.indexOf(bloodStatus === 'info-received' ? 'preparing' : bloodStatus)
                        const isDone = curIdx >= idx
                        const isCurrent = bloodStatus === step.key || (step.key === 'info-requested' && bloodStatus === 'info-received')

                        return (
                          <div
                            key={step.key}
                            className={cn(
                              'p-2 rounded-lg border transition-all',
                              isCurrent
                                ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                                : isDone
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-[#12223B] border-transparent text-slate-500'
                            )}
                          >
                            <span>{step.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {currentRun.bloodBankRequest ? (
                    <div className="space-y-6">
                      {/* Request Summary Card */}
                      <div className="p-4 rounded-xl bg-[#14233D] border border-[#1E3A5F]">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
                          Requisition Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Product Type</span>
                            <span className="text-white font-bold capitalize mt-0.5 block">
                              {currentRun.bloodBankRequest.productType?.replace(/-/g, ' ') ?? 'O-Negative'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Units Requested</span>
                            <span className="text-red-400 font-bold text-base mt-0.5 block">
                              {currentRun.bloodBankRequest.unitsRequested ?? 4} Units
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Recipient Lab</span>
                            <span className="text-white mt-0.5 block">
                              {currentRun.bloodBankRequest.recipient}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Created At</span>
                            <span className="text-white mt-0.5 block">
                              {formatShortTime(currentRun.bloodBankRequest.createdAt)}
                            </span>
                          </div>
                        </div>

                        {currentRun.bloodBankRequest.clinicalJustification && (
                          <div className="mt-3 pt-3 border-t border-[#1C3252]">
                            <span className="text-[10px] font-mono text-slate-400 block mb-1">Clinical Justification:</span>
                            <p className="text-xs text-slate-200 italic">
                              "{currentRun.bloodBankRequest.clinicalJustification}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Clarification Exchange Box (if active) */}
                      {currentRun.bloodBankRequest.infoRequestText && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">
                              Hospital Clarification Request
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mb-2">
                            "{currentRun.bloodBankRequest.infoRequestText}"
                          </p>

                          {currentRun.bloodBankRequest.infoResponseText ? (
                            <div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-emerald-400 font-mono">
                              <strong>Ambulance Response:</strong> "{currentRun.bloodBankRequest.infoResponseText}"
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between">
                              <span className="text-[11px] text-amber-400 font-mono">
                                Awaiting response from crew...
                              </span>
                              {isPrimary && (
                                <button
                                  onClick={() =>
                                    updateBloodStatus('info-received', {
                                      infoResponseText: 'Confirmed: 18G IV right AC running, estimated weight 80kg.',
                                    })
                                  }
                                  className="text-xs px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors"
                                >
                                  Simulate Ambulance Reply
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hospital Blood Bank Action Buttons */}
                      {isPrimary && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                            Hospital Staff Actions
                          </h4>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* 1. Acknowledge */}
                            {bloodStatus === 'sent' && (
                              <Button
                                variant="primary"
                                size="md"
                                icon={<Check className="w-4 h-4" />}
                                onClick={() => updateBloodStatus('acknowledged')}
                              >
                                Acknowledge Blood Requisition
                              </Button>
                            )}

                            {/* 2. Request Clarification */}
                            {(bloodStatus === 'acknowledged' || bloodStatus === 'sent') && (
                              <Button
                                variant="secondary"
                                size="md"
                                icon={<HelpCircle className="w-4 h-4" />}
                                onClick={() => setShowClarificationInput(!showClarificationInput)}
                                className="bg-[#172844] border-[#22406E] text-slate-200"
                              >
                                Request Clarification from Crew
                              </Button>
                            )}

                            {/* 3. Start Preparation */}
                            {(bloodStatus === 'acknowledged' || bloodStatus === 'info-received') && (
                              <Button
                                variant="primary"
                                size="md"
                                icon={<Droplets className="w-4 h-4" />}
                                onClick={() => updateBloodStatus('preparing')}
                                className="bg-amber-600 hover:bg-amber-500"
                              >
                                Begin Thawing / Product Preparation
                              </Button>
                            )}

                            {/* 4. Mark Ready */}
                            {bloodStatus === 'preparing' && (
                              <Button
                                variant="success"
                                size="md"
                                icon={<CheckCircle2 className="w-4 h-4" />}
                                onClick={() => updateBloodStatus('ready')}
                                className="bg-emerald-600 hover:bg-emerald-500"
                              >
                                Mark Ready for Resus Bay Collection
                              </Button>
                            )}

                            {/* 5. Cancel */}
                            {bloodStatus !== 'ready' && bloodStatus !== 'cancelled' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => updateBloodStatus('cancelled')}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                              >
                                Cancel Request
                              </Button>
                            )}
                          </div>

                          {/* Clarification input form */}
                          {showClarificationInput && (
                            <div className="p-4 rounded-xl bg-[#14233D] border border-sky-500/30 space-y-3 mt-3">
                              <p className="text-xs font-semibold text-sky-400">
                                Send Clarification Query to Ambulance {currentRun.callsign}:
                              </p>
                              <Input
                                placeholder="e.g. Please confirm patient estimated weight and IV cannula size"
                                value={clarificationText}
                                onChange={(e) => setClarificationText(e.target.value)}
                                className="bg-[#0E1A2E] text-white border-[#1E3A5F]"
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  icon={<Send className="w-3.5 h-3.5" />}
                                  onClick={() => {
                                    if (clarificationText.trim()) {
                                      updateBloodStatus('info-requested', {
                                        infoRequestText: clarificationText.trim(),
                                      })
                                      setClarificationText('')
                                      setShowClarificationInput(false)
                                    }
                                  }}
                                >
                                  Transmit Question
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowClarificationInput(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No blood products requested for this run.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. CHRONOLOGICAL EVENT TRAIL */}
            {activeTab === 'timeline' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-[#101D33] rounded-2xl border border-[#1E3A5F] p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1E3A5F] mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Emergency Run Event Trail & Audit Log</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Chronological record of clinical, telemetry, and pre-alert actions.
                      </p>
                    </div>

                    {isPrimary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => setShowAddNote(!showAddNote)}
                        className="bg-[#152540] border-[#22406E] text-slate-200"
                      >
                        + Add Hospital Event Note
                      </Button>
                    )}
                  </div>

                  {/* Add Event Note Form */}
                  {showAddNote && (
                    <div className="p-4 rounded-xl bg-[#14233D] border border-sky-500/30 mb-6 space-y-3">
                      <p className="text-xs font-semibold text-sky-400">Log Hospital ED Clinical Event:</p>
                      <Input
                        placeholder="e.g. Trauma Team briefing commenced in Bay 2 with Lead Surgeon"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="bg-[#0E1A2E] text-white border-[#1E3A5F]"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newNoteText.trim()) {
                              addEvent('note', newNoteText.trim())
                              setNewNoteText('')
                              setShowAddNote(false)
                            }
                          }}
                        >
                          Append to Audit Log
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddNote(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Timeline Stream */}
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1E3A5F]">
                    {currentRun.events.map((ev, idx) => {
                      const sourceStyles: Record<string, { bg: string; text: string; badge: string }> = {
                        ambulance: { bg: 'bg-sky-500', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300' },
                        hospital:  { bg: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
                        system:    { bg: 'bg-slate-400', text: 'text-slate-300', badge: 'bg-slate-700 text-slate-300' },
                        demo:      { bg: 'bg-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
                      }
                      const style = sourceStyles[ev.source] ?? sourceStyles.system

                      return (
                        <div key={ev.id} className="flex items-start gap-4 pl-8 relative">
                          <div
                            className={cn(
                              'absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-[#101D33]',
                              style.bg
                            )}
                          />

                          <div className="flex-1 p-3 rounded-xl bg-[#14233C] border border-[#1E3A5F]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-xs text-white">
                                {ev.description}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {formatShortTime(ev.timestamp)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                              <span className={cn('px-1.5 py-0.2 rounded font-semibold uppercase', style.badge)}>
                                {ev.source}
                              </span>
                              {ev.operator && (
                                <>
                                  <span>·</span>
                                  <span>Operator: {ev.operator}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
