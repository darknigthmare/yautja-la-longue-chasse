"use client";
import {useState} from "react";
import {
 createWarMultiplayerLobbyV126,joinWarMultiplayerLobbyV126,setWarMultiplayerLoadoutV126,
 setWarMultiplayerReadyV126,startWarMultiplayerLobbyV126,
} from "./systems/clanWarMultiplayerV126";
import {
 createWarMultiplayerPracticeV127,applyWarMultiplayerPracticeCommandV127,
 stepWarMultiplayerPracticeV127,viewWarMultiplayerPracticeV127,
 type WarMultiplayerPracticeV127,
} from "./systems/clanWarMultiplayerPracticeV127";
import {CLAN_WAR_COHERENT_VARIANTS_V126} from "./systems/clanWarWorldClimateV126";
import styles from "./ClanWarMultiplayerPracticeV127.module.css";
const practiceSource=CLAN_WAR_COHERENT_VARIANTS_V126.find(
 v=>v.mode==="rts"&&v.geography.worldKind==="original-alien")!;
function newMatch():WarMultiplayerPracticeV127{
 let room=createWarMultiplayerLobbyV126("LOCAL-DEMO-V127",practiceSource.sourceId,"clan-pvp",
   "LOCAL-A","Chasseur A","LOCAL-HOST-AUTH",12345);
 room=joinWarMultiplayerLobbyV126(room,"LOCAL-B","Chasseur B","rival").room;
 room=setWarMultiplayerLoadoutV126(room,"LOCAL-A",["LOCAL-SQUAD-A"]).room;
 room=setWarMultiplayerLoadoutV126(room,"LOCAL-B",["LOCAL-SQUAD-B"]).room;
 room=setWarMultiplayerReadyV126(room,"LOCAL-A",true).room;
 room=setWarMultiplayerReadyV126(room,"LOCAL-B",true).room;
 const launched=startWarMultiplayerLobbyV126(room,"LOCAL-A");
 if(!launched.accepted)throw Error(launched.reason);
 return createWarMultiplayerPracticeV127(launched.room);
}
export default function ClanWarMultiplayerPracticeV127(){
 const [state,setState]=useState<WarMultiplayerPracticeV127|null>(null);
 const [activeId,setActiveId]=useState("LOCAL-A");
 const [message,setMessage]=useState("Deux joueurs sur un même appareil, aucune connexion internet.");
 function start(){
  try{setState(newMatch());setActiveId("LOCAL-A");setMessage("Manche d'entraînement initialisée, sans unité de campagne.");}
  catch(e){setMessage(e instanceof Error?e.message:"Salon local indisponible.");}
 }
 function action(kind:"move"|"attack"|"hold"|"retreat",x:number|null=null,y:number|null=null){
  if(!state)return;
  const id=activeId==="LOCAL-A"?"LOCAL-SQUAD-A":"LOCAL-SQUAD-B";
  const member=state.room.members.find(m=>m.id===activeId);
  const sequence=(member?.lastSequence??0)+1;
  const command={clientCommandId:"LOCAL-"+state.room.tick+"-"+activeId+"-"+sequence,
   actorId:activeId,sequence,expectedRevision:state.room.revision,
   tick:state.room.tick,kind,unitInstanceId:id,targetX:x,targetY:y};
  const result=applyWarMultiplayerPracticeCommandV127(state,command,activeId);
  setMessage(result.reason);if(result.accepted)setState(result.state);
 }
 function tick(){
  if(!state)return;const result=stepWarMultiplayerPracticeV127(state);
  setMessage(result.reason);if(result.accepted)setState(result.state);
 }
 const view=state?viewWarMultiplayerPracticeV127(state,activeId):null;
 return <section className={styles.root} aria-label="Démonstrateur de combat local en tour alterné V127" data-testid="war-local-pvp-v127">
  <p className={styles.eyebrow}>MULTIJOUEUR · DEUX JOUEURS SUR LE MÊME ÉCRAN</p>
  <h4>Prototype PvP local 9 × 6 — commandes contrôlées</h4>
  <p>Ce mode permet de vérifier réellement le placement, les déplacements, la portée, les couverts, les identifiants de détachement, le brouillard de guerre et la tenue de l&apos;objectif. Il ne remplace pas un serveur WebSocket, un matchmaking ou le mode 4 contre 4 final.</p>
  <div className={styles.actions}>
   <button type="button" onClick={start}>{state?"Réinitialiser la manche":"Créer une manche locale"}</button>
   {state&&<button type="button" onClick={()=>setActiveId(id=>id==="LOCAL-A"?"LOCAL-B":"LOCAL-A")}>Passer au {activeId==="LOCAL-A"?"joueur B":"joueur A"}</button>}
   {state&&<button type="button" disabled={Boolean(state.winner)} onClick={tick}>Résoudre le tick commun</button>}
   {state&&<button type="button" disabled={Boolean(state.winner)} onClick={()=>action("hold")}>Tenir sa position</button>}
   {state&&<button type="button" disabled={Boolean(state.winner)} onClick={()=>action("retreat")}>Repli du pion actif</button>}
  </div>
  <p className={styles.message} role="status" aria-live="polite">{message}</p>
  {state&&view&&<>
   <p><strong>Joueur visible :</strong> {activeId==="LOCAL-A"?"A — chasseurs":"B — rivaux"} ·
      Tick {view.tick} · Point de contrôle : ({view.capture.x},{view.capture.y}) ·
      Tenue A : {state.hold.hunter}/3 · Tenue B : {state.hold.rival}/3</p>
   <div className={styles.grid} role="group" aria-label="Terrain à neuf colonnes et six lignes. Touchez une case adjacente pour progresser, une cible visible pour tirer.">
    {Array.from({length:54},(_,i)=>{
      const x=i%9,y=Math.floor(i/9);
      const unit=view.fighters.find(f=>f.x===x&&f.y===y);
      const capture=x===4&&y===2,blocked=view.blocked.includes(x+","+y),cover=view.cover.includes(x+","+y);
      const symbol=unit?(unit.side==="hunter"?"Y":"R"):blocked?"▥":capture?"◎":cover?"▤":"·";
      return <button type="button" key={i} disabled={Boolean(state.winner)||blocked}
        className={styles.cell} data-unit={unit?.side??""} data-capture={capture}
        aria-label={"Case "+x+","+y+" : "+(unit?unit.side+" / "+unit.id:
          blocked?"mur":capture?"point de contrôle":cover?"couvert":"libre")}
        title={"Case "+x+","+y+(unit?" · PV "+unit.hp:"")}
        onClick={()=>action(unit&&unit.side!==(activeId==="LOCAL-A"?"hunter":"rival")?"attack":"move",x,y)}>
        {symbol}</button>;
    })}
   </div>
   <p className={styles.legend}>Y = équipe chasseuse, R = équipe rivale visible, ◎ = poste à tenir trois ticks, ▤ = couvert, ▥ = mur. Les adversaires hors du champ de vision sont volontairement masqués.</p>
   {state.winner&&<p role="status" className={styles.victory}>Victoire d&apos;exercice : {state.winner==="hunter"?"chasseurs":"rivaux"}. Aucun territoire, équipement ou XP de campagne attribué.</p>}
   <details><summary>Journal de simulation (sans secrets ennemis)</summary><ol>{view.events.slice(-15).map((e,i)=><li key={i}>{e}</li>)}</ol></details>
  </>}
  <p className={styles.disclaimer}>Démo en mémoire uniquement : les identifiants LOCAL-SQUAD-A/B sont des figurants de test, pas des combattants W3 existants. La synchronisation en ligne, l&apos;identité authentifiée et les transactions sur les vrais clans restent à développer.</p>
 </section>;
}
