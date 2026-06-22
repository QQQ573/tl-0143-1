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
  private baseGroup: THREE.Group | null = null
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

  private createKeychainBase(dim: typeof BASE_DIMENSIONS.keychain): THREE.Group {
    const group = new THREE.Group()
    const { width, depth, height, offsetX, offsetZ } = dim

    const baseShape = new THREE.Shape()
    const r = 0.6
    const w = width / 2 - r
    const d = depth / 2 - r
    baseShape.absarc(w, d, r, 0, Math.PI / 2)
    baseShape.absarc(-w, d, r, Math.PI / 2, Math.PI)
    baseShape.absarc(-w, -d, r, Math.PI, Math.PI * 1.5)
    baseShape.absarc(w, -d, r, Math.PI * 1.5, Math.PI * 2)

    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 3,
    }
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, extrudeSettings)
    baseGeo.rotateX(-Math.PI / 2)
    baseGeo.translate(offsetX, -height, offsetZ)

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.6,
      metalness: 0.15,
    })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.castShadow = true
    baseMesh.receiveShadow = true
    group.add(baseMesh)

    const hangerGeo = new THREE.TorusGeometry(0.35, 0.08, 12, 24)
    const hangerMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    })
    const hanger = new THREE.Mesh(hangerGeo, hangerMat)
    hanger.rotation.y = Math.PI / 2
    hanger.position.set(offsetX, -height / 2 - 0.5, offsetZ - depth / 2)
    hanger.castShadow = true
    group.add(hanger)

    const linkGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12)
    const link = new THREE.Mesh(linkGeo, hangerMat)
    link.position.set(offsetX, -height / 2 - 0.3, offsetZ - depth / 2 + 0.35)
    link.rotation.x = Math.PI / 2
    group.add(link)

    return group
  }

  private createOrnamentBase(dim: typeof BASE_DIMENSIONS.ornament): THREE.Group {
    const group = new THREE.Group()
    const { width, depth, height, offsetX, offsetZ } = dim

    const cylGeo = new THREE.CylinderGeometry(
      Math.min(width, depth) / 2,
      Math.min(width, depth) / 2 + 0.15,
      height,
      48,
      2,
      false,
    )
    const cylMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.7,
      metalness: 0.1,
    })
    const base = new THREE.Mesh(cylGeo, cylMat)
    base.position.set(offsetX, -height / 2, offsetZ)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    const rimGeo = new THREE.TorusGeometry(Math.min(width, depth) / 2, 0.06, 12, 48)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8d6e63,
      roughness: 0.5,
      metalness: 0.2,
    })
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.rotation.x = Math.PI / 2
    rim.position.set(offsetX, -0.02, offsetZ)
    rim.receiveShadow = true
    group.add(rim)

    const ridgeGeo = new THREE.CylinderGeometry(
      Math.min(width, depth) / 2 - 0.15,
      Math.min(width, depth) / 2 - 0.12,
      0.08,
      48,
    )
    const ridge = new THREE.Mesh(ridgeGeo, rimMat)
    ridge.position.set(offsetX, -height + 0.04, offsetZ)
    group.add(ridge)

    return group
  }

  private createPhoneStandBase(dim: typeof BASE_DIMENSIONS.phonestand): THREE.Group {
    const group = new THREE.Group()
    const { width, depth, height, offsetX, offsetZ } = dim

    const baseGeo = new THREE.BoxGeometry(width, height, depth)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 0.65,
      metalness: 0.1,
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.set(offsetX, -height / 2, offsetZ)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    const backHeight = 4.5
    const backThickness = 0.4
    const backGeo = new THREE.BoxGeometry(width, backHeight, backThickness)
    const back = new THREE.Mesh(backGeo, baseMat)
    back.position.set(
      offsetX,
      -height / 2 + backHeight / 2,
      offsetZ + depth / 2 - backThickness / 2,
    )
    back.rotation.x = -0.25
    back.castShadow = true
    back.receiveShadow = true
    group.add(back)

    const ledgeGeo = new THREE.BoxGeometry(width, 0.5, 0.8)
    const ledge = new THREE.Mesh(ledgeGeo, baseMat)
    ledge.position.set(
      offsetX,
      -height / 2 + 0.25,
      offsetZ - depth / 2 + 0.4,
    )
    ledge.castShadow = true
    ledge.receiveShadow = true
    group.add(ledge)

    const padGeo = new THREE.BoxGeometry(width - 0.4, 0.06, depth - 1.5)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.9,
      metalness: 0,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(offsetX, -height / 2 + height + 0.03, offsetZ)
    pad.receiveShadow = true
    group.add(pad)

    return group
  }

  setBase(type: BaseType, gridSize: number) {
    if (this.baseGroup) {
      this.scene.remove(this.baseGroup)
      this.baseGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
    }
    if (this.baseRangeCircle) {
      this.scene.remove(this.baseRangeCircle)
      this.baseRangeCircle.geometry.dispose()
      ;(this.baseRangeCircle.material as THREE.Material).dispose()
    }

    const dim = BASE_DIMENSIONS[type]

    if (type === 'keychain') {
      this.baseGroup = this.createKeychainBase(dim as typeof BASE_DIMENSIONS.keychain)
    } else if (type === 'ornament') {
      this.baseGroup = this.createOrnamentBase(dim as typeof BASE_DIMENSIONS.ornament)
    } else {
      this.baseGroup = this.createPhoneStandBase(dim as typeof BASE_DIMENSIONS.phonestand)
    }
    this.scene.add(this.baseGroup)

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

    if (this.baseGroup) {
      this.scene.remove(this.baseGroup)
      this.baseGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
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
