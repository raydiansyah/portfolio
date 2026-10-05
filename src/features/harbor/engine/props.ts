import {
  CylinderGeometry, DodecahedronGeometry, Euler, Group, InstancedMesh, Matrix4, MeshLambertMaterial,
  Quaternion, Vector3,
} from 'three'
import type { EnvState } from './theme'
import { rng, type WorldLayout } from './layout'
import { waveHeight } from './waves'

/** Rocks (static) and floating logs (bob on the swell). */
export class Props {
  readonly group = new Group()
  private logs: InstancedMesh
  private logData: WorldLayout['logs']
  private rockMat = new MeshLambertMaterial({ color: '#6d6f6a', flatShading: true })
  private logMat = new MeshLambertMaterial({ color: '#5a4636' })
  private m = new Matrix4()
  private q = new Quaternion()
  private e = new Euler()
  private v = new Vector3()
  private s = new Vector3(1, 1, 1)

  constructor(layout: WorldLayout, shadows: boolean) {
    const rand = rng(99)
    const rocks = new InstancedMesh(new DodecahedronGeometry(1, 0), this.rockMat, Math.max(1, layout.rocks.length))
    layout.rocks.forEach((r, i) => {
      this.e.set(rand() * 3, rand() * 3, rand() * 3)
      this.q.setFromEuler(this.e)
      this.v.set(r.x, -0.15, r.z)
      this.s.set(r.r, r.r * (0.6 + rand() * 0.5), r.r * (0.8 + rand() * 0.4))
      this.m.compose(this.v, this.q, this.s)
      rocks.setMatrixAt(i, this.m)
    })
    rocks.count = layout.rocks.length
    rocks.castShadow = shadows
    rocks.receiveShadow = shadows
    rocks.computeBoundingSphere()

    this.logData = layout.logs
    const logGeo = new CylinderGeometry(0.32, 0.38, 1, 7).rotateX(Math.PI / 2)
    this.logs = new InstancedMesh(logGeo, this.logMat, Math.max(1, layout.logs.length))
    this.logs.count = layout.logs.length
    this.logs.frustumCulled = false
    this.update(0)

    this.group.add(rocks, this.logs)
  }

  /** Logs ride the swell with a slight drift in yaw. */
  update(t: number) {
    this.logData.forEach((l, i) => {
      const y = waveHeight(l.x, l.z, t) - 0.1
      this.e.set(Math.sin(t * 0.7 + i) * 0.04, l.yaw + Math.sin(t * 0.05 + i) * 0.15, Math.sin(t * 0.9 + i * 2) * 0.05)
      this.q.setFromEuler(this.e)
      this.v.set(l.x, y, l.z)
      this.s.set(1, 1, l.length)
      this.m.compose(this.v, this.q, this.s)
      this.logs.setMatrixAt(i, this.m)
    })
    this.logs.instanceMatrix.needsUpdate = true
  }

  applyEnv(env: EnvState) {
    this.rockMat.color.set('#6d6f6a').multiply(env.foliage)
    this.logMat.color.set('#5a4636').multiply(env.foliage)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof InstancedMesh) o.geometry.dispose()
    })
    this.rockMat.dispose()
    this.logMat.dispose()
  }
}
