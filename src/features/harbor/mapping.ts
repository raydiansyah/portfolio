/**
 * World -> map/compass conventions.
 *
 * The follow camera looks along +Z (north) with +Y up, so world +X appears on
 * the LEFT of the screen. Maps and the compass therefore treat -X as east, so
 * "right on screen" and "east on the map" always agree with what the player sees.
 */

/** Horizontal map coordinate (east = positive) for a world X. */
export const mapX = (worldX: number) => -worldX

/** Compass heading in radians (0 = north, increasing clockwise / toward east) for a boat yaw. */
export const headingOf = (yaw: number) => -yaw

/** Compass bearing (radians, clockwise from north) from one world point to another. */
export const bearingTo = (fromX: number, fromZ: number, toX: number, toZ: number) =>
  Math.atan2(mapX(toX) - mapX(fromX), toZ - fromZ)
