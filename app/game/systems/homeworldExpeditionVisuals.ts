import type { AshGrazer } from "./homeworldExpedition";

/** Original ecology V8 sheet: idle, two moving poses, telegraph, hurt, dead. */
export const ASH_GRAZER_SHEET = {
  path: "/game/sprites/v8/ecology/cinder-12/basalt-ram-sheet.png",
  columns: 6,
  frameWidth: 256,
  frameHeight: 192,
  feetOffset: 185,
} as const;

/** Poses 1–3 face right in the existing art; idle faces left. Never animate a living grazer through hurt/dead. */
export function ashGrazerVisual(grazer: AshGrazer, tick: number) {
  const frame = grazer.phase === "telegraph" ? 3 : grazer.phase === "charge" ? 1 + Math.floor(tick / 10) % 2 : 0;
  const nativeFacing = frame === 0 ? -1 : 1;
  const sheet = ASH_GRAZER_SHEET;
  return {
    frame,
    sourceX: frame * sheet.frameWidth,
    flip: grazer.direction * nativeFacing,
    style: {
      left: grazer.x - sheet.frameWidth / 2,
      top: 920 - sheet.feetOffset,
      width: sheet.frameWidth,
      height: sheet.frameHeight,
      transform: `scaleX(${grazer.direction * nativeFacing})`,
      backgroundImage: `url("${sheet.path}")`,
      backgroundSize: `${sheet.frameWidth * sheet.columns}px ${sheet.frameHeight}px`,
      backgroundPosition: `${-frame * sheet.frameWidth}px 0`,
    },
  };
}
