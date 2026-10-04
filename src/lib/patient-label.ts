/**
 * TRAUMABRIDGE AI — Unified Patient Labeling
 * Deterministic patient naming across Rail, Header, Case Band, Hero, and Clinical Details.
 * Rule: Real patients use their name. Unknown patients use "Unidentified [male|female|patient]".
 * Subtitle returns age string (e.g. "~38 y" or "52 y").
 * Never invent placeholder names such as "John Doe #402".
 */

import type { EmergencyRun, Patient } from '@/types/run'

export interface PatientLabelResult {
  title: string
  sub: string
  isUnidentified: boolean
}

export function patientLabel(
  runOrPatient?: EmergencyRun | Patient | null
): PatientLabelResult {
  if (!runOrPatient) {
    return {
      title: 'Unidentified male',
      sub: '~38 y',
      isUnidentified: true,
    }
  }

  // Extract patient record
  const p: any = 'patient' in runOrPatient && runOrPatient.patient
    ? runOrPatient.patient
    : (runOrPatient as any)

  const hasName = Boolean(p.name && p.name.trim().length > 0)
  const isUnknown = p.identity === 'unknown' || p.identityStatus === 'unknown' || !hasName
  const ageVal = p.age ?? p.estimatedAge

  if (!isUnknown && p.name) {
    const ageStr = ageVal ? `${ageVal} y` : ''
    return {
      title: p.name,
      sub: ageStr,
      isUnidentified: false,
    }
  }

  // Unidentified patient
  const sex = p.sex
  const sexLabel = sex === 'female' ? 'female' : sex === 'male' ? 'male' : 'patient'
  const title = `Unidentified ${sexLabel}`

  const ageStr = ageVal ? `~${ageVal} y` : '~38 y'

  return {
    title,
    sub: ageStr,
    isUnidentified: true,
  }
}
