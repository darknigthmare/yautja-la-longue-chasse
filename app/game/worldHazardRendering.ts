import type { HazardKind, HazardPhase, WorldHazard } from "./systems/worldBlueprints";

type Effect = "surface" | "wave" | "ice" | "drift" | "column" | "electric" | "spores" | "gravity" | "laser";

const PROFILES = {
  "deep-mud": ["surface", "#b88a5c", "#503420"],
  "predatory-flora": ["surface", "#cde666", "#38502a"],
  "flash-flood": ["wave", "#48b2d0", "#194b69"],
  "thin-ice": ["ice", "#b9efff", "#234a6a"],
  "falling-ice": ["ice", "#c9f4ff", "#366789"],
  whiteout: ["drift", "#def7ff", "#b9efff"],
  lava: ["surface", "#ff6338", "#6e201b"],
  "steam-vent": ["column", "#e9f7f1", "#a6b9ab"],
  "ash-squall": ["drift", "#c0a995", "#40362f"],
  "tidal-surge": ["wave", "#38b9d2", "#1e6563"],
  "sand-collapse": ["surface", "#efc78b", "#725233"],
  "glass-storm": ["drift", "#d9a85f", "#726052"],
  "heat-burst": ["column", "#ffbd73", "#bd5e27"],
  "rogue-wave": ["wave", "#54e2f2", "#164c70"],
  "electrical-surge": ["electric", "#75f4ff", "#187482"],
  "abyssal-vent": ["column", "#7fead0", "#207367"],
  "spore-cloud": ["spores", "#bf70e8", "#824895"],
  "mycelial-snare": ["surface", "#e1a8f6", "#552a69"],
  "acid-bloom": ["surface", "#c7ed62", "#43632b"],
  "gravity-pulse": ["gravity", "#d6a6fa", "#583a78"],
  "nanite-field": ["spores", "#efb5fd", "#674464"],
  "laser-grid": ["laser", "#ff4fd8", "#802a6c"],
} as const satisfies Record<HazardKind, readonly [Effect, string, string]>;

const TURN = Math.PI * 2;

interface Paint {
  kind: HazardKind;
  width: number;
  height: number;
  active: boolean;
  warning: number;
  time: number;
  windX: number;
  color: string;
  tint: string;
}

function unit(value: number): number {
  return value - Math.floor(value);
}

function warningProgress(hazard: WorldHazard, elapsed: number): number {
  if (!hazard.cycle) return 0;
  const { periodSeconds, activeSeconds, phaseSeconds } = hazard.cycle;
  const warning = Math.min(hazard.telegraphSeconds, periodSeconds - activeSeconds);
  const remaining = periodSeconds * (1 - unit((elapsed + phaseSeconds) / periodSeconds));
  return warning > 0 ? Math.max(0, Math.min(1, 1 - remaining / warning)) : 0;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, TURN);
}

function ground(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active, time } = p;
  const branching = kind === "predatory-flora" || kind === "mycelial-snare";
  const liquid = kind === "lava" || kind === "acid-bloom" || kind === "deep-mud";
  ctx.globalAlpha = active ? 0.62 : 0.18;
  ctx.fillStyle = p.tint;
  ctx.fillRect(0, height * 0.33, width, height);
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = width * (i + 0.5) / 8;
    const y = height * (0.52 + (i % 3) * 0.12);
    const age = unit(time * 0.7 + i * 0.618);
    ctx.globalAlpha = active ? 0.53 : 0.44;
    if (branching) {
      const lift = height * (active ? 0.51 + 0.15 * age : 0.13 + 0.16 * p.warning);
      ctx.beginPath();
      ctx.moveTo(x - 20, height);
      ctx.quadraticCurveTo(x + 20, height - lift, x, height - lift);
      ctx.quadraticCurveTo(x + 8, height - lift * 0.45, x + 23, height - 3);
      ctx.stroke();
    } else if (liquid) {
      ellipse(ctx, x, y, 7 + age * 8, 2 + age * 2.3);
      ctx.stroke();
      if (active && kind !== "deep-mud") {
        ctx.globalAlpha = (1 - age) * 0.73;
        ellipse(ctx, x + 6 * age, y - age * height * 0.64, 2.2, 2.2);
        ctx.fill();
      }
    } else {
      ellipse(ctx, x, y, width * (0.037 + 0.009 * age), Math.max(2, height * 0.1));
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = (1 - age) * 0.64;
        ctx.fillRect(x + age * 22, y - age * height * 0.45, 6, 2);
      }
    }
  }
}

function wave(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active } = p;
  const crestHeight = kind === "rogue-wave" ? 0.72 : kind === "tidal-surge" ? 0.47 : 0.56;
  const front = active ? width : width * (0.12 + p.warning * 0.88);
  const lift = active ? crestHeight : crestHeight * 0.44;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = 0; i <= 32; i++) {
    const x = front * i / 32;
    const crest = 0.77 + 0.16 * Math.sin(i / 32 * TURN * 3 - p.time * 6);
    ctx.lineTo(x, height * (1 - lift * crest));
  }
  ctx.lineTo(front, height);
  ctx.closePath();
  ctx.globalAlpha = active ? 0.69 : 0.25;
  ctx.fillStyle = p.tint;
  ctx.fill();
  ctx.globalAlpha = active ? 0.76 : 0.50;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = active ? 2.7 : 1.6;
  ctx.stroke();

  if (kind === "flash-flood" && !active) return;
  for (let i = 0; i < 8; i++) {
    const age = unit(p.time * 0.85 + i * 0.618);
    const x = front * (i + 0.8) / 9;
    const y = height * (0.82 - age * lift * 0.58);
    ctx.globalAlpha = (1 - age) * (active ? 0.78 : 0.51);
    ellipse(ctx, x, y, 4 + age * 13, 1.4 + age * 3.3);
    ctx.stroke();
  }
}

function ice(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active } = p;
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.tint;
  for (let i = 0; i < 7; i++) {
    const x = width * (i + 0.55) / 7;
    if (kind === "thin-ice") {
      const opening = active ? 1 : 0.34 + p.warning * 0.58;
      const y = height * 0.58;
      ctx.globalAlpha = active ? 0.7 : 0.45;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.07, y - 5);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + width * 0.05, y - height * opening * 0.43);
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + width * 0.05, y + height * opening * 0.4);
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = 0.58;
        ellipse(ctx, x, y + 4, width * 0.036, Math.max(3, height * 0.18));
        ctx.fill();
      }
    } else {
      ctx.globalAlpha = active ? 0.36 : 0.62;
      ellipse(ctx, x, height - 8, 14, 5);
      ctx.fill();
      ctx.stroke();
      if (active) {
        const drop = unit(p.time * 1.35 + i * 0.618);
        const y = height * drop;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 19);
        ctx.lineTo(x + 7, y - 18);
        ctx.lineTo(x, y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.tint;
      }
    }
  }
}

function drift(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active } = p;
  const snow = kind === "whiteout";
  const glass = kind === "glass-storm";
  const direction = p.windX < 0 ? -1 : 1;
  const speed = direction * (0.4 + Math.min(0.36, Math.abs(p.windX) / 160));
  const haze = ctx.createLinearGradient(direction < 0 ? width : 0, 0, direction < 0 ? 0 : width, height * 0.35);
  haze.addColorStop(0, p.tint);
  haze.addColorStop(1, "transparent");
  ctx.globalAlpha = active ? (snow ? 0.70 : 0.47) : 0.11 + p.warning * 0.17;
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.globalAlpha = active ? 0.67 : 0.40;
  ctx.lineWidth = snow ? 1.6 : 1.1;
  ctx.beginPath();
  for (let i = 0; i < (active ? 32 : 13); i++) {
    const x = width * unit(i * 0.618 + p.time * speed * (0.82 + (i % 4) * 0.09));
    const y = height * unit(i * 0.414 + p.time * (snow ? 0.034 : (glass ? 0.095 : 0.065)));
    const tail = direction * (snow ? 12 + (i % 4) * 7 : 7 + (i % 3) * 5);
    ctx.moveTo(x, y);
    ctx.lineTo(x - tail, y - (snow ? 1.2 : 4));
    if (glass && i % 4 === 0) {
      ctx.moveTo(x - 2, y - 4);
      ctx.lineTo(x + 2, y + 4);
    }
  }
  ctx.stroke();
}

function column(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active } = p;
  const isSteam = kind === "steam-vent";
  const isHeat = kind === "heat-burst";
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.tint;
  for (let i = 0; i < 5; i++) {
    const x = width * (i + 0.5) / 5;
    ctx.globalAlpha = active ? 0.56 : 0.54;
    ellipse(ctx, x, height - 5, 14, 4);
    ctx.stroke();
    for (let j = 0; j < (active ? 4 : 2); j++) {
      const age = unit(p.time * 0.82 + j * 0.25 + i * 0.618);
      const y = height - 8 - age * height * (active ? 0.94 : 0.13 + p.warning * 0.12);
      const sway = Math.sin(age * 6 + i) * (isHeat ? 10 : 5);
      ctx.globalAlpha = (1 - age) * (active ? 0.49 : 0.32);
      const spread = 4 + age * (isSteam ? 21 : 10);
      ellipse(ctx, x + sway, y, spread, isSteam ? spread * 0.7 : 2 + spread * 0.48);
      if (isSteam) ctx.fill();
      else ctx.stroke();
    }
  }
}

function electrical(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { width, height, active } = p;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  const y = height * 0.62;
  ctx.globalAlpha = active ? 0.69 : 0.48;
  for (let i = 0; i < 5; i++) {
    const x = width * (i + 0.36) / 5;
    ellipse(ctx, x, height - 8, active ? 9 : 5 + p.warning * 5, 2.6);
    ctx.stroke();
  }
  if (active) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let i = 1; i <= 26; i++) {
      const x = width * i / 26;
      const bend = Math.sin(i * 2.21 + p.time * 7) * Math.min(21, height * 0.34);
      ctx.lineTo(x, y + bend);
    }
    ctx.stroke();
  }
}

function spores(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { kind, width, height, active } = p;
  const nanites = kind === "nanite-field";
  ctx.fillStyle = p.tint;
  ctx.globalAlpha = active ? (nanites ? 0.16 : 0.31) : 0.08;
  ellipse(ctx, width * 0.5, height * 0.59, width * 0.56, height * 0.57);
  ctx.fill();
  ctx.fillStyle = p.color;
  ctx.globalAlpha = active ? 0.66 : 0.46;
  for (let i = 0; i < (active ? 32 : 12); i++) {
    const drift = p.time * (nanites ? 0.21 : 0.048);
    const x = width * unit(i * 0.618 + drift * (0.85 + (i % 5) * 0.08));
    const y = height * (active ? 0.08 + unit(i * 0.414 - drift * 0.5) * 0.91 : 0.70 + unit(i * 0.414) * 0.25);
    const size = 1.6 + (i % 3) * 0.85;
    if (nanites) ctx.fillRect(x, y, size, size);
    else {
      ellipse(ctx, x, y, size, size);
      ctx.fill();
    }
  }
}

function gravity(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { width, height, active } = p;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = active ? 2 : 1.3;
  for (let i = 0; i < 6; i++) {
    const age = unit(i / 6 - p.time * 0.51);
    const size = (0.16 + age * 0.78) * (active ? 1 : 0.42 + p.warning * 0.29);
    ctx.globalAlpha = (1 - age) * (active ? 0.73 : 0.46);
    ellipse(ctx, width / 2, height * 0.57, width * size * 0.47, height * size * 0.43);
    ctx.stroke();
  }
}

function laser(ctx: CanvasRenderingContext2D, p: Paint): void {
  const { width, height, active } = p;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  if (active) {
    ctx.globalAlpha = 0.67;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const x = width * i / 8;
      ctx.moveTo(x, 4);
      ctx.lineTo(x, height - 3);
    }
    for (let i = 1; i < 4; i++) {
      const y = height * i / 4;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else {
    const x = width * (0.08 + p.warning * 0.84);
    ctx.globalAlpha = 0.23;
    ctx.fillRect(x - 11, 0, 22, height);
    ctx.globalAlpha = 0.82;
    ctx.fillRect(x - 1, 0, 2, height);
  }
}

const PAINTERS: Record<Effect, (ctx: CanvasRenderingContext2D, paint: Paint) => void> = {
  surface: ground,
  wave,
  ice,
  drift,
  column,
  electric: electrical,
  spores,
  gravity,
  laser,
};

/** Paint the exact rectangle used by gameplay. Motion preferences never change the phase. */
export function drawWorldHazard(
  ctx: CanvasRenderingContext2D,
  hazard: WorldHazard,
  phase: HazardPhase,
  elapsed: number,
  reducedMotion: boolean,
  windX: number,
): void {
  if (phase === "inactive" || hazard.width <= 0 || hazard.height <= 0) return;
  const { x, y, width, height } = hazard;
  const [effect, color, tint] = PROFILES[hazard.kind];
  const active = phase === "active";
  const warning = reducedMotion ? 0.55 : warningProgress(hazard, elapsed);

  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  PAINTERS[effect](ctx, {
    kind: hazard.kind, width, height, active, warning, time: reducedMotion ? 0.5 : elapsed,
    windX: reducedMotion ? 0 : windX, color, tint,
  });

  // A solid floor edge marks contact. An interrupted perimeter marks the warning.
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 2 : 1.5;
  ctx.globalAlpha = active ? 0.73 : 0.83;
  ctx.setLineDash(active ? [] : [5, 6]);
  ctx.beginPath();
  ctx.moveTo(1, active ? Math.max(1, height - 10) : 1);
  ctx.lineTo(1, height - 1);
  ctx.lineTo(width - 1, height - 1);
  ctx.lineTo(width - 1, active ? Math.max(1, height - 10) : 1);
  if (!active) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Each spray belongs to an already-issued hunter footprint, so replay cannot emit extra particles. */
export function drawMudFootstep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  directionX: number,
  age: number,
): void {
  const duration = 0.36;
  if (age < 0 || age >= duration) return;
  const progress = age / duration;
  ctx.save();
  ctx.fillStyle = "#b88a5c";
  ctx.globalAlpha = (1 - progress) * 0.75;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const radius = 1.3 + (i % 3) * 0.49;
    const spread = (i - 2.5) * (4 + progress * 7) - directionX * progress * 8;
    const lift = 4 + Math.sin(progress * Math.PI) * (8 + i % 3 * 6);
    ctx.moveTo(x + spread + radius, y - lift);
    ctx.arc(x + spread, y - lift, radius, 0, TURN);
  }
  ctx.fill();
  ctx.restore();
}
