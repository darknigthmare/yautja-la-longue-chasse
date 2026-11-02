'use client';

import {useEffect, useId, useState} from 'react';
import {HOMEWORLD_FORGE_FIRE_V113, HOMEWORLD_FORGE_FIRE_FRAMES_V113,
  homeworldForgeFireCompatibleV113, homeworldForgeFireFrameV113, homeworldForgeFireImageV113,
  type HomeworldForgeBuildingV113} from './systems/homeworldForgeFireV113';

/** Child of the existing building wrapper: its projection, depth and fade are
 * inherited once. This decoration uses the supplied city clock and no timer. */
export default function HomeworldForgeFireV113({building, width, height, seconds, reducedMotion = false}: {
  building: HomeworldForgeBuildingV113; width: number; height: number; seconds: number; reducedMotion?: boolean;
}) {
  const clipId = 'forge-fire-v113-' + useId().replace(/:/g, '-');
  const compatible = homeworldForgeFireCompatibleV113(building, width, height);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!compatible) return;
    let cancelled = false;
    const sources = [...HOMEWORLD_FORGE_FIRE_FRAMES_V113.map(frame => frame.src), HOMEWORLD_FORGE_FIRE_V113.buildingSource];
    const images = sources.map(src => {
      const image = new Image(); image.src = src; return image;
    });
    Promise.all(images.map(async image => {
      await image.decode();
      if (image.naturalWidth !== HOMEWORLD_FORGE_FIRE_V113.sourceWidth || image.naturalHeight !== HOMEWORLD_FORGE_FIRE_V113.sourceHeight)
        throw new Error('Forge flame native dimensions differ');
    })).then(() => {if (!cancelled) setReady(true);}, () => {if (!cancelled) setReady(false);});
    return () => {cancelled = true;};
  }, [compatible]);
  // Require the native facade too: an absent base must never leave orphan fire.
  // The original static hearth remains visible during flame decode failure.
  if (!compatible || !ready) return null;
  const frame = homeworldForgeFireFrameV113(seconds, reducedMotion), image = homeworldForgeFireImageV113(frame);
  return <svg aria-hidden="true" data-homeworld-forge-fire-v113="deep-forge"
    data-forge-native-frame={frame} data-forge-native-source={image.src}
    data-forge-art-status={HOMEWORLD_FORGE_FIRE_V113.status}
    viewBox="0 0 520 512" width={width} height={height}
    style={{position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none', overflow: 'visible'}}>
    <defs><clipPath id={clipId}><polygon points={HOMEWORLD_FORGE_FIRE_V113.aperture}/></clipPath></defs>
    <g clipPath={`url(#${clipId})`}><image href={image.src} x={image.x} y={image.y}
      width={image.width} height={image.height} preserveAspectRatio="xMidYMid meet"/></g>
  </svg>;
}
