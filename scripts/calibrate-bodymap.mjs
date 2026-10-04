import fs from 'node:fs'
import path from 'node:path'
import polygonClipping from 'polygon-clipping'

/**
 * Geometric helper functions
 */
function shoelaceArea(points) {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area) / 2
}

function polyArea(multiPoly) {
  let total = 0
  for (const poly of multiPoly) {
    for (let r = 0; r < poly.length; r++) {
      const ringArea = shoelaceArea(poly[r])
      if (r === 0) total += ringArea
      else total -= ringArea // hole
    }
  }
  return total
}

function pointInPolygon(pt, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
      (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function minDistanceToEdge(pt, ring) {
  let minDist = Infinity
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length
    const p1 = ring[i]
    const p2 = ring[j]
    const dist = distToSegment(pt, p1, p2)
    if (dist < minDist) minDist = dist
  }
  return minDist
}

function distToSegment(p, v, w) {
  const l2 = (v[0] - w[0])**2 + (v[1] - w[1])**2
  if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1])
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (v[0] + t * (w[0] - v[0])), p[1] - (v[1] + t * (w[1] - v[1])))
}

console.log('Testing geometric engine...')
