'use client';
/* eslint-disable @next/next/no-img-element -- original held images and whole reference boards are never atlas tracks */
import {useState} from 'react';
import {HOMEWORLD_FAUNA_LATEST_V77,HOMEWORLD_FAUNA_REFERENCE_BOARDS_V77,homeworldFaunaVariantsV77,
  homeworldFaunaDimensionsV77,type HomeworldFaunaArtV77} from './systems/homeworldFaunaV77';
import styles from './HomeworldFaunaCatalogueV77.module.css';
import RecentFaunaReferencesV85 from './RecentFaunaReferencesV85';

function NativeReference({art}:{art:HomeworldFaunaArtV77}){
  const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  return <figure className={styles.figure} data-fauna-art-id={art.id} data-native-format={art.format}
    data-native-animation-clips={art.nativeAnimationClips} data-fauna-source-sha={art.sha256}>
    <img key={`${art.id}-${attempt}`} src={art.src} alt={art.label} width={art.sourceWidth} height={art.sourceHeight}
      loading="lazy" decoding="async" draggable={false} style={{visibility:failed?'hidden':'visible'}}
      onLoad={event=>setFailed(!homeworldFaunaDimensionsV77(art.src,event.currentTarget.naturalWidth,event.currentTarget.naturalHeight))}
      onError={()=>setFailed(true)}/>
    {failed&&<div className={styles.error} role="alert"><p>Cette référence n’a pas chargé avec ses dimensions attendues. Aucun substitut n’est affiché.</p>
      <button type="button" onClick={()=>{setFailed(false);setAttempt(value=>value+1);}}>Réessayer cette image</button></div>}
    <figcaption>{art.format==='held'?'1 pose fixe · 0 clip animé natif':'Planche de référence entière · aucune animation'}</figcaption>
  </figure>;
}
function SpeciesReference({initial}:{initial:HomeworldFaunaArtV77}){
  const variants=homeworldFaunaVariantsV77(initial.speciesId!),[artId,setArtId]=useState(initial.id);
  const art=variants.find(candidate=>candidate.id===artId)??initial;
  return <article className={styles.card} data-fauna-species-id={initial.speciesId}>
    <h4>{initial.label}</h4>
    {variants.length>1&&<label className={styles.selector}>Version conservée
      <select value={art.id} onChange={event=>setArtId(event.target.value)}>
        {[initial,...variants.filter(candidate=>candidate.id!==initial.id)].map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.label}{candidate.sourceStatus.startsWith('SUPERSEDED')?' · ancienne version':''}</option>)}
      </select></label>}
    <NativeReference key={art.id} art={art}/>
    <p>{initial.referenceOnly?'Référence de statuette. Monture non jouable ; aucune fidélité canonique 1:1 certifiée.':'Image corrigée fournie. Placement régional original ; identité d’espèce et proportions biologiques non certifiées.'}</p>
    <dl><div><dt>Source</dt><dd>Tour {art.sourceTurn} · {art.sourceWidth} × {art.sourceHeight} px</dd></div>
      <div><dt>Traitement</dt><dd>Octets originaux conservés, alpha natif, échelle uniforme.</dd></div></dl>
    {art.borderPixels>0&&<p className={styles.warning}>Des pixels visibles touchent le bord source. L’image reste intacte ; aucune anatomie manquante n’a été inventée.</p>}
    <div className={styles.links}><a href={art.src} target="_blank" rel="noreferrer">Voir l’original</a><a href={art.sourceShare} target="_blank" rel="noreferrer">Conversation source</a>
      {initial.referenceOnly&&<a href="https://avp.fandom.com/wiki/Horse_(Yautja_creature)" target="_blank" rel="noreferrer">Origine de la statuette · source secondaire</a>}</div>
  </article>;
}
/** Separate archive inside the existing bestiary, without discovery/save props.
 * Viewing these supplied references does not unlock an enemy or a trophy. */
export default function HomeworldFaunaCatalogueV77(){
  return <section className={styles.root} aria-labelledby="fauna-references-v77-title" data-fauna-catalogue-v77>
    <header><span>Références visuelles fournies · 3 octobre 2026</span><h3 id="fauna-references-v77-title">Faune corrigée et variantes conservées</h3>
      <p>Cinq illustrations isolées. Ces fiches sont séparées des signatures à découvrir : elles n’offrent aucun scan, contrat, recrutement ou trophée. Les mouvements de placement en décor ne sont pas des animations dessinées.</p></header>
    <div className={styles.grid}>{HOMEWORLD_FAUNA_LATEST_V77.map(art=><SpeciesReference key={art.id} initial={art}/>)}</div>
    <RecentFaunaReferencesV85 />
    <details className={styles.references}><summary>Quatre planches de conception et une scène de référence, conservées intégralement</summary>
      <p>Ces images contiennent plusieurs sujets ou un décor. Elles restent des références ; elles ne sont ni découpées automatiquement, ni présentées comme des sprite sheets animées.</p>
      <div className={styles.grid}>{HOMEWORLD_FAUNA_REFERENCE_BOARDS_V77.map(art=><article key={art.id} className={styles.card}><h4>{art.label}</h4><NativeReference art={art}/><a href={art.src} target="_blank" rel="noreferrer">Voir la planche source entière</a></article>)}</div>
    </details>
  </section>;
}
