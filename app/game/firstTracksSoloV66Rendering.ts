import { youthClipFrame, type YouthArtBank, type YouthPropSprite } from "./youthTrainingRendering";
import { drawActorContactShadow, getSpriteContact } from "./spriteContact";
import { SOLO_V66_WORLD, SOLO_V66_ROCKS, SOLO_V66_CLUES, SOLO_V66_FALSE_TRAIL, soloV66Support, soloV66Grazer, soloV66Objective, type SoloV66State } from "./systems/firstTracksSoloV66";

/** Existing native V48/49/52 paintings and poses, never generated CSS stand-ins or new animation claims. */
export function drawFirstTracksSoloV66(ctx: CanvasRenderingContext2D, s: SoloV66State, bank: YouthArtBank | null, reducedMotion: boolean) {
  const viewportWidth = ctx.canvas.width;
  ctx.save(); ctx.clearRect(0, 0, viewportWidth, 540); ctx.fillStyle = "#17100c"; ctx.fillRect(0, 0, viewportWidth, 540);
  if (!bank) { ctx.restore(); return; }
  const { images, manifest } = bank, camera = Math.max(0, Math.min(SOLO_V66_WORLD.width - viewportWidth, s.player.x - viewportWidth * .39));
  const backdrop = images.get(manifest.scenes.desert!.src)!;
  const backdropScale = 430 / manifest.scenes.desert!.groundY!;
  const backdropWidth = backdrop.width * backdropScale;
  // This authored panorama is not tileable: a bounded pan avoids a bright vertical repeat seam.
  const backdropOffset = Math.min(camera * .15, Math.max(0, backdropWidth - viewportWidth));
  ctx.drawImage(backdrop, -backdropOffset, 0, backdropWidth, backdrop.height * backdropScale);
  ctx.translate(-camera, 0);
  const prop = (sprite: YouthPropSprite, x: number, y: number, height: number) => {
    const scale = height / sprite.rect[3];
    ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, x - sprite.pivot[0] * scale, y - sprite.pivot[1] * scale, sprite.rect[2] * scale, height);
  };
  for (const rock of SOLO_V66_ROCKS) {
    const sprite = manifest.desertProps!.stone;
    ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, rock.x, rock.y, rock.width, rock.height);
    ctx.strokeStyle = "#c9a57f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rock.x, rock.y); ctx.lineTo(rock.x + rock.width, rock.y); ctx.stroke();
  }
  SOLO_V66_CLUES.forEach((clue, index) => {
    prop(manifest.desertProps![clue.kind], clue.x, 430, clue.kind === "footprints" ? 22 : 42);
    if (index < s.clues) { ctx.fillStyle = "#a8d6ad"; ctx.font = "bold 15px sans-serif"; ctx.fillText("✓", clue.x - 5, 369); }
  });
  prop(manifest.desertProps!.branch, SOLO_V66_FALSE_TRAIL.x, 430, 36);
  prop(manifest.props.marker, SOLO_V66_WORLD.retreatX, 430, 30);
  const actor = (kind: "player" | "rival", x: number, y: number, facing: -1 | 1, height: number) => {
    const atlas = manifest.actors[kind][facing === 1 ? "right" : "left"];
    const pose = kind === "rival" ? "idle" : s.player.vy !== 0 ? "jump" : s.player.quiet ? "dodge" : Math.abs(s.player.vx) > .01 ? "walk" : "idle";
    const frame = youthClipFrame(atlas.clips[pose], reducedMotion && pose === "idle" || pose === "dodge" ? 0 : s.tick);
    const image = images.get(atlas.src)!, scale = height / atlas.bodyHeight;
    const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const left = x - frame.pivot[0] * scale, top = y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
    const floor = kind === "rival" ? 430 : soloV66Support(s.player).y;
    drawActorContactShadow(ctx, x, floor, 16, floor - y);
    ctx.drawImage(image, ...frame.rect, left, top, frame.rect[2] * scale, frame.rect[3] * scale);
    if (kind === "player" && manifest.cage) prop(manifest.cage.insignia, x, y - 68, 13);
  };
  actor("rival", SOLO_V66_WORLD.mentorX, 430, 1, 150);
  const grazer = soloV66Grazer(s), art = manifest.patrolGrazer!;
  prop(art[grazer.facing === 1 ? "right" : "left"].watch, grazer.x, grazer.y, art.displayHeight);
  actor("player", s.player.x, s.player.y, s.player.facing, 112);
  const target = soloV66Objective(s).targetX;
  if (target !== null) { ctx.strokeStyle = "#eed198"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(target - 30, 434); ctx.lineTo(target + 30, 434); ctx.stroke(); ctx.setLineDash([]); }
  if (["stalk", "setback"].includes(s.phase)) {
    ctx.fillStyle = "#19130fe0"; ctx.fillRect(grazer.x - 45, 300, 90, 10);
    ctx.fillStyle = s.alert > 70 ? "#eb725a" : "#e7c36f"; ctx.fillRect(grazer.x - 45, 300, s.alert * .9, 10);
    ctx.fillStyle = "#ffe6b9"; ctx.font = "16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(grazer.facing === -1 ? "Il te fait face" : "Il se détourne", grazer.x, 287);
  }
  ctx.restore();
}
