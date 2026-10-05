import {
  Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, type BufferAttribute, type InterleavedBufferAttribute, ConeGeometry, Group, Material, Mesh, MeshStandardMaterial,
  Vector3, type Object3D,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { BoatLights } from './boatLights'
import type { BoatState } from './physics'
import { waveHeight, waveNormal } from './waves'

/** Visual boat: GLB model (with a low-poly proxy while loading) riding the swell. */

const BOAT_LENGTH = 8
/** Fraction of hull height (without mast) that sits below the waterline. */
const DRAFT = 0.55

export class BoatVisual {
  readonly root = new Group()
  /** Pitch/roll pivot inside root. */
  private hull = new Group()
  private proxy: Group
  readonly lights: BoatLights
  private pitch = 0
  private roll = 0
  private lastSpeed = 0

  constructor(reducedMotion: boolean) {
    this.proxy = this.buildProxy()
    this.hull.add(this.proxy)
    this.root.add(this.hull)
    // Navigation lights + deck lamp ride on the pitch/roll pivot with the hull.
    this.lights = new BoatLights(reducedMotion)
    this.hull.add(this.lights.group)
  }

  private buildProxy() {
    const g = new Group()
    const mat = new MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.6 })
    const hull = new Mesh(new BoxGeometry(2.2, 1, 6.5), mat)
    hull.position.y = 0.2
    const bow = new Mesh(new ConeGeometry(1.1, 1.8, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), mat)
    bow.position.set(0, 0.2, 4.1)
    g.add(hull, bow)
    return g
  }

  async load(url: string, onProgress: (p: number) => void, shadows: boolean) {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total))
    const model = this.normalise(gltf.scene)
    model.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = shadows
        o.receiveShadow = false
      }
    })
    this.hull.remove(this.proxy)
    disposeTree(this.proxy)
    this.lights.place(new Box3().setFromObject(model))
    this.hull.add(model)
  }

  /**
   * The source is a 3ds Max export: Z-up, centimetres, ~40 meshes.
   * Merge meshes per material (fewer draw calls), rotate to Y-up, point the bow
   * along +Z, scale to BOAT_LENGTH and drop it to its waterline.
   */
  private normalise(scene: Object3D) {
    scene.updateMatrixWorld(true)
    const byMaterial = new Map<Material, BufferGeometry[]>()
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return
      // Meshopt stores quantised int16 attributes; expand to float before transforming,
      // otherwise world-space values would clamp to the normalised range.
      const src = o.geometry as BufferGeometry
      const g = new BufferGeometry()
      g.setAttribute('position', toFloat(src.getAttribute('position')))
      if (src.getAttribute('normal')) g.setAttribute('normal', toFloat(src.getAttribute('normal')))
      if (src.index) g.setIndex(src.index.clone())
      g.applyMatrix4(o.matrixWorld)
      if (!g.getAttribute('normal')) g.computeVertexNormals()
      const list = byMaterial.get(o.material as Material) ?? []
      list.push(g.index ? g.toNonIndexed() : g)
      byMaterial.set(o.material as Material, list)
    })

    const model = new Group()
    for (const [mat, geos] of byMaterial) {
      const merged = mergeGeometries(geos)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      model.add(new Mesh(merged, tuneMaterial(mat)))
    }

    // Z-up -> Y-up; the hull's long axis is X, so turn it to face +Z.
    model.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
    model.updateMatrixWorld(true)
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const s = BOAT_LENGTH / Math.max(size.x, size.z)
    model.scale.setScalar(s)
    model.updateMatrixWorld(true)
    box.setFromObject(model)
    const centre = box.getCenter(new Vector3())
    // Hull height is roughly a quarter of the full height (the rest is mast).
    const hullHeight = (box.max.y - box.min.y) * 0.24
    model.position.set(-centre.x, -box.min.y - hullHeight * DRAFT, -centre.z)
    const wrapper = new Group()
    wrapper.add(model)
    return wrapper
  }

  /** Place on the swell: pitch/roll from the surface normal plus lean from turning and accelerating. */
  update(state: BoatState, t: number, dt: number, reduced: boolean) {
    const fx = Math.sin(state.yaw)
    const fz = Math.cos(state.yaw)
    const y = waveHeight(state.x, state.z, t)
    const n = waveNormal(state.x, state.z, t)
    // Project normal onto boat axes.
    const nf = n.x * fx + n.z * fz
    const ns = n.x * fz - n.z * fx
    const accel = (state.speed - this.lastSpeed) / Math.max(dt, 1e-3)
    this.lastSpeed = state.speed
    const wave = reduced ? 0.4 : 1
    const targetPitch = -nf * 1.4 * wave - accel * 0.006 - state.speed * 0.004
    const targetRoll = ns * 1.4 * wave - state.yawRate * state.speed * 0.06
    const k = Math.min(1, dt * 4)
    this.pitch += (targetPitch - this.pitch) * k
    this.roll += (targetRoll - this.roll) * k
    this.root.position.set(state.x, y + (reduced ? 0 : Math.sin(t * 1.7) * 0.04), state.z)
    this.root.rotation.y = state.yaw
    this.hull.rotation.set(this.pitch, 0, this.roll)
    this.lights.update()
  }

  /** World-space stern position for wake samples. */
  stern(state: BoatState, out: Vector3) {
    return out.set(state.x - Math.sin(state.yaw) * BOAT_LENGTH * 0.45, 0, state.z - Math.cos(state.yaw) * BOAT_LENGTH * 0.45)
  }

  dispose() {
    this.lights.dispose()
    disposeTree(this.root)
  }
}

function toFloat(attr: BufferAttribute | InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize)
  for (let i = 0; i < attr.count; i++) {
    for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.getComponent(i, k)
  }
  return new Float32BufferAttribute(out, attr.itemSize)
}

function tuneMaterial(src: Material): Material {
  // Source materials are Phong-like exports; give them a calmer physical look.
  const m = src as MeshStandardMaterial
  if ('roughness' in m) {
    m.roughness = m.transparent ? 0.1 : Math.max(0.35, m.roughness ?? 0.5)
    m.metalness = Math.min(0.3, m.metalness ?? 0)
  }
  return m
}

function disposeTree(o: Object3D) {
  o.traverse((c) => {
    if (c instanceof Mesh) {
      c.geometry.dispose()
      const mats = Array.isArray(c.material) ? c.material : [c.material]
      mats.forEach((m: Material) => m.dispose())
    }
  })
}
