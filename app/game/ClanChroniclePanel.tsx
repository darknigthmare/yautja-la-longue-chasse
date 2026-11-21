"use client";

import { youthCampaignObjective, youthEquipmentSummary } from "./systems/youthCampaign";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { SaveGame } from "./types";
import concepts from "./preserveHumanConceptsV36.json";
import {
  CHRONICLE_RANK_LABELS, CHRONICLE_RITES,
  evaluateChroniclePromotion, migrateV35ClanChronicle, getChronicleRank,
} from "./systems/clanChronicle";
import styles from "./ClanChroniclePanel.module.css";
import TribeArtGallery from "./TribeArtGallery";
import tribeArt from "./tribeArtV37.json";
import CompanionCataloguePanel from "./CompanionCataloguePanel";
import HuntingHoundsPanelV147 from "./HuntingHoundsPanelV147";
import GameReserveEntryV66 from "./GameReserveEntryV66";
import type {GameReserveChoiceV109} from './systems/gameReserveV66';
import { rankRiteDossierV168 } from "./systems/rankRiteDossierV168";
import ElderPassageJudgment from "./ElderPassageJudgment";
import { canJudgeElderPassage, type PassageCommand, type PassageResponse } from "./systems/elderPassageJudgmentV168";
import ElderMentoring from "./ElderMentoring";
import { canMentorElderNovice, type MentoringCommand, type MentoringResponse } from "./systems/elderMentoringV168";
import ElderAssembly from "./ElderAssembly";
import { canConveneElderAssembly, elderAssemblyProofs, type AssemblyCommand, type AssemblyResponse } from "./systems/elderAssemblyV168";
import EliteMastery from "./EliteMastery";
import QuatzaRijScene from './QuatzaRijScene';
import { canEnterQuatza, type QuatzaCommand } from './systems/quatzaRij';
import { canEnterEliteMastery, type MasteryCommand, type MasteryResponse } from "./systems/eliteMasteryV170";

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


const regionSourceNames: Record<string, string> = { "Désert": "HOMEWORLD_DESERT_V2.png", "Forêt": "HOMEWORLD_FOREST_V2.png", "Slums": "HOMEWORLD_SLUMS_V2.png", "Lava": "HOMEWORLD_LAVA_V2.png", "Darkjungle": "HOMEWORLD_DARKJUNGLE_V2.png" };
const sourceArtByName = new Map(tribeArt.assets.map(asset => [asset.sourceName, asset]));
function HomeworldRegionArt({ name }: { name: string }) {
  const art = sourceArtByName.get(regionSourceNames[name]);
  return art ? <Image unoptimized className={styles.regionArt} src={art.thumbnailSrc} alt={"Illustration de la tribu " + name + " · source V2, niveau non livré"} width={320} height={220} loading="lazy" decoding="async" /> : null;
}

/** The dossier presents receipts and delegates each playable rite to its campaign owner. */
export default function ClanChroniclePanel({
  save, onClose, onGameReserveV66, onOpenCradle, onPassageCommand, onMentoringCommand, onAssemblyCommand, onMasteryCommand, onQuatzaCommand, quatzaSuspended,
}: {
  save: SaveGame;
  onClose: () => void;
  onGameReserveV66?: (fresh: boolean, version?: GameReserveChoiceV109) => boolean;
  onOpenCradle?: () => void;
  onPassageCommand?: (command: PassageCommand) => PassageResponse;
  onMentoringCommand?: (command: MentoringCommand) => MentoringResponse;
  onAssemblyCommand?: (command: AssemblyCommand) => AssemblyResponse;
  onMasteryCommand?: (command: MasteryCommand) => MasteryResponse;
  onQuatzaCommand?: (command: QuatzaCommand) => boolean;
  quatzaSuspended?: boolean;
}) {
  const [section, setSection] = useState<"journey" | "worlds" | "humans" | "companions">("journey");
  const [query, setQuery] = useState("");
  const [activeRite, setCampaignRite] = useState<"mentoring" | "passage" | "assembly" | "mastery" | "quatza-triad" | "quatza-solo" | null>(null);
  const proofs = elderAssemblyProofs(save);
  const triadAvailable = !!onQuatzaCommand && (!!save.quatzaRij?.expeditions.triad || canEnterQuatza(save, 'triad'));
  const soloAvailable = !!onQuatzaCommand && (!!save.quatzaRij?.expeditions.solo || canEnterQuatza(save, 'solo'));
  const closeCampaignRite = () => setCampaignRite(null);
  const toggleCampaignRite = (rite: "mentoring" | "passage" | "assembly" | "mastery" | "quatza-triad" | "quatza-solo") =>
    setCampaignRite(current => current === rite ? null : rite);
  const chronicle = useMemo(() => save.prologue?.chronicle ?? migrateV35ClanChronicle(save), [save]);
  const rankDossier = useMemo(() => rankRiteDossierV168(save), [save]);
  const narrativeRank = getChronicleRank(chronicle) ?? "youngling";
  const results = useMemo(() => {
    const search = fold(query.trim());
    return concepts.entries.filter(entry => fold(`${entry.id} ${entry.profile} ${entry.weapon}`).includes(search));
  }, [query]);
  return <section className={styles.panel} aria-labelledby="chronicle-title" data-clan-chronicle="design-v37" data-chronicle-write-policy="read-only">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>LA LONGUE CHASSE · DOSSIER V37</p><h2 id="chronicle-title">De la nurserie aux étoiles</h2></div>
      <button type="button" onClick={onClose}>Retour</button>
    </header>
    <p className={styles.notice}><strong>{save.prologue ? "Nurserie, formation, sorties accompagnées, petite Fosse et Premières Pistes jouables ; les rites de chasse autonome restent à construire." : "Nouveau parcours de jeunesse, indépendant de votre campagne adulte."}</strong> Ce dossier rassemble les règles, fiches et images récupérées. La rubrique Mondes et réserves permet aussi de lancer ou reprendre une expédition adulte de Vharuun, d’Avar’Kesh, de Khar-Duun ou d’Iskhel après sauvegarde. Les preuves affichées ne sont acquises que par les séquences réellement achevées.</p>
    <nav aria-label="Rubriques du dossier" className={styles.tabs}>
      {([["journey", "Parcours et rites"], ["worlds", "Mondes et réserves"], ["humans", "100 proies · fiches de conception"], ["companions", "Compagnons · registre"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}
    </nav>

    {section === "companions" && <><CompanionCataloguePanel /><HuntingHoundsPanelV147 hounds={save.houndsV147} /></>}

    {section === "journey" && <div>
      <aside className={styles.legacy} data-chronicle-legacy-rank={chronicle.legacyRecognition?.rankId ?? "none"}>
        <h3>{save.prologue ? "Chronique de jeunesse" : "Campagne existante préservée"}</h3>
        <p>{save.profile.hunterName} · {save.prologue ? (narrativeRank === "young-blood" ? "Reconnaissance locale de la cohorte" : CHRONICLE_RANK_LABELS[narrativeRank]) : CHRONICLE_RANK_LABELS[save.profile.rankId]} · {save.profile.honor} honneur · {save.statistics.missionsCompleted} mission(s) terminée(s).</p>
        <p>{save.prologue ? "Le rang narratif vient du prologue et de ses rites réellement enregistrés. Aucun honneur adulte, biomask ou vaisseau n’est accordé par la nurserie." : "Cette reconnaissance historique ne valide pas rétroactivement les nouveaux rites. Le grade affiché appartient à la carrière adulte. Les actes du parcours du clan figurent dans le registre ci-dessous."}</p>
      </aside>
      <div className={styles.opening}><p className={styles.eyebrow}>OUVERTURE · YOUNGLING</p><h3>L’Arène de la nurserie</h3><p>Duel d’enfance sans HUD, vision rouge, orange et jaune. Maintien « Prêt », poings, prises, petites lames détachées et victoire au KO. La caméra révèle ensuite la nurserie bâtie autour du squelette sec et évidé d’un scolopendre géant, puis la lune rouge.</p><p>Le titre reste <strong>Yautja: The Long Hunt</strong>. Le passage Unblooded précède l’arrivée à la cité, le dojo, le premier biomask, les baraquements et le premier réveil.</p></div>
      {save.prologue && <aside className={styles.legacy} data-youth-chronicle><h3>Formation auprès du clan</h3><p>{youthCampaignObjective(save.youthTraining)}</p><p>{youthEquipmentSummary(save.youthTraining)}</p><p>Les gestes du dojo, les remises d’équipement, le parcours chronométré, le duel, le repos et la reconnaissance accompagnée du désert gardent leurs propres preuves. Ils ne remplacent ni les Premières Pistes ni la chasse sans guide ; aucun rang supplémentaire ne vient d’une visite de menu.</p></aside>}
      <section aria-labelledby="chronicle-campaign-rank-rites" data-campaign-rank-rites-v168>
        <h3 id="chronicle-campaign-rank-rites" className={styles.subheading}>Épreuves de rang de la campagne</h3>
        <p>Honneur pris en compte pour les seuils · {rankDossier.honor.toLocaleString("fr-FR")}</p>
        <details>
          <summary>Seuils d’honneur et épreuves</summary>
          <ol>
            {rankDossier.thresholds.map(tier => <li key={tier.level} data-rank-threshold-v168={tier.level}>
              <strong>{tier.bibleRank}</strong> · {tier.threshold.toLocaleString("fr-FR")} · {tier.trial}.
              {" "}{tier.remainingHonor > 0 ? `Il manque ${tier.remainingHonor.toLocaleString("fr-FR")} d’honneur.` : "Seuil atteint."}
            </li>)}
          </ol>
        </details>
        <ol className={styles.rites}>
          <li><h4>Young Blood · L-02 et L-03</h4><p>Chasser le Quatza-Rij à trois et présenter la peau et le crâne.</p>
            {triadAvailable ? <button type="button" data-quatza-open="triad" onClick={() => toggleCampaignRite("quatza-triad")}
              aria-controls="quatza-expedition-triad" aria-expanded={activeRite === "quatza-triad"}>
              {activeRite === "quatza-triad" ? "Replier la chasse en triade" : "Ouvrir la chasse en triade"}</button> :
              <p>Le départ s’ouvre après la répétition du trio, au rang Young Blood.</p>}
          </li>
          <li><h4>Blooded · L-04</h4><p>Traverser la pyramide en triade, chacun avec sa prise, puis recevoir la marque à l’acide.</p><p>Épreuve à produire.</p></li>
          {onMasteryCommand && (canEnterEliteMastery(save) || save.eliteMasteryV170) && <li>
            <h4>Mon domaine de maîtrise</h4>
            <button type="button" onClick={() => toggleCampaignRite("mastery")} aria-expanded={activeRite === "mastery"}>
              {activeRite === "mastery" ? "Replier le terrain de maîtrise" : "Ouvrir le terrain de maîtrise"}
            </button>
          </li>}
          {soloAvailable && <li><h4>Le Quatza-Rij solitaire · L-05</h4>
            <button type="button" data-quatza-open="solo" onClick={() => toggleCampaignRite("quatza-solo")}
              aria-controls="quatza-expedition-solo" aria-expanded={activeRite === "quatza-solo"}>
              {activeRite === "quatza-solo" ? "Replier la chasse solitaire" : "Ouvrir la chasse solitaire"}</button>
          </li>}
          <li data-rank-queen-proof-v168>
            <h4>Elite · L-05, L-06 et L-07</h4>
            <ul>
              <li>Chasse solitaire · Quatza-Rij adulte. Chapitre indisponible.</li>
              <li>Rites d’initiation et d’ascension du clan. Après les huit chasses, la station d’entraînement propose une préparation au plasma.</li>
              <li>Crête de la Matriarche · {rankDossier.queen.label}.</li>
            </ul>
            {rankDossier.queen.canOpenExpedition && onOpenCradle && <button type="button" onClick={onOpenCradle}>Ouvrir le dossier du Berceau</button>}
          </li>
          <li>
            <h4>Elder · R2-M049 à R2-M051</h4>
            <p>{proofs.mentoring ? "Le mentor a consigné la chasse du novice." : "Accompagner un novice dans sa chasse d’exercice."}</p>
            {(canMentorElderNovice(save) || proofs.mentoring) && onMentoringCommand &&
              <button type="button" onClick={() => toggleCampaignRite("mentoring")} aria-expanded={activeRite === "mentoring"}>
                {activeRite === "mentoring" ? "Replier le mentorat" : "Ouvrir le terrain du novice"}
              </button>}
            <p>{proofs.judgment ? "Le témoin a consigné le règlement du passage." : "Régler le désaccord du passage devant un témoin."}</p>
            {(canJudgeElderPassage(save) || proofs.judgment) && onPassageCommand
              ? <button type="button" onClick={() => toggleCampaignRite("passage")} aria-expanded={activeRite === "passage"}>
                  {activeRite === "passage" ? "Replier le dossier du passage" : "Ouvrir le dossier du passage"}
                </button>
              : <p>Les actes Elder s’ouvrent à Elite avec 8 000 points d’honneur de carrière.</p>}
            <p>{save.elderAssemblyV168?.responsibility ? "L’assemblée a consigné la reconnaissance Elder." :
              "L’assemblée examine les deux actes avant de proposer un engagement."}</p>
            {(canConveneElderAssembly(save) || save.elderAssemblyV168?.responsibility) && onAssemblyCommand &&
              <button type="button" onClick={() => toggleCampaignRite("assembly")} aria-expanded={activeRite === "assembly"}>
                {activeRite === "assembly" ? "Replier l’assemblée" : "Ouvrir l’assemblée des aînés"}
              </button>}
          </li>
        </ol>
      </section>
      {(activeRite === "quatza-triad" || activeRite === "quatza-solo") && onQuatzaCommand &&
        <QuatzaRijScene key={save.createdAt + ':' + activeRite} mode={activeRite === "quatza-triad" ? "triad" : "solo"}
          save={save} onCommand={onQuatzaCommand} suspended={quatzaSuspended} />}
      {activeRite === "mastery" && onMasteryCommand && <EliteMastery key={save.createdAt}
        save={save} onCommand={onMasteryCommand} onClose={closeCampaignRite} />}
      {activeRite === "mentoring" && onMentoringCommand && <ElderMentoring key={save.createdAt}
        save={save} onCommand={onMentoringCommand} onClose={closeCampaignRite} />}
      {activeRite === "passage" && onPassageCommand && <ElderPassageJudgment key={save.createdAt} owner={save.createdAt}
        saved={save.elderPassageJudgmentV168} onCommand={onPassageCommand} onClose={closeCampaignRite} />}
      {activeRite === "assembly" && onAssemblyCommand && <ElderAssembly key={save.createdAt}
        save={save} onCommand={onAssemblyCommand} onClose={closeCampaignRite} />}
      <h3 className={styles.subheading}>Reconnaissances enregistrées dans la chronique</h3>
      <ol className={styles.rites}>
        {CHRONICLE_RITES.filter(rite => rite.id === "nursery-recognition" || rite.id === "unguided-hunt-recognition" ||
          chronicle.rites.some(receipt => receipt.id === rite.id)).map(rite => {
          const evaluation = evaluateChroniclePromotion(chronicle, rite.id);
          return <li key={rite.id} data-chronicle-rite={rite.id}>
            <span className={styles.badge}>{chronicle.rites.some(receipt => receipt.id === rite.id) ? "Rite enregistré" : rite.id === "nursery-recognition" ? "Duel et titre à achever" : "Mission à produire"}</span>
            <h4>{rite.id === "unguided-hunt-recognition" ? "Reconnaissance locale de la cohorte" :
              rite.grantsRankId ? CHRONICLE_RANK_LABELS[rite.grantsRankId] : "Adjutant · fonction de second de chasse"}</h4>
            <p>{rite.label}</p>
            <details><summary>Conditions du parcours narratif</summary><ul>{evaluation.missing.map(item => <li key={item.id}>{item.label}</li>)}</ul></details>
          </li>;
        })}
      </ol>
      <div className={styles.cards}>
        <article tabIndex={0}><h3>Le premier vaisseau</h3><p>Remise après le rite Blooded. Avant cela, vie sur la planète mère et transports du clan. La triade retrouve ses armes à plasma dans la pyramide.</p></article>
        <article tabIndex={0}><h3>Warp Universe</h3><p>Expérience sur plusieurs mondes, nomination Adjutant, quête et installation du module. Les seuils chiffrés proposés restent à équilibrer ; l’honneur seul n’ouvre pas le portail.</p></article>
        <article tabIndex={0}><h3>Compagnons</h3><p>Rencontrer, recruter puis affecter. Aucun occupant ni compartiment gratuit à bord. Une affectation demande un vaisseau réel et un réaménagement au port ; un allié déployé n’est pas présent simultanément dans sa cabine.</p></article>
      </div>
      <p className={styles.footnote}>Tradition originale du clan jouable, pas une hiérarchie universelle de la franchise. Elder et Ancient sont distincts ; leur reconnaissance dépend aussi du temps et de la transmission. « Premium » décrit le développement narratif des héros, sans achat.</p>
    </div>}

    {section === "worlds" && <div>
      <GameReserveEntryV66 save={save} onOpen={onGameReserveV66} />
      <h3 className={styles.subheading}>Homeworld · cinq familles confirmées</h3>
      <p>Chaque famille prévoit une zone de chasse, un mini-hub tribal habité et un territoire Élite séparé. Tous les territoires Élite demandent le rang Élite.</p>
      <div className={styles.cards}>{regions.map(([name, rank, description]) => <article key={name} tabIndex={0}><HomeworldRegionArt name={name} /><span className={styles.badge}>{rank} · normal et tribal</span><h4>{name}</h4><p>{description}</p></article>)}</div>
      <TribeArtGallery />
      <h3 className={styles.subheading}>Quatre réserves jouables · dix propositions historiques</h3>
      <p>Les noms et géographies ci-dessous sont des créations proposées pour le jeu. Chaque proposition prévoit huit secteurs reliés et des voies d’évasion à préparer. Vharuun dispose de huit secteurs et quatre appareils ; Avar’Kesh est une seconde réserve originale, distincte des noms de ce catalogue. Khar-Duun et Iskhel disposent chacun d’une adaptation jouable de huit secteurs : routes hautes du chasseur et passage bas continu des équipes humaines. Ce ne sont pas les arènes de THE PIT ni un Battle Royale à 100 joueurs.</p>
      <div className={styles.cards}>{preserves.map(([name, biome, layout]) => <article key={name} tabIndex={0}><span className={styles.badge}>{name === "Vharuun" ? "3 secteurs · première sortie / 4 · Balises / 8 · traversée" : name === 'Khar-Duun' || name === 'Iskhel' ? '8 secteurs · adaptation jouable' : "Non jouable"}</span><h4>{name} · {biome}</h4><p>{layout}.</p></article>)}</div>
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
