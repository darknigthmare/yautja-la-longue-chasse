import { loadYouthArt,youthClipFrame,type YouthArtBank,type YouthArtPose,type YouthPropSprite } from './youthTrainingRendering';
import { YOUTH_ART_MANIFEST } from './youthArtManifest';
import { drawActorContactShadow,getSpriteContact } from './spriteContact';
import { TEMPLE_MODULAR_ATLAS_V70,drawTempleModuleV70 } from './templeModularArtV70';
import { SOLO_V70_ROOMS,SOLO_V70_SIGNS,SOLO_V70_ENERGY_VAULT,SOLO_V70_QUARANTINE_THRESHOLD,SOLO_V70_BELVEDERE,SOLO_V70_RECONNECTION,SOLO_V70_NEF_RELAY_M017,soloV70ReconnectionPreview,soloV70Platforms,soloV70Support,soloV70CampaignPortal,soloV70CanTravel,soloV70Objective,soloV70PlateTargets,type SoloV70State } from './systems/firstHuntSoloV70';
export const TEMPLE_DRONE_V70='/game/sprites/v7/enemies/flora-other/xeno-drone-sheet.png';
export const TEMPLE_GUARD_V70='/game/sprites/v4/rifle-soldier.png';
export async function loadTempleArtV70():Promise<YouthArtBank>{const bank=await loadYouthArt(YOUTH_ART_MANIFEST),images=new Map(bank.images);await Promise.all([TEMPLE_MODULAR_ATLAS_V70.src,TEMPLE_DRONE_V70,TEMPLE_GUARD_V70].map(src=>new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(src,image);resolve();};image.onerror=()=>reject(new Error('Image native du temple indisponible : '+src));image.src=src;})));return {...bank,images};}
/** Separate rooms, native original architecture, actual support planes. Native
 * drone drawings are never mirrored: withdrawal keeps its left-facing guard. */
export function drawFirstHuntSoloV70(ctx:CanvasRenderingContext2D,s:SoloV70State,bank:YouthArtBank|null,reducedMotion:boolean){
 const width=ctx.canvas.width;ctx.save();ctx.clearRect(0,0,width,540);ctx.fillStyle='#0f1214';ctx.fillRect(0,0,width,540);if(!bank){ctx.restore();return;}
 const {images,manifest}=bank,room=SOLO_V70_ROOMS[s.room],camera=Math.max(0,Math.min(1120-width,s.player.x-width*.45)),scene=manifest.scenes[room.scene],backdrop=images.get(scene.src)!,ground=room.scene==='camp'?780:733,scale=430/ground,panorama=backdrop.width*scale;
 ctx.drawImage(backdrop,-Math.min(camera*.09,Math.max(0,panorama-width)),0,panorama,backdrop.height*scale);ctx.drawImage(backdrop,0,ground,backdrop.width,backdrop.height-ground,0,430,width,110);
 // Muted distant stairs belong to the far architectural plane. Foreground
 // collidable gallery slabs below are independent measured native props.
 const modular=images.get(TEMPLE_MODULAR_ATLAS_V70.src)!;
 if(room.scene!=='camp'){
  ctx.fillStyle='#070c14a8';ctx.fillRect(0,0,width,430);ctx.save();ctx.translate(-camera*.28,0);
  // Monumental native piers form the room's architectural plane, rather than
  // a collection of little props placed over the training room panorama.
  for(const x of [25,365,755,1110])drawTempleModuleV70(ctx,modular,'pillar',x,430,445);
  drawTempleModuleV70(ctx,modular,'arch',585,430,395);ctx.restore();
 }else{ctx.save();ctx.globalAlpha=.28;drawTempleModuleV70(ctx,modular,'stairs',width*.72-camera*.05,425,95);ctx.restore();}
 ctx.translate(-camera,0);
 const prop=(sprite:YouthPropSprite,x:number,y:number,height:number)=>{const k=height/sprite.rect[3];ctx.drawImage(images.get(sprite.src)!,...sprite.rect,x-sprite.pivot[0]*k,y-sprite.pivot[1]*k,sprite.rect[2]*k,height);};
 const text=(label:string,x:number,y:number,color='#e9d3a5',size=12)=>{ctx.fillStyle=color;ctx.font=`bold ${size}px sans-serif`;ctx.textAlign='center';ctx.fillText(label,x,y);};
 const marker=(x:number,y=430,label?:string)=>{prop(manifest.props.marker,x,y,27);if(label)text(label,x,y-130);};
 drawTempleModuleV70(ctx,modular,'pillar',25,430,350);drawTempleModuleV70(ctx,modular,'pillar',1100,430,350);
 for(const p of soloV70Platforms(s)){const sprite=manifest.props.platform,image=images.get(sprite.src)!;ctx.drawImage(image,...sprite.rect,p.x,p.y,p.width,28);if(s.room===5&&p.x===440){drawTempleModuleV70(ctx,modular,'counterweight',550,430,220);text('CONTREPOIDS',550,p.y-18);}else{ctx.save();ctx.globalAlpha=.55;drawTempleModuleV70(ctx,modular,'arch',p.x+p.width/2,430,Math.max(60,430-p.y-12));ctx.restore();}}
 const preview = soloV70ReconnectionPreview(s);
 if (preview) {
   ctx.save();
   ctx.strokeStyle = '#ffd78b';
   ctx.lineWidth = 2;
   ctx.setLineDash([7, 6]);
   for (const platform of preview.platforms) ctx.strokeRect(platform.x, platform.y, platform.width, 25);
   ctx.restore();
   text('GLYPHE · ' + Math.ceil(preview.remainingTicks / 60) + ' s', SOLO_V70_RECONNECTION.x, 320, '#ffd78b', 14);
 }
 for(const side of ['left','right'] as const){const door=soloV70CampaignPortal(s,s.room,side),to=s.room+(side==='left'?-1:1);if(to<0||to>8)continue;const open=soloV70CanTravel(s,to);drawTempleModuleV70(ctx,modular,open?'arch':'gate',door.x,door.y,245);text(open?(s.configuration===3?'SERVICE · '+SOLO_V70_ROOMS[to].name:'VERS · '+SOLO_V70_ROOMS[to].name):'VERROU DU TEMPLE',door.x,Math.max(18,door.y-258),open?'#c6d6b7':'#cbad86',11);}
 if(s.room===0){prop(manifest.props.brazier,160,430,50);marker(900,270,'MARCHES HAUTES');}
 if(s.room===1){[320,520,730].forEach((x,i)=>{marker(x,430,i===1?'TA PLAQUE':i===0?'SAAR':'VEK');ctx.strokeStyle='#cbb27d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-33,433);ctx.lineTo(x+33,433);ctx.stroke();});}
 if(s.room===2)SOLO_V70_SIGNS.forEach((p,i)=>{marker(p.x,p.y,`SIGNE ${i+1}${s.signs>i?' · RELEVÉ':''}`);});
 if (s.room === 3) {
   prop(manifest.props.bladeRack, 820, 430, 105);
   drawTempleModuleV70(ctx, modular, 'console', 600, 430, 70);
   text('ARSENAL PHYSIQUE · OUTILS TEMPORAIRES', 730, 245);
   if (s.riteAdmission) {
     const { x } = SOLO_V70_ENERGY_VAULT;
     drawTempleModuleV70(ctx, modular, 'gate', x, 430, 88);
     marker(x, 430, s.riteAdmission.sealedEnergy ? '3 ÉMETTEURS SCELLÉS' : 'DÉPÔT DES ÉMETTEURS');
   }
 }
 if(s.room===SOLO_V70_BELVEDERE.room){
  const {leverX,exitX,upperY,lowerY,plates}=SOLO_V70_BELVEDERE;
  prop(manifest.desertProps!.stone,600,430,55);
  if(!s.belvedereLever)marker(exitX,upperY,'SORTIE HAUTE');
  if(s.phase==='belvedere'||s.belvedereLever){
   drawTempleModuleV70(ctx,modular,'counterweight',leverX,lowerY,95);
   if(!s.belvedereLever){
    marker(plates[0],lowerY,'SAAR');marker(plates[1],lowerY,'VEK');
    text('CONTREPOIDS',leverX,lowerY-114);
   }
   drawTempleModuleV70(ctx,modular,s.belvedereLever?'arch':'gate',exitX,lowerY,95);
   text(s.belvedereLever?'SORTIE BASSE':'SORTIE BASSE FERMÉE',exitX,lowerY-114);
  }
 }
 if(s.room===6){prop(manifest.props.cot,920,430,27);const image=images.get(TEMPLE_GUARD_V70)!,rect=[0,0,image.width,image.height] as const,contact=getSpriteContact(image,rect,image.height),pivot=contact?.supportY??image.height,k=140/image.height;
  // This static full-body bitmap has substantial transparent bottom padding.
  // Register its measured boots, rather than using the small-fringe adjustment
  // reserved for authored animation cells (which would leave it floating).
  drawActorContactShadow(ctx,840,430,18,0);ctx.drawImage(image,...rect,840-image.width*k/2,430-pivot*k,image.width*k,140);text('GARDE DES SURVIVANTS · TRÊVE',840,285);marker(740);}
 if(s.room===7){[300,520,920].forEach(x=>drawTempleModuleV70(ctx,modular,'console',x,430,65));text(`CONFIGURATION ${s.configuration===1?'I · OUVERTURE':s.configuration===2?'II · RECONNEXION':'III · ISOLEMENT LOCAL'}`,580,155);}
 if(s.room===8){[200,980].forEach(x=>drawTempleModuleV70(ctx,modular,'console',x,430,65));text('FOYER PROFOND FERMÉ · RITE INACHEVÉ',1020,230,'#d9b28b',11);if(s.riteAdmission)marker(SOLO_V70_QUARANTINE_THRESHOLD.x,430,s.riteAdmission.threshold?'TRIADE AU SEUIL · 3/3':'SEUIL DE QUARANTAINE');if(s.acid.ttl){ctx.fillStyle='#c9df5955';ctx.beginPath();ctx.ellipse(s.acid.x,428,40,7,0,0,Math.PI*2);ctx.fill();text('ACIDE',s.acid.x,407,'#d0de8d',10);}const d=s.drone,image=images.get(TEMPLE_DRONE_V70)!,cell=image.width/6,index=d.mode==='dead'?5:d.mode==='recover'?4:d.mode==='lunge'?2+Math.floor(d.age/6)%2:d.mode==='telegraph'?1:0,rect=[cell*index,0,cell,image.height] as const,k=125/(image.height-8),pivot=image.height-3,contact=getSpriteContact(image,rect,pivot);drawActorContactShadow(ctx,d.x,430,25,0);ctx.drawImage(image,...rect,d.x-cell*k/2,430-(pivot-(contact?.offsetY??0))*k,cell*k,image.height*k);text(d.mode==='dead'?'DRONE · NEUTRALISÉ':d.mode==='telegraph'?'CHARGE ANNONCÉE':`DRONE ${d.hp}/5`,d.x,270,d.mode==='telegraph'?'#f0a177':'#d1d2b6');}
 if(s.phase==='separation' && s.room===SOLO_V70_NEF_RELAY_M017.room && s.reconnectionVariant){
   const {leverX,upperY,regroupX}=SOLO_V70_NEF_RELAY_M017;
   if(s.nefRelayM017) marker(regroupX,430,'RENDEZ-VOUS');
   else {
     drawTempleModuleV70(ctx,modular,'console',leverX,upperY,50);
     marker(leverX,upperY,'COMMANDE HAUTE');
     if(s.scan && Math.abs(s.player.y-upperY)<.01) {
       ctx.fillStyle='#ead393';
       ctx.fillRect(leverX-26,upperY+17,52*s.scan/SOLO_V70_NEF_RELAY_M017.holdTicks,4);
     }
   }
 }
 const actor=(kind:'player'|'rival',x:number,y:number,facing:-1|1,height:number,pose:YouthArtPose,caption?:string)=>{const atlas=manifest.actors[kind][facing===1?'right':'left'],frame=youthClipFrame(atlas.clips[pose],reducedMotion&&pose==='idle'?0:s.tick),image=images.get(atlas.src)!,k=height/atlas.bodyHeight,contact=getSpriteContact(image,frame.rect,frame.pivot[1]);drawActorContactShadow(ctx,x,kind==='player'?soloV70Support(s):430,15,kind==='player'?soloV70Support(s)-y:0);ctx.drawImage(image,...frame.rect,x-frame.pivot[0]*k,y-(frame.pivot[1]-(contact?.offsetY??0))*k,frame.rect[2]*k,frame.rect[3]*k);if(caption)text(caption,x,y-height-12,'#d5cbaa',11);};
 s.companions.forEach((c,i)=>{const target=s.companionMode==='plates'?soloV70PlateTargets(s)[i]:Math.max(65,Math.min(1055,s.player.x-65*(i+1)));actor('rival',c.x,430,target<c.x?-1:1,102,Math.abs(c.x-target)>7?'walk':'idle',i===0?'SAAR':'VEK');});
 if(s.room===0)actor('rival',160,430,1,145,'idle','VÉTÉRAN');const a=s.player;actor('player',a.x,a.y,a.facing,112,s.health===0?'ko':s.hurtTimer>60?'hurt':s.attackTimer?'blade':a.vy?'jump':a.vx?'walk':'idle');
 const goal=soloV70Objective(s);ctx.strokeStyle='#ead393';ctx.setLineDash([6,5]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(goal.targetX-26,goal.targetY+4);ctx.lineTo(goal.targetX+26,goal.targetY+4);ctx.stroke();ctx.setLineDash([]);if(s.scan&&!(s.phase==='separation'&&s.player.y===SOLO_V70_NEF_RELAY_M017.upperY)){ctx.fillStyle='#ead393';ctx.fillRect(goal.targetX-26,goal.targetY+17,52*s.scan/90,4);}ctx.restore();
}
