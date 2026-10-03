'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Activity, ChevronRight, X, Menu } from 'lucide-react'

const navLinks = [
  { label: 'How it Works', href: '#workflow' },
  { label: 'Features', href: '#features' },
  { label: 'For Hospitals', href: '#hospital' },
  { label: 'Evidence', href: '#evidence' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsub = scrollY.on('change', (y) => setScrolled(y > 40))
    return unsub
  }, [scrollY])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#0A1628]/90 backdrop-blur-xl border-b border-white/8'
          : 'bg-transparent'
      )}
    >
      <div className="container-site">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <TBLogo />
            <span className="font-mono font-semibold text-white tracking-tight text-lg">
              TRAUMABRIDGE
              <span className="text-[#0EA5E9] ml-1 font-normal">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 hover:text-white transition-colors duration-150 font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/hospital"
              className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 font-medium"
            >
              Hospital View
            </Link>
            <Link
              href="/ambulance"
              className="flex items-center gap-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150"
            >
              Ambulance Terminal
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 py-4 flex flex-col gap-3"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-white py-2 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
              <Link href="/hospital" className="text-center py-2 text-sm text-slate-300 border border-white/20 rounded-lg">Hospital View</Link>
              <Link href="/ambulance" className="text-center py-2 text-sm font-semibold bg-[#0EA5E9] text-white rounded-lg">Ambulance Terminal</Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}

function TBLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="TraumaBridge logo">
      {/* Bridge arc */}
      <path
        d="M4 22 Q16 6 28 22"
        stroke="#0EA5E9"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Pulse line through arc center */}
      <path
        d="M13 16 L15 13 L16 18 L17.5 11 L19 16"
        stroke="#2DD4BF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Left pillar */}
      <line x1="4" y1="22" x2="4" y2="28" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right pillar */}
      <line x1="28" y1="22" x2="28" y2="28" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
      {/* Base */}
      <line x1="2" y1="28" x2="30" y2="28" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export { TBLogo }
