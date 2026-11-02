"use client";
import type {ControlBindings} from "./systems/controlBindings";
import {controlActionShortcut} from "./controlBindingLabels";
import {DEFAULT_HUNT_GAMEPAD_V112,HUNT_GAMEPAD_LABELS_V112,type HuntGamepadButtonsV112} from "./systems/huntAccessibilityV112";
import {flayingToolWorkMultiplierV112,type fieldLoadV112} from "./systems/harvestInventoryV112";
import styles from "./HuntAccessibilityV112.module.css";

type GuideFieldLoadV112=Pick<ReturnType<typeof fieldLoadV112>,"massKg"|"volumeUnits"|"capacityMassKg"|"capacityVolumeUnits">;
export default function HuntFieldGuideV112({bindings,gamepadButtons=DEFAULT_HUNT_GAMEPAD_V112,phase,climbing,grounded,stamina,corpseNearby,gripExhausted=false,toolOwned,toolCondition,fieldLoad}:{
  bindings:ControlBindings;gamepadButtons?:HuntGamepadButtonsV112;phase:string;climbing:boolean;grounded:boolean;stamina:number;corpseNearby:boolean;gripExhausted?:boolean;
  toolOwned?:boolean;toolCondition?:number;fieldLoad?:GuideFieldLoadV112;
}){
  const jump=controlActionShortcut("hunt.jump",bindings),up=controlActionShortcut("hunt.moveUp",bindings),down=controlActionShortcut("hunt.moveDown",bindings),interact=controlActionShortcut("hunt.interact",bindings);
  const padJump=HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump],padInteract=HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact];
  const cue=gripExhausted&&!grounded?"■ Prise épuisée : atterris au sol ou sur une plateforme avant de t’accrocher à nouveau.":
    !grounded&&!climbing?`↓ En vol : vise une vraie prise avec Haut (${up}) ; garde un sol ou une plateforme pour la réception.`:
    phase==="extraction"?`▲ Extraction : rejoins la balise, interagis (${interact} / ${padInteract}) puis embarque pour rapporter les prises.`:
    phase==="trophy"?`◆ Trophée Apex : approche le corps, garde un appui dégagé, puis interagis (${interact} / ${padInteract}).`:
    corpseNearby?`◇ Corps réel : active « Examiner la proie vaincue » au clavier ou au toucher ; à la manette, Bas + ${padInteract}. Interagir seul (${interact}) conserve le prélèvement de la prise.`:
    climbing?`↔ Canopée : sur une liane, direction pour pomper, Haut/Bas (${up} / ${down}) pour la longueur, Saut (${jump} / ${padJump}) pour lâcher.`:
    stamina<15?"■ Endurance basse : repose-toi au sol ou sur une plateforme avant une traversée.":
    `↟ Choisis une prise et un point de repos, puis Haut (${up}) pour monter. La route au sol reste possible.`;
  const condition=toolCondition===undefined?undefined:Math.round(Math.min(100,Math.max(0,Number.isFinite(toolCondition)?toolCondition:100)));
  const full=fieldLoad&&(fieldLoad.massKg>=fieldLoad.capacityMassKg||fieldLoad.volumeUnits>=fieldLoad.capacityVolumeUnits);
  return <aside className={styles.guide} data-field-guide-v112 aria-label="Guide de terrain">
    <p data-guide-cue-v112 aria-live="polite" aria-atomic="true">{cue}</p>
    {corpseNearby&&<div data-guide-preparation-v112 className={styles.preparation}>
      <p>{toolOwned===false?"Flaying Tool absent : acquiers-le une seule fois à l’armurerie avant de dépecer ou de prélever une partie anatomique.":
        toolOwned===true?`Flaying Tool possédé${condition===undefined?"":` · état ${condition}/100 · durée de travail ×${flayingToolWorkMultiplierV112(condition).toFixed(2)}`}. Un outil émoussé reste utilisable ; l’affûtage au poste est gratuit.`:
        "Vérifie la possession du Flaying Tool à l’armurerie et son état dans Emport avant le geste."}</p>
      {fieldLoad&&<p>Emport : {fieldLoad.massKg.toFixed(1)} / {fieldLoad.capacityMassKg} kg · {fieldLoad.volumeUnits.toFixed(1)} / {fieldLoad.capacityVolumeUnits} volumes. {full?"Sac plein : dépose une prise dans le sac de terrain avant de réessayer ; une partie refusée reste sur le corps.":"Vérifie le poids et le volume de la partie avant de confirmer ; elle doit tenir dans les deux limites."}</p>}
      <p>Analyse avant le premier prélèvement pour préserver la qualité. Les parties dépendent de l’espèce et ne repoussent pas. Une place doit aussi rester au dépôt de campagne.</p>
    </div>}
    <details><summary>Apprendre les gestes et annulations</summary>
      <ol data-guide-checklist-v112>
        <li><strong>Prendre appui.</strong> Haut ({up}) près d’un arbre, d’une liane, d’une corde ou d’une chaîne. Une décoration sans prise ne permet pas de grimper. Le mode bascule se règle dans Options.</li>
        <li><strong>Traverser.</strong> Sur arbre, direction + saut ({jump}). Sur support souple, direction pompe le balancement ; Haut/Bas ({up} / {down}) règlent la longueur, saut lâche avec l’élan. Manette : {padJump} ; tactile : mêmes directions et Saut.</li>
        <li><strong>Récupérer.</strong> Vise un vrai support suivant ; évite de vider l’endurance. Après épuisement, une réception réelle est nécessaire. Les plateformes de repos et la route au sol permettent un repli.</li>
        <li><strong>Ouvrir les rites.</strong> Près d’une proie vaincue, active « Examiner la proie vaincue » avec Tab puis Entrée au clavier, ou touche le bouton. À la manette : Bas + {padInteract}, Haut/Bas pour choisir, {padJump} pour activer, {padInteract} pour fermer. Relâche les commandes après fermeture. Le temps et les ennemis continuent pendant la préparation.</li>
        <li><strong>Préparer une partie.</strong> Analyse d’abord, puis dépeçage avec le Flaying Tool si la partie le demande. L’absence d’outil, son état et les limites du sac apparaissent avant le geste. Une analyse tardive ne répare pas la qualité d’une partie déjà prise.</li>
        <li><strong>Reconnaître la prise.</strong> Le corps est la proie vaincue, le trophée est une partie prélevable, l’extraction est le trajet pour la rapporter. Préparer ou suspendre le corps ne crée pas un trophée. Un prélèvement demande une source réelle, de la place et un appui accessible. Chaque partie est unique ; une partie incompatible ou déjà prise reste indisponible.</li>
        <li><strong>Porter ou suspendre.</strong> Dépèce avant de porter le corps au sol ; un saut, une prise ou le combat le déposent. Pour suspendre, approche un vrai support compatible et libre. La suspension déplace le même corps et ne le rapporte pas au vaisseau.</li>
        <li><strong>Alléger le sac.</strong> Pause ouvre le sac de terrain pour déposer ou reprendre une partie à portée, sur un vrai appui dégagé. Les prises déposées restent sur place : reprends celles que tu veux rapporter avant l’extraction. Les trophées principaux restent distincts de ce sac.</li>
        <li><strong>Annuler.</strong> Fermer le menu interrompt un geste sur le corps. Se déplacer, sauter, agir ou subir un dégât interrompt le dépeçage. Pendant les glyphes du trophée, utilise « Annuler le prélèvement » ; rien n’est consommé par une confirmation inachevée.</li>
        <li><strong>Rapporter.</strong> Interagir ({interact} / {padInteract}) à la balise après sécurisation. Attends le transport puis embarque : un abandon ne rapporte pas les prises de cette chasse.</li>
        <li><strong>Conserver au retour.</strong> Dans « Préserver les prises », nettoie, traite, sèche puis monte la partie avec les gestes manuels proposés. Le travail avance après confirmation de sauvegarde, jamais pendant l’absence. Une pièce montée peut être rangée en réserve pour libérer une place au dépôt ; l’affûtage du Flaying Tool est gratuit.</li>
      </ol>
    </details>
  </aside>;
}
