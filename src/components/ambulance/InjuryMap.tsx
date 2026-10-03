'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  X, Info, Camera, Upload, Check, AlertTriangle, Trash2, Eye, Plus
} from 'lucide-react'
import { Button, Input, Textarea, Badge } from '@/components/ui'
import type { InjuryRecord, InjuryClassification } from '@/types/run'

export type BodyView = 'front' | 'back' | 'side'

interface RegionDef {
  id: string
  label: string
  frontPath?: string
  backPath?: string
  sidePath?: string
  frontCenter?: [number, number]
  backCenter?: [number, number]
  sideCenter?: [number, number]
  hasLaterality: boolean
}

// ─── Anatomical Regions with precise independent SVG paths (500x900 viewBox) ─
const REGIONS: RegionDef[] = [
  // HEAD & NECK
  {
    id: 'head',
    label: 'Cranium / Scalp',
    frontPath: 'M215,25 C215,10 285,10 285,25 C285,60 270,75 250,78 C230,75 215,60 215,25Z',
    backPath:  'M215,25 C215,10 285,10 285,25 C285,65 270,85 250,88 C230,85 215,65 215,25Z',
    sidePath:  'M255,20 C255,5 290,5 300,30 C305,60 290,75 260,80 C240,75 235,55 255,20Z',
    frontCenter: [50, 5],
    backCenter:  [50, 5],
    sideCenter:  [55, 6],
    hasLaterality: false,
  },
  {
    id: 'face',
    label: 'Face / Maxillofacial',
    frontPath: 'M225,55 L275,55 L270,95 L250,105 L230,95Z',
    sidePath:  'M270,45 L298,45 L295,85 L275,90Z',
    frontCenter: [50, 9],
    sideCenter:  [57, 8],
    hasLaterality: false,
  },
  {
    id: 'neck',
    label: 'Neck / Cervical Spine',
    frontPath: 'M232,100 L268,100 L272,125 L228,125Z',
    backPath:  'M232,92 L268,92 L272,125 L228,125Z',
    sidePath:  'M248,90 L270,90 L275,125 L250,125Z',
    frontCenter: [50, 13],
    backCenter:  [50, 12],
    sideCenter:  [57, 12],
    hasLaterality: false,
  },

  // TORSO FRONT
  {
    id: 'chest-right',
    label: 'Right Chest / Ribs',
    frontPath: 'M228,125 L250,125 L250,225 L220,225 L198,195 L198,145Z',
    frontCenter: [43, 19],
    hasLaterality: false,
  },
  {
    id: 'chest-left',
    label: 'Left Chest / Ribs',
    frontPath: 'M250,125 L272,125 L302,145 L302,195 L280,225 L250,225Z',
    frontCenter: [57, 19],
    hasLaterality: false,
  },
  {
    id: 'abdomen-upper',
    label: 'Upper Abdomen / Epigastric',
    frontPath: 'M215,225 L285,225 L288,275 L212,275Z',
    sidePath:  'M245,225 L280,225 L282,275 L245,275Z',
    frontCenter: [50, 28],
    sideCenter:  [56, 28],
    hasLaterality: false,
  },
  {
    id: 'abdomen-lower',
    label: 'Lower Abdomen / Umbilical',
    frontPath: 'M212,275 L288,275 L292,330 L208,330Z',
    sidePath:  'M245,275 L282,275 L285,330 L240,330Z',
    frontCenter: [50, 34],
    sideCenter:  [56, 34],
    hasLaterality: false,
  },
  {
    id: 'pelvis',
    label: 'Pelvis / Groin',
    frontPath: 'M200,330 L300,330 L310,400 L190,400Z',
    sidePath:  'M230,330 L290,330 L295,400 L225,400Z',
    frontCenter: [50, 41],
    sideCenter:  [55, 41],
    hasLaterality: false,
  },

  // BACK
  {
    id: 'upper-back',
    label: 'Upper Back / Scapula',
    backPath: 'M210,125 L290,125 L310,175 L300,230 L200,230 L190,175Z',
    backCenter: [50, 20],
    hasLaterality: false,
  },
  {
    id: 'spine',
    label: 'Thoracic / Lumbar Spine',
    backPath: 'M240,125 L260,125 L260,330 L240,330Z',
    backCenter: [50, 26],
    hasLaterality: false,
  },
  {
    id: 'lower-back',
    label: 'Lower Back / Flanks',
    backPath: 'M200,230 L300,230 L292,330 L208,330Z',
    backCenter: [50, 31],
    hasLaterality: false,
  },
  {
    id: 'buttocks',
    label: 'Gluteal / Sacrum',
    backPath: 'M195,330 L305,330 L310,400 L190,400Z',
    backCenter: [50, 41],
    hasLaterality: false,
  },

  // UPPER EXTREMITIES (R = Right anatomical, L = Left anatomical)
  {
    id: 'right-shoulder',
    label: 'Right Shoulder',
    frontPath: 'M165,125 L198,125 L198,175 L155,175 L155,145Z',
    backPath:  'M302,125 L335,145 L345,175 L302,175Z',
    frontCenter: [35, 17],
    backCenter:  [65, 17],
    hasLaterality: false,
  },
  {
    id: 'left-shoulder',
    label: 'Left Shoulder',
    frontPath: 'M302,125 L335,145 L345,175 L302,175Z',
    backPath:  'M165,125 L198,125 L198,175 L155,175 L155,145Z',
    frontCenter: [65, 17],
    backCenter:  [35, 17],
    hasLaterality: false,
  },
  {
    id: 'right-arm',
    label: 'Right Upper Arm',
    frontPath: 'M155,175 L195,175 L185,260 L145,260Z',
    backPath:  'M305,175 L345,175 L355,260 L315,260Z',
    frontCenter: [33, 24],
    backCenter:  [67, 24],
    hasLaterality: false,
  },
  {
    id: 'left-arm',
    label: 'Left Upper Arm',
    frontPath: 'M305,175 L345,175 L355,260 L315,260Z',
    backPath:  'M155,175 L195,175 L185,260 L145,260Z',
    frontCenter: [67, 24],
    backCenter:  [33, 24],
    hasLaterality: false,
  },
  {
    id: 'right-forearm',
    label: 'Right Forearm / Elbow',
    frontPath: 'M145,260 L185,260 L175,360 L135,360Z',
    backPath:  'M315,260 L355,260 L365,360 L325,360Z',
    frontCenter: [31, 35],
    backCenter:  [69, 35],
    hasLaterality: false,
  },
  {
    id: 'left-forearm',
    label: 'Left Forearm / Elbow',
    frontPath: 'M315,260 L355,260 L365,360 L325,360Z',
    backPath:  'M145,260 L185,260 L175,360 L135,360Z',
    frontCenter: [69, 35],
    backCenter:  [31, 35],
    hasLaterality: false,
  },
  {
    id: 'right-hand',
    label: 'Right Wrist / Hand',
    frontPath: 'M135,360 L175,360 L170,425 L125,425Z',
    backPath:  'M325,360 L365,360 L375,425 L330,425Z',
    frontCenter: [30, 44],
    backCenter:  [70, 44],
    hasLaterality: false,
  },
  {
    id: 'left-hand',
    label: 'Left Wrist / Hand',
    frontPath: 'M325,360 L365,360 L375,425 L330,425Z',
    backPath:  'M135,360 L175,360 L170,425 L125,425Z',
    frontCenter: [70, 44],
    backCenter:  [30, 44],
    hasLaterality: false,
  },

  // LOWER EXTREMITIES
  {
    id: 'right-thigh',
    label: 'Right Thigh / Femur',
    frontPath: 'M190,400 L248,400 L245,550 L180,550Z',
    backPath:  'M252,400 L310,400 L320,550 L255,550Z',
    sidePath:  'M225,400 L285,400 L280,550 L218,550Z',
    frontCenter: [42, 53],
    backCenter:  [58, 53],
    sideCenter:  [53, 53],
    hasLaterality: false,
  },
  {
    id: 'left-thigh',
    label: 'Left Thigh / Femur',
    frontPath: 'M252,400 L310,400 L320,550 L255,550Z',
    backPath:  'M190,400 L248,400 L245,550 L180,550Z',
    frontCenter: [58, 53],
    backCenter:  [42, 53],
    hasLaterality: false,
  },
  {
    id: 'right-knee',
    label: 'Right Knee / Patella',
    frontPath: 'M180,550 L245,550 L243,620 L182,620Z',
    backPath:  'M255,550 L320,550 L318,620 L257,620Z',
    sidePath:  'M218,550 L280,550 L278,620 L215,620Z',
    frontCenter: [42, 65],
    backCenter:  [58, 65],
    sideCenter:  [53, 65],
    hasLaterality: false,
  },
  {
    id: 'left-knee',
    label: 'Left Knee / Patella',
    frontPath: 'M255,550 L320,550 L318,620 L257,620Z',
    backPath:  'M180,550 L245,550 L243,620 L182,620Z',
    frontCenter: [58, 65],
    backCenter:  [42, 65],
    hasLaterality: false,
  },
  {
    id: 'right-lower-leg',
    label: 'Right Lower Leg / Tibia',
    frontPath: 'M182,620 L243,620 L238,780 L188,780Z',
    backPath:  'M257,620 L318,620 L312,780 L262,780Z',
    sidePath:  'M215,620 L278,620 L272,780 L210,780Z',
    frontCenter: [42, 78],
    backCenter:  [58, 78],
    sideCenter:  [52, 78],
    hasLaterality: false,
  },
  {
    id: 'left-lower-leg',
    label: 'Left Lower Leg / Tibia',
    frontPath: 'M257,620 L318,620 L312,780 L262,780Z',
    backPath:  'M182,620 L243,620 L238,780 L188,780Z',
    frontCenter: [58, 78],
    backCenter:  [42, 78],
    hasLaterality: false,
  },
  {
    id: 'right-foot',
    label: 'Right Ankle / Foot',
    frontPath: 'M188,780 L238,780 L242,865 L175,865Z',
    backPath:  'M262,780 L312,780 L325,865 L258,865Z',
    sidePath:  'M210,780 L272,780 L295,865 L205,865Z',
    frontCenter: [41, 92],
    backCenter:  [59, 92],
    sideCenter:  [53, 92],
    hasLaterality: false,
  },
  {
    id: 'left-foot',
    label: 'Left Ankle / Foot',
    frontPath: 'M262,780 L312,780 L325,865 L258,865Z',
    backPath:  'M188,780 L238,780 L242,865 L175,865Z',
    frontCenter: [59, 92],
    backCenter:  [41, 92],
    hasLaterality: false,
  },
]

// Specific clinical findings as requested in prompt
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

const SEVERITY_LEVELS: { key: InjuryRecord['severity']; label: string; desc: string; color: string }[] = [
  { key: 'mild', label: 'Mild', desc: 'Superficial, minimal distress', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { key: 'moderate', label: 'Moderate', desc: 'Significant pain, functional impairment', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'severe', label: 'Severe', desc: 'Gross deformity, unstable, marked bleeding', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { key: 'critical', label: 'Critical', desc: 'Immediate life or limb threat', color: 'bg-red-50 text-red-700 border-red-300' },
  { key: 'unknown', label: 'Unable to Assess', desc: 'Compromised exam / inaccessible', color: 'bg-slate-100 text-slate-700 border-slate-300' },
]

const severityFill: Record<string, string> = {
  mild:     'rgba(16, 185, 129, 0.45)',
  minor:    'rgba(16, 185, 129, 0.45)',
  moderate: 'rgba(245, 158, 11, 0.55)',
  severe:   'rgba(239, 68, 68, 0.65)',
  critical: 'rgba(185, 28, 28, 0.8)',
  unknown:  'rgba(100, 116, 139, 0.4)',
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

  // Current injury in form
  const [selectedFinding, setSelectedFinding] = useState<string>('Pain / Tenderness')
  const [selectedSeverity, setSelectedSeverity] = useState<InjuryRecord['severity']>('moderate')
  const [crewNotes, setCrewNotes] = useState<string>('')
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null)
  const [photoSourceLabel, setPhotoSourceLabel] = useState<string>('')

  const activeRegions = REGIONS.filter((r) => {
    if (view === 'front') return !!r.frontPath
    if (view === 'back') return !!r.backPath
    return !!r.sidePath
  })

  const injuriesOnRegion = (regionId: string) =>
    injuries.filter((i) => i.region === regionId)

  const selectedRegion = REGIONS.find((r) => r.id === selectedRegionId)

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegionId(regionId)
    setSelectedFinding('Pain / Tenderness')
    setSelectedSeverity('moderate')
    setCrewNotes('')
    setAttachedPhoto(null)
  }

  const handleSaveInjury = () => {
    if (!selectedRegionId) return

    // Map finding to high-level type
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
      photoSource: attachedPhoto ? 'Photo captured by ambulance staff' : undefined,
      timestamp: new Date().toISOString(),
      assessedBy: 'Paramedic (Crew)',
    }

    onAdd(newInjury)
    setSelectedRegionId(null)
    setAttachedPhoto(null)
    setCrewNotes('')
  }

  // Demo photos that can be captured
  const attachDemoPhoto = (label: string) => {
    setAttachedPhoto('/images/hero-handover.jpg')
    setPhotoSourceLabel('Photo captured by ambulance staff — Scene finding')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* ── LEFT: Interactive Anatomical Viewer ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex-shrink-0">
        {/* Left View Switcher buttons (Large tactile targets as requested) */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-28 flex-shrink-0">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400 hidden sm:block mb-1">
            Perspective
          </span>
          {(['front', 'back', 'side'] as BodyView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                setSelectedRegionId(null)
              }}
              className={cn(
                'flex-1 sm:flex-none px-3 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all duration-150 border text-center',
                view === v
                  ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {v === 'front' ? 'Anterior (Front)' : v === 'back' ? 'Posterior (Back)' : 'Lateral (Side)'}
            </button>
          ))}

          {/* Quick guidance note */}
          <div className="mt-2 hidden sm:block p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 leading-snug">
            <Info className="w-3.5 h-3.5 text-sky-500 mb-1" />
            Tap an anatomical zone to document localized findings.
          </div>
        </div>

        {/* Anatomical Figure Canvas with SVG Hotspots */}
        <div className="relative flex flex-col items-center">
          <div
            className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200"
            style={{ width: 240, height: 432 }}
          >
            {/* Background Medical Illustration */}
            <Image
              src="/images/body-map-figure.jpg"
              alt="Medical Human Figure"
              fill
              className={cn(
                'object-contain select-none pointer-events-none p-1 transition-transform duration-200',
                view === 'back' ? 'scale-x-[-1]' : '',
                view === 'side' ? 'object-right' : ''
              )}
              priority
            />

            {/* SVG Hit Areas */}
            <svg
              viewBox="0 0 500 900"
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 10 }}
            >
              {activeRegions.map((region) => {
                const path = view === 'front' ? region.frontPath : view === 'back' ? region.backPath : region.sidePath
                if (!path) return null

                const regionInjuries = injuriesOnRegion(region.id)
                const hasInjury = regionInjuries.length > 0
                const isSelected = selectedRegionId === region.id
                const topInjury = regionInjuries[0]

                const fill = hasInjury
                  ? severityFill[topInjury.severity]
                  : isSelected
                  ? 'rgba(14, 165, 233, 0.35)'
                  : 'rgba(255, 255, 255, 0.01)'

                const stroke = hasInjury
                  ? severityStroke[topInjury.severity]
                  : isSelected
                  ? '#0EA5E9'
                  : 'rgba(148, 163, 184, 0.25)'

                const strokeWidth = hasInjury ? 2.5 : isSelected ? 2.5 : 1

                return (
                  <g key={region.id}>
                    <path
                      d={path}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-all duration-150 hover:fill-sky-500/30 hover:stroke-sky-500"
                      onClick={() => handleSelectRegion(region.id)}
                    />

                    {/* Injury Count / Severity Badge */}
                    {hasInjury && (() => {
                      const center = view === 'front' ? region.frontCenter : view === 'back' ? region.backCenter : region.sideCenter
                      if (!center) return null
                      const cx = (center[0] / 100) * 500
                      const cy = (center[1] / 100) * 900

                      return (
                        <g transform={`translate(${cx}, ${cy})`} className="pointer-events-none">
                          <circle
                            r="12"
                            fill={severityStroke[topInjury.severity]}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                          <text
                            textAnchor="middle"
                            dy="4"
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
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <AnimatePresence mode="wait">
          {selectedRegionId && selectedRegion ? (
            /* Contextual Injury Form */
            <motion.div
              key="injury-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-white border-2 border-sky-400 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                    Selected Anatomical Region
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedRegion.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRegionId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question 1: What happened here? */}
              <div>
                <label className="font-bold text-xs text-slate-800 block mb-2">
                  What happened here? (Select primary clinical finding)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {CLINICAL_FINDINGS.map((finding) => (
                    <button
                      key={finding}
                      type="button"
                      onClick={() => setSelectedFinding(finding)}
                      className={cn(
                        'px-2.5 py-2 rounded-xl text-xs font-semibold text-left border transition-all',
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITY_LEVELS.filter(s => s.key !== 'minor').map((lvl) => (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => setSelectedSeverity(lvl.key)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all',
                        selectedSeverity === lvl.key
                          ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <span className="font-bold text-xs text-slate-900 block">{lvl.label}</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-xs text-slate-800 block mb-1">
                  Crew Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tenderness on lateral palpation, no paradoxical motion"
                  value={crewNotes}
                  onChange={(e) => setCrewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Photo Evidence Section */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-xs text-slate-800 block mb-1.5">
                  Visual Evidence (Optional)
                </span>
                {attachedPhoto ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                    <div className="w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 border">
                      <Image src={attachedPhoto} alt="Injury" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-900 block truncate">Photo captured</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Source: Paramedic tablet</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedPhoto(null)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Camera className="w-3.5 h-3.5" />}
                      onClick={() => attachDemoPhoto('Scene finding')}
                    >
                      Attach Scene Photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSaveInjury}
                  className="flex-1 bg-sky-600 hover:bg-sky-500"
                >
                  ✓ Confirm & Add to Injury List
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
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Recorded Injuries ({injuries.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tap a body part on the left to add an injury.
                  </p>
                </div>
                {injuries.length > 0 && (
                  <Badge variant="sky" size="sm">
                    {injuries.length} anatomical {injuries.length === 1 ? 'finding' : 'findings'}
                  </Badge>
                )}
              </div>

              {injuries.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">
                    No injuries recorded yet. Tap any body region on the left to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {injuries.map((inj) => {
                    const regDef = REGIONS.find((r) => r.id === inj.region)
                    const label = regDef ? regDef.label : inj.region

                    return (
                      <div
                        key={inj.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-start justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
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
                            <div className="flex items-center gap-1.5 text-[11px] text-sky-600 font-medium pt-0.5">
                              <Camera className="w-3 h-3" />
                              <span>Photo evidence attached</span>
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
