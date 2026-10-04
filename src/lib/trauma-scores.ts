/**
 * TRAUMABRIDGE AI — Clinical Trauma Scores & Thresholds
 * Deterministic medical formulas. Never LLM-generated.
 * Note: Shock Index thresholds are demo thresholds pending clinician review.
 */

export interface ShockIndexResult {
  value: number
  formatted: string
  status: 'normal' | 'warning' | 'critical'
  tone: 'success' | 'warning' | 'critical'
  label: string
}

/**
 * Shock Index = Heart Rate (bpm) / Systolic Blood Pressure (mmHg)
 * R7 & D10 Thresholds:
 * < 0.9: Normal (success tone)
 * 0.9 to 0.99: Warning (warning tone)
 * >= 1.0: Critical (critical tone)
 * The number, chip, and any sparkline MUST share the exact same tone.
 */
export function calculateShockIndex(hr?: number, sbp?: number): ShockIndexResult | null {
  if (!hr || !sbp || sbp <= 0) return null
  const si = hr / sbp
  const formatted = si.toFixed(2)

  if (si >= 1.0) {
    return {
      value: si,
      formatted,
      status: 'critical',
      tone: 'critical',
      label: 'Elevated (SI ≥ 1.0)',
    }
  }
  if (si >= 0.9) {
    return {
      value: si,
      formatted,
      status: 'warning',
      tone: 'warning',
      label: 'Borderline (0.90–0.99)',
    }
  }
  return {
    value: si,
    formatted,
    status: 'normal',
    tone: 'success',
    label: 'Normal (<0.90)',
  }
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

export function getBloodPressureStatus(sbp?: number, _dbp?: number): VitalStatusResult {
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

// ─── Revised Trauma Score (RTS) ───────────────────────────────────────────────

export interface RTSResult {
  score: number
  formatted: string
  gcsCoded: number
  sbpCoded: number
  rrCoded: number
  workingFormula: string
  status: 'normal' | 'warning' | 'critical'
}

/**
 * Coded values:
 * GCS: 13-15 = 4, 9-12 = 3, 6-8 = 2, 4-5 = 1, 3 = 0
 * SBP: >89 = 4, 76-89 = 3, 50-75 = 2, 1-49 = 1, 0 = 0
 * RR: 10-29 = 4, >29 = 3, 6-9 = 2, 1-5 = 1, 0 = 0
 * Formula: RTS = 0.9368*GCSc + 0.7326*SBPc + 0.2908*RRc
 */
export function codeGcs(gcs: number): number {
  if (gcs >= 13) return 4
  if (gcs >= 9) return 3
  if (gcs >= 6) return 2
  if (gcs >= 4) return 1
  return 0
}

export function codeSbp(sbp: number): number {
  if (sbp > 89) return 4
  if (sbp >= 76) return 3
  if (sbp >= 50) return 2
  if (sbp >= 1) return 1
  return 0
}

export function codeRr(rr: number): number {
  if (rr >= 10 && rr <= 29) return 4
  if (rr > 29) return 3
  if (rr >= 6) return 2
  if (rr >= 1) return 1
  return 0
}

export function calculateRTS(gcs?: number, sbp?: number, rr?: number): RTSResult | null {
  if (gcs === undefined || sbp === undefined || rr === undefined) return null

  const gcsc = codeGcs(gcs)
  const sbpc = codeSbp(sbp)
  const rrc = codeRr(rr)

  const score = 0.9368 * gcsc + 0.7326 * sbpc + 0.2908 * rrc
  const formatted = score.toFixed(2)
  const workingFormula = `GCS ${gcs} -> ${gcsc} · SBP ${sbp} -> ${sbpc} · RR ${rr} -> ${rrc} · 0.9368x${gcsc} + 0.7326x${sbpc} + 0.2908x${rrc} = ${score.toFixed(4)}`

  let status: 'normal' | 'warning' | 'critical' = 'normal'
  if (score < 4) {
    status = 'critical'
  } else if (score < 7.84) {
    status = 'warning'
  }

  return {
    score,
    formatted,
    gcsCoded: gcsc,
    sbpCoded: sbpc,
    rrCoded: rrc,
    workingFormula,
    status,
  }
}
