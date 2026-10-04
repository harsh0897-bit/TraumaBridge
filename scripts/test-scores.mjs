/**
 * TRAUMABRIDGE AI — RTS Score Verification Script
 * Tests demo case and edge cases specified in Stage 2 brief.
 */

function codeGcs(gcs) {
  if (gcs >= 13) return 4
  if (gcs >= 9) return 3
  if (gcs >= 6) return 2
  if (gcs >= 4) return 1
  return 0
}

function codeSbp(sbp) {
  if (sbp > 89) return 4
  if (sbp >= 76) return 3
  if (sbp >= 50) return 2
  if (sbp >= 1) return 1
  return 0
}

function codeRr(rr) {
  if (rr >= 10 && rr <= 29) return 4
  if (rr > 29) return 3
  if (rr >= 6) return 2
  if (rr >= 1) return 1
  return 0
}

function calculateRTS(gcs, sbp, rr) {
  const gcsc = codeGcs(gcs)
  const sbpc = codeSbp(sbp)
  const rrc = codeRr(rr)
  const score = 0.9368 * gcsc + 0.7326 * sbpc + 0.2908 * rrc
  const workingFormula = `GCS ${gcs} -> ${gcsc} · SBP ${sbp} -> ${sbpc} · RR ${rr} -> ${rrc} · 0.9368x${gcsc} + 0.7326x${sbpc} + 0.2908x${rrc} = ${score.toFixed(4)}`
  return {
    score,
    formatted: score.toFixed(2),
    gcsc,
    sbpc,
    rrc,
    workingFormula,
  }
}

const testCases = [
  { name: 'Demo Patient (Alpha 7)', gcs: 14, sbp: 98, rr: 20 },
  { name: 'Edge Case: GCS 8', gcs: 8, sbp: 98, rr: 20 },
  { name: 'Edge Case: SBP 80', gcs: 14, sbp: 80, rr: 20 },
  { name: 'Edge Case: RR 31', gcs: 14, sbp: 98, rr: 31 },
  { name: 'Edge Case: SBP 0 (Cardiac arrest)', gcs: 3, sbp: 0, rr: 0 },
]

console.log('================================================================')
console.log('REVISED TRAUMA SCORE (RTS) TEST SUITE')
console.log('================================================================\n')

let allPass = true

for (const tc of testCases) {
  const res = calculateRTS(tc.gcs, tc.sbp, tc.rr)
  console.log(`[CASE] ${tc.name}`)
  console.log(`  Inputs: GCS=${tc.gcs}, SBP=${tc.sbp}, RR=${tc.rr}`)
  console.log(`  Coded:  GCSc=${res.gcsc}, SBPc=${res.sbpc}, RRc=${res.rrc}`)
  console.log(`  Formula: ${res.workingFormula}`)
  console.log(`  Result:  ${res.formatted}\n`)

  if (tc.name.includes('Demo') && res.formatted !== '7.84') {
    allPass = false
    console.error(`FAIL: Expected 7.84, got ${res.formatted}`)
  }
  if (tc.gcs === 8 && res.gcsc !== 2) {
    allPass = false
    console.error(`FAIL: GCS 8 expected coded 2, got ${res.gcsc}`)
  }
  if (tc.sbp === 80 && res.sbpc !== 3) {
    allPass = false
    console.error(`FAIL: SBP 80 expected coded 3, got ${res.sbpc}`)
  }
  if (tc.rr === 31 && res.rrc !== 3) {
    allPass = false
    console.error(`FAIL: RR 31 expected coded 3, got ${res.rrc}`)
  }
  if (tc.sbp === 0 && res.sbpc !== 0) {
    allPass = false
    console.error(`FAIL: SBP 0 expected coded 0, got ${res.sbpc}`)
  }
}

if (allPass) {
  console.log('>>> ALL RTS SCORE TESTS PASSED (5/5) <<<')
} else {
  console.error('>>> RTS SCORE TESTS FAILED <<<')
  process.exit(1)
}
