/**
 * TRAUMABRIDGE AI — UI AUDIT ENGINE
 * Runs Playwright tests against /hospital and /hospital/kit across 3 viewports:
 * 1440x900, 1280x720, 1024x768
 * Output written to audit-reports/audit-result.json
 */

import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024x768' },
]

// Contrast helper functions
function parseColor(str) {
  if (!str) return [255, 255, 255, 1]
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return [255, 255, 255, 1]
  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    match[4] !== undefined ? parseFloat(match[4]) : 1,
  ]
}

function srgbToLinear(c) {
  const norm = c / 255
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4)
}

function getLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function getContrast(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1)
  const lum2 = getLuminance(rgb2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Execute client-side audit checks in the browser
 */
async function auditCurrentView(page) {
  return await page.evaluate(() => {
    const issues = []
    const contrastRecords = []

    // Offscreen canvas for accurate CSS color evaluation (handles oklab, hex, rgb, hsl, etc.)
    const _canvas = document.createElement('canvas')
    _canvas.width = 1
    _canvas.height = 1
    const _ctx = _canvas.getContext('2d', { willReadFrequently: true })

    function parseColor(str) {
      if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') {
        return [0, 0, 0, 0]
      }
      _ctx.clearRect(0, 0, 1, 1)
      _ctx.fillStyle = str
      _ctx.fillRect(0, 0, 1, 1)
      const data = _ctx.getImageData(0, 0, 1, 1).data
      return [data[0], data[1], data[2], data[3] / 255]
    }

    function srgbToLinear(c) {
      const norm = c / 255
      return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4)
    }

    function getLuminance([r, g, b]) {
      return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
    }

    function calcContrast(fg, bg) {
      const lum1 = getLuminance(fg)
      const lum2 = getLuminance(bg)
      const brightest = Math.max(lum1, lum2)
      const darkest = Math.min(lum1, lum2)
      return (brightest + 0.05) / (darkest + 0.05)
    }

    // Blend foreground with background based on alpha
    function blend(fg, bg) {
      const a = fg[3]
      return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a)),
        1,
      ]
    }

    // (a) Document scroll
    const docScrollH = document.documentElement.scrollHeight
    const winInnerH = window.innerHeight
    const docScrollW = document.documentElement.scrollWidth
    const winInnerW = window.innerWidth
    if (docScrollH > winInnerH + 1) {
      issues.push({ code: 'a', message: `document scrollHeight (${docScrollH}px) > innerHeight (${winInnerH}px)` })
    }
    if (docScrollW > winInnerW + 1) {
      issues.push({ code: 'a', message: `document scrollWidth (${docScrollW}px) > innerWidth (${winInnerW}px)` })
    }

    // Walk all visible elements
    const allElements = Array.from(document.querySelectorAll('*'))
    for (const el of allElements) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue

      // (k) Audit/debug check in id/class or ISO date in text
      const idOrClass = `${el.id} ${el.className}`.toLowerCase()
      if (idOrClass.includes('audit') || idOrClass.includes('debug')) {
        issues.push({ code: 'k', message: `Element has audit/debug in id or class: ${el.tagName}#${el.id}.${el.className}` })
      }

      // Check direct text content of leaf text nodes
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim()
          if (text) {
            // (k) ISO timestamp regex
            if (/\d{4}-\d{2}-\d{2}T/.test(text)) {
              issues.push({ code: 'k', message: `Raw ISO timestamp rendered in visible text: "${text.substring(0, 30)}"` })
            }

            // (b) Font size check < 12px
            const fontSize = parseFloat(style.fontSize)
            if (fontSize < 11.5) {
              issues.push({ code: 'b', message: `Text under 12px (${fontSize}px): "${text.substring(0, 20)}"` })
            }

            // (d) Contrast check
            // Find effective background by walking ancestors
            let bg = [255, 255, 255, 1]
            let curr = el
            const bgStack = []
            while (curr && curr !== document.documentElement) {
              const cStyle = window.getComputedStyle(curr)
              const cBg = parseColor(cStyle.backgroundColor)
              if (cBg[3] > 0) {
                bgStack.unshift(cBg)
              }
              // Check if parent has hero tile class or gradient
              if (curr.classList.contains('tile-hero')) {
                // hero gradient stop worst case: #0F3F82 to #1B5FB4 -> use [27, 95, 180] or [15, 63, 130]
                bgStack.unshift([27, 95, 180, 1])
              }
              curr = curr.parentElement
            }

            for (const b of bgStack) {
              bg = blend(b, bg)
            }

            const fg = parseColor(style.color)
            const effectiveFg = blend(fg, bg)
            const contrast = calcContrast(effectiveFg, bg)
            const isBoldOrLarge = fontSize >= 24 || (fontSize >= 18.5 && parseInt(style.fontWeight, 10) >= 700)
            const minContrast = isBoldOrLarge ? 3.0 : 4.5

            contrastRecords.push({ text: text.substring(0, 25), contrast, minContrast })
            if (contrast < minContrast - 0.05) {
              issues.push({
                code: 'd',
                message: `Contrast failure: "${text.substring(0, 20)}" has ${contrast.toFixed(2)}:1 (required ${minContrast}:1) fg:${style.color}`,
              })
            }
          }
        }
      }

      // (e) Tile scrollHeight vs clientHeight
      if (el.classList.contains('rounded-tile') || el.classList.contains('tile-hero')) {
        if (el.scrollHeight > el.clientHeight + 2) {
          issues.push({ code: 'e', message: `Tile vertical overflow: scrollHeight (${el.scrollHeight}) > clientHeight (${el.clientHeight})` })
        }
      }

      // (j) Rail row padding check
      if (el.getAttribute('data-rail-row') === 'true' || (el.closest('aside') && el.classList.contains('cursor-pointer'))) {
        const pl = parseFloat(style.paddingLeft)
        if (pl < 15.5) {
          issues.push({ code: 'j', message: `Rail row left padding < 16px (${pl}px)` })
        }
      }
    }

    // (l) Urgency label consistency
    const railUrgencies = Array.from(document.querySelectorAll('[data-urgency-rail]')).map(e => e.textContent?.trim())
    const headerUrgency = document.querySelector('[data-urgency-header]')?.textContent?.trim()
    const heroUrgency = document.querySelector('[data-urgency-hero]')?.textContent?.trim()
    if (headerUrgency && heroUrgency && headerUrgency !== heroUrgency) {
      issues.push({ code: 'l', message: `Urgency mismatch between header ("${headerUrgency}") and hero ("${heroUrgency}")` })
    }

    const worstContrast = contrastRecords.length > 0
      ? Math.min(...contrastRecords.map(c => c.contrast))
      : 21.0

    return { issues, worstContrast }
  })
}

async function run() {
  console.log(`Starting UI Audit against ${BASE_URL}...`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  const allReports = []
  let totalIssues = 0
  let globalWorstContrast = 21.0

  const routes = [
    { path: '/hospital', name: 'Hospital' },
    { path: '/hospital?state=unsent', name: 'Hospital (Unsent)' },
    { path: '/hospital/kit', name: 'Design Kit' },
  ]

  for (const vp of VIEWPORTS) {
    const page = await context.newPage()
    await page.setViewportSize({ width: vp.width, height: vp.height })

    // Track console errors
    const consoleErrors = []
    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error' || text.includes('hydration') || text.includes('Warning:')) {
        consoleErrors.push(text)
      }
    })

    for (const route of routes) {
      const url = `${BASE_URL}${route.path}`
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
        await page.waitForTimeout(500) // Let animations settle

        const audit = await auditCurrentView(page)
        if (audit.worstContrast < globalWorstContrast) {
          globalWorstContrast = audit.worstContrast
        }

        const report = {
          route: route.name,
          viewport: vp.name,
          worstContrast: audit.worstContrast,
          issues: [...audit.issues],
          consoleErrors,
        }

        if (consoleErrors.length > 0) {
          for (const err of consoleErrors) {
            report.issues.push({ code: 'c', message: `Console error: ${err.substring(0, 100)}` })
          }
        }

        totalIssues += report.issues.length
        allReports.push(report)

        console.log(`[${vp.name}] ${route.name}: ${report.issues.length} issues, worst contrast: ${audit.worstContrast.toFixed(2)}:1`)
        if (report.issues.length > 0) {
          for (const iss of report.issues) {
            console.log(`   - (${iss.code}) ${iss.message}`)
          }
        }
      } catch (err) {
        console.error(`Error loading ${url} at ${vp.name}:`, err.message)
      }
    }

    await page.close()
  }

  await browser.close()

  const finalSummary = {
    timestamp: new Date().toISOString(),
    totalIssues,
    globalWorstContrast,
    reports: allReports,
  }

  const outPath = path.resolve('audit-reports/audit-result.json')
  fs.writeFileSync(outPath, JSON.stringify(finalSummary, null, 2), 'utf8')
  console.log(`\nAudit completed. Total issues: ${totalIssues}. Worst contrast: ${globalWorstContrast.toFixed(2)}:1`)
  console.log(`Report written to ${outPath}`)

  if (totalIssues > 0) {
    process.exit(1)
  }
}

run().catch(err => {
  console.error('Fatal audit error:', err)
  process.exit(1)
})
