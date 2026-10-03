'use client'

import { motion } from 'motion/react'
import { staggerContainer, slideUpIn, viewportOnce } from '@/lib/motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'

export function DataBridgeSection() {
  return (
    <section id="evidence" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/data-bridge.jpg"
          alt="Digital data bridge connecting ambulance to hospital"
          fill
          className="object-cover"
          quality={80}
        />
        <div className="absolute inset-0 bg-[#0A1628]/85" />
      </div>

      <div className="relative z-10 container-site">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.p variants={slideUpIn} className="label-overline text-sky-400 mb-4">
            Evidence & Integrity
          </motion.p>
          <motion.h2
            variants={slideUpIn}
            className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6"
          >
            A timestamped record
            <br />
            of every clinical moment.
          </motion.h2>
          <motion.p variants={slideUpIn} className="text-xl text-slate-300 mb-10 leading-relaxed">
            Every vital sign, every treatment, every transmission — chronologically recorded,
            source-attributed, and preserved for clinical and medico-legal continuity.
          </motion.p>

          {/* Evidence pillars */}
          <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Timestamp Source', value: 'NTP / GPS' },
              { label: 'Event Integrity', value: 'Hash-chained' },
              { label: 'Offline Buffer', value: 'Local queue' },
              { label: 'Clinician Verify', value: 'Digital sign' },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                variants={slideUpIn}
                className="glass rounded-xl p-4 text-center"
              >
                <p className="font-mono text-sm font-bold text-sky-400 mb-1">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={slideUpIn}>
            <p className="text-sm text-slate-400 mb-8 max-w-xl mx-auto">
              TraumaBridge records physiological events with their evidence context.
              Formal brought-dead determinations remain the exclusive responsibility
              of the clinician, not the platform.
            </p>
            <Link
              href="/ambulance"
              className="group inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-7 py-4 rounded-xl transition-colors duration-200 shadow-[0_0_30px_-8px_rgba(14,165,233,0.6)]"
            >
              Explore the Platform
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="bg-[#0A1628] border-t border-white/8">
      <div className="container-site py-16">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M4 22 Q16 6 28 22" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M13 16 L15 13 L16 18 L17.5 11 L19 16" stroke="#2DD4BF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <line x1="4" y1="22" x2="4" y2="28" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="28" y1="22" x2="28" y2="28" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="2" y1="28" x2="30" y2="28" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="font-mono font-semibold text-white tracking-tight">TRAUMABRIDGE AI</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Pre-hospital emergency handover and tele-triage platform. 
              Connecting ambulance crews with receiving emergency departments.
            </p>
            <p className="text-xs text-slate-600 mt-4 font-mono">
              Phase 1 — Visual Prototype · Demo Only
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-10">
            <div>
              <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {['Ambulance Terminal', 'Hospital Dashboard', 'Body Map', 'Blood Bank', 'Event Trail'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-slate-500 hover:text-white transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-4">Information</h4>
              <ul className="space-y-2.5">
                {['Clinical Safety', 'Data Governance', 'NHS Alignment', 'Privacy Policy', 'Contact'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-slate-500 hover:text-white transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-600">
            © 2026 TraumaBridge AI. Not a registered medical device. For demonstration purposes only.
          </p>
          <p className="text-xs text-slate-600 font-mono">
            This system does not transmit real patient data.
          </p>
        </div>
      </div>
    </footer>
  )
}
