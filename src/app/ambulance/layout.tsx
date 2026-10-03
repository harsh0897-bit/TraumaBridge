import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ambulance Terminal',
  description: 'TraumaBridge AI ambulance crew interface — MIST handover, injury documentation, and pre-alert transmission.',
}

export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  return children
}
