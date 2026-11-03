import {applyArchivePlaqueV109,archivePlaqueSegmentV109,type ArchivePlaqueActionV109,type ArchivePlaqueContextV109,type ArchivePlaqueResultV109} from './homeworldArchivePlaqueV109';
import {defaultHomeworldArchivePlaqueV109,normalizeHomeworldArchivePlaqueV109,type HomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';
import {applyArchiveContinuationV111,type ArchiveContinuationActionV111,type ArchiveContinuationContextV111,type ArchiveContinuationResultV111} from './homeworldArchiveContinuationV111';
import {defaultHomeworldArchiveContinuationV111,normalizeHomeworldArchiveContinuationV111,type HomeworldArchiveContinuationV111} from './homeworldArchiveContinuationLedgerV111';

/** The old public resume accepts an actor within four units. Its active save
 * nevertheless needs the same exact point as the current physical checkpoint.
 * Attach to that already reached, validated body position without crediting a
 * step, moving the actor or replaying any observation/provenance/consent. */
function attachResume(ledger:HomeworldArchivePlaqueV109,before:HomeworldArchivePlaqueV109|null,context:ArchivePlaqueContextV109):HomeworldArchivePlaqueV109|null {
  const original=before?.receipt;
  if(!ledger.receipt)return null;
  const spokenReprise=original?.failureSpoken&&!original.resumeSpoken;
  if(original&&!spokenReprise&&!archivePlaqueSegmentV109(context,original.last,context.actor))return null;
  const next=structuredClone(ledger),receipt=next.receipt!;
  receipt.last={x:context.actor.x,y:context.actor.y};
  if(receipt.carrier){const item=receipt.objects.find(item=>item.id===receipt.carrier)!;item.x=context.actor.x;item.y=context.actor.y;}
  return normalizeHomeworldArchivePlaqueV109(next);
}
export function applyArchivePlaqueV112(raw:unknown,action:ArchivePlaqueActionV109,revision:number,context:ArchivePlaqueContextV109):ArchivePlaqueResultV109 {
  const result=applyArchivePlaqueV109(raw,action,revision,context);
  if(action!=='resume'||!result.ok||!result.changed)return result;
  const previous=normalizeHomeworldArchivePlaqueV109(raw),next=attachResume(result.ledger,previous,context);
  return next?{...result,ledger:next}:{ok:false,changed:false,ledger:previous??defaultHomeworldArchivePlaqueV109(context.ownerCreatedAt),message:'Rejoins le point de reprise par son passage libre avant de reprendre l’étude.'};
}
export function applyArchiveContinuationV112(raw:unknown,action:ArchiveContinuationActionV111,revision:number,context:ArchiveContinuationContextV111):ArchiveContinuationResultV111 {
  const result=applyArchiveContinuationV111(raw,action,revision,context);
  if(action!=='resume'||!result.ok||!result.changed)return result;
  const previous=normalizeHomeworldArchiveContinuationV111(raw,context.basePlaque),next=structuredClone(result.ledger);
  const study=next.receipt?.study;
  if(!study)return result;
  const attached=attachResume(study,previous?.receipt?.study??null,context);
  if(attached)next.receipt!.study=attached;
  const checked=attached&&normalizeHomeworldArchiveContinuationV111(next,context.basePlaque);
  return checked?{...result,ledger:checked}:{ok:false,changed:false,ledger:previous??defaultHomeworldArchiveContinuationV111(context.ownerCreatedAt),message:'Rejoins le point de reprise par son passage libre avant de poursuivre la même étude.'};
}
export function createArchivePlaqueTransactionV112(read:()=>unknown,context:()=>ArchivePlaqueContextV109,commit:(ledger:HomeworldArchivePlaqueV109)=>boolean){
  return(action:ArchivePlaqueActionV109,revision:number):ArchivePlaqueResultV109=>{
    const raw=read(),current=context(),result=applyArchivePlaqueV112(raw,action,revision,current);
    if(!result.ok||!result.changed)return result;
    let saved=false;try{saved=commit(result.ledger)===true;}catch{saved=false;}
    return saved?result:{ok:false,changed:false,ledger:normalizeHomeworldArchivePlaqueV109(raw)??defaultHomeworldArchivePlaqueV109(current.ownerCreatedAt),writeRefused:true,message:'Le constat n’a pas été enregistré. Les pièces et le point confirmé restent conservés ; réessaie ici.'};
  };
}
export function createArchiveContinuationTransactionV112(read:()=>unknown,context:()=>ArchiveContinuationContextV111,commit:(ledger:HomeworldArchiveContinuationV111)=>boolean){
  return(action:ArchiveContinuationActionV111,revision:number):ArchiveContinuationResultV111=>{
    const raw=read(),current=context(),result=applyArchiveContinuationV112(raw,action,revision,current);
    if(!result.ok||!result.changed)return result;
    let saved=false;try{saved=commit(result.ledger)===true;}catch{saved=false;}
    return saved?result:{ok:false,changed:false,ledger:normalizeHomeworldArchiveContinuationV111(raw,current.basePlaque)??defaultHomeworldArchiveContinuationV111(current.ownerCreatedAt),writeRefused:true,message:'La continuation n’a pas été enregistrée. Le constat différé et le point confirmé restent conservés ; réessaie ici.'};
  };
}
