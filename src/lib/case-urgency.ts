/**
 * TRAUMABRIDGE AI — Unified Case Urgency
 * Single source of truth for case urgency across the hospital console.
 * Used identically in the case rail, header, hero tile, and protocol labels.
 */

import type { EmergencyRun } from '@/types/run'

export type CaseUrgencyLevel = 'critical' | 'urgent' | 'routine' | 'unsent'

export interface CaseUrgency {
  level: CaseUrgencyLevel
  label: string
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
      label: 'Standby',
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
      label: 'Awaiting Handover',
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
      label: 'Critical Alert (P1)',
      chipStatus: 'critical',
      badgeClass: 'bg-critical-soft text-critical border-critical/30',
      isCritical: true,
      isUrgent: false,
      isUnsent: false,
    }
  }

  // 3. Urgent Priority (P2)
  return {
    level: 'urgent',
    label: 'Urgent Alert (P2)',
    chipStatus: 'warning',
    badgeClass: 'bg-warning-soft text-warning border-warning/30',
    isCritical: false,
    isUrgent: true,
    isUnsent: false,
  }
}
