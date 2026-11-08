"use client";
/* eslint-disable @next/next/no-img-element -- source sprites retain their explicit review status */
import {useMemo,useState} from 'react';
import type {SaveGame} from './types';
import type {GameSfxId} from './sound';
import {MOBILITY_CATALOGUE,MOBILITY_MODULES,mobilityStats,mobilityRankIndex} from './systems/mobility/catalogue';
import {createMobilityLedger,mobilityServiceQuote,type MobilityOrder} from './systems/mobility/ledger';
import type {MobilityWriter} from './systems/mobility/controller';
import MobilityDrivingYard from './MobilityDrivingYard';
import styles from './MobilityGarage.module.css';
export interface MobilityGarageProps {save:SaveGame;suspended?:boolean;onCommand:MobilityWriter;onClose:()=>void;onSound?:(id:GameSfxId)=>void}
const modeLabels:Record<string,string>={purchase:'Commande aux Forges',quest:'Quête / recrutement',craft:'Fabrication',faction:'Réservé à une faction','training-loan':'Prêt supervisé','clan-service':'Service du clan',insertion:'Insertion',narrative:'Narration','non-pilotable':'Non pilotable'};
export default function MobilityGarage({save,suspended=false,onCommand,onClose,onSound}:MobilityGarageProps){
 const [selected,setSelected]=useState('clan_hoverbike'),[filter,setFilter]=useState('all'),[message,setMessage]=useState('');
 const ledger=useMemo(()=>save.mobilityV1??createMobilityLedger(save.createdAt),[save.mobilityV1,save.createdAt]);
 const model=MOBILITY_CATALOGUE.find(d=>d.id===selected)!;
 const owned=ledger.owned.find(v=>v.id===model.id);
 const stats=owned?mobilityStats(model.id,owned.upgrades,owned.condition):mobilityStats(model.id);
 const allowed=!suspended&&!ledger.active;
 const order=(action:MobilityOrder)=>{if(!allowed)return;const r=onCommand({...action,ownerCreatedAt:save.createdAt,expectedRevision:ledger.revision});setMessage(r.message);if(r.accepted)onSound?.('select');};
 const entries=MOBILITY_CATALOGUE.filter(d=>filter==='all'||filter==='owned'&&ledger.owned.some(v=>v.id===d.id)||filter==='sale'&&d.shopEnabled||filter===d.kind);
 const paidAllowed=allowed&&ledger.recoveryDebt===0;
 const canBuy=paidAllowed&&!owned&&model.shopEnabled&&ledger.circulationPermit&&mobilityRankIndex(save.profile.rankId)>=mobilityRankIndex(model.minimumRank)&&save.profile.clanMarks>=(model.purchasePrice??Infinity);
 return <section className={styles.shell} aria-labelledby="mobility-title" data-mobility-garage>
  <header className={styles.heading}><div><small>FORGES · COMPTOIR DES CONVOIS</small><h2 id="mobility-title">Registre de mobilité</h2><p>Commande, entretien et aire de conduite du clan</p></div><div className={styles.balance}><strong>{save.profile.clanMarks.toLocaleString('fr-FR')}</strong><span>marques de clan</span><span>Permis : {ledger.circulationPermit?'confirmé':'à obtenir'}</span></div></header>
  {ledger.recoveryDebt>0&&<section className={styles.notice} aria-label="Dette de remorquage"><strong>Récupération à régler · {ledger.recoveryDebt} marques</strong><p>Le retour de sécurité conserve les dommages et la réserve. Les sorties personnelles et l’atelier sont suspendus jusqu’au règlement ; les chasses à pied restent accessibles.</p><button disabled={!allowed||save.profile.clanMarks<ledger.recoveryDebt} onClick={()=>order({type:'settle-recovery',expectedCost:ledger.recoveryDebt})}>Régler le remorquage · {ledger.recoveryDebt} marques</button></section>}
  {ledger.active ? <MobilityDrivingYard key={`${save.createdAt}:${ledger.active.id}`} state={ledger} bindings={save.settings.controlBindings} suspended={suspended} onCommand={onCommand} onSound={onSound}/> : <>
   <section className={styles.notice} aria-label="Prêt de formation"><strong>{ledger.circulationPermit?'Aire des convois':'Obtenir le permis de circulation'}</strong><p>Un Grav-Sled est prêté pour les trois balises, un chargement et le retour au sas. Ce prêt ne donne ni propriété, ni rang, ni honneur.</p><button onClick={()=>order({type:'start',modelId:'scout_grav_sled',loaned:true})} disabled={!allowed}>Prendre le Grav-Sled de formation</button></section>
   <div className={styles.layout}>
    <aside className={styles.catalogue}><label htmlFor="mobility-filter">Registre du clan</label><select id="mobility-filter" value={filter} onChange={e=>setFilter(e.target.value)} disabled={suspended}><option value="all">Tous les modèles · 50</option><option value="sale">Commandable maintenant</option><option value="owned">Mon garage</option><option value="machine">Machines</option><option value="mount">Montures</option></select>
     <div role="list" className={styles.items}>{entries.map(d=><button role="listitem" type="button" key={d.id} aria-pressed={selected===d.id} onClick={()=>setSelected(d.id)} disabled={suspended} className={selected===d.id?styles.selected:''}><small>{String(d.index).padStart(2,'0')} · {d.kind==='mount'?'MONTURE':'MACHINE'}</small><strong>{d.name}</strong><span>{ledger.owned.some(v=>v.id===d.id)?'Au garage':modeLabels[d.acquisitionMode]}</span></button>)}</div>{entries.length===0&&<p>Aucun modèle dans cette sélection.</p>}
    </aside>
    <article className={styles.detail} aria-label={model.name}>
     <div className={styles.heading}><div><small>{model.family} · palier {model.tier}</small><h3>{model.name}</h3></div><span className={styles.tag}>{owned?'POSSESSION CONFIRMÉE':modeLabels[model.acquisitionMode]}</span></div>
     <div className={styles.preview}>{model.previewPath?<img src={model.previewPath} width="1536" height="1024" alt={`${model.name} — source statique en cours de revue`}/>:<div><strong>Référence de la bible</strong><p>{model.silhouette}</p></div>}<span>Source de revue · fidélité artistique non certifiée</span></div>
     <p>{model.role}</p>
     <dl className={styles.metrics}><div><dt>Vitesse de piste</dt><dd>{stats.speed.toFixed(1)} u/s</dd></div><div><dt>Accélération</dt><dd>{stats.acceleration.toFixed(1)} u/s²</dd></div><div><dt>Charge utile</dt><dd>{stats.capacity.toFixed(0)} kg</dd></div><div><dt>Résistance aux chocs</dt><dd>{(stats.collisionResistance*100).toFixed(0)} %</dd></div></dl>
     <p className={styles.hint}>Valeurs originales d’équilibrage de la piste, pas des mesures canoniques. Les capacités annoncées dans la bible ne sont pas toutes jouables.</p>
     <section><h4>Obtention et disponibilité</h4><p>{model.acquisition}</p>{model.shopEnabled?<><p>Commande : <strong>{model.purchasePrice} marques</strong> · permis et rang Blooded requis.</p><button disabled={!canBuy} onClick={()=>order({type:'buy',modelId:model.id,expectedCost:model.purchasePrice!})}>{owned?'Déjà au garage':`Confirmer l’achat · ${model.purchasePrice} marques`}</button></>:<p className={styles.tag}>Pas de vente de remplacement : la voie d’obtention de la bible reste obligatoire.</p>}</section>
     {owned&&<section data-mobility-maintenance><h4>Garage · état persistant</h4><p>État {owned.condition.toFixed(1)} % · réserve {owned.energy.toFixed(1)} % · trajet {owned.distance.toFixed(0)} unités de piste</p><div className={styles.actions}>{(['repair','recharge','care']as const).map(type=>{const cost=mobilityServiceQuote(ledger,model.id,type);if((type==='care')!==(model.kind==='mount'))return null;return <button key={type} disabled={!paidAllowed||cost===null||save.profile.clanMarks<(cost??Infinity)} onClick={()=>order({type,modelId:model.id,expectedCost:cost!})}>{type==='repair'?'Réparer':type==='recharge'?'Recharger':'Soigner / reposer'}{cost!==null?` · ${cost} marques`:' · inutile'}</button>;})}<button disabled={!paidAllowed||!model.trialEnabled||owned.condition<25||owned.energy<10} onClick={()=>order({type:'start',modelId:model.id,loaned:false})}>Sortir sur l’aire</button></div>
      {model.kind==='machine'&&<div className={styles.modules}>{MOBILITY_MODULES.map(mod=>{const cost=mobilityServiceQuote(ledger,model.id,'upgrade',mod.id);return <article key={mod.id}><strong>{mod.name} · {owned.upgrades[mod.id]}/3</strong><p>{mod.description}</p><button disabled={!paidAllowed||cost===null||save.profile.clanMarks<(cost??Infinity)} onClick={()=>order({type:'upgrade',modelId:model.id,module:mod.id,expectedCost:cost!})}>{cost===null?'Niveau maximal':`Installer · ${cost} marques`}</button></article>;})}</div>}
     </section>}
     <details><summary>Doctrine, limites et biomes</summary><p>{model.source_class}</p><p>Biomes : {model.biomes.join(', ')}.</p><p>Contraintes : {model.weaknesses.join(' · ')}.</p><p>Capacités de conception : {model.abilities.join(' · ')}.</p><p>Gabarit proposé : {model.dimensions} · équipage : {model.crew}.</p><p>Chasses montées, transfert orbital, variantes d’état, animations et sons dédiés restent suivis séparément ; aucune propriété de compagnon n’est créée par ce catalogue.</p></details>
    </article>
   </div>
   {ledger.lastReport&&<p className={styles.notice}>Dernière sortie : {ledger.lastReport.result==='passed'?'circuit validé':ledger.lastReport.result==='recovered'?'récupération de sécurité':'engin remisé'} · {ledger.lastReport.distance.toFixed(0)} unités · {ledger.lastReport.impacts} impacts.</p>}
   <p role="status">{message}</p><button onClick={onClose} disabled={suspended}>Retour au comptoir des Forges</button>
  </>}
 </section>;
}
