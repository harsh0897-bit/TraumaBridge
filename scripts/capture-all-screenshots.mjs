import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const ARTIFACT_DIR = 'C:/Users/HARSH/.gemini/antigravity-ide/brain/f69702c6-bf9d-48f7-8156-f3d39d140b2a/screenshots'
const LOCAL_DIR = path.resolve('audit-reports/screenshots')

fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
fs.mkdirSync(LOCAL_DIR, { recursive: true })

async function saveScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename)
  const p2 = path.join(LOCAL_DIR, filename)
  await page.screenshot({ path: p1, fullPage: false })
  await page.screenshot({ path: p2, fullPage: false })
  console.log(`Saved screenshot: ${filename}`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  console.log('=== MEASURING VERTICAL BUDGET & CAPTURING FINAL SCREENSHOTS ===\n')

  const measurements = {}

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    const page = await context.newPage()
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const vpStr = `${viewport.width}x${viewport.height}`
    console.log(`\n--- Viewport: ${vpStr} ---`)

    // 1. Overview Alpha 7
    await page.goto('http://localhost:3000/hospital', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Measure vertical components at 1440x900 and 1280x720
    if (viewport.height === 900 || viewport.height === 720) {
      const measured = await page.evaluate(() => {
        const banner = document.querySelector('body > div > div > div:nth-child(1)')?.getBoundingClientRect().height || 28
        const topBar = document.querySelector('header')?.getBoundingClientRect().height || 56
        const band = document.querySelector('main > div:nth-child(1)')?.getBoundingClientRect().height || 72
        const tabs = document.querySelector('main > div:nth-child(2)')?.getBoundingClientRect().height || 44
        const row1 = document.querySelector('main [data-row1="true"]')?.getBoundingClientRect().height ||
          document.querySelector('main .grid-cols-\\[1\\.35fr_1fr_1fr_1fr\\]')?.getBoundingClientRect().height || 0
        const row2 = document.querySelector('main .grid-cols-\\[5fr_4fr_3fr\\]')?.getBoundingClientRect().height || 0
        return { banner, topBar, band, tabs, row1, row2 }
      })
      measurements[vpStr] = measured
      console.log(`Measured heights at ${vpStr}:`, measured)
    }

    await saveScreenshot(page, `overview_alpha7_${vpStr}.png`)

    // 2. Overview Bravo 3
    if (viewport.width !== 1024) {
      const railRows = await page.$$('[data-rail-row="true"]')
      if (railRows.length > 1) {
        await railRows[1].click()
        await page.waitForTimeout(400)
        await saveScreenshot(page, `overview_bravo3_${vpStr}.png`)
        // Switch back to Alpha 7
        await railRows[0].click()
        await page.waitForTimeout(400)
      }

      // 3. Unsent state
      await page.goto('http://localhost:3000/hospital?state=unsent', { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      await saveScreenshot(page, `overview_unsent_${vpStr}.png`)

      // Return to standard Alpha 7
      await page.goto('http://localhost:3000/hospital', { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
    }

    // 4. Clinical Tab
    await page.click('#tab-clinical')
    await page.waitForTimeout(400)

    // Subpanel: Injuries
    await saveScreenshot(page, `clinical_injuries_alpha7_${vpStr}.png`)

    if (viewport.width !== 1024) {
      // Select each of the 3 injuries
      const injuryRows = await page.$$('div.grid-cols-\\[300px_minmax\\(0\\,1fr\\)_320px\\] > div:first-child > div:nth-child(2) > div')
      if (injuryRows.length >= 3) {
        // Injury 1: Head
        await injuryRows[0].click()
        await page.waitForTimeout(300)
        await saveScreenshot(page, `clinical_injuries_head_selected_${vpStr}.png`)

        // Injury 2: Chest
        await injuryRows[1].click()
        await page.waitForTimeout(300)
        await saveScreenshot(page, `clinical_injuries_chest_selected_${vpStr}.png`)

        // Injury 3: Pelvis
        await injuryRows[2].click()
        await page.waitForTimeout(300)
        await saveScreenshot(page, `clinical_injuries_pelvis_selected_${vpStr}.png`)
      }

      // Subpanel: Vitals and scores
      await page.click('#clinical-subtab-vitals')
      await page.waitForTimeout(300)
      await saveScreenshot(page, `clinical_vitals_${vpStr}.png`)

      // Subpanel: Treatment
      await page.click('#clinical-subtab-treatment')
      await page.waitForTimeout(300)
      await saveScreenshot(page, `clinical_treatment_${vpStr}.png`)

      // Subpanel: MIST
      await page.click('#clinical-subtab-mist')
      await page.waitForTimeout(300)
      await saveScreenshot(page, `clinical_mist_${vpStr}.png`)

      // Subpanel: Evidence
      await page.click('#clinical-subtab-evidence')
      await page.waitForTimeout(300)
      await saveScreenshot(page, `clinical_evidence_${vpStr}.png`)

      // 5. Preparation Tab
      await page.click('#tab-preparation')
      await page.waitForTimeout(400)
      await saveScreenshot(page, `preparation_initial_${vpStr}.png`)

      // Mid-cycle: click a department button (e.g. 2nd or 3rd tile)
      const deptButtons = await page.$$('main .grid-cols-2 > button')
      if (deptButtons.length >= 2) {
        await deptButtons[1].click()
        await page.waitForTimeout(300)
        await saveScreenshot(page, `preparation_midcycle_${vpStr}.png`)
      }

      // 6. Activity Tab
      await page.click('#tab-activity')
      await page.waitForTimeout(400)
      await saveScreenshot(page, `activity_${vpStr}.png`)
    }

    await page.close()
  }

  // 7. Bodymap Debug 3 Views
  console.log('\n--- Capturing Bodymap Debug Views ---')
  const debugPage = await context.newPage()
  await debugPage.setViewportSize({ width: 1440, height: 900 })
  await debugPage.goto('http://localhost:3000/hospital/bodymap-debug', { waitUntil: 'networkidle' })
  await debugPage.waitForTimeout(500)

  // Front view
  await saveScreenshot(debugPage, 'bodymap_debug_front.png')

  // Back view
  await debugPage.click('#debug-tab-back')
  await debugPage.waitForTimeout(300)
  await saveScreenshot(debugPage, 'bodymap_debug_back.png')

  // Side view
  await debugPage.click('#debug-tab-side')
  await debugPage.waitForTimeout(300)
  await saveScreenshot(debugPage, 'bodymap_debug_side.png')

  await debugPage.close()
  await browser.close()

  const summaryPath = path.resolve('audit-reports/measurements.json')
  fs.writeFileSync(summaryPath, JSON.stringify(measurements, null, 2), 'utf8')
  console.log('\nMeasurements saved to:', summaryPath)
  console.log('All screenshots captured successfully!')
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
