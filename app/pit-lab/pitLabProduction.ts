import { PIT_VERSUS_FIGHTER_IDS } from '../game/systems/pitRosterExpansion';
import { createPitCombatState, PIT_FIGHTERS, type PitFighterId } from '../game/systems/pitCombat';
import { PIT_SPRITE_SHEET_REGISTRY } from '../game/pitSpriteSheetRegistry';
import type { HunterSpriteAtlasClip } from '../game/hunterSpriteAtlas';
export const PIT_LAB_FIGHTER_IDS = PIT_VERSUS_FIGHTER_IDS;
export function getPitLabDefinitions(id: PitFighterId) { return PIT_SPRITE_SHEET_REGISTRY.filter(d => d.fighterId === id && d.atlas.status === 'validated'); }
export function getPitLabCoverage(id: PitFighterId) {
 const definitions=getPitLabDefinitions(id), clips=definitions.flatMap(d=>d.atlas.clips.filter(c=>c.status==='validated'));
 return { fighterId:id, atlasCount:definitions.length, sourcePages:new Set(definitions.flatMap(d=>d.atlas.pages.map(p=>p.src))).size, clips:clips.length, rightClips:clips.filter(c=>c.facing==='right').length, leftClips:clips.filter(c=>c.facing==='left').length, drawings:new Set(clips.flatMap(c=>c.frames.map(f=>f.pageId+':'+f.rect.join(',')))).size };
}
/** The authored phase weights are stretched across the engine's real 60 Hz phase. */
export function getPitLabFrameTicks(id: PitFighterId, clip: HunterSpriteAtlasClip, frameIndex: number): number {
 const index=Math.max(0,Math.min(clip.frames.length-1,Math.floor(frameIndex)));
 const phase=/^pit\.(?:stand|crouch|air)\.(light|medium|heavy)\.(startup|active|recovery)$/.exec(clip.id);
 const duration=phase ? PIT_FIGHTERS[id].attacks[phase[1] as 'light'|'medium'|'heavy'][phase[2] as 'startup'|'active'|'recovery'] : clip.id==='pit.stand.hitstun' ? 40 : null;
 if(duration===null)return clip.frames[index].durationTicks*60/clip.ticksPerSecond;
 const total=clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0);
 const before=clip.frames.slice(0,index).reduce((sum,frame)=>sum+frame.durationTicks,0);
 return Math.ceil((before+clip.frames[index].durationTicks)/total*duration)-Math.ceil(before/total*duration);
}
/** Isolated frame inspection, using the actual engine phase durations. No simulation or save is changed. */
export function createPitLabFrame(id:PitFighterId, clip:HunterSpriteAtlasClip, frameIndex:number) {
 const combat=createPitCombatState(id,id==='jungle-hunter'?'city-hunter':'jungle-hunter');
 const f=combat.fighters[0];f.x=480;f.facing=clip.facing==='right'?1:-1;
 const index=Math.max(0,Math.min(clip.frames.length-1,Math.floor(frameIndex))), total=clip.frames.reduce((n,f)=>n+f.durationTicks,0), elapsed=clip.frames.slice(0,index).reduce((n,f)=>n+f.durationTicks,0);
 let tick=elapsed;
 const attack=/^pit\.(stand|crouch|air)\.(light|medium|heavy)\.(startup|active|recovery)$/.exec(clip.id);
 if(attack){const kind=attack[2] as 'light'|'medium'|'heavy',phase=attack[3] as 'startup'|'active'|'recovery',timing=PIT_FIGHTERS[id].attacks[kind];tick=Math.min(timing[phase]-1,Math.ceil(elapsed/total*timing[phase]));f.phase=phase;f.action={kind:'attack',attack:kind,frame:(phase==='startup'?0:timing.startup+(phase==='recovery'?timing.active:0))+tick,connected:false};f.crouching=attack[1]==='crouch';if(attack[1]==='air'){f.grounded=false;f.y=20;}}
 else if(clip.id==='crouch')f.crouching=true;
 else if(clip.id==='high-guard')f.guard='high';
 else if(clip.id==='low-guard'){f.guard='low';f.crouching=true;}
 else if(clip.id==='walk'||clip.id==='walk-backward')f.velocityX=f.facing*(clip.id==='walk'?1:-1);
 else if(clip.id==='pit.stand.hitstun'){tick=Math.ceil(elapsed/total*40);f.phase='hitstun';f.stunFrames=40-tick;}
 combat.frame=tick;
 return {combat,fighter:f,tick,index};
}
