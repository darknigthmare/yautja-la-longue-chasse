"use client";
import type {ControlBindings} from "./systems/controlBindings";
import {controlActionShortcut} from "./controlBindingLabels";
import {DEFAULT_HUNT_GAMEPAD_V112,HUNT_GAMEPAD_LABELS_V112,type HuntGamepadButtonsV112} from "./systems/huntAccessibilityV112";
import styles from "./HuntAccessibilityV112.module.css";
export default function HuntFieldGuideV112({bindings,gamepadButtons=DEFAULT_HUNT_GAMEPAD_V112,phase,climbing,grounded,stamina,corpseNearby,gripExhausted=false}:{
  bindings:ControlBindings;gamepadButtons?:HuntGamepadButtonsV112;phase:string;climbing:boolean;grounded:boolean;stamina:number;corpseNearby:boolean;gripExhausted?:boolean;
}){
  const jump=controlActionShortcut("hunt.jump",bindings),up=controlActionShortcut("hunt.moveUp",bindings),interact=controlActionShortcut("hunt.interact",bindings);
  const cue=phase==="extraction"?"▲ Extraction : rejoins la balise puis embarque pour rapporter les prises.":
    phase==="trophy"?"◆ Trophée Apex : approche le corps, garde un appui dégagé, puis interagis.":
    corpseNearby?`◇ Corps réel : Bas + ${HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} à la manette ouvre les rites. Interagir seul conserve le prélèvement de la prise.`:
    gripExhausted?"■ Prise épuisée : atterris au sol ou sur une plateforme avant de t’accrocher à nouveau.":
    climbing?"↔ Canopée : direction sur une liane pour te balancer ; saute pour lâcher.":
    !grounded?"↓ En vol : vise la prise suivante et utilise Haut ; garde une route de réception.":
    stamina<15?"■ Endurance basse : repose-toi avant une traversée.":"↟ Choisis une suite de prises et un point de repos avant de monter.";
  return <aside className={styles.guide} data-field-guide-v112 aria-label="Guide de terrain">
    <p aria-live="polite" aria-atomic="true">{cue}</p>
    <details><summary>Apprendre les gestes et annulations</summary>
      <ol>
        <li><strong>Prendre appui.</strong> Haut ({up}) près d’un arbre, d’une liane, d’une corde ou d’une chaîne. Une décoration sans prise ne permet pas de grimper. Le mode bascule se règle dans Options.</li>
        <li><strong>Traverser.</strong> Sur arbre, direction + saut ({jump}). Sur support souple, direction pompe le balancement ; Haut/Bas règlent la longueur, saut lâche avec l’élan. Manette : {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump]} ; tactile : mêmes directions et Saut.</li>
        <li><strong>Récupérer.</strong> Vise un vrai support suivant ; évite de vider l’endurance. Après épuisement, une réception réelle est nécessaire. Les plateformes de repos et la route au sol permettent un repli.</li>
        <li><strong>Rites à la manette.</strong> Près du corps, Bas + {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} ouvre le menu. Haut/Bas déplace le choix, {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump]} active et {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} ferme. Relâche les commandes après fermeture. Le temps et les ennemis continuent pendant la préparation.</li>
        <li><strong>Reconnaître la prise.</strong> Le corps est la proie vaincue, le trophée est une partie prélevable, l’extraction est le trajet pour la rapporter. Préparer ou suspendre le corps ne crée pas un trophée. Un prélèvement demande une source réelle, de la place et un appui accessible.</li>
        <li><strong>Annuler.</strong> Fermer le menu interrompt un geste sur le corps. Se déplacer, sauter, agir ou subir un dégât interrompt le dépeçage. Pendant les glyphes du trophée, utilise « Annuler le prélèvement » ; rien n’est consommé par une confirmation inachevée.</li>
        <li><strong>Rapporter.</strong> Interagir ({interact}) à la balise après sécurisation. Attends le transport puis embarque : un abandon ne rapporte pas les prises de cette chasse.</li>
      </ol>
    </details>
  </aside>;
}
