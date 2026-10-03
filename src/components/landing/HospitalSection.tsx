'use client'

import { motion } from 'motion/react'
import { staggerContainer, slideUpIn, viewportOnce } from '@/lib/motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Monitor, Bell, Clock, Activity } from 'lucide-react'

const hospitalFeatures = [
  { icon: Bell, text: 'Instant pre-alert with full MIST data' },
  { icon: Clock, text: 'Live ETA updated every 30 seconds' },
  { icon: Activity, text: 'Vitals trend visible before arrival' },
  { icon: Monitor, text: 'Trauma bay and team preparation state' },
]

export function HospitalSection() {
  return (
    <section id="hospital" className="py-32 bg-white overflow-hidden">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl"
          >
            <Image
              src="/images/ed-coordination.jpg"
              alt="Hospital ED team reviewing incoming case on TraumaBridge dashboard"
              fill
              className="object-cover"
              quality={85}
            />
            {/* Overlay badge */}
            <div className="absolute bottom-5 left-5 right-5">
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="status-dot status-dot-critical" />
                  <span className="font-mono text-xs font-semibold text-white tracking-widest uppercase">
                    Incoming — 4 min ETA
                  </span>
                </div>
                <p className="text-white/80 text-sm">
                  RTC · Male 38y · GCS 13 · SBP 94 · Pelvic binder applied
                </p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer}
          >
            <motion.p variants={slideUpIn} className="label-overline mb-3">
              For Emergency Departments
            </motion.p>
            <motion.h2
              variants={slideUpIn}
              className="text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-5"
            >
              Your team prepares
              <br />
              before the siren stops.
            </motion.h2>
            <motion.p variants={slideUpIn} className="text-lg text-slate-500 mb-8 leading-relaxed">
              The receiving ED dashboard gives your trauma team a complete,
              structured picture of every incoming patient — verified, timestamped,
              and updated in real time.
            </motion.p>

            {/* Feature list */}
            <motion.ul variants={staggerContainer} className="space-y-4 mb-10">
              {hospitalFeatures.map(({ icon: Icon, text }) => (
                <motion.li key={text} variants={slideUpIn} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-teal-600" strokeWidth={1.5} />
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{text}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={slideUpIn}>
              <Link
                href="/hospital"
                className="group inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors duration-200"
              >
                Open Hospital Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
