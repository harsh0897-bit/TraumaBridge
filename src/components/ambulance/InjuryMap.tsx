'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  X, Info, Camera, Upload, Check, AlertTriangle, Trash2, Eye, Plus,
  RotateCw, Layers, ShieldCheck, ChevronRight
} from 'lucide-react'
import { Button, Input, Textarea, Badge } from '@/components/ui'
import type { InjuryRecord, InjuryClassification } from '@/types/run'

export type BodyView = 'front' | 'back' | 'side'

interface RegionDef {
  id: string
  label: string
  category: 'head' | 'neck' | 'torso' | 'back' | 'arms' | 'legs'
  frontPath?: string
  backPath?: string
  sidePath?: string
  frontCenter?: [number, number] // Percentage coordinates [x, y]
  backCenter?: [number, number]
  sideCenter?: [number, number]
  hasLaterality: boolean
}

// ─── Calibrated Anatomical Regions (500x900 viewBox) ─────────────────────────
// Matched to the generated photorealistic medical human figure set
const REGIONS: RegionDef[] = [
  // HEAD & NECK
  {
    id: 'head',
    label: 'Cranium / Scalp',
    category: 'head',
    frontPath: 'M215,30 C215,10 285,10 285,30 C285,62 270,78 250,80 C230,78 215,62 215,30Z',
    backPath:  'M215,30 C215,10 285,10 285,30 C285,65 270,85 250,88 C230,85 215,65 215,30Z',
    sidePath:  'M255,22 C255,8 290,8 300,32 C305,62 290,78 260,82 C240,78 235,58 255,22Z',
    frontCenter: [50, 5],
    backCenter:  [50, 5],
    sideCenter:  [55, 6],
    hasLaterality: false,
  },
  {
    id: 'face',
    label: 'Face / Maxillofacial',
    category: 'head',
    frontPath: 'M226,60 L274,60 L270,102 L250,112 L230,102Z',
    sidePath:  'M270,50 L298,50 L295,92 L275,96Z',
    frontCenter: [50, 9],
    sideCenter:  [57, 8],
    hasLaterality: false,
  },
  {
    id: 'neck',
    label: 'Neck / Cervical Spine',
    category: 'neck',
    frontPath: 'M232,108 L268,108 L274,136 L226,136Z',
    backPath:  'M232,96 L268,96 L274,136 L226,136Z',
    sidePath:  'M248,96 L272,96 L276,136 L250,136Z',
    frontCenter: [50, 13],
    backCenter:  [50, 12],
    sideCenter:  [57, 12],
    hasLaterality: false,
  },

  // TORSO FRONT
  {
    id: 'chest-right',
    label: 'Right Chest / Ribs',
    category: 'torso',
    frontPath: 'M226,136 L250,136 L250,230 L218,230 L195,195 L195,148Z',
    frontCenter: [43, 20],
    hasLaterality: false,
  },
  {
    id: 'chest-left',
    label: 'Left Chest / Ribs',
    category: 'torso',
    frontPath: 'M250,136 L274,136 L305,148 L305,195 L282,230 L250,230Z',
    frontCenter: [57, 20],
    hasLaterality: false,
  },
  {
    id: 'abdomen-upper',
    label: 'Upper Abdomen / Epigastric',
    category: 'torso',
    frontPath: 'M214,230 L286,230 L290,285 L210,285Z',
    sidePath:  'M245,230 L282,230 L284,285 L245,285Z',
    frontCenter: [50, 28],
    sideCenter:  [56, 28],
    hasLaterality: false,
  },
  {
    id: 'abdomen-lower',
    label: 'Lower Abdomen / Umbilical',
    category: 'torso',
    frontPath: 'M210,285 L290,285 L294,345 L206,345Z',
    sidePath:  'M245,285 L284,285 L286,345 L240,345Z',
    frontCenter: [50, 34],
    sideCenter:  [56, 34],
    hasLaterality: false,
  },
  {
    id: 'pelvis',
    label: 'Pelvis / Groin',
    category: 'torso',
    frontPath: 'M198,345 L302,345 L312,415 L188,415Z',
    sidePath:  'M228,345 L292,345 L296,415 L222,415Z',
    frontCenter: [50, 42],
    sideCenter:  [55, 42],
    hasLaterality: false,
  },

  // POSTERIOR / BACK
  {
    id: 'upper-back',
    label: 'Upper Back / Scapulae',
    category: 'back',
    backPath: 'M208,136 L292,136 L312,185 L302,235 L198,235 L188,185Z',
    backCenter: [50, 20],
    hasLaterality: false,
  },
  {
    id: 'spine',
    label: 'Thoracic / Lumbar Spine',
    category: 'back',
    backPath: 'M240,136 L260,136 L260,345 L240,345Z',
    backCenter: [50, 26],
    hasLaterality: false,
  },
  {
    id: 'lower-back',
    label: 'Lower Back / Flanks',
    category: 'back',
    backPath: 'M198,235 L302,235 L294,345 L206,345Z',
    backCenter: [50, 32],
    hasLaterality: false,
  },
  {
    id: 'right-gluteal',
    label: 'Right Gluteal / Sacrum',
    category: 'back',
    backPath: 'M190,345 L250,345 L248,415 L188,415Z',
    backCenter: [44, 42],
    hasLaterality: false,
  },
  {
    id: 'left-gluteal',
    label: 'Left Gluteal / Sacrum',
    category: 'back',
    backPath: 'M250,345 L310,345 L312,415 L252,415Z',
    backCenter: [56, 42],
    hasLaterality: false,
  },

  // UPPER EXTREMITIES
  {
    id: 'right-shoulder',
    label: 'Right Shoulder',
    category: 'arms',
    frontPath: 'M162,136 L195,136 L195,182 L152,182 L152,152Z',
    backPath:  'M305,136 L338,152 L348,182 L305,182Z',
    frontCenter: [35, 17],
    backCenter:  [65, 17],
    hasLaterality: false,
  },
  {
    id: 'left-shoulder',
    label: 'Left Shoulder',
    category: 'arms',
    frontPath: 'M305,136 L338,152 L348,182 L305,182Z',
    backPath:  'M162,136 L195,136 L195,182 L152,182 L152,152Z',
    frontCenter: [65, 17],
    backCenter:  [35, 17],
    hasLaterality: false,
  },
  {
    id: 'right-arm',
    label: 'Right Upper Arm',
    category: 'arms',
    frontPath: 'M152,182 L192,182 L182,272 L142,272Z',
    backPath:  'M308,182 L348,182 L358,272 L318,272Z',
    frontCenter: [33, 25],
    backCenter:  [67, 25],
    hasLaterality: false,
  },
  {
    id: 'left-arm',
    label: 'Left Upper Arm',
    category: 'arms',
    frontPath: 'M308,182 L348,182 L358,272 L318,272Z',
    backPath:  'M152,182 L192,182 L182,272 L142,272Z',
    frontCenter: [67, 25],
    backCenter:  [33, 25],
    hasLaterality: false,
  },
  {
    id: 'right-forearm',
    label: 'Right Forearm / Elbow',
    category: 'arms',
    frontPath: 'M142,272 L182,272 L172,375 L132,375Z',
    backPath:  'M318,272 L358,272 L368,375 L328,375Z',
    frontCenter: [31, 36],
    backCenter:  [69, 36],
    hasLaterality: false,
  },
  {
    id: 'left-forearm',
    label: 'Left Forearm / Elbow',
    category: 'arms',
    frontPath: 'M318,272 L358,272 L368,375 L328,375Z',
    backPath:  'M142,272 L182,272 L172,375 L132,375Z',
    frontCenter: [69, 36],
    backCenter:  [31, 36],
    hasLaterality: false,
  },
  {
    id: 'right-hand',
    label: 'Right Wrist / Hand',
    category: 'arms',
    frontPath: 'M132,375 L172,375 L168,445 L118,445Z',
    backPath:  'M328,375 L368,375 L378,445 L332,445Z',
    frontCenter: [29, 45],
    backCenter:  [71, 45],
    hasLaterality: false,
  },
  {
    id: 'left-hand',
    label: 'Left Wrist / Hand',
    category: 'arms',
    frontPath: 'M328,375 L368,375 L378,445 L332,445Z',
    backPath:  'M132,375 L172,375 L168,445 L118,445Z',
    frontCenter: [71, 45],
    backCenter:  [29, 45],
    hasLaterality: false,
  },

  // LOWER EXTREMITIES
  {
    id: 'right-thigh',
    label: 'Right Thigh / Femur',
    category: 'legs',
    frontPath: 'M188,415 L248,415 L244,565 L178,565Z',
    backPath:  'M252,415 L312,415 L318,565 L256,565Z',
    sidePath:  'M222,415 L286,415 L282,565 L216,565Z',
    frontCenter: [42, 54],
    backCenter:  [58, 54],
    sideCenter:  [53, 54],
    hasLaterality: false,
  },
  {
    id: 'left-thigh',
    label: 'Left Thigh / Femur',
    category: 'legs',
    frontPath: 'M252,415 L312,415 L318,565 L256,565Z',
    backPath:  'M188,415 L248,415 L244,565 L178,565Z',
    sidePath:  'M222,415 L286,415 L282,565 L216,565Z',
    frontCenter: [58, 54],
    backCenter:  [42, 54],
    sideCenter:  [53, 54],
    hasLaterality: false,
  },
  {
    id: 'right-knee',
    label: 'Right Knee / Patella',
    category: 'legs',
    frontPath: 'M178,565 L244,565 L242,635 L180,635Z',
    backPath:  'M256,565 L318,565 L316,635 L258,635Z',
    sidePath:  'M216,565 L282,565 L280,635 L214,635Z',
    frontCenter: [42, 66],
    backCenter:  [58, 66],
    sideCenter:  [53, 66],
    hasLaterality: false,
  },
  {
    id: 'left-knee',
    label: 'Left Knee / Patella',
    category: 'legs',
    frontPath: 'M256,565 L318,565 L316,635 L258,635Z',
    backPath:  'M178,565 L244,565 L242,635 L180,635Z',
    frontCenter: [58, 66],
    backCenter:  [42, 66],
    hasLaterality: false,
  },
  {
    id: 'right-lower-leg',
    label: 'Right Lower Leg / Tibia',
    category: 'legs',
    frontPath: 'M180,635 L242,635 L236,795 L186,795Z',
    backPath:  'M258,635 L316,635 L310,795 L260,795Z',
    sidePath:  'M214,635 L280,635 L274,795 L208,795Z',
    frontCenter: [42, 79],
    backCenter:  [58, 79],
    sideCenter:  [52, 79],
    hasLaterality: false,
  },
  {
    id: 'left-lower-leg',
    label: 'Left Lower Leg / Tibia',
    category: 'legs',
    frontPath: 'M258,635 L316,635 L310,795 L260,795Z',
    backPath:  'M180,635 L242,635 L236,795 L186,795Z',
    frontCenter: [58, 79],
    backCenter:  [42, 79],
    hasLaterality: false,
  },
  {
    id: 'right-foot',
    label: 'Right Ankle / Foot',
    category: 'legs',
    frontPath: 'M186,795 L236,795 L240,880 L172,880Z',
    backPath:  'M260,795 L310,795 L322,880 L256,880Z',
    sidePath:  'M208,795 L274,795 L296,880 L202,880Z',
    frontCenter: [41, 93],
    backCenter:  [59, 93],
    sideCenter:  [53, 93],
    hasLaterality: false,
  },
  {
    id: 'left-foot',
    label: 'Left Ankle / Foot',
    category: 'legs',
    frontPath: 'M260,795 L310,795 L322,880 L256,880Z',
    backPath:  'M186,795 L236,795 L240,880 L172,880Z',
    frontCenter: [59, 93],
    backCenter:  [41, 93],
    hasLaterality: false,
  },
]

// 13 specific clinical findings
const CLINICAL_FINDINGS = [
  'Pain / Tenderness',
  'Bruising / Contusion',
  'Swelling',
  'Suspected Fracture',
  'Dislocation',
  'Laceration',
  'Penetrating Injury',
  'Burn',
  'Crush Injury',
  'Bleeding',
  'Deformity',
  'Other',
  'Unable to Assess',
] as const

const SEVERITY_LEVELS: { key: InjuryRecord['severity']; label: string; desc: string }[] = [
  { key: 'mild', label: 'Mild', desc: 'Superficial, minimal distress' },
  { key: 'moderate', label: 'Moderate', desc: 'Significant pain, functional impairment' },
  { key: 'severe', label: 'Severe', desc: 'Gross deformity, unstable, marked bleeding' },
  { key: 'critical', label: 'Critical', desc: 'Immediate life or limb threat' },
  { key: 'unknown', label: 'Unable to Assess', desc: 'Inaccessible / compromised exam' },
]

const severityFill: Record<string, string> = {
  mild:     'rgba(16, 185, 129, 0.40)',
  minor:    'rgba(16, 185, 129, 0.40)',
  moderate: 'rgba(245, 158, 11, 0.50)',
  severe:   'rgba(239, 68, 68, 0.60)',
  critical: 'rgba(185, 28, 28, 0.75)',
  unknown:  'rgba(100, 116, 139, 0.40)',
}

const severityStroke: Record<string, string> = {
  mild:     '#10B981',
  minor:    '#10B981',
  moderate: '#F59E0B',
  severe:   '#EF4444',
  critical: '#B91C1C',
  unknown:  '#64748B',
}

interface InjuryMapProps {
  injuries: InjuryRecord[]
  onAdd: (injury: InjuryRecord) => void
  onRemove: (id: string) => void
  nightMode?: boolean
}

export function InjuryMap({ injuries, onAdd, onRemove, nightMode }: InjuryMapProps) {
  const [view, setView] = useState<BodyView>('front')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null)
  const [showAllLabels, setShowAllLabels] = useState(false)

  // Current injury in form
  const [selectedFinding, setSelectedFinding] = useState<string>('Pain / Tenderness')
  const [selectedSeverity, setSelectedSeverity] = useState<InjuryRecord['severity']>('moderate')
  const [crewNotes, setCrewNotes] = useState<string>('')
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null)

  const activeRegions = REGIONS.filter((r) => {
    if (view === 'front') return !!r.frontPath
    if (view === 'back') return !!r.backPath
    return !!r.sidePath
  })

  const injuriesOnRegion = (regionId: string) =>
    injuries.filter((i) => i.region === regionId)

  const selectedRegion = REGIONS.find((r) => r.id === selectedRegionId)
  const hoveredRegion = REGIONS.find((r) => r.id === hoveredRegionId)

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegionId(regionId)
    setSelectedFinding('Pain / Tenderness')
    setSelectedSeverity('moderate')
    setCrewNotes('')
    setAttachedPhoto(null)
  }

  const handleSaveInjury = () => {
    if (!selectedRegionId) return

    let inferredType: InjuryClassification = 'blunt'
    if (selectedFinding.includes('Fracture')) inferredType = 'fracture'
    else if (selectedFinding.includes('Laceration')) inferredType = 'laceration'
    else if (selectedFinding.includes('Penetrating')) inferredType = 'penetrating'
    else if (selectedFinding.includes('Burn')) inferredType = 'burn'
    else if (selectedFinding.includes('Crush')) inferredType = 'crush'
    else if (selectedFinding.includes('Bleeding')) inferredType = 'haemorrhage'

    const newInjury: InjuryRecord = {
      id: Math.random().toString(36).slice(2, 10),
      region: selectedRegionId,
      laterality: selectedRegionId.includes('right') ? 'right' : selectedRegionId.includes('left') ? 'left' : 'na',
      type: inferredType,
      specificFinding: selectedFinding,
      severity: selectedSeverity,
      notes: crewNotes.trim() ? crewNotes.trim() : undefined,
      photoUrl: attachedPhoto ?? undefined,
      photoSource: attachedPhoto ? 'Captured by ambulance staff' : undefined,
      timestamp: new Date().toISOString(),
      assessedBy: 'Paramedic (Crew)',
    }

    onAdd(newInjury)
    setSelectedRegionId(null)
    setAttachedPhoto(null)
    setCrewNotes('')
  }

  // Determine current image asset based on view (matched multi-view asset set)
  const figureSrc =
    view === 'front'
      ? '/images/body-front.jpg'
      : view === 'back'
      ? '/images/body-back.jpg'
      : '/images/body-side.jpg'

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
      {/* ── LEFT: Interactive Anatomical Viewer ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex-shrink-0 w-full lg:w-auto">
        {/* Left View Switcher (Large tactile targets) */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-32 flex-shrink-0">
          <div className="flex items-center justify-between sm:mb-1">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Perspective
            </span>
          </div>

          {(['front', 'back', 'side'] as BodyView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                setSelectedRegionId(null)
              }}
              className={cn(
                'flex-1 sm:flex-none px-3.5 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all duration-200 border text-center flex items-center justify-center gap-2',
                view === v
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <RotateCw className={cn('w-3.5 h-3.5', view === v ? 'text-white' : 'text-slate-400')} />
              <span>{v === 'front' ? 'Anterior' : v === 'back' ? 'Posterior' : 'Lateral'}</span>
            </button>
          ))}

          {/* Toggle All Zones button */}
          <button
            type="button"
            onClick={() => setShowAllLabels(!showAllLabels)}
            className={cn(
              'mt-2 px-3 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-colors',
              showAllLabels
                ? 'bg-sky-50 text-sky-700 border-sky-300'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showAllLabels ? 'Hide Labels' : 'Show Labels'}</span>
          </button>

          {/* Guidance note */}
          <div className="mt-2 hidden sm:block p-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-[11px] text-sky-900 leading-snug">
            <span className="font-bold block text-sky-950 mb-0.5">Tactile Inspection</span>
            Tap any anatomical zone to record clinical findings.
          </div>
        </div>

        {/* Anatomical Figure Canvas */}
        <div className="relative flex flex-col items-center">
          <div
            className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#F9FBFC] to-[#EEF3F7] border border-slate-200 shadow-inner"
            style={{ width: 320, height: 576 }}
          >
            {/* Matched Photorealistic Medical Illustration with Motion Transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Image
                  src={figureSrc}
                  alt={`Medical Human Figure (${view} view)`}
                  fill
                  className="object-contain select-none pointer-events-none p-1.5"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {/* SVG Hit Overlay Layer */}
            <svg
              viewBox="0 0 500 900"
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 10 }}
            >
              {activeRegions.map((region) => {
                const path =
                  view === 'front' ? region.frontPath : view === 'back' ? region.backPath : region.sidePath
                if (!path) return null

                const regionInjuries = injuriesOnRegion(region.id)
                const hasInjury = regionInjuries.length > 0
                const isSelected = selectedRegionId === region.id
                const isHovered = hoveredRegionId === region.id
                const topInjury = regionInjuries[0]

                const fill = hasInjury
                  ? severityFill[topInjury.severity]
                  : isSelected
                  ? 'rgba(14, 165, 233, 0.40)'
                  : isHovered
                  ? 'rgba(14, 165, 233, 0.22)'
                  : showAllLabels
                  ? 'rgba(148, 163, 184, 0.08)'
                  : 'rgba(255, 255, 255, 0.01)'

                const stroke = hasInjury
                  ? severityStroke[topInjury.severity]
                  : isSelected
                  ? '#0284C7'
                  : isHovered
                  ? '#0EA5E9'
                  : showAllLabels
                  ? 'rgba(148, 163, 184, 0.4)'
                  : 'rgba(148, 163, 184, 0.15)'

                const strokeWidth = hasInjury ? 2.5 : isSelected ? 2.5 : isHovered ? 2 : 1

                return (
                  <g key={region.id}>
                    <path
                      d={path}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => handleSelectRegion(region.id)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                    />

                    {/* Injury Count / Severity Pin */}
                    {hasInjury && (() => {
                      const center =
                        view === 'front'
                          ? region.frontCenter
                          : view === 'back'
                          ? region.backCenter
                          : region.sideCenter
                      if (!center) return null
                      const cx = (center[0] / 100) * 500
                      const cy = (center[1] / 100) * 900

                      return (
                        <g transform={`translate(${cx}, ${cy})`} className="pointer-events-none">
                          <circle
                            r="14"
                            fill={severityStroke[topInjury.severity]}
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                            className="drop-shadow"
                          />
                          <text
                            textAnchor="middle"
                            dy="4.5"
                            fontSize="11"
                            fill="#FFFFFF"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {regionInjuries.length}
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                )
              })}
            </svg>

            {/* Clean Floating Leader Pill for Hovered / Selected Zone (Never overlapping wall of text) */}
            <AnimatePresence>
              {(hoveredRegion || selectedRegion) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none"
                >
                  <div className="bg-slate-900/90 text-white backdrop-blur px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg border border-slate-700/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      {selectedRegion?.label ?? hoveredRegion?.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 uppercase">
                      {selectedRegionId ? 'Selected' : 'Tap to document'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Severity Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Mild
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Severe
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Critical
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Contextual Detail Panel & Recorded Injuries ───────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
        <AnimatePresence mode="wait">
          {selectedRegionId && selectedRegion ? (
            /* Contextual Detail Form */
            <motion.div
              key="injury-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 rounded-3xl bg-white border-2 border-sky-500 shadow-lg shadow-sky-500/5 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                    Selected Anatomical Region
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedRegion.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRegionId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question 1: What do you see here? */}
              <div>
                <label className="font-bold text-xs text-slate-800 block mb-2">
                  What do you see here?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {CLINICAL_FINDINGS.map((finding) => (
                    <button
                      key={finding}
                      type="button"
                      onClick={() => setSelectedFinding(finding)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all',
                        selectedFinding === finding
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {finding}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: How serious does it appear? */}
              <div>
                <label className="font-bold text-xs text-slate-800 block mb-2">
                  How serious does it appear?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {SEVERITY_LEVELS.map((lvl) => (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => setSelectedSeverity(lvl.key)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all',
                        selectedSeverity === lvl.key
                          ? 'border-sky-500 bg-sky-50/80 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <span className="font-bold text-xs text-slate-900 block">{lvl.label}</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crew Notes */}
              <div>
                <label className="font-bold text-xs text-slate-800 block mb-1">
                  Crew Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tenderness on palpation, seatbelt sign, no crepitus"
                  value={crewNotes}
                  onChange={(e) => setCrewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Photo Evidence Section */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-xs text-slate-800 block mb-1.5">
                  Photo Evidence (Optional)
                </span>
                {attachedPhoto ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50 border border-sky-200">
                    <div className="w-14 h-14 relative rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 border">
                      <Image src={attachedPhoto} alt="Injury" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Photo Captured by Ambulance Staff
                      </span>
                      <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                        Attached to {selectedRegion.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedPhoto(null)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Camera className="w-3.5 h-3.5 text-sky-600" />}
                      onClick={() => setAttachedPhoto('/images/hero-handover.jpg')}
                    >
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Upload className="w-3.5 h-3.5 text-slate-500" />}
                      onClick={() => setAttachedPhoto('/images/hero-handover.jpg')}
                    >
                      Upload Photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSaveInjury}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-2xl"
                >
                  ✓ Save Injury
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setSelectedRegionId(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Recorded Injuries List */
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Recorded Injuries ({injuries.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tap any anatomical zone on the human figure to document findings.
                  </p>
                </div>
                {injuries.length > 0 && (
                  <Badge variant="sky" size="sm">
                    {injuries.length} {injuries.length === 1 ? 'region' : 'regions'} documented
                  </Badge>
                )}
              </div>

              {injuries.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
                    No injuries recorded yet. Tap any body region on the left to begin documenting trauma.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {injuries.map((inj) => {
                    const regDef = REGIONS.find((r) => r.id === inj.region)
                    const label = regDef ? regDef.label : inj.region

                    return (
                      <div
                        key={inj.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-start justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {label}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                                inj.severity === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : inj.severity === 'severe'
                                  ? 'bg-orange-100 text-orange-700'
                                  : inj.severity === 'moderate'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {inj.severity}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 font-medium">
                            {inj.specificFinding ?? `${inj.type} trauma`}
                          </p>

                          {inj.notes && (
                            <p className="text-xs text-slate-500 italic">
                              "{inj.notes}"
                            </p>
                          )}

                          {inj.photoUrl && (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="w-8 h-8 relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                <Image src={inj.photoUrl} alt="Evidence" fill className="object-cover" />
                              </div>
                              <span className="text-[11px] text-sky-600 font-medium">
                                Photo evidence attached
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemove(inj.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove injury"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
