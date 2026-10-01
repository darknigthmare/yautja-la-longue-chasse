"use client";
import { useState } from "react";
import type { SaveGame } from "./types";
import { gameReserveV66Summary } from "./systems/gameReserveV66";
/** Replacing a reserve checkpoint requires an explicit, cancellable confirmation.
 * No change is displayed as successful until the campaign owner acknowledges it. */
export default function GameReserveEntryV66({save,onOpen}:{save:SaveGame;onOpen?:(fresh:boolean)=>boolean}) {
  const [confirm,setConfirm]=useState(false),[message,setMessage]=useState("");
  const progress=save.gameReserveV66, summary=progress?gameReserveV66Summary(progress):null;
  const launch=(fresh:boolean)=>{if(onOpen?.(fresh)){setConfirm(false);setMessage("");}else setMessage("L’expédition n’a pas été sauvegardée. Réessaie après vérification du stockage ; l’ancienne partie reste protégée.");};
  return <section aria-label="Game Reserve · Vharuun" data-game-reserve-entry>
    <h3>Game Reserve · Vharuun</h3>
    <p>Première expédition : trois secteurs reliés, huit combattants humains adultes armés et deux appareils qu’ils peuvent réparer pour s’évader. Observe les traces, approche sous couvert, choisis tes prises ou rejoins ton point de retour.</p>
    <p>Vharuun et ces adversaires sont des créations du jeu. Les neuf autres réserves et les cent portraits de la discussion ne sont pas intégrés à cette expédition. Aucun rite, rang ou équipement n’est accordé par ce mode.</p>
    {save.prologue ? <p data-game-reserve-locked>Les expéditions autonomes ne sont pas ouvertes au parcours de jeunesse. Poursuis la formation auprès du maître.</p> : <>
      {summary && <p data-game-reserve-summary>{summary.observed} combattants observés · {summary.secured} prises sécurisées · {summary.escaped} évadés · {summary.remaining} encore présents. Durée : {Math.floor(summary.seconds / 60)} min {summary.seconds % 60} s.</p>}
      <button type="button" data-game-reserve-start disabled={!onOpen || confirm} onClick={()=>launch(false)}>{progress?progress.status==='active'?'Reprendre l’expédition':'Revoir le bilan':'Préparer l’expédition'}</button>
      {progress && !confirm && <button type="button" data-game-reserve-new onClick={()=>setConfirm(true)}>Nouvelle expédition</button>}
      {confirm && <div role="group" aria-label="Remplacer l’expédition de Vharuun"><p>Remplacer cette expédition et son bilan ? Les sauvegardes manuelles déjà créées restent intactes.</p><button type="button" data-game-reserve-confirm onClick={()=>launch(true)}>Confirmer la nouvelle expédition</button><button type="button" onClick={()=>setConfirm(false)}>Conserver l’expédition</button></div>}
      {message && <p role="alert">{message}</p>}
    </>}
  </section>;
}
