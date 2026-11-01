"use client";

import { ALIEN_BASE_ARCHIVE_V1 } from "./alienBaseArchiveV1";
import styles from "./AlienBaseArchiveV1.module.css";

/** Archive purement documentaire. Aucun sprite ou spawn déclenché par l'affichage. */
export default function AlienBaseArchiveV1() {
  return (
    <aside className={styles.panel} aria-labelledby="alien-base-archive-title">
      <header className={styles.header}>
        <div>
          <p className={styles.overline}>Archives croisées // Alien Base</p>
          <h3 id="alien-base-archive-title">Dossiers Xénomorphes</h3>
          <p>Références historiques consultables séparément des animaux de chasse. Aucun profil ne constitue un ennemi jouable, une capture validée ou une image certifiée fidèle.</p>
        </div>
        <span className={styles.counter}>{ALIEN_BASE_ARCHIVE_V1.length} identités</span>
      </header>
      <ul className={styles.grid}>
        {ALIEN_BASE_ARCHIVE_V1.map(record => (
          <li className={styles.card} key={record.id}>
            <span className={styles.role}>{record.role} · {record.work}</span>
            <strong>{record.name}</strong>
            <p>{record.description}</p>
            <div className={styles.foot}>
              <span>Fiche de référence · non jouable</span>
              <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Voir la référence de ${record.name}`}>Source film</a>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
