"use client";

import { useState } from "react";
import {
  YAUTJA_LANGUAGE_DECISION_V147, YAUTJA_LANGUAGE_RULES_V147,
  plainBibleTextV147, searchYautjaWordsV147, visibleYautjaWordsV147,
} from "./yautjaLanguageV147";
import styles from "./YautjaGlossaryV147.module.css";

/** In-codex Yautja glossary (campaign bible, "Langue yautja"). Every entry is
 * visible: the bible plans no progressive unlock for the glossary. */
export default function YautjaGlossaryV147() {
  const [query, setQuery] = useState("");
  const words = searchYautjaWordsV147(query, visibleYautjaWordsV147());
  return (
    <section className={styles.glossary} aria-labelledby="yautja-glossary-title">
      <h2 id="yautja-glossary-title">Glossaire yautja</h2>
      <p>{plainBibleTextV147(YAUTJA_LANGUAGE_DECISION_V147)}</p>
      <details className={styles.rules}>
        <summary>Règles de la langue</summary>
        <ul>{YAUTJA_LANGUAGE_RULES_V147.map(rule => <li key={rule}>{plainBibleTextV147(rule)}</li>)}</ul>
      </details>
      <label className={styles.search}>
        Rechercher un mot ou un sens
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <p className={styles.count} role="status" aria-live="polite">
        {words.length} mot{words.length > 1 ? "s" : ""}
      </p>
      <ul className={styles.list}>
        {words.map(entry => (
          <li key={entry.id} data-status={entry.status}>
            <strong lang="x-yautja">{entry.word}</strong>
            <span>{plainBibleTextV147(entry.meaning)}</span>
            {entry.usage && <small>Dans le jeu : {entry.usage}</small>}
            {entry.bibleNotes.map(note => <small key={note.section}>{plainBibleTextV147(note.quote)}</small>)}
            <em className={styles.badge}>
              {entry.status === "canon" ? "Canon" : "Proposé"}
              {entry.source.work ? ` · ${entry.source.work}` : ""}
            </em>
            {entry.source.url
              ? <a href={entry.source.url} target="_blank" rel="noreferrer">Source : {entry.source.label}</a>
              : <small>Source : {entry.source.label}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}
