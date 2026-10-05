/**
 * TRAUMABRIDGE AI — Deterministic voice parsers
 *
 * Plain regex / keyword matching (no LLM). Each parser returns only the fields
 * it actually heard, so partial dictation never overwrites other data.
 */

import type { PrimarySurvey, AvpuLevel } from '@/types/run'

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/percent/g, '%')
    .replace(/[,;]+/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim()

// ─── Vitals ──────────────────────────────────────────────────────────────────

export interface ParsedVitals {
  hr?: number
  sbp?: number
  dbp?: number
  spo2?: number
  rr?: number
  temp?: number
  gcs?: number
}

export function parseVitals(text: string): ParsedVitals {
  const t = norm(text)
  const out: ParsedVitals = {}
  let m: RegExpMatchArray | null

  if ((m = t.match(/(?:\bhr\b|heart rate|heart|pulse rate|pulse)\D{0,8}(\d{2,3})/))) out.hr = +m[1]

  if ((m = t.match(/(?:\bbp\b|blood pressure|pressure)\D{0,8}(\d{2,3})\s*(?:over|\/|on|slash)\s*(\d{2,3})/)))
    [out.sbp, out.dbp] = [+m[1], +m[2]]
  else if ((m = t.match(/(\d{2,3})\s*(?:over|slash)\s*(\d{2,3})/))) [out.sbp, out.dbp] = [+m[1], +m[2]]

  if ((m = t.match(/(?:sats?|saturations?|spo2|sp o2|spo 2|oxygen)\D{0,10}(\d{2,3})/))) out.spo2 = Math.min(100, +m[1])

  if ((m = t.match(/(?:\brr\b|resp(?:iratory|iration)?s?(?: rate)?|breathing rate)\D{0,8}(\d{1,2})\b/))) out.rr = +m[1]

  if ((m = t.match(/temp(?:erature)?\D{0,8}(\d{2}(?:\.\d)?)/))) out.temp = parseFloat(m[1])

  if ((m = t.match(/gcs\D{0,8}(\d{1,2})/))) {
    const g = +m[1]
    if (g >= 3 && g <= 15) out.gcs = g
  }
  return out
}

/** Split a GCS total into estimated E/V/M components (deficit taken from V, then E, then M). */
export function gcsFromTotal(total: number): { eye: number; verbal: number; motor: number } {
  let deficit = 15 - Math.max(3, Math.min(15, total))
  let verbal = 5
  let eye = 4
  let motor = 6
  const take = (cur: number, min: number) => {
    const d = Math.min(deficit, cur - min)
    deficit -= d
    return cur - d
  }
  verbal = take(verbal, 1)
  eye = take(eye, 1)
  motor = take(motor, 1)
  return { eye, verbal, motor }
}

// ─── Patient ─────────────────────────────────────────────────────────────────

const STOP = /\b(aged|age|male|female|man|woman|years?|yrs?|and|allerg\w*|with|who|is|he|she)\b/i

/** Extract a person's name from free speech ("his name is David Miller aged 40") */
export function parseName(text: string): string | undefined {
  let t = text.trim().replace(/[.!?]+$/, '')
  const lead = t.match(/(?:name is|name's|called|this is|patient is|patient's name is|his name is|her name is)\s+(.+)/i)
  if (lead) t = lead[1]
  const words: string[] = []
  for (const w of t.split(/\s+/)) {
    if (STOP.test(w) || /\d/.test(w)) break
    words.push(w)
    if (words.length >= 4) break
  }
  if (words.length === 0) return undefined
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

const KNOWN_ALLERGENS: [RegExp, string][] = [
  [/penicillin|amoxicillin/, 'Penicillin'],
  [/nsaid|ibuprofen|diclofenac|naproxen/, 'NSAIDs'],
  [/aspirin/, 'Aspirin'],
  [/contrast|iodine/, 'Contrast'],
  [/latex/, 'Latex'],
]

export interface ParsedPatient {
  name?: string
  age?: number
  sex?: 'male' | 'female'
  allergyNone?: boolean
  allergies?: string[]
}

export function parsePatient(text: string): ParsedPatient {
  const t = norm(text)
  const out: ParsedPatient = {}
  let m: RegExpMatchArray | null

  if (/name is|name's|called|this is/.test(t)) out.name = parseName(text)

  if ((m = t.match(/(\d{1,3})\s*(?:years?|yrs?|y\/o|year old|yo)\b/)) || (m = t.match(/\bage[d]?\s*(\d{1,3})/)))
    out.age = Math.min(120, +m[1])

  if (/\b(female|woman|girl|lady)\b/.test(t)) out.sex = 'female'
  else if (/\b(male|man|boy|gentleman)\b/.test(t)) out.sex = 'male'

  if (/\b(nkda|no known allerg\w*|no allerg\w*)\b/.test(t)) out.allergyNone = true
  else if ((m = t.match(/allerg(?:ic|ies|y)\s*(?:to)?\s*(.+)/))) {
    const found: string[] = []
    for (const [re, label] of KNOWN_ALLERGENS) if (re.test(m[1])) found.push(label)
    if (found.length === 0) {
      const raw = m[1].replace(/[.,].*$/, '').trim()
      if (raw) found.push(raw.charAt(0).toUpperCase() + raw.slice(1))
    }
    out.allergies = found
  }
  return out
}

// ─── Incident ────────────────────────────────────────────────────────────────

const MECHANISM_KEYWORDS: [RegExp, string, string][] = [
  [/road traffic|\brtc\b|\brta\b|car (?:crash|accident)|collision|motorbike|motorcycle|pedestrian struck|vehicle/, 'rtc', 'Road Traffic Collision'],
  [/\bfall\b|fell|fallen|from height/, 'fall', 'Fall from Height'],
  [/assault|punched|beaten|attacked/, 'assault', 'Assault / Violence'],
  [/burn|scald|fire\b|flame/, 'burn', 'Thermal / Scald Burn'],
  [/crush|trapped under|pinned/, 'crush', 'Crush Injury'],
  [/stab|stabbed|shot|gunshot|gun shot|impale|penetrat/, 'penetrating', 'Penetrating Wound'],
  [/industrial|machinery|factory|workplace/, 'industrial', 'Workplace / Industrial'],
]

export interface ParsedIncident {
  mechanismCode?: string
  mechanism?: string
  casualties?: '1' | '2-4' | '5+' | 'mci'
  entrapment?: 'no' | 'lt30' | '30-60' | 'gt60'
  flags?: string[]
  time?: string
}

export function parseIncident(text: string): ParsedIncident {
  const t = norm(text)
  const out: ParsedIncident = {}
  let m: RegExpMatchArray | null

  for (const [re, code, label] of MECHANISM_KEYWORDS) {
    if (re.test(t)) {
      out.mechanismCode = code
      out.mechanism = label
      break
    }
  }

  if (/mass casualty|\bmci\b|major incident/.test(t)) out.casualties = 'mci'
  else if ((m = t.match(/(\d+)\s*(?:casualt\w*|patients?|people|victims?|injured)/))) {
    const n = +m[1]
    out.casualties = n <= 1 ? '1' : n <= 4 ? '2-4' : '5+'
  }

  if (/not trapped|no entrapment|self[- ]extricated/.test(t)) out.entrapment = 'no'
  else if ((m = t.match(/trapped\D{0,12}(\d+)\s*(?:min|minutes)/)) || (m = t.match(/entrap\w*\D{0,12}(\d+)\s*(?:min|minutes)/))) {
    const mins = +m[1]
    out.entrapment = mins < 30 ? 'lt30' : mins <= 60 ? '30-60' : 'gt60'
  } else if (/trapped|entrap/.test(t)) out.entrapment = 'lt30'

  const flags: string[] = []
  if (/high[- ](?:energy|speed)/.test(t)) flags.push('high-energy')
  if (/spinal|c[- ]spine|neck pain/.test(t)) flags.push('spinal')
  if (/burn|scald/.test(t)) flags.push('burns')
  if (/hazmat|chemical|toxic/.test(t)) flags.push('hazmat')
  if (/cardiac arrest|arrest/.test(t)) flags.push('arrest')
  if (flags.length) out.flags = flags

  if (/just now|just happened/.test(t)) out.time = 'Just now'
  else if ((m = t.match(/(\d+)\s*(?:min|minutes)\s*ago/))) out.time = +m[1] < 30 ? '<30 min' : '30–60 min'
  else if (/hour/.test(t)) out.time = '1–3 hours'

  return out
}

// ─── Primary survey (ABCDE) ──────────────────────────────────────────────────

export function parseSurvey(text: string): Partial<PrimarySurvey> {
  const t = norm(text)
  const out: Partial<PrimarySurvey> = {}
  const addFlag = (k: 'breathingFlags' | 'exposureFindings', v: string) => {
    out[k] = Array.from(new Set([...(out[k] ?? []), v]))
  }

  // A
  if (/airway (?:is )?(?:patent|clear)|patent airway/.test(t)) out.airway = 'patent'
  else if (/airway (?:is )?(?:compromised|partially|partial)|compromised airway/.test(t)) out.airway = 'compromised'
  else if (/airway (?:is )?(?:obstructed|secured|blocked)|intubated|obstructed airway/.test(t)) out.airway = 'obstructed'

  // B
  if (/asymm?etr\w*[^,]*\bleft\b|left[^,]*asymm?etr/.test(t)) out.chestRise = 'asym-left'
  else if (/asymm?etr\w*[^,]*\bright\b|right[^,]*asymm?etr/.test(t)) out.chestRise = 'asym-right'
  else if (/symm?etr\w* chest|chest rise symm?etr\w*/.test(t)) out.chestRise = 'symmetrical'

  if (/reduced[^,]*\b(?:left|l)\b|(?:left|l)\b[^,]*reduced/.test(t) && !/right/.test(t.split('reduced')[1] ?? '')) out.breathSounds = 'reduced-left'
  else if (/reduced[^,]*\b(?:right|r)\b|(?:right|r)\b[^,]*reduced/.test(t)) out.breathSounds = 'reduced-right'
  else if (/absent (?:breath|air)|no breath sounds|silent chest/.test(t)) out.breathSounds = 'absent'
  else if (/crackles|wheeze|added sounds|stridor/.test(t)) out.breathSounds = 'added'
  else if (/(?:breath sounds?|breathing|chest) (?:is |are )?(?:normal|clear)|bilateral air entry/.test(t)) out.breathSounds = 'normal'

  if (/tension/.test(t)) addFlag('breathingFlags', 'tension-ptx')
  if (/open chest|sucking chest/.test(t)) addFlag('breathingFlags', 'open-chest')
  if (/flail/.test(t)) addFlag('breathingFlags', 'flail')

  // C
  if (/no pulse|pulse(?: is)? absent|pulseless/.test(t)) out.pulse = 'absent'
  else if (/weak|thready/.test(t)) out.pulse = 'weak'
  else if (/pulse(?: is)? (?:present|palpable)|palpable pulse/.test(t)) out.pulse = 'present'

  if (/uncontrolled|massive (?:bleed|haemorrhage|hemorrhage)|exsanguinat/.test(t)) out.haemorrhage = 'uncontrolled'
  else if (/internal (?:bleed|haemorrhage|hemorrhage)|internal bleeding/.test(t)) out.haemorrhage = 'internal'
  else if (/controlled (?:bleed|haemorrhage|hemorrhage)|bleeding (?:is )?controlled|haemorrhage controlled/.test(t)) out.haemorrhage = 'controlled'
  else if (/no (?:visible )?(?:bleed|haemorrhage|hemorrhage)/.test(t)) out.haemorrhage = 'none'

  // D
  let avpu: AvpuLevel | undefined
  let m: RegExpMatchArray | null
  if ((m = t.match(/avpu\s*(?:is\s*)?([avpu])\b/))) avpu = m[1].toUpperCase() as AvpuLevel
  else if (/unresponsive|unconscious/.test(t)) avpu = 'U'
  else if (/respon\w* to pain|only to pain/.test(t)) avpu = 'P'
  else if (/respon\w* to (?:voice|verbal)/.test(t)) avpu = 'V'
  else if (/\balert\b|\bawake\b/.test(t)) avpu = 'A'
  if (avpu) out.avpu = avpu

  if (/fixed(?: and)? dilated/.test(t)) out.pupils = 'fixed-dilated'
  else if (/unequal|anisocoria/.test(t)) out.pupils = 'unequal'
  else if (/pupils? (?:are )?equal|perrl|perl\b/.test(t)) out.pupils = 'equal-reactive'

  if (/moving all (?:four|4)|all (?:four|4) limbs/.test(t)) out.limbMovement = 'all-four'
  else if (/arms only|only arms/.test(t)) out.limbMovement = 'arms-only'
  else if (/legs only|only legs|not moving (?:his |her )?legs/.test(t)) out.limbMovement = 'legs-only'

  // E
  if (/burns?\b/.test(t)) addFlag('exposureFindings', 'burns')
  if (/deformity|fracture/.test(t)) addFlag('exposureFindings', 'deformity')
  if (/hypotherm|cold to touch/.test(t)) addFlag('exposureFindings', 'hypothermia')
  if (/significant bleeding|heavy bleeding/.test(t)) addFlag('exposureFindings', 'bleeding')

  return out
}

// ─── Injuries ────────────────────────────────────────────────────────────────

export type Severity = 'mild' | 'moderate' | 'severe' | 'critical' | 'unknown'

export interface ParsedInjury {
  region: string
  severity: Severity
  finding: string
}

export interface InjuryParseResult {
  injuries: ParsedInjury[]
  needsSide: string[]
}

type RegionRule = { re: RegExp; label: string; left?: string; right?: string; single?: string }

const REGION_RULES: RegionRule[] = [
  { re: /forearm|wrist|radius|ulna/, label: 'forearm', left: 'left-forearm', right: 'right-forearm' },
  { re: /shoulder|clavicle/, label: 'shoulder', left: 'left-shoulder', right: 'right-shoulder' },
  { re: /upper arm|humerus|\barm\b|elbow/, label: 'arm', left: 'left-arm', right: 'right-arm' },
  { re: /hand|finger|thumb/, label: 'hand', left: 'left-hand', right: 'right-hand' },
  { re: /thigh|femur/, label: 'thigh', left: 'left-thigh', right: 'right-thigh' },
  { re: /knee/, label: 'knee', left: 'left-knee', right: 'right-knee' },
  { re: /lower leg|\bleg\b|tibia|fibula|shin|calf/, label: 'lower leg', left: 'left-lower-leg', right: 'right-lower-leg' },
  { re: /foot|ankle|toe/, label: 'foot', left: 'left-foot', right: 'right-foot' },
  { re: /chest|rib|thorax|lung/, label: 'chest', left: 'chest-left', right: 'chest-right' },
  { re: /head|scalp|skull|cranium/, label: 'head', single: 'head' },
  { re: /face|jaw|facial|maxillofacial|nose|eye/, label: 'face', single: 'face' },
  { re: /neck|cervical|c[- ]spine/, label: 'neck', single: 'neck' },
  { re: /abdomen|abdominal|belly|stomach/, label: 'abdomen', single: 'abdomen-upper' },
  { re: /pelvis|pelvic/, label: 'pelvis', single: 'pelvis' },
  { re: /lower back|lumbar/, label: 'lower back', single: 'lower-back' },
  { re: /upper back|thoracic spine/, label: 'upper back', single: 'upper-back' },
  { re: /spine|spinal/, label: 'spine', single: 'spine' },
  { re: /\bback\b/, label: 'back', single: 'upper-back' },
]

const FINDING_RULES: [RegExp, string][] = [
  [/fractur|broken/, 'Suspected Fracture'],
  [/dislocat/, 'Dislocation'],
  [/lacerat|cut|gash/, 'Laceration'],
  [/stab|shot|gunshot|penetrat|impale/, 'Penetrating Injury'],
  [/burn|scald/, 'Burn'],
  [/crush/, 'Crush Injury'],
  [/bleed|haemorrhage|hemorrhage/, 'Bleeding'],
  [/deform/, 'Deformity'],
  [/bruis|contusion/, 'Bruising / Contusion'],
  [/swell/, 'Swelling'],
]

export function parseInjuries(text: string): InjuryParseResult {
  const clauses = text
    .toLowerCase()
    .split(/[,;.]|\band\b|\bthen\b/)
    .map((c) => c.trim())
    .filter(Boolean)

  const injuries: ParsedInjury[] = []
  const needsSide: string[] = []
  const seen = new Set<string>()

  for (const c of clauses) {
    const rule = REGION_RULES.find((r) => r.re.test(c))
    if (!rule) continue
    const left = /\bleft\b/.test(c)
    const right = /\bright\b/.test(c)
    let region: string | undefined = rule.single
    if (!region) {
      if (left && !right) region = rule.left
      else if (right && !left) region = rule.right
      else if (left && right) region = undefined // bilateral → handled below
      else {
        needsSide.push(rule.label)
        continue
      }
    }
    const severity: Severity = /critical|life[- ]threatening/.test(c)
      ? 'critical'
      : /severe|serious|major|bad/.test(c)
      ? 'severe'
      : /minor|mild|small|superficial/.test(c)
      ? 'mild'
      : 'moderate'
    const finding = FINDING_RULES.find(([re]) => re.test(c))?.[1] ?? 'Pain / Tenderness'
    const regions = region ? [region] : [rule.left!, rule.right!]
    for (const r of regions) {
      const key = `${r}:${finding}`
      if (seen.has(key)) continue
      seen.add(key)
      injuries.push({ region: r, severity, finding })
    }
  }
  return { injuries, needsSide }
}

// ─── Interventions ───────────────────────────────────────────────────────────

export const DRUGS = [
  'Morphine',
  'Ketamine',
  'Fentanyl',
  'Midazolam',
  'Adrenaline',
  'Entonox',
  'Atropine',
] as const

export interface ParsedDrug {
  drug: string
  dose?: number
  unit?: string
  route?: string
}

export function parseDrugs(text: string): ParsedDrug[] {
  const t = norm(text)
  const out: ParsedDrug[] = []
  for (const d of DRUGS) {
    const re = new RegExp(`${d.toLowerCase()}\\s*(?:(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|micrograms?|ml|g)\\b)?\\s*(?:(iv|im|oral|intranasal|inhaled|io)\\b)?`)
    const m = t.match(re)
    if (m) {
      out.push({
        drug: d,
        dose: m[1] ? parseFloat(m[1]) : undefined,
        unit: m[2] ? (m[2].startsWith('micro') ? 'mcg' : m[2]) : undefined,
        route: m[3] ? m[3].toUpperCase() : undefined,
      })
    }
  }
  return out
}
