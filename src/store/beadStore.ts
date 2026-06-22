import { create } from 'zustand'
import { calculateCenterOfGravity as computeCOG } from '@/lib/cog'

export const COLOR_PALETTE: Record<string, { hex: string; weight: number; name: string }> = {
  H01: { hex: '#FFFFFF', weight: 1.00, name: '乳白' },
  H02: { hex: '#000000', weight: 1.30, name: '纯黑' },
  H03: { hex: '#FF1744', weight: 1.20, name: '大红' },
  H04: { hex: '#FF9100', weight: 1.15, name: '橙' },
  H05: { hex: '#FFEA00', weight: 1.10, name: '明黄' },
  H06: { hex: '#00E676', weight: 1.10, name: '草绿' },
  H07: { hex: '#00B0FF', weight: 1.10, name: '天蓝' },
  H08: { hex: '#3D5AFE', weight: 1.20, name: '藏青' },
  H09: { hex: '#D500F9', weight: 1.15, name: '紫' },
  H10: { hex: '#FF80AB', weight: 1.10, name: '粉' },
  H11: { hex: '#A1887F', weight: 1.40, name: '深棕' },
  H12: { hex: '#78909C', weight: 1.25, name: '灰' },
  H13: { hex: '#F5F5F5', weight: 1.02, name: '米白' },
  H14: { hex: '#424242', weight: 1.28, name: '深灰' },
  H15: { hex: '#C62828', weight: 1.22, name: '深红' },
  H16: { hex: '#E65100', weight: 1.18, name: '深橙' },
  H17: { hex: '#F9A825', weight: 1.12, name: '金黄' },
  H18: { hex: '#2E7D32', weight: 1.15, name: '深绿' },
  H19: { hex: '#01579B', weight: 1.22, name: '深蓝' },
  H20: { hex: '#4A148C', weight: 1.20, name: '深紫' },
  H21: { hex: '#880E4F', weight: 1.18, name: '玫红' },
  H22: { hex: '#FFCCBC', weight: 1.05, name: '肤' },
  H23: { hex: '#6D4C41', weight: 1.35, name: '咖啡' },
  H24: { hex: '#B0BEC5', weight: 1.15, name: '银灰' },
}

export type BaseType = 'keychain' | 'ornament' | 'phonestand'

export interface Bead {
  id: string
  layer: number
  row: number
  col: number
  colorId: string
  isHanger?: boolean
}

export interface LayerState {
  index: number
  visible: boolean
}

export interface CenterOfGravity {
  x: number
  y: number
  z: number
  projectedX: number
  projectedZ: number
  withinBase: boolean
  overhangRatio: number
  warningCells: Array<{ layer: number; row: number; col: number }>
}

export const BEAD_SIZE = 1
export const BEAD_GAP = 0.05
export const LAYER_HEIGHT = 1.05

export const BASE_DIMENSIONS: Record<BaseType, { width: number; depth: number; height: number; offsetX: number; offsetZ: number }> = {
  keychain: { width: 4.6, depth: 4.6, height: 0.4, offsetX: 0, offsetZ: 0 },
  ornament: { width: 5.8, depth: 5.8, height: 0.6, offsetX: 0, offsetZ: 0 },
  phonestand: { width: 6.0, depth: 8.0, height: 0.8, offsetX: 0, offsetZ: 1.0 },
}

interface StoreState {
  beads: Bead[]
  layers: LayerState[]
  gridSize: number
  currentLayer: number
  currentColor: string
  baseType: BaseType
  hangerPositions: string[]

  addLayer: () => void
  removeLayer: (index: number) => void
  toggleLayerVisibility: (index: number) => void
  setCurrentLayer: (index: number) => void
  setCurrentColor: (colorId: string) => void
  setGridSize: (size: number) => void
  setBaseType: (type: BaseType) => void

  placeBead: (layer: number, row: number, col: number) => void
  removeBead: (layer: number, row: number, col: number) => void
  toggleHanger: (layer: number, row: number, col: number) => void
  clearAll: () => void

  getBeadAt: (layer: number, row: number, col: number) => Bead | undefined
  getVisibleBeads: () => Bead[]
  calculateCenterOfGravity: () => CenterOfGravity
}

const beadId = (layer: number, row: number, col: number) => `b-${layer}-${row}-${col}`

const createInitialLayers = (): LayerState[] => [
  { index: 0, visible: true },
  { index: 1, visible: true },
  { index: 2, visible: true },
]

export const useBeadStore = create<StoreState>((set, get) => ({
  beads: [],
  layers: createInitialLayers(),
  gridSize: 4,
  currentLayer: 0,
  currentColor: 'H03',
  baseType: 'ornament',
  hangerPositions: [],

  addLayer: () => set(s => {
    const maxIdx = s.layers.length > 0 ? Math.max(...s.layers.map(l => l.index)) : -1
    return { layers: [...s.layers, { index: maxIdx + 1, visible: true }] }
  }),

  removeLayer: (index: number) => set(s => ({
    layers: s.layers.filter(l => l.index !== index),
    beads: s.beads.filter(b => b.layer !== index),
    currentLayer: s.currentLayer >= index && s.currentLayer > 0 ? s.currentLayer - 1 : s.currentLayer,
  })),

  toggleLayerVisibility: (index: number) => set(s => ({
    layers: s.layers.map(l => l.index === index ? { ...l, visible: !l.visible } : l),
  })),

  setCurrentLayer: (index: number) => set({ currentLayer: index }),
  setCurrentColor: (colorId: string) => set({ currentColor: colorId }),
  setGridSize: (size: number) => set(s => ({
    gridSize: size,
    beads: s.beads.filter(b => b.row < size && b.col < size),
  })),
  setBaseType: (type: BaseType) => set({ baseType: type }),

  placeBead: (layer: number, row: number, col: number) => set(s => {
    const existing = s.beads.find(b => b.layer === layer && b.row === row && b.col === col)
    if (existing) {
      return {
        beads: s.beads.map(b => b.id === existing.id ? { ...b, colorId: s.currentColor } : b),
      }
    }
    return {
      beads: [...s.beads, {
        id: beadId(layer, row, col),
        layer, row, col,
        colorId: s.currentColor,
      }],
    }
  }),

  removeBead: (layer: number, row: number, col: number) => set(s => ({
    beads: s.beads.filter(b => !(b.layer === layer && b.row === row && b.col === col)),
    hangerPositions: s.hangerPositions.filter(h => h !== beadId(layer, row, col)),
  })),

  toggleHanger: (layer: number, row: number, col: number) => set(s => {
    const id = beadId(layer, row, col)
    const exists = s.hangerPositions.includes(id)
    return {
      hangerPositions: exists
        ? s.hangerPositions.filter(h => h !== id)
        : [...s.hangerPositions, id],
      beads: s.beads.map(b => b.id === id ? { ...b, isHanger: !exists } : b),
    }
  }),

  clearAll: () => set({ beads: [], hangerPositions: [] }),

  getBeadAt: (layer, row, col) => get().beads.find(b => b.layer === layer && b.row === row && b.col === col),

  getVisibleBeads: () => {
    const s = get()
    const visibleIndices = new Set(s.layers.filter(l => l.visible).map(l => l.index))
    return s.beads.filter(b => visibleIndices.has(b.layer))
  },

  calculateCenterOfGravity: () => {
    const s = get()
    return computeCOG(s.beads, s.baseType, s.gridSize)
  },
}))
