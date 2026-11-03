'use client';
import {useRef,useState} from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import {HOMEWORLD_ARCHIVE_V106 as b,HOMEWORLD_ARCHIVE_LINES_V106 as lines,HOMEWORLD_ARCHIVE_OPTION_V106 as option} from './systems/homeworldArchiveDefinitionV106';
import type {HomeworldArchiveLedgerV106} from './systems/homeworldArchiveLedgerV106';
import type {ArchiveActionV106} from './systems/homeworldArchiveV106';
import styles from './HomeworldArchiveV106.module.css';
const objective=(ledger:HomeworldArchiveLedgerV106)=>{const r=ledger.receipt;if(!r)return 'Choisir le dépôt séparé avec l’archiviste.';if(r.phase==='completed')return 'Deux dossiers séparés ; lien historique non établi.';if(r.phase==='return')return 'Revenir à pied à l’archiviste et consigner l’incertitude.';if(r.phase==='interrupted')return r.carrier?`Dossier ${r.carrier} porté : reprendre ici ou le poser au sol avant de repartir.`:'Rejoindre le dernier point confirmé pour reprendre.';if(r.carrier)return `Porter le dossier ${r.carrier} au support ${r.carrier}.`;return 'Prendre un dossier au sol, puis rejoindre son support correspondant.';};
export function ArchiveMapV106({ledger,actor}:{ledger:HomeworldArchiveLedgerV106;actor?:{x:number;y:number}}){
  const cases=ledger.receipt?.cases??b.cases.map(c=>({id:c.id,...c.origin,place:'ground'}));
  const frame=(p:{x:number;y:number})=>{const outside=p.x<7040||p.x>7740||p.y<5040||p.y>5440;return {x:outside?Math.max(7070,Math.min(7710,p.x)):p.x,y:outside?Math.max(5100,Math.min(5390,p.y)):p.y,outside};};
  return <><svg className={styles.map} viewBox="7040 5040 700 400" role="img" aria-label={`Quai oriental déjà visité. ${objective(ledger)} Deux supports et les emplacements actuels des dossiers.`}>
    <title>Archivage physique · quai oriental connu uniquement</title>
    <text x="7070" y="5080">Quai oriental · étage 0</text>
    <circle cx={b.host.x} cy={b.host.y} r="12"/><text x={b.host.x-66} y={b.host.y-24}>Archiviste</text>
    {b.supports.map((s,i)=><g key={s.id}><rect x={s.x-24} y={s.y-16} width="48" height="32"/><text x={s.x-55} y={s.y-40}>Support {i?'B':'A'}</text></g>)}
    {cases.map(c=>{const p=frame(c);return <g key={c.id} data-archive-map-case={c.id} data-archive-map-outside={p.outside}><circle cx={p.x} cy={p.y} r="14" data-placement={c.place} strokeDasharray={p.outside?'5 4':undefined}/><text x={p.outside?p.x:c.x-40} y={p.y+40} textAnchor={p.outside?(p.x>7390?'end':'start'):undefined}>{c.id} · {p.outside?'hors cadrage du quai':c.place==='support'?'déposé':c.place==='carried'?'porté':'au sol'}</text></g>;})}
    {actor&&(()=>{const p=frame(actor);return <g><path d={`M${p.x} ${p.y-12}l-9 20h18Z`} fill="#98d9e8"/><text x={p.outside?p.x:actor.x-22} y={p.outside?Math.min(5410,p.y+65):p.y+65} textAnchor={p.outside?(p.x>7390?'end':'start'):undefined}>Toi{p.outside?' · hors cadrage du quai':''}</text></g>;})()}
  </svg><ul aria-label="Emplacements actuels des dossiers" data-archive-placement-list-v106>{cases.map(c=><li key={c.id}>Dossier {c.id} · {c.place==='support'?`sur le support ${c.id}`:c.place==='carried'?'porté':'au sol'} · position {Math.round(c.x)}, {Math.round(c.y)}{frame(c).outside?' · hors cadrage du quai':''}</li>)}</ul></>;
}
export default function HomeworldArchiveV106({ledger,disabled,message,onAction,onClose,reducedMotion=false}:{ledger:HomeworldArchiveLedgerV106;disabled:boolean;message:string;onAction(action:ArchiveActionV106,revision:number):boolean;onClose():void;reducedMotion?:boolean}){
  const root=useRef<HTMLElement>(null),[source,setSource]=useState(false),r=ledger.receipt;
  const line=r?lines.find(l=>l.kind===(r.phase==='choice'?'CHOIX':r.phase==='completed'?'SUCCES':'REPONSE')&&(l.option==='B'||l.kind==='SUCCES')):null;
  const submit=(action:ArchiveActionV106)=>{root.current?.focus({preventScroll:true});return onAction(action,ledger.revision);};
  return <section ref={root} tabIndex={-1} className={styles.scene} data-archive-scene-v106={b.sceneId} data-archive-phase={r?.phase??'offer'}>
    <p>Deux dossiers d’étude génériques sont matérialisés dans des contenants scellés. Porte-les un par un vers les deux supports distincts, puis reviens consigner ce que ce dépôt permet de conclure.</p><p>Ce dépôt concerne les dossiers A/B. La plaque et l’empreinte sont étudiées séparément au poste K-17 du quai oriental ; elles gardent leurs propres places et relevés.</p>
    <ArchiveMapV106 ledger={ledger}/>
    {line&&<article className={styles.line} data-archive-source-line={line.id}><strong>{line.speaker}</strong><YautjaTranslationV67 text={line.text} paused={disabled} reducedMotion={reducedMotion}/></article>}
    <p>{objective(ledger)}</p><div className={styles.actions}>
      {!r&&<button disabled={disabled} onClick={()=>submit('choose-b')}>Conserver les deux traces séparées</button>}
      {r?.phase==='choice'&&<button disabled={disabled} onClick={()=>submit('reply')}>Écouter l’archiviste</button>}
      {r?.phase==='ready'&&<button disabled={disabled} onClick={()=>{if(submit('start'))onClose();}}>Aller chercher le premier dossier</button>}
      {r?.phase==='return'&&<button disabled={disabled} onClick={()=>submit('report')}>Consigner le lien comme une question ouverte</button>}
      <button onClick={onClose}>Revenir au quai</button>
    </div>{message&&<p role="status">{message}</p>}
    {r?.phase==='completed'&&<p>Les deux contenants restent sur leurs supports. Aucun lien historique, rang ou objet d’inventaire n’est accordé.</p>}
    <button aria-expanded={source} onClick={()=>setSource(!source)}>Origine et limites de cette demande</button>
    {source&&<aside className={styles.source}><p>{option.action}</p><p>Scène originale du projet V6. Mise en scène locale : dossiers d’étude génériques, deux contenants natifs réduits uniformément à une hauteur de 34 unités, deux pupitres natifs de 76 unités et corps neutre existant. Le portage est un repère de charge visible, sans nouvelle pose de prise peinte.</p><p>Cette adaptation de la branche B conserve des dossiers scellés : son ouverture n’attribue aucune plaque ni empreinte à leur contenu. Les objets précis et l’ouverture correspondante sont disponibles dans l’étude distincte K-17. L’incertitude est conservée explicitement dans les deux études.</p><small>Scènes de dialogue V6!A383:Q383 · {option.address} · Répliques V6!A3184:K3184, A3189:K3190</small></aside>}
  </section>;
}
export function HomeworldArchiveJournalV106({ledger,actor,blocked,message,writePaused,onAction,onRetry}:{ledger:HomeworldArchiveLedgerV106;actor:{x:number;y:number};blocked:boolean;message:string;writePaused:boolean;onAction(action:ArchiveActionV106,revision:number):boolean;onRetry():void}){
  const r=ledger.receipt;if(!r&&!writePaused)return null;
  return <aside className={styles.journal} aria-label="Carnet des dossiers séparés" data-archive-journal-v106 data-archive-status={r?.phase??'offer'} data-archive-carrier={r?.carrier??'none'}><strong>Archivage · {r?.cases.filter(c=>c.place==='support').length??0}/2 dossiers déposés</strong><span>{objective(ledger)}</span>
    <span>Charge : {r?.carrier?`dossier ${r.carrier} porté`:'mains libres'} · marche mesurée : {Math.floor(r?.walked??0)} unités</span>
    <details><summary>Voir les supports et les dossiers</summary><ArchiveMapV106 ledger={ledger} actor={actor}/>{r?.phase==='interrupted'&&<p>Dernier point confirmé : {Math.round(r.last.x)}, {Math.round(r.last.y)}.</p>}</details>
    {r?.phase==='interrupted'&&<><button disabled={blocked||writePaused} onClick={()=>onAction('resume',ledger.revision)}>Reprendre l’archivage ici</button>{r.carrier&&<button disabled={blocked||writePaused} onClick={()=>onAction('park',ledger.revision)}>Poser le dossier au sol ici</button>}</>}
    {r&&['working','return'].includes(r.phase)&&<button disabled={blocked||writePaused} onClick={()=>onAction('interrupt',ledger.revision)}>Interrompre et conserver les emplacements</button>}
    {writePaused&&<button onClick={onRetry}>Réessayer l’enregistrement des dossiers</button>}{message&&<span role="status">{message}</span>}
  </aside>;
}
