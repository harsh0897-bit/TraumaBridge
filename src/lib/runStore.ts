/**
 * TRAUMABRIDGE AI — Emergency Run State Store
 * Zustand store with BroadcastChannel for cross-tab sync
 *
 * DEMO ONLY — not connected to any real clinical system.
 * Data is stored in sessionStorage and broadcast via BroadcastChannel.
 */

'use client'

import { create } from 'zustand'
import type {
  EmergencyRun,
  InjuryRecord,
  VitalObservation,
  TreatmentEntry,
  MISTSummary,
  BloodBankRequest,
  HospitalPrep,
  RunEvent,
  RunEventType,
  WizardStep,
  BloodBankStatus,
  IdentityDocument,
  InjuryPhoto,
} from '@/types/run'
import { DEMO_RUN } from '@/data/demoRun'

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface RunStore {
  // Active run
  activeRun: EmergencyRun | null
  nightMode: boolean
  voiceSimActive: boolean

  // Actions — Run lifecycle
  startNewRun: (callsign: string, crewLead: string, destinationId: string) => void
  loadDemoRun: (startAtStep1?: boolean) => void
  clearRun: () => void
  setStep: (step: WizardStep) => void
  setRunStatus: (status: EmergencyRun['status']) => void

  // Actions — Patient & Documents
  updatePatient: (patch: Partial<EmergencyRun['patient']>) => void
  addFoundDocument: (doc: IdentityDocument) => void

  // Actions — Incident
  updateIncident: (patch: Partial<EmergencyRun['incident']>) => void

  // Actions — Injuries & Evidence
  addInjury: (injury: InjuryRecord) => void
  removeInjury: (id: string) => void
  updateInjury: (id: string, patch: Partial<InjuryRecord>) => void
  addInjuryPhoto: (photo: InjuryPhoto) => void

  // Actions — Vitals
  addVitalObservation: (obs: VitalObservation) => void

  // Actions — Treatments
  addTreatment: (t: TreatmentEntry) => void
  removeTreatment: (id: string) => void

  // Actions — MIST
  generateMIST: () => void
  updateMIST: (patch: Partial<MISTSummary>) => void
  confirmMIST: (confirmedBy: string) => void

  // Actions — Alert
  sendPreAlert: () => void
  acknowledgeAlert: (acknowledgedBy: string) => void

  // Actions — Blood Bank
  setBloodBankRequired: (val: 'yes' | 'no' | 'unknown') => void
  createBloodRequest: (req: Omit<BloodBankRequest, 'id' | 'createdAt' | 'updatedAt' | 'isDemo' | 'status'>) => void
  updateBloodStatus: (status: BloodBankStatus, meta?: Partial<BloodBankRequest>) => void

  // Actions — Hospital Prep
  updateHospitalPrep: (id: string, status: HospitalPrep['status'], updatedBy?: string) => void

  // Actions — Events
  addEvent: (type: RunEventType, description: string, metadata?: Record<string, string | number | boolean>) => void

  // UI
  setNightMode: (v: boolean) => void
  toggleVoiceSim: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

function makeEvent(
  type: RunEventType,
  description: string,
  source: RunEvent['source'] = 'ambulance',
  metadata?: Record<string, string | number | boolean>
): RunEvent {
  return { id: uid(), type, description, timestamp: now(), source, metadata }
}

// MIST text generators — deterministic, no AI inference
function generateMechanismText(run: EmergencyRun): string {
  const code = run.incident.mechanismCode ?? run.incident.mechanism ?? 'Unknown mechanism'
  const detail = run.incident.detail ? ` — ${run.incident.detail}` : ''
  return `${code}${detail}`
}

function generateInjuryText(injuries: InjuryRecord[]): string {
  if (injuries.length === 0) return 'No injuries recorded'
  return injuries
    .map((inj) => {
      const lat = inj.laterality !== 'na' ? `(${inj.laterality}) ` : ''
      return `${lat}${inj.region.replace(/-/g, ' ')} — ${inj.type} [${inj.severity}]${inj.notes ? `: ${inj.notes}` : ''}`
    })
    .join('\n')
}

function generateSignsText(obs: VitalObservation[]): string {
  if (obs.length === 0) return 'No vitals recorded'
  const latest = obs[obs.length - 1]
  const parts: string[] = []
  if (latest.hr) parts.push(`HR ${latest.hr.value} bpm`)
  if (latest.sbp && latest.dbp) parts.push(`BP ${latest.sbp.value}/${latest.dbp.value} mmHg`)
  else if (latest.sbp) parts.push(`SBP ${latest.sbp.value} mmHg`)
  if (latest.spo2) parts.push(`SpO₂ ${latest.spo2.value}%`)
  if (latest.rr) parts.push(`RR ${latest.rr.value} brpm`)
  if (latest.gcs) parts.push(`GCS ${latest.gcs.total}/15`)
  if (latest.temp) parts.push(`Temp ${latest.temp.value}°C`)
  return parts.length > 0 ? parts.join(' · ') : 'Vitals pending'
}

function generateTreatmentText(treatments: TreatmentEntry[]): string {
  if (treatments.length === 0) return 'No treatments recorded'
  return treatments
    .filter((t) => !t.considered)
    .map((t) => `${t.description}${t.detail ? `: ${t.detail}` : ''}`)
    .join('\n')
}

// BroadcastChannel for cross-tab (ambulance ↔ hospital) sync
let channel: BroadcastChannel | null = null
function getChannel() {
  if (typeof window === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel('traumabridge-run-sync')
  }
  return channel
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRunStore = create<RunStore>((set, get) => ({
  activeRun: null,
  nightMode: false,
  voiceSimActive: false,

  // ── Run lifecycle ─────────────────────────────────────────────────────────

  startNewRun: (callsign, crewLead, destinationId) => {
    const run: EmergencyRun = {
      id: uid(),
      callsign,
      crewLead,
      status: 'dispatch',
      syncStatus: 'local-only',
      currentStep: 'patient',
      createdAt: now(),
      updatedAt: now(),
      isDemo: false,
      patient: { id: uid(), identityStatus: 'unknown' },
      incident: {},
      injuries: [],
      vitalObservations: [],
      treatments: [],
      destinationHospitalId: destinationId,
      alertStatus: 'not-sent',
      hospitalPrep: defaultHospitalPrep(),
      events: [makeEvent('run-started', `Emergency run started — ${callsign}`, 'system')],
      isOffline: false,
      pendingSync: false,
    }
    set({ activeRun: run })
    broadcastUpdate(run)
  },

  loadDemoRun: (startAtStep1 = true) => {
    const run: EmergencyRun = {
      ...DEMO_RUN,
      currentStep: startAtStep1 ? 'patient' : DEMO_RUN.currentStep,
      updatedAt: now(),
    }
    set({ activeRun: run })
    broadcastUpdate(run)
  },

  clearRun: () => {
    set({ activeRun: null })
    getChannel()?.postMessage({ type: 'clear' })
  },

  setStep: (step) =>
    set((s) => {
      if (!s.activeRun) return s
      const run = { ...s.activeRun, currentStep: step, updatedAt: now() }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  setRunStatus: (status) =>
    set((s) => {
      if (!s.activeRun) return s
      const run = { ...s.activeRun, status, updatedAt: now() }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Patient ───────────────────────────────────────────────────────────────

  updatePatient: (patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        patient: { ...s.activeRun.patient, ...patch },
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('patient-updated', 'Patient details updated'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  addFoundDocument: (doc) =>
    set((s) => {
      if (!s.activeRun) return s
      const prevDocs = s.activeRun.patient.foundDocuments ?? []
      const run: EmergencyRun = {
        ...s.activeRun,
        patient: {
          ...s.activeRun.patient,
          foundDocuments: [...prevDocs, doc],
        },
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('patient-updated', `Found ID document attached: ${doc.title}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Incident ──────────────────────────────────────────────────────────────

  updateIncident: (patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        incident: { ...s.activeRun.incident, ...patch },
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('incident-recorded', `Incident: ${patch.mechanism ?? patch.mechanismCode ?? 'updated'}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Injuries ──────────────────────────────────────────────────────────────

  addInjury: (injury) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        injuries: [...s.activeRun.injuries, injury],
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('injury-added', `Injury recorded: ${injury.region} — ${injury.type}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  removeInjury: (id) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        injuries: s.activeRun.injuries.filter((i) => i.id !== id),
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('injury-removed', 'Injury record removed'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  updateInjury: (id, patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        injuries: s.activeRun.injuries.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        updatedAt: now(),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  addInjuryPhoto: (photo) =>
    set((s) => {
      if (!s.activeRun) return s
      const prevPhotos = s.activeRun.injuryPhotos ?? []
      const run: EmergencyRun = {
        ...s.activeRun,
        injuryPhotos: [...prevPhotos, photo],
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('injury-added', `Injury photo captured: ${photo.regionName ?? 'Clinical finding'}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Vitals ────────────────────────────────────────────────────────────────

  addVitalObservation: (obs) =>
    set((s) => {
      if (!s.activeRun) return s
      const parts: string[] = []
      if (obs.hr) parts.push(`HR ${obs.hr.value}`)
      if (obs.sbp) parts.push(`SBP ${obs.sbp.value}`)
      if (obs.spo2) parts.push(`SpO₂ ${obs.spo2.value}%`)
      if (obs.gcs) parts.push(`GCS ${obs.gcs.total}`)
      const run: EmergencyRun = {
        ...s.activeRun,
        vitalObservations: [...s.activeRun.vitalObservations, obs],
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('vitals-recorded', `Vitals: ${parts.join(', ')}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Treatments ────────────────────────────────────────────────────────────

  addTreatment: (t) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        treatments: [...s.activeRun.treatments, t],
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('treatment-added', `Treatment: ${t.description}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  removeTreatment: (id) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        treatments: s.activeRun.treatments.filter((t) => t.id !== id),
        updatedAt: now(),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── MIST ──────────────────────────────────────────────────────────────────

  generateMIST: () =>
    set((s) => {
      if (!s.activeRun) return s
      const run = s.activeRun
      const mist: MISTSummary = {
        mechanism: generateMechanismText(run),
        injuries: generateInjuryText(run.injuries),
        signs: generateSignsText(run.vitalObservations),
        treatment: generateTreatmentText(run.treatments),
        generatedAt: now(),
        isEdited: false,
      }
      const updated: EmergencyRun = {
        ...run,
        mist,
        updatedAt: now(),
        events: [...run.events, makeEvent('mist-generated', 'MIST summary generated')],
      }
      broadcastUpdate(updated)
      return { activeRun: updated }
    }),

  updateMIST: (patch) =>
    set((s) => {
      if (!s.activeRun?.mist) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        mist: { ...s.activeRun.mist, ...patch, isEdited: true },
        updatedAt: now(),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  confirmMIST: (confirmedBy) =>
    set((s) => {
      if (!s.activeRun?.mist) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        mist: { ...s.activeRun.mist, confirmedBy, confirmedAt: now() },
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('mist-confirmed', `MIST confirmed by ${confirmedBy}`),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Alert ─────────────────────────────────────────────────────────────────

  sendPreAlert: () =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        alertStatus: 'sent',
        alertSentAt: now(),
        syncStatus: 'sent',
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('prealert-sent', 'Pre-alert transmitted to receiving ED', 'system'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  acknowledgeAlert: (acknowledgedBy) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        alertStatus: 'acknowledged',
        alertAcknowledgedAt: now(),
        alertAcknowledgedBy: acknowledgedBy,
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('prealert-acknowledged', `Pre-alert acknowledged by ${acknowledgedBy}`, 'hospital'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Blood Bank ────────────────────────────────────────────────────────────

  setBloodBankRequired: (val) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        bloodBankRequired: val,
        updatedAt: now(),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  createBloodRequest: (req) =>
    set((s) => {
      if (!s.activeRun) return s
      const bloodBankRequest: BloodBankRequest = {
        ...req,
        id: uid(),
        status: 'sent',
        createdAt: now(),
        updatedAt: now(),
        sentAt: now(),
        isDemo: true,
      }
      const run: EmergencyRun = {
        ...s.activeRun,
        bloodBankRequest,
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('blood-request-sent', 'Blood bank request sent', 'ambulance'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  updateBloodStatus: (status, meta) =>
    set((s) => {
      if (!s.activeRun?.bloodBankRequest) return s
      const ts = now()
      const patches: Partial<BloodBankRequest> = { status, updatedAt: ts, ...meta }
      if (status === 'acknowledged') patches.acknowledgedAt = ts
      if (status === 'info-requested') patches.infoRequestedAt = ts
      if (status === 'info-received') patches.infoReceivedAt = ts
      if (status === 'preparing') patches.prepStartedAt = ts
      if (status === 'ready') patches.completedAt = ts
      const eventMap: Partial<Record<BloodBankStatus, RunEventType>> = {
        acknowledged: 'blood-acknowledged',
        'info-requested': 'blood-info-requested',
        'info-received': 'blood-info-received',
        preparing: 'blood-preparing',
        ready: 'blood-ready',
      }
      const evType = eventMap[status] ?? 'note'
      const run: EmergencyRun = {
        ...s.activeRun,
        bloodBankRequest: { ...s.activeRun.bloodBankRequest, ...patches },
        updatedAt: ts,
        events: [
          ...s.activeRun.events,
          makeEvent(evType, `Blood bank: ${status}`, 'hospital'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Hospital Prep ─────────────────────────────────────────────────────────

  updateHospitalPrep: (id, status, updatedBy) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        hospitalPrep: s.activeRun.hospitalPrep.map((p) =>
          p.id === id ? { ...p, status, updatedAt: now(), updatedBy } : p
        ),
        updatedAt: now(),
        events: [
          ...s.activeRun.events,
          makeEvent('hospital-prep-updated', `Preparation updated: ${id} → ${status}`, 'hospital'),
        ],
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Events ────────────────────────────────────────────────────────────────

  addEvent: (type, description, metadata) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        events: [...s.activeRun.events, makeEvent(type, description, 'system', metadata)],
        updatedAt: now(),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── UI ────────────────────────────────────────────────────────────────────

  setNightMode: (v) => set({ nightMode: v }),
  toggleVoiceSim: () => set((s) => ({ voiceSimActive: !s.voiceSimActive })),
}))

// ─── BroadcastChannel sync ────────────────────────────────────────────────────

function broadcastUpdate(run: EmergencyRun) {
  getChannel()?.postMessage({ type: 'update', run })
}

/** Call this once in a client component to subscribe to cross-tab updates */
export function initRunSync() {
  if (typeof window === 'undefined') return
  const ch = getChannel()
  if (!ch) return
  ch.onmessage = (ev) => {
    if (ev.data?.type === 'update') {
      useRunStore.setState({ activeRun: ev.data.run })
    } else if (ev.data?.type === 'clear') {
      useRunStore.setState({ activeRun: null })
    }
  }
}

// ─── Default hospital prep items ─────────────────────────────────────────────

function defaultHospitalPrep(): HospitalPrep[] {
  return [
    { id: 'prep-trauma-bay', label: 'Trauma Bay', status: 'pending', team: 'ED', updatedAt: now() },
    { id: 'prep-team', label: 'Trauma Team', status: 'pending', team: 'Trauma', updatedAt: now() },
    { id: 'prep-ct', label: 'CT Scanner', status: 'pending', team: 'Radiology', updatedAt: now() },
    { id: 'prep-ortho', label: 'Orthopaedic Surgeon', status: 'pending', team: 'Ortho', updatedAt: now() },
    { id: 'prep-blood', label: 'Blood Products', status: 'pending', team: 'Blood Bank', updatedAt: now() },
    { id: 'prep-theatre', label: 'Theatre on Standby', status: 'pending', team: 'Theatre', updatedAt: now() },
  ]
}
