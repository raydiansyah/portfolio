import gsap from 'gsap'
import { DirectionalLight, FogExp2, HemisphereLight, Mesh, PointLight, Scene, Vector3, type WebGLRenderer } from 'three'
import type { EngineHandle } from '../controller'
import { DESTINATION_BY_ID, berthPoint } from '../data/destinations'
import { harborStore, telemetry } from '../store'
import type { DestinationId, InputDevice, QualityTier } from '../types'
import { createAutopilot, pursue, type AutopilotState } from './autopilot'
import { BoatVisual } from './boat'
import { CameraRig } from './cameraRig'
import * as cine from './cinematics'
import { Docks, WoodBuilder } from './docks'
import { InputController } from './input'
import { Islands, type WindUniforms } from './islands'
import { Lanterns } from './lanterns'
import { Landmarks } from './landmarks'
import { buildLayout, WORLD_RADIUS, type WorldLayout } from './layout'
import { buildGrid, findPath, type NavGrid, type Point } from './navigation'
import type { Collider } from './colliders'
import { NavLine } from './navLine'
import { DEFAULT_BOAT, createBoatState, stepBoat, type BoatState } from './physics'
import { Props } from './props'
import { FpsMonitor, nextLowerTier, settingsFor, type QualitySettings } from './quality'
import { Rain } from './rain'
import { Sky } from './sky'
import { Birds } from './birds'
import { blendEnv, createEnv, tweenTheme, type ThemeMix } from './theme'
import { Water } from './water'
import { configureSun, createRenderer, loadSignFonts, pick, waitUntil, writeDebugTelemetry } from './setup'
import * as frameFx from './frame'

export type Intent = { type: 'harbor'; id: DestinationId } | { type: 'project'; index: number }

export interface EngineOptions {
  container: HTMLElement
  isDark: boolean
  reducedMotion: boolean
  tier: QualityTier
  onIntent: (intent: Intent) => void
}

type Mode = 'intro' | 'free' | 'docking' | 'docked' | 'project'

export class HarborEngine implements EngineHandle {
  private opts: EngineOptions
  private renderer: WebGLRenderer
  private scene = new Scene()
  private rig: CameraRig
  private settings: QualitySettings
  private env = createEnv()
  private mix: ThemeMix
  private envDirty = true
  private wind: WindUniforms = { uTime: { value: 0 }, uWind: { value: 1 } }
  private layout: WorldLayout
  private grid: NavGrid | null = null
  private water: Water
  private sky: Sky
  private islands: Islands
  private props: Props
  private docks: Docks
  private landmarks: Landmarks
  private lanterns: Lanterns
  private rain: Rain
  private birds: Birds
  private boat: BoatVisual
  private navLine = new NavLine()
  private sun = new DirectionalLight('#ffffff', 1)
  private hemi = new HemisphereLight('#ffffff', '#000000', 1)
  private activeLight = new PointLight('#ffb766', 0, 22, 1.4)
  private input: InputController
  private state: BoatState = createBoatState(0, -6, 0)
  private mode: Mode = 'intro'
  private autopilot: AutopilotState | null = null
  private autoDest: DestinationId | null = null
  private waypoint: DestinationId | null = null
  private docked: DestinationId | null = null
  private projectMode = false
  /** World colliders plus the project buoys (solid only while they are afloat). */
  private projectColliders: Collider[] = []
  private tiers = { ...harborStore.get().tiers }
  private cine: cine.CineContext
  private dim = { value: 0 }
  private intro: gsap.core.Timeline | null = null
  private fps = new FpsMonitor()
  private time = 0
  private last = 0
  private running = false
  private disposed = false
  private moved = 0
  private steered = false
  private hints = new frameFx.HintTracker()
  private timers = { lanternPick: 0, debug: 0, path: 0 }
  private fx = new frameFx.WaterFx()
  private waterLanterns: number[] = []
  private tmp = new Vector3()
  private resizeObserver = new ResizeObserver(() => this.onResize())

  constructor(opts: EngineOptions) {
    this.opts = opts
    const reduced = opts.reducedMotion
    this.settings = settingsFor(opts.tier, reduced)
    const s = this.settings
    const v = opts.isDark ? 0 : 1
    this.mix = { lighting: v, sky: v, weather: v, water: v }

    this.renderer = createRenderer(opts.container, s)
    const canvas = this.renderer.domElement
    const { clientWidth: w, clientHeight: h } = opts.container
    this.rig = new CameraRig(w / h, reduced)
    this.cine = { rig: this.rig, boat: this.state, reduced, dim: this.dim }

    this.scene.fog = new FogExp2('#1e2733', 0.01)
    this.layout = buildLayout()
    this.projectColliders = [
      ...this.layout.colliders,
      ...this.layout.projectBuoys.map((b) => ({ kind: 'circle' as const, x: b.x, z: b.z, r: 0.9 })),
    ]

    const wood = new WoodBuilder()
    this.lanterns = new Lanterns(reduced)
    this.water = new Water({ segments: s.waterSegments, ripples: s.ripples, wakePoints: s.wakePoints })
    this.sky = new Sky(reduced)
    this.islands = new Islands(this.layout, this.wind, s.vegetation, s.shadows)
    this.props = new Props(this.layout, s.shadows)
    this.docks = new Docks(this.layout, wood, this.lanterns)
    this.landmarks = new Landmarks(this.layout, wood, this.lanterns, s.shadows)
    this.lanterns.build()
    this.lanterns.setAll(opts.isDark)
    this.boat = new BoatVisual(reduced)
    this.boat.lights.set(opts.isDark)
    const woodMesh = wood.build(this.wind.uTime, s.shadows)
    this.rain = new Rain(s.rain)
    this.birds = new Birds(s.birds, this.wind.uTime)

    configureSun(this.sun, s.shadows)
    this.scene.add(
      this.sky.group, this.water.mesh, this.islands.group, this.props.group, this.docks.group, woodMesh.mesh,
      this.landmarks.group, this.lanterns.group, this.rain.mesh, this.birds.mesh, this.boat.root, this.navLine.mesh,
      this.sun, this.sun.target, this.hemi, this.activeLight,
    )

    this.input = new InputController(canvas, {
      onDevice: (d: InputDevice) => harborStore.get().inputDevice !== d && harborStore.set({ inputDevice: d }),
      onFirstInput: () => {
        harborStore.set({ hasMoved: true })
        if (this.mode === 'intro') this.skipIntro()
      },
      onTap: (x, y) => this.onTap(x, y),
    }, reduced)

    this.applyEnv()
    this.rig.update(0, this.state, 0)
    harborStore.set({ quality: s.tier })

    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resizeObserver.observe(opts.container)
  }

  /** Fonts must be ready before signs are drawn, so construction goes through here. */
  static async create(opts: EngineOptions) {
    await loadSignFonts()
    const engine = new HarborEngine(opts)
    void engine.start()
    return engine
  }

  /** Start rendering behind the crane shot, wait (bounded) for the boat model, then play the intro. */
  private async start() {
    const target = DESTINATION_BY_ID.portfolio.dock
    const look = new Vector3(target.x, 2, target.z)
    this.rig.focus.weight = this.opts.reducedMotion ? 0 : 1
    this.rig.focus.pos.set(this.state.x - 26, 44, this.state.z - 64)
    this.rig.focus.look.copy(look)
    this.running = true
    this.renderer.setAnimationLoop(this.frame)

    const model = this.boat
      .load('/models/boat.glb', (p) => harborStore.set({ loadProgress: p * 0.95 }), this.settings.shadows)
      .catch((err) => console.warn('[harbor] boat model failed to load, keeping proxy', err))
    await Promise.race([model, new Promise((r) => setTimeout(r, 8000))])
    if (this.disposed) return
    harborStore.set({ phase: 'intro', loadProgress: 1 })
    // Build the nav grid off the critical path.
    setTimeout(() => {
      this.grid ??= buildGrid(this.layout.colliders, WORLD_RADIUS, 2, DEFAULT_BOAT.radius + 1)
    }, 300)
    this.intro = cine.playIntro(this.cine, look, () => this.finishIntro())
  }

  private finishIntro() {
    if (this.mode === 'intro') this.mode = 'free'
    this.intro = null
    harborStore.set({ introDone: true, phase: harborStore.get().phase === 'intro' ? 'explore' : harborStore.get().phase })
  }

  skipIntro() {
    if (!this.intro) return
    this.intro.kill()
    this.intro = null
    gsap.to(this.rig.focus, { weight: 0, duration: this.opts.reducedMotion ? 0.1 : 0.9, ease: 'power2.out' })
    this.finishIntro()
  }

  setTheme(isDark: boolean) {
    tweenTheme(this.mix, isDark, this.opts.reducedMotion, () => (this.envDirty = true))
    // Lights switch on as dusk falls: ship first, then lanterns rippling outward from it.
    this.boat.lights.ignite(isDark, isDark ? 0.35 : 0)
    this.lanterns.ignite(isDark, this.tmp.set(this.state.x, 0, this.state.z), isDark ? 0.6 : 0)
  }

  setJoystick = (x: number, y: number) => this.input.setJoystick(x, y)

  setInputEnabled(enabled: boolean) {
    this.input.enabled = enabled && this.mode !== 'docking' && this.mode !== 'docked'
    if (!enabled) this.input.reset()
  }

  async dockAt(id: DestinationId) {
    const d = DESTINATION_BY_ID[id]
    const berth = berthPoint(d, 5)
    this.mode = 'docking'
    this.input.enabled = false
    this.input.reset()
    this.skipIntro()
    this.setWaypointInternal(null)
    const path = this.path(berth) ?? [{ x: this.state.x, z: this.state.z }, berth]
    this.autopilot = createAutopilot(path)
    this.autoDest = id
    const shot = cine.playDockShot(this.cine, d, berth)

    // Let autopilot bring the boat in (bounded), then ease onto the exact berth pose.
    await waitUntil(() => this.disposed || !this.autopilot || this.autopilot.done, 6000)
    this.autopilot = null
    this.mode = 'docked'
    this.docked = id
    await Promise.all([cine.settleBoat(this.cine, berth, d.facing + Math.PI).then(), shot.then()])
  }

  undock() {
    if (this.mode !== 'docked') return
    cine.playReturn(this.cine)
    this.docked = null
    this.autoDest = null
    this.mode = this.projectMode ? 'project' : 'free'
    this.state.speed = -1.6
    this.input.enabled = true
  }

  async enterProjectMode() {
    const d = DESTINATION_BY_ID.portfolio
    this.projectMode = true
    const bay = this.layout.projectBuoys.reduce<Vector3>((acc, b) => acc.add(this.tmp.set(b.x, 0, b.z)), new Vector3())
    bay.multiplyScalar(1 / this.layout.projectBuoys.length)
    this.docked = null
    this.mode = 'project'
    // Swing the bow toward the bay so the follow camera ends up facing the buoys.
    const out = berthPoint(d, 9)
    cine.settleBoat(this.cine, out, d.facing, 2.4)
    const tl = cine.playProjectReveal(this.cine, d, bay, this.landmarks.buoyRise)
    await new Promise<void>((resolve) => tl.call(resolve, [], 'revealed'))
    this.input.enabled = true
  }

  leaveProjectMode() {
    this.projectMode = false
    if (this.mode === 'project') this.mode = 'free'
    gsap.to(this.landmarks.buoyRise, { value: 0, duration: this.opts.reducedMotion ? 0.2 : 1.2, ease: 'power2.in' })
  }

  setWaypoint(id: DestinationId | null, auto: boolean) {
    this.setWaypointInternal(id)
    if (id && auto && telemetry.path.length > 1) {
      this.autopilot = createAutopilot(telemetry.path.slice())
      this.autoDest = id
      if (this.mode === 'intro') this.skipIntro()
    }
  }

  cancelAutopilot() {
    if (!this.autopilot || this.mode === 'docking') return
    this.autopilot = null
    this.autoDest = null
    harborStore.set({ autopilot: false })
  }

  interactNearest() {
    const intent = frameFx.nearestIntent(this.tiers, this.projectMode)
    if (intent) this.opts.onIntent(intent)
  }

  private path(to: Point) {
    this.grid ??= buildGrid(this.layout.colliders, WORLD_RADIUS, 2, DEFAULT_BOAT.radius + 1)
    return findPath(this.grid, { x: this.state.x, z: this.state.z }, to)
  }

  private setWaypointInternal(id: DestinationId | null) {
    this.waypoint = id
    const path = id ? this.path(berthPoint(DESTINATION_BY_ID[id], 7)) : null
    telemetry.path = path ?? []
    this.navLine.setPath(path)
    if (!id) {
      this.autopilot = null
      this.autoDest = null
    }
  }

  private onTap(x: number, y: number) {
    const buoys = this.projectMode ? this.landmarks.buoyAnchors : null
    const target = pick(x, y, this.opts.container, this.rig.camera, this.docks.harbors, buoys)
    if (target) this.opts.onIntent(target)
  }

  private applyEnv() {
    blendEnv(this.env, this.mix)
    const e = this.env
    this.sun.color.copy(e.sunColor)
    this.sun.intensity = e.sunIntensity
    this.hemi.color.copy(e.hemiSky)
    this.hemi.groundColor.copy(e.hemiGround)
    this.hemi.intensity = e.hemiIntensity
    const fog = this.scene.fog as FogExp2
    fog.color.copy(e.fogColor)
    fog.density = e.fogDensity
    this.water.applyEnv(e)
    this.sky.applyEnv(e)
    this.islands.applyEnv(e)
    this.props.applyEnv(e)
    this.docks.applyEnv(e)
    this.landmarks.applyEnv(e)
    this.envDirty = false
  }

  private onResize = () => {
    const { clientWidth: w, clientHeight: h } = this.opts.container
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.rig.resize(w / h)
  }

  private onVisibility = () => {
    if (!this.running) return
    this.renderer.setAnimationLoop(document.hidden ? null : this.frame)
    this.last = 0
  }

  private frame = (now: number) => {
    const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 20) : 1 / 60
    this.last = now
    this.time += dt
    const t = this.time
    this.wind.uTime.value = t
    if (this.envDirty) this.applyEnv()

    this.simulate(dt, t)
    this.updateWorld(dt, t)
    this.updateGameplay(dt)

    this.renderer.toneMappingExposure = this.env.exposure * (1 - 0.22 * this.dim.value)
    this.renderer.render(this.scene, this.rig.camera)
    this.monitor(dt)
  }

  private simulate(dt: number, t: number) {
    const s = this.state
    let control = this.input.read(dt)
    if (this.autopilot) {
      if (this.input.active && this.mode !== 'docking') this.cancelAutopilot()
      else control = pursue(this.autopilot, s)
    } else if (this.mode === 'docking' || this.mode === 'docked') {
      control = { throttle: 0, steer: 0 }
    }

    if (this.mode !== 'docked') {
      const res = stepBoat(s, control, dt, DEFAULT_BOAT, this.projectMode ? this.projectColliders : this.layout.colliders)
      if (res.impact > 1.2) {
        this.rig.shake = Math.min(1, res.impact / 8)
        this.water.addRipple(s.x, s.z, t, 1.6)
      }
    }
    this.boat.update(s, t, dt, this.opts.reducedMotion)
    this.rig.update(dt, s, t)

    const speed = Math.abs(s.speed)
    this.moved += speed * dt
    if (Math.abs(control.steer) > 0.3) this.steered = true

    this.fx.update(dt, t, s, this.boat, this.water, this.env.rain)
    const tb = telemetry.boat
    tb.x = s.x
    tb.z = s.z
    tb.yaw = s.yaw
    tb.speed = s.speed
    tb.momentum += (Math.min(1, speed / DEFAULT_BOAT.maxSpeed) - tb.momentum) * Math.min(1, dt * 3)
  }

  private updateWorld(dt: number, t: number) {
    const cam = this.rig.camera.position
    const e = this.env
    this.water.update(t, cam.x, cam.z)
    this.sky.update(t, cam)
    this.props.update(t)
    this.landmarks.update(t, this.lanterns, this.opts.reducedMotion)
    const active = this.docked ?? this.autoDest ?? this.waypoint
    this.docks.update(t, dt, this.tiers, active, this.lanterns, this.opts.reducedMotion)
    this.lanterns.update(t)

    this.rain.update(t, this.tmp.set(this.state.x, 0, this.state.z), e.rain)
    this.birds.update(dt, cam, e.birds)

    // Reflected lanterns: pick the nearest 16 every half second, refresh intensity every frame.
    this.timers.lanternPick -= dt
    if (this.timers.lanternPick <= 0) {
      this.waterLanterns = frameFx.selectWaterLanterns(this.lanterns, cam, 16)
      this.timers.lanternPick = 0.5
    }
    frameFx.syncWaterLanterns(this.water, this.lanterns, this.waterLanterns)

    // One real light follows the active harbor; the boat lamp handles the hull.
    const h = active ? this.docks.harbors.find((x) => x.id === active) : null
    if (h) this.activeLight.position.set(h.marker.x, 3.2, h.marker.z)
    this.activeLight.intensity += ((h ? 10 * (0.3 + e.lantern) : 0) - this.activeLight.intensity) * Math.min(1, dt * 2)

    if (this.settings.shadows) {
      this.sun.position.copy(e.sunDir).multiplyScalar(60).add(this.tmp.set(this.state.x, 0, this.state.z))
      this.sun.target.position.set(this.state.x, 0, this.state.z)
    }
    const hud = e.lantern > 0.5 ? frameFx.HUD_COLOR_DARK : frameFx.HUD_COLOR_LIGHT
    this.navLine.update(t, this.waypoint ? 0.32 : 0, hud)
    frameFx.projectLabels(this.rig.camera, this.opts.container, this.docks.harbors, this.landmarks.buoyAnchors, this.projectMode)
  }

  private updateGameplay(dt: number) {
    const s = this.state
    const store = harborStore.get()
    const buoys = this.projectMode ? this.landmarks.buoyAnchors : null
    const { discovered } = frameFx.updateDiscovery(s, this.tiers, this.mode === 'intro', buoys)
    if (discovered && this.mode === 'free') {
      const h = this.docks.harbors.find((x) => x.id === discovered)
      if (h) cine.playDiscover(this.cine, h.marker)
    }

    // Waypoint: arrival clears it; otherwise refresh the route occasionally as the boat wanders.
    if (this.waypoint && this.mode !== 'docking') {
      const b = berthPoint(DESTINATION_BY_ID[this.waypoint], 7)
      if (Math.hypot(s.x - b.x, s.z - b.z) < 6) {
        // Arrival: settle the camera on the harbor; lantern/label feedback follows from the tier.
        const h = this.docks.harbors.find((x) => x.id === this.waypoint)
        if (h && this.autopilot) cine.playDiscover(this.cine, h.marker)
        this.setWaypointInternal(null)
        harborStore.set({ waypoint: null, autopilot: false })
      } else if (!this.autopilot && (this.timers.path -= dt) <= 0) {
        this.setWaypointInternal(this.waypoint)
        this.timers.path = 2
      }
    }
    if (store.autopilot !== !!this.autopilot && this.mode !== 'docking') harborStore.set({ autopilot: !!this.autopilot })

    this.hints.update(dt, this.moved, this.steered, this.input.active, this.mode === 'free')
  }

  private monitor(dt: number) {
    const lower = this.fps.tick(dt) ? nextLowerTier(this.settings.tier) : null
    if (lower) {
      // Cheap runtime downgrade: resolution, shadows, rain density.
      this.settings = settingsFor(lower, this.opts.reducedMotion)
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.settings.dprCap))
      this.sun.castShadow = false
      this.rain.setDensity(lower === 'medium' ? 0.4 : 0.16)
      this.onResize()
      harborStore.set({ quality: lower })
    }
    if ((this.timers.debug -= dt) <= 0) {
      writeDebugTelemetry(this.renderer, this.fps.fps, this.rig.camera)
      this.timers.debug = 0.25
    }
  }

  dispose() {
    this.disposed = true
    this.running = false
    this.renderer.setAnimationLoop(null)
    this.intro?.kill()
    gsap.killTweensOf([this.rig.focus, this.rig.params, this.rig.bias, this.mix, this.dim, this.state, this.landmarks.buoyRise])
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.resizeObserver.disconnect()
    this.input.dispose()
    for (const part of [this.water, this.sky, this.islands, this.props, this.docks, this.landmarks, this.lanterns, this.rain, this.birds, this.boat, this.navLine]) {
      part.dispose()
    }
    this.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return
      o.geometry.dispose()
      ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
    })
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
