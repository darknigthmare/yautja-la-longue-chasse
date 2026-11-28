import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
import { thresholdsCampaignRoute, stamp } from './solo-v69-played-route.mjs';
export { stamp };
export const thresholdsTemple=homeworldQaModelV64(process.cwd(),['firstHuntSoloV70.ts','campaignSoloV70.ts','firstHuntSoloV70DepthsM017.ts']);
export const templeEnvironment={assetsReady:true,pageVisible:true,paused:false};
export function templeInput(s){
 const p=thresholdsTemple,a=s.player;if(!s.inputArmed||s.phase==='complete')return {};
 if(s.failedAt!==null)return {interact:!s.previousInteract&&s.tick-s.failedAt>=90};
 if(s.phase==='drone'&&s.room===8){const d=s.drone,target=d.mode==='recover'?Math.min(820,d.x-65):d.mode==='watch'?690:720,move=Math.abs(target-a.x)>5?Math.sign(target-a.x):0,ground=a.vy===0&&a.y===p.soloV70Support(s);return {move,jump:ground&&!s.previousJump&&(d.mode==='telegraph'&&d.age>=18||d.mode==='lunge'&&d.age>8||s.acid.ttl>0&&Math.abs(s.acid.x-a.x)<65),command:d.mode==='recover'&&s.attackCooldown===0&&!s.previousCommand&&Math.abs(a.x-d.x)<100&&a.y>330};}
 const goal=p.soloV70Objective(s),move=Math.abs(goal.targetX-a.x)>5?Math.sign(goal.targetX-a.x):0,platforms=p.soloV70Platforms(s),ground=a.vy===0&&a.y===p.soloV70Support(s);
 const block=platforms.find(r=>move>0?r.x-17>=a.x&&r.x-17-a.x<48&&a.y>r.y+.01:r.x+r.width+17<=a.x&&a.x-r.x-r.width-17<48&&a.y>r.y+.01);
 const support=platforms.find(r=>a.y===r.y&&a.x>r.x-17&&a.x<r.x+r.width+17),gap=support&&move&&((move>0&&support.x+support.width-a.x<28&&platforms.some(r=>r.x>support.x+support.width&&r.x-a.x<160))||(move<0&&a.x-support.x<28&&platforms.some(r=>r.x+r.width<support.x&&a.x-r.x-r.width<160)));
 const threat=p.soloV70GalleryThreatM017(s);
 const jump=!!move&&ground&&!s.previousJump&&!!(block||gap||
   threat&&Math.sign(threat.x-a.x)===move&&Math.abs(threat.x-a.x)<65);
 const depths=s.phase==='return'&&s.depthsM017;
 const {descent}=p.SOLO_V70_DEPTHS_M017;
 const depthRelay=depths&&s.room===descent.room&&!depths.relay;
 const extension=depths&&depths.extension;
 const royal=s.room===p.SOLO_V70_ROYAL_M017.room&&extension&&extension.royal;
 if (royal&&!royal.evade) {
   const sweep=p.soloV70RoyalStatusM017(extension,s.tick);
   return {move,interact:royal.startedAt===null&&!move&&!s.previousInteract,
     jump:!move&&ground&&a.y>p.SOLO_V70_ROYAL_M017.coverY&&!s.previousJump&&sweep?.stage==='warning'&&sweep.remaining<=27};
 }
 if (s.room === p.SOLO_V70_RESCUE_M017.room && p.soloV70RescueTargetM017(extension))
   return {move,interact:!move};
 const post=extension&&p.soloV70DepthPostM017(s.room,Boolean(royal));
 const depthPost=post&&!extension.observations[post.id];
 const depthHunt=depths&&s.room===p.soloV70HuntTargetM017(s).room&&!depths.huntThreshold;
 const gallery=post?.id==='eggs-observed'&&extension.gallery&&!extension.gallery.screened;
 const command=(depthRelay||depthPost&&post.plates||['oath','separation'].includes(s.phase)&&s.room===goal.room&&!move)&&s.companionMode==='follow'&&!s.previousCommand;
 const held=depthRelay||depthPost||depthHunt||gallery||['oath','signs','arsenal','counterweight','humans','configuration','separation','quarantine','recognition'].includes(s.phase)&&s.room===goal.room;
 return {move,jump,command,interact:!move&&!jump&&(held||!s.previousInteract)};
}
export function templeMechanismInput(s) {
 const {room,leverX,exitX}=thresholdsTemple.SOLO_V70_BELVEDERE;
 if(s.phase!=='belvedere'||s.room!==room||s.failedAt!==null)return templeInput(s);
 if(!s.inputArmed)return {};
 const x=s.belvedereLever?exitX:leverX;
 const move=Math.abs(x-s.player.x)>5?Math.sign(x-s.player.x):0;
 if(s.belvedereLever)return {move,interact:!move&&!s.previousInteract};
 return {move,command:!move&&s.companionMode==='follow'&&!s.previousCommand,
  interact:!move&&s.companionMode==='plates'};
}
/** Normal controls, collisions, combat and room portals only. No fixtures inside the current chapter. */
export function playTemple({initial=thresholdsTemple.createSoloV70State(),stop='complete',input=templeInput,restoreEvery=0,onStep=()=>{}}={}){let state=structuredClone(initial);const receipts=[],snapshots={},transitions=[];for(let i=0;i<100000&&state.phase!==stop;i++){if(restoreEvery&&i%restoreEvery===0){state=thresholdsTemple.normalizeSoloV70State(JSON.parse(JSON.stringify(state)));assert(state);}const before=state,out=thresholdsTemple.stepSoloV70(state,input(state),templeEnvironment);state=out.state;assert(thresholdsTemple.normalizeSoloV70State(state),'invalid '+JSON.stringify(state));if(out.receipts.length||before.room!==state.room)transitions.push({before:structuredClone(before),after:structuredClone(state),receipts:out.receipts});onStep(out,before);receipts.push(...out.receipts);snapshots[state.phase]??=structuredClone(state);}assert.equal(state.phase,stop,JSON.stringify(state));return {state,receipts,snapshots,transitions};}
let cachedOrigin;
export function templeCampaignRoute({origin=cachedOrigin??=thresholdsCampaignRoute().save,archiveRoomCount,legacyGallery=false,legacyRoyal=false,...options}={}){let save=thresholdsTemple.startSoloV70Campaign(origin,stamp);assert(save);
 // Recreate the earlier 11- and 15-room journals from their first checkpoints.
 if (archiveRoomCount === 11 || archiveRoomCount === 15 || legacyGallery || legacyRoyal) {
   const rooms = archiveRoomCount ?? 15;
   const checkpoint = thresholdsTemple.createSoloV70State(rooms);
   if (rooms === 15) {
     delete checkpoint.depthsM017.extension.rescue;
     if (!legacyRoyal) delete checkpoint.depthsM017.extension.royal;
     if (!legacyGallery && !legacyRoyal) delete checkpoint.depthsM017.extension.gallery;
   }
   save.soloV70.checkpoint=checkpoint;
   assert(thresholdsTemple.soloV70MatchesSave(save));
 }
 const commits=[];let lastWrite=0;const run=playTemple({initial:save.soloV70.checkpoint,...options,onStep(out,before){if(!out.receipts.length&&!thresholdsTemple.soloV70NeedsImmediateCheckpoint(before,out.state)&&out.state.tick-lastWrite<120)return;const previous=save;save=out.receipts.length?thresholdsTemple.withSoloV70Progress(save,out.receipts,out.state,stamp):thresholdsTemple.withSoloV70Checkpoint(save,out.state,stamp);assert(save,'save refused '+JSON.stringify(out.state));assert(thresholdsTemple.soloV70MatchesSave(save));lastWrite=out.state.tick;if(out.receipts.length)commits.push({before:previous,after:save,state:out.state,receipts:out.receipts});}});return {...run,save,commits,origin};}
