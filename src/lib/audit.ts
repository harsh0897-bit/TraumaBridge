/**
 * TRAUMABRIDGE AI — Automated Clinical Console Audit Engine
 * Evaluates viewports, contrast, font-sizes, clipping, and hero properties.
 */

export interface ContrastFailure {
  text: string
  color: string
  bgColor: string
  ratio: number
  required: number
  fontSize: number
  element: string
}

export interface AuditReport {
  viewport: { width: number; height: number }
  scrollHeight: number
  innerHeight: number
  isPageNoVerticalScroll: boolean
  scrollWidth: number
  innerWidth: number
  isPageNoHorizontalScroll: boolean
  minFontSize: number
  smallestElementText: string
  contrastFailures: ContrastFailure[]
  contrastPassCount: number
  heroBgImage: string
  heroContrast: number
  tileClippings: { title: string; scrollHeight: number; clientHeight: number; isClipped: boolean }[]
  row1Height: number
  row2Height: number
}

// ─── WCAG Contrast Math ───────────────────────────────────────────────────────

function parseColor(str: string): [number, number, number, number] {
  if (str.startsWith('rgba')) {
    const parts = str.slice(5, -1).split(',').map((p) => parseFloat(p.trim()))
    return [parts[0], parts[1], parts[2], parts[3]]
  }
  if (str.startsWith('rgb')) {
    const parts = str.slice(4, -1).split(',').map((p) => parseFloat(p.trim()))
    return [parts[0], parts[1], parts[2], 1]
  }
  if (str.startsWith('#')) {
    let hex = str.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const num = parseInt(hex, 16)
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1]
  }
  return [17, 24, 39, 1] // default ink
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2])
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2])
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function findEffectiveBg(el: HTMLElement): [number, number, number] {
  // 1. If inside hero tile, effective background is darkest stop: #0F3F82 -> [15, 63, 130]
  if (el.closest('.tile-hero')) {
    return [15, 63, 130]
  }

  // 2. Walk ancestors to find background
  let curr: HTMLElement | null = el
  while (curr && curr !== document.documentElement) {
    const bg = window.getComputedStyle(curr).backgroundColor
    const [r, g, b, a] = parseColor(bg)
    if (a > 0.3) {
      return [r, g, b]
    }
    curr = curr.parentElement
  }
  return [248, 251, 255] // well #F8FBFF
}

// ─── Main Run Audit ───────────────────────────────────────────────────────────

export function runClientAudit(): AuditReport {
  const scrollHeight = document.documentElement.scrollHeight
  const innerHeight = window.innerHeight
  const scrollWidth = document.documentElement.scrollWidth
  const innerWidth = window.innerWidth

  // 1. Min font size & contrast
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let minFontSize = 999
  let smallestElementText = ''
  const contrastFailures: ContrastFailure[] = []
  let contrastPassCount = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = node.textContent?.trim() ?? ''
    if (text.length === 0) continue

    const el = node.parentElement
    if (!el || el.offsetParent === null) continue // Skip hidden elements

    const style = window.getComputedStyle(el)
    const fs = parseFloat(style.fontSize)
    if (fs < minFontSize) {
      minFontSize = fs
      smallestElementText = text.slice(0, 30)
    }

    // Check contrast
    const [fr, fg, fb] = parseColor(style.color)
    const [br, bg, bb] = findEffectiveBg(el)
    const ratio = Math.round(getContrastRatio([fr, fg, fb], [br, bg, bb]) * 100) / 100
    const required = fs >= 24 ? 3.0 : 4.5

    if (ratio < required) {
      contrastFailures.push({
        text: text.slice(0, 30),
        color: style.color,
        bgColor: `rgb(${br},${bg},${bb})`,
        ratio,
        required,
        fontSize: fs,
        element: el.tagName,
      })
    } else {
      contrastPassCount++
    }
  }

  // 2. Hero check
  const heroEl = document.querySelector('.tile-hero') as HTMLElement | null
  const heroBgImage = heroEl ? window.getComputedStyle(heroEl).backgroundImage : 'none'
  const countdownEl = heroEl?.querySelector('[role="timer"] span') as HTMLElement | null
  let heroContrast = 0
  if (countdownEl) {
    const style = window.getComputedStyle(countdownEl)
    const [fr, fg, fb] = parseColor(style.color)
    heroContrast = Math.round(getContrastRatio([fr, fg, fb], [15, 63, 130]) * 100) / 100
  }

  // 3. Tile clipping
  const tiles = Array.from(document.querySelectorAll('.rounded-tile')) as HTMLElement[]
  const tileClippings = tiles.map((tile, i) => {
    const isClipped = tile.scrollHeight > tile.clientHeight + 1
    return {
      title: (tile.querySelector('h3, h2, h4')?.textContent?.trim() || `Tile ${i + 1}`).slice(0, 30),
      scrollHeight: tile.scrollHeight,
      clientHeight: tile.clientHeight,
      isClipped,
    }
  })

  // 4. Row 1 and Row 2 heights
  const rowElements = Array.from(document.querySelectorAll('.grid')) as HTMLElement[]
  const row1Height = rowElements[0]?.clientHeight ?? 0
  const row2Height = rowElements[1]?.clientHeight ?? 0

  return {
    viewport: { width: innerWidth, height: innerHeight },
    scrollHeight,
    innerHeight,
    isPageNoVerticalScroll: scrollHeight <= innerHeight,
    scrollWidth,
    innerWidth,
    isPageNoHorizontalScroll: scrollWidth <= innerWidth,
    minFontSize: minFontSize === 999 ? 12 : minFontSize,
    smallestElementText,
    contrastFailures,
    contrastPassCount,
    heroBgImage,
    heroContrast,
    tileClippings,
    row1Height,
    row2Height,
  }
}
