import {
  BEAD_SIZE,
  BEAD_GAP,
  LAYER_HEIGHT,
  BASE_DIMENSIONS,
  COLOR_PALETTE,
  type Bead,
  type BaseType,
  type CenterOfGravity,
} from '@/store/beadStore'

export function computeWarningCells(
  beads: Bead[],
  baseType: BaseType,
  gridSize: number,
  cogX: number,
  cogZ: number,
): Array<{ layer: number; row: number; col: number }> {
  const base = BASE_DIMENSIONS[baseType]
  const baseHalfW = base.width / 2
  const baseHalfD = base.depth / 2
  const halfGrid = (gridSize - 1) / 2
  const thresholdX = baseHalfW * 1.15
  const thresholdZ = baseHalfD * 1.15

  if (Math.abs(cogX) <= thresholdX && Math.abs(cogZ) <= thresholdZ) {
    return []
  }

  const warningCells: Array<{ layer: number; row: number; col: number }> = []
  const dirX = Math.sign(cogX) || 1
  const dirZ = Math.sign(cogZ) || 1
  const step = BEAD_SIZE + BEAD_GAP

  for (const bead of beads) {
    const bx = (bead.col - halfGrid) * step
    const bz = (bead.row - halfGrid) * step
    if (bx * dirX > baseHalfW * 0.8 || bz * dirZ > baseHalfD * 0.8) {
      warningCells.push({ layer: bead.layer, row: bead.row, col: bead.col })
    }
  }

  return warningCells
}

export function calculateCenterOfGravity(
  beads: Bead[],
  baseType: BaseType,
  gridSize: number,
): CenterOfGravity {
  const base = BASE_DIMENSIONS[baseType]
  const halfGrid = (gridSize - 1) / 2

  if (beads.length === 0) {
    return {
      x: 0, y: 0, z: 0,
      projectedX: 0, projectedZ: 0,
      withinBase: true,
      overhangRatio: 0,
      warningCells: [],
    }
  }

  let totalWeight = 0
  let sumX = 0, sumY = 0, sumZ = 0
  const step = BEAD_SIZE + BEAD_GAP

  for (const bead of beads) {
    const color = COLOR_PALETTE[bead.colorId] || COLOR_PALETTE.H01
    const w = color.weight
    totalWeight += w
    sumX += (bead.col - halfGrid) * step * w
    sumY += bead.layer * LAYER_HEIGHT * w
    sumZ += (bead.row - halfGrid) * step * w
  }

  const cogX = sumX / totalWeight
  const cogY = sumY / totalWeight
  const cogZ = sumZ / totalWeight

  const baseHalfW = base.width / 2
  const baseHalfD = base.depth / 2
  const thresholdX = baseHalfW * 1.15
  const thresholdZ = baseHalfD * 1.15

  const overhangX = Math.max(0, Math.abs(cogX) - baseHalfW)
  const overhangZ = Math.max(0, Math.abs(cogZ) - baseHalfD)
  const maxOverhang = Math.max(overhangX / baseHalfW, overhangZ / baseHalfD)

  const withinBase = Math.abs(cogX) <= thresholdX && Math.abs(cogZ) <= thresholdZ

  const warningCells = computeWarningCells(beads, baseType, gridSize, cogX, cogZ)

  return {
    x: cogX,
    y: cogY,
    z: cogZ,
    projectedX: cogX,
    projectedZ: cogZ,
    withinBase,
    overhangRatio: maxOverhang,
    warningCells,
  }
}
