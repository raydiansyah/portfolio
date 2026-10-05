#!/usr/bin/env node
/**
 * One-off asset pipeline: 3ds Max OBJ (Z-up, cm, ~100k faces) -> compact GLB.
 *
 * Usage: node scripts/convert-boat.mjs <path/to/boat.obj>
 * Output: public/models/boat.glb (meshopt-compressed, webp textures)
 *
 * Axis/scale fix (Z-up -> Y-up, cm -> m) is applied at load time in the engine
 * so this script stays a pure optimisation step.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/convert-boat.mjs <boat.obj>')
  process.exit(1)
}

const cache = resolve(root, 'scripts/.cache')
mkdirSync(cache, { recursive: true })
const raw = resolve(cache, 'boat.raw.glb')
const out = resolve(root, 'public/models/boat.glb')
const bin = (name) => resolve(root, 'node_modules/.bin', name)
const run = (cmd, args) => execFileSync(bin(cmd), args, { stdio: 'inherit' })

run('obj2gltf', ['-i', resolve(input), '-o', raw, '--binary'])

const steps = [
  ['weld'],
  ['dedup'],
  ['simplify', '--ratio', '0.25', '--error', '0.002'],
  ['prune'],
  ['resize', '--width', '1024', '--height', '1024'],
  ['webp'],
  ['meshopt', '--level', 'medium'],
]
let src = raw
steps.forEach(([cmd, ...args], i) => {
  const dst = i === steps.length - 1 ? out : resolve(cache, `step-${i}.glb`)
  run('gltf-transform', [cmd, src, dst, ...args])
  src = dst
})

console.log(`\nboat.glb: ${(statSync(out).size / 1024).toFixed(0)} KB`)
