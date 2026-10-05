import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * TRAUMABRIDGE AI — Bodymap Tracing & Landmark Extraction Script
 * Uses sharp to process body-front.jpg, body-back.jpg, body-side.jpg
 * Estimates background color, segments the figure, extracts landmarks, and writes silhouette data.
 */

async function processView(filename, viewName) {
  const imgPath = path.resolve('public/images', filename)
  const image = sharp(imgPath)
  const meta = await image.metadata()
  const { width, height } = meta

  // Extract raw RGB pixels
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

  // 1. Estimate background color from 20px border
  let bgR = 0, bgG = 0, bgB = 0, borderCount = 0
  const border = 20

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < border || x >= width - border || y < border || y >= height - border) {
        const idx = (y * width + x) * 3
        bgR += data[idx]
        bgG += data[idx + 1]
        bgB += data[idx + 2]
        borderCount++
      }
    }
  }

  const avgBgR = bgR / borderCount
  const avgBgG = bgG / borderCount
  const avgBgB = bgB / borderCount
  console.log(`[${viewName}] Size: ${width}x${height}, Estimated Background RGB: [${avgBgR.toFixed(1)}, ${avgBgG.toFixed(1)}, ${avgBgB.toFixed(1)}]`)

  // 2. Segment figure: color distance threshold
  const threshold = 18 // distance from background
  const mask = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const dist = Math.sqrt(
        (r - avgBgR) ** 2 +
        (g - avgBgG) ** 2 +
        (b - avgBgB) ** 2
      )
      mask[y * width + x] = dist > threshold ? 255 : 0
    }
  }

  // 3. Find vertical bounds and row stats to locate landmarks
  let headTop = height
  let soleBottom = 0
  const rowCounts = new Int32Array(height)
  const rowLeft = new Int32Array(height).fill(width)
  const rowRight = new Int32Array(height).fill(0)

  for (let y = 0; y < height; y++) {
    let count = 0
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 255) {
        count++
        if (x < rowLeft[y]) rowLeft[y] = x
        if (x > rowRight[y]) rowRight[y] = x
      }
    }
    rowCounts[y] = count
    if (count > 10) {
      if (y < headTop) headTop = y
      if (y > soleBottom) soleBottom = y
    }
  }

  console.log(`[${viewName}] Head Top: y=${headTop}, Sole Bottom: y=${soleBottom}, Total Height: ${soleBottom - headTop}px`)

  // Midline X
  const midlineX = Math.round(width / 2)

  // Find neck: narrowest row between headTop + 40 and headTop + 220
  let neckY = headTop + 140
  let minNeckWidth = width
  for (let y = headTop + 60; y < headTop + 200; y++) {
    const w = rowRight[y] - rowLeft[y]
    if (w > 0 && w < minNeckWidth) {
      minNeckWidth = w
      neckY = y
    }
  }

  // Shoulder line: widest row around neckY to neckY + 120
  let shoulderY = neckY + 60
  let maxShoulderWidth = 0
  for (let y = neckY; y < neckY + 140; y++) {
    const w = rowRight[y] - rowLeft[y]
    if (w > maxShoulderWidth) {
      maxShoulderWidth = w
      shoulderY = y
    }
  }

  // Crotch / perineum: looking between y = 500 and 750 where center pixels are background (bifurcation of legs)
  let crotchY = Math.round(height * 0.52)
  for (let y = Math.round(height * 0.45); y < Math.round(height * 0.65); y++) {
    // Check if middle 10 pixels around midline are background
    let midEmpty = true
    for (let x = midlineX - 5; x <= midlineX + 5; x++) {
      if (mask[y * width + x] === 255) {
        midEmpty = false
        break
      }
    }
    if (midEmpty && rowCounts[y] > 50) {
      crotchY = y
      break
    }
  }

  // Knee center: approximately between crotchY and soleBottom
  const kneeY = Math.round(crotchY + (soleBottom - crotchY) * 0.48)
  const ankleY = Math.round(crotchY + (soleBottom - crotchY) * 0.88)

  console.log(`[${viewName}] Landmarks:
    Head Top: ${headTop}
    Neck: ${neckY}
    Shoulders: ${shoulderY}
    Crotch: ${crotchY}
    Knee: ${kneeY}
    Ankle: ${ankleY}
    Sole: ${soleBottom}
    Midline X: ${midlineX}
  `)

  // Write debug mask PNG
  const maskPngData = Buffer.alloc(width * height)
  for (let i = 0; i < mask.length; i++) {
    maskPngData[i] = mask[i]
  }

  const debugMaskPath = path.resolve(`public/images/debug-mask-${viewName}.png`)
  await sharp(maskPngData, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(debugMaskPath)

  console.log(`[${viewName}] Debug mask saved to ${debugMaskPath}`)

  return {
    viewName,
    width,
    height,
    headTop,
    neckY,
    shoulderY,
    crotchY,
    kneeY,
    ankleY,
    soleBottom,
    midlineX,
  }
}

async function main() {
  const front = await processView('body-front.jpg', 'front')
  const back = await processView('body-back.jpg', 'back')
  const side = await processView('body-side.jpg', 'side')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
