"use client";

import { useMemo, useState } from "react";
import type { SaveGame } from "./types";
import concepts from "./preserveHumanConceptsV36.json";
import {
  CHRONICLE_RANK_LABELS, CHRONICLE_RITES,
  evaluateChroniclePromotion, migrateV35ClanChronicle,
} from "./systems/clanChronicle";
import styles from "./ClanChroniclePanel.module.css";

const regions = [
  ["Désert", "Unblooded", "Dunes, oueds, citerne tribale et canyons de chasse."],
  ["Forêt", "Unblooded", "Cité monumentale, pyramides, terrasses, cascades et canopée."],
  ["Slums", "Unblooded", "Habitations, ateliers, ruelles, toitures et La Fosse du PIT."],
  ["Lava", "Young Blood", "Forteresse habitée, basalte, forges et passages protégés."],
  ["Darkjungle", "Young Blood", "Surface noire ; forêt dense d’arbres et de fleurs bioluminescents sous terre."],
] as const;
const preserves = [
  ["Vharuun", "Jungle géante", "Sol, branches et canopée entrecroisés"],
  ["Khar-Duun", "Canyons désertiques", "Deux rives, corniches et fond des gorges"],
  ["Iskhel", "Monde glaciaire", "Terrasses, crevasses et galeries sous la glace"],
  ["Namarra", "Mangroves et delta", "Canaux, racines et niveau d’eau variable"],
  ["Varkesh", "Caldeira volcanique", "Bassin central, couronne et tunnels"],
  ["Ossara", "Cité abandonnée", "Rues, bâtiments traversants, cours et toits"],
  ["Dhorak", "Cavernes", "Grandes salles et boucles autour d’un puits"],
  ["Lythéa", "Forêt fongique", "Deux boucles et empreintes lumineuses"],
  ["Talassar", "Archipel sous les tempêtes", "Îles, passerelles et transits maritimes"],
  ["Korthas", "Cimetière de vaisseaux", "Coques traversantes et voies de service"],
] as const;
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

/** Read-only design dossier. Never grants evidence, equipment, ownership or XP. */
export default function ClanChroniclePanel({ save, onClose }: { save: SaveGame; onClose: () => void }) {
  const [section, setSection] = useState<"journey" | "worlds" | "humans">("journey");
  const [query, setQuery] = useState("");
  const chronicle = useMemo(() => migrateV35ClanChronicle(save), [save]);
  const results = useMemo(() => {
    const search = fold(query.trim());
    return concepts.entries.filter(entry => fold(`${entry.id} ${entry.profile} ${entry.weapon}`).includes(search));
  }, [query]);
  return <section className={styles.panel} aria-labelledby="chronicle-title" data-clan-chronicle="design-v36" data-chronicle-write-policy="read-only">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>LA LONGUE CHASSE · DOSSIER V36</p><h2 id="chronicle-title">De la nurserie aux étoiles</h2></div>
      <button type="button" onClick={onClose}>Retour au menu</button>
    </header>
    <p className={styles.notice}><strong>Parcours en conception, pas encore jouable.</strong> Ce dossier rassemble les nouvelles règles et les fiches récupérées. Il ne débloque aucune mission et ne modifie pas votre sauvegarde. « Jouer » conserve la campagne existante.</p>
    <nav aria-label="Rubriques du dossier" className={styles.tabs}>
      {([["journey", "Parcours et rites"], ["worlds", "Mondes et réserves"], ["humans", "100 proies · fiches de conception"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}
    </nav>

    {section === "journey" && <div>
      <aside className={styles.legacy} data-chronicle-legacy-rank={chronicle.legacyRecognition?.rankId ?? "none"}>
        <h3>Campagne existante préservée</h3>
        <p>{save.profile.hunterName} · {CHRONICLE_RANK_LABELS[save.profile.rankId]} · {save.profile.honor} honneur · {save.statistics.missionsCompleted} mission(s) terminée(s).</p>
        <p>Cette reconnaissance historique ne valide pas rétroactivement les nouveaux rites. Le vaisseau, les trophées, les contrats et THE PIT restent accessibles comme auparavant.</p>
      </aside>
      <div className={styles.opening}><p className={styles.eyebrow}>OUVERTURE PRÉVUE · YOUNGLING</p><h3>L’Arène de la nurserie</h3><p>Duel d’enfance sans HUD, vision rouge, orange et jaune. Maintien « Prêt », poings, prises, petites lames détachées et victoire au KO. La caméra révèle ensuite la nurserie bâtie autour du squelette sec et évidé d’un scolopendre géant, puis la lune rouge.</p><p>Le titre reste <strong>Yautja: The Long Hunt</strong>. Le passage Unblooded précède l’arrivée à la cité, le dojo, le premier biomask, les baraquements et le premier réveil.</p></div>
      <h3 className={styles.subheading}>Les preuves précèdent les promotions</h3>
      <ol className={styles.rites}>
        {CHRONICLE_RITES.map(rite => {
          const evaluation = evaluateChroniclePromotion(chronicle, rite.id);
          return <li key={rite.id} data-chronicle-rite={rite.id}>
            <span className={styles.badge}>Mission à produire</span>
            <h4>{rite.grantsRankId ? CHRONICLE_RANK_LABELS[rite.grantsRankId] : "Adjutant · fonction de second de chasse"}</h4>
            <p>{rite.label}</p>
            <details><summary>Conditions du parcours narratif</summary><ul>{evaluation.missing.map(item => <li key={item.id}>{item.label}</li>)}</ul></details>
          </li>;
        })}
      </ol>
      <div className={styles.cards}>
        <article tabIndex={0}><h3>Le premier vaisseau</h3><p>Remise après le rite Blooded. Avant cela, vie sur la planète mère et transports du clan. Quatza-Rij à trois, puis pyramide changeante à trois sans armes à énergie.</p></article>
        <article tabIndex={0}><h3>Warp Universe</h3><p>Expérience sur plusieurs mondes, nomination Adjutant, quête et installation du module. Les seuils chiffrés proposés restent à équilibrer ; l’honneur seul n’ouvre pas le portail.</p></article>
        <article tabIndex={0}><h3>Compagnons</h3><p>Rencontrer, recruter puis affecter. Aucun occupant ni compartiment gratuit à bord. Une affectation demande un vaisseau réel et un réaménagement au port ; un allié déployé n’est pas présent simultanément dans sa cabine.</p></article>
      </div>
      <p className={styles.footnote}>Tradition originale du clan jouable, pas une hiérarchie universelle de la franchise. Elder et Ancient sont distincts ; leur reconnaissance dépend aussi du temps et de la transmission. « Premium » décrit le développement narratif des héros, sans achat.</p>
    </div>}

    {section === "worlds" && <div>
      <h3 className={styles.subheading}>Homeworld · cinq familles confirmées</h3>
      <p>Chaque famille prévoit une zone de chasse, un mini-hub tribal habité et un territoire Élite séparé. Tous les territoires Élite demandent le rang Élite.</p>
      <div className={styles.cards}>{regions.map(([name, rank, description]) => <article key={name} tabIndex={0}><span className={styles.badge}>{rank} · normal et tribal</span><h4>{name}</h4><p>{description}</p></article>)}</div>
      <h3 className={styles.subheading}>Dix réserves proposées · quatre-vingts secteurs à construire</h3>
      <p>Les noms et géographies ci-dessous sont des créations proposées pour le jeu. Chaque réserve prévoit huit secteurs reliés et deux voies d’évasion à préparer. Ce ne sont pas les arènes de THE PIT ni un Battle Royale à 100 joueurs.</p>
      <div className={styles.cards}>{preserves.map(([name, biome, layout]) => <article key={name} tabIndex={0}><span className={styles.badge}>Non jouable</span><h4>{name} · {biome}</h4><p>{layout}.</p></article>)}</div>
      <div className={styles.opening}><h3>Xeno Prime · Le Berceau enfoui</h3><p>Interprétation originale, pas une déclaration de planète natale canonique des xénomorphes. Le secteur proposé relie douze tableaux et des raccourcis persistants jusqu’à la tête gigantesque de la Matriarche couchée au sol. Sa défaite ouvre des passages sans effacer toute l’infestation.</p></div>
    </div>}

    {section === "humans" && <div>
      <h3 className={styles.subheading}>Catalogue de combattants humains</h3>
      <p>100 profils armés pour sélectionner les groupes des réserves, pas 100 adversaires simultanés. Les biographies complètes, les portraits et les vues en pied attendent l’import du pack final : aucun portrait de remplacement n’est présenté comme livré.</p>
      <label className={styles.search}>Rechercher par identifiant, profil ou arme<input type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="H001, éclaireuse, lance…" /></label>
      <p role="status" aria-live="polite">{results.length} fiche(s) sur {concepts.entries.length} · conception uniquement</p>
      <div className={styles.cards} data-human-concept-results>{results.map(entry => <article key={entry.id} tabIndex={0} data-human-concept={entry.id}><span className={styles.badge}>{entry.id} · image non importée</span><h4>{entry.profile}</h4><p>{entry.weapon}</p></article>)}</div>
      {results.length === 0 && <button type="button" onClick={() => setQuery("")}>Effacer la recherche</button>}
    </div>}
  </section>;
}
