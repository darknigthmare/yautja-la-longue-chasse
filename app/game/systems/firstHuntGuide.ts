import type { ControlActionId } from "./controlBindings";

/** Presentation-only apprenticeship: observes the hunt, never grants campaign evidence. */
export interface FirstHuntObservation {
  x: number; y: number; velocityY: number; grounded: boolean; elapsed: number;
  paused: boolean; phase: string; energy: number; scanCooldown: number;
  traces: readonly { x: number; y: number; scanned: boolean }[];
  recoveries: readonly { x: number; y: number; recovered: boolean }[];
  bossActive: boolean; bossAlive: boolean; bossX: number; danger: boolean;
  extractionX: number; trophyExtracting: boolean; transportPhase: string | null;
}
export interface FirstHuntLearning {
  last: FirstHuntObservation; distance: number; jumped: boolean; scanned: boolean;
  resumed: boolean;
}
export interface FirstHuntHint {
  id: string; title: string; detail: string; actions: readonly ControlActionId[];
  gamepad: string; progress: string; direction: "left" | "right" | "near" | null;
}
export function createFirstHuntLearning(observation: FirstHuntObservation, resumed = false): FirstHuntLearning {
  return { last: observation, distance: 0, jumped: false, scanned: observation.traces.some(t => t.scanned), resumed };
}
export function observeFirstHunt(previous: FirstHuntLearning, now: FirstHuntObservation): FirstHuntLearning {
  // Require real advancing simulation. Paused inputs and a restore/teleport are not achievements.
  const dt = now.elapsed - previous.last.elapsed;
  if (now.paused || previous.last.paused || dt <= 0 || dt > .25 || now.phase === "dead" || now.phase === "finished") {
    return { ...previous, last: now };
  }
  const dx = Math.abs(now.x - previous.last.x);
  return {
    ...previous, last: now,
    distance: previous.distance + (dx <= 600 * dt ? dx : 0),
    jumped: previous.jumped || (previous.last.grounded && !now.grounded && now.velocityY < -100),
    scanned: previous.scanned || now.scanCooldown > previous.last.scanCooldown + .2 || now.traces.some(t => t.scanned),
  };
}
const nearest = <T extends { x: number; y: number }>(items: readonly T[], o: FirstHuntObservation): T | undefined =>
  [...items].sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
const direction = (x: number, o: FirstHuntObservation): FirstHuntHint["direction"] => Math.abs(x - o.x) < 80 ? "near" : x < o.x ? "left" : "right";
export function firstHuntHint(learning: FirstHuntLearning): FirstHuntHint | null {
  const o = learning.last;
  if (o.phase === "dead" || o.phase === "finished") return null;
  const traced = o.traces.filter(t => t.scanned).length;
  const traceProgress = `${traced}/${o.traces.length} traces analysées`;
  const hint = (id: string, title: string, detail: string, actions: readonly ControlActionId[], gamepad: string, progress = traceProgress, targetX?: number): FirstHuntHint =>
    ({ id, title, detail, actions, gamepad, progress, direction: targetX === undefined ? null : direction(targetX, o) });
  if (o.phase === "trophy") return hint("trophy", "Récupérer l’insigne de Vey", o.trophyExtracting ? "Suis les glyphes du rite affichés à l’écran. Le trophée n’est acquis qu’à la fin du geste." : "Approche la dépouille et commence le rite. La prise de cette chasse est un insigne.", ["hunt.interact"], "B : interagir", "Cible vaincue", o.bossX);
  if (o.phase === "extraction") return hint("extraction", "Ramener la prise", o.transportPhase === "boarding" || o.transportPhase === "departure" ? "Laisse le transport terminer l’extraction." : "Rejoins la balise. Attends le transport en stationnaire puis interagis pour embarquer.", ["hunt.interact"], "B : embarquer", "Extraction requise pour valider la chasse", o.extractionX);
  if (o.danger || (o.bossActive && o.bossAlive)) return hint("combat", o.bossActive ? "Observer Vey avant de frapper" : "Une proie a repéré le chasseur", "Analyse la proie, garde de l’espace et frappe au contact. Les tirs au plasma sur les proies ordinaires pénalisent cette chasse.", ["hunt.scan", "hunt.melee", "hunt.jump"], "LB : scan · X : mêlée · A : saut");
  if (!learning.resumed && traced === 0 && learning.distance < 120) return hint("move", "Prendre ses appuis", "Avance vers la droite dans la clairière. Le guide suit tes actions ; il ne bloque jamais l’exploration.", ["hunt.moveLeft", "hunt.moveRight"], "Stick gauche / croix : déplacement", "Premiers pas 1/3", o.x + 200);
  if (!learning.resumed && traced === 0 && !learning.jumped) return hint("jump", "Franchir le terrain", "Saute en avançant. Relâche plus tôt pour un saut court ; une chute seule ne valide pas cet exercice.", ["hunt.jump"], "A : saut", "Premiers pas 2/3");
  const trace = nearest(o.traces.filter(t => !t.scanned), o);
  if (trace) {
    const inRange = Math.hypot(trace.x - o.x, trace.y - o.y) <= 430;
    if (inRange && o.energy < 8) return hint("scan-energy", "Laisser le biomask se recharger", "Le scan demande 8 unités d’énergie. Coupe le camouflage si nécessaire et attends la recharge.", ["hunt.toggleCloak"], "Y : camouflage", traceProgress, trace.x);
    return hint(inRange ? "scan" : "track", inRange ? "Analyser une trace proche" : "Suivre la piste de Vey", inRange ? "Déclenche le scan. Une pulsation vide ne compte pas comme une trace découverte." : "Suis la direction indiquée et les marques de la jungle. Le scan atteint les traces à proximité, même hors du centre de l’écran.", inRange ? ["hunt.scan"] : ["hunt.moveLeft", "hunt.moveRight", "hunt.scan"], "Stick : déplacement · LB : scan", traceProgress, trace.x);
  }
  const recovery = nearest(o.recoveries.filter(t => !t.recovered), o);
  if (recovery) return hint("recover", "Récupérer le transpondeur", "Approche la technologie repérée puis interagis. Le scan ne remplace pas la récupération physique.", ["hunt.interact"], "B : récupérer", "Piste analysée", recovery.x);
  return hint("approach", "Rejoindre le territoire de Vey", "Le transpondeur est sécurisé. Avance jusqu’à l’arène ; observe les signaux d’attaque avant de riposter.", ["hunt.moveRight", "hunt.scan"], "Stick : déplacement · LB : scan", "Préparation accomplie", o.bossX);
}
