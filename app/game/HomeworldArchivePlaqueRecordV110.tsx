import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as station,type ArchivePlaqueIdV109} from './systems/homeworldArchivePlaqueDefinitionV109';
import type {ArchivePlaquePointV109,HomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import {HOMEWORLD_ARCHIVE_PLAQUE_MAP_V110 as frame,archivePlaqueMapPointV110,archivePlaquePlaceLabelV110,archivePlaqueRecordsV110} from './systems/homeworldArchivePlaqueRecordV110';
import styles from './HomeworldArchivePlaqueRecordV110.module.css';

const coordinates=(point:ArchivePlaquePointV109)=>`${Math.round(point.x)}, ${Math.round(point.y)}`;
const symbol=(id:ArchivePlaqueIdV109)=>id==='plaque'?'P':id==='trace'?'E':'F';

export function ArchivePlaqueMapV110({ledger,actor}:{ledger:HomeworldArchivePlaqueV109;actor?:ArchivePlaquePointV109}){
  const records=archivePlaqueRecordsV110(ledger),projectedActor=actor?archivePlaqueMapPointV110(actor):null;
  return <>
    <svg viewBox={`${frame.left} ${frame.top} ${frame.width} ${frame.height}`} className={styles.map} role="img" aria-label="Poste K-17 : pièces actuelles, lieux observés et surfaces séparées. Les positions hors cadre sont signalées au bord de la carte." data-plaque-map-v110>
      <title>Étude K-17 · positions réelles conservées</title>
      {station.supports.map(support=><g key={support.id}><rect x={support.x-27} y={support.y-14} width="54" height="28"/><text x={support.x} y={support.y+35} textAnchor="middle">{symbol(support.id)}</text></g>)}
      <circle cx={station.post.x} cy={station.post.y} r="10"/><text x={station.post.x+14} y={station.post.y+5}>Archiviste</text>
      {records.map(record=>record.discoveryPosition&&<circle key={record.id} className={styles.discovery} cx={record.discoveryPosition.x} cy={record.discoveryPosition.y} r="14" data-plaque-map-discovery-v110={record.id}><title>{`${record.label} · lieu observé : ${coordinates(record.discoveryPosition)}`}</title></circle>)}
      {records.map(record=>{
        const point=record.projection;
        return <g key={record.id} data-plaque-map-object-v109={record.id} data-plaque-map-outside-v110={point.outside}>
          <circle cx={point.x} cy={point.y} r="8" data-placement={record.place} strokeDasharray={point.outside?'4 3':undefined}><title>{`${record.label} · ${archivePlaquePlaceLabelV110(record.place)} · position réelle ${coordinates(record.position)}${point.outside?' · hors cadre du poste':''}`}</title></circle>
          <text x={point.x} y={point.y+26} textAnchor={point.outside?(point.x>frame.left+frame.width/2?'end':'start'):'middle'}>{symbol(record.id)}{point.outside?' · hors cadre':''}</text>
        </g>;
      })}
      {actor&&projectedActor&&<g data-plaque-map-actor-v110 data-plaque-map-outside-v110={projectedActor.outside}><path className={styles.actor} d={`M${projectedActor.x} ${projectedActor.y-15}l-9 22h18Z`}><title>{`Toi · position réelle ${coordinates(actor)}${projectedActor.outside?' · hors cadre du poste':''}`}</title></path><text x={projectedActor.x} y={projectedActor.y-21} textAnchor={projectedActor.outside?(projectedActor.x>frame.left+frame.width/2?'end':'start'):'middle'}>Toi{projectedActor.outside?' · hors cadre':''}</text></g>}
    </svg>
    <p className={styles.legend}>P : plaque · E : empreinte · F : fragment. Cercles pleins : pièces actuelles ; cercles pointillés : lieux observés ; triangle : toi.</p>
    <ul className={styles.placements} aria-label="Emplacements actuels des pièces K-17" data-plaque-placement-list-v110>
      {records.map(record=><li key={record.id} data-plaque-record-position-v110={record.id}>{record.label} · {archivePlaquePlaceLabelV110(record.place)} · position {coordinates(record.position)}{record.projection.outside?' · hors cadre du poste':''}</li>)}
      {actor&&projectedActor&&<li>Toi · position {coordinates(actor)}{projectedActor.outside?' · hors cadre du poste':''}</li>}
    </ul>
  </>;
}

export function ArchivePlaqueProvenanceV110({ledger,id}:{ledger:HomeworldArchivePlaqueV109;id:ArchivePlaqueIdV109}){
  const record=archivePlaqueRecordsV110(ledger).find(value=>value.id===id);
  if(!record)return null;
  return <dl className={styles.facts} data-plaque-provenance-v110={id}>
    <dt>Lieu de découverte observé</dt><dd>{record.discoveryPosition?`Quai oriental · étage 0 · ${coordinates(record.discoveryPosition)}`:'À observer sur place.'}</dd>
    <dt>Relevé accompagnant la pièce</dt><dd>{record.provenanceCopied?'Lieu copié et conservé avec cette pièce.':'Lieu non copié.'}</dd>
    <dt>Emplacement actuel</dt><dd>{archivePlaquePlaceLabelV110(record.place)} · {coordinates(record.position)}{record.projection.outside?' · hors cadre du poste':''}</dd>
  </dl>;
}

export function ArchivePlaqueRecordsV110({ledger}:{ledger:HomeworldArchivePlaqueV109}){
  return <div className={styles.records}>{archivePlaqueRecordsV110(ledger).map(record=><article key={record.id}><h4>{record.label}</h4><ArchivePlaqueProvenanceV110 ledger={ledger} id={record.id}/></article>)}</div>;
}

export function ArchivePlaqueRecordJournalV110({ledger,actor,actorInStudySpace=true}:{ledger:HomeworldArchivePlaqueV109;actor:ArchivePlaquePointV109;actorInStudySpace?:boolean}){
  const receipt=ledger.receipt;
  if(!receipt)return null;
  return <details className={styles.journalDetails} data-plaque-record-journal-v110><summary>Voir les pièces et leurs lieux</summary>
    <ArchivePlaqueMapV110 ledger={ledger} actor={actorInStudySpace?actor:undefined}/><ArchivePlaqueRecordsV110 ledger={ledger}/>
    {!actorInStudySpace&&<p className={styles.note}>Tu es sur un autre étage ou dans un intérieur. Les pièces K-17 restent au quai oriental, à l’étage 0.</p>}
    <p className={styles.note}>Marche mesurée pendant l’étude : {Math.floor(receipt.walked)} unités. Dernier point confirmé : {coordinates(receipt.last)}.</p>
    <p className={styles.note}>Le lieu de découverte reste distinct de la position actuelle. Pièces et relevés ne prouvent ni auteur de l’empreinte, ni lien de lignée.</p>
  </details>;
}
