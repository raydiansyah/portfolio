import type { Secret } from '../types'

/** Optional easter eggs. Hidden from the minimap until found. */
export const SECRETS: Secret[] = [
  {
    id: 'lighthouse',
    label: 'Small lighthouse',
    title: 'The keeper rule',
    body: 'Every project I ship gets a README a stranger could follow at 2 a.m. Light the way for whoever comes next.',
    position: { x: -196, z: -12 },
  },
  {
    id: 'abandoned-dock',
    label: 'Abandoned dock',
    title: 'Projects I let go',
    body: 'Half-built side projects taught me more than the finished ones. Knowing when to stop is a skill too.',
    position: { x: 64, z: 168 },
  },
  {
    id: 'cabin',
    label: 'Small cabin',
    title: 'Where the training starts',
    body: 'Most of my classes begin with one question: what do you want to build? The syntax comes after.',
    position: { x: -162, z: 150 },
  },
  {
    id: 'floating-sign',
    label: 'Floating sign',
    title: 'Slow is smooth',
    body: 'I prefer small, reviewed pull requests over heroic weekends. Smooth water, steady progress.',
    position: { x: 196, z: 70 },
  },
  {
    id: 'hidden-island',
    label: 'Hidden island',
    title: 'You found the quiet place',
    body: 'Thanks for exploring this far. This whole world is hand-built with Three.js. Say hi at the Contact harbor.',
    position: { x: -44, z: -214 },
  },
]

export const SECRET_RADIUS = 10
