/**
 * TRAUMABRIDGE AI — Bodymap Region Compatibility Map
 * Maps ambulance and store identifiers (e.g. "head", "chest-left", "pelvis", "upper-back")
 * to calibrated view and region IDs.
 */

export interface RegionMapping {
  regionId: string
  view: 'front' | 'back' | 'side'
  label: string
}

export const REGION_COMPAT_MAP: Record<string, RegionMapping> = {
  // Front Head / Neck / Torso
  'head': { regionId: 'head', view: 'front', label: 'Head (Cranium)' },
  'face': { regionId: 'face', view: 'front', label: 'Face' },
  'neck': { regionId: 'neck', view: 'front', label: 'Neck' },
  'chest': { regionId: 'chest-l', view: 'front', label: 'Chest (Left)' },
  'chest-left': { regionId: 'chest-l', view: 'front', label: 'Chest (Left)' },
  'chest_left': { regionId: 'chest-l', view: 'front', label: 'Chest (Left)' },
  'chest-right': { regionId: 'chest-r', view: 'front', label: 'Chest (Right)' },
  'chest_right': { regionId: 'chest-r', view: 'front', label: 'Chest (Right)' },
  'abdomen': { regionId: 'upper-abdomen', view: 'front', label: 'Upper Abdomen' },
  'upper-abdomen': { regionId: 'upper-abdomen', view: 'front', label: 'Upper Abdomen' },
  'lower-abdomen': { regionId: 'lower-abdomen', view: 'front', label: 'Lower Abdomen' },
  'pelvis': { regionId: 'pelvis-groin', view: 'front', label: 'Pelvis / Groin' },
  'pelvis-groin': { regionId: 'pelvis-groin', view: 'front', label: 'Pelvis / Groin' },

  // Front Arms
  'shoulder-right': { regionId: 'shoulder-r', view: 'front', label: 'Shoulder (Right)' },
  'shoulder-left': { regionId: 'shoulder-l', view: 'front', label: 'Shoulder (Left)' },
  'upper-arm-right': { regionId: 'upper-arm-r', view: 'front', label: 'Upper Arm (Right)' },
  'upper-arm-left': { regionId: 'upper-arm-l', view: 'front', label: 'Upper Arm (Left)' },
  'forearm-right': { regionId: 'forearm-r', view: 'front', label: 'Forearm (Right)' },
  'forearm-left': { regionId: 'forearm-l', view: 'front', label: 'Forearm (Left)' },
  'hand-right': { regionId: 'hand-r', view: 'front', label: 'Hand (Right)' },
  'hand-left': { regionId: 'hand-l', view: 'front', label: 'Hand (Left)' },

  // Front Legs
  'right-upper-leg': { regionId: 'thigh-r', view: 'front', label: 'Thigh (Right)' },
  'left-upper-leg': { regionId: 'thigh-l', view: 'front', label: 'Thigh (Left)' },
  'thigh-right': { regionId: 'thigh-r', view: 'front', label: 'Thigh (Right)' },
  'thigh-left': { regionId: 'thigh-l', view: 'front', label: 'Thigh (Left)' },
  'right-lower-leg': { regionId: 'shin-r', view: 'front', label: 'Shin / Lower Leg (Right)' },
  'left-lower-leg': { regionId: 'shin-l', view: 'front', label: 'Shin / Lower Leg (Left)' },
  'shin-right': { regionId: 'shin-r', view: 'front', label: 'Shin / Lower Leg (Right)' },
  'shin-left': { regionId: 'shin-l', view: 'front', label: 'Shin / Lower Leg (Left)' },
  'knee-right': { regionId: 'knee-r', view: 'front', label: 'Knee (Right)' },
  'knee-left': { regionId: 'knee-l', view: 'front', label: 'Knee (Left)' },
  'foot-right': { regionId: 'foot-r', view: 'front', label: 'Foot (Right)' },
  'foot-left': { regionId: 'foot-l', view: 'front', label: 'Foot (Left)' },

  // Back Regions
  'upper-back': { regionId: 'upper-back-l', view: 'back', label: 'Upper Back (Scapular)' },
  'lower-back': { regionId: 'lower-back-l', view: 'back', label: 'Lower Back' },
  'spine': { regionId: 'spine-cervical-thoracic', view: 'back', label: 'Thoracic Spine' },
  'occiput': { regionId: 'occiput', view: 'back', label: 'Occiput (Posterior Head)' },
  'gluteal': { regionId: 'gluteal-l', view: 'back', label: 'Gluteal Area' },
}

/**
 * Resolve store/ambulance region key to calibrated region and view.
 */
export function resolveRegionMapping(rawRegion: string): RegionMapping | null {
  const normalized = rawRegion.toLowerCase().trim().replace(/\s+/g, '-')
  return REGION_COMPAT_MAP[normalized] ?? null
}
