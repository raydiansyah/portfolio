import gsap from 'gsap'
import { Vector3 } from 'three'
import { facingDir, type berthPoint } from '../data/destinations'
import type { Destination } from '../types'
import type { CameraRig } from './cameraRig'
import type { BoatState } from './physics'

/**
 * Camera/boat timelines. Every move uses eased curves (expo / power) — never
 * linear — and collapses to short fades when reduced motion is requested.
 */

export interface CineContext {
  rig: CameraRig
  boat: BoatState
  reduced: boolean
  /** 0..1 scene dim applied to exposure while content is open. */
  dim: { value: number }
}

const dur = (ctx: CineContext, seconds: number) => (ctx.reduced ? Math.min(0.25, seconds) : seconds)

/** Seed the focus pose from wherever the camera currently is so blends never jump. */
function seedFocus(ctx: CineContext) {
  const { rig } = ctx
  if (rig.focus.weight < 0.01) {
    rig.focus.pos.copy(rig.camera.position)
    rig.currentLook(rig.focus.look)
  }
}

/** Opening crane shot: high over the wetland looking toward Portfolio Island, then settle behind the boat. */
export function playIntro(ctx: CineContext, lookAt: Vector3, onDone: () => void) {
  const { rig, boat } = ctx
  if (ctx.reduced) {
    rig.focus.weight = 0
    onDone()
    return null
  }
  rig.focus.weight = 1
  rig.focus.pos.set(boat.x - 26, 44, boat.z - 64)
  rig.focus.look.copy(lookAt)
  const followPos = new Vector3()
  const followLook = new Vector3()
  rig.followPose(boat, followPos, followLook)

  const tl = gsap.timeline({ onComplete: onDone })
  tl.to(rig.focus.pos, { x: boat.x - 14, y: 30, z: boat.z - 46, duration: 2.2, ease: 'sine.inOut' })
  tl.to(rig.focus.pos, { x: followPos.x, y: followPos.y + 1.5, z: followPos.z - 4, duration: 2.4, ease: 'expo.inOut' }, '>-0.2')
  tl.to(rig.focus.look, { x: followLook.x, y: followLook.y, z: followLook.z, duration: 2.4, ease: 'expo.inOut' }, '<')
  tl.to(rig.focus, { weight: 0, duration: 1.2, ease: 'power2.inOut' }, '>-0.6')
  return tl
}

/** First discovery: widen slightly and turn toward the harbor, then release. */
export function playDiscover(ctx: CineContext, point: Vector3) {
  if (ctx.reduced) return
  const { rig } = ctx
  rig.bias.point.copy(point)
  gsap.killTweensOf(rig.bias)
  gsap.killTweensOf(rig.extra)
  gsap
    .timeline()
    .to(rig.bias, { weight: 0.38, duration: 1.3, ease: 'power2.inOut' })
    .to(rig.extra, { distance: 3, height: 1.3, duration: 1.3, ease: 'power2.inOut' }, '<')
    .to(rig.bias, { weight: 0, duration: 1.6, ease: 'power2.inOut' }, '+=1.8')
    .to(rig.extra, { distance: 0, height: 0, duration: 1.6, ease: 'power2.inOut' }, '<')
}

/** Side shot of the berth: the harbor becomes the focal point while content opens. */
export function playDockShot(ctx: CineContext, d: Destination, berth: ReturnType<typeof berthPoint>) {
  seedFocus(ctx)
  const f = facingDir(d.facing)
  const side = { x: f.z, z: -f.x }
  const pos = new Vector3(berth.x + side.x * 13 + f.x * 6, 5.5, berth.z + side.z * 13 + f.z * 6)
  const look = new Vector3(d.dock.x - f.x * 4, 2, d.dock.z - f.z * 4)
  const t = dur(ctx, 1.7)
  return gsap
    .timeline()
    .to(ctx.rig.focus.pos, { x: pos.x, y: pos.y, z: pos.z, duration: t, ease: 'expo.inOut' }, 0)
    .to(ctx.rig.focus.look, { x: look.x, y: look.y, z: look.z, duration: t, ease: 'expo.inOut' }, 0)
    .to(ctx.rig.focus, { weight: 1, duration: t, ease: 'expo.inOut' }, 0)
    .to(ctx.rig.extra, { fov: -4, duration: t, ease: 'power2.inOut' }, 0)
    .to(ctx.dim, { value: 1, duration: dur(ctx, 0.9), ease: 'power2.out' }, t * 0.5)
}

/** Ease the boat onto its berth pose (bow toward the island). */
export function settleBoat(ctx: CineContext, berth: { x: number; z: number }, yaw: number, seconds = 1.3) {
  const b = ctx.boat
  // Shortest rotation to the target heading.
  const target = b.yaw + Math.atan2(Math.sin(yaw - b.yaw), Math.cos(yaw - b.yaw))
  b.speed = 0
  b.yawRate = 0
  return gsap.to(b, { x: berth.x, z: berth.z, yaw: target, duration: dur(ctx, seconds), ease: 'power2.inOut' })
}

/** Return to the follow camera. */
export function playReturn(ctx: CineContext) {
  const t = dur(ctx, 1.3)
  gsap.killTweensOf(ctx.rig.focus)
  return gsap
    .timeline()
    .to(ctx.rig.focus, { weight: 0, duration: t, ease: 'power2.inOut' }, 0)
    .to(ctx.rig.extra, { fov: 0, duration: t, ease: 'power2.inOut' }, 0)
    .to(ctx.dim, { value: 0, duration: t * 0.8, ease: 'power2.out' }, 0)
}

/** Wide shot over the Portfolio bay while the project buoys rise, then hand control back. */
export function playProjectReveal(ctx: CineContext, d: Destination, bayCentre: Vector3, rise: { value: number }) {
  seedFocus(ctx)
  const f = facingDir(d.facing)
  const pos = new Vector3(d.dock.x + f.x * 44, 24, d.dock.z + f.z * 44)
  const t = dur(ctx, 1.8)
  return gsap
    .timeline()
    .to(ctx.rig.focus.pos, { x: pos.x, y: pos.y, z: pos.z, duration: t, ease: 'expo.inOut' }, 0)
    .to(ctx.rig.focus.look, { x: bayCentre.x, y: 0, z: bayCentre.z, duration: t, ease: 'expo.inOut' }, 0)
    .to(ctx.rig.focus, { weight: 1, duration: t * 0.6, ease: 'power2.inOut' }, 0)
    .to(ctx.dim, { value: 0, duration: t, ease: 'power2.out' }, 0)
    .to(rise, { value: 1, duration: dur(ctx, 1.6), ease: 'power3.out' }, t * 0.35)
    .addLabel('revealed')
    .to(ctx.rig.focus, { weight: 0, duration: dur(ctx, 1.5), ease: 'power2.inOut' }, '+=0.8')
    .to(ctx.rig.extra, { fov: 0, duration: dur(ctx, 1.5), ease: 'power2.inOut' }, '<')
}
