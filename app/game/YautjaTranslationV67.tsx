"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { advanceTranslationV67, translationDurationV67, translationWordsV67, YAUTJA_DECORATIVE_STROKES_V67 } from "./systems/yautjaTranslationV67";
import styles from "./YautjaTranslationV67.module.css";

export interface YautjaTranslationV67Props {
  text: string;
  paused?: boolean;
  reducedMotion?: boolean;
  className?: string;
  showSkip?: boolean;
}
const listeners = new Set<() => void>();
let stopEnvironment: (() => void) | null = null;
function subscribeEnvironment(listener: () => void) {
  listeners.add(listener);
  if (!stopEnvironment) {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const notify = () => listeners.forEach(fn => fn());
    media.addEventListener('change', notify); document.addEventListener('visibilitychange', notify);
    stopEnvironment = () => { media.removeEventListener('change', notify); document.removeEventListener('visibilitychange', notify); };
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stopEnvironment?.(); stopEnvironment = null; } };
}
const environmentSnapshot = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0) | (document.hidden ? 2 : 0);
const serverSnapshot = () => 0;

function TranslationRun({ text, paused = false, reducedMotion = false, className = '', showSkip = true }: YautjaTranslationV67Props) {
  const parsed = useMemo(() => translationWordsV67(text), [text]);
  const duration = translationDurationV67(parsed.symbols);
  const [elapsed, setElapsed] = useState(0), [skipped, setSkipped] = useState(false), [skipFocused, setSkipFocused] = useState(false);
  const elapsedRef = useRef(0);
  const textId = useId();
  const environment = useSyncExternalStore(subscribeEnvironment, environmentSnapshot, serverSnapshot);
  const reduced = reducedMotion || Boolean(environment & 1);
  const suspended = paused || Boolean(environment & 2);
  const finished = skipped || elapsed >= duration;
  const complete = reduced || finished;
  useEffect(() => {
    if (finished) return;
    let frame = 0;
    // A reduced-motion change commits completion, so turning it off never
    // encrypts a sentence which the player has already read.
    if (reduced) {
      frame = requestAnimationFrame(() => { elapsedRef.current = duration; setElapsed(duration); });
    } else if (!suspended) {
      let previous = performance.now();
      const tick = (now: number) => {
        elapsedRef.current = advanceTranslationV67(elapsedRef.current, now - previous, duration, false);
        previous = now; setElapsed(elapsedRef.current);
        if (elapsedRef.current < duration) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(frame);
  }, [duration, finished, reduced, suspended]);
  const revealed = complete ? parsed.symbols : Math.floor(parsed.symbols * elapsed / duration);
  return <span className={`${styles.translation} ${className}`} data-yautja-translation-v67 data-translation-complete={complete} data-translation-paused={suspended} data-translation-revealed={revealed}>
    <span id={textId} className={styles.accessible} lang="fr">{text}</span>
    <span aria-hidden="true" className={styles.visual}>{parsed.words.map((word, index) => word.plain ? word.text : <span className={styles.word} key={index}>{word.units.map((unit, position) => unit.index === null ? unit.text : <span className={styles.letter} data-revealed={unit.index < revealed} key={position}>
      <span className={styles.human}>{unit.text}</span><svg className={styles.glyph} viewBox="0 0 16 20" focusable="false" aria-hidden="true"><path d={YAUTJA_DECORATIVE_STROKES_V67[unit.glyph]} /></svg>
    </span>)}</span>)}</span>
    {showSkip && parsed.symbols > 0 && (!reduced || skipFocused) && <button type="button" className={styles.skip} aria-describedby={textId} aria-disabled={complete} aria-hidden={complete && !skipFocused ? true : undefined} tabIndex={complete && !skipFocused ? -1 : 0} data-translation-dismissed={complete && !skipFocused} data-translation-skip data-youth-control
      onFocus={() => setSkipFocused(true)} onBlur={() => setSkipFocused(false)} onClick={() => setSkipped(true)}>{complete ? 'Texte affiché' : 'Lire immédiatement'}</button>}
  </span>;
}

/** Key by actual text, never by a simulation tick. No save, gameplay gate,
 * autofocus, audio or live-region updates are introduced by this effect. */
const YautjaTranslationV67 = memo(function YautjaTranslationV67(props: YautjaTranslationV67Props) {
  return props.text ? <TranslationRun key={props.text} {...props} /> : null;
});
export default YautjaTranslationV67;
