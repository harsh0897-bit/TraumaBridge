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
  PrimarySurvey,
} from '@/types/run'
import { DEMO_RUN, AVAILABLE_HOSPITALS } from '@/data/demoRun'
import { buildMist, latestVitals, shockIndex } from '@/lib/clinical'

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
  updateRunMeta: (patch: Partial<Pick<EmergencyRun, 'eta' | 'destinationHospitalId' | 'crewLead' | 'callsign'>>) => void
  setCrewNotes: (text: string) => void

  // Actions — Patient & Documents
  updatePatient: (patch: Partial<EmergencyRun['patient']>) => void
  addFoundDocument: (doc: IdentityDocument) => void

  // Actions — Incident
  updateIncident: (patch: Partial<EmergencyRun['incident']>) => void

  // Actions — Primary survey (ABCDE)
  updatePrimarySurvey: (patch: Partial<PrimarySurvey>) => void

  // Actions — Injuries & Evidence
  addInjury: (injury: InjuryRecord) => void
  removeInjury: (id: string) => void
  updateInjury: (id: string, patch: Partial<InjuryRecord>) => void
  addInjuryPhoto: (photo: InjuryPhoto) => void

  // Actions — Vitals
  addVitalObservation: (obs: VitalObservation) => void

  // Actions — Treatments
  addTreatment: (t: TreatmentEntry) => void
  updateTreatment: (id: string, patch: Partial<TreatmentEntry>) => void
  removeTreatment: (id: string) => void

  // Actions — MIST
  generateMIST: () => void
  updateMIST: (patch: Partial<MISTSummary>) => void
  confirmMIST: (confirmedBy: string) => void

  // Actions — Alert
  sendPreAlert: () => void
  /** Signs the MIST as the crew lead, raises the blood request if flagged, then sends the pre-alert */
  transmitPreAlert: (opts?: { bloodUnits?: number }) => void
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
  hydrateNightMode: () => void
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

/**
 * Append an event, but collapse rapid repeats of the same kind (e.g. tapping
 * through steppers or chips) into a single trail entry.
 */
function pushEvent(events: RunEvent[], ev: RunEvent): RunEvent[] {
  const last = events[events.length - 1]
  if (
    last &&
    last.type === ev.type &&
    last.source === ev.source &&
    Date.now() - new Date(last.timestamp).getTime() < 20_000
  ) {
    return [...events.slice(0, -1), { ...ev, id: last.id }]
  }
  return [...events, ev]
}

const NIGHT_KEY = 'tb-night-mode'

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

  updateRunMeta: (patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = { ...s.activeRun, ...patch, updatedAt: now() }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  setCrewNotes: (text) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = { ...s.activeRun, crewNotes: text, updatedAt: now() }
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
        events: pushEvent(s.activeRun.events, makeEvent('patient-updated', 'Patient details updated')),
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
      const incident = { ...s.activeRun.incident, ...patch }
      const run: EmergencyRun = {
        ...s.activeRun,
        incident,
        updatedAt: now(),
        events: pushEvent(
          s.activeRun.events,
          makeEvent('incident-recorded', `Incident: ${incident.mechanism ?? incident.mechanismCode ?? 'updated'}`)
        ),
      }
      broadcastUpdate(run)
      return { activeRun: run }
    }),

  // ── Primary survey (ABCDE) ────────────────────────────────────────────────

  updatePrimarySurvey: (patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        primarySurvey: { ...s.activeRun.primarySurvey, ...patch, updatedAt: now() },
        updatedAt: now(),
        events: pushEvent(s.activeRun.events, makeEvent('note', 'Primary survey (ABCDE) updated')),
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

  updateTreatment: (id, patch) =>
    set((s) => {
      if (!s.activeRun) return s
      const run: EmergencyRun = {
        ...s.activeRun,
        treatments: s.activeRun.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        updatedAt: now(),
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
      const built = buildMist(run)
      const fields = {
        mechanism: built.mechanism,
        injuries: built.injuries,
        signs: built.signs,
        treatment: built.treatment,
      }
      const mist: MISTSummary = {
        ...fields,
        original: fields,
        shockIndex: built.shockIndex,
        rts: built.rts,
        trts: built.trts,
        generatedAt: now(),
        isEdited: false,
      }
      const updated: EmergencyRun = {
        ...run,
        mist,
        updatedAt: now(),
        events: pushEvent(run.events, makeEvent('mist-generated', 'MIST summary generated')),
      }
      broadcastUpdate(updated)
      return { activeRun: updated }
    }),

  updateMIST: (patch) =>
    set((s) => {
      if (!s.activeRun?.mist) return s
      const merged = { ...s.activeRun.mist, ...patch }
      const o = merged.original
      // Edited = any block differs from the auto-generated snapshot
      merged.isEdited = o
        ? merged.mechanism !== o.mechanism ||
          merged.injuries !== o.injuries ||
          merged.signs !== o.signs ||
          merged.treatment !== o.treatment
        : true
      const run: EmergencyRun = { ...s.activeRun, mist: merged, updatedAt: now() }
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

  transmitPreAlert: (opts) => {
    const first = get().activeRun
    if (!first) return
    // Always transmit a MIST that reflects the latest data unless the crew edited it
    if (!first.mist || !first.mist.isEdited) get().generateMIST()
    get().confirmMIST(first.crewLead)

    const r = get().activeRun!
    if (r.bloodBankRequired === 'yes' && !r.bloodBankRequest) {
      const v = latestVitals(r.vitalObservations)
      const si = shockIndex(v.hr, v.sbp)
      const hospital = AVAILABLE_HOSPITALS.find((h) => h.id === r.destinationHospitalId)
      get().createBloodRequest({
        requestedBy: r.crewLead,
        bloodGroup: 'Unknown',
        rhFactor: 'unknown',
        productType: 'o-negative',
        unitsRequested: opts?.bloodUnits ?? 4,
        clinicalJustification: si !== null
          ? `Suspected haemorrhage. Shock Index ${si.toFixed(2)}${v.sbp ? `, SBP ${v.sbp} mmHg` : ''}. Crossmatch not available.`
          : 'Crew anticipate blood products on arrival. Crossmatch not available.',
        recipient: hospital?.name ?? 'MTC Blood Bank',
      })
    }
    get().setRunStatus('transporting')
    get().sendPreAlert()
  },

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

  setNightMode: (v) => {
    set({ nightMode: v })
    try {
      localStorage.setItem(NIGHT_KEY, v ? '1' : '0')
    } catch {
      /* storage unavailable — preference just won't persist */
    }
  },
  hydrateNightMode: () => {
    try {
      const saved = localStorage.getItem(NIGHT_KEY)
      if (saved !== null) set({ nightMode: saved === '1' })
    } catch {
      /* ignore */
    }
  },
  toggleVoiceSim: () => set((s) => ({ voiceSimActive: !s.voiceSimActive })),
}))

// ─── BroadcastChannel sync ────────────────────────────────────────────────────

function broadcastUpdate(run: EmergencyRun) {
  getChannel()?.postMessage({ type: 'update', run })
}

/**
 * Subscribe to cross-tab updates. Returns a cleanup function so React
 * Strict-Mode double mounts / unmounts never leave a stale listener behind.
 */
export function initRunSync(): () => void {
  if (typeof window === 'undefined') return () => {}
  const ch = getChannel()
  if (!ch) return () => {}
  const handler = (ev: MessageEvent) => {
    if (ev.data?.type === 'update') {
      useRunStore.setState({ activeRun: ev.data.run })
    } else if (ev.data?.type === 'clear') {
      useRunStore.setState({ activeRun: null })
    }
  }
  ch.addEventListener('message', handler)
  return () => ch.removeEventListener('message', handler)
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
