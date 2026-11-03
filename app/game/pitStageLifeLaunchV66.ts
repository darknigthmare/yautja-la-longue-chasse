/** Presentation seed: never enters combat, AI, damage or rewards. Zero keeps
 * historical recordings visually stable. A live launch records its seed in the
 * existing replay envelope so pause, seeking and replay see the same event bag. */
export function pitStageLifeKeyV66(stageId: string, seed?: number): string {
  return Number.isInteger(seed) && seed! > 0 && seed! <= 0xffff_ffff ? `${stageId}:launch:${seed}` : stageId;
}
export function createPitStageLifeSeedV66(previous = 0): number {
  const words = new Uint32Array(1);
  globalThis.crypto.getRandomValues(words);
  const seed = words[0] || 1;
  return seed === previous ? (seed % 0xffff_ffff) + 1 : seed;
}
