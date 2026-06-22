import { useEffect, useRef } from 'react'
import { BeadScene } from '@/three/BeadScene'
import { useBeadStore } from '@/store/beadStore'

export default function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<BeadScene | null>(null)

  const beads = useBeadStore(s => s.beads)
  const layers = useBeadStore(s => s.layers)
  const gridSize = useBeadStore(s => s.gridSize)
  const baseType = useBeadStore(s => s.baseType)
  const calculateCOG = useBeadStore(s => s.calculateCenterOfGravity)

  useEffect(() => {
    if (!containerRef.current) return
    const scene = new BeadScene(containerRef.current)
    sceneRef.current = scene
    scene.setBase(baseType, gridSize)

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setBase(baseType, gridSize)
  }, [baseType, gridSize])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const cog = calculateCOG()
    const hiddenLayers = new Set(layers.filter(l => !l.visible).map(l => l.index))
    scene.updateBeads(beads, gridSize, cog.warningCells, hiddenLayers)
    scene.updateCog(cog, baseType)
  }, [beads, layers, gridSize, baseType, calculateCOG])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-100 select-none"
      style={{ touchAction: 'none' }}
    />
  )
}
