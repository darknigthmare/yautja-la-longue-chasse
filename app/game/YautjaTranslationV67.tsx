import {
  readYautjaV67, YAUTJA_EVIDENCE_LABELS_V67, YAUTJA_LEXICON_V67, type YautjaLexemeV67,
} from "./systems/yautjaTranslationV67";
import styles from "./YautjaTranslationV67.module.css";

export interface YautjaTranslationV67Props {
  text: string;
  paused?: boolean;
  reducedMotion?: boolean;
  className?: string;
  showSkip?: boolean;
}

export function YautjaTermV67({ term }: { term: YautjaLexemeV67 }) {
  const entry = YAUTJA_LEXICON_V67[term];
  return <span className={styles.term} lang="x-yautja" data-yautja-term={term}
    data-yautja-evidence={entry.source.evidence}
    title={entry.french + " · " + YAUTJA_EVIDENCE_LABELS_V67[entry.source.evidence]}>{entry.form}</span>;
}

export default function YautjaTranslationV67({ text, paused = false, className }: YautjaTranslationV67Props) {
  if (!text) return null;
  const reading = readYautjaV67(text);
  return <span className={[styles.translation, className].filter(Boolean).join(" ")} data-yautja-translation-v67
    data-translation-complete="true" data-translation-paused={paused}>
    <span lang="fr">{text}</span>
    {reading.ids.length > 0 && <span className={styles.note} data-yautja-reading={reading.kind}>
      {" "}{reading.kind === "line" ? "· Transcription recensée " : "· Lexique yautja "}
      {reading.ids.map((id, index) => <span key={id}>
        {index > 0 && ", "}<YautjaTermV67 term={id} />
      </span>)}
    </span>}
  </span>;
}
