import type { BodyRegion, BodyViewData } from './types'
import sideJson from './side.json'

export const SIDE_REGIONS: BodyRegion[] = sideJson as unknown as BodyRegion[]

export const SIDE_VIEW: BodyViewData = {
  view: 'side',
  imageWidth: 896,
  imageHeight: 1200,
  silhouette: [],
  regions: SIDE_REGIONS,
}
