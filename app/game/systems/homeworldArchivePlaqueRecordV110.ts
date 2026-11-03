import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as station} from './homeworldArchivePlaqueDefinitionV109';
import type {ArchivePlaqueIdV109} from './homeworldArchivePlaqueDefinitionV109';
import type {ArchivePlaqueObjectV109,ArchivePlaquePointV109,HomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';

export const HOMEWORLD_ARCHIVE_PLAQUE_MAP_V110 = {left:7440,top:5180,width:540,height:410} as const;

/** Only a map projection changes here. Physical positions and saved receipts
 * stay intact, including a piece carried or left far from the study station. */
export function archivePlaqueMapPointV110(point:ArchivePlaquePointV109){
  const frame=HOMEWORLD_ARCHIVE_PLAQUE_MAP_V110;
  return {
    x:Math.max(frame.left+32,Math.min(frame.left+frame.width-32,point.x)),
    y:Math.max(frame.top+32,Math.min(frame.top+frame.height-50,point.y)),
    outside:point.x<frame.left||point.x>frame.left+frame.width||point.y<frame.top||point.y>frame.top+frame.height,
  };
}

export const archivePlaquePlaceLabelV110=(place:ArchivePlaqueObjectV109['place'])=>place==='support'?'sur sa surface séparée':place==='carried'?'porté avec son relevé':place==='ground'?'posé au sol':'à sa place initiale';

/** V109 admits observation and copied provenance before any displacement.
 * Those facts refer to each source-pinned original location. Reading them
 * never invents an observation, rewrites a receipt or reveals the candidate
 * fragment before the actual reprise that makes it available. */
export function archivePlaqueRecordsV110(ledger:HomeworldArchivePlaqueV109){
  const receipt=ledger.receipt;
  return station.objects
    .filter(object=>object.id!=='fragment'||receipt?.resumeSpoken)
    .map(object=>{
      const current=receipt?.objects.find(value=>value.id===object.id)??{id:object.id,...object.origin,place:'source' as const};
      const observed=receipt?.observations.includes(object.id)??false;
      return {
        id:object.id as ArchivePlaqueIdV109,label:object.label,place:current.place,
        position:{x:current.x,y:current.y},projection:archivePlaqueMapPointV110(current),
        observed,provenanceCopied:receipt?.provenances.includes(object.id)??false,
        discoveryPosition:observed?{...object.origin}:null,
      };
    });
}
