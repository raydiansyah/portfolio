import { useSyncExternalStore } from 'react'
import { harborStore, telemetry } from './store'

/**
 * Boat sound, synthesised with Web Audio (no audio files to download):
 *   engine — two detuned low oscillators through a low-pass, pitch and level follow throttle
 *   water  — looped brown noise through a band-pass, level follows boat speed
 * Browsers only allow audio after a user gesture, so the context starts on the
 * first key/pointer press. Mute is remembered per browser.
 */

const STORAGE_MUTED = 'harbor-muted'
const MASTER = 0.5
/** Quieter while a content panel or the map covers the world. */
const DUCKED = 0.35

let muted = readMuted()
const listeners = new Set<() => void>()

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_MUTED) === '1'
  } catch {
    return false
  }
}

interface Graph {
  ctx: AudioContext
  master: GainNode
  engineGain: GainNode
  engineFilter: BiquadFilterNode
  oscs: OscillatorNode[]
  waterGain: GainNode
  waterFilter: BiquadFilterNode
}

let graph: Graph | null = null
let raf = 0

function brownNoise(ctx: AudioContext) {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  return src
}

function build(): Graph | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.value = muted ? 0 : MASTER
  master.connect(ctx.destination)

  const engineFilter = ctx.createBiquadFilter()
  engineFilter.type = 'lowpass'
  engineFilter.frequency.value = 220
  engineFilter.Q.value = 0.8
  const engineGain = ctx.createGain()
  engineGain.gain.value = 0
  engineFilter.connect(engineGain).connect(master)
  const oscs = [
    { type: 'sawtooth' as const, detune: 0 },
    { type: 'triangle' as const, detune: 9 },
  ].map(({ type, detune }) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = 38
    o.detune.value = detune
    o.connect(engineFilter)
    o.start()
    return o
  })

  const waterFilter = ctx.createBiquadFilter()
  waterFilter.type = 'bandpass'
  waterFilter.frequency.value = 500
  waterFilter.Q.value = 0.6
  const waterGain = ctx.createGain()
  waterGain.gain.value = 0
  const noise = brownNoise(ctx)
  noise.connect(waterFilter).connect(waterGain).connect(master)
  noise.start()

  return { ctx, master, engineGain, engineFilter, oscs, waterGain, waterFilter }
}

/** Follow the boat every frame; parameters glide so changes never click. */
function tick() {
  raf = requestAnimationFrame(tick)
  const g = graph
  if (!g || g.ctx.state !== 'running') return
  const t = g.ctx.currentTime
  const { momentum, speed } = telemetry.boat
  const throttle = Math.min(1, Math.max(0, Math.abs(momentum)))
  const moving = Math.min(1, Math.abs(speed) / 9)
  const s = harborStore.get()
  const live = s.phase !== 'loading'
  const duck = s.activePanel || s.mapOpen || s.menuOpen ? DUCKED : 1

  const freq = 34 + throttle * 46
  for (const o of g.oscs) o.frequency.setTargetAtTime(freq, t, 0.12)
  g.engineFilter.frequency.setTargetAtTime(180 + throttle * 520, t, 0.15)
  g.engineGain.gain.setTargetAtTime(live ? (0.05 + throttle * 0.17) * duck : 0, t, 0.2)
  g.waterFilter.frequency.setTargetAtTime(380 + moving * 700, t, 0.3)
  g.waterGain.gain.setTargetAtTime(live ? (0.04 + moving * 0.3) * duck : 0, t, 0.3)
}

function onVisibility() {
  if (!graph) return
  if (document.hidden) void graph.ctx.suspend()
  else void graph.ctx.resume()
}

function unlock() {
  if (!graph) graph = build()
  if (graph && graph.ctx.state === 'suspended' && !document.hidden) void graph.ctx.resume()
}

const GESTURES = ['pointerdown', 'keydown', 'touchstart'] as const

/** Attach to the page; returns a cleanup that tears the graph down. */
export function startBoatAudio() {
  GESTURES.forEach((e) => window.addEventListener(e, unlock, { passive: true }))
  document.addEventListener('visibilitychange', onVisibility)
  raf = requestAnimationFrame(tick)
  return () => {
    GESTURES.forEach((e) => window.removeEventListener(e, unlock))
    document.removeEventListener('visibilitychange', onVisibility)
    cancelAnimationFrame(raf)
    if (graph) void graph.ctx.close()
    graph = null
  }
}

export function setMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(STORAGE_MUTED, next ? '1' : '0')
  } catch {
    /* storage unavailable: session-only */
  }
  if (graph) graph.master.gain.setTargetAtTime(next ? 0 : MASTER, graph.ctx.currentTime, 0.08)
  else if (!next) unlock()
  listeners.forEach((l) => l())
}

export const toggleMuted = () => setMuted(!muted)

export function useMuted() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => muted,
    () => muted,
  )
}
