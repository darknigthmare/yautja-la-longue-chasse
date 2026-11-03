/** Decorative reading effect only. These strokes are not a canonical alphabet,
 * transliteration table or a claim about the spoken Yautja language. */
export const YAUTJA_DECORATIVE_STROKES_V67 = [
  'M3 3V17M3 3L12 7M3 10L10 14M11 3V5',
  'M3 4H12L8 9H3M8 9V17M11 13H13',
  'M3 3L11 6V16L4 12M3 9V17',
  'M3 5H12M5 3V17M9 8L12 11L9 15',
  'M4 3L11 7L4 11V17M8 14H13',
  'M3 3V14L11 17V7M6 5H13M5 10H8',
  'M3 4L8 8L12 4M8 8V17M3 13H5',
  'M4 3H11V8H4V16M8 12L12 17',
] as const;

export interface TranslationWordV67 { space: boolean; plain: boolean; text: string; units: { text: string; index: number | null; glyph: number }[] }
export function translationWordsV67(text: string): { words: TranslationWordV67[]; symbols: number } {
  const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
  let index = 0;
  const words = text.split(/(\s+)/u).filter(Boolean).map(word => {
    const graphemes = [...segmenter.segment(word)].map(unit => unit.segment);
    const space = /^\s+$/u.test(word), plain = space || graphemes.length > 32;
    const units = graphemes.map(unit => {
      const eligible = !plain && index < 360 && /[\p{L}\p{N}]/u.test(unit);
      const position = eligible ? index++ : null;
      return { text: unit, index: position, glyph: ((unit.codePointAt(0) ?? 0) + (position ?? 0) * 3) % YAUTJA_DECORATIVE_STROKES_V67.length };
    });
    return { text: word, space, plain, units };
  });
  return { words, symbols: index };
}
export function translationDurationV67(symbols: number): number { return symbols === 0 ? 0 : Math.min(1600, Math.max(480, 180 + symbols * 12)); }
export function advanceTranslationV67(elapsed: number, delta: number, duration: number, paused: boolean): number {
  if (paused || !Number.isFinite(delta) || delta <= 0) return elapsed;
  return Math.min(duration, elapsed + Math.min(delta, 100));
}
