import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Workflow } from '@/components/landing/Workflow'
import { HospitalSection } from '@/components/landing/HospitalSection'
import { BodyMapSection } from '@/components/landing/BodyMapSection'
import { DataBridgeSection, Footer } from '@/components/landing/DataBridgeSection'

export const metadata: Metadata = {
  title: 'TraumaBridge AI — Pre-Hospital Emergency Handover Platform',
  description:
    'TraumaBridge AI connects ambulance crews with hospital emergency departments through structured MIST handovers, interactive injury maps, and verified pre-arrival coordination.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      <HospitalSection />
      <BodyMapSection />
      <DataBridgeSection />
      <Footer />
    </main>
  )
}
