'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { durations, ease, singlePulse } from '@/lib/motion'
import { FRONT_REGIONS } from '@/lib/bodymap/front'
import { BACK_REGIONS } from '@/lib/bodymap/back'
import { SIDE_REGIONS } from '@/lib/bodymap/side'
import { resolveRegionMapping } from '@/lib/bodymap/compat'
import type { BodyRegion } from '@/lib/bodymap/types'
import type { InjuryRecord } from '@/types/run'

export type BodyViewType = 'front' | 'back' | 'side'

interface BodyMapViewerProps {
  injuries: InjuryRecord[]
  selectedInjuryId: string | null
  onSelectInjury: (injuryId: string | null) => void
  hoveredRegionId: string | null
  onHoverRegion: (regionId: string | null) => void
  activeView?: BodyViewType
  onViewChange?: (view: BodyViewType) => void
  className?: string
}

const VIEW_REGIONS: Record<BodyViewType, BodyRegion[]> = {
  front: FRONT_REGIONS,
  back: BACK_REGIONS,
  side: SIDE_REGIONS,
}

const VIEW_IMAGE_PATHS: Record<BodyViewType, string> = {
  front: '/images/body-front.jpg',
  back: '/images/body-back.jpg',
  side: '/images/body-side.jpg',
}

const SEVERITY_COLORS = {
  critical: { fill: 'rgba(217, 45, 32, 0.18)', stroke: '#D92D20', ink: '#B42318', dot: '#D92D20' },
  severe:   { fill: 'rgba(217, 45, 32, 0.18)', stroke: '#D92D20', ink: '#B42318', dot: '#D92D20' },
  moderate: { fill: 'rgba(217, 144, 0, 0.18)', stroke: '#D99000', ink: '#8A5A00', dot: '#D99000' },
  minor:    { fill: 'rgba(25, 169, 116, 0.18)', stroke: '#19A974', ink: '#0B7A53', dot: '#19A974' },
  mild:     { fill: 'rgba(25, 169, 116, 0.18)', stroke: '#19A974', ink: '#0B7A53', dot: '#19A974' },
  unknown:  { fill: 'rgba(71, 85, 105, 0.18)', stroke: '#475569', ink: '#475569', dot: '#475569' },
}

export function BodyMapViewer({
  injuries,
  selectedInjuryId,
  onSelectInjury,
  hoveredRegionId,
  onHoverRegion,
  activeView: controlledView,
  onViewChange,
  className = '',
}: BodyMapViewerProps) {
  const [internalView, setInternalView] = useState<BodyViewType>('front')
  const currentView = controlledView ?? internalView
  const setView = (v: BodyViewType) => {
    if (onViewChange) onViewChange(v)
    else setInternalView(v)
  }

  const reducedMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageDim, setStageDim] = useState({ w: 480, h: 480 })
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [quietNotice, setQuietNotice] = useState<{ message: string; x: number; y: number } | null>(null)
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track stage size with ResizeObserver
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setStageDim({ w: Math.round(width), h: Math.round(height) })
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-switch view when selected injury belongs to another view (200ms crossfade)
  useEffect(() => {
    if (!selectedInjuryId) return
    const inj = injuries.find((i) => i.id === selectedInjuryId)
    if (!inj) return
    const mapping = resolveRegionMapping(inj.region)
    if (mapping && mapping.view !== currentView) {
      setView(mapping.view)
    }
  }, [selectedInjuryId, injuries, currentView])

  // Count injuries per view
  const injuryCountsByView = useMemo(() => {
    const counts: Record<BodyViewType, number> = { front: 0, back: 0, side: 0 }
    for (const inj of injuries) {
      const mapping = resolveRegionMapping(inj.region)
      if (mapping) counts[mapping.view]++
    }
    return counts
  }, [injuries])

  // Assign numeric index (1-based) to injuries sorted by severity then time
  const numberedInjuries = useMemo(() => {
    const severityRank: Record<string, number> = {
      critical: 4,
      severe: 3,
      moderate: 2,
      minor: 1,
      mild: 1,
      unknown: 0,
    }
    const sorted = [...injuries].sort((a, b) => {
      const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
      if (rankDiff !== 0) return rankDiff
      return (a.timestamp || '').localeCompare(b.timestamp || '')
    })
    return sorted.map((inj, idx) => {
      const mapping = resolveRegionMapping(inj.region)
      return {
        ...inj,
        number: idx + 1,
        resolvedRegionId: mapping?.regionId ?? null,
        view: mapping?.view ?? 'front',
        displayLabel: mapping?.label ?? inj.region,
      }
    })
  }, [injuries])

  // Injuries on currently active view
  const activeViewInjuries = useMemo(() => {
    return numberedInjuries.filter((i) => i.view === currentView && i.resolvedRegionId)
  }, [numberedInjuries, currentView])

  // Map of regionId -> InjuryRecord[]
  const injuriesByRegion = useMemo(() => {
    const map = new Map<string, typeof numberedInjuries>()
    for (const inj of activeViewInjuries) {
      if (!inj.resolvedRegionId) continue
      const list = map.get(inj.resolvedRegionId) ?? []
      list.push(inj)
      map.set(inj.resolvedRegionId, list)
    }
    return map
  }, [activeViewInjuries])

  // Calibration coordinate system:
  // Base natural image: 896 x 1200
  const W = 896
  const H = 1200
  const padX = 20
  const padY = 12
  const availableW = Math.max(100, stageDim.w - padX * 2)
  const availableH = Math.max(100, stageDim.h - padY * 2)
  const scale = Math.min(availableW / W, availableH / H)
  const imgW = W * scale
  const imgH = H * scale
  const originX = (stageDim.w - imgW) / 2
  const originY = (stageDim.h - imgH) / 2

  const currentRegions = VIEW_REGIONS[currentView]

  // Compute callout positions for injured regions
  const calloutItems = useMemo(() => {
    const items: Array<{
      injury: (typeof numberedInjuries)[0]
      region: BodyRegion
      anchorScreen: [number, number]
      calloutSide: 'left' | 'right'
      yPos: number
    }> = []

    for (const [regId, regInjuries] of injuriesByRegion.entries()) {
      const reg = currentRegions.find((r) => r.id === regId)
      if (!reg) continue
      // Select primary injury for callout display
      const primaryInj =
        regInjuries.find((i) => i.id === selectedInjuryId) ?? regInjuries[0]
      const anchorScreen: [number, number] = [
        originX + reg.anchor[0] * scale,
        originY + reg.anchor[1] * scale,
      ]
      const side = reg.calloutSide || (reg.anchor[0] < W / 2 ? 'left' : 'right')
      items.push({
        injury: primaryInj,
        region: reg,
        anchorScreen,
        calloutSide: side,
        yPos: anchorScreen[1],
      })
    }

    // Separate into left and right gutters and enforce >= 40px vertical separation
    const lefts = items
      .filter((it) => it.calloutSide === 'left')
      .sort((a, b) => a.anchorScreen[1] - b.anchorScreen[1])
    const rights = items
      .filter((it) => it.calloutSide === 'right')
      .sort((a, b) => a.anchorScreen[1] - b.anchorScreen[1])

    function separate(list: typeof items) {
      let prevY = -999
      for (const it of list) {
        let y = it.anchorScreen[1]
        if (y < prevY + 44) {
          y = prevY + 44
        }
        y = Math.max(30, Math.min(stageDim.h - 30, y))
        it.yPos = y
        prevY = y
      }
    }

    separate(lefts)
    separate(rights)

    return [...lefts, ...rights]
  }, [injuriesByRegion, currentRegions, selectedInjuryId, originX, originY, scale, stageDim.h])

  // Handle region click
  const handleRegionClick = (reg: BodyRegion, e: React.MouseEvent) => {
    const regInjuries = injuriesByRegion.get(reg.id)
    if (regInjuries && regInjuries.length > 0) {
      // If currently selected is in this region, cycle to next; else pick most severe (index 0)
      const currentIndex = regInjuries.findIndex((i) => i.id === selectedInjuryId)
      if (currentIndex >= 0 && regInjuries.length > 1) {
        const next = regInjuries[(currentIndex + 1) % regInjuries.length]
        onSelectInjury(next.id)
      } else {
        onSelectInjury(regInjuries[0].id)
      }
    } else {
      // Quiet tooltip: "No injury recorded"
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      const rect = stageRef.current?.getBoundingClientRect()
      const clientX = e.clientX - (rect?.left || 0)
      const clientY = e.clientY - (rect?.top || 0)
      setQuietNotice({
        message: 'No injury recorded',
        x: clientX,
        y: clientY - 14,
      })
      noticeTimerRef.current = setTimeout(() => {
        setQuietNotice(null)
      }, 1400)
    }
  }

  // Keyboard navigation for pins
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeViewInjuries.length === 0) return
    const currentIndex = activeViewInjuries.findIndex((i) => i.id === selectedInjuryId)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = (currentIndex + 1) % activeViewInjuries.length
      onSelectInjury(activeViewInjuries[nextIdx].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIdx =
        currentIndex <= 0 ? activeViewInjuries.length - 1 : currentIndex - 1
      onSelectInjury(activeViewInjuries[prevIdx].id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onSelectInjury(null)
    }
  }

  // Active hovered region data
  const hoveredRegion = useMemo(() => {
    if (!hoveredRegionId) return null
    return currentRegions.find((r) => r.id === hoveredRegionId) ?? null
  }, [hoveredRegionId, currentRegions])

  return (
    <div
      className={`relative flex flex-col h-full select-none ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Interactive Clinical Body Map"
    >
      {/* View Switch SegmentedTabs */}
      <div className="flex items-center justify-center shrink-0 py-2.5">
        <div
          role="tablist"
          aria-label="Body map views"
          className="inline-flex p-1 bg-well border border-border rounded-pill gap-1"
        >
          {(['front', 'back', 'side'] as const).map((viewKey) => {
            const isSelected = currentView === viewKey
            const count = injuryCountsByView[viewKey]
            return (
              <button
                key={viewKey}
                role="tab"
                id={`bodymap-tab-${viewKey}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setView(viewKey)}
                className={`relative px-4 py-1.5 text-[13px] font-medium rounded-pill transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'text-primary font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="bodymap-view-pill"
                    className="absolute inset-0 bg-tile rounded-pill shadow-xs border border-border"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10 capitalize">{viewKey}</span>
                {count > 0 && (
                  <span
                    className={`relative z-10 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isSelected
                        ? 'bg-critical text-tile'
                        : 'bg-critical-soft text-critical-ink'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Map Stage: Strict Single Coordinate Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center"
        onMouseMove={(e) => {
          const rect = stageRef.current?.getBoundingClientRect()
          if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }
        }}
        onMouseLeave={() => {
          setMousePos(null)
          onHoverRegion(null)
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durations.base, ease }}
            className="absolute inset-0"
          >
            {/* Base Body Silhouette Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={VIEW_IMAGE_PATHS[currentView]}
              alt={`Human anatomical silhouette (${currentView} view)`}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${originX}px`,
                top: `${originY}px`,
                width: `${imgW}px`,
                height: `${imgH}px`,
              }}
            />

            {/* SVG Region Layer with viewBox="0 0 896 1200" */}
            <svg
              className="absolute pointer-events-auto"
              style={{
                left: `${originX}px`,
                top: `${originY}px`,
                width: `${imgW}px`,
                height: `${imgH}px`,
              }}
              viewBox="0 0 896 1200"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {currentRegions.map((reg) => {
                const regInjuries = injuriesByRegion.get(reg.id)
                const hasInjury = Boolean(regInjuries && regInjuries.length > 0)
                const isSelected = Boolean(
                  regInjuries?.some((i) => i.id === selectedInjuryId)
                )
                const isHovered = hoveredRegionId === reg.id
                const primaryInj = regInjuries?.[0]
                const colors = primaryInj
                  ? SEVERITY_COLORS[primaryInj.severity] || SEVERITY_COLORS.unknown
                  : null

                const pointsStr = reg.polygon.map((p) => p.join(',')).join(' ')

                let fill = 'transparent'
                let stroke = 'transparent'
                let strokeWidth = 1

                if (isSelected && colors) {
                  fill = colors.fill
                  stroke = colors.stroke
                  strokeWidth = 2.5
                } else if (hasInjury && colors) {
                  fill = colors.fill
                  stroke = colors.stroke
                  strokeWidth = 1.5
                } else if (isHovered) {
                  fill = 'rgba(27, 95, 180, 0.10)' // Primary 10%
                  stroke = 'rgba(27, 95, 180, 0.40)'
                  strokeWidth = 1.5
                }

                return (
                  <g key={reg.id}>
                    {/* Visual Region Polygon */}
                    <polygon
                      points={pointsStr}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      vectorEffect="non-scaling-stroke"
                      className={`transition-colors duration-150 ${
                        hasInjury ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      onMouseEnter={() => onHoverRegion(reg.id)}
                      onClick={(e) => handleRegionClick(reg, e)}
                    />
                    {/* Inflated invisible hit area for small regions */}
                    <polygon
                      points={pointsStr}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth={32}
                      vectorEffect="non-scaling-stroke"
                      className={hasInjury ? 'cursor-pointer' : 'cursor-default'}
                      onMouseEnter={() => onHoverRegion(reg.id)}
                      onClick={(e) => handleRegionClick(reg, e)}
                    />
                  </g>
                )
              })}
            </svg>

            {/* Leader Lines SVG Layer over whole stage */}
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              aria-hidden="true"
            >
              {calloutItems.map(({ injury, region, anchorScreen, calloutSide, yPos }) => {
                const isSelected = injury.id === selectedInjuryId
                const colors =
                  SEVERITY_COLORS[injury.severity] || SEVERITY_COLORS.unknown
                const [ax, ay] = anchorScreen

                // Left or right callout box connection point
                const pillX = calloutSide === 'left' ? 144 : stageDim.w - 144
                const midX =
                  calloutSide === 'left'
                    ? Math.min(pillX + 16, ax - 16)
                    : Math.max(pillX - 16, ax + 16)

                // Elbow path: from callout pill edge to anchor point
                const pathD = `M ${pillX} ${yPos} L ${midX} ${yPos} L ${ax} ${ay}`

                return (
                  <g key={`leader-${region.id}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? colors.stroke : '#94A3B8'}
                      strokeWidth={isSelected ? 2 : 1.25}
                      strokeDasharray={isSelected ? undefined : '3,3'}
                    />
                    {/* 6px end dot directly at the calibrated anchor */}
                    <circle
                      cx={ax}
                      cy={ay}
                      r={3}
                      fill={colors.stroke}
                    />
                  </g>
                )
              })}
            </svg>

            {/* Injury Numbered Pins at Calibrated Anchors */}
            {activeViewInjuries.map((inj) => {
              const reg = currentRegions.find((r) => r.id === inj.resolvedRegionId)
              if (!reg) return null
              const isSelected = inj.id === selectedInjuryId
              const colors =
                SEVERITY_COLORS[inj.severity] || SEVERITY_COLORS.unknown
              const px = originX + reg.anchor[0] * scale
              const py = originY + reg.anchor[1] * scale

              return (
                <button
                  key={`pin-${inj.id}`}
                  type="button"
                  tabIndex={0}
                  aria-label={`Injury ${inj.number}: ${inj.displayLabel} (${inj.severity})`}
                  onClick={() => onSelectInjury(inj.id)}
                  onMouseEnter={() => onHoverRegion(reg.id)}
                  onMouseLeave={() => onHoverRegion(null)}
                  style={{
                    left: `${px}px`,
                    top: `${py}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] shadow-md border-2 border-white transition-transform ${
                    isSelected ? 'z-30 ring-2 ring-primary ring-offset-1 scale-110' : 'z-20 hover:scale-105'
                  }`}
                >
                  <motion.div
                    variants={reducedMotion ? undefined : singlePulse}
                    animate={isSelected ? 'pulse' : 'initial'}
                    className="w-full h-full rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: colors.stroke }}
                  >
                    {inj.number}
                  </motion.div>
                </button>
              )
            })}

            {/* Callout Pills in Gutters */}
            {calloutItems.map(({ injury, region, calloutSide, yPos }) => {
              const isSelected = injury.id === selectedInjuryId
              const colors =
                SEVERITY_COLORS[injury.severity] || SEVERITY_COLORS.unknown

              return (
                <div
                  key={`callout-${region.id}`}
                  style={{
                    top: `${yPos}px`,
                    ...(calloutSide === 'left' ? { left: '12px' } : { right: '12px' }),
                    transform: 'translateY(-50%)',
                  }}
                  className="absolute z-20 pointer-events-auto"
                >
                  <button
                    type="button"
                    onClick={() => onSelectInjury(injury.id)}
                    onMouseEnter={() => onHoverRegion(region.id)}
                    onMouseLeave={() => onHoverRegion(null)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[12px] border shadow-xs transition-all ${
                      isSelected
                        ? 'bg-tile font-bold border-primary shadow-sm ring-1 ring-primary/40'
                        : 'bg-tile/95 hover:bg-tile text-ink border-border hover:border-border-strong font-medium'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: colors.stroke }}
                    >
                      {injury.number}
                    </span>
                    <span className="truncate max-w-[90px]">{region.label}</span>
                    <span
                      className="capitalize font-semibold text-[11px]"
                      style={{ color: colors.ink }}
                    >
                      {injury.severity}
                    </span>
                  </button>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Hover Region Tooltip */}
        {hoveredRegion && mousePos && (
          <div
            className="absolute z-40 pointer-events-none px-2 py-1 rounded-inner bg-ink text-tile text-[12px] font-medium shadow-md -translate-x-1/2 -translate-y-full -mt-2 transition-opacity"
            style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
          >
            {hoveredRegion.label}
          </div>
        )}

        {/* Quiet "No injury recorded" Toast */}
        {quietNotice && (
          <div
            className="absolute z-40 pointer-events-none px-2.5 py-1 rounded-pill bg-ink-2 text-tile text-[12px] shadow-sm -translate-x-1/2 -translate-y-full animate-fade-in"
            style={{ left: `${quietNotice.x}px`, top: `${quietNotice.y}px` }}
          >
            {quietNotice.message}
          </div>
        )}
      </div>
    </div>
  )
}
