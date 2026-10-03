'use client'

import { motion } from 'motion/react'
import { staggerContainer, slideUpIn, viewportOnce } from '@/lib/motion'
import { ChevronRight } from 'lucide-react'

const steps = [
  {
    num: '01',
    phase: 'Dispatch',
    title: 'Run begins, record opens',
    description: 'The moment a crew is dispatched, a TraumaBridge mission record opens automatically. Patient identity, callsign, and destination are set in seconds.',
    color: '#0EA5E9',
    side: 'Ambulance',
  },
  {
    num: '02',
    phase: 'On Scene',
    title: 'Assess, map, and document',
    description: 'The lead paramedic marks injuries on the body map, records AVPU and vitals from the connected monitor, and notes treatments administered. Touch-first design works with gloves on.',
    color: '#2DD4BF',
    side: 'Ambulance',
  },
  {
    num: '03',
    phase: 'Pre-Alert',
    title: 'Structured handover transmitted',
    description: 'A complete MIST handover — verified, structured, and timestamped — is sent to the designated receiving ED before the ambulance departs scene.',
    color: '#0EA5E9',
    side: 'Both',
  },
  {
    num: '04',
    phase: 'In Transit',
    title: 'Hospital prepares',
    description: 'The trauma team reviews injury map, vitals trend, and blood-bank alert. Trauma bay, CT, and theatre coordination starts while the patient is 10 minutes away.',
    color: '#10B981',
    side: 'Hospital',
  },
  {
    num: '05',
    phase: 'Arrival',
    title: 'Verbal handover confirmed',
    description: 'Verbal MIST is confirmed against the digital record. The event trail captures the formal handover moment. The clinical record transitions seamlessly into the hospital system.',
    color: '#2DD4BF',
    side: 'Both',
  },
]

export function Workflow() {
  return (
    <section id="workflow" className="py-32 bg-slate-50">
      <div className="container-site">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <motion.p variants={slideUpIn} className="label-overline mb-3">
            Connected Workflow
          </motion.p>
          <motion.h2
            variants={slideUpIn}
            className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-5"
          >
            From scene to resus,
            <br />
            nothing gets lost.
          </motion.h2>
          <motion.p variants={slideUpIn} className="text-lg text-slate-500">
            A continuous information thread follows your patient from the first
            responder assessment to the trauma bay door.
          </motion.p>
        </motion.div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-[calc(50%-1px)] top-0 bottom-0 w-px bg-gradient-to-b from-[#0EA5E9]/0 via-[#0EA5E9]/30 to-[#0EA5E9]/0 hidden md:block" />

          <div className="flex flex-col gap-12">
            {steps.map((step, i) => (
              <WorkflowStep key={step.num} {...step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WorkflowStep({
  num,
  phase,
  title,
  description,
  color,
  side,
  index,
}: (typeof steps)[0] & { index: number }) {
  const isRight = index % 2 === 1

  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: [0, 0, 0.2, 1], delay: 0.05 }}
      className={`relative flex flex-col md:flex-row items-center gap-8 ${
        isRight ? 'md:flex-row-reverse' : ''
      }`}
    >
      {/* Card */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs font-bold tracking-widest"
              style={{ color }}
            >
              {num}
            </span>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              {phase}
            </span>
          </div>
          <span
            className="font-mono text-[10px] font-semibold tracking-widest px-2 py-0.5 rounded-full"
            style={{ color, backgroundColor: `${color}18` }}
          >
            {side}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      {/* Center node */}
      <div className="relative z-10 flex-shrink-0 hidden md:flex">
        <div
          className="w-4 h-4 rounded-full border-2 border-current bg-white"
          style={{ color, borderColor: color }}
        />
        <div
          className="absolute inset-0 rounded-full opacity-30 animate-ping"
          style={{ backgroundColor: color, animationDuration: '3s' }}
        />
      </div>

      {/* Spacer for alternating layout */}
      <div className="flex-1 hidden md:block" />
    </motion.div>
  )
}
