'use client';

/* eslint-disable @next/next/no-img-element -- native sprite pixels and measured foot anchors */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { homeworldNpcKeyV84, homeworldNpcVariantV84, type HomeworldNpcVariantRoleV84 } from './systems/homeworldNpcVariantsV84';

/** A single preserved drawing follows the existing actor, never the shared walk
 * atlas of another person. These assets explicitly have no native walk cycle.
 * Culling remains with the owning scene, so only visible actors request images. */
export default function HomeworldNpcSpriteV84({
  npcId, role, regionId, facing = 1, height, moving = false, style, children,
}: {
  npcId: string;
  role?: HomeworldNpcVariantRoleV84;
  regionId?: string;
  facing?: -1 | 1;
  height?: number;
  moving?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const key = homeworldNpcKeyV84(npcId, regionId);
  const variant = homeworldNpcVariantV84(key, role);
  if (!variant || failedSource === variant.src) return <>{children}</>;
  const scale = (height ?? variant.heightWorld) / variant.alphaBounds.height;
  return <img
    data-homeworld-npc-variant-v84={variant.id}
    data-homeworld-npc-identity-v84={key}
    data-homeworld-npc-role-v84={variant.role}
    data-native-source={variant.src}
    data-native-clip="idle"
    data-native-frame="0"
    data-native-facing={variant.nativeFacing}
    data-display-facing={facing}
    data-native-animation-status={variant.motionStatus}
    data-actor-moving={moving}
    src={variant.src} alt="" aria-hidden="true" draggable={false}
    width={variant.sourceWidth} height={variant.sourceHeight}
    decoding="async"
    onError={() => setFailedSource(variant.src)}
    style={{
      position: 'absolute', maxWidth: 'none', pointerEvents: 'none', userSelect: 'none',
      left: -variant.pivot.x * scale, top: -variant.pivot.y * scale,
      width: variant.sourceWidth * scale, height: variant.sourceHeight * scale,
      transform: `scaleX(${facing * variant.nativeFacing})`,
      transformOrigin: `${variant.pivot.x * scale}px ${variant.pivot.y * scale}px`,
      ...style,
    }}
  />;
}
