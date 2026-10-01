import assert from 'node:assert/strict';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-browser-v68.mjs';

/** QA only: timing reads rendered state ticks, movement is public keyboard input.
 * No state, coordinates, dodge counter, receipt or contract is injected. */
export function homeworldContractRegionNavigatorV70(page, api, options = {}) {
 const nav=homeworldRegionNavigatorV68(page,api,options),root=()=>page.locator('section[data-homeworld-region-v68]');
 const tickNumber=async()=>Number(await root().getAttribute('data-state-tick'));
 const continueDialogue=async()=>{if(await root().locator('[data-region-resume]').isVisible())await nav.resume();};
 const waitPhase=async(phase,start=false)=>{
  for(let n=0;n<120;n++){const tick=await tickNumber();if(api.regionHazardPhaseV68(tick)===phase&&(!start||tick%360<8))return tick;await nav.tick(64);}
  throw Error(`Hazard never reached ${phase}${start?' beginning':''}`);
 };
 const evadeDanger=async()=>{
  // Start near the warning perimeter so short resampled keyboard segments can
  // leave it well before activation; walking out remains the actual proof.
  await nav.walkTo({x:7500,y:2350});await waitPhase('warning',true);await nav.tick(32);
  // Leaving the radius before the warning ends is what increments evaded.
  await nav.walkTo({x:7500,y:2530});await waitPhase('calm');await nav.tick(64);
 };
 const protectBeacons=async()=>{
  for(const post of api.REGION_WARD_POSTS_V68){
   await nav.walkTo({x:post.x,y:post.y+90});await waitPhase('warning',true);await nav.interact();await continueDialogue();
   assert.match(await root().locator(`[data-region-ward="${post.id}"]`).innerText(),/Fixée/);
  }
  await evadeDanger();
 };
 const recoverCache=async()=>{
  await evadeDanger();await nav.walkTo({x:7720,y:2220});await waitPhase('calm');await nav.interact();await continueDialogue();
 };
 const perform=async action=>{
  await nav.readTrails();const id=await root().getAttribute('data-homeworld-region-v68');
  if(action==='track'||action==='challenge'||action==='recover'&&api.REGION_TRACK_IDS_V68.includes(id))await nav.observeFauna();
  if(action==='challenge')await nav.challengeFauna();else if(action==='ward')await protectBeacons();else if(action==='recover')await recoverCache();
  else assert(['survey','track'].includes(action));
 };
 return {...nav,perform,protectBeacons,recoverCache,evadeDanger};
}
