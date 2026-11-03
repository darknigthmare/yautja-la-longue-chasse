import type { PitEditionTechniqueDefinition } from './pitFirstEdition';

/** Frozen recipe used to replay the published V4–V7 recordings byte faithfully. */
export const PIT_FALCONER_LEGACY_DRONE: PitEditionTechniqueDefinition = Object.freeze({
  id:'falconer-drone-intercept',device:'drone',contactEffect:'mark',motion:'homing',trigger:'contact',
  lifetimeFrames:72,armFrames:8,speed:7,returnFrame:null,width:46,height:34,verticalOffset:66,
  damageScale:0,chipScale:0,hitstunBonus:0,blockstunBonus:0,pushbackScale:0,
  guardBreak:false,knockdown:false,ownerDashSpeed:0,maxHits:1,rehitFrames:0,
  status:'tracked',statusFrames:150,movementScale:.9,jumpLocked:false,cloakLocked:true,
});

/** One mechanical sensor. The same instance returns after scanning or recall. */
export const PIT_FALCONER_RECON_DRONE: PitEditionTechniqueDefinition = Object.freeze({
  ...PIT_FALCONER_LEGACY_DRONE,
  id:'falconer-reconnaissance-v57',motion:'returning',lifetimeFrames:240,returnFrame:72,
});
