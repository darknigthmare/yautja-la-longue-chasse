"use client";

/* eslint-disable @next/next/no-img-element -- user-supplied native PNG sources */
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {RECENT_SPRITE_LIBRARY_V85,RECENT_SPRITE_ASSETS_V85,RECENT_SPRITE_KINDS_V85,
 normalizeRecentSpriteTextV85,type RecentSpriteSourceV85} from './systems/recentSpriteLibraryV85';
import {RECENT_SPRITE_CODEX_V85} from './systems/recentSpriteCodexV85';
import styles from './RecentSpriteLibraryV85.module.css';

const PAGE_SIZE=18;
function SourceImageV85({asset,thumbnail=false}:{asset:RecentSpriteSourceV85;thumbnail?:boolean}){
 const[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 // Very tall source sheets can exceed 50 million pixels. Keep their native
 // bytes accessible without decoding several of them just by opening a page.
 const largeReference=asset.kind==='reference'&&asset.width*asset.height>12_000_000;
 const[requested,setRequested]=useState(!largeReference);
 if(largeReference&&thumbnail)return<div className={styles.thumbnail}><p className={styles.imageStatus}>Planche originale<br/>{asset.width} × {asset.height}</p></div>;
 if(!requested)return<div className={styles.imageSurface}><p className={styles.imageStatus}>Source entière de grand format ({asset.width} × {asset.height}). Elle est conservée sans découpage. Son chargement peut demander beaucoup de mémoire.</p><button type="button" onClick={()=>setRequested(true)}>Afficher cette source grand format</button></div>;
 return<div className={thumbnail?styles.thumbnail:styles.imageSurface} data-source-status-v85={status}>
  <img src={asset.src} alt={thumbnail?'':asset.label} width={asset.width||1024} height={asset.height||1536}
   loading={thumbnail?'lazy':'eager'} decoding="async" hidden={status==='error'} onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')}/>
  {status==='error'&&<p className={styles.imageStatus}>Source indisponible à cet emplacement.</p>}
  {!thumbnail&&status==='loading'&&<p className={styles.imageStatus} role="status">Chargement de l’image…</p>}
 </div>;
}

/** Read-only source library. Root owns opening, closing and pausing the game;
 * this panel owns filters/focus and never mutates progression or character art. */
export default function RecentSpriteLibraryV85({onClose}:{onClose:()=>void}){
 const titleId=useId(),panel=useRef<HTMLElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const[query,setQuery]=useState(''),[kind,setKind]=useState(''),[pack,setPack]=useState(''),[group,setGroup]=useState('');
 const[includeHistory,setIncludeHistory]=useState(false),[page,setPage]=useState(0),[selectedId,setSelectedId]=useState('');
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;closeButton.current?.focus();
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;const controls=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, a[href]')??[]),first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };window.addEventListener('keydown',keydown);return()=>{window.removeEventListener('keydown',keydown);previous?.focus();};
 },[onClose]);
 const groups=useMemo(()=>Array.from(new Map(RECENT_SPRITE_ASSETS_V85.map(asset=>[asset.groupId,asset.groupLabel])).entries()).sort((a,b)=>a[1].localeCompare(b[1],'fr')),[]);
 const results=useMemo(()=>{const search=normalizeRecentSpriteTextV85(query);
  return RECENT_SPRITE_ASSETS_V85.filter(asset=>(includeHistory||asset.preferredVersion)&&(!kind||asset.kind===kind)&&(!pack||asset.packId===pack)&&(!group||asset.groupId===group)
   &&(!search||normalizeRecentSpriteTextV85(`${asset.label} ${asset.groupLabel} ${asset.roleLabel} ${asset.identityId} ${asset.sourceStatus} ${asset.sourcePath}`).includes(search)));
 },[query,kind,pack,group,includeHistory]);
 const currentPage=Math.min(page,Math.max(0,Math.ceil(results.length/PAGE_SIZE)-1)),visible=results.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
 const selected=results.find(asset=>asset.id===selectedId)??visible[0],record=selected?RECENT_SPRITE_CODEX_V85.find(item=>item.source.id===selected.id):null;
 const resetPage=()=>{setPage(0);setSelectedId('');};
 return<div className={styles.overlay}><section ref={panel} className={styles.library} role="dialog" aria-modal="true" aria-labelledby={titleId} data-recent-sprite-library-v85="true">
  <header className={styles.header}><div><p className={styles.eyebrow}>SOURCES FOURNIES · OCTOBRE 2026</p><h2 id={titleId}>Personnages, faune et matériaux</h2></div><button ref={closeButton} type="button" onClick={onClose} aria-label="Fermer la bibliothèque">Fermer</button></header>
  <p>Consultez les variantes documentées par clan, lignée et fonction. Les images sont présentées dans leur orientation d’origine ; les poses fixes et les versions antérieures gardent leur fiche source.</p>
  <p className={styles.notice}>{RECENT_SPRITE_LIBRARY_V85.uniqueReferencedHashes.toLocaleString('fr')} empreintes natives distinctes référencées, dont {RECENT_SPRITE_LIBRARY_V85.nativeRecoveredFilesV87} PNG récupérés en V87, {RECENT_SPRITE_LIBRARY_V85.nativeRecoveredFilesV88} planches historiques retrouvées en V88, {RECENT_SPRITE_LIBRARY_V85.nativeReferenceFilesV89} références Badlands ajoutées en V89 et les {RECENT_SPRITE_LIBRARY_V85.nativeGarrisonFilesV86} individus de garnison V6.8. Les poses fixes, cavaliers assemblés, illustrations et reconstitutions restent identifiés comme tels ; aucune nouvelle animation n’est déduite d’un PNG.</p>
  <div className={styles.filters}>
   <label>Rechercher<input type="search" value={query} maxLength={120} placeholder="Clan, rôle, Kalisk, texture…" onChange={event=>{setQuery(event.target.value);resetPage();}}/></label>
   <label>Famille<select value={kind} onChange={event=>{setKind(event.target.value);resetPage();}}><option value="">Toutes les familles</option>{RECENT_SPRITE_KINDS_V85.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
   <label>Pack<select value={pack} onChange={event=>{setPack(event.target.value);resetPage();}}><option value="">Tous les packs</option>{RECENT_SPRITE_LIBRARY_V85.packs.filter(item=>item.pngEntriesImported>0).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
   <label>Clan ou groupe<select value={group} onChange={event=>{setGroup(event.target.value);resetPage();}}><option value="">Tous les groupes</option>{groups.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  </div>
  <label className={styles.history}><input type="checkbox" checked={includeHistory} onChange={event=>{setIncludeHistory(event.target.checked);resetPage();}}/>Inclure les anciennes versions et sources provisoires</label>
  <p className={styles.count} role="status" aria-live="polite">{results.length.toLocaleString('fr')} fiche(s) · page {results.length?currentPage+1:0} sur {Math.ceil(results.length/PAGE_SIZE)}</p>
  {selected&&<figure className={styles.viewer} data-selected-sprite-v85={selected.id}>
   <SourceImageV85 key={selected.id} asset={selected}/><figcaption><div><h3>{selected.label}</h3><p>{selected.groupLabel} · {selected.roleLabel||selected.kind} · {selected.version}</p>
    <p>{selected.width} × {selected.height} · {selected.pose}</p><p className={styles.status}>Statut source : {selected.sourceStatus}{selected.producerStatus?' · '+selected.producerStatus:''}</p>
    <p>{selected.sourceNote}</p><p>{selected.sourceArchive}{selected.insideArchive?' → '+selected.insideArchive:''}</p>
    <details><summary>Identité et provenance</summary><p>Identité : {selected.identityId}</p><p>Fichier : {selected.sourcePath}</p><p className={styles.hash}>SHA256 {selected.sha256}</p>
     {record&&<ul>{record.constraints.map((constraint,index)=><li key={index}>{constraint}</li>)}</ul>}
     {!!record?.historicalVariants.length&&<p>Autres fiches de cette identité : {record.historicalVariants.length}. Activez l’historique pour les consulter.</p>}
    </details></div><a href={selected.src} target="_blank" rel="noopener noreferrer">Image originale</a></figcaption>
  </figure>}
  <div className={styles.grid}>{visible.map(asset=><button type="button" key={asset.id} className={styles.card} aria-pressed={asset.id===selected?.id} onClick={()=>setSelectedId(asset.id)}>
   <SourceImageV85 asset={asset} thumbnail/><strong>{asset.label}</strong><small>{asset.groupLabel} · {asset.version}</small><small>{asset.preferredVersion?'Version préférée de cette identité':'Version conservée ou provisoire'}</small>
  </button>)}</div>
  {!results.length&&<p>Aucune source ne correspond à ces filtres. <button type="button" onClick={()=>{setQuery('');setKind('');setPack('');setGroup('');resetPage();}}>Réinitialiser</button></p>}
  {results.length>PAGE_SIZE&&<nav className={styles.pagination} aria-label="Pages de la bibliothèque"><button type="button" disabled={currentPage===0} onClick={()=>{setPage(currentPage-1);setSelectedId('');}}>Page précédente</button><button type="button" disabled={(currentPage+1)*PAGE_SIZE>=results.length} onClick={()=>{setPage(currentPage+1);setSelectedId('');}}>Page suivante</button></nav>}
  <footer className={styles.footer}>Le pack PNJ V84 fournit {RECENT_SPRITE_LIBRARY_V85.summary.metadataOnlyNpcVariants} fiches de variantes dont les PNG sont absents de cette archive locale. Leur import documentaire est conservé. Les nouveaux gestes sociaux, cycles de marche et variantes jouables restent décrits séparément par leurs systèmes.</footer>
 </section></div>;
}
