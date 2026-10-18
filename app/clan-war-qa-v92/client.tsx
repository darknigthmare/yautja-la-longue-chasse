"use client";

import ClanWarWorksV6 from "../game/ClanWarWorksV6";
import { DEFAULT_WAR_RULES_V6 } from "../game/systems/clanWarBibleV6";
import styles from "./clan-war-qa.module.css";

/** The production workshop itself, with its normal memory-owned start and
 * import confirmation. This wrapper has no campaign owner or fixture loader. */
export default function ClanWarQaV92() {
  return <main className={styles.page} data-local-clan-war-qa-v92="isolated-memory-only">
    <header className={styles.header}>
      <p>QA locale · atelier de la Bible V6</p>
      <h1>Exercice isolé : ouvrages et stabilisation S11</h1>
      <p>État en mémoire uniquement. Aucune sauvegarde réelle ni progression de campagne n’est lue ou modifiée. Fermer cette page efface son exercice en mémoire.</p>
      <p>Pour reprendre un carnet QA, ouvrez « Exporter ou reprendre cet exercice », choisissez « Coller un JSON de reprise », puis validez et confirmez dans les vrais contrôles de l’atelier. Aucun carnet n’est injecté automatiquement.</p>
    </header>
    <section data-clan-war-qa-renderer="ClanWarWorksV6" aria-label="Vrai atelier jouable de la Bible V6">
      <ClanWarWorksV6 rules={DEFAULT_WAR_RULES_V6}/>
    </section>
  </main>;
}
