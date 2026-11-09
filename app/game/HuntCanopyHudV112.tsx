"use client";

import { controlActionShortcut } from "./controlBindingLabels";
import type { ControlBindings } from "./systems/controlBindings";
import {
  DEFAULT_HUNT_GAMEPAD_V112,
  HUNT_GAMEPAD_LABELS_V112,
  type HuntGamepadButtonsV112,
} from "./systems/huntAccessibilityV112";
import type { CanopyNavigationV112 } from "./systems/canopyNavigationV112";
import styles from "./HuntCanopyHudV112.module.css";

const distance = (pixels: number) => `${Math.round(pixels)} px`;

export default function HuntCanopyHudV112({ navigation, bindings, gamepadButtons = DEFAULT_HUNT_GAMEPAD_V112, gripInput = "hold" }: {
  navigation: CanopyNavigationV112;
  bindings: ControlBindings;
  gamepadButtons?: HuntGamepadButtonsV112;
  gripInput?: "hold" | "toggle";
}) {
  if (!navigation.visible) return null;
  const up = controlActionShortcut("hunt.moveUp", bindings);
  const down = controlActionShortcut("hunt.moveDown", bindings);
  const left = controlActionShortcut("hunt.moveLeft", bindings);
  const right = controlActionShortcut("hunt.moveRight", bindings);
  const jump = controlActionShortcut("hunt.jump", bindings);
  const padJump = HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump];
  const { heldGrip, nearbyGrip, availableGrip, nextGrip, rest, mode } = navigation;
  const cue = mode === "locked" ? "Geste en cours : canopée indisponible." :
    mode === "exhausted" ? "Prise épuisée : atterris avant de reprendre appui." :
    mode === "swinging" ? `Direction pour pomper · ${jump} / ${padJump} pour lâcher.` :
    mode === "climbing" ? `Direction + Saut (${jump} / ${padJump}) pour bondir.` :
    availableGrip ? `${availableGrip.label} à portée : ${gripInput === "toggle" ? "presse" : "maintiens"} Haut (${up}).` :
    mode === "resting" ? rest?.reason ?? "Appui atteint : récupère avant de poursuivre." :
    nearbyGrip?.reason ?? nextGrip?.reason ?? "Choisis une vraie prise et une réception ; la route au sol reste possible.";
  return <aside className={styles.hud} aria-label="Navigation de canopée" data-canopy-hud-v112 data-canopy-mode={mode}>
    <div className={styles.heading}>
      <strong>Canopée{heldGrip ? ` · ${heldGrip.label}` : ""}</strong>
      <span data-canopy-stamina-v112 aria-label={`Endurance ${Math.floor(navigation.stamina)} ; nouvelle prise à partir de ${navigation.minimumGripStamina} points`}>Endurance {Math.floor(navigation.stamina)} · min. {navigation.minimumGripStamina}</span>
    </div>
    <p className={styles.cue} data-canopy-cue-v112 role="status" aria-live="polite" aria-atomic="true">{cue}</p>
    <details className={styles.details}>
      <summary>Commandes et repères de traversée</summary>
      {nextGrip && <p className={styles.landmark} data-canopy-next-v112 data-canopy-grip-state={nextGrip.state}>
        <span aria-hidden="true">↟ </span><strong>Prise suivante : {nextGrip.label}</strong> · {distance(nextGrip.distancePx)}. {nextGrip.reason}
      </p>}
      {rest && <p className={styles.landmark} data-canopy-rest-v112 data-canopy-rest-state={rest.state}>
        <span aria-hidden="true">▰ </span><strong>{rest.state === "resting" ? "Appui atteint" : "Repos repéré"} : {rest.label}</strong>
        {rest.state !== "resting" && ` · ${distance(rest.distancePx)}`}. {rest.reason}
      </p>}
      <p>Clavier : gauche/droite {left} / {right}, Haut/Bas {up} / {down}, Saut {jump}. Manette : stick pour les directions, {padJump} pour Saut. Tactile : mêmes directions et Saut.</p>
      {heldGrip?.flexible && <p>Sur la liane, corde ou chaîne : direction pour pomper, Haut/Bas ({up} / {down}) pour régler la longueur, Saut ({jump} / {padJump}) pour lâcher avec l’élan.</p>}
      <p>{gripInput === "toggle" ? "Prise en bascule : une pression sur Haut l’active, une autre la relâche." : "Prise par maintien : Haut prend appui ; direction + Saut lâche le support."}</p>
      {heldGrip && <p>Endurance de maintien : {heldGrip.staminaPerSecond.toFixed(1)} points/s avec ta charge actuelle{heldGrip.flexible ? " ; pomper et régler la longueur ajoutent leur effort" : ""}.</p>}
      <p>Les repères indiquent une géométrie réelle et une distance, sans garantir un saut. Seule une prise marquée « À portée » peut être saisie maintenant. Après un lâcher, laisse finir le délai de reprise ; après épuisement, une réception réelle est nécessaire.</p>
    </details>
  </aside>;
}
