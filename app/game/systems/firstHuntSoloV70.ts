/** Act I of the clan's original Temple. No AVP replica or completed Blooded rite. */
export const SOLO_V70_PHASES = ['briefing','ascent','oath','signs','arsenal','belvedere','counterweight','humans','configuration','separation','drone','quarantine','return','debrief','recognition','complete'] as const;
export type SoloV70Phase = typeof SOLO_V70_PHASES[number];
export const SOLO_V70_PROOFS = ['briefed','upper-entry','triad-oath','signs-read','arsenal-opened','belvedere-serviced','counterweight-aligned','human-truce','second-configuration','triad-rejoined','drone-confined','quarantine-valves','returned','mentor-report','opening-attested'] as const;
export type SoloV70Proof = typeof SOLO_V70_PROOFS[number];
export interface SoloV70Receipt { id: SoloV70Proof; sourceId: 'solo.temple-opening.v70'; tick: number }
export interface SoloV70Actor { x:number;y:number;vx:number;vy:number;facing:-1|1 }
export interface SoloV70State {
 version:1;phase:SoloV70Phase;tick:number;phaseStartedAt:number;room:number;roomEnteredAt:number;walked:number;configuration:1|2|3;visited:boolean[];
 player:SoloV70Actor;companions:[{x:number},{x:number}];companionMode:'follow'|'plates';signals:number;signs:number;scan:number;liftTicks:number;valveTimer:number;
 drone:{x:number;hp:number;mode:'watch'|'telegraph'|'lunge'|'recover'|'dead';age:number;hits:number};health:number;hurtTimer:number;attackTimer:number;attackCooldown:number;acid:{x:number;ttl:number};failedAt:number|null;attempts:number;
 doorCrossings:number;lastDoor:{from:number;to:number;tick:number}|null;inputArmed:boolean;previousJump:boolean;previousInteract:boolean;previousCommand:boolean;milestones:Partial<Record<SoloV70Proof,number>>;
}
export interface SoloV70Input { move?:-1|0|1;jump?:boolean;interact?:boolean;command?:boolean }
export interface SoloV70Environment { assetsReady:boolean;pageVisible:boolean;paused:boolean }
export const SOLO_V70_ROOMS = [
 {name:'Marches des Trois',level:'Haut',scene:'camp',platforms:[[300,365,170],[550,310,170],[790,270,330]]},
 {name:'Vestibule des Serments',level:'Haut',scene:'dojo',platforms:[]},
 {name:'Tribune des Signes',level:'Haut',scene:'dojo',platforms:[[200,360,180],[455,300,180],[760,360,180]]},
 {name:'Arsenal des Épreuves',level:'Haut',scene:'quarters',platforms:[]},
 {name:'Belvédère Fracturé',level:'Haut',scene:'camp',platforms:[[290,365,190],[560,310,190],[830,270,290]]},
 {name:'Puits des Contrepoids',level:'Milieu',scene:'dojo',platforms:[[740,300,380]]},
 {name:'Camp des Intrus',level:'Milieu',scene:'quarters',platforms:[[200,350,220]]},
 {name:'Nef des Anneaux',level:'Milieu',scene:'dojo',platforms:[]},
 {name:'Vanne de Quarantaine',level:'Milieu',scene:'dojo',platforms:[[360,360,160]]},
] as const;
export const SOLO_V70_GROUND=430,SOLO_V70_WIDTH=1120;
export const SOLO_V70_SIGNS=[{x:290,y:360},{x:540,y:300},{x:850,y:360}] as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown,a:number,b:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const int=(v:unknown,a:number,b:number):v is number=>finite(v,a,b)&&Number.isSafeInteger(v);
export const soloV70ProofCount=(s:Pick<SoloV70State,'phase'>)=>SOLO_V70_PHASES.indexOf(s.phase);
export const soloV70Receipts=(s:SoloV70State):SoloV70Receipt[]=>SOLO_V70_PROOFS.slice(0,soloV70ProofCount(s)).map(id=>({id,sourceId:'solo.temple-opening.v70',tick:s.milestones[id]!}));
export function createSoloV70State():SoloV70State {return {version:1,phase:'briefing',tick:0,phaseStartedAt:0,room:0,roomEnteredAt:0,walked:0,configuration:1,visited:[true,false,false,false,false,false,false,false,false],player:{x:125,y:430,vx:0,vy:0,facing:1},companions:[{x:80},{x:65}],companionMode:'follow',signals:0,signs:0,scan:0,liftTicks:0,valveTimer:0,drone:{x:925,hp:5,mode:'watch',age:0,hits:0},health:6,hurtTimer:0,attackTimer:0,attackCooldown:0,acid:{x:925,ttl:0},failedAt:null,attempts:0,doorCrossings:0,lastDoor:null,inputArmed:false,previousJump:false,previousInteract:false,previousCommand:false,milestones:{}};}
export function soloV70Platforms(s:SoloV70State):{x:number;y:number;width:number}[]{const fixed:{x:number;y:number;width:number}[]=SOLO_V70_ROOMS[s.room].platforms.map(([x,y,width])=>({x,y,width}));if(s.room===5)fixed.push({x:440,y:430-Math.max(0,s.liftTicks-1)*170/99,width:220});return fixed;}
export function soloV70Support(s:SoloV70State,a=s.player){return soloV70Platforms(s).find(p=>a.x>p.x-17&&a.x<p.x+p.width+17&&a.y<=p.y+.01)?.y??430;}
export function soloV70Portal(room:number,side:'left'|'right',configuration:number){return {x:side==='left'?80:1040,y:side==='right'&&configuration!==3?(room===0||room===4?270:room===5?300:430):430};}
export function soloV70CanTravel(s:SoloV70State,to:number){if(to<0||to>8||Math.abs(to-s.room)!==1)return false;if(to<s.room)return true;return soloV70ProofCount(s)>=[0,2,3,4,5,6,7,8,10][to];}
export function soloV70NeedsImmediateCheckpoint(a:SoloV70State,b:SoloV70State){return a.phase!==b.phase||a.room!==b.room||a.signs!==b.signs||a.companionMode!==b.companionMode||a.signals!==b.signals||a.liftTicks===0&&b.liftTicks>0||b.valveTimer>a.valveTimer||a.drone.hp!==b.drone.hp||a.health!==b.health||a.failedAt!==b.failedAt||a.attempts!==b.attempts;}
export function normalizeSoloV70State(v:unknown):SoloV70State|null{
 if(!record(v)||v.version!==1||!SOLO_V70_PHASES.some(p=>p===v.phase)||!int(v.tick,0,5_184_000)||!int(v.phaseStartedAt,0,v.tick)||!int(v.room,0,8)||!int(v.roomEnteredAt,0,v.tick)||!finite(v.walked,0,v.tick*3.5+.1)||![1,2,3].includes(v.configuration as number)||!Array.isArray(v.visited)||v.visited.length!==9||!v.visited.every(x=>typeof x==='boolean')||!v.visited[0]||!v.visited[v.room]||!record(v.player)||!Array.isArray(v.companions)||v.companions.length!==2||!v.companions.every(c=>record(c)&&finite(c.x,65,1055))||!['follow','plates'].includes(String(v.companionMode))||!int(v.signals,0,99999)||!int(v.signs,0,3)||!int(v.scan,0,89)||!int(v.liftTicks,0,100)||!int(v.valveTimer,0,600)||!record(v.drone)||!finite(v.drone.x,650,970)||!int(v.drone.hp,0,5)||!['watch','telegraph','lunge','recover','dead'].includes(String(v.drone.mode))||!int(v.drone.age,0,89)||!int(v.drone.hits,0,9999)||!int(v.health,0,6)||!int(v.hurtTimer,0,75)||!int(v.attackTimer,0,18)||!int(v.attackCooldown,0,45)||!record(v.acid)||!finite(v.acid.x,650,970)||!int(v.acid.ttl,0,120)||!(v.failedAt===null||int(v.failedAt,0,v.tick))||!int(v.attempts,0,9999)||!int(v.doorCrossings,0,99999)||!record(v.milestones))return null;
 const a=v.player,count=soloV70ProofCount(v as unknown as SoloV70State),furthest=[0,0,1,2,3,4,5,6,7,7,8,8,8,8,8,8][count],visited=v.visited;
 if(!['inputArmed','previousJump','previousInteract','previousCommand'].every(k=>typeof v[k]==='boolean')||v.room>furthest||visited.some((x,i)=>x&&(i>furthest||i>0&&!visited[i-1]))||v.doorCrossings<visited.filter(Boolean).length-1)return null;
 if(!finite(a.x,65,1055)||!finite(a.y,130,430)||!finite(a.vx,-3.5,3.5)||!finite(a.vy,-12,16)||![-1,1].includes(a.facing as number)||v.health===0&&v.failedAt===null||v.health>0&&v.failedAt!==null||(v.drone.hp===0)!==(v.drone.mode==='dead')||v.drone.hits<5-v.drone.hp||count>=4&&v.signs!==3||count<3&&v.signs!==0||v.configuration!==(count>=12?3:count>=9?2:1)||count<11&&v.drone.hp===0||count>=11&&v.drone.hp!==0||count<10&&v.drone.hp!==5||count>=7&&v.liftTicks!==100||count<6&&v.liftTicks!==0||count>=13&&v.room!==0||Object.keys(v.milestones).length!==count)return null;
 if(v.lastDoor===null?v.doorCrossings!==0:!record(v.lastDoor)||!int(v.lastDoor.from,0,8)||!int(v.lastDoor.to,0,8)||Math.abs(v.lastDoor.from-v.lastDoor.to)!==1||!int(v.lastDoor.tick,1,v.tick)||v.lastDoor.to!==v.room||v.lastDoor.tick!==v.roomEnteredAt||v.doorCrossings<1)return null;
 const milestones:SoloV70State['milestones']={};let prior=0;for(const id of SOLO_V70_PROOFS.slice(0,count)){const tick=v.milestones[id];if(!int(tick,1,v.tick)||tick<=prior)return null;milestones[id]=tick;prior=tick;}if(prior!==v.phaseStartedAt)return null;
 return {...v,player:{...a},companions:v.companions.map(c=>({...c})),drone:{...v.drone},acid:{...v.acid},visited:[...v.visited],milestones,inputArmed:false,previousJump:false,previousInteract:false,previousCommand:false} as unknown as SoloV70State;
}
export function stepSoloV70(state:SoloV70State,input:SoloV70Input,env:SoloV70Environment):{state:SoloV70State;receipts:SoloV70Receipt[]}{
 const s:SoloV70State={...state,player:{...state.player},companions:state.companions.map(c=>({...c})) as SoloV70State['companions'],drone:{...state.drone},acid:{...state.acid},visited:[...state.visited],milestones:{...state.milestones}},receipts:SoloV70Receipt[]=[];
 if(!env.assetsReady||!env.pageVisible||env.paused||s.phase==='complete'){s.inputArmed=false;s.previousJump=s.previousInteract=s.previousCommand=false;return {state:s,receipts};}
 if(!s.inputArmed){if(!input.move&&!input.jump&&!input.interact&&!input.command)s.inputArmed=true;return {state:s,receipts};}
 const jump=!!input.jump&&!s.previousJump,interact=!!input.interact&&!s.previousInteract,command=!!input.command&&!s.previousCommand;s.previousJump=!!input.jump;s.previousInteract=!!input.interact;s.previousCommand=!!input.command;s.tick++;
 if(s.failedAt!==null){if(interact&&s.tick-s.failedAt>=90){s.health=6;s.failedAt=null;s.attempts++;s.player={x:125,y:430,vx:0,vy:0,facing:1};if(s.phase==='drone'){s.drone={x:925,hp:5,mode:'watch',age:0,hits:s.drone.hits};}s.hurtTimer=75;s.acid.ttl=0;s.inputArmed=false;}return {state:s,receipts};}
 const a=s.player,oldX=a.x,oldLift=soloV70Platforms(s).find(p=>s.room===5&&p.x===440);let oldY=a.y;
 if(s.phase==='counterweight'&&s.room===5&&s.liftTicks>0)s.liftTicks=Math.min(100,s.liftTicks+1);
 const newLift=soloV70Platforms(s).find(p=>s.room===5&&p.x===440);if(oldLift&&newLift&&a.y===oldLift.y&&a.x>423&&a.x<677){a.y=newLift.y;oldY=a.y;}
 a.vx=(input.move===-1?-1:input.move===1?1:0)*3.5;if(a.vx)a.facing=a.vx<0?-1:1;
 if(jump&&a.vy===0&&a.y===soloV70Support(s))a.vy=-11.7;
 a.x=clamp(a.x+a.vx,65,s.phase==='drone'&&s.room===8?820:1055);
 // Gallery slabs have a real upper contact plane and a thin side edge. Their
 // service passage remains usable below, including after configuration III.
 for(const p of soloV70Platforms(s))if(a.y>p.y+.01&&a.y<p.y+28&&a.x>p.x-17&&a.x<p.x+p.width+17){a.x=clamp(oldX<=p.x-17?p.x-17:p.x+p.width+17,65,1055);a.vx=0;}
 a.vy=Math.min(16,a.vy+.52);let y=a.y+a.vy;for(const p of soloV70Platforms(s))if(a.vy>=0&&oldY<=p.y+.01&&y>=p.y&&a.x>p.x-17&&a.x<p.x+p.width+17){y=p.y;a.vy=0;}if(y>=430){y=430;a.vy=0;}a.y=y;s.walked+=Math.abs(a.x-oldX);
 s.valveTimer=Math.max(0,s.valveTimer-1);s.hurtTimer=Math.max(0,s.hurtTimer-1);s.attackTimer=Math.max(0,s.attackTimer-1);s.attackCooldown=Math.max(0,s.attackCooldown-1);s.acid.ttl=Math.max(0,s.acid.ttl-1);
 const plateTargets=s.phase==='oath'?[320,730]:[520,920];s.companions.forEach((c,i)=>{const target=s.companionMode==='plates'?plateTargets[i]:clamp(a.x-65*(i+1),65,1055);if(Math.abs(target-c.x)>3)c.x=clamp(c.x+Math.sign(target-c.x)*2.9,65,1055);});
 const near=(x:number,y=430,t=38)=>Math.abs(a.x-x)<t&&Math.abs(a.y-y)<.01;
 const transition=(phase:SoloV70Phase)=>{s.phase=phase;s.phaseStartedAt=s.tick;s.scan=0;s.inputArmed=false;s.previousJump=s.previousInteract=s.previousCommand=false;s.companionMode='follow';};
 const proof=(id:SoloV70Proof,phase:SoloV70Phase)=>{s.milestones[id]=s.tick;receipts.push({id,sourceId:'solo.temple-opening.v70',tick:s.tick});transition(phase);};
 const scan=(condition:boolean,ticks:number)=>{s.scan=condition?s.scan+1:0;return s.scan>=ticks;};
 if(command&&['oath','separation'].includes(s.phase)){s.companionMode=s.companionMode==='follow'?'plates':'follow';s.signals++;}
 if(s.phase==='briefing'&&s.room===0&&near(160)&&interact)proof('briefed','ascent');
 else if(s.phase==='ascent'&&s.room===0&&near(900,270)&&interact)proof('upper-entry','oath');
 else if(s.phase==='oath'&&s.room===1&&scan(near(520)&&!a.vx&&s.companionMode==='plates'&&s.companions.every((c,i)=>Math.abs(c.x-plateTargets[i])<5)&&!!input.interact,45))proof('triad-oath','signs');
 else if(s.phase==='signs'&&s.room===2){const target=SOLO_V70_SIGNS[s.signs];if(target&&scan(near(target.x,target.y)&&!a.vx&&!!input.interact,30)){s.signs++;s.scan=0;if(s.signs===3)proof('signs-read','arsenal');}}
 else if(s.phase==='arsenal'&&s.room===3&&scan(near(820)&&!a.vx&&!!input.interact,45))proof('arsenal-opened','belvedere');
 else if(s.phase==='belvedere'&&s.room===4&&near(950,270)&&interact)proof('belvedere-serviced','counterweight');
 else if(s.phase==='counterweight'&&s.room===5){if(!s.liftTicks&&scan(near(540)&&!a.vx&&!!input.interact,30))s.liftTicks=1;if(s.liftTicks===100&&near(950,300)&&interact)proof('counterweight-aligned','humans');}
 else if(s.phase==='humans'&&s.room===6&&scan(near(740)&&!a.vx&&!!input.interact,60))proof('human-truce','configuration');
 else if(s.phase==='configuration'&&s.room===7&&scan(near(300)&&!a.vx&&!!input.interact,45)){s.configuration=2;proof('second-configuration','separation');}
 else if(s.phase==='separation'&&s.room===7&&scan(near(300)&&!a.vx&&s.companionMode==='plates'&&s.companions.every((c,i)=>Math.abs(c.x-plateTargets[i])<5)&&!!input.interact,75))proof('triad-rejoined','drone');
 else if(s.phase==='drone'&&s.room===8){
  const d=s.drone;d.age++;if(d.mode==='watch'&&d.age>=50){d.mode='telegraph';d.age=0;}else if(d.mode==='telegraph'&&d.age>=24){d.mode='lunge';d.age=0;}else if(d.mode==='lunge'&&d.age>=24){d.mode='recover';d.age=0;}else if(d.mode==='recover'&&d.age>=70){d.mode='watch';d.age=0;}
  if(d.mode==='lunge')d.x=Math.max(680,d.x-7);else if(d.mode==='recover')d.x=Math.min(925,d.x+3.5);
  if(command&&!s.attackCooldown){s.attackTimer=18;s.attackCooldown=45;if(d.mode==='recover'&&Math.abs(a.x-d.x)<100&&a.y>330){d.hp--;d.hits++;s.acid={x:d.x,ttl:120};}}
  if(!s.hurtTimer&&(d.mode==='lunge'&&Math.abs(a.x-d.x)<65&&a.y>350||s.acid.ttl>0&&Math.abs(a.x-s.acid.x)<40&&a.y===430)){s.health--;s.hurtTimer=75;if(!s.health)s.failedAt=s.tick;}
  if(!d.hp){d.mode='dead';d.age=0;proof('drone-confined','quarantine');}
 }else if(s.phase==='quarantine'&&s.room===8){if(near(200)&&!a.vx&&input.interact&&s.valveTimer===0&&scan(true,30)){s.valveTimer=600;s.scan=0;}else if(near(980)&&!a.vx&&s.valveTimer>0&&scan(!!input.interact,45)){s.configuration=3;s.valveTimer=0;proof('quarantine-valves','return');}else if(!near(200)&&!near(980))s.scan=0;}
 else if(s.phase==='return'&&s.room===0&&near(160)&&s.walked>=10000&&interact)proof('returned','debrief');
 else if(s.phase==='debrief'&&s.room===0&&near(160)&&interact)proof('mentor-report','recognition');
 else if(s.phase==='recognition'&&s.room===0&&scan(near(160)&&!a.vx&&!!input.interact,90))proof('opening-attested','complete');
 if(!receipts.length&&interact&&soloV70ProofCount(s)<15)for(const side of ['left','right'] as const){const to=s.room+(side==='left'?-1:1),door=soloV70Portal(s.room,side,s.configuration);if(soloV70CanTravel(s,to)&&near(door.x,door.y,42)&&s.companions.every(c=>Math.abs(c.x-a.x)<185)){const from=s.room,entry=soloV70Portal(to,side==='left'?'right':'left',s.configuration);s.room=to;s.roomEnteredAt=s.tick;s.visited[to]=true;s.doorCrossings++;s.lastDoor={from,to,tick:s.tick};s.player={x:entry.x,y:entry.y,vx:0,vy:0,facing:side==='left'?-1:1};s.companions=[{x:clamp(entry.x+(side==='left'?45:-45),65,1055)},{x:clamp(entry.x+(side==='left'?90:-90),65,1055)}];s.scan=0;s.inputArmed=false;break;}}
 return {state:s,receipts};
}
export function soloV70Objective(s:SoloV70State):{title:string;instruction:string;room:number;targetX:number;targetY:number}{
 const goals:Record<SoloV70Phase,[string,string,number,number,number]>={
 briefing:['Le Temple des Trois Ombres · I','Écoute le vétéran. Cette ouverture ne termine pas le rite Blooded.',0,160,430],
 ascent:['Marches des Trois','Saute les marches réelles et confirme la terrasse supérieure.',0,900,270],
 oath:['Trois poids, un serment','Signal : place Saar et Vek sur leurs plaques. Tiens Interaction sur la plaque centrale.',1,520,430],
 signs:['Tribune des Signes',`Relevé ${s.signs}/3. Gagne chaque tribune et maintiens Interaction immobile.`,2,SOLO_V70_SIGNS[Math.min(2,s.signs)].x,SOLO_V70_SIGNS[Math.min(2,s.signs)].y],
 arsenal:['Arsenal des Épreuves','Inspecte le râtelier. Les outils empruntés servent aux mécanismes ; aucune arme énergétique ou dotation permanente.',3,820,430],
 belvedere:['Belvédère Fracturé','Traverse les terrasses. Ouvre la sortie de service depuis l’intérieur.',4,950,270],
 counterweight:['Puits des Contrepoids','Tiens Interaction sur le plateau bas pour engager le contrepoids. Monte avec lui puis saute vers la galerie.',5,s.liftTicks<70?540:950,s.liftTicks<70?430-Math.max(0,s.liftTicks-1)*170/99:300],
 humans:['Camp des Intrus','Le garde protège les survivants. Approche sans attaque et maintiens Interaction pour établir une trêve ; les humains ne sont pas des aliens à éliminer.',6,740,430],
 configuration:['II · La Reconnexion','Tiens Interaction au pupitre : les accès internes se réorientent, les sorties de service restent disponibles.',7,300,430],
 separation:['Les deux ailes','Signal : Saar et Vek gagnent leurs plaques éloignées. Maintiens le contrepoids central jusqu’à rétablir la connexion.',7,300,430],
 drone:['Un drone dans la vanne','Télégraphe → bond → retrait. Saute ou prends de la distance, puis Lame/Signal pendant le retrait à portée. L’acide reste au point d’impact. Interaction après une défaite reprend le point sûr.',8,740,430],
 quarantine:['III · Isolement local','Tiens Interaction à la première vanne puis rejoins la seconde avant la fin de la fenêtre. Le foyer profond reste fermé, pas éradiqué.',8,s.valveTimer?980:200,430],
 return:['Revenir avec la triade','Reviens à pied par les portes et sorties de service. Saar et Vek doivent arriver près de chaque porte.',0,160,430],
 debrief:['Le temple reste une chasse','Remets le rapport d’ouverture. Un drone combattu ne signe ni la mort de la reine ni les chasses de chaque camarade.',0,160,430],
 recognition:['Acte I · L’Ouverture attestée','Maintiens Interaction. Le clan conserve les quinze faits du parcours ; tu restes Young Blood.',0,160,430],
 complete:['Young Blood · Temple ouvert','Les neuf secteurs hauts sont traversés et la vanne locale isolée. Profondeurs, reine, chasses individuelles et Blooding restent à accomplir.',0,160,430]};
 const [title,instruction,room,targetX,targetY]=goals[s.phase];if(s.failedAt!==null)return {title:'Point sûr · La triade attend',instruction:'Relâche puis presse Interaction après un instant pour reprendre cette chambre. Les preuves antérieures restent acquises.',room:s.room,targetX:125,targetY:430};
 if(room!==s.room){const door=soloV70Portal(s.room,room<s.room?'left':'right',s.configuration);return {title,instruction:instruction+' Rejoins la porte puis relâche et presse Interaction.',room,targetX:door.x,targetY:door.y};}return {title,instruction,room,targetX,targetY};
}
