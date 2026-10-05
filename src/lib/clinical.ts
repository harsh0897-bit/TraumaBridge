/**
 * TRAUMABRIDGE AI — Deterministic clinical helpers
 *
 * Everything here is a pure function over the EmergencyRun (no AI, no network).
 * DEMO ONLY — decision support wording is illustrative, not clinical guidance.
 */

import type { EmergencyRun, VitalObservation, PrimarySurvey } from '@/types/run'

// ─── Formatting ──────────────────────────────────────────────────────────────

export function fmtTime(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ─── Latest vitals (per-field most recent value) ─────────────────────────────

export interface LatestVitals {
  hr?: number
  sbp?: number
  dbp?: number
  spo2?: number
  rr?: number
  temp?: number
  gcs?: number
}

export function latestVitals(obs: VitalObservation[]): LatestVitals {
  const out: LatestVitals = {}
  for (const o of obs) {
    if (o.hr) out.hr = o.hr.value
    if (o.sbp) out.sbp = o.sbp.value
    if (o.dbp) out.dbp = o.dbp.value
    if (o.spo2) out.spo2 = o.spo2.value
    if (o.rr) out.rr = o.rr.value
    if (o.temp) out.temp = o.temp.value
    if (o.gcs) out.gcs = o.gcs.total
  }
  return out
}

// ─── Shock Index ─────────────────────────────────────────────────────────────

export type Tone = 'ok' | 'amber' | 'red' | 'none'

export function shockIndex(hr?: number, sbp?: number): number | null {
  if (!hr || !sbp) return null
  return Math.round((hr / sbp) * 100) / 100
}

export function shockIndexLabel(si: number | null): { label: string; tone: Tone } {
  if (si === null) return { label: 'Pending vitals', tone: 'none' }
  if (si >= 1.0) return { label: 'Shock suspected', tone: 'red' }
  if (si >= 0.7) return { label: 'Borderline', tone: 'amber' }
  return { label: 'Normal', tone: 'ok' }
}

// ─── Revised Trauma Score ────────────────────────────────────────────────────

const gcsCode = (g: number) => (g >= 13 ? 4 : g >= 9 ? 3 : g >= 6 ? 2 : g >= 4 ? 1 : 0)
const sbpCode = (s: number) => (s > 89 ? 4 : s >= 76 ? 3 : s >= 50 ? 2 : s >= 1 ? 1 : 0)
const rrCode = (r: number) => (r >= 10 && r <= 29 ? 4 : r > 29 ? 3 : r >= 6 ? 2 : r >= 1 ? 1 : 0)

export interface RtsResult {
  /** Weighted RTS (0–7.84): 0.9368·GCS + 0.7326·SBP + 0.2908·RR (coded) */
  rts: number
  /** Triage RTS (0–12): sum of the coded values */
  trts: number
  label: string
  tone: Tone
}

export function computeRts(v: LatestVitals): RtsResult | null {
  if (v.gcs === undefined || v.sbp === undefined || v.rr === undefined) return null
  const g = gcsCode(v.gcs)
  const s = sbpCode(v.sbp)
  const r = rrCode(v.rr)
  const rts = Math.round((0.9368 * g + 0.7326 * s + 0.2908 * r) * 100) / 100
  const trts = g + s + r
  const { label, tone } = trtsLabel(trts)
  return { rts, trts, label, tone }
}

export function trtsLabel(trts: number): { label: string; tone: Tone } {
  if (trts >= 12) return { label: 'Minor trauma', tone: 'ok' }
  if (trts === 11) return { label: 'Moderate trauma', tone: 'amber' }
  if (trts >= 8) return { label: 'Severe trauma', tone: 'red' }
  return { label: 'Critical trauma', tone: 'red' }
}

// ─── Vital colour coding ─────────────────────────────────────────────────────

export type VitalKind = 'hr' | 'sbp' | 'dbp' | 'spo2' | 'rr' | 'temp' | 'gcs'

export function vitalTone(kind: VitalKind, v?: number | null): Tone {
  if (v === undefined || v === null) return 'none'
  switch (kind) {
    case 'hr':
      return v > 130 || v < 40 ? 'red' : v > 100 || v < 50 ? 'amber' : 'ok'
    case 'sbp':
      return v < 90 ? 'red' : v < 100 || v > 180 ? 'amber' : 'ok'
    case 'dbp':
      return 'ok'
    case 'spo2':
      return v < 90 ? 'red' : v < 94 ? 'amber' : 'ok'
    case 'rr':
      return v < 8 || v > 29 ? 'red' : v < 12 || v > 20 ? 'amber' : 'ok'
    case 'temp':
      return v < 35 || v > 39 ? 'red' : v < 36 || v > 38 ? 'amber' : 'ok'
    case 'gcs':
      return v <= 8 ? 'red' : v <= 12 ? 'amber' : 'ok'
  }
}

// ─── Label maps (survey) ─────────────────────────────────────────────────────

export const SURVEY_LABELS = {
  airway: { patent: 'Patent & clear', compromised: 'Partially compromised', obstructed: 'Obstructed / secured' },
  chestRise: { symmetrical: 'Symmetrical', 'asym-left': 'Asymmetrical (L)', 'asym-right': 'Asymmetrical (R)' },
  breathSounds: {
    normal: 'Normal',
    'reduced-left': 'Reduced L',
    'reduced-right': 'Reduced R',
    absent: 'Absent',
    added: 'Added sounds',
  },
  pulse: { present: 'Present', weak: 'Weak / thready', absent: 'Absent' },
  haemorrhage: {
    none: 'No visible bleeding',
    controlled: 'Controlled',
    uncontrolled: 'Uncontrolled',
    internal: 'Internal suspected',
  },
  avpu: { A: 'Alert', V: 'Voice', P: 'Pain', U: 'Unresponsive' },
  pupils: {
    'equal-reactive': 'Equal & reactive',
    unequal: 'Unequal',
    'fixed-dilated': 'Fixed & dilated',
    'not-assessed': 'Not assessed',
  },
  limbMovement: { 'all-four': 'All 4 limbs', 'arms-only': 'Arms only', 'legs-only': 'Legs only', none: 'None' },
} as const

export const FLAG_LABELS: Record<string, string> = {
  'high-energy': 'High-energy mechanism',
  spinal: 'Suspected spinal injury',
  burns: 'Burns present',
  hazmat: 'Hazmat / chemicals',
  arrest: 'Cardiac arrest on scene',
}

export const CASUALTY_LABELS: Record<string, string> = {
  '1': '1 patient',
  '2-4': '2–4 patients',
  '5+': '5+ patients',
  mci: 'MASS CASUALTY (MCI declared)',
}

export const ENTRAPMENT_LABELS: Record<string, string> = {
  no: 'Not trapped',
  lt30: 'Trapped <30 min',
  '30-60': 'Trapped 30–60 min',
  gt60: 'Trapped >60 min',
}

// ─── Survey → text ───────────────────────────────────────────────────────────

/** Life-threatening findings from the ABCDE survey, as short phrases */
export function lifeThreats(s?: PrimarySurvey): string[] {
  if (!s) return []
  const out: string[] = []
  if (s.airway === 'obstructed') out.push('Airway obstructed / secured')
  if (s.airway === 'compromised') out.push('Airway compromised')
  if (s.breathingFlags?.includes('tension-ptx')) out.push('Tension pneumothorax suspected')
  if (s.breathingFlags?.includes('open-chest')) out.push('Open chest wound')
  if (s.breathingFlags?.includes('flail')) out.push('Flail segment')
  if (s.breathSounds === 'absent') out.push('Absent breath sounds')
  if (s.pulse === 'absent') out.push('No pulse')
  if (s.haemorrhage === 'uncontrolled') out.push('Uncontrolled haemorrhage')
  if (s.haemorrhage === 'internal') out.push('Internal bleeding suspected')
  if (s.pupils === 'fixed-dilated') out.push('Fixed dilated pupils')
  if (s.avpu === 'U') out.push('Unresponsive (AVPU U)')
  return out
}

function surveySigns(s?: PrimarySurvey): string {
  if (!s) return ''
  const parts: string[] = []
  if (s.avpu) parts.push(`AVPU ${s.avpu}`)
  if (s.airway) parts.push(`Airway ${SURVEY_LABELS.airway[s.airway].toLowerCase()}`)
  const b: string[] = []
  if (s.chestRise) b.push(`chest rise ${SURVEY_LABELS.chestRise[s.chestRise].toLowerCase()}`)
  if (s.breathSounds) b.push(`sounds ${SURVEY_LABELS.breathSounds[s.breathSounds].toLowerCase()}`)
  if (b.length) parts.push(`Breathing: ${b.join(', ')}`)
  const c: string[] = []
  if (s.pulse) c.push(`pulse ${SURVEY_LABELS.pulse[s.pulse].toLowerCase()}`)
  if (s.haemorrhage) c.push(SURVEY_LABELS.haemorrhage[s.haemorrhage].toLowerCase())
  if (c.length) parts.push(`Circulation: ${c.join(', ')}`)
  if (s.pupils) parts.push(`Pupils ${SURVEY_LABELS.pupils[s.pupils].toLowerCase()}`)
  if (s.limbMovement) parts.push(`Limb movement: ${SURVEY_LABELS.limbMovement[s.limbMovement].toLowerCase()}`)
  return parts.join(' · ')
}

// ─── MIST generator (deterministic) ──────────────────────────────────────────

export interface BuiltMist {
  mechanism: string
  injuries: string
  signs: string
  treatment: string
  shockIndex?: number
  rts?: number
  trts?: number
}

export function buildMist(run: EmergencyRun): BuiltMist {
  const inc = run.incident

  // M ─ Mechanism
  const mLines: string[] = []
  const mech = inc.mechanism ?? inc.mechanismCode ?? 'Unknown mechanism'
  mLines.push(`${mech}${inc.detail ? ` — ${inc.detail}` : ''}`)
  const ctx: string[] = []
  if (inc.time) ctx.push(`Incident: ${inc.time}`)
  if (inc.casualties) ctx.push(CASUALTY_LABELS[inc.casualties])
  if (inc.entrapment && inc.entrapment !== 'no') ctx.push(ENTRAPMENT_LABELS[inc.entrapment])
  if (inc.flags?.length) ctx.push(inc.flags.map((f) => FLAG_LABELS[f] ?? f).join(', '))
  if (ctx.length) mLines.push(ctx.join(' · '))

  // I ─ Injuries (life threats first)
  const iLines: string[] = []
  const threats = lifeThreats(run.primarySurvey)
  if (threats.length) iLines.push(`LIFE THREATS: ${threats.join('; ')}`)
  if (run.primarySurvey?.exposureFindings?.length) {
    const ex = run.primarySurvey.exposureFindings.filter((e) => e !== 'none')
    if (ex.length) iLines.push(`Exposure: ${ex.join(', ')}`)
  }
  if (run.injuries.length === 0) {
    iLines.push('No injuries mapped')
  } else {
    for (const inj of run.injuries) {
      const lat = inj.laterality !== 'na' ? `(${inj.laterality}) ` : ''
      const what = inj.specificFinding ?? inj.type
      iLines.push(
        `${lat}${inj.region.replace(/-/g, ' ')} — ${what} [${inj.severity}]${inj.notes ? `: ${inj.notes}` : ''}`
      )
    }
  }

  // S ─ Signs
  const v = latestVitals(run.vitalObservations)
  const si = shockIndex(v.hr, v.sbp)
  const rts = computeRts(v)
  const sLines: string[] = []
  const surveyLine = surveySigns(run.primarySurvey)
  if (surveyLine) sLines.push(surveyLine)
  const vit: string[] = []
  if (v.hr !== undefined) vit.push(`HR ${v.hr} bpm`)
  if (v.sbp !== undefined && v.dbp !== undefined) vit.push(`BP ${v.sbp}/${v.dbp} mmHg`)
  else if (v.sbp !== undefined) vit.push(`SBP ${v.sbp} mmHg`)
  if (v.spo2 !== undefined) vit.push(`SpO₂ ${v.spo2}%`)
  if (v.rr !== undefined) vit.push(`RR ${v.rr} brpm`)
  if (v.gcs !== undefined) vit.push(`GCS ${v.gcs}/15`)
  if (v.temp !== undefined) vit.push(`Temp ${v.temp}°C`)
  if (vit.length) sLines.push(vit.join(' · '))
  const scores: string[] = []
  if (si !== null) scores.push(`Shock Index ${si.toFixed(2)} (${shockIndexLabel(si).label.toLowerCase()})`)
  if (rts) scores.push(`T-RTS ${rts.trts}/12 · RTS ${rts.rts.toFixed(2)} (${rts.label.toLowerCase()})`)
  if (scores.length) sLines.push(scores.join(' · '))
  if (sLines.length === 0) sLines.push('No signs recorded')

  // T ─ Treatment
  const tLines: string[] = []
  const adj = run.primarySurvey?.airwayAdjuncts
  if (adj?.length) tLines.push(`Airway adjunct: ${adj.join(', ')}`)
  for (const t of run.treatments.filter((x) => !x.considered)) {
    tLines.push(`${fmtTime(t.timestamp)} — ${t.description}${t.detail ? `: ${t.detail}` : ''}`)
  }
  if (tLines.length === 0) tLines.push('No treatment recorded')

  return {
    mechanism: mLines.join('\n'),
    injuries: iLines.join('\n'),
    signs: sLines.join('\n'),
    treatment: tLines.join('\n'),
    shockIndex: si ?? undefined,
    rts: rts?.rts,
    trts: rts?.trts,
  }
}

// ─── Protocol suggestions (deterministic lookup, no AI) ──────────────────────

export interface Suggestion {
  id: string
  level: 'critical' | 'warning' | 'info'
  title: string
  body: string
  /** Set when a matching treatment is already logged → card turns green */
  doneLabel?: string
}

const LIMB = /(arm|forearm|hand|thigh|knee|lower-leg|foot|shoulder)/
const CHEST = /^chest/

const hasTx = (run: EmergencyRun, key: string, legacyText?: RegExp) =>
  run.treatments.find(
    (t) => !t.considered && (t.key === key || (legacyText && !t.key && legacyText.test(`${t.description} ${t.detail ?? ''}`)))
  )

export function getSuggestions(run: EmergencyRun): Suggestion[] {
  const out: Suggestion[] = []
  const s = run.primarySurvey
  const v = latestVitals(run.vitalObservations)
  const si = shockIndex(v.hr, v.sbp)
  const rts = computeRts(v)
  const regions = run.injuries.map((i) => i.region)
  const limbInjury = regions.some((r) => LIMB.test(r))
  const chestInjury = regions.some((r) => CHEST.test(r))
  const shocked = (si !== null && si >= 1.0) || (v.sbp !== undefined && v.sbp < 90)

  // 1 · Uncontrolled haemorrhage + limb injury
  if (s?.haemorrhage === 'uncontrolled' && limbInjury) {
    const tx = hasTx(run, 'tourniquet')
    out.push({
      id: 'tourniquet',
      level: 'critical',
      title: 'Consider tourniquet',
      body: 'Uncontrolled bleeding with a limb injury. Note the time applied.',
      doneLabel: tx ? `Tourniquet applied ${fmtTime(tx.timestamp)}` : undefined,
    })
  }

  // 2 · Shock
  if (shocked) {
    const bigBore = run.treatments.find(
      (t) => (t.key === 'iv-access' || (!t.key && t.category === 'iv-access')) && /(14|16)\s?G/i.test(t.detail ?? '')
    )
    out.push({
      id: 'shock',
      level: 'critical',
      title: 'Haemorrhagic shock suspected',
      body: `${si !== null ? `SI ${si.toFixed(2)}. ` : ''}2× large-bore IV, restrict crystalloid.`,
      doneLabel: bigBore ? 'Large-bore IV in place' : undefined,
    })
  }

  // 3 · Hypoxia + chest finding
  const chestFinding =
    chestInjury ||
    (s?.breathSounds && s.breathSounds !== 'normal') ||
    (s?.chestRise && s.chestRise !== 'symmetrical')
  if (v.spo2 !== undefined && v.spo2 < 94 && chestFinding) {
    const o2 = hasTx(run, 'oxygen', /oxygen|o₂|o2/i)
    out.push({
      id: 'hypoxia',
      level: v.spo2 < 90 ? 'critical' : 'warning',
      title: 'Hypoxia with chest finding',
      body: 'High-flow O₂ 15 L/min NRB. Consider tension pneumothorax if no improvement.',
      doneLabel: o2 ? 'Oxygen running' : undefined,
    })
  }

  // 4 · GCS ≤ 8
  if (v.gcs !== undefined && v.gcs <= 8) {
    const secured = (s?.airwayAdjuncts?.length ?? 0) > 0 || hasTx(run, 'airway-adjunct', /airway/i)
    out.push({
      id: 'gcs8',
      level: 'critical',
      title: 'GCS ≤ 8 — airway at risk',
      body: 'Consider jaw thrust / NPA. Prepare for ETT at hospital.',
      doneLabel: secured ? 'Airway adjunct in place' : undefined,
    })
  }

  // 5 · Tension pneumothorax flagged
  if (s?.breathingFlags?.includes('tension-ptx')) {
    const nd = hasTx(run, 'needle-decompression')
    out.push({
      id: 'tension',
      level: 'critical',
      title: 'Tension pneumothorax suspected',
      body: 'Needle decompression if deteriorating. Note side and time.',
      doneLabel: nd ? `Decompression ${fmtTime(nd.timestamp)}` : undefined,
    })
  }

  // 6 · Penetrating chest
  if (run.incident.mechanismCode === 'penetrating' && chestInjury) {
    const seal = hasTx(run, 'chest-seal')
    out.push({
      id: 'pen-chest',
      level: 'warning',
      title: 'Penetrating chest wound',
      body: 'Occlusive chest seal. Monitor for tension.',
      doneLabel: seal ? 'Chest seal applied' : undefined,
    })
  }

  // 7 · Low T-RTS
  if (rts && rts.trts <= 10) {
    out.push({
      id: 'rts',
      level: 'critical',
      title: `T-RTS ${rts.trts}/12 — major trauma`,
      body: 'Consider direct MTC bypass. Notify trauma surgeon pre-arrival.',
    })
  }

  // 8 · Pelvic injury + hypotension
  if (regions.includes('pelvis') && v.sbp !== undefined && v.sbp < 90) {
    const binder = hasTx(run, 'pelvic-binder', /pelvic/i)
    out.push({
      id: 'pelvis',
      level: 'critical',
      title: 'Suspected pelvic haemorrhage',
      body: 'Pelvic binder ONLY if not already applied. No log-roll.',
      doneLabel: binder ? `Binder applied ${fmtTime(binder.timestamp)}` : undefined,
    })
  }

  // 9 · Burns + airway compromise
  const burns =
    run.incident.flags?.includes('burns') ||
    s?.exposureFindings?.includes('burns') ||
    run.injuries.some((i) => i.type === 'burn')
  if (burns && s?.airway && s.airway !== 'patent') {
    const ett = s.airwayAdjuncts?.includes('ETT')
    out.push({
      id: 'inhalation',
      level: 'critical',
      title: 'Possible inhalation injury',
      body: 'Early intubation before oropharyngeal oedema develops.',
      doneLabel: ett ? 'ETT in place' : undefined,
    })
  }

  // 10 · MCI
  if (run.incident.casualties === 'mci') {
    out.push({
      id: 'mci',
      level: 'warning',
      title: 'Mass casualty declared',
      body: 'Confirm hospital major-incident activation with control.',
    })
  }

  // Not-done first, critical first
  const rank = { critical: 0, warning: 1, info: 2 }
  return out.sort((a, b) => Number(!!a.doneLabel) - Number(!!b.doneLabel) || rank[a.level] - rank[b.level])
}
