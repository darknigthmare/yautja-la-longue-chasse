import { homeworldYouthFrameV74, type HomeworldYouthMotionInputV74 } from './systems/homeworldYouthMotionV74';

/** Four native walk drawings per orientation plus a native idle. No CSS limb
 * articulation, mirrored directions or visual bob. Whole-figure scale follows
 * the measured head-to-waist gabarit so differently sized source cells retain
 * the same head/torso proportions. Physics owns travel, pause and last facing. */
export default function HomeworldYouthMotionV74({ height = 82, ...input }: HomeworldYouthMotionInputV74 & { height?: number }) {
  const { direction, frame, source, index, clipId } = homeworldYouthFrameV74(input);
  const physicalHeight = Number.isFinite(height) && height > 0 ? height : 82;
  const scale = physicalHeight / frame.bodyHeight;
  return <span aria-hidden="true"
    data-homeworld-unblooded-v72={clipId}
    data-motion-version="74"
    data-native-frame={index}
    data-native-direction={direction}
    data-native-facing={input.facing ?? (direction.includes('w') ? -1 : 1)}
    data-native-source={source.src}
    data-native-pose={frame.id}
    data-frame-pivot-x={frame.pivot[0]}
    data-frame-pivot-y={frame.pivot[1]}
    data-frame-scale={scale}
    style={{ position: 'absolute', left: -frame.pivot[0] * scale, top: -frame.pivot[1] * scale,
      width: frame.rect[2] * scale, height: frame.rect[3] * scale,
      backgroundImage: `url('${source.src}')`, backgroundRepeat: 'no-repeat',
      backgroundSize: `${source.sourceWidth * scale}px ${source.sourceHeight * scale}px`,
      backgroundPosition: `${-frame.rect[0] * scale}px ${-frame.rect[1] * scale}px`, pointerEvents: 'none' }} />;
}
