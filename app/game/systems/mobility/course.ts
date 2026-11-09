/** Fixed-step, deterministic driving yard. No film/hunt completion or reward lives here. */
import { mobilityDefinition, mobilityStats, type MobilityLevels } from './catalogue.ts';
export const COURSE_STEP = 1 / 60;
export const COURSE_MAX_TICKS = 72_000;
export const MOBILITY_YARD = {
  width: 1000, height: 620, radius: 18,
  depot: { x: 140, y: 490, radius: 50 },
  checkpoints: [{ x: 820, y: 490 }, { x: 820, y: 130 }, { x: 140, y: 130 }],
  obstacles: [{ x: 330, y: 240, w: 350, h: 150 }, { x: 700, y: 270, w: 65, h: 90 }],
  mud: { x: 630, y: 430, w: 100, h: 115 },
  cargo: { x: 820, y: 130, kg: 25 },
} as const;
export interface MobilityInput { throttle: -1|0|1; steer: -1|0|1; brake: boolean; boost: boolean; interact: boolean }
export interface MobilityCourseState {
  x: number; y: number; heading: number; speed: number; tick: number; energy: number;
  heat: number; condition: number; distance: number; impacts: number; hitCooldown: number;
  npcTicks: [number, number]; checkpoint: number; cargoKg: number; cargoDelivered: boolean; overheated: boolean;
}
export interface MobilityNpcPose { id: string; modelId: string; x: number; y: number; heading: number; state: 'moving'|'yielding' }
const bounded = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const towards = (n: number, target: number, delta: number) => n < target ? Math.min(n + delta, target) : Math.max(n - delta, target);
export function createMobilityCourse(energy = 100, condition = 100): MobilityCourseState {
  return { x:140, y:490, heading:0, speed:0, tick:0, energy, condition, heat:0, distance:0,
    impacts:0, hitCooldown:0, npcTicks:[0,0], checkpoint:0, cargoKg:0, cargoDelivered:false, overheated:false };
}
export function validMobilityInput(v: unknown): v is MobilityInput {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const i = v as Record<string, unknown>;
  return Object.keys(i).length === 5 && [-1,0,1].includes(i.throttle as number) && [-1,0,1].includes(i.steer as number) &&
    typeof i.brake === 'boolean' && typeof i.boost === 'boolean' && typeof i.interact === 'boolean';
}
export function validMobilityCourse(v: unknown): v is MobilityCourseState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as MobilityCourseState;
  if (Object.keys(s).length !== 16) return false;
  const finite = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  return Array.isArray(s.npcTicks) && s.npcTicks.length === 2 && s.npcTicks.every(t => Number.isSafeInteger(t) && t >= 0 && t <= s.tick) && finite(s.x,18,982) && finite(s.y,18,602) && finite(s.heading,-Math.PI,Math.PI) && finite(s.speed,-160,240) &&
    Number.isSafeInteger(s.tick) && s.tick >= 0 && s.tick <= COURSE_MAX_TICKS && finite(s.energy,0,100) && finite(s.heat,0,100) &&
    finite(s.condition,0,100) && finite(s.distance,0,300000) && Number.isSafeInteger(s.impacts) && s.impacts >= 0 && s.impacts <= s.tick &&
    finite(s.hitCooldown,0,1) && Number.isInteger(s.checkpoint) && s.checkpoint >= 0 && s.checkpoint <= 3 &&
    (s.cargoKg === 0 || s.cargoKg === 25) && typeof s.cargoDelivered === 'boolean' && typeof s.overheated === 'boolean' &&
    !(s.cargoDelivered && s.cargoKg > 0) && !(s.cargoKg > 0 && s.checkpoint < 2);
}
function rectanglePoint(t: number) {
  // Dedicated upper logistics lane; never enters the player's depot or civic interiors.
  const route = [{x:400,y:80},{x:640,y:80},{x:640,y:180},{x:400,y:180},{x:400,y:80}];
  let progress = ((t % 680) + 680) % 680;
  for (let i=0;i<4;i++) {
    const a=route[i], b=route[i+1], distance=Math.hypot(b.x-a.x,b.y-a.y);
    if(progress<=distance) return {x:a.x+(b.x-a.x)*progress/distance,y:a.y+(b.y-a.y)*progress/distance,heading:Math.atan2(b.y-a.y,b.x-a.x)};
    progress-=distance;
  }
  return {x:400,y:80,heading:0};
}
export function mobilityYardNpcs(ticks: readonly number[], driver: {x:number;y:number}): MobilityNpcPose[] {
  return [0,1].map(i=>{
    const p=rectanglePoint(ticks[i]*COURSE_STEP*16+i*340);
    return {id:`yard-convoy-${i}`,modelId:'trophy_carrier',...p,state:Math.hypot(p.x-driver.x,p.y-driver.y)<65?'yielding':'moving'};
  });
}
export function courseCollision(x: number, y: number): boolean {
  const r=MOBILITY_YARD.radius;
  return x<r || y<r || x>1000-r || y>620-r || MOBILITY_YARD.obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);
}
export function parkedAtDepot(s: MobilityCourseState): boolean {
  return Math.hypot(s.x-140,s.y-490)<=50 && Math.abs(s.speed)<6;
}
export function mobilityCoursePassed(s: MobilityCourseState): boolean {
  return s.checkpoint===3 && s.cargoDelivered && s.condition>=50 && s.tick>=600 && parkedAtDepot(s);
}
export function stepMobilityCourse(previous: MobilityCourseState, input: MobilityInput, modelId: string, levels: MobilityLevels): MobilityCourseState {
  if (!validMobilityInput(input) || !validMobilityCourse(previous) || !mobilityDefinition(modelId)) throw new TypeError('Commande de conduite incompatible');
  if (previous.tick>=COURSE_MAX_TICKS) return {...previous,speed:0};
  const s={...previous,npcTicks:[...previous.npcTicks] as [number,number]}, dt=COURSE_STEP;
  const stats=mobilityStats(modelId,levels,s.condition,s.cargoKg);
  const inMud=s.x>630&&s.x<730&&s.y>430&&s.y<545;
  const powered=s.energy>0&&s.condition>0;
  s.overheated=s.heat>=98||(s.overheated&&s.heat>40);
  const boost=input.boost&&input.throttle>0&&powered&&!s.overheated;
  const target=powered&&!input.brake?input.throttle*stats.speed*(input.throttle<0?.35:boost?1.35:1)*(inMud?.55:1):0;
  s.speed=towards(s.speed,target,(input.brake?240:input.throttle===0?45:stats.acceleration)*dt);
  // Low-speed steering remains possible, but a damaged unpowered hull cannot pivot for free.
  const turn=powered?input.steer*stats.turn*dt*(Math.abs(s.speed)>3?Math.sign(s.speed):.35):0;
  s.heading=Math.atan2(Math.sin(s.heading+turn),Math.cos(s.heading+turn));
  const x=s.x+Math.cos(s.heading)*s.speed*dt, y=s.y+Math.sin(s.heading)*s.speed*dt;
  const movingNpc=mobilityYardNpcs(s.npcTicks,s);
  movingNpc.forEach((npc,i)=>{ if(npc.state==='moving') s.npcTicks[i]++; });
  const trafficHit=movingNpc.some(p=>Math.hypot(x-p.x,y-p.y)<36);
  s.hitCooldown=Math.max(0,s.hitCooldown-dt);
  if(courseCollision(x,y)||trafficHit){
    if(Math.abs(s.speed)>12&&s.hitCooldown===0){
      s.condition=bounded(s.condition-Math.abs(s.speed)*.12*(1-stats.collisionResistance),0,100);s.impacts++;s.hitCooldown=.7;
    }
    s.speed=0;
  }else{ s.distance+=Math.hypot(x-s.x,y-s.y);s.x=x;s.y=y; }
  const effort=Math.abs(s.speed)>1;
  s.energy=bounded(s.energy-(effort?stats.energyUse*(boost?4:1)*dt:0),0,100);
  s.heat=bounded(s.heat+(boost?16:-stats.cooling)*dt,0,100);
  s.condition=bounded(s.condition-(effort?.0005*Math.abs(s.speed)*dt:0),0,100);
  const targetGate=MOBILITY_YARD.checkpoints[s.checkpoint];
  if(targetGate&&Math.hypot(s.x-targetGate.x,s.y-targetGate.y)<55)s.checkpoint++;
  if(input.interact&&Math.abs(s.speed)<6){
    if(!s.cargoDelivered&&s.cargoKg===0&&s.checkpoint>=2&&Math.hypot(s.x-820,s.y-130)<55&&stats.capacity>=25)s.cargoKg=25;
    else if(s.cargoKg===25&&parkedAtDepot(s)){s.cargoKg=0;s.cargoDelivered=true;}
  }
  s.tick++;
  return s;
}
