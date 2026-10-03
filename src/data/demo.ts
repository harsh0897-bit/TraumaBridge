/**
 * TRAUMABRIDGE AI — SYNTHETIC DEMONSTRATION DATA
 *
 * This file contains clearly labelled demo data for Phase 1 visual prototypes.
 * Nothing here is connected to real patients, real hospitals, or real devices.
 *
 * All identifiers are fictional. All vitals are illustrative.
 * DEMO ONLY — NOT FOR CLINICAL USE.
 */

import type {
  Mission,
  Patient,
  Vitals,
  Hospital,
  BloodAlert,
  MissionEvent,
  PreparationItem,
} from '@/types'

// ─── Demo Hospital ────────────────────────────────────────────────────────────

export const DEMO_HOSPITAL: Hospital = {
  id: 'hosp-001',
  name: 'St. Bartholomew\'s Major Trauma Centre',
  type: 'MTC',
  address: 'West Smithfield, London EC1A 7BE',
  phone: '020 7377 7000',
}

// ─── Demo Patient ─────────────────────────────────────────────────────────────

export const DEMO_PATIENT: Patient = {
  id: 'pt-demo-001',
  identity: 'unknown',
  age: 38,
  sex: 'male',
  allergies: ['Penicillin'],
}

// ─── Demo Vitals ─────────────────────────────────────────────────────────────

export const DEMO_VITALS: Vitals = {
  hr: {
    value: 118,
    unit: 'bpm',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    status: 'warning',
    source: 'monitor',
  },
  spo2: {
    value: 96,
    unit: '%',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    status: 'normal',
    source: 'monitor',
  },
  rr: {
    value: 22,
    unit: 'brpm',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    status: 'warning',
    source: 'manual',
  },
  sbp: {
    value: 94,
    unit: 'mmHg',
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    status: 'critical',
    source: 'monitor',
  },
  dbp: {
    value: 62,
    unit: 'mmHg',
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    status: 'warning',
    source: 'monitor',
  },
  gcs: {
    value: 13,
    unit: '/15',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    status: 'warning',
    source: 'manual',
  },
}

// ─── Demo Mission Events ──────────────────────────────────────────────────────

export const DEMO_EVENTS: MissionEvent[] = [
  {
    id: 'ev-001',
    type: 'dispatch',
    description: 'Unit Alpha-7 dispatched to RTC — M25 J18 northbound',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    operator: 'LAS Control',
  },
  {
    id: 'ev-002',
    type: 'scene-arrival',
    description: 'Arrived on scene. Multi-vehicle RTC. 1 critical patient.',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
  {
    id: 'ev-003',
    type: 'patient-contact',
    description: 'Patient contact established. Male, approx. 38 yrs. GCS 13.',
    timestamp: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
  {
    id: 'ev-004',
    type: 'vital-recorded',
    description: 'Initial vitals: HR 118, SBP 94, SpO₂ 96%, GCS 13',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    operator: 'Auto',
    metadata: { hr: 118, sbp: 94, spo2: 96, gcs: 13 },
  },
  {
    id: 'ev-005',
    type: 'treatment',
    description: '1× IV access (right antecubital). 500ml Hartmann\'s running.',
    timestamp: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
  {
    id: 'ev-006',
    type: 'treatment',
    description: 'Pelvic binder applied. Suspected pelvic fracture.',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
  {
    id: 'ev-007',
    type: 'alert-sent',
    description: 'Pre-alert transmitted to St. Bartholomew\'s MTC.',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
  {
    id: 'ev-008',
    type: 'alert-acked',
    description: 'Pre-alert acknowledged by ED charge nurse. Trauma bay 2 assigned.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    operator: 'ED Charge Nurse',
  },
  {
    id: 'ev-009',
    type: 'departure',
    description: 'Departed scene. ETA St. Bartholomew\'s 9 minutes.',
    timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    operator: 'Para. J. Chen',
  },
]

// ─── Demo Mission ─────────────────────────────────────────────────────────────

export const DEMO_MISSION: Mission = {
  id: 'mission-demo-001',
  callsign: 'Alpha 7',
  status: 'transporting',
  dispatchTime: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  sceneTime: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  departureTime: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  eta: 4,
  destination: DEMO_HOSPITAL,
  patient: DEMO_PATIENT,
  mist: {
    mechanism: 'rta-driver',
    mechanismDetail: 'High-speed frontal impact, airbag deployed, significant intrusion',
    injuries: [
      {
        id: 'inj-001',
        region: 'chest-left',
        type: 'contusion',
        severity: 'moderate',
        notes: 'Suspected rib fractures 4–6 left lateral',
        timestamp: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
      },
      {
        id: 'inj-002',
        region: 'pelvis',
        type: 'fracture',
        severity: 'severe',
        notes: 'Pelvic binder applied, haemodynamically unstable',
        timestamp: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
      },
      {
        id: 'inj-003',
        region: 'head',
        type: 'contusion',
        severity: 'moderate',
        notes: 'GCS 13, no focal neurology, laceration right temporal scalp',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ],
    signs: DEMO_VITALS,
    treatment: [
      {
        id: 'tx-001',
        type: 'IV Access',
        detail: '18G IV right antecubital fossa. 500ml Hartmann\'s solution running.',
        timestamp: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
        clinician: 'Para. J. Chen',
      },
      {
        id: 'tx-002',
        type: 'Pelvic Binder',
        detail: 'SAM Pelvic Sling II applied, positioned correctly.',
        timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        clinician: 'Para. J. Chen',
      },
      {
        id: 'tx-003',
        type: 'O₂ Therapy',
        detail: '15L/min via non-rebreather mask. SpO₂ improving.',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        clinician: 'Para. J. Chen',
      },
    ],
  },
  alertStatus: 'acknowledged',
  events: DEMO_EVENTS,
  crewLead: 'Para. J. Chen',
}

// ─── Demo Hospital Preparation State ─────────────────────────────────────────

export const DEMO_PREPARATION: PreparationItem[] = [
  { id: 'prep-001', label: 'Trauma Bay 2', status: 'ready', team: 'Trauma Team', updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: 'prep-002', label: 'Trauma Team Activated', status: 'ready', team: 'Trauma', updatedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
  { id: 'prep-003', label: 'CT Scanner', status: 'ready', team: 'Radiology', updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'prep-004', label: 'Orthopaedic Surgeon', status: 'in-progress', team: 'Ortho', updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'prep-005', label: 'Blood Products (MTP)', status: 'in-progress', team: 'Blood Bank', updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: 'prep-006', label: 'Theatre on Standby', status: 'pending', team: 'Theatre', updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
]

// ─── Demo Blood Alert ─────────────────────────────────────────────────────────

export const DEMO_BLOOD_ALERT: BloodAlert = {
  id: 'blood-demo-001',
  missionId: 'mission-demo-001',
  status: 'preparing',
  bloodGroup: 'O-negative (universal)',
  unitsRequested: 4,
  recipient: 'St. Bartholomew\'s MTC — Blood Bank',
  createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  isDemo: true,
}

// ─── Additional incoming cases (Hospital view) ────────────────────────────────

export const DEMO_INCOMING_CASES = [
  {
    id: 'inc-001',
    callsign: 'Alpha 7',
    eta: 4,
    priority: 'immediate' as const,
    mechanism: 'RTC — High Impact',
    patient: { sex: 'male', age: 38 },
    alertStatus: 'acknowledged' as const,
    alertedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc-002',
    callsign: 'Bravo 3',
    eta: 11,
    priority: 'urgent' as const,
    mechanism: 'Fall from height (4m)',
    patient: { sex: 'female', age: 52 },
    alertStatus: 'sent' as const,
    alertedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc-003',
    callsign: 'Charlie 9',
    eta: 18,
    priority: 'urgent' as const,
    mechanism: 'Assault — multiple injuries',
    patient: { sex: 'male', age: 27 },
    alertStatus: 'sent' as const,
    alertedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
]
