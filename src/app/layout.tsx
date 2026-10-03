import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TraumaBridge AI — Pre-Hospital Emergency Handover Platform',
    template: '%s | TraumaBridge AI',
  },
  description:
    'TraumaBridge AI connects ambulance crews with receiving hospital emergency departments through structured pre-alert, real-time injury mapping, and verified MIST handovers.',
  keywords: [
    'pre-hospital care',
    'emergency handover',
    'tele-triage',
    'ambulance technology',
    'MIST handover',
    'emergency department',
  ],
  openGraph: {
    type: 'website',
    siteName: 'TraumaBridge AI',
    title: 'TraumaBridge AI — Pre-Hospital Emergency Handover Platform',
    description:
      'Bridging the gap between ambulance and emergency department with structured, verified clinical communication.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
