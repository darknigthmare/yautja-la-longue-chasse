import { mobilityStats, type MobilityModule } from './catalogue.ts';
import { mobilityServiceQuote, type MobilityLedger } from './ledger.ts';

/** Informational preview only. The campaign transaction still recomputes the quote. */
export function mobilityUpgradePreview(state: MobilityLedger, id:string, module:MobilityModule) {
  if (state.recoveryDebt>0) return null;
  const owned=state.owned.find(v=>v.id===id);
  const cost=mobilityServiceQuote(state,id,'upgrade',module);
  if (!owned || cost===null) return null;
  const current=mobilityStats(id,owned.upgrades,owned.condition,0);
  const next=mobilityStats(id,{...owned.upgrades,[module]:owned.upgrades[module]+1},owned.condition,0);
  return {cost,level:owned.upgrades[module]+1,condition:owned.condition,current,next};
}

export const MOBILITY_STAT_LABELS = [
  {key:'speed',label:'Vitesse',unit:'u/s',decimals:1},
  {key:'acceleration',label:'Accélération',unit:'u/s²',decimals:1},
  {key:'turn',label:'Rotation',unit:'rad/s',decimals:2},
  {key:'collisionResistance',label:'Résistance aux chocs',unit:'%',decimals:0,scale:100},
  {key:'capacity',label:'Charge utile',unit:'kg',decimals:0},
  {key:'cooling',label:'Refroidissement',unit:'points/s',decimals:1},
  {key:'energyUse',label:'Consommation',unit:'points/s',decimals:3},
] as const;
