"use client";
import { useState } from "react";
import type { SaveGame } from "./types";
import { gameReserveV66Summary } from "./systems/gameReserveV66";
import { mainMenuModeAccessV81, mainMenuBrowserShipContextV81 } from './systems/mainMenuModesV81';
import styles from "./GameReserveEntryV104.module.css";
/** Replacing a reserve checkpoint requires an explicit, cancellable confirmation.
 * No change is displayed as successful until the campaign owner acknowledges it. */
export default function GameReserveEntryV66({save,onOpen}:{save:SaveGame;onOpen?:(fresh:boolean,version?:1|2|3)=>boolean}) {
  const [confirm,setConfirm]=useState(false),[message,setMessage]=useState("");
  const [version,setVersion]=useState<1|2|3>(1);
  const progress=save.gameReserveV66, summary=progress?gameReserveV66Summary(progress):null;
  const launch=(fresh:boolean)=>{if(onOpen?.(fresh,version)){setConfirm(false);setMessage("");}else setMessage("L’expédition n’a pas été sauvegardée. Réessaie après vérification du stockage ; l’ancienne partie reste protégée.");};
  return <section aria-label="Game Reserve · Vharuun" data-game-reserve-entry>
    <h3>Game Reserve · Vharuun</h3>
    <p>Choisis une expédition de Vharuun. Des groupes de combattants humains adultes armés récupèrent des composants et réparent leurs appareils pour s’évader. Observe les traces, approche sous couvert, choisis tes prises ou rejoins ton point de retour.</p>
    <p>Vharuun et ces adversaires sont des créations originales du jeu. Les autres réserves restent à découvrir. Aucun rite, rang ou équipement n’est accordé par ce mode.</p>
    {!mainMenuModeAccessV81(save,mainMenuBrowserShipContextV81(save))['game-reserve'] ? <p data-game-reserve-locked>La réserve attend le rite Blooded, un vaisseau personnel disponible et ses coordonnées acquises dans l’histoire. L’accès libre avec avertissement spoilers reste disponible depuis le menu principal.</p> : <>
      {summary && <p data-game-reserve-summary>{summary.observed} combattants observés · {summary.secured} prises sécurisées · {summary.escaped} évadés · {summary.remaining} encore présents. Durée : {Math.floor(summary.seconds / 60)} min {summary.seconds % 60} s.</p>}
      {progress && <p>Sortie enregistrée : {progress.version === 3 ? "traversée de Vharuun · huit secteurs et seize combattants" : progress.version === 2 ? "expédition des Balises · quatre secteurs" : "première expédition · trois secteurs"}. La reprise conserve ce terrain.</p>}
      {(!progress || confirm) && <label className={styles.choice}>Terrain de la nouvelle sortie <select aria-label="Terrain de la nouvelle expédition" value={version} onChange={event=>setVersion(event.target.value==='3'?3:event.target.value==='2'?2:1)} data-reserve-expedition-choice>
        <option value="1">Première expédition · trois secteurs</option><option value="2">Expédition des Balises · quatre secteurs et relevé du poste haut</option>
        <option value="3">Traversée de Vharuun · huit secteurs et seize combattants</option>
      </select></label>}
      {(!progress || confirm) && version === 3 && <p>Quatre groupes préparent quatre appareils pendant que tu parcours huit secteurs reliés. Consigne quatre relevés, dont trois nouveaux postes de terrain, puis rapporte-les à l’extraction. Huit nouveaux combattants originaux ont des observations, déplacements, tirs et capacités de réparation distincts.</p>}
      <button type="button" data-game-reserve-start disabled={!onOpen || confirm} onClick={()=>launch(false)}>{progress?progress.status==='active'?'Reprendre l’expédition':'Revoir le bilan':'Préparer l’expédition'}</button>
      {progress && !confirm && <button type="button" data-game-reserve-new onClick={()=>setConfirm(true)}>Nouvelle expédition</button>}
      {confirm && <div role="group" aria-label="Remplacer l’expédition de Vharuun"><p>Remplacer cette expédition et son bilan ? Les sauvegardes manuelles déjà créées restent intactes.</p><button type="button" data-game-reserve-confirm onClick={()=>launch(true)}>Confirmer la nouvelle expédition</button><button type="button" onClick={()=>setConfirm(false)}>Conserver l’expédition</button></div>}
      {message && <p role="alert">{message}</p>}
    </>}
  </section>;
}
