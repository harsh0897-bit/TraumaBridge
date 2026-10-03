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
import {
  Activity,
  ArrowRight,
  Heart,
  Droplets,
  Layers,
  Radio,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

export default function HospitalDesignKitPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [demoCount, setDemoCount] = useState(112)

  const tabOptions = [
    { id: 'overview', label: 'Overview', count: undefined },
    { id: 'clinical', label: 'Clinical', count: '3 Injuries' },
    { id: 'preparation', label: 'Preparation', count: '4/6 Ready' },
    { id: 'activity', label: 'Activity', count: '20' },
  ]

  const hrTrend = [94, 98, 104, 102, 108, 110, 112]
  const bpTrend = [118, 112, 108, 104, 100, 98]

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-well text-ink flex flex-col font-sans selection:bg-primary selection:text-white p-3.5 sm:p-5 justify-between">
      {/* ── Top Header Strip ──────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-extrabold tracking-tight text-ink">
                TraumaBridge Hospital Design Kit
              </h1>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-pill bg-primary-soft text-primary border border-primary/20">
                Phase 1 Primitives
              </span>
            </div>
            <p className="text-[12px] text-ink-2 font-medium">
              Locked Tokens · Donezo Reference Foundation · Minimum 12px Typography
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <PillButton
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setDemoCount((prev) => (prev === 112 ? 124 : 112))}
          >
            Tween Stat ({demoCount})
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

      {/* ── Main Primitives Showcase Grid ─────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-3 gap-3.5 my-2.5 min-h-0">
        {/* ROW 1 — COL 1: Hero Tile (Donezo primary-deep gradient) ─────────── */}
        <div className="flex flex-col min-h-0">
          <Tile
            tone="hero"
            title="Active Trauma Run"
            action={{
              label: 'Inspect active run',
              onClick: () => {},
            }}
            className="flex-1 flex flex-col justify-between"
          >
            <div>
              <span className="text-[12px] font-medium text-white/80 block uppercase tracking-wider">
                Unit Alpha 7 · En Route Bay 2
              </span>
              <div className="mt-2">
                <StatNumber
                  value={4}
                  unit="min remaining"
                  size="hero"
                  textColor="text-white"
                  className="leading-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/20 mt-3">
              <StatusChip
                status="critical"
                label="P1 Critical Alert"
                size="sm"
                className="bg-white/15 text-white border-white/30"
              />
              <span className="text-[12px] font-mono text-white/90">
                #demo-run-001
              </span>
            </div>
          </Tile>
        </div>

        {/* ROW 1 — COL 2: Standard Tiles with Oversized Numerals & Sparklines ─ */}
        <div className="flex flex-col gap-3 min-h-0">
          <Tile
            title="Heart Rate"
            action={{
              label: 'Open HR telemetry',
              onClick: () => {},
            }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <StatNumber
                value={demoCount}
                unit="bpm"
                size="stat"
                delta={{ value: '+8%', label: 'vs baseline', trend: 'up' }}
              />
              <div className="text-right">
                <Sparkline data={hrTrend} color="#2878D7" width={80} height={28} />
                <span className="text-[12px] text-ink-2 font-mono block mt-1">
                  Lifepak 15
                </span>
              </div>
            </div>
          </Tile>

          <Tile
            title="Blood Pressure"
            action={{
              label: 'Open BP telemetry',
              onClick: () => {},
            }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[44px] font-extrabold leading-none tabular-nums text-critical">
                    98/64
                  </span>
                  <span className="text-sm font-semibold text-ink-2">mmHg</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[12px] text-ink-2 font-medium">
                  <span className="px-1.5 py-0.5 rounded font-semibold text-xs bg-critical-soft text-critical">
                    Hypotension
                  </span>
                  <span>Norm 120/80</span>
                </div>
              </div>

              <div className="text-right">
                <Sparkline data={bpTrend} color="#D92D20" width={80} height={28} />
                <span className="text-[12px] text-ink-2 font-mono block mt-1">
                  Assessed 23:15
                </span>
              </div>
            </div>
          </Tile>
        </div>

        {/* ROW 1 — COL 3: ProgressRing (Striped & Solid) ───────────────────── */}
        <div className="flex flex-col gap-3 min-h-0">
          <Tile
            title="Hospital Readiness"
            action={{
              label: 'Open readiness board',
              onClick: () => {},
            }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-around py-1">
              <ProgressRing
                value={66}
                pendingValue={34}
                variant="striped"
                size={96}
                strokeWidth={10}
                strokeColor="#19A974"
                label="4 / 6"
                caption="Ready"
              />

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span>4 Confirmed Ready</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                  <span className="w-2.5 h-2.5 rounded-sm bg-border border border-ink-2/30" />
                  <span>2 Pending Setup</span>
                </div>
                <StatusChip status="warning" label="Orthopaedics en route" size="sm" />
              </div>
            </div>
          </Tile>

          <Tile
            title="Arrival Countdown"
            action={{
              label: 'View transit details',
              onClick: () => {},
            }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Countdown targetMinutes={4} size="lg" label="Time to ED Doors" />
              <StatusChip status="critical" label="Resus Bay 2" size="sm" />
            </div>
          </Tile>
        </div>
      </main>

      {/* ── Bottom Section: Primitives Matrix (Chips, Tabs, Buttons) ─────── */}
      <footer className="flex-shrink-0 bg-tile rounded-tile border border-border p-3.5 shadow-tile flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Segmented Tabs Primitive */}
          <div>
            <span className="text-[12px] font-semibold text-ink-2 block mb-1">
              SegmentedTabs (Sliding Indicator · Keyboard Nav · Badges)
            </span>
            <SegmentedTabs
              tabs={tabOptions}
              activeId={activeTab}
              onChange={setActiveTab}
              size="sm"
            />
          </div>

          {/* StatusChip All States */}
          <div>
            <span className="text-[12px] font-semibold text-ink-2 block mb-1">
              StatusChip States (Dot · Minimum 12px)
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusChip status="success" label="Bay Ready" size="sm" />
              <StatusChip status="warning" label="Pending CT" size="sm" />
              <StatusChip status="critical" label="P1 Critical" size="sm" />
              <StatusChip status="info" label="Tele-Triage" size="sm" />
              <StatusChip status="neutral" label="Standby" size="sm" />
            </div>
          </div>

          {/* PillButton Variants */}
          <div>
            <span className="text-[12px] font-semibold text-ink-2 block mb-1">
              PillButton Variants (Press Scale · Focus Ring)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <PillButton variant="primary" size="sm">
                Primary
              </PillButton>
              <PillButton variant="outline" size="sm">
                Outline
              </PillButton>
              <PillButton variant="soft" size="sm">
                Soft
              </PillButton>
              <PillButton variant="critical" size="sm">
                Critical
              </PillButton>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
