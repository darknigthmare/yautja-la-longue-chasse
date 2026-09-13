import { getPitFirstEditionFighter, isPitFirstEditionFighterId, PIT_FIRST_EDITION_FIGHTER_IDS, type PitEditionFighterDefinition, type PitEditionMoveDefinition, type PitEditionTechniqueDefinition, type PitFirstEditionFighterId, type PitFirstEditionCombatantId } from './pitFirstEdition';

/** Separate duel roster: no entry is added to a first-edition progression table. */
export const PIT_EXPANSION_FIGHTER_IDS = ['tracker', 'greyback'] as const;
export type PitExpansionFighterId = typeof PIT_EXPANSION_FIGHTER_IDS[number];
export type PitVersusFighterId = PitFirstEditionFighterId | PitExpansionFighterId;
export const PIT_VERSUS_FIGHTER_IDS = [...PIT_FIRST_EDITION_FIGHTER_IDS, ...PIT_EXPANSION_FIGHTER_IDS] as const;
export type PitExpansionFighterDefinition = Omit<PitEditionFighterDefinition, 'id' | 'rivalId'> & {readonly id: PitExpansionFighterId; readonly rivalId: null; readonly variantId: string; readonly progressionAvailable: false};
export function isPitExpansionFighterId(id: unknown): id is PitExpansionFighterId { return id === 'tracker' || id === 'greyback'; }
export function isPitVersusFighterId(id: unknown): id is PitVersusFighterId { return isPitFirstEditionFighterId(id) || isPitExpansionFighterId(id); }
export function canPitFighterEnterMode(id: unknown, mode: string): boolean { return isPitFirstEditionFighterId(id) || (isPitExpansionFighterId(id) && ['cpu','local','training'].includes(mode)); }

const PIT_SELECTABLE_MODES = ['cpu','local','training','arcade','circuit','descent'] as const;
type PitSelectableMode = typeof PIT_SELECTABLE_MODES[number];
/** Wrap through the modes this fighter can actually enter, in both directions. */
export function cyclePitMode(current: PitSelectableMode, direction: -1 | 1, fighterId: unknown): PitSelectableMode {
 const index=PIT_SELECTABLE_MODES.indexOf(current);
 for(let offset=1;offset<=PIT_SELECTABLE_MODES.length;offset++){
  const candidate=PIT_SELECTABLE_MODES[(index+direction*offset+PIT_SELECTABLE_MODES.length)%PIT_SELECTABLE_MODES.length];
  if(canPitFighterEnterMode(fighterId,candidate))return candidate;
 }
 return current;
}

function move(kind: PitEditionMoveDefinition['kind'], label: string, values: readonly [number,number,number,number,number,number,number,number,number]): PitEditionMoveDefinition {
 const [startup,active,recovery,damage,hitstun,blockstun,range,height,pushback]=values;
 return {kind,label,startup,active,recovery,damage,chipDamage:kind==='heavy'?Math.ceil(damage*.08):0,hitstun,blockstun,range,height,pushback,hitLevel:kind==='light'?'high':'mid',knockdown:kind==='heavy',antiAir:false,launchY:0};
}
function counter(id: string, device: 'counter-blade'|'code-parry'): PitEditionTechniqueDefinition {
 return {id,device,contactEffect:'strike',motion:'attached',trigger:'counter',lifetimeFrames:18,armFrames:0,speed:0,returnFrame:null,width:52,height:68,verticalOffset:28,damageScale:1,chipScale:0,hitstunBonus:2,blockstunBonus:0,pushbackScale:1,guardBreak:false,knockdown:false,ownerDashSpeed:0,maxHits:1,rehitFrames:0,status:null,statusFrames:0,movementScale:1,jumpLocked:false,cloakLocked:false};
}
export const PIT_EXPANSION_FIGHTERS: Readonly<Record<PitExpansionFighterId,PitExpansionFighterDefinition>> = {
 tracker: {
  id:'tracker',variantId:'predators-2010-v5-presentation',name:'Tracker',epithet:'Le pisteur aux défenses',sourcePresetId:'tracker',sourceWork:'Predators (2010) · présentation V5 du projet',continuity:'canon',archetype:'bruiser',selectable:true,runtimeStatus:'authored',rivalId:null,difficulty:3,progressionAvailable:false,
  maxHealth:1040,walkSpeed:4.35,airSpeed:2.95,jumpSpeed:12,power:1.03,bodyWidth:57,bodyHeight:122,crouchHeight:80,palette:{primary:'#a7833d',secondary:'#262721',accent:'#c33429'},
  attacks:{light:move('light','Estoc court aux lames',[6,3,11,58,16,9,57,40,16]),medium:move('medium','Estoc allongé',[10,4,17,85,22,12,88,46,24]),heavy:move('heavy','Taille basse appuyée',[16,5,25,127,31,18,70,38,36]),technique:move('technique','Contre au gantelet',[8,18,24,82,24,14,58,50,24])},technique:counter('tracker-gauntlet-counter','counter-blade'),
  arcadeIntro:'Chasseur massif au biomask muni de défenses. Identité et équipement issus de la présentation V5, non certifiée réplique cinéma 1:1. Les mouvements du duel sont une adaptation ; chiens et commandes de meute ne sont pas implémentés.',arcadeEnding:'Chronique personnelle non produite : Arcade, Circuit et Descente indisponibles.'
 },
 greyback: {
  id:'greyback',variantId:'predator2-1990-elder-unmasked-flintlock',name:'Greyback',epithet:'L’ancien au pistolet à silex',sourcePresetId:'greyback',sourceWork:'Predator 2 (1990) · ancien démasqué · présentation V5',continuity:'canon',archetype:'punisher',selectable:true,runtimeStatus:'authored',rivalId:null,difficulty:4,progressionAvailable:false,
  maxHealth:1000,walkSpeed:4.15,airSpeed:2.85,jumpSpeed:11.8,power:1,bodyWidth:54,bodyHeight:118,crouchHeight:78,palette:{primary:'#8b7963',secondary:'#30322f',accent:'#bb9e64'},
  attacks:{light:move('light','Direct du poing droit',[5,3,10,53,15,8,52,38,14]),medium:move('medium','Coup de pied frontal',[9,4,16,80,21,12,79,44,23]),heavy:move('heavy','Heurt à l’épaule',[15,5,25,119,29,17,49,48,37]),technique:move('technique','Riposte de l’ancien',[7,18,23,78,26,14,54,50,27])},technique:counter('greyback-elder-parry','code-parry'),
  arcadeIntro:'L’ancien démasqué de Predator 2, distinct de Golden Angel jeune et de l’Elder d’AVP. Sa présentation V5 conserve le silex dans la main gauche et le canon d’épaule. Dans ce lot, ces armes restent inactives ; coups de poing, pied et épaule sont des adaptations de jeu.',arcadeEnding:'Chronique personnelle non produite : Arcade, Circuit et Descente indisponibles.'
 }
};
export function getPitFighterProfile(id: PitFirstEditionCombatantId | PitExpansionFighterId) { return isPitExpansionFighterId(id) ? PIT_EXPANSION_FIGHTERS[id] : getPitFirstEditionFighter(id); }
