import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hospital ED Dashboard',
  description: 'TraumaBridge AI hospital emergency department receiving interface — incoming cases, MIST review, and preparation coordination.',
}

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return children
}
