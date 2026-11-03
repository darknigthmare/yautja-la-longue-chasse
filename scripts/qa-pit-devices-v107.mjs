/** Public V15 device journeys, composed into the single frozen-app driver.
 * All state observations are read-only; gauges and outcomes come from real play. */
export async function runPitDeviceJourneysV107(h) {
 const {api,openMatch,closePage,read,draws,clear,shot,driveUntil,approach,separate,earnMeter,check,observations}=h;
 const page=()=>h.getPage();
 const command=async(slot,key)=>{await page().locator(`[data-pit-workbook-controls="${slot}"] [data-pit-workbook-action="${key}"]`).click();await page().clock.runFor(16);};
 // Read at less than half a 60Hz tick:16ms can cross two accumulated ticks
 // and miss the exact94/74 arming state. All native-frame assertions stay exact.
 const frame=async(slot,key,tick)=>driveUntil(s=>s.actions[slot]?.workbookMove===key&&s.actions[slot].actionFrame>=tick,key+' source tick '+tick,5000,8);
 for(const reversed of [false,true]){
  const label='devices-'+(reversed?'left':'right'),ids=reversed?['scar','feral-hunter']:['feral-hunter','scar'],mineSlot=reversed?1:0,starSlot=1-mineSlot;
  await openMatch(ids,['',''],'workbook-v107',label);check(label+': V15 starts with two unique ready devices',(await read()).inventory.every(i=>i.status==='ready'));
  await earnMeter(label);await separate();await clear();
  let before=await read();await command(starSlot,'shuriken');let start=await frame(starSlot,'S2',0);
  check(label+': shuriken source action spends its actual25 percent once',start.meter[starSlot]===before.meter[starSlot]-250);
  const held=await frame(starSlot,'S2',24);check(label+': star remains uniquely held through the source active drawing',held.inventory[starSlot].status==='held'&&!held.devices.some(d=>d.ownerSlot===starSlot));
  const released=await frame(starSlot,'S2',27),star=released.devices.find(d=>d.ownerSlot===starSlot);
  check(label+': first empty palm releases one independent five-bladed star',!!star&&released.inventory[starSlot].status==='deployed'&&released.devices.filter(d=>d.ownerSlot===starSlot).length===1);
  const facing=star.direction,anchor=api.getPitWorkbookShurikenLaunchV107(facing),owner=released.positions[starSlot],projected=api.projectPitWorkbookDeviceAnchorV107(anchor,owner.x,owner.y,api.PIT_FIGHTERS.scar.bodyHeight);
  // DOM actor positions round to0.01; the maximum propagated x residual is0.005.
  check(label+': released star follows its admitted palm and physical age',Math.abs(star.x+13-star.direction*star.age*14-projected.x)<.011&&Math.abs(star.y+13-projected.y)<.011,{star,projected,roundingTolerance:.011});
  check(label+': every live physical star is actually painted once',Number(released.canvas.pitWorkbookDevicesDrawnV107)===released.devices.length);
  await shot(label+'-star-release.png');
  const starSamples=[released];await driveUntil(s=>{starSamples.push(s);return s.inventory[starSlot].status==='spent';},label+' physical star consumed',5000,16);
  const starDraws=await draws(),definition=api.PIT_WORKBOOK_DEVICE_REGISTRY_V107.find(d=>d.fighterId==='scar');
  check(label+': star uses its admitted independent art',starDraws.some(d=>d.src===api.PIT_WORKBOOK_DEVICE_SOURCES_V107.shuriken.entity.path));
  check(label+': S2 BODY reaches all six native drawings',new Set(definition.atlas.clips.filter(c=>c.facing===(facing===1?'right':'left')).flatMap(c=>c.frames.map(f=>JSON.stringify(f.rect)))).size===6&&definition.atlas.clips.filter(c=>c.facing===(facing===1?'right':'left')).flatMap(c=>c.frames).every(f=>starDraws.some(d=>JSON.stringify(d.rect)===JSON.stringify(f.rect)&&definition.atlas.pages.some(p=>p.id===f.pageId&&p.src===d.src))));
  await driveUntil(s=>!s.actions[starSlot]?.workbookMove,'star BODY recovery',5000,16);await command(starSlot,'equipment');await page().clock.runFor(750);
  check(label+': EQUIP cannot replenish a spent star',(await read()).inventory[starSlot].status==='spent'&&await page().locator(`[data-pit-workbook-controls="${starSlot}"] [data-pit-workbook-action="shuriken"]`).isDisabled());
  await separate();await clear();before=await read();await command(mineSlot,'mine');start=await frame(mineSlot,'S4',0);
  check(label+': mine source action spends its actual35 percent once',start.meter[mineSlot]===before.meter[mineSlot]-350);
  const mineSamples=[start],posed=await frame(mineSlot,'S4',20),mine=posed.devices.find(d=>d.ownerSlot===mineSlot);
  check(label+': native free object becomes one physical floor mine at20',!!mine&&mine.y===0&&mine.age===0&&mine.phase==='amber'&&posed.inventory[mineSlot].status==='deployed');
  const mineAnchor=api.getPitWorkbookMinePlacementV107(mine.direction),mineOwner=posed.positions[mineSlot],minePoint=api.projectPitWorkbookDeviceAnchorV107(mineAnchor,mineOwner.x,mineOwner.y,api.PIT_FIGHTERS['feral-hunter'].bodyHeight);
  check(label+': mine uses its admitted placement x with declared floor snapping',Math.abs(mine.x+11-minePoint.x)<.011,{mine,minePoint});
  check(label+': one independent mine is painted after its BODY object is masked',Number(posed.canvas.pitWorkbookDevicesDrawnV107)===posed.devices.length);
  await shot(label+'-mine-placement.png');
  await driveUntil(s=>{mineSamples.push(s);return s.devices.some(d=>d.kind==='mine'&&d.phase==='off');},label+' source off phase',5000,16);
  const armed=await driveUntil(s=>{mineSamples.push(s);return s.devices.some(d=>d.kind==='mine'&&d.phase==='armed');},label+' mine armed',5000,8);
  check(label+': arming at94 alone causes no phantom damage',armed.actions[mineSlot].actionFrame===94&&armed.devices[0].age===74&&JSON.stringify(armed.life)===JSON.stringify(posed.life),{posed,armed,observationStepMs:8});
  await shot(label+'-mine-armed.png');
  const expired=await driveUntil(s=>{mineSamples.push(s);return s.inventory[mineSlot].status==='spent';},label+' mine natural expiry',5000,16);
  check(label+': untriggered mine expires independently after154 source ticks',expired.devices.length===0&&JSON.stringify(expired.life)===JSON.stringify(posed.life));
  const mineDraws=await draws(),mineDefinition=api.PIT_WORKBOOK_DEVICE_REGISTRY_V107.find(d=>d.fighterId==='feral-hunter');
  check(label+': mine BODY reaches all six original drawings without a mirrored facing',mineDefinition.atlas.clips.filter(c=>c.facing===(mine.direction===1?'right':'left')).flatMap(c=>c.frames).every(f=>mineDraws.some(d=>JSON.stringify(d.rect)===JSON.stringify(f.rect)&&mineDefinition.atlas.pages.some(p=>p.id===f.pageId&&p.src===d.src)&&d.matrix[0]>0&&d.matrix[3]>0&&d.matrix[1]===0&&d.matrix[2]===0)));
  await driveUntil(s=>!s.actions[mineSlot]?.workbookMove,'mine BODY recovery',5000,16);await command(mineSlot,'equipment');await page().clock.runFor(750);
  check(label+': EQUIP cannot restore a spent mine',(await read()).inventory[mineSlot].status==='spent'&&await page().locator(`[data-pit-workbook-controls="${mineSlot}"] [data-pit-workbook-action="mine"]`).isDisabled());
  observations.push({kind:'physical-devices-v15',label,starRelease:released,starSamples,minePlacement:posed,mineSamples,expired,draws:await draws(),starDraws});
  await closePage();
 }
 // A separate real round is required: spent inventory is never reset by this driver.
 const label='mine-real-destruction';await openMatch(['feral-hunter','scar'],['',''],'workbook-v107',label);await earnMeter(label);await approach(110,1);await command(0,'mine');const placed=await frame(0,'S4',20);const ownerLife=placed.life[0],destroyerLife=placed.life[1];
 await page().locator('[data-pit-immersive]').focus();await page().keyboard.down('Numpad2');await page().keyboard.down('Numpad1');await page().clock.runFor(32);await page().keyboard.up('Numpad1');await page().keyboard.up('Numpad2');
 const destroyed=await driveUntil(s=>s.inventory[0].status==='spent','real crouching light destroys the amber mine',1000,16);
 check('A real2L contact destroys the amber mine before arm without harming its owner',destroyed.devices.length===0&&destroyed.actions[1].normalMove==='2L'&&destroyed.life[0]===ownerLife&&destroyed.life[1]===destroyerLife);
 await frame(0,'S4',94);check('Destroyed mine never reappears in later native red BODY',(await read()).devices.length===0&&(await read()).inventory[0].status==='spent');await shot(label+'.png');observations.push({kind:'physical-mine-destruction',placed,destroyed,after:await read()});await closePage();
}
