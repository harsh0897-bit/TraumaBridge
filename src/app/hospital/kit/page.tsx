'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
import { Layers, RefreshCw, ExternalLink } from 'lucide-react'

export default function HospitalDesignKitPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [demoCount, setDemoCount] = useState(118)

  const tabOptions = [
    { id: 'overview', label: 'Overview' },
    { id: 'clinical', label: 'Clinical', count: '3' },
    { id: 'preparation', label: 'Preparation', count: '3/6' },
    { id: 'activity', label: 'Activity', count: '20' },
  ]

  const hrTrend = [98, 104, 112, 110, 118, 122, 118]
  const bpTrend = [118, 110, 104, 96, 92, 88]
  const spo2Trend = [98, 97, 96, 95, 93, 94]

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-well text-ink flex flex-col font-sans selection:bg-primary selection:text-white p-6 gap-4 box-border">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between pb-1 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight text-ink leading-tight">
                TraumaBridge Hospital Design Kit
              </h1>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-pill bg-primary-soft text-primary-ink border border-primary/20">
                Phase 1.1 Specification
              </span>
            </div>
            <p className="text-[12px] text-ink-2 font-medium leading-tight">
              Donezo Locked Tokens · Fixed Height Tiles · Real Size Primitives · Minimum 12px
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <PillButton
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setDemoCount((prev) => (prev === 118 ? 126 : 118))}
          >
            Tween HR ({demoCount})
          </PillButton>

          <Link href="/hospital">
            <PillButton
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Hospital Console
            </PillButton>
          </Link>
        </div>
      </header>

      {/* ── ROW 1: Four Tiles (Height clamp(168px, 23vh, 208px), columns 1.35fr 1fr 1fr 1fr) ── */}
      <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] gap-4 h-[clamp(168px,23vh,208px)] flex-shrink-0">
        {/* TILE 1: Hero Tile */}
        <Tile
          tone="hero"
          action={{
            label: 'Open resus preparation',
            onClick: () => {},
          }}
          className="h-full flex flex-col justify-between p-4"
        >
          <div>
            <span className="text-[12px] font-semibold text-white/80 block uppercase tracking-wider">
              Arriving in
            </span>
            <div className="mt-1">
              <Countdown
                initialSeconds={240}
                size="hero"
                tone="dark"
                showIcon={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/15">
            <span className="text-[14px] font-medium text-white/90">
              Resus Bay 2 · Alpha 7
            </span>
            <span className="px-2.5 py-1 rounded-pill bg-white/15 text-white text-[12px] font-semibold border border-white/20">
              Pre-alert active
            </span>
          </div>
        </Tile>

        {/* TILE 2: Heart Rate */}
        <Tile
          title="Heart rate"
          action={{
            label: 'Open HR telemetry',
            onClick: () => {},
          }}
          className="h-full flex flex-col justify-between p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <StatNumber
                value={demoCount}
                unit="bpm"
                size="stat"
              />
              <div className="mt-1">
                <StatusChip status="warning" label="Tachycardia" size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Sparkline data={hrTrend} color="#2878D7" width={96} height={40} />
              <span className="text-[12px] font-mono text-ink-2 mt-1">
                Lifepak 15 · 2m ago
              </span>
            </div>
          </div>
        </Tile>

        {/* TILE 3: Blood Pressure */}
        <Tile
          title="Blood pressure"
          action={{
            label: 'Open BP details',
            onClick: () => {},
          }}
          className="h-full flex flex-col justify-between p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-[44px] font-extrabold text-critical font-mono tabular-nums leading-none tracking-tight">
                  88/58
                </span>
                <span className="text-sm font-semibold text-ink-2">mmHg</span>
              </div>
              <div className="mt-1">
                <StatusChip status="critical" label="Hypotension" size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Sparkline data={bpTrend} color="#D92D20" width={96} height={40} />
              <span className="text-[12px] font-mono text-ink-2 mt-1">
                Manual NIBP · 3m ago
              </span>
            </div>
          </div>
        </Tile>

        {/* TILE 4: Oxygen Saturation */}
        <Tile
          title="Oxygen saturation"
          action={{
            label: 'Open SpO2 details',
            onClick: () => {},
          }}
          className="h-full flex flex-col justify-between p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <StatNumber
                value={94}
                unit="%"
                size="stat"
              />
              <div className="mt-1">
                <StatusChip status="warning" label="Hypoxic" size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Sparkline data={spo2Trend} color="#D99000" width={96} height={40} />
              <span className="text-[12px] font-mono text-ink-2 mt-1">
                Lifepak 15 · 2m ago
              </span>
            </div>
          </div>
        </Tile>
      </div>

      {/* ── ROW 2: Readiness Tile & Primitives Matrix (Hard size, no empty void) ─ */}
      <div className="grid grid-cols-[1.1fr_2fr] gap-4 h-[clamp(240px,34vh,300px)] flex-shrink-0">
        {/* Readiness Tile with 112px ProgressRing & Striped Pending Segment */}
        <Tile
          title="Hospital Readiness"
          action={{
            label: 'Open readiness board',
            onClick: () => {},
          }}
          className="h-full flex flex-col justify-between p-5"
        >
          <div className="flex items-center justify-around flex-1 py-1">
            <ProgressRing
              value={50}
              pendingValue={33}
              variant="striped"
              size={112}
              strokeWidth={12}
              strokeColor="#19A974"
              label="3 / 6"
              caption="Confirmed"
            />

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                <span>3 Ready (Bay 2, Team, CT)</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className="w-2.5 h-2.5 rounded-sm pattern-stripes border border-slate-300 flex-shrink-0" />
                <span>2 In Progress (Ortho, Blood)</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                <span>1 Pending (Theatre)</span>
              </div>
              <div className="pt-1">
                <StatusChip status="warning" label="O-neg Blood: 5 min ETA" size="sm" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-[12px] text-ink-2">
            <span>Assigned Bay: <strong className="text-ink font-semibold">Resus 2</strong></span>
            <span>Trauma Lead: <strong className="text-ink font-semibold">Dr. A. Vance</strong></span>
          </div>
        </Tile>

        {/* Matrix Tile: SegmentedTabs, StatusChip states, and PillButton variants */}
        <Tile
          title="Component Matrix & Interactive States"
          className="h-full flex flex-col justify-between p-5"
        >
          <div className="flex flex-col justify-between flex-1 gap-4">
            {/* SegmentedTabs */}
            <div>
              <span className="text-[12px] font-semibold text-ink-2 block mb-1.5 uppercase tracking-wider">
                SegmentedTabs (Sliding Indicator · Keyboard Arrow Nav · Badges)
              </span>
              <SegmentedTabs
                tabs={tabOptions}
                activeId={activeTab}
                onChange={setActiveTab}
                size="md"
              />
            </div>

            {/* StatusChip States */}
            <div>
              <span className="text-[12px] font-semibold text-ink-2 block mb-1.5 uppercase tracking-wider">
                StatusChip Semantic States (Dot · Minimum 12px)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusChip status="success" label="Ready (Bay Confirmed)" />
                <StatusChip status="warning" label="Warning (Tachycardia)" />
                <StatusChip status="critical" label="Critical (Hypotension)" />
                <StatusChip status="info" label="Info (Pre-alert Active)" />
                <StatusChip status="neutral" label="Neutral (Awaiting Handover)" />
              </div>
            </div>

            {/* PillButton Variants */}
            <div>
              <span className="text-[12px] font-semibold text-ink-2 block mb-1.5 uppercase tracking-wider">
                PillButton Variants (999px Radius · Press Scale · Focus Ring)
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <PillButton variant="primary" size="md">
                  Primary Filled
                </PillButton>
                <PillButton variant="outline" size="md">
                  Outline Neutral
                </PillButton>
                <PillButton variant="soft" size="md">
                  Primary Soft
                </PillButton>
                <PillButton variant="critical" size="md">
                  Critical Action
                </PillButton>
                <Countdown size="inline" initialSeconds={90} label="Inline Timer" />
              </div>
            </div>
          </div>
        </Tile>
      </div>
    </div>
  )
}
