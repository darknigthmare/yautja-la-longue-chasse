import raw from './fixtures.json';
import {normalizeSoloV90State,soloV90Receipts,SOLO_V90_SOURCE_SHA,type SoloV90State,type SoloV90Receipt} from '../game/systems/firstHuntSoloV90';

export const SOLO_QA_FIXTURES_V92=raw.map(fixture=>{
 const checkpoint=normalizeSoloV90State(fixture.checkpoint);
 if(fixture.sourceSha256!==SOLO_V90_SOURCE_SHA||!checkpoint)throw Error('Fixture QA solo invalide : '+fixture.id);
 return{...fixture,checkpoint};
});
/** Always clone through the real codec. Resetting a fixture never mutates its
 * source snapshot, and an unsupported state is not replaced by a fresh game. */
export const soloQaCheckpointV92=(id:string):SoloV90State|null=>{
 const fixture=SOLO_QA_FIXTURES_V92.find(item=>item.id===id);
 return fixture?normalizeSoloV90State(fixture.checkpoint):null;
};
/** Local callbacks accept only normalized scene state and receipts whose
 * source, tick and milestone agree. This is not the campaign owner's durable
 * replay verifier and never awards global progress, honor, rank or trophies. */
export function soloQaAcceptV92(rawState:unknown,receipts:readonly SoloV90Receipt[]=[]):SoloV90State|null{
 const state=normalizeSoloV90State(rawState);if(!state)return null;
 const expected=soloV90Receipts(state),seen=new Set<string>();
 for(const receipt of receipts){
  if(seen.has(receipt.id)||!expected.some(proof=>proof.id===receipt.id&&proof.sourceId===receipt.sourceId&&proof.tick===receipt.tick))return null;
  seen.add(receipt.id);
 }
 return state;
}
