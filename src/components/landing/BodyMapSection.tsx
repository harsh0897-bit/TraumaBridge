'use client'

import { motion } from 'motion/react'
import { staggerContainer, slideUpIn, viewportOnce } from '@/lib/motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Animated body map SVG preview
function BodyMapPreview() {
  const regions = [
    // Front view simplified anatomy
    { id: 'head', d: 'M50 15 C38 15 30 22 30 32 C30 42 38 48 50 48 C62 48 70 42 70 32 C70 22 62 15 50 15Z', active: true, color: '#EF4444' },
    { id: 'chest', d: 'M35 52 L65 52 L68 90 L32 90Z', active: true, color: '#F59E0B' },
    { id: 'abdomen', d: 'M34 92 L66 92 L64 118 L36 118Z', active: false, color: '#0EA5E9' },
    { id: 'pelvis', d: 'M32 120 L68 120 L72 140 L28 140Z', active: true, color: '#EF4444' },
    { id: 'l-arm', d: 'M28 54 L18 54 L12 95 L22 95Z', active: false, color: '#0EA5E9' },
    { id: 'r-arm', d: 'M72 54 L82 54 L88 95 L78 95Z', active: false, color: '#0EA5E9' },
    { id: 'l-thigh', d: 'M30 142 L42 142 L40 180 L28 180Z', active: false, color: '#0EA5E9' },
    { id: 'r-thigh', d: 'M58 142 L70 142 L72 180 L60 180Z', active: false, color: '#0EA5E9' },
    { id: 'l-leg', d: 'M27 182 L39 182 L37 220 L25 220Z', active: false, color: '#0EA5E9' },
    { id: 'r-leg', d: 'M61 182 L73 182 L75 220 L63 220Z', active: false, color: '#0EA5E9' },
  ]

  return (
    <div className="relative flex items-center justify-center gap-12">
      {/* Front view */}
      <div className="relative">
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-xs text-slate-400 tracking-wider uppercase">Front</span>
        <svg width="100" height="240" viewBox="0 0 100 240" className="overflow-visible">
          {regions.map((region) => (
            <path
              key={region.id}
              d={region.d}
              fill={region.active ? region.color : '#E2E8F0'}
              fillOpacity={region.active ? 0.85 : 0.5}
              stroke={region.active ? region.color : '#CBD5E1'}
              strokeWidth={region.active ? 1.5 : 0.75}
              className={region.active ? 'cursor-pointer' : ''}
            />
          ))}
          {/* Midline */}
          <line x1="50" y1="48" x2="50" y2="140" stroke="#CBD5E1" strokeWidth="0.75" strokeDasharray="3 2" />
        </svg>
        {/* Injury markers */}
        <div className="absolute top-[18%] left-[52%] flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/40" />
            <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">Head — contusion</span>
          </div>
        </div>
        <div className="absolute top-[52%] left-[-80%] flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/40" />
            <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">Pelvis — fracture</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BodyMapSection() {
  return (
    <section className="py-32 bg-slate-50 overflow-hidden">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer}
          >
            <motion.p variants={slideUpIn} className="label-overline mb-3">
              Injury Documentation
            </motion.p>
            <motion.h2
              variants={slideUpIn}
              className="text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-5"
            >
              Injuries documented
              <br />
              beyond ambiguity.
            </motion.h2>
            <motion.p variants={slideUpIn} className="text-lg text-slate-500 mb-6 leading-relaxed">
              The interactive body map lets paramedics tap directly on anatomical regions to
              record injury type, severity, and laterality. No shorthand, no verbal ambiguity.
              The receiving ED sees exactly what was found and where.
            </motion.p>
            <motion.ul variants={staggerContainer} className="space-y-3 mb-10">
              {[
                'Front, back, and side anatomical views',
                'Per-region injury type and severity',
                'Laterality — left, right, bilateral',
                'Multiple injury types per region',
                'Touch-optimised for gloved hands',
              ].map((item) => (
                <motion.li key={item} variants={slideUpIn} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
            <motion.div variants={slideUpIn}>
              <span className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Full body map coming in Phase 2
              </span>
            </motion.div>
          </motion.div>

          {/* Body map preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
            className="flex items-center justify-center"
          >
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl p-10">
              {/* Demo badge */}
              <div className="absolute top-4 right-4 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                <span className="font-mono text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                  Preview
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-700 mb-8 text-center">
                Injury Map — Active Session
              </h4>

              <BodyMapPreview />

              {/* Legend */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-center">
                {[
                  { color: '#EF4444', label: 'Critical' },
                  { color: '#F59E0B', label: 'Moderate' },
                  { color: '#0EA5E9', label: 'Minor' },
                  { color: '#E2E8F0', label: 'Unselected' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="font-mono text-[11px] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
