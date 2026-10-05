/**
 * TRAUMABRIDGE AI — Bodymap Anatomical Coordinate & Region Types
 * Natural coordinate system: 896 x 1200 px
 */

export type BodySide = 'left' | 'right' | 'mid'
export type CalloutSide = 'left' | 'right'

export interface BodyRegion {
  id: string
  label: string
  side: BodySide
  polygon: [number, number][] // Natural image coordinates [x, y] in 896x1200
  anchor: [number, number]   // Natural image coordinates [x, y] inside polygon
  calloutSide: CalloutSide   // Which gutter ('left' | 'right') the callout sits in
}

export interface BodyViewData {
  view: 'front' | 'back' | 'side'
  imageWidth: number
  imageHeight: number
  silhouette: [number, number][]
  regions: BodyRegion[]
}
