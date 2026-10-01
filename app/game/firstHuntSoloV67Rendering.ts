import { youthClipFrame, type YouthArtBank, type YouthPropSprite } from "./youthTrainingRendering";
import { drawActorContactShadow, getSpriteContact } from "./spriteContact";
import { SOLO_V67_WORLD, SOLO_V67_CLUES, SOLO_V67_PREPARATION, soloV67Rocks, soloV67Support, soloV67Objective, soloV67CameraX, type SoloV67State } from "./systems/firstHuntSoloV67";

/** Native V48/49/52 art, with independent facing sheets. No invented death pose or harvested trophy. */
export function drawFirstHuntSoloV67(ctx: CanvasRenderingContext2D, s: SoloV67State, bank: YouthArtBank | null, reducedMotion: boolean) {
  const width = ctx.canvas.width;
  ctx.save(); ctx.clearRect(0, 0, width, 540); ctx.fillStyle = "#17100c"; ctx.fillRect(0, 0, width, 540);
  if (!bank) { ctx.restore(); return; }
  const { images, manifest } = bank;
  const camera = soloV67CameraX(s, width);
  const backdrop = images.get(manifest.scenes.desert!.src)!, backdropScale = 430 / manifest.scenes.desert!.groundY!;
  const backdropWidth = backdrop.width * backdropScale, offset = Math.min(camera * .15, Math.max(0, backdropWidth - width));
  ctx.drawImage(backdrop, -offset, 0, backdropWidth, backdrop.height * backdropScale);
  ctx.translate(-camera, 0);
  const prop = (sprite: YouthPropSprite, x: number, y: number, height: number) => {
    const scale = height / sprite.rect[3];
    ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, x - sprite.pivot[0] * scale, y - sprite.pivot[1] * scale, sprite.rect[2] * scale, height);
  };
  for (const rock of soloV67Rocks(s.route)) {
    const sprite = manifest.desertProps!.stone;
    ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, rock.x, rock.y, rock.width, rock.height);
    ctx.strokeStyle = "#c9a57f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rock.x, rock.y); ctx.lineTo(rock.x + rock.width, rock.y); ctx.stroke();
  }
  ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
  for (const choice of SOLO_V67_PREPARATION) {
    prop(manifest.props.marker, choice.x, 430, 36);
    ctx.fillStyle = s.route === choice.route ? "#a8d6ad" : "#f4d49a";
    ctx.fillText(choice.label, choice.x, 364);
  }
  SOLO_V67_CLUES.forEach((x, index) => {
    prop(manifest.desertProps![index === 0 ? "footprints" : "branch"], x, 430, index === 0 ? 22 : 36);
    if (index < s.clues) { ctx.fillStyle = "#a8d6ad"; ctx.fillText("✓", x, 370); }
  });
  prop(manifest.props.marker, SOLO_V67_WORLD.recoveryX, 430, 32);
  prop(manifest.desertProps!.footprints, SOLO_V67_WORLD.identifyX, 430, 22);
  if (["proof", "return", "debrief", "complete"].includes(s.phase)) prop(manifest.desertProps!.footprints, SOLO_V67_WORLD.proofX, 430, 25);
  const actor = (kind: "player" | "rival", x: number, y: number, facing: -1 | 1, height: number) => {
    const atlas = manifest.actors[kind][facing === 1 ? "right" : "left"];
    const pose = kind === "rival" ? "idle" : s.player.strike ? "jab" : s.player.invulnerable > 62 ? "hurt" : s.player.vy !== 0 ? "jump" : Math.abs(s.player.vx) > .01 ? "walk" : "idle";
    const frame = youthClipFrame(atlas.clips[pose], pose === "jab" ? 22 - s.player.strike : reducedMotion && pose === "idle" ? 0 : s.tick);
    const image = images.get(atlas.src)!, scale = height / atlas.bodyHeight, contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const floor = kind === "rival" ? 430 : soloV67Support(s);
    drawActorContactShadow(ctx, x, floor, 16, floor - y);
    ctx.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale, y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale, frame.rect[2] * scale, frame.rect[3] * scale);
    if (kind === "player" && manifest.cage) prop(manifest.cage.insignia, x, y - 68, 13);
  };
  actor("rival", SOLO_V67_WORLD.mentorX, 430, 1, 150);
  const b = s.prey, art = manifest.patrolGrazer!, side = art[b.facing === 1 ? "right" : "left"];
  if (b.phase !== "gone") {
    const sprite = b.phase === "telegraph" ? side.telegraph : b.phase === "charge" || b.phase === "retreat" ? side.charge[Math.floor(s.tick / 9) % side.charge.length] : side.watch;
    drawActorContactShadow(ctx, b.x, 430, 48, 0); prop(sprite, b.x, 430, art.displayHeight);
  }
  actor("player", s.player.x, s.player.y, s.player.facing, 112);
  const target = soloV67Objective(s).targetX;
  if (target !== null) {
    ctx.strokeStyle = "#eed198"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(target - 30, 434); ctx.lineTo(target + 30, 434); ctx.stroke(); ctx.setLineDash([]);
    if (s.scan) { ctx.fillStyle = "#ead090"; ctx.fillRect(target - 28, 447, 56 * s.scan / (s.phase === "tracks" ? 48 : 60), 5); }
  }
  if (s.phase === "encounter") {
    ctx.fillStyle = b.phase === "telegraph" || b.phase === "charge" ? "#ffd2b0" : "#b5e6bf";
    ctx.font = "bold 16px sans-serif";
    const label = b.phase === "telegraph" ? "CHARGE IMMINENTE" : b.phase === "recover" ? "FENÊTRE DE TOUCHE" : "";
    const halfLabel = ctx.measureText(label).width / 2;
    const labelX = Math.max(camera + halfLabel + 8, Math.min(camera + width - halfLabel - 8, b.x));
    ctx.fillText(label, labelX, 306);
  }
  ctx.restore();
}
