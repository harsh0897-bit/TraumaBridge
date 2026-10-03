/**
 * TRAUMABRIDGE AI — Phase 2 Demo Run Data
 * Pre-populated demonstration emergency run.
 * DEMO ONLY — not real patient data.
 */

import type { EmergencyRun } from '@/types/run'

const T = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()

export const DEMO_RUN: EmergencyRun = {
  id: 'demo-run-001',
  callsign: 'Alpha 7',
  crewLead: 'Para. J. Chen',
  crewMembers: ['Para. J. Chen', 'Tech. S. Patel'],
  status: 'transporting',
  syncStatus: 'acknowledged',
  currentStep: 'patient',
  createdAt: T(30),
  updatedAt: T(1),
  isDemo: true,

  patient: {
    id: 'demo-pt-001',
    identityStatus: 'unknown',
    estimatedAge: 38,
    sex: 'male',
    allergies: ['Penicillin'],
    emergencyNotes: 'No ID found at scene. Unconscious on arrival.',
  },

  incident: {
    mechanism: 'Road Traffic Collision',
    mechanismCode: 'rta-driver',
    detail: 'High-speed frontal impact on M25 J18 northbound. Airbag deployed. Significant intrusion into passenger compartment.',
    location: 'M25 Junction 18 Northbound',
    time: T(28),
  },

  injuries: [
    {
      id: 'inj-demo-001',
      region: 'head',
      laterality: 'right',
      type: 'blunt',
      severity: 'moderate',
      notes: 'Scalp laceration right temporal, GCS 13. No focal neurology.',
      timestamp: T(22),
      assessedBy: 'Para. J. Chen',
    },
    {
      id: 'inj-demo-002',
      region: 'chest-left',
      laterality: 'left',
      type: 'blunt',
      severity: 'moderate',
      notes: 'Suspected rib fractures 4–6 left lateral. Decreased air entry L.',
      timestamp: T(21),
      assessedBy: 'Para. J. Chen',
    },
    {
      id: 'inj-demo-003',
      region: 'pelvis',
      laterality: 'na',
      type: 'fracture',
      severity: 'severe',
      notes: 'Pelvic instability on springing. Pelvic binder applied. Haemodynamically unstable.',
      timestamp: T(20),
      assessedBy: 'Para. J. Chen',
    },
  ],

  vitalObservations: [
    {
      id: 'obs-demo-001',
      timestamp: T(22),
      source: 'manual',
      assessedBy: 'Para. J. Chen',
      hr: { value: 124, unit: 'bpm' },
      sbp: { value: 88, unit: 'mmHg' },
      dbp: { value: 58, unit: 'mmHg' },
      spo2: { value: 94, unit: '%' },
      rr: { value: 24, unit: 'brpm' },
      gcs: { total: 13, components: { eye: 4, verbal: 3, motor: 6 } },
    },
    {
      id: 'obs-demo-002',
      timestamp: T(14),
      source: 'monitor',
      assessedBy: 'Lifepak 15',
      hr: { value: 118, unit: 'bpm' },
      sbp: { value: 94, unit: 'mmHg' },
      dbp: { value: 62, unit: 'mmHg' },
      spo2: { value: 96, unit: '%' },
      rr: { value: 22, unit: 'brpm' },
      gcs: { total: 13, components: { eye: 4, verbal: 3, motor: 6 } },
    },
    {
      id: 'obs-demo-003',
      timestamp: T(5),
      source: 'monitor',
      assessedBy: 'Lifepak 15',
      hr: { value: 112, unit: 'bpm' },
      sbp: { value: 98, unit: 'mmHg' },
      dbp: { value: 64, unit: 'mmHg' },
      spo2: { value: 97, unit: '%' },
      rr: { value: 20, unit: 'brpm' },
      gcs: { total: 14, components: { eye: 4, verbal: 4, motor: 6 } },
    },
  ],

  treatments: [
    {
      id: 'tx-demo-001',
      category: 'oxygen',
      description: 'O₂ Therapy',
      detail: '15L/min via non-rebreather mask. SpO₂ improving.',
      timestamp: T(21),
      performedBy: 'Para. J. Chen',
    },
    {
      id: 'tx-demo-002',
      category: 'iv-access',
      description: 'IV Access',
      detail: '18G IV right antecubital fossa.',
      timestamp: T(19),
      performedBy: 'Para. J. Chen',
    },
    {
      id: 'tx-demo-003',
      category: 'fluids',
      description: 'IV Fluids',
      detail: '500ml Hartmann\'s solution running via 18G IV right AC.',
      timestamp: T(18),
      performedBy: 'Para. J. Chen',
    },
    {
      id: 'tx-demo-004',
      category: 'haemorrhage-control',
      description: 'Pelvic Binder',
      detail: 'SAM Pelvic Sling II applied, positioned at greater trochanters.',
      timestamp: T(17),
      performedBy: 'Para. J. Chen',
    },
  ],

  mist: {
    mechanism: 'Road Traffic Collision (Driver) — High-speed frontal impact on M25 J18. Airbag deployed, significant intrusion.',
    injuries: 'Right head — blunt trauma [moderate]: Scalp laceration right temporal, GCS 13\nLeft chest — blunt trauma [moderate]: Suspected rib fractures 4–6 left lateral\nPelvis — fracture [severe]: Pelvic instability, pelvic binder applied',
    signs: 'HR 112 bpm · BP 98/64 mmHg · SpO₂ 97% · RR 20 brpm · GCS 14/15',
    treatment: 'O₂ Therapy: 15L/min NRM\nIV Access: 18G right AC\nIV Fluids: 500ml Hartmann\'s running\nPelvic Binder: SAM Sling II applied',
    generatedAt: T(12),
    confirmedBy: 'Para. J. Chen',
    confirmedAt: T(11),
    isEdited: false,
  },

  destinationHospitalId: 'hosp-001',
  eta: 4,

  alertStatus: 'acknowledged',
  alertSentAt: T(12),
  alertAcknowledgedAt: T(10),
  alertAcknowledgedBy: 'ED Charge Nurse — St. Bartholomew\'s MTC',

  bloodBankRequest: {
    id: 'blood-demo-001',
    status: 'preparing',
    requestedBy: 'Para. J. Chen',
    bloodGroup: 'Unknown',
    rhFactor: 'unknown',
    unitsRequested: 4,
    productType: 'o-negative',
    clinicalJustification: 'Haemodynamically unstable trauma. Suspected pelvic haemorrhage. Requesting O-negative as crossmatch not available.',
    recipient: 'St. Bartholomew\'s MTC Blood Bank',
    recipientContact: 'Blood Bank Hotline: 020 7377 7000 ext 4200',
    createdAt: T(11),
    updatedAt: T(4),
    sentAt: T(11),
    acknowledgedAt: T(9),
    prepStartedAt: T(4),
    isDemo: true,
  },

  hospitalPrep: [
    { id: 'prep-trauma-bay', label: 'Trauma Bay 2', status: 'ready', team: 'ED', updatedAt: T(8) },
    { id: 'prep-team', label: 'Trauma Team Activated', status: 'ready', team: 'Trauma', updatedAt: T(9) },
    { id: 'prep-ct', label: 'CT Scanner', status: 'ready', team: 'Radiology', updatedAt: T(5) },
    { id: 'prep-ortho', label: 'Orthopaedic Surgeon', status: 'in-progress', team: 'Ortho', updatedAt: T(3) },
    { id: 'prep-blood', label: 'Blood Products (MTP)', status: 'in-progress', team: 'Blood Bank', updatedAt: T(4) },
    { id: 'prep-theatre', label: 'Theatre on Standby', status: 'pending', team: 'Theatre', updatedAt: T(10) },
  ],

  events: [
    { id: 'ev-001', type: 'run-started', description: 'Unit Alpha-7 dispatched to RTC — M25 J18 northbound', timestamp: T(30), source: 'system', operator: 'LAS Control' },
    { id: 'ev-002', type: 'incident-recorded', description: 'Arrived on scene. Multi-vehicle RTC. 1 critical patient.', timestamp: T(25), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-003', type: 'patient-registered', description: 'Patient contact. Male ~38y. Identity unknown. GCS 13 on arrival.', timestamp: T(24), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-004', type: 'vitals-recorded', description: 'Initial vitals: HR 124, SBP 88, SpO₂ 94%, GCS 13', timestamp: T(22), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-005', type: 'injury-added', description: 'Head injury recorded — blunt, moderate', timestamp: T(22), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-006', type: 'injury-added', description: 'Left chest injury recorded — blunt, moderate', timestamp: T(21), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-007', type: 'injury-added', description: 'Pelvic fracture recorded — severe', timestamp: T(20), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-008', type: 'treatment-added', description: 'O₂ 15L/min NRM started', timestamp: T(21), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-009', type: 'treatment-added', description: '18G IV access right AC. 500ml Hartmann\'s running.', timestamp: T(19), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-010', type: 'treatment-added', description: 'Pelvic binder (SAM II) applied', timestamp: T(17), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-011', type: 'vitals-recorded', description: 'Vitals: HR 118, SBP 94, SpO₂ 96%, GCS 13', timestamp: T(14), source: 'ambulance', operator: 'Lifepak 15 (auto)' },
    { id: 'ev-012', type: 'mist-generated', description: 'MIST summary generated and confirmed', timestamp: T(12), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-013', type: 'prealert-sent', description: 'Pre-alert transmitted to St. Bartholomew\'s MTC', timestamp: T(12), source: 'system', operator: 'TraumaBridge AI' },
    { id: 'ev-014', type: 'blood-request-sent', description: 'Blood bank request: O-negative ×4 units. Haemodynamically unstable.', timestamp: T(11), source: 'ambulance', operator: 'Para. J. Chen' },
    { id: 'ev-015', type: 'prealert-acknowledged', description: 'Pre-alert acknowledged. Trauma Bay 2 assigned.', timestamp: T(10), source: 'hospital', operator: 'ED Charge Nurse' },
    { id: 'ev-016', type: 'blood-acknowledged', description: 'Blood bank request acknowledged. Preparing O-neg ×4.', timestamp: T(9), source: 'hospital', operator: 'Blood Bank' },
    { id: 'ev-017', type: 'vitals-recorded', description: 'Vitals: HR 112, SBP 98, SpO₂ 97%, GCS 14', timestamp: T(5), source: 'ambulance', operator: 'Lifepak 15 (auto)' },
    { id: 'ev-018', type: 'blood-preparing', description: 'Blood products being prepared — ETA 5 min', timestamp: T(4), source: 'hospital', operator: 'Blood Bank' },
    { id: 'ev-019', type: 'hospital-prep-updated', description: 'CT Scanner confirmed ready', timestamp: T(5), source: 'hospital', operator: 'Radiology' },
    { id: 'ev-020', type: 'departure', description: 'Departed scene. ETA St. Bartholomew\'s 4 minutes.', timestamp: T(9), source: 'ambulance', operator: 'Para. J. Chen' },
  ],

  isOffline: false,
  pendingSync: false,
}

export const DEMO_HOSPITAL = {
  id: 'hosp-001',
  name: 'St. Bartholomew\'s Major Trauma Centre',
  shortName: 'St. Bartholomew\'s MTC',
  type: 'MTC' as const,
  address: 'West Smithfield, London EC1A 7BE',
  phone: '020 7377 7000',
}

export const AVAILABLE_HOSPITALS = [
  DEMO_HOSPITAL,
  { id: 'hosp-002', name: 'King\'s College Hospital NHS', shortName: 'King\'s College', type: 'MTC' as const, address: 'Denmark Hill, London SE5 9RS', phone: '020 3299 9000' },
  { id: 'hosp-003', name: 'Royal London Hospital', shortName: 'Royal London', type: 'MTC' as const, address: 'Whitechapel Rd, London E1 1BB', phone: '020 7377 7000' },
]

// Second incoming case for hospital view
export const DEMO_SECONDARY_CASE: EmergencyRun = {
  id: 'demo-run-002',
  callsign: 'Bravo 3',
  crewLead: 'Para. A. Williams',
  status: 'on-scene',
  syncStatus: 'sent',
  currentStep: 'vitals',
  createdAt: T(8),
  updatedAt: T(2),
  isDemo: true,
  patient: {
    id: 'demo-pt-002',
    identityStatus: 'known',
    name: 'Sarah Mitchell',
    estimatedAge: 52,
    sex: 'female',
    allergies: [],
  },
  incident: {
    mechanism: 'Fall from Height',
    mechanismCode: 'fall->2m',
    detail: 'Fall from approx. 4 metres from scaffolding. Witnessed.',
    location: '14 Merchant Street, E2',
    time: T(7),
  },
  injuries: [
    { id: 'inj-002-001', region: 'right-lower-leg', laterality: 'right', type: 'fracture', severity: 'moderate', notes: 'Obvious deformity right tibia/fibula.', timestamp: T(4), assessedBy: 'Para. A. Williams' },
    { id: 'inj-002-002', region: 'upper-back', laterality: 'na', type: 'blunt', severity: 'moderate', notes: 'Midline tenderness T5-T8.', timestamp: T(4), assessedBy: 'Para. A. Williams' },
  ],
  vitalObservations: [
    { id: 'obs-002-001', timestamp: T(4), source: 'manual', assessedBy: 'Para. A. Williams', hr: { value: 96, unit: 'bpm' }, sbp: { value: 122, unit: 'mmHg' }, dbp: { value: 78, unit: 'mmHg' }, spo2: { value: 98, unit: '%' }, rr: { value: 18, unit: 'brpm' }, gcs: { total: 15, components: { eye: 4, verbal: 5, motor: 6 } } },
  ],
  treatments: [
    { id: 'tx-002-001', category: 'splinting', description: 'Traction Splint', detail: 'Thomas splint applied right lower leg.', timestamp: T(3), performedBy: 'Para. A. Williams' },
    { id: 'tx-002-002', category: 'analgesia', description: 'Analgesia', detail: 'Entonox administered.', timestamp: T(3), performedBy: 'Para. A. Williams' },
  ],
  destinationHospitalId: 'hosp-001',
  eta: 11,
  alertStatus: 'sent',
  alertSentAt: T(3),
  hospitalPrep: [
    { id: 'prep-trauma-bay', label: 'Trauma Bay 3', status: 'pending', team: 'ED', updatedAt: T(3) },
    { id: 'prep-team', label: 'Trauma Team', status: 'pending', team: 'Trauma', updatedAt: T(3) },
    { id: 'prep-ct', label: 'CT Scanner', status: 'pending', team: 'Radiology', updatedAt: T(3) },
    { id: 'prep-ortho', label: 'Orthopaedic Surgeon', status: 'pending', team: 'Ortho', updatedAt: T(3) },
    { id: 'prep-blood', label: 'Blood Products', status: 'pending', team: 'Blood Bank', updatedAt: T(3) },
    { id: 'prep-theatre', label: 'Theatre on Standby', status: 'pending', team: 'Theatre', updatedAt: T(3) },
  ],
  events: [
    { id: 'ev-b-001', type: 'run-started', description: 'Unit Bravo-3 dispatched to fall from height — Merchant St E2', timestamp: T(8), source: 'system' },
    { id: 'ev-b-002', type: 'patient-registered', description: 'Patient: Sarah Mitchell, 52y, Female. Identity confirmed by driving licence.', timestamp: T(5), source: 'ambulance', operator: 'Para. A. Williams' },
    { id: 'ev-b-003', type: 'vitals-recorded', description: 'Vitals: HR 96, SBP 122, SpO₂ 98%, GCS 15', timestamp: T(4), source: 'ambulance', operator: 'Para. A. Williams' },
    { id: 'ev-b-004', type: 'prealert-sent', description: 'Pre-alert sent to St. Bartholomew\'s MTC', timestamp: T(3), source: 'system' },
  ],
  isOffline: false,
  pendingSync: false,
}
