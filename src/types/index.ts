/**
 * TRAUMABRIDGE AI — Core Type Definitions
 * All types for the pre-hospital emergency handover platform
 */

// ─── Patient ─────────────────────────────────────────────────────────────────

export type PatientSex = 'male' | 'female' | 'unknown'
export type PatientIdentity = 'known' | 'unknown'

export interface Patient {
  id: string
  identity: PatientIdentity
  name?: string              // If known
  dob?: string               // ISO date string, if known
  age?: number               // Estimated if unknown
  sex: PatientSex
  nhs_number?: string
  allergies?: string[]
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

export type VitalStatus = 'normal' | 'warning' | 'critical' | 'unknown'

export interface VitalReading {
  value: number | string
  unit: string
  timestamp: string   // ISO string
  status: VitalStatus
  source: 'manual' | 'sensor' | 'monitor'
}

export interface Vitals {
  hr?:      VitalReading   // Heart rate (bpm)
  spo2?:    VitalReading   // O2 saturation (%)
  rr?:      VitalReading   // Respiratory rate (breaths/min)
  sbp?:     VitalReading   // Systolic BP (mmHg)
  dbp?:     VitalReading   // Diastolic BP (mmHg)
  gcs?:     VitalReading   // Glasgow Coma Scale (3–15)
  temp?:    VitalReading   // Temperature (°C)
  etco2?:   VitalReading   // End-tidal CO2 (mmHg)
}

// ─── Injury Map ──────────────────────────────────────────────────────────────

export type BodyRegion =
  | 'head'
  | 'neck'
  | 'chest-left'
  | 'chest-right'
  | 'abdomen'
  | 'pelvis'
  | 'left-shoulder'
  | 'right-shoulder'
  | 'left-arm'
  | 'right-arm'
  | 'left-forearm'
  | 'right-forearm'
  | 'left-hand'
  | 'right-hand'
  | 'left-thigh'
  | 'right-thigh'
  | 'left-knee'
  | 'right-knee'
  | 'left-lower-leg'
  | 'right-lower-leg'
  | 'left-foot'
  | 'right-foot'
  | 'upper-back'
  | 'lower-back'
  | 'sacrum'

export type InjuryType =
  | 'laceration'
  | 'contusion'
  | 'fracture'
  | 'penetrating'
  | 'burn'
  | 'crush'
  | 'amputation'
  | 'dislocation'
  | 'abrasion'
  | 'impalement'
  | 'haematoma'

export interface Injury {
  id: string
  region: BodyRegion
  type: InjuryType
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  notes?: string
  timestamp: string
}

// ─── MIST Handover ───────────────────────────────────────────────────────────

export type MechanismType =
  | 'rta-driver'
  | 'rta-passenger'
  | 'rta-pedestrian'
  | 'rta-cyclist'
  | 'rta-motorcyclist'
  | 'fall-<2m'
  | 'fall->2m'
  | 'cardiac-arrest'
  | 'stab'
  | 'gunshot'
  | 'assault'
  | 'crush'
  | 'burn'
  | 'drowning'
  | 'medical'
  | 'other'

export interface MISTHandover {
  mechanism: MechanismType
  mechanismDetail?: string
  injuries: Injury[]
  signs: Vitals
  treatment: TreatmentRecord[]
}

export interface TreatmentRecord {
  id: string
  type: string
  detail: string
  timestamp: string
  clinician?: string
}

// ─── Pre-Alert / Mission ──────────────────────────────────────────────────────

export type MissionStatus =
  | 'dispatch'
  | 'en-route-scene'
  | 'on-scene'
  | 'transporting'
  | 'arrived'
  | 'completed'

export type AlertStatus =
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'preparing'
  | 'ready'

export interface Mission {
  id: string
  callsign: string
  status: MissionStatus
  dispatchTime: string   // ISO
  sceneTime?: string
  departureTime?: string
  eta?: number           // minutes remaining
  destination: Hospital
  patient: Patient
  mist: Partial<MISTHandover>
  alertStatus: AlertStatus
  events: MissionEvent[]
  crewLead: string
}

export interface MissionEvent {
  id: string
  type: 'dispatch' | 'scene-arrival' | 'patient-contact' | 'vital-recorded' | 'treatment' | 'alert-sent' | 'alert-acked' | 'departure' | 'arrival' | 'note'
  description: string
  timestamp: string
  operator?: string
  metadata?: Record<string, string | number | boolean>
}

// ─── Hospital / Receiving ED ─────────────────────────────────────────────────

export interface Hospital {
  id: string
  name: string
  type: 'MTC' | 'TU' | 'ED' | 'specialist'  // Major Trauma Centre, Trauma Unit, etc.
  address: string
  phone: string
}

export type PreparationItem = {
  id: string
  label: string
  status: 'pending' | 'in-progress' | 'ready' | 'unavailable'
  team?: string
  updatedAt: string
}

// ─── Blood Bank ──────────────────────────────────────────────────────────────

export type BloodAlertStatus =
  | 'created'
  | 'dispatched'
  | 'acknowledged'
  | 'info-requested'
  | 'info-received'
  | 'preparing'
  | 'ready'

export interface BloodAlert {
  id: string
  missionId: string
  status: BloodAlertStatus
  bloodGroup?: string
  unitsRequested?: number
  recipient: string
  createdAt: string
  updatedAt: string
  isDemo: true  // Always true — this is a demonstration system
}
