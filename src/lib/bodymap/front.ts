import type { BodyRegion, BodyViewData } from './types'
import frontJson from './front.json'

export const FRONT_REGIONS: BodyRegion[] = frontJson as unknown as BodyRegion[]

export const FRONT_VIEW: BodyViewData = {
  view: 'front',
  imageWidth: 896,
  imageHeight: 1200,
  silhouette: [],
  regions: FRONT_REGIONS,
}
