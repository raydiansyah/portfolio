import type { Destination, DestinationId } from '../types'

/**
 * World layout in meters. The boat spawns at the origin facing +Z, so PORTFOLIO
 * sits straight ahead as the natural first goal; the rest are spread 90–190 m
 * away and separated by islands so they are found through exploration.
 */
export const DESTINATIONS: Destination[] = [
  {
    id: 'portfolio',
    index: 1,
    code: 'P',
    label: 'Portfolio',
    tagline: 'A collection of selected work',
    dock: { x: 4, z: 92 },
    facing: Math.PI, // pier points back toward the spawn
    islandRadius: 20,
  },
  {
    id: 'projects',
    index: 2,
    code: 'PR',
    label: 'Projects',
    tagline: 'The full archive, side projects included',
    dock: { x: -118, z: 58 },
    facing: Math.PI * 0.62,
    islandRadius: 15,
  },
  {
    id: 'about',
    index: 3,
    code: 'A',
    label: 'About',
    tagline: 'Who is steering this boat',
    dock: { x: 112, z: 46 },
    facing: -Math.PI * 0.58,
    islandRadius: 14,
  },
  {
    id: 'experience',
    index: 4,
    code: 'E',
    label: 'Experience',
    tagline: 'Where I have worked and taught',
    dock: { x: -96, z: -104 },
    facing: Math.PI * 0.25,
    islandRadius: 16,
  },
  {
    id: 'services',
    index: 5,
    code: 'S',
    label: 'Services',
    tagline: 'How we can work together',
    dock: { x: 128, z: -96 },
    facing: -Math.PI * 0.3,
    islandRadius: 15,
  },
  {
    id: 'contact',
    index: 6,
    code: 'C',
    label: 'Contact',
    tagline: 'Send a message ashore',
    dock: { x: 18, z: -168 },
    facing: Math.PI * 0.04,
    islandRadius: 14,
  },
]

export const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d])) as Record<
  DestinationId,
  Destination
>

export const PIER_LENGTH = 12

/** Unit vector a pier points along. */
export function facingDir(facing: number) {
  return { x: Math.sin(facing), z: Math.cos(facing) }
}

/** Where the boat stops when docking (just past the pier tip). */
export function berthPoint(d: Destination, extra = 5) {
  const f = facingDir(d.facing)
  return { x: d.dock.x + f.x * extra, z: d.dock.z + f.z * extra }
}

/** Island centre sits behind the pier root. */
export function islandCentre(d: Destination) {
  const f = facingDir(d.facing)
  const back = PIER_LENGTH + d.islandRadius * 0.75
  return { x: d.dock.x - f.x * back, z: d.dock.z - f.z * back }
}

export const WORLD_RADIUS = 240
