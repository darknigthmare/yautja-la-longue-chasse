import { resolvePlatformMotion, type PlatformMotionBody } from "./platformCollision";
import type { WorldBlueprint, WorldClimbable, WorldPlatform, WorldRect } from "./worldBlueprints";

/** A bounded, serializable pendulum. Angle is measured from vertical, in radians. */
export interface CanopySwingV112 {
  supportId: string;
  length: number;
  angle: number;
  angularVelocity: number;
}
export const CANOPY_PHYSICS_V112 = {
  gravity: 1850, minimumLength: 70, maximumAngle: 1.25,
  maximumSpeed: 850, pumpAcceleration: 2.4, damping: 0.16,
  lengthSpeed: 80, substepSeconds: 1 / 120,
} as const;
const limit = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const hand = (body: WorldRect) => ({ x: body.x + body.width / 2, y: body.y + body.height * 0.28 });
export function isFlexibleCanopySupportV112(support: WorldClimbable): boolean {
  return support.kind === "vine" || support.kind === "rope" || support.kind === "chain";
}
/** Both the rope and the grasp must be on the accessible face of solid geometry. */
export function canopySegmentClearV112(from: {x:number;y:number}, to: {x:number;y:number}, platforms: readonly WorldPlatform[]): boolean {
  return !platforms.some(platform => {
    if (platform.collision !== "solid") return false;
    let enter = 0, leave = 1;
    for (const [a, b, low, high] of [
      [from.x, to.x, platform.x + 0.001, platform.x + platform.width - 0.001],
      [from.y, to.y, platform.y + 0.001, platform.y + platform.height - 0.001],
    ]) {
      const delta = b - a;
      if (Math.abs(delta) < 1e-8) { if (a <= low || a >= high) return false; }
      else {
        const first = (low - a) / delta, second = (high - a) / delta;
        enter = Math.max(enter, Math.min(first, second));
        leave = Math.min(leave, Math.max(first, second));
        if (enter >= leave) return false;
      }
    }
    return enter < leave;
  });
}
export function isCanopySwingSnapshotV112(value: unknown): value is CanopySwingV112 {
  if (!value || typeof value !== "object") return false;
  const swing = value as CanopySwingV112;
  return typeof swing.supportId === "string" && swing.supportId.length > 0 &&
    Number.isFinite(swing.length) && swing.length >= CANOPY_PHYSICS_V112.minimumLength && swing.length <= 720 &&
    Number.isFinite(swing.angle) && Math.abs(swing.angle) <= CANOPY_PHYSICS_V112.maximumAngle &&
    Number.isFinite(swing.angularVelocity) &&
    Math.abs(swing.angularVelocity * swing.length) <= CANOPY_PHYSICS_V112.maximumSpeed + 0.001;
}
export function canopySupportReachableV112(
  body: WorldRect, support: WorldClimbable, platforms: readonly WorldPlatform[], swing?: CanopySwingV112 | null,
): boolean {
  const grip = hand(body);
  if (swing) {
    if (!isCanopySwingSnapshotV112(swing) || swing.supportId !== support.id || !isFlexibleCanopySupportV112(support) ||
      swing.length > support.height + 0.001) return false;
    const point = canopySwingPointV112(swing, support);
    return Math.hypot(point.x - grip.x, point.y - grip.y) < 5 &&
      canopySegmentClearV112({x:support.x + support.width/2,y:support.y}, grip, platforms);
  }
  const center = {x:body.x + body.width/2,y:body.y + body.height/2};
  const nearest = { x:limit(center.x,support.x,support.x+support.width), y:limit(center.y,support.y,support.y+support.height) };
  return center.x >= support.x - 24 && center.x <= support.x + support.width + 24 &&
    center.y >= support.y - 28 && center.y <= support.y + support.height + 28 &&
    canopySegmentClearV112(center, nearest, platforms);
}
export function canopySwingPointV112(swing: CanopySwingV112, support: WorldClimbable) {
  return { x:support.x + support.width/2 + Math.sin(swing.angle)*swing.length,
    y:support.y + Math.cos(swing.angle)*swing.length };
}
export function attachCanopySwingV112(body: PlatformMotionBody, support: WorldClimbable): CanopySwingV112 | null {
  if (!isFlexibleCanopySupportV112(support) ||
    ![body.x,body.y,body.width,body.height,body.velocityX,body.velocityY].every(Number.isFinite) ||
    body.width <= 0 || body.height <= 0) return null;
  const grip = hand(body), dx = grip.x - support.x - support.width/2, dy = grip.y - support.y;
  const length = Math.hypot(dx,dy), angle = Math.atan2(dx,dy);
  if (length < CANOPY_PHYSICS_V112.minimumLength || length > support.height || Math.abs(angle) > CANOPY_PHYSICS_V112.maximumAngle) return null;
  return {supportId:support.id,length,angle,
    angularVelocity:limit((body.velocityX*Math.cos(angle)-body.velocityY*Math.sin(angle))/length,
      -CANOPY_PHYSICS_V112.maximumSpeed/length,CANOPY_PHYSICS_V112.maximumSpeed/length)};
}
export function releaseCanopySwingV112(swing: CanopySwingV112) {
  return {velocityX:Math.cos(swing.angle)*swing.length*swing.angularVelocity,
    velocityY:-Math.sin(swing.angle)*swing.length*swing.angularVelocity};
}
/** Fixed small sweeps follow the curved path; a collision releases at its actual contact. */
export function stepCanopySwingV112(
  initial: CanopySwingV112, body: PlatformMotionBody, support: WorldClimbable,
  input: {moveAxis:number;climbAxis:number}, deltaSeconds: number,
  platforms: readonly WorldPlatform[], floorY: number, staminaMultiplier = 1,
) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || deltaSeconds > 0.25)
    throw new RangeError("Canopy delta must be between zero and 0.25 seconds");
  if (!isCanopySwingSnapshotV112(initial) || initial.supportId !== support.id ||
    !isFlexibleCanopySupportV112(support) || initial.length > support.height ||
    !Number.isFinite(input.moveAxis) || !Number.isFinite(input.climbAxis) || !Number.isFinite(staminaMultiplier))
    throw new RangeError("Canopy step requires a real flexible support and finite controls");
  if (!canopySupportReachableV112(body,support,platforms,initial)) {
    return {swing:{...initial},body:{...body},detached:true,grounded:false,staminaCost:0,tensionPerKg:0};
  }
  let swing = {...initial}, actor = {...body}, detached = false, grounded = false;
  let staminaCost = 0;
  const steps = Math.max(1,Math.ceil(deltaSeconds/CANOPY_PHYSICS_V112.substepSeconds));
  const dt = deltaSeconds/steps;
  for (let index=0; index<steps; index++) {
    const previousLength = swing.length;
    swing.length = limit(swing.length + limit(input.climbAxis,-1,1)*CANOPY_PHYSICS_V112.lengthSpeed*dt,
      CANOPY_PHYSICS_V112.minimumLength,support.height);
    swing.angularVelocity *= (previousLength/swing.length)**2;
    const acceleration = -CANOPY_PHYSICS_V112.gravity/swing.length*Math.sin(swing.angle) +
      limit(input.moveAxis,-1,1)*CANOPY_PHYSICS_V112.pumpAcceleration -
      CANOPY_PHYSICS_V112.damping*swing.angularVelocity;
    swing.angularVelocity = limit(swing.angularVelocity + acceleration*dt,
      -CANOPY_PHYSICS_V112.maximumSpeed/swing.length,CANOPY_PHYSICS_V112.maximumSpeed/swing.length);
    swing.angle += swing.angularVelocity*dt;
    if (Math.abs(swing.angle)>CANOPY_PHYSICS_V112.maximumAngle) {
      swing.angle=limit(swing.angle,-CANOPY_PHYSICS_V112.maximumAngle,CANOPY_PHYSICS_V112.maximumAngle);
      swing.angularVelocity *= -0.25;
    }
    const point = canopySwingPointV112(swing,support);
    const desired = {x:point.x-actor.width/2,y:point.y-actor.height*0.28};
    const velocity = releaseCanopySwingV112(swing);
    const motion = resolvePlatformMotion({...actor,...velocity},desired,platforms,floorY);
    actor={...actor,...motion}; grounded=motion.grounded;
    staminaCost += (support.staminaPerSecond + Math.abs(input.moveAxis)*3 + Math.abs(input.climbAxis)*4) *
      limit(staminaMultiplier,1,3)*dt;
    if (Math.hypot(motion.x-desired.x,motion.y-desired.y)>0.01 || grounded ||
      !canopySegmentClearV112({x:support.x+support.width/2,y:support.y},point,platforms)) {
      detached=true; break;
    }
  }
  return {swing,body:actor,detached,grounded,staminaCost,
    tensionPerKg:CANOPY_PHYSICS_V112.gravity*Math.cos(swing.angle)+swing.length*swing.angularVelocity**2};
}

/**
 * Up to three optional traversals per hunt: 180 px steps, 130 px resting branches and
 * ground-reaching end trees. No armor modifier or unlocked boost is required.
 * Positions are authored from the final room geometry, never decorative props.
 */
export function authorCanopyRoutesV112(world: WorldBlueprint): WorldBlueprint {
  const platforms = [...world.platforms], climbables = [...world.climbables];
  const waypointIds: string[] = [];
  const material = world.biome === "jungle" || world.biome === "swamp" ? "root" :
    world.biome === "fungal" ? "mycelium" : world.biome === "ice" ? "ice" : "stone";
  const supportKind = world.biome === "jungle" || world.biome === "swamp" || world.biome === "fungal" ? "tree" : "rock-face";
  let lastEnd = -Infinity;
  for (const fraction of [0.12,0.32,0.52]) {
    let start = Math.max(600,Math.floor(world.width*fraction/20)*20);
    // Keep entry/recovery outside every hazard and each branch clear of a wall.
    const safe = (x:number) => world.hazards.every(h => h.damagePerSecond === 0 ||
      x+70<h.x || x-70>h.x+h.width);
    let found=false;
    for (let shift=0;shift<=1600;shift+=80) {
      const x=start+shift;
      if (x<=lastEnd+240 || x+900>=world.bossArena.x-180) continue;
      if (!safe(x) || !safe(x+900)) continue;
      const blocked=world.platforms.some(p=>p.collision==="solid"&&
        p.x<x+1000&&p.x+p.width>x-80&&p.y<430&&p.y+p.height>90);
      if (!blocked) {start=x;found=true;break;}
    }
    if (!found) continue;
    const sequence = waypointIds.length/12;
    for (let index=0;index<6;index++) {
      const x=start+index*180;
      const top=index%2===0?270:245;
      const id=`v112-canopy-${world.missionId}-${sequence}-${index}`;
      platforms.push({id:`${id}-rest`,x:x-65,y:top,width:130,height:18,material,
        routeId:"canopy-transfer",collision:"one-way",noiseMultiplier:0.7,trackPersistence:0.3});
      const end=index===0||index===5;
      climbables.push({id:`${id}-grip`,x:x-24,y:40,width:48,height:end?world.floorY-40:250,
        kind:end?supportKind:(world.biome==="jungle"||world.biome==="swamp"||world.biome==="fungal"?"vine":"rope"),
        routeId:"canopy-transfer",climbSpeedMultiplier:1,staminaPerSecond:end?3:4,
        dismounts:[{x,y:top},{x:x+80,y:world.floorY}]});
      waypointIds.push(`${id}-grip`,`${id}-rest`);
    }
    lastEnd=start+900;
  }
  if (!waypointIds.length) return world;
  return {...world,platforms,climbables,routes:[...world.routes,{
    id:"canopy-transfer",label:"Passages hauts — prise, balancement et repos",
    startX:Math.max(0,platforms[world.platforms.length].x-30),
    endX:Math.min(world.width,lastEnd+100),waypointIds,
    requirements:["climb"],advantages:["high-ground","stealth"],risk:2,
  }]};
}
