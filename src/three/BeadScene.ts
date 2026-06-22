import * as THREE from 'three'
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

export class BeadScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  container: HTMLElement

  private beadGroup: THREE.Group
  private baseMesh: THREE.Mesh | null = null
  private cogMarker: THREE.Mesh | null = null
  private cogProjection: THREE.Mesh | null = null
  private baseRangeCircle: THREE.Mesh | null = null
  private beadMeshes: Map<string, THREE.Mesh> = new Map()
  private warningBeads: Set<string> = new Set()
  private animationId: number = 0

  private isDragging = false
  private isPinching = false
  private previousMouse = { x: 0, y: 0 }
  private previousPinchDistance = 0
  private spherical = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 }
  private targetLookAt = new THREE.Vector3(0, 2, 0)

  private resizeObserver: ResizeObserver | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf5f5f7)

    const { clientWidth, clientHeight } = container
    this.camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 1000)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(clientWidth, clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.beadGroup = new THREE.Group()
    this.scene.add(this.beadGroup)

    this.setupLights()
    this.updateCamera()
    this.setupInteraction()
    this.animate()

    this.resizeObserver = new ResizeObserver(() => this.onResize())
    this.resizeObserver.observe(container)
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(8, 12, 6)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    dirLight.shadow.camera.left = -15
    dirLight.shadow.camera.right = 15
    dirLight.shadow.camera.top = 15
    dirLight.shadow.camera.bottom = -15
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3)
    fillLight.position.set(-6, 4, -6)
    this.scene.add(fillLight)
  }

  private updateCamera() {
    const { radius, theta, phi } = this.spherical
    this.camera.position.set(
      this.targetLookAt.x + radius * Math.sin(phi) * Math.cos(theta),
      this.targetLookAt.y + radius * Math.cos(phi),
      this.targetLookAt.z + radius * Math.sin(phi) * Math.sin(theta),
    )
    this.camera.lookAt(this.targetLookAt)
  }

  private onResize() {
    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)
  }

  private setupInteraction() {
    const dom = this.renderer.domElement
    dom.style.touchAction = 'none'

    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerup', this.onPointerUp)
    dom.addEventListener('pointercancel', this.onPointerUp)
    dom.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private activePointers: Map<number, { x: number; y: number }> = new Map()

  private onPointerDown = (e: PointerEvent) => {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (this.activePointers.size >= 2) {
      this.isPinching = true
      this.isDragging = false
      const pts = Array.from(this.activePointers.values())
      this.previousPinchDistance = this.pinchDistance(pts[0], pts[1])
    } else {
      this.isDragging = true
      this.previousMouse = { x: e.clientX, y: e.clientY }
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.activePointers.has(e.pointerId)) return
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.isPinching && this.activePointers.size >= 2) {
      const pts = Array.from(this.activePointers.values())
      const dist = this.pinchDistance(pts[0], pts[1])
      const delta = this.previousPinchDistance - dist
      this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius + delta * 0.05, 5, 40)
      this.previousPinchDistance = dist
      this.updateCamera()
    } else if (this.isDragging && this.activePointers.size === 1) {
      const dx = e.clientX - this.previousMouse.x
      const dy = e.clientY - this.previousMouse.y
      this.spherical.theta -= dx * 0.008
      this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi - dy * 0.008, 0.1, Math.PI - 0.1)
      this.previousMouse = { x: e.clientX, y: e.clientY }
      this.updateCamera()
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId)
    if (this.activePointers.size < 2) this.isPinching = false
    if (this.activePointers.size === 0) this.isDragging = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius + e.deltaY * 0.01,
      5, 40,
    )
    this.updateCamera()
  }

  private pinchDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)
    this.renderer.render(this.scene, this.camera)
  }

  setBase(type: BaseType, gridSize: number) {
    if (this.baseMesh) {
      this.scene.remove(this.baseMesh)
      this.baseMesh.geometry.dispose()
      ;(this.baseMesh.material as THREE.Material).dispose()
    }
    if (this.baseRangeCircle) {
      this.scene.remove(this.baseRangeCircle)
      this.baseRangeCircle.geometry.dispose()
      ;(this.baseRangeCircle.material as THREE.Material).dispose()
    }

    const dim = BASE_DIMENSIONS[type]
    const geometry = new THREE.BoxGeometry(dim.width, dim.height, dim.depth)
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7,
      metalness: 0.1,
    })
    this.baseMesh = new THREE.Mesh(geometry, material)
    this.baseMesh.position.set(dim.offsetX, -dim.height / 2, dim.offsetZ)
    this.baseMesh.receiveShadow = true
    this.baseMesh.castShadow = true
    this.scene.add(this.baseMesh)

    const ringGeo = new THREE.RingGeometry(
      Math.min(dim.width, dim.depth) / 2 * 1.15,
      Math.min(dim.width, dim.depth) / 2 * 1.15 + 0.04,
      64,
    )
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    this.baseRangeCircle = new THREE.Mesh(ringGeo, ringMat)
    this.baseRangeCircle.rotation.x = -Math.PI / 2
    this.baseRangeCircle.position.set(dim.offsetX, -dim.height + 0.01, dim.offsetZ)
    this.scene.add(this.baseRangeCircle)

    const half = (gridSize - 1) / 2
    this.targetLookAt.set(dim.offsetX, half * LAYER_HEIGHT, dim.offsetZ)
    this.updateCamera()
  }

  clearBeads() {
    for (const mesh of this.beadMeshes.values()) {
      this.beadGroup.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.beadMeshes.clear()
    this.warningBeads.clear()
  }

  updateBeads(
    beads: Bead[],
    gridSize: number,
    warningCells: Array<{ layer: number; row: number; col: number }>,
    hiddenLayers: Set<number>,
  ) {
    const half = (gridSize - 1) / 2
    const step = BEAD_SIZE + BEAD_GAP
    const warningSet = new Set(warningCells.map(c => `b-${c.layer}-${c.row}-${c.col}`))
    this.warningBeads = warningSet

    const currentIds = new Set(beads.map(b => b.id))
    for (const [id, mesh] of this.beadMeshes) {
      if (!currentIds.has(id)) {
        this.beadGroup.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        this.beadMeshes.delete(id)
      }
    }

    for (const bead of beads) {
      const color = COLOR_PALETTE[bead.colorId] || COLOR_PALETTE.H01
      const isWarning = warningSet.has(bead.id)
      const isHidden = hiddenLayers.has(bead.layer)

      let mesh = this.beadMeshes.get(bead.id)
      if (!mesh) {
        const geo = new THREE.BoxGeometry(BEAD_SIZE * 0.9, BEAD_SIZE * 0.9, BEAD_SIZE * 0.9)
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color.hex),
          roughness: 0.5,
          metalness: 0.05,
          transparent: true,
          opacity: isHidden ? 0.15 : 1,
        })
        mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true
        this.beadGroup.add(mesh)
        this.beadMeshes.set(bead.id, mesh)
      } else {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.set(isWarning ? 0xff8800 : color.hex)
        mat.opacity = isHidden ? 0.15 : 1
      }

      mesh.position.set(
        (bead.col - half) * step,
        bead.layer * LAYER_HEIGHT,
        (bead.row - half) * step,
      )
    }

    if (this.cogProjection) {
      const dim = BASE_DIMENSIONS.keychain
      this.cogProjection.position.y = -dim.height + 0.02
    }
  }

  updateCog(cog: CenterOfGravity, baseType: BaseType) {
    const dim = BASE_DIMENSIONS[baseType]

    if (!this.cogMarker) {
      const geo = new THREE.SphereGeometry(0.18, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff1744,
        transparent: true,
        opacity: 0.9,
      })
      this.cogMarker = new THREE.Mesh(geo, mat)
      this.scene.add(this.cogMarker)

      const pGeo = new THREE.CircleGeometry(0.22, 24)
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xff1744,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
      this.cogProjection = new THREE.Mesh(pGeo, pMat)
      this.cogProjection.rotation.x = -Math.PI / 2
      this.scene.add(this.cogProjection)
    }

    this.cogMarker.visible = true
    this.cogProjection.visible = true

    this.cogMarker.position.set(
      cog.x + dim.offsetX,
      cog.y,
      cog.z + dim.offsetZ,
    )
    this.cogProjection.position.set(
      cog.projectedX + dim.offsetX,
      -dim.height + 0.02,
      cog.projectedZ + dim.offsetZ,
    )

    const color = cog.withinBase ? 0x00c853 : 0xff1744
    ;(this.cogMarker.material as THREE.MeshBasicMaterial).color.setHex(color)
    ;(this.cogProjection.material as THREE.MeshBasicMaterial).color.setHex(color)
  }

  setLayerOpacity(layerIndex: number, visible: boolean) {
    for (const [id, mesh] of this.beadMeshes) {
      const parts = id.split('-')
      const l = parseInt(parts[1], 10)
      if (l === layerIndex) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = visible ? (this.warningBeads.has(id) ? 1 : 1) : 0.1
        mat.transparent = true
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationId)
    const dom = this.renderer.domElement
    dom.removeEventListener('pointerdown', this.onPointerDown)
    dom.removeEventListener('pointermove', this.onPointerMove)
    dom.removeEventListener('pointerup', this.onPointerUp)
    dom.removeEventListener('pointercancel', this.onPointerUp)
    dom.removeEventListener('wheel', this.onWheel)

    this.resizeObserver?.disconnect()
    this.clearBeads()

    if (this.baseMesh) {
      this.baseMesh.geometry.dispose()
      ;(this.baseMesh.material as THREE.Material).dispose()
    }
    if (this.cogMarker) {
      this.cogMarker.geometry.dispose()
      ;(this.cogMarker.material as THREE.Material).dispose()
    }
    if (this.cogProjection) {
      this.cogProjection.geometry.dispose()
      ;(this.cogProjection.material as THREE.Material).dispose()
    }
    if (this.baseRangeCircle) {
      this.baseRangeCircle.geometry.dispose()
      ;(this.baseRangeCircle.material as THREE.Material).dispose()
    }
    this.renderer.dispose()
    if (dom.parentElement) dom.parentElement.removeChild(dom)
  }
}
