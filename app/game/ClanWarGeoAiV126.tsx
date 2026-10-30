"use client";
import {useMemo,useState} from "react";
import {CLAN_WAR_COHERENT_VARIANTS_V126,auditClanWarWorldsV126,type WarCoherentVariantV126} from "./systems/clanWarWorldClimateV126";
import {createWarAiEncounterV126,allWarAiPresetsV126,type WarAiEncounterV126} from "./systems/clanWarEnemyProfilesV126";
import {
 createWarMultiplayerLobbyV126,joinWarMultiplayerLobbyV126,setWarMultiplayerLoadoutV126,
 setWarMultiplayerReadyV126,startWarMultiplayerLobbyV126,
 WAR_MULTIPLAYER_DEPLOYMENT_GATES_V126,type WarMultiplayerModeV126,type WarLobbyV126,
} from "./systems/clanWarMultiplayerV126";
import EarthPlanetMapV126 from "./EarthPlanetMapV126";
import styles from "./ClanWarGeoAiV126.module.css";
const modes=["assault","outer","stealth","rts"] as const;
const variants=CLAN_WAR_COHERENT_VARIANTS_V126;
const counts=auditClanWarWorldsV126();
const n=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function ContractDetail({variant,preset,coop}:{variant:WarCoherentVariantV126;preset:WarAiEncounterV126;coop:number}){
 const g=variant.geography,e=variant.environment;
 return <article className={styles.contract}>
  <p className={styles.overline}>{variant.sourceId} · {variant.original.mode} · {variant.original.family}</p>
  <h4>{g.siteName}</h4>
  <p><strong>Monde :</strong> {g.worldKind==="earth"?"Terre":g.worldKind==="known-alien"?"Monde étranger d’une œuvre":g.worldKind==="original-alien"?"Monde extraterrestre inventé":"Lieu de continuité à localiser"} · {g.worldId}</p>
  <p>{g.worldExplanation}</p>
  <dl className={styles.grid}>
   <div><dt>Région</dt><dd>{g.regionName}</dd></div>
   <div><dt>Position</dt><dd>{g.latitude===null?"Non géocodée — pas de fausses coordonnées":g.latitude.toFixed(4)+"°, "+g.longitude!.toFixed(4)+"°"}</dd></div>
   <div><dt>Biome corrigé</dt><dd>{e.biome}</dd></div>
   <div><dt>Climat</dt><dd>{e.climate} · {e.temperatureRule}</dd></div>
   <div><dt>Sol</dt><dd>{e.terrain}</dd></div>
   <div><dt>Eaux et liquides</dt><dd>{e.liquid}</dd></div>
   <div><dt>Météo validée</dt><dd>{e.weather}</dd></div>
   <div><dt>Météo V120 d&apos;origine</dt><dd>{e.originalWeather}{e.weatherAdjusted?" (remplacée)":""}</dd></div>
   <div><dt>Risques valables</dt><dd>{e.hazards.join(" · ")}</dd></div>
   <div><dt>Neige naturelle</dt><dd>{e.allowsNaturalSnow?"Possible sous conditions":"Non autorisée dans ce climat"}</dd></div>
  </dl>
  {variant.auditWarnings.length>0&&<p className={styles.notice}>Points restant à vérifier : {variant.auditWarnings.join(" · ")}</p>}
  <h5>Configuration IA — {preset.doctrine}, {coop} joueur(s)</h5>
  <p><strong>{preset.totalTeams}</strong> détachement(s) adverses prévu(s), soit <strong>{preset.totalCombatants}</strong> combattants estimés.
   Limite simultanée : <strong>{preset.maxSimultaneous}</strong>. Budget PC adverse : <strong>{preset.difficultyBudgetPc}</strong>.</p>
  <p>{preset.visibility==="hidden-until-report"?
    "Outer Ops : aucun détail de garnison cachée révélé au joueur avant le compte rendu.":
    "Groupes activés suivant leur phase, sans téléportation ni lecture d'une cible cachée."}</p>
  <p><strong>Tactique du terrain :</strong> {preset.terrainTactics}</p>
  <p><strong>Sans électricité :</strong> {preset.powerPolicy}</p>
  <p><strong>Contre-mesure IA :</strong> {preset.objectiveCounterplay}</p>
  {preset.roleGroups.length>0&&<div className={styles.roles}>
    {preset.roleGroups.map(group=><span key={group.id}>{group.unitId} · {group.role} · {group.expectedCombatants} combattant(s) · {group.activation}</span>)}
  </div>}
  <p className={styles.caution}>Statut : paramètres de futurs combats contre l&apos;IA, pas PNJ actuellement présents sur la carte. Aucun ajout d&apos;unités ni de récompenses en campagne.</p>
 </article>;
}
export default function ClanWarGeoAiV126(){
 const [tab,setTab]=useState<"geography"|"ai"|"multiplayer">("geography");
 const [search,setSearch]=useState(""),[mode,setMode]=useState<"all"|typeof modes[number]>("all");
 const [selectedId,setSelectedId]=useState(variants[0].sourceId);
 const [level,setLevel]=useState<1|2|3|4|5>(2),[coop,setCoop]=useState(1);
 const [roomMode,setRoomMode]=useState<WarMultiplayerModeV126>("co-op");
 const [lobby,setLobby]=useState<WarLobbyV126|null>(null);
 const [message,setMessage]=useState("Création et négociation de salons simulées localement — aucun réseau actif.");
 const filtered=useMemo(()=>variants.filter(v=>(mode==="all"||v.mode===mode)&&
  (!search.trim()||n([v.sourceId,v.geography.siteName,v.original.referenceName??"",v.geography.regionName].join(" ")).includes(n(search.trim())))),[mode,search]);
 const chosen=filtered.find(v=>v.sourceId===selectedId)??filtered[0];
 const preset=chosen?createWarAiEncounterV126(chosen,level,coop):null;
 function mutate(fn:(r:WarLobbyV126)=>{room:WarLobbyV126;reason:string;accepted:boolean}){
  if(!lobby)return;
  const result=fn(lobby);setMessage(result.reason);if(result.accepted)setLobby(result.room);
 }
 function createDemo(){
  if(!chosen)return;
  try {
   const created=createWarMultiplayerLobbyV126("DEMO-CLAN-001",chosen.sourceId,roomMode,"DEMO-LEADER","Chef local","DEMO-HASH-123",12515);
   setLobby(created);setMessage("Salon de démonstration créé en mémoire seulement. Aucun serveur ou connexion multijoueur n'a été ouvert.");
  }catch(e){setMessage(e instanceof Error?e.message:"Contrat non localisable.");}
 }
 return <section className={styles.root} data-testid="clan-world-ai-v126" aria-label="Audit géographie, climat, IA et conception multijoueur">
  <header><p className={styles.overline}>GUERRE DES CLANS · GÉOGRAPHIE / INTELLIGENCE / RÉSEAU · V126</p>
   <h3>1200 missions cohérentes avec leur planète et leur climat</h3>
   <p>Les lieux réels appartiennent à la Terre ; les mondes canoniques extraterrestres sont séparés et les mondes inventés possèdent leurs propres régions. Cinq configurations d&apos;ennemis sont disponibles comme dossiers de production pour chaque variante.</p>
  </header>
  <p className={styles.notice}><strong>Développement contrôlé :</strong> carte Terre mondiale géographique, climats réconciliés, 6 000 profils de rencontres IA et protocole multijoueur côté logique. Cela ne remplace ni un moteur d&apos;altitude/rues complet ni un serveur en ligne déjà exploitable.</p>
  <div className={styles.metrics}>
   <span><strong>{counts.count}</strong> missions analysées</span><span><strong>{counts.earth}</strong> placées sur Terre</span>
   <span><strong>{counts.alien}</strong> extraterrestres attribuées</span>
   <span><strong>{counts.unresolved}</strong> localisations de continuité en attente</span>
   <span><strong>6 000</strong> configurations IA</span>
  </div>
  <nav className={styles.tabs} aria-label="Outils V126">
   {([["geography","Terre et cohérence"],["ai","IA par mission"],["multiplayer","Multijoueur : protocole"]] as const)
    .map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}
  </nav>
  {tab==="geography"&&<EarthPlanetMapV126/>}
  {tab!=="geography"&&<>
   <div className={styles.tools}>
    <label>Gameplay<select value={mode} onChange={event=>setMode(event.target.value as typeof mode)}>
      <option value="all">Tous les modes</option>{modes.map(s=><option key={s} value={s}>{s}</option>)}
    </select></label>
    <label>Mission / lieu / monde<input type="search" maxLength={150} value={search} placeholder="Gunnison, Bouvet, CW120..."
      onChange={event=>setSearch(event.target.value)}/></label>
   </div>
   <div className={styles.pick}>
    <label>Contrat analysé · {filtered.length} résultats
      <select value={chosen?.sourceId??""} onChange={event=>{setSelectedId(event.target.value);setLobby(null);}}>
        {filtered.slice(0,300).map(v=><option key={v.sourceId} value={v.sourceId}>{v.sourceId} · {v.geography.siteName.slice(0,90)}</option>)}
      </select>
    </label>
    {filtered.length>300&&<small>Pour les 900 autres fiches, affinez le champ de recherche ou choisissez un gameplay.</small>}
   </div>
  </>}
  {tab==="ai"&&chosen&&preset&&<>
   <div className={styles.tools}>
    <label>Profil interne<select value={level} onChange={event=>setLevel(Number(event.target.value) as 1|2|3|4|5)}>
      {allWarAiPresetsV126(chosen).map(x=><option key={x.subVariant} value={x.subVariant}>{x.subVariant}. {x.doctrine}</option>)}
    </select></label>
    <label>Joueurs coopératifs simulés
      <select value={coop} onChange={event=>setCoop(Number(event.target.value))}>
       {[1,2,3,4].map(n=><option value={n} key={n}>{n}</option>)}
      </select>
    </label>
   </div>
   <ContractDetail variant={chosen} preset={preset} coop={coop}/>
  </>}
  {tab==="multiplayer"&&<>
   <div className={styles.multiplayer}>
    <h4>Coopération, guerre clan contre clan et mandats asynchrones</h4>
    <p>Le même identifiant de mission, le même monde, la même seed et les mêmes unités appartiennent à tous les clients. Le brouillard de guerre dissimule les équipes adverses et les commandes en doublon sont rejetées par le protocole.</p>
    <div className={styles.tools}>
     <label>Type de partie<select value={roomMode} onChange={event=>{setRoomMode(event.target.value as WarMultiplayerModeV126);setLobby(null);}}>
       <option value="co-op">Coopération jusqu&apos;à 4 joueurs</option>
       <option value="clan-pvp">Guerre de clans PvP jusqu&apos;à 4 contre 4</option>
       <option value="async-clan">Mandats de clans asynchrones, jusqu&apos;à 12 membres</option>
     </select></label>
     <div><button type="button" disabled={!chosen} onClick={createDemo}>Créer un salon local de démonstration</button></div>
    </div>
    <p role="status" className={styles.status}>{message}</p>
    {lobby&&<div className={styles.lobby}>
     <p><strong>{lobby.id}</strong> · {lobby.mode} · {lobby.stage} · monde {lobby.worldId} · révision {lobby.revision}</p>
     <p>{lobby.members.length} siège(s) · {lobby.seed} seed · progression de campagne interdite</p>
     <div className={styles.actions}>
      <button type="button" disabled={lobby.members.some(m=>m.id==="DEMO-ALLY")} onClick={()=>mutate(r=>joinWarMultiplayerLobbyV126(r,"DEMO-ALLY","Second joueur",roomMode==="co-op"?"hunter":"rival"))}>Ajouter un second siège local</button>
      <button type="button" disabled={!lobby.members.some(m=>m.id==="DEMO-ALLY")} onClick={()=>{
       mutate(r=>{
        const first=setWarMultiplayerLoadoutV126(r,"DEMO-LEADER",["EXERCISE-UNIT-001"]);
        if(!first.accepted)return first;
        return setWarMultiplayerLoadoutV126(first.room,"DEMO-ALLY",["EXERCISE-UNIT-002"]);
       });
      }}>Affecter deux identifiants d&apos;exercice</button>
      <button type="button" onClick={()=>mutate(r=>{
       const a=setWarMultiplayerReadyV126(r,"DEMO-LEADER",true);
       return a.accepted?setWarMultiplayerReadyV126(a.room,"DEMO-ALLY",true):a;
      })}>Déclarer les sièges prêts</button>
      <button type="button" onClick={()=>mutate(r=>startWarMultiplayerLobbyV126(r,"DEMO-LEADER"))}>Tester les conditions de lancement</button>
     </div>
     <p><strong>Attention :</strong> les identifiants EXERCISE n&apos;appartiennent à aucune sauvegarde réelle. Cette interface teste uniquement les règles du salon ; elle ne crée pas de serveur ni de véritable rencontre réseau.</p>
    </div>}
    <details><summary>Conditions obligatoires avant mise en ligne</summary>
      <ul>{WAR_MULTIPLAYER_DEPLOYMENT_GATES_V126.map(item=><li key={item}>{item}</li>)}</ul>
    </details>
   </div>
  </>}
 </section>;
}
