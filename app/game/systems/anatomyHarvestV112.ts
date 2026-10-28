import type { FieldSpecimenV112 } from "./harvestInventoryV112";

/** Original project balancing. Parts are explicit per species; a human, synth,
 * plant or unknown actor never receives a universal hide/meat/skull table. */
export type AnatomyActionV112 = "harvest-hide" | "harvest-tissue" | "harvest-bone";
export interface AnatomyPartV112 {
  action: AnatomyActionV112; partId: string; label: string; massKg: number;
  volumeUnits: number; seconds: number; requiresFlay: boolean; fragility: number;
}
const hide = (label:string, massKg=2.4):AnatomyPartV112 => ({action:"harvest-hide",partId:"hide",label,massKg,volumeUnits:3,seconds:3.8,requiresFlay:true,fragility:1});
const tissue = (label:string):AnatomyPartV112 => ({action:"harvest-tissue",partId:"tissue",label,massKg:.4,volumeUnits:1,seconds:2.6,requiresFlay:false,fragility:1.3});
const bone = (label:string):AnatomyPartV112 => ({action:"harvest-bone",partId:"bone",label,massKg:1.2,volumeUnits:2,seconds:3.4,requiresFlay:false,fragility:.55});
const entries:readonly [readonly string[], readonly AnatomyPartV112[]][] = [
  [["hell-hound-stalker","cinder-12--hell-hound-stalker"],[hide("Cuir de chien de chasse"),tissue("Tendon de poursuite")]],
  [["razorback-grazer","nivalis-k--razorback-grazer"],[hide("Peau de brouteur",3.8),bone("Côte dorsale")]],
  [["oseris-iv--vineback-grazer"],[hide("Peau à fibres végétales",3.2),tissue("Ligament dorsal")]],
  [["oseris-iv--mist-pouncer"],[hide("Pelage de bondisseur"),tissue("Tendon de bond")]],
  [["oseris-iv--mirror-chameleon"],[hide("Peau chromatophore",1.6),tissue("Échantillon pigmentaire")]],
  [["naraka-delta--reed-cat"],[hide("Pelage palustre",1.8),tissue("Tendon félin")]],
  [["serekh-9--dust-jackal"],[hide("Pelage filtrant",1.8),bone("Os nasal secondaire")]],
  [["nivalis-k--snow-prowler"],[hide("Fourrure isolante",2.8),tissue("Tissu thermorégulateur")]],
  [["nivalis-k--glacier-ram","cinder-12--basalt-ram","serekh-9--salt-ram"],[hide("Cuir de bélier",4),bone("Côte renforcée")]],
  [["xeno-drone","common--wandering-xeno-drone","oseris-iv--jungle-xeno-scout","nivalis-k--frost-xeno","cinder-12--scorch-xeno","acheron-sigma--temple-xeno","pelagos-m--swimmer-xeno"],[bone("Segment caudal de xénomorphe")]],
  [["xeno-praetorian"],[bone("Éperon thoracique")]],
  [["oseris-iv--needle-frog"],[tissue("Tissu glandulaire d'aiguillon")]],
  [["naraka-delta--lantern-toad"],[tissue("Tissu photophore")]],
  [["pelagos-m--storm-eel","naraka-delta--sludge-eel"],[tissue("Tissu électrocyte")]],
  [["bonecrest-ravager"],[hide("Cuir du ravageur",4.2),bone("Phalange de soutien")]],
  [["amber-mire-lurker","naraka-delta--bog-stalker"],[hide("Peau du guetteur palustre",3.6)]],
  [["naraka-delta--iron-croc"],[hide("Cuir à plaques ferriques",4.4),bone("Vertèbre terminale")]],
  [["naraka-delta--fen-leaper"],[hide("Peau du sauteur",1.5)]],
  [["serekh-9--quill-lizard"],[hide("Peau du lézard",1.4)]],
  [["serekh-9--dune-strider"],[tissue("Tendon d'échassier")]],
  [["cinder-12--smoke-wyvern"],[hide("Membrane de vol",3.8)]],
  [["pelagos-m--razor-shark"],[hide("Peau denticulée",3),tissue("Tissu sensoriel")]],
  [["oseris-iv--thunder-macaque"],[hide("Pelage du dominant",2.6),bone("Phalange du dominant")]],
  [["mycora-v--spore-hound"],[tissue("Culture mycélienne canine")]],
  [["mycora-v--glow-moth"],[tissue("Poudre phosphorescente")]],
  [["pelagos-m--hunter-manta","nivalis-k--frost-manta"],[hide("Membrane alaire",1.2)]],
];
export const ANATOMY_CATALOGUE_V112:Readonly<Record<string,readonly AnatomyPartV112[]>> =
  Object.freeze(Object.fromEntries(entries.flatMap(([species,parts]) => species.map(id => [id,Object.freeze(parts.map(p=>Object.freeze({...p})))]))));
export function anatomyPartsV112(speciesId:string):readonly AnatomyPartV112[] { return ANATOMY_CATALOGUE_V112[speciesId] ?? []; }
export function anatomyPartV112(speciesId:string, action:string):AnatomyPartV112|null {
  return anatomyPartsV112(speciesId).find(part=>part.action===action) ?? null;
}
export function anatomyIntegrityV112(loss:unknown):number {
  return typeof loss==="number" && Number.isFinite(loss) ? Math.round(Math.max(0,Math.min(100,100-loss))) : 100;
}
/** Every real hit contributes: ranged damage is less precise, and excessive
 * finishing damage destroys tissue. No random roll or last-hit-only rule. */
export function applyAnatomyDamageV112(loss:number|undefined,damage:number,remainingHealth:number,maxHealth:number,source:"melee"|"weapon"):number {
  if(!Number.isFinite(damage)||damage<=0||!Number.isFinite(maxHealth)||maxHealth<=0)return loss ?? 0;
  const ratio=damage/maxHealth,overkill=Math.max(0,damage-Math.max(0,remainingHealth))/maxHealth;
  return Math.min(100,Math.max(0,loss??0)+ratio*(source==="weapon"?28:9)+overkill*45);
}
export function specimenQualityV112(integrity:number,part:AnatomyPartV112,analyzed:boolean):number {
  return Math.round(Math.max(0,Math.min(100,100-(100-integrity)*part.fragility-(analyzed?0:12))));
}
export function makeAnatomySpecimenV112(runId:string,corpseId:string,speciesId:string,action:string,integrity:number,analyzed:boolean):FieldSpecimenV112|null {
  const part=anatomyPartV112(speciesId,action); if(!part)return null;
  return {id:runId+":"+corpseId+":"+part.partId,sourceId:runId+":"+corpseId,speciesId,partId:part.partId,label:part.label,
    quality:specimenQualityV112(integrity,part,analyzed),massKg:part.massKg,volumeUnits:part.volumeUnits,stage:"raw"};
}
export function anatomyBodyMassV112(_speciesId:string,width:number,height:number):number {
  return Math.round(Math.max(12,Math.min(300,width*height/60)));
}
export const ANATOMY_ACTION_LABELS_V112 = Object.freeze({
  "harvest-hide":"Prélever la peau","harvest-tissue":"Prélever le tissu","harvest-bone":"Prélever l'os secondaire",
});
