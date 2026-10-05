/**
 * TRAUMABRIDGE AI — Phase 2 Enhanced Type Definitions
 * Extends Phase 1 types with full emergency run data model
 */

// ─── Re-export all Phase 1 types ─────────────────────────────────────────────
export type { PatientSex, PatientIdentity, VitalStatus, VitalReading, Vitals } from './index'
export type { BodyRegion, InjuryType, Injury, MechanismType, MISTHandover } from './index'
export type { TreatmentRecord, MissionStatus, MissionEvent } from './index'
export type { Hospital, PreparationItem, BloodAlertStatus, BloodAlert } from './index'
export type { Patient, Mission } from './index'

// ─── Enhanced Run State ───────────────────────────────────────────────────────

export type WizardStep =
  | 'start'
  | 'patient'
  | 'incident'
  | 'survey'
  | 'injuries'
  | 'vitals'
  | 'treatments'
  | 'mist'
  | 'handover'
  | 'review'

export type RunSyncStatus =
  | 'local-only'
  | 'pending'
  | 'sent'
  | 'acknowledged'
  | 'failed'
  | 'offline-queued'

// GCS sub-scores
export interface GCSComponent {
  eye: 1 | 2 | 3 | 4 | null
  verbal: 1 | 2 | 3 | 4 | 5 | null
  motor: 1 | 2 | 3 | 4 | 5 | 6 | null
}

export interface VitalObservation {
  id: string
  timestamp: string
  source: 'manual' | 'monitor' | 'simulated'
  assessedBy?: string
  hr?: { value: number; unit: 'bpm' }
  sbp?: { value: number; unit: 'mmHg' }
  dbp?: { value: number; unit: 'mmHg' }
  spo2?: { value: number; unit: '%' }
  rr?: { value: number; unit: 'brpm' }
  temp?: { value: number; unit: '°C' }
  etco2?: { value: number; unit: 'mmHg' }
  gcs?: { total: number; components: GCSComponent }
  painScore?: { value: number; scale: '0-10' }
}

export interface IdentityDocument {
  id: string
  type: 'aadhaar' | 'driving-licence' | 'hospital-card' | 'prescription' | 'national-id' | 'other'
  title: string
  photoUrl: string
  extractedText?: string
  confirmedByStaff: boolean
  timestamp: string
  source: string
}

export interface InjuryPhoto {
  id: string
  regionId?: string
  regionName?: string
  photoUrl: string
  caption?: string
  timestamp: string
  source: string
}

export interface InjuryRecord {
  id: string
  region: string  // BodyRegion
  laterality: 'left' | 'right' | 'bilateral' | 'na'
  type: InjuryClassification
  specificFinding?: string
  severity: 'mild' | 'minor' | 'moderate' | 'severe' | 'critical' | 'unknown'
  notes?: string
  photoUrl?: string
  photoSource?: string
  timestamp: string
  assessedBy?: string
}

export type InjuryClassification =
  | 'blunt'
  | 'penetrating'
  | 'fracture'
  | 'burn'
  | 'laceration'
  | 'crush'
  | 'amputation'
  | 'haemorrhage'
  | 'other'
  | 'unassessed'

export interface TreatmentEntry {
  id: string
  category: TreatmentCategory
  /** Catalogue key from the Interventions step (absent on legacy / demo entries) */
  key?: string
  description: string
  detail?: string
  timestamp: string
  performedBy?: string
  considered?: boolean  // Considered but not performed
  /** Medication capture */
  drug?: string
  dose?: { value: number; unit: string }
  route?: string
}

export type TreatmentCategory =
  | 'oxygen'
  | 'iv-access'
  | 'fluids'
  | 'haemorrhage-control'
  | 'splinting'
  | 'airway'
  | 'cpr'
  | 'analgesia'
  | 'packaging'
  | 'tourniquet'
  | 'needle-decompression'
  | 'chest-seal'
  | 'txa'
  | 'medication'
  | 'other'

// ─── Primary Survey (ABCDE) ──────────────────────────────────────────────────

export type AvpuLevel = 'A' | 'V' | 'P' | 'U'

export interface PrimarySurvey {
  // A — Airway
  airway?: 'patent' | 'compromised' | 'obstructed'
  airwayAdjuncts?: string[]
  // B — Breathing
  chestRise?: 'symmetrical' | 'asym-left' | 'asym-right'
  breathSounds?: 'normal' | 'reduced-left' | 'reduced-right' | 'absent' | 'added'
  breathingFlags?: string[]   // tension-ptx | open-chest | flail
  // C — Circulation
  pulse?: 'present' | 'weak' | 'absent'
  haemorrhage?: 'none' | 'controlled' | 'uncontrolled' | 'internal'
  // D — Disability
  avpu?: AvpuLevel
  pupils?: 'equal-reactive' | 'unequal' | 'fixed-dilated' | 'not-assessed'
  limbMovement?: 'all-four' | 'arms-only' | 'legs-only' | 'none'
  // E — Exposure
  exposureFindings?: string[] // none | bleeding | burns | hypothermia | deformity
  environment?: string[]      // indoor | outdoor | hot | cold | wet
  updatedAt?: string
}

export interface MISTSummary {
  mechanism: string
  mechanismDetail?: string
  injuries: string  // Free-text composite from InjuryRecord[]
  signs: string     // Free-text composite from VitalObservation[]
  treatment: string // Free-text composite from TreatmentEntry[]
  /** Auto-generated snapshot, used to show which blocks the crew edited */
  original?: { mechanism: string; injuries: string; signs: string; treatment: string }
  /** Computed at generation time */
  shockIndex?: number
  rts?: number   // weighted RTS (0–7.84)
  trts?: number  // triage RTS (0–12)
  generatedAt: string
  confirmedBy?: string
  confirmedAt?: string
  isEdited: boolean
  editedText?: {
    mechanism?: string
    injuries?: string
    signs?: string
    treatment?: string
  }
}

export interface BloodBankRequest {
  id: string
  status: BloodBankStatus
  requestedBy?: string
  bloodGroup?: string
  rhFactor?: 'positive' | 'negative' | 'unknown'
  unitsRequested?: number
  productType?: BloodProductType
  clinicalJustification?: string
  recipient: string
  recipientContact?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  acknowledgedAt?: string
  infoRequestedAt?: string
  infoRequestText?: string
  infoReceivedAt?: string
  infoResponseText?: string
  prepStartedAt?: string
  completedAt?: string
  cancelledAt?: string
  isDemo: true
}

export type BloodBankStatus =
  | 'not-requested'
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'info-requested'
  | 'info-received'
  | 'preparing'
  | 'ready'
  | 'cancelled'

export type BloodProductType =
  | 'packed-red-cells'
  | 'fresh-frozen-plasma'
  | 'platelets'
  | 'cryoprecipitate'
  | 'whole-blood'
  | 'o-negative'
  | 'mtp-pack'

export interface RunEvent {
  id: string
  type: RunEventType
  description: string
  timestamp: string
  source: 'ambulance' | 'hospital' | 'system' | 'demo'
  operator?: string
  metadata?: Record<string, string | number | boolean>
}

export type RunEventType =
  | 'run-started'
  | 'run-resumed'
  | 'patient-registered'
  | 'patient-updated'
  | 'incident-recorded'
  | 'injury-added'
  | 'injury-removed'
  | 'vitals-recorded'
  | 'treatment-added'
  | 'mist-generated'
  | 'mist-confirmed'
  | 'prealert-sent'
  | 'prealert-acknowledged'
  | 'blood-request-sent'
  | 'blood-acknowledged'
  | 'blood-info-requested'
  | 'blood-info-received'
  | 'blood-preparing'
  | 'blood-ready'
  | 'hospital-prep-updated'
  | 'departure'
  | 'arrival'
  | 'note'

export interface HospitalPrep {
  id: string
  label: string
  status: 'pending' | 'in-progress' | 'ready' | 'unavailable'
  team?: string
  updatedAt: string
  updatedBy?: string
}

export interface EmergencyRun {
  // Run metadata
  id: string
  callsign: string
  crewLead: string
  crewMembers?: string[]
  status: RunStatus
  syncStatus: RunSyncStatus
  currentStep: WizardStep
  createdAt: string
  updatedAt: string
  isDemo: boolean

  // Patient
  patient: {
    id: string
    identityStatus: 'known' | 'unknown' | 'cannot-respond' | 'pending'
    name?: string
    dob?: string
    estimatedAge?: number
    sex?: 'male' | 'female' | 'unknown'
    allergyStatus?: 'none' | 'present' | 'unknown'
    allergies?: string[]
    abhaId?: string
    emergencyNotes?: string
    foundDocuments?: IdentityDocument[]
  }

  // Incident
  incident: {
    mechanism?: string
    mechanismCode?: string
    detail?: string
    location?: string
    time?: string
    casualties?: '1' | '2-4' | '5+' | 'mci'
    entrapment?: 'no' | 'lt30' | '30-60' | 'gt60'
    flags?: string[]   // high-energy | spinal | burns | hazmat | arrest
  }

  // Primary survey (ABCDE)
  primarySurvey?: PrimarySurvey

  // Free crew note appended to the handover
  crewNotes?: string

  // Clinical data
  injuries: InjuryRecord[]
  injuryPhotos?: InjuryPhoto[]
  vitalObservations: VitalObservation[]
  treatments: TreatmentEntry[]
  mist?: MISTSummary

  // Destination
  destinationHospitalId: string
  eta?: number

  // Alert
  alertStatus: AlertStatus
  alertSentAt?: string
  alertAcknowledgedAt?: string
  alertAcknowledgedBy?: string

  // Blood bank
  bloodBankRequired?: 'yes' | 'no' | 'unknown'
  bloodBankRequest?: BloodBankRequest

  // Hospital
  hospitalPrep: HospitalPrep[]

  // Events
  events: RunEvent[]

  // Connectivity
  isOffline: boolean
  pendingSync: boolean
}

export type RunStatus =
  | 'draft'
  | 'dispatch'
  | 'en-route-scene'
  | 'on-scene'
  | 'transporting'
  | 'arrived'
  | 'completed'

export type AlertStatus =
  | 'not-sent'
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'preparing'
  | 'ready'
