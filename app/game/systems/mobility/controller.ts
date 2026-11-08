import { emptyMobilityLevels } from './catalogue.ts';
import { stepMobilityCourse, type MobilityInput, type MobilityCourseState } from './course.ts';
import { inspectMobilityLedger, type MobilityLedger, type MobilityCommand } from './ledger.ts';
export interface MobilityReceipt { accepted:boolean; message:string; state:MobilityLedger|null }
export type MobilityWriter=(command:MobilityCommand)=>MobilityReceipt;
/** Predict a maximum of half a second, then replay inputs through the campaign transaction.
 * Failed writes retain the exact command and pause; retry cannot silently rebase old input. */
export class MobilityDriveController {
  confirmed: MobilityLedger;
  predicted: MobilityCourseState;
  pending: MobilityInput[]=[];
  blocked=false;
  message='Sortie au garage ; reprendre la conduite pour démarrer.';
  constructor(state:MobilityLedger){
    if(!state.active)throw new TypeError('Sortie absente');
    this.confirmed=structuredClone(state);this.predicted=structuredClone(state.active.course);
  }
  step(input:MobilityInput): boolean {
    if(this.blocked||this.pending.length>=30||!this.confirmed.active)return false;
    const active=this.confirmed.active, levels=this.confirmed.owned.find(v=>v.id===active.modelId)?.upgrades??emptyMobilityLevels();
    this.predicted=stepMobilityCourse(this.predicted,input,active.modelId,levels);
    this.pending.push({...input});return true;
  }
  flush(write:MobilityWriter): boolean {
    if(!this.pending.length)return !this.blocked;
    const active=this.confirmed.active;
    if(!active){this.blocked=true;return false;}
    const command:MobilityCommand={type:'drive',ownerCreatedAt:this.confirmed.ownerCreatedAt,
      expectedRevision:this.confirmed.revision,runId:active.id,inputs:this.pending.map(i=>({...i}))};
    let result:MobilityReceipt;
    try {result=write(command);}catch {result={accepted:false,state:null,message:'Écriture indisponible ; séquence conservée.'};}
    this.message=result.message;
    const state=result.state;
    const valid=state && inspectMobilityLedger(state,this.confirmed.ownerCreatedAt).status==='valid';
    if(!result.accepted||!valid||!state?.active||state.revision!==this.confirmed.revision+1||
       state.active.id!==active.id||state.active.modelId!==active.modelId||state.active.loaned!==active.loaned||
       JSON.stringify(state.active.course)!==JSON.stringify(this.predicted)){
      this.blocked=true;
      if(result.accepted)this.message='Accusé de sauvegarde incohérent ; séquence conservée sans avance de simulation.';
      return false;
    }
    this.confirmed=structuredClone(state);this.predicted=structuredClone(state.active.course);
    this.pending=[];this.blocked=false;return true;
  }
}
