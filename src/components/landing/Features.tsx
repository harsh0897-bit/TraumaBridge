'use client'

import { motion } from 'motion/react'
import { staggerContainer, cardEntrance, slideUpIn, viewportOnce } from '@/lib/motion'
import { Radio, MapPin, FileText, Layers, Droplets, Clock } from 'lucide-react'

const features = [
  {
    icon: Radio,
    title: 'Structured Pre-Alert',
    description: 'Send a verified MIST handover — Mechanism, Injuries, Signs, Treatment — the moment your crew departs the scene. The receiving ED knows before the siren stops.',
    accent: '#0EA5E9',
    tag: 'Communication',
  },
  {
    icon: Layers,
    title: 'Interactive Injury Map',
    description: 'Mark injuries on a precise anatomical body map with laterality, severity, and type. No verbal misinterpretations. No missed injuries during handover.',
    accent: '#2DD4BF',
    tag: 'Documentation',
  },
  {
    icon: Clock,
    title: 'Live ETA & Tracking',
    description: 'Hospital teams see estimated arrival time, updated continuously. Preparation begins while the patient is still 10 minutes away — not as they walk through the door.',
    accent: '#0EA5E9',
    tag: 'Coordination',
  },
  {
    icon: Droplets,
    title: 'Blood Bank Notification',
    description: 'Configured, authorized blood product alerts dispatched to the receiving facility\'s blood bank with acknowledgement confirmation and preparation status tracking.',
    accent: '#EF4444',
    tag: 'Blood Bank',
  },
  {
    icon: FileText,
    title: 'MIST Handover Record',
    description: 'Every field, timestamp, and clinical decision creates an immutable event record. Continuity of care information flows cleanly from scene to resus.',
    accent: '#2DD4BF',
    tag: 'Integrity',
  },
  {
    icon: MapPin,
    title: 'Hospital Preparation State',
    description: 'Trauma bay, team activation, CT, theatre standby — all coordinated and visible from the ambulance. Crew can verify preparation before arrival.',
    accent: '#0EA5E9',
    tag: 'Preparation',
  },
]

export function Features() {
  return (
    <section id="features" className="py-32 bg-white">
      <div className="container-site">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-2xl mb-20"
        >
          <motion.p variants={slideUpIn} className="label-overline mb-3">
            Platform Capabilities
          </motion.p>
          <motion.h2
            variants={slideUpIn}
            className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-5"
          >
            Everything the critical
            <br />
            window requires.
          </motion.h2>
          <motion.p variants={slideUpIn} className="text-lg text-slate-500 leading-relaxed">
            The first minutes of trauma care shape the outcome. TraumaBridge is built
            for that window — fast, structured, and impossible to misread.
          </motion.p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  tag,
}: (typeof features)[0]) {
  return (
    <motion.div
      variants={cardEntrance}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-7 transition-colors duration-200 hover:shadow-lg"
    >
      {/* Tag */}
      <span
        className="inline-block font-mono text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full mb-5"
        style={{ color: accent, backgroundColor: `${accent}15` }}
      >
        {tag}
      </span>

      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>

      {/* Hover accent line */}
      <div
        className="absolute bottom-0 inset-x-0 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
    </motion.div>
  )
}
