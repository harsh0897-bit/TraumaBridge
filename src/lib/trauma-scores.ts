/**
 * TRAUMABRIDGE AI — Clinical Trauma Scores & Thresholds
 * Deterministic medical formulas. Never LLM-generated.
 */

export interface ShockIndexResult {
  value: number
  formatted: string
  status: 'normal' | 'warning' | 'critical'
  label: string
}

/**
 * Shock Index = Heart Rate (bpm) / Systolic Blood Pressure (mmHg)
 * Normal: 0.5 - 0.7
 * Mild elevation / Warning: 0.8 - 0.99
 * Elevated (Impending / overt haemorrhagic shock): >= 1.0 (requires warning chip)
 * Critical shock: >= 1.4
 */
export function calculateShockIndex(hr?: number, sbp?: number): ShockIndexResult | null {
  if (!hr || !sbp || sbp <= 0) return null
  const si = hr / sbp
  const formatted = si.toFixed(2)

  if (si >= 1.4) {
    return { value: si, formatted, status: 'critical', label: 'Severe Shock' }
  }
  if (si >= 1.0) {
    return { value: si, formatted, status: 'warning', label: 'Elevated (SI ≥ 1.0)' }
  }
  if (si >= 0.8) {
    return { value: si, formatted, status: 'warning', label: 'Borderline' }
  }
  return { value: si, formatted, status: 'normal', label: 'Normal' }
}

export interface VitalStatusResult {
  status: 'success' | 'warning' | 'critical' | 'neutral'
  label: string
}

export function getHeartRateStatus(hr?: number): VitalStatusResult {
  if (hr === undefined || hr === null) return { status: 'neutral', label: 'No Reading' }
  if (hr > 130 || hr < 45) return { status: 'critical', label: hr > 130 ? 'Extreme Tachycardia' : 'Severe Bradycardia' }
  if (hr > 100) return { status: 'warning', label: 'Tachycardia' }
  if (hr < 60) return { status: 'warning', label: 'Bradycardia' }
  return { status: 'success', label: 'Normal (60–100)' }
}

export function getBloodPressureStatus(sbp?: number, dbp?: number): VitalStatusResult {
  if (sbp === undefined || sbp === null) return { status: 'neutral', label: 'No Reading' }
  if (sbp < 90) return { status: 'critical', label: 'Hypotension (<90)' }
  if (sbp < 100) return { status: 'warning', label: 'Borderline Low' }
  if (sbp > 180) return { status: 'critical', label: 'Severe Hypertension' }
  if (sbp > 140) return { status: 'warning', label: 'Hypertension' }
  return { status: 'success', label: 'Normotensive' }
}

export function getSpO2Status(spo2?: number): VitalStatusResult {
  if (spo2 === undefined || spo2 === null) return { status: 'neutral', label: 'No Reading' }
  if (spo2 < 90) return { status: 'critical', label: 'Severe Hypoxia (<90%)' }
  if (spo2 < 95) return { status: 'warning', label: 'Hypoxic (<95%)' }
  return { status: 'success', label: 'Normal (≥95%)' }
}

export function getRespRateStatus(rr?: number): VitalStatusResult {
  if (rr === undefined || rr === null) return { status: 'neutral', label: 'No Reading' }
  if (rr >= 30 || rr <= 8) return { status: 'critical', label: 'Critical Tachypnoea' }
  if (rr > 20) return { status: 'warning', label: 'Tachypnoeic' }
  if (rr < 12) return { status: 'warning', label: 'Bradypnoeic' }
  return { status: 'success', label: 'Normal (12–20)' }
}

export function getGcsStatus(gcs?: number): VitalStatusResult {
  if (gcs === undefined || gcs === null) return { status: 'neutral', label: 'No Reading' }
  if (gcs <= 8) return { status: 'critical', label: 'Severe (GCS ≤8)' }
  if (gcs <= 12) return { status: 'warning', label: 'Moderate (GCS 9–12)' }
  if (gcs <= 14) return { status: 'warning', label: 'Mild Impairment (13–14)' }
  return { status: 'success', label: 'Alert (15/15)' }
}
