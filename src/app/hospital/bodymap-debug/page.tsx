'use client'

import React, { useState } from 'react'
import { notFound } from 'next/navigation'
import { FRONT_REGIONS } from '@/lib/bodymap/front'
import { BACK_REGIONS } from '@/lib/bodymap/back'
import { SIDE_REGIONS } from '@/lib/bodymap/side'
import type { BodyRegion } from '@/lib/bodymap/types'

type ViewType = 'front' | 'back' | 'side'

const VIEW_DATA: Record<ViewType, { regions: BodyRegion[]; img: string }> = {
  front: { regions: FRONT_REGIONS, img: '/images/body-front.jpg' },
  back:  { regions: BACK_REGIONS, img: '/images/body-back.jpg' },
  side:  { regions: SIDE_REGIONS, img: '/images/body-side.jpg' },
}

// Generate distinct color palette for debug visualization
const PALETTE = [
  'rgba(59, 130, 246, 0.35)',
  'rgba(16, 185, 129, 0.35)',
  'rgba(245, 158, 11, 0.35)',
  'rgba(239, 68, 68, 0.35)',
  'rgba(139, 92, 246, 0.35)',
  'rgba(236, 72, 153, 0.35)',
  'rgba(20, 184, 166, 0.35)',
  'rgba(249, 115, 22, 0.35)',
]

export default function BodyMapDebugPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const [activeView, setActiveView] = useState<ViewType>('front')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)

  const { regions, img } = VIEW_DATA[activeView]
  const W = 896
  const H = 1200

  return (
    <div className="min-h-screen bg-well p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <span>Bodymap Calibration & Acceptance Debugger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning-soft text-warning-ink font-semibold">
              DEV ONLY
            </span>
          </h1>
          <p className="text-sm text-ink-2">
            Showing all calibrated anatomical region polygons, labels, and anchors for 896x1200 coordinates.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex gap-2 bg-tile p-1 rounded-pill border border-border">
          {(['front', 'back', 'side'] as const).map((view) => (
            <button
              key={view}
              id={`debug-tab-${view}`}
              onClick={() => {
                setActiveView(view)
                setSelectedRegionId(null)
              }}
              className={`px-4 py-1.5 rounded-pill text-sm font-semibold capitalize transition-colors ${
                activeView === view
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              {view} ({VIEW_DATA[view].regions.length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 w-full max-w-5xl">
        {/* Stage */}
        <div className="relative bg-tile rounded-[20px] border border-border shadow-xs p-4 flex items-center justify-center shrink-0">
          <div
            className="relative"
            style={{ width: `${W * 0.55}px`, height: `${H * 0.55}px` }}
          >
            {/* Background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={activeView}
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
            />

            {/* SVG Polygons Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              viewBox={`0 0 ${W} ${H}`}
            >
              {regions.map((reg, idx) => {
                const isSelected = reg.id === selectedRegionId
                const fillColor = PALETTE[idx % PALETTE.length]
                const pointsStr = reg.polygon.map((p) => p.join(',')).join(' ')

                return (
                  <g key={reg.id} className="cursor-pointer" onClick={() => setSelectedRegionId(reg.id)}>
                    <polygon
                      points={pointsStr}
                      fill={isSelected ? 'rgba(27, 95, 180, 0.6)' : fillColor}
                      stroke={isSelected ? '#1B5FB4' : '#334155'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Anchor dot */}
                    <circle
                      cx={reg.anchor[0]}
                      cy={reg.anchor[1]}
                      r={4}
                      fill="#DC2626"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                    {/* Region Label at Anchor */}
                    <text
                      x={reg.anchor[0]}
                      y={reg.anchor[1] - 8}
                      fontSize={11}
                      fontWeight="bold"
                      fill="#0F172A"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                      style={{
                        paintOrder: 'stroke',
                        stroke: '#FFFFFF',
                        strokeWidth: '3px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {reg.id}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Region List Inspector */}
        <div className="flex-1 bg-tile rounded-[20px] border border-border shadow-xs p-4 overflow-y-auto max-h-[700px]">
          <h2 className="text-sm font-bold text-ink mb-3 uppercase tracking-wider">
            {activeView} Regions ({regions.length})
          </h2>
          <div className="space-y-1">
            {regions.map((reg, idx) => {
              const isSelected = reg.id === selectedRegionId
              return (
                <div
                  key={reg.id}
                  onClick={() => setSelectedRegionId(reg.id)}
                  className={`p-2 rounded-inner text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary-soft text-primary font-bold border border-primary/30'
                      : 'hover:bg-well text-ink border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length].replace('0.35', '1') }}
                    />
                    <span className="font-mono text-ink-2">{reg.id}</span>
                    <span className="font-medium">{reg.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-2">
                    [{reg.anchor[0]}, {reg.anchor[1]}]
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
