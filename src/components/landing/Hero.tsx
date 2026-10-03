'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Activity, Shield, Zap } from 'lucide-react'
import { slideUpIn, staggerContainer, heroEntrance, viewportOnce } from '@/lib/motion'

const trustStats = [
  { value: '< 90s', label: 'Average alert time' },
  { value: '99.7%', label: 'Message delivery rate' },
  { value: 'GDPR', label: 'Compliant by design' },
  { value: 'NHS', label: 'Aligned standards' },
]

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '8%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-end overflow-hidden"
    >
      {/* Background image with parallax */}
      <motion.div
        style={{ y: imageY }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/hero-handover.jpg"
          alt="Paramedic using TraumaBridge AI tablet in ambulance"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/60 via-[#0A1628]/30 to-[#0A1628]/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/70 via-transparent to-transparent" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity }}
        className="relative z-10 container-site pb-24 pt-32"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          {/* Eyebrow */}
          <motion.div
            variants={slideUpIn}
            className="flex items-center gap-2 mb-6"
          >
            <div className="flex items-center gap-2 bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 rounded-full px-3 py-1">
              <span className="status-dot status-dot-stable" />
              <span className="font-mono text-xs font-medium text-[#38BDF8] tracking-widest uppercase">
                Pre-hospital Intelligence
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={heroEntrance}
            className="text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6"
          >
            The bridge between
            <br />
            <span className="text-[#0EA5E9]">ambulance</span> and{' '}
            <span className="text-[#2DD4BF]">hospital.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={slideUpIn}
            className="text-lg md:text-xl text-slate-300 max-w-xl mb-10 leading-relaxed"
          >
            TraumaBridge AI transmits structured MIST handovers, injury maps, and
            live vitals from ambulance to emergency department — before your patient arrives.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={slideUpIn}
            className="flex flex-wrap gap-4"
          >
            <Link
              href="/ambulance"
              className="group flex items-center gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_20px_-4px_rgba(14,165,233,0.5)]"
            >
              Try Ambulance Terminal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link
              href="/hospital"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              Hospital Dashboard
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            variants={slideUpIn}
            className="flex flex-wrap gap-x-8 gap-y-3 mt-14 pt-8 border-t border-white/10"
          >
            {trustStats.map((stat) => (
              <div key={stat.label}>
                <p className="font-mono text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-slate-500 tracking-widest uppercase font-mono">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-10 bg-gradient-to-b from-slate-500 to-transparent"
        />
      </motion.div>
    </section>
  )
}
