/**
 * TRAUMABRIDGE AI — Unified Case Urgency
 * Single source of truth for case urgency across the hospital console.
 * Used identically in the case rail, header, hero tile, and protocol labels.
 * Label text is strictly identical everywhere: "Critical" / "Urgent".
 */

import type { EmergencyRun } from '@/types/run'

export type CaseUrgencyLevel = 'critical' | 'urgent' | 'routine' | 'unsent'

export interface CaseUrgency {
  level: CaseUrgencyLevel
  label: 'Critical' | 'Urgent' | 'Awaiting handover'
  chipStatus: 'critical' | 'warning' | 'info' | 'neutral'
  badgeClass: string
  isCritical: boolean
  isUrgent: boolean
  isUnsent: boolean
}

/**
 * Returns deterministic case urgency.
 * Guarantees rail, header, hero, and protocol badges NEVER disagree.
 */
export function getCaseUrgency(run?: EmergencyRun | null): CaseUrgency {
  if (!run) {
    return {
      level: 'unsent',
      label: 'Awaiting handover',
      chipStatus: 'neutral',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      isCritical: false,
      isUrgent: false,
      isUnsent: true,
    }
  }

  // 1. Unsent / Awaiting pre-alert
  if (run.alertStatus === 'not-sent') {
    return {
      level: 'unsent',
      label: 'Awaiting handover',
      chipStatus: 'neutral',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      isCritical: false,
      isUrgent: false,
      isUnsent: true,
    }
  }

  // 2. Clinical Evaluation for Critical Priority (P1)
  const latestObs = run.vitalObservations?.[run.vitalObservations.length - 1]
  const sbp = latestObs?.sbp?.value
  const gcs = latestObs?.gcs?.total
  const hasSevereInjury = run.injuries?.some((inj) => inj.severity === 'severe' || inj.severity === 'critical')
  const hasBloodRequest = !!run.bloodBankRequest
  const isHypotensive = sbp !== undefined && sbp < 95
  const isAlteredMental = gcs !== undefined && gcs <= 13

  // Deterministic critical threshold: ID demo-run-001 or severe clinical criteria
  if (
    run.id === 'demo-run-001' ||
    hasBloodRequest ||
    hasSevereInjury ||
    isHypotensive ||
    isAlteredMental
  ) {
    return {
      level: 'critical',
      label: 'Critical',
      chipStatus: 'critical',
      badgeClass: 'bg-critical-soft text-critical-ink border-critical/30',
      isCritical: true,
      isUrgent: false,
      isUnsent: false,
    }
  }

  // 3. Urgent Priority (P2)
  return {
    level: 'urgent',
    label: 'Urgent',
    chipStatus: 'warning',
    badgeClass: 'bg-warning-soft text-warning-ink border-warning/30',
    isCritical: false,
    isUrgent: true,
    isUnsent: false,
  }
}
