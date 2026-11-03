import nativeArt from '../data/homeworldYouthMotionArtV74.json';

export const HOMEWORLD_YOUTH_DIRECTIONS_V74 = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type HomeworldYouthDirectionV74 = typeof HOMEWORLD_YOUTH_DIRECTIONS_V74[number];
export type HomeworldYouthVelocityV74 = { x: number; y: number };

export type HomeworldYouthFrameV74 = {
  id: string;
  sourceId: string;
  rect: number[];
  pivot: number[];
  alphaBounds: { x: number; y: number; width: number; height: number };
  bodyHeight: number;
  upperBodyHeight: number;
  durationTicks: number;
  nativeWindowSha256: string;
};
export type HomeworldYouthSourceV74 = {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  sha256: string;
  nativePixelCopy: boolean;
};
export type HomeworldYouthActorV74 = {
  idle: HomeworldYouthFrameV74;
  walk: HomeworldYouthFrameV74[];
  bodyHeight: number;
  referenceUpperBodyHeight: number;
};

/** Native OpenAI PNGs remain unchanged. Rectangles select original pixels; the
 * alternate source contains corrected opposite-foot drawings, never a mirror. */
export const HOMEWORLD_YOUTH_MOTION_ART_V74 = nativeArt as unknown as {
  version: 74;
  provenance: string;
  sources: Record<string, HomeworldYouthSourceV74>;
  actors: Record<HomeworldYouthDirectionV74, HomeworldYouthActorV74>;
};

export const HOMEWORLD_YOUTH_STRIDE_WORLD_V74 = 84;
const DIRECTIONS_CLOCKWISE: HomeworldYouthDirectionV74[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const finite = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** Screen/world y increases toward the camera. The physics owner remembers the
 * returned direction so stopping, collision or pause never turns the actor east. */
export function homeworldYouthDirectionV74(
  velocity: HomeworldYouthVelocityV74 | undefined,
  previous: HomeworldYouthDirectionV74 = 'e',
  moving = true,
): HomeworldYouthDirectionV74 {
  const remembered = HOMEWORLD_YOUTH_DIRECTIONS_V74.includes(previous) ? previous : 'e';
  const x = finite(velocity?.x), y = finite(velocity?.y);
  if (!moving || Math.hypot(x, y) <= 5) return remembered;
  const octant = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return DIRECTIONS_CLOCKWISE[(octant + 8) % 8];
}

export type HomeworldYouthMotionInputV74 = {
  seconds: number;
  moving: boolean;
  velocity?: HomeworldYouthVelocityV74;
  lastDirection?: HomeworldYouthDirectionV74;
  facing?: 1 | -1;
  /** Accumulated collision-resolved travel, owned by the existing physics loop.
   * A full gait is two 42-world-unit steps. Pause cannot advance this value. */
  distanceWorld?: number;
};

export function homeworldYouthFrameV74(input: HomeworldYouthMotionInputV74) {
  const remembered = input.lastDirection ?? (input.facing === -1 ? 'w' : 'e');
  const direction = homeworldYouthDirectionV74(input.velocity, remembered, input.moving);
  const moving = input.moving && (!input.velocity || Math.hypot(finite(input.velocity.x), finite(input.velocity.y)) > 5);
  const actor = HOMEWORLD_YOUTH_MOTION_ART_V74.actors[direction];
  let index = 0;
  if (moving) {
    if (typeof input.distanceWorld === 'number' && Number.isFinite(input.distanceWorld)) {
      const distance = Math.max(0, input.distanceWorld) % HOMEWORLD_YOUTH_STRIDE_WORLD_V74;
      index = Math.min(3, Math.floor(distance / (HOMEWORLD_YOUTH_STRIDE_WORLD_V74 / 4)));
    } else {
      // Historical/isolated previews only. Main gameplay supplies real travel;
      // this selector has no rAF, timer, wall clock or independent motion state.
      const ticks = Math.floor(Math.min(Math.max(0, finite(input.seconds)), Number.MAX_SAFE_INTEGER / 60) * 60);
      index = Math.floor((ticks % 36) / 9);
    }
  }
  const frame = moving ? actor.walk[index] : actor.idle;
  return { direction, actor, frame, index, clipId: moving ? 'walk' : 'idle', source: HOMEWORLD_YOUTH_MOTION_ART_V74.sources[frame.sourceId] };
}
