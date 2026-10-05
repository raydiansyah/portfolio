import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion,
  Vector3, type IUniform,
} from 'three'

/**
 * Morning birds: a small flock occasionally crosses the sky.
 * Wings flap in the vertex shader (wing-tip vertices carry aWing = 1).
 */
export class Birds {
  readonly mesh: InstancedMesh
  private count: number
  private flock = { active: false, t: 0, duration: 26, from: new Vector3(), to: new Vector3(), next: 6 }
  private offsets: Vector3[] = []
  private m = new Matrix4()
  private q = new Quaternion()
  private p = new Vector3()
  private s = new Vector3(1, 1, 1)
  private mat: MeshBasicMaterial

  constructor(count: number, time: IUniform<number>) {
    this.count = count
    // Simple "V" silhouette: body point + two wing tips.
    const pos = [0, 0, 0.35, -1.1, 0, -0.2, 0, 0, -0.1, 0, 0, 0.35, 0, 0, -0.1, 1.1, 0, -0.2]
    const wing = [0, 1, 0, 0, 0, 1]
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('aWing', new Float32BufferAttribute(wing, 1))
    this.mat = new MeshBasicMaterial({ color: '#3a4148', side: DoubleSide, transparent: true, opacity: 0.8, fog: false })
    this.mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aWing;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float ph = instanceMatrix[3][0] * 0.37;
          transformed.y += sin(uTime * 9.0 + ph) * 0.55 * aWing;`,
        )
    }
    this.mesh = new InstancedMesh(geo, this.mat, Math.max(1, count))
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    for (let i = 0; i < count; i++) {
      // Loose V formation.
      const row = Math.ceil(i / 2)
      const side = i % 2 ? 1 : -1
      this.offsets.push(new Vector3(side * row * 2.2 + Math.random(), Math.random() * 1.5, -row * 2.4))
    }
  }

  update(dt: number, camera: Vector3, amount: number) {
    if (this.count === 0) return
    const f = this.flock
    if (!f.active) {
      f.next -= dt
      this.mesh.count = 0
      if (f.next > 0 || amount < 0.5) return
      // Start a crossing that passes in front of the camera at altitude.
      const a = Math.random() * Math.PI * 2
      const h = 32 + Math.random() * 20
      f.from.set(camera.x + Math.sin(a) * 160, h, camera.z + Math.cos(a) * 160)
      f.to.set(camera.x - Math.sin(a) * 160, h + 6, camera.z - Math.cos(a) * 160)
      f.t = 0
      f.active = true
    }
    f.t += dt / f.duration
    if (f.t >= 1) {
      f.active = false
      f.next = 25 + Math.random() * 20
      return
    }
    this.mesh.count = this.count
    const dir = this.p.subVectors(f.to, f.from).normalize()
    this.q.setFromUnitVectors(FORWARD, dir)
    const centre = new Vector3().lerpVectors(f.from, f.to, f.t)
    this.offsets.forEach((o, i) => {
      const wp = o.clone().applyQuaternion(this.q).add(centre)
      this.m.compose(wp, this.q, this.s.setScalar(0.9))
      this.mesh.setMatrixAt(i, this.m)
    })
    this.mesh.instanceMatrix.needsUpdate = true
    this.mat.opacity = 0.75 * amount
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mat.dispose()
  }
}

const FORWARD = new Vector3(0, 0, 1)
