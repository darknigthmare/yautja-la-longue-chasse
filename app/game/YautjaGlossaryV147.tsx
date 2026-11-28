"use client";

import { useState } from "react";
import {
  plainBibleTextV147, searchYautjaWordsV147, visibleYautjaWordsV147,
} from "./yautjaLanguageV147";
import { searchYautjaLexiconV67, YAUTJA_EVIDENCE_LABELS_V67 } from "./systems/yautjaTranslationV67";
import styles from "./YautjaGlossaryV147.module.css";

/** In-codex Yautja glossary (campaign bible, "Langue yautja"). Every entry is
 * visible: the bible plans no progressive unlock for the glossary. */
export default function YautjaGlossaryV147() {
  const [query, setQuery] = useState("");
  const entries = searchYautjaLexiconV67(query);
  const archive = searchYautjaWordsV147(query, visibleYautjaWordsV147());
  return (
    <section className={styles.glossary} aria-labelledby="yautja-glossary-title">
      <h2 id="yautja-glossary-title">Glossaire yautja</h2>
      <p>Le lexique des romans et la langue de <cite>Badlands</cite> suivent leurs propres sources. Les formes s’affichent en caractères latins à côté du français.</p>
      <label className={styles.search}>
        Rechercher un mot ou un sens
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <p className={styles.count} role="status" aria-live="polite">
        {entries.length} entrée{entries.length === 1 ? "" : "s"} du lexique · {archive.length} dans les archives de la Bible
      </p>
      <ul className={styles.list}>
        {entries.map(([id, entry]) => (
          <li key={id} data-yautja-evidence={entry.source.evidence}>
            <strong lang="x-yautja">{entry.form}</strong>
            <span>{entry.french}</span>
            <em className={styles.badge}>{YAUTJA_EVIDENCE_LABELS_V67[entry.source.evidence]}</em>
            <a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.label}</a>
          </li>
        ))}
      </ul>
      {archive.length > 0 && <details className={styles.rules} open={query.trim() ? true : undefined}>
        <summary>Archive de la Bible de campagne</summary>
        <p>Les fiches d’origine conservent les variantes et les sens recensés à l’époque de leur rédaction.</p>
        <ul className={styles.list}>
          {archive.map(entry => (
            <li key={entry.id}>
              <strong lang="x-yautja">{entry.word}</strong>
              <span>{plainBibleTextV147(entry.meaning)}</span>
              {entry.usage && <small>Usage proposé dans la Bible · {entry.usage}</small>}
              {entry.bibleNotes.map(note => <small key={note.section}>{plainBibleTextV147(note.quote)}</small>)}
              {entry.source.url && <a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.label}</a>}
            </li>
          ))}
        </ul>
      </details>}
    </section>
  );
}
