import * as THREE from 'three'
import { BASE_DIMENSIONS, type BaseType } from '@/store/beadStore'

export function createKeychainBase(dim: typeof BASE_DIMENSIONS.keychain): THREE.Group {
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

export function createOrnamentBase(dim: typeof BASE_DIMENSIONS.ornament): THREE.Group {
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

export function createPhoneStandBase(dim: typeof BASE_DIMENSIONS.phonestand): THREE.Group {
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

export function createBaseByType(type: BaseType): THREE.Group {
  const dim = BASE_DIMENSIONS[type]
  if (type === 'keychain') {
    return createKeychainBase(dim as typeof BASE_DIMENSIONS.keychain)
  } else if (type === 'ornament') {
    return createOrnamentBase(dim as typeof BASE_DIMENSIONS.ornament)
  } else {
    return createPhoneStandBase(dim as typeof BASE_DIMENSIONS.phonestand)
  }
}
