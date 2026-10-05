import type { BodyRegion, BodyViewData } from './types'
import backJson from './back.json'

export const BACK_REGIONS: BodyRegion[] = backJson as unknown as BodyRegion[]

export const BACK_VIEW: BodyViewData = {
  view: 'back',
  imageWidth: 896,
  imageHeight: 1200,
  silhouette: [],
  regions: BACK_REGIONS,
}
