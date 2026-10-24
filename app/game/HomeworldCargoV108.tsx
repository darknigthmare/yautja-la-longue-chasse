'use client';
import {useRef} from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import {HOMEWORLD_CARGO_V108 as b,HOMEWORLD_CARGO_LINES_V108 as lines,HOMEWORLD_CARGO_OPTIONS_V108 as options} from './systems/homeworldCargoDefinitionV108';
import type {HomeworldCargoLedgerV108} from './systems/homeworldCargoLedgerV108';
import {cargoPassageClearV108,type CargoActionV108} from './systems/homeworldCargoV108';
import styles from './HomeworldCargoV108.module.css';
const ownerNames:Record<string,string>={'local-quay-return-team':'Équipe locale des retours','local-quay-maintenance-team':'Équipe locale de maintenance'};
const locationNames:Record<string,string>={source:'au poste de départ',ground:'posé au sol',carried:'porté',rack:'dans son rack',depot:'au dépôt autorisé'};
export function cargoObjectiveV108(ledger:HomeworldCargoLedgerV108){const r=ledger.receipt;if(!r)return 'Choisir avec l’intendante comment dégager la traverse.';if(r.phase==='completed')return 'Les lots sont rangés et la traverse vers le sas a été éprouvée.';if(r.phase==='interrupted')return r.carrier?'Charge conservée : reprendre ici, ou la poser sur un sol libre.':'Rejoindre le dernier point confirmé pour reprendre.';if(r.phase==='return')return 'Revenir à pied auprès de l’intendante pour transmettre le constat.';if(!r.ownerConsents)return 'Recevoir au poste l’accord pour les lots et leurs propriétaires identifiés.';if(r.option==='B'&&!r.depositConsent)return 'Rejoindre le gardien et obtenir l’emplacement du dépôt.';if(r.carrier)return r.carrier==='wide'&&r.option==='B'?'Porter le lot large au dépôt autorisé.':`Porter le lot ${r.carrier==='wide'?'large':'étroit'} à son rack compatible.`;if(r.lots.some(l=>l.place==='source'||l.place==='ground'))return 'Prendre un lot et le porter à son emplacement, un à la fois.';if(r.passageStartWalked!==null)return 'Parcourir la traverse balisée jusqu’à son extrémité orientale.';return 'Rejoindre le début de la traverse et lancer son épreuve à pied.';}
export function CargoManifestV108({ledger}:{ledger:HomeworldCargoLedgerV108}){const lots=ledger.receipt?.lots??b.lots.map(l=>({id:l.id,ownerId:l.ownerId,place:'source',...l.origin}));return <table className={styles.manifest} data-cargo-manifest-v108><caption>Deux lots identifiés · une charge à la fois</caption><thead><tr><th>Lot</th><th>Propriétaire</th><th>Emplacement actuel</th></tr></thead><tbody>{lots.map(l=><tr key={l.id}><th scope="row">{l.id==='wide'?'Large':'Étroit'}</th><td>{ownerNames[l.ownerId]}</td><td>{locationNames[l.place]} · {Math.round(l.x)}, {Math.round(l.y)}</td></tr>)}</tbody></table>;}
export function CargoMapV108({ledger,actor}:{ledger:HomeworldCargoLedgerV108;actor?:{x:number;y:number}}){
 const lots=ledger.receipt?.lots??b.lots.map(l=>({id:l.id,place:'source',...l.origin})),box={left:6370,top:5230,right:7190,bottom:5660};
 const frame=(p:{x:number;y:number})=>({x:Math.max(box.left+30,Math.min(box.right-30,p.x)),y:Math.max(box.top+30,Math.min(box.bottom-30,p.y)),outside:p.x<box.left||p.x>box.right||p.y<box.top||p.y>box.bottom});
 return <svg className={styles.map} viewBox="6370 5230 820 430" role="img" aria-label={`Manutention du quai visité. ${cargoObjectiveV108(ledger)}`}><title>Lots, racks et traverse du quai · étage 0</title><rect className={styles.passage} x={b.passage.start.x} y={b.passage.start.y-34} width={b.passage.end.x-b.passage.start.x} height="68"/><text x="6700" y="5625">Traverse vers le sas →</text>
  <circle cx={b.host.x} cy={b.host.y} r="10"/><text x={b.host.x-55} y={b.host.y-20}>Intendante</text><circle cx={b.guardian.host.x} cy={b.guardian.host.y} r="10"/><text x={b.guardian.host.x-40} y={b.guardian.host.y-20}>Gardien</text>
  {b.racks.map(r=><g key={r.id}><rect x={r.x-34} y={r.y-17} width="68" height="34"/><text x={r.x-52} y={r.y-34}>{r.label}</text></g>)}<rect x={b.depot.x-38} y={b.depot.y-20} width="76" height="40" strokeDasharray="4 4"/><text x={b.depot.x-52} y={b.depot.y+50}>Dépôt</text>
  {lots.map(l=>{const p=frame(l);return <g key={l.id}><circle cx={p.x} cy={p.y} r={l.id==='wide'?15:10} data-cargo-placement={l.place}/><text x={p.x-40} y={p.y+32}>{l.id==='wide'?'Large':'Étroit'}{p.outside?' · hors cadre':''}</text></g>;})}{actor&&(()=>{const p=frame(actor);return <g><path d={`M${p.x} ${p.y-14}l-10 22h20Z`} fill="#92d6eb"/><text x={p.x-20} y={p.y-24}>Toi{p.outside?' · hors cadre':''}</text></g>;})()}
 </svg>;
}
function SourceLine({kind,option,disabled,reducedMotion}:{kind:string;option?:string;disabled:boolean;reducedMotion:boolean}){const line=lines.find(l=>l.kind===kind&&(!option||l.option===option));return line?<article className={styles.line} data-cargo-source-line-v108={line.id}><strong>{line.speaker}</strong><YautjaTranslationV67 text={line.text} paused={disabled} reducedMotion={reducedMotion}/></article>:null;}
export default function HomeworldCargoV108({ledger,disabled,message,onAction,onClose,reducedMotion=false}:{ledger:HomeworldCargoLedgerV108;disabled:boolean;message:string;onAction(action:CargoActionV108,revision:number):boolean;onClose():void;reducedMotion?:boolean}){
 const root=useRef<HTMLElement>(null),r=ledger.receipt,submit=(action:CargoActionV108)=>{root.current?.focus({preventScroll:true});return onAction(action,ledger.revision);};
 return <section ref={root} tabIndex={-1} className={styles.scene} data-cargo-scene-v108 data-cargo-phase={r?.phase??'offer'}><p>Le lot large encombre la traverse de manutention. Répartis les deux charges dans leurs racks, ou obtiens un dépôt pour le lot trop large. Chaque lot garde son propriétaire.</p>
  <CargoMapV108 ledger={ledger}/><CargoManifestV108 ledger={ledger}/>
  {!r&&<SourceLine kind="OUV" disabled={disabled} reducedMotion={reducedMotion}/>}
  {r?.phase==='choice'&&<SourceLine kind="CHOIX" option={r.option} disabled={disabled} reducedMotion={reducedMotion}/>}
  {r?.phase==='ready'&&<SourceLine kind="REPONSE" option={r.option} disabled={disabled} reducedMotion={reducedMotion}/>}
  {r?.phase==='completed'&&<SourceLine kind="SUCCES" disabled={disabled} reducedMotion={reducedMotion}/>}
  {r?.phase==='working'&&r.refusals>0&&!cargoPassageClearV108(ledger)&&<SourceLine kind="ECHEC" disabled={disabled} reducedMotion={reducedMotion}/>}
  {r?.phase==='interrupted'&&r.retryLineReady&&<SourceLine kind="REPRISE" disabled={disabled} reducedMotion={reducedMotion}/>}
  <p className={styles.objective}>{cargoObjectiveV108(ledger)}</p><div className={styles.actions}>
   {!r&&<><button disabled={disabled} onClick={()=>submit('choose-a')}>Répartir les lots dans les racks · A</button><button disabled={disabled} onClick={()=>submit('choose-b')}>Demander un dépôt pour le lot large · B</button></>}
   {r?.phase==='choice'&&<button disabled={disabled} onClick={()=>submit('reply')}>Écouter l’intendante</button>}
   {r?.phase==='ready'&&<button disabled={disabled} onClick={()=>{if(submit('start'))onClose();}}>Commencer la manutention à pied</button>}
   {r?.phase==='working'&&!r.ownerConsents&&<button disabled={disabled} onClick={()=>submit('consent-owner')}>Recevoir l’accord pour les lots identifiés</button>}
   {r?.phase==='working'&&!r.carrier&&r.refusals===0&&!cargoPassageClearV108(ledger)&&<button disabled={disabled} onClick={()=>submit('refuse')}>Constater la traverse encore encombrée</button>}
   {r?.phase==='interrupted'&&<button disabled={disabled} onClick={()=>{if(submit('resume'))onClose();}}>Reprendre depuis le dernier point confirmé</button>}
   {r?.phase==='return'&&<button disabled={disabled} onClick={()=>submit('report')}>Rapporter les emplacements et le passage éprouvé</button>}
   <button onClick={onClose}>Revenir au quai</button>
  </div>{message&&<p role="status">{message}</p>}
  <details className={styles.source}><summary>Origine de cette demande et limites de la scène</summary>{options.map(o=><p key={o.option}>{o.option} · {o.action} <small>({o.address})</small></p>)}<p>Scène locale originale V6. Cette implantation ajoute des contenants distincts, deux racks et un chariot avec les dessins natifs existants. Les personnes sont présentes au poste. La charge suit le marcheur ; les gestes peints de prise, de parole et de désignation restent à produire.</p><p>Les répliques d’issue attendent le constat matériel correspondant. La reprise évoquant le chariot reste silencieuse si l’objet n’y attend plus. Le trajet ne déclenche aucun voyage spatial.</p><small>Scènes de dialogue V6!A398:Q398 · Choix et actions V6!A818:I819 · Répliques V6!A3303:K3310</small></details>
 </section>;
}
export function HomeworldCargoJournalV108({ledger,actor,blocked,message,writePaused,onAction,onRetry}:{ledger:HomeworldCargoLedgerV108;actor:{x:number;y:number};blocked:boolean;message:string;writePaused:boolean;onAction(action:CargoActionV108,revision:number):boolean;onRetry():void}){
 const r=ledger.receipt;if(!r&&!writePaused)return null;
 return <aside className={styles.journal} aria-label="Carnet des charges du quai" data-cargo-journal-v108 data-cargo-status={r?.phase??'offer'} data-cargo-carrier={r?.carrier??'none'}><strong>Charges du quai · {r?.lots.filter(l=>l.place==='rack'||l.place==='depot').length??0}/2 rangées</strong><span>{cargoObjectiveV108(ledger)}</span><span>Charge : {r?.carrier?(r.carrier==='wide'?'lot large':'lot étroit'):'mains libres'} · marche mesurée : {Math.floor(r?.walked??0)} unités</span>
  <details><summary>Voir les lots et leurs emplacements</summary><CargoMapV108 ledger={ledger} actor={actor}/><CargoManifestV108 ledger={ledger}/>{r?.phase==='interrupted'&&<p>Dernier point confirmé : {Math.round(r.last.x)}, {Math.round(r.last.y)}.</p>}</details>
  {r?.phase==='interrupted'&&<><button disabled={blocked||writePaused} onClick={()=>onAction('resume',ledger.revision)}>Reprendre la manutention ici</button>{r.carrier&&<button disabled={blocked||writePaused} onClick={()=>onAction('park',ledger.revision)}>Poser le lot au sol ici</button>}</>}
  {r&&['working','return'].includes(r.phase)&&<button disabled={blocked||writePaused} onClick={()=>onAction('interrupt',ledger.revision)}>Interrompre et conserver les lots</button>}{writePaused&&<button onClick={onRetry}>Réessayer l’enregistrement des lots</button>}{message&&<span role="status">{message}</span>}
 </aside>;
}
