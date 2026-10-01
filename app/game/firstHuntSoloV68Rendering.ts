import { youthClipFrame, type YouthArtBank, type YouthPropSprite, type YouthArtPose } from "./youthTrainingRendering";
import { drawActorContactShadow, getSpriteContact } from "./spriteContact";
import { SOLO_V68_RELAY, SOLO_V68_PREPARATION, soloV68Rocks, soloV68Support, soloV68Objective, soloV68CameraX, type SoloV68State } from "./systems/firstHuntSoloV68";

/** Existing native, independent facing atlases. Saar and Vek are original trainees, not canon character reskins. */
export function drawFirstHuntSoloV68(ctx: CanvasRenderingContext2D, s: SoloV68State, bank: YouthArtBank | null, reducedMotion: boolean) {
  const width = ctx.canvas.width; ctx.save(); ctx.clearRect(0, 0, width, 540); ctx.fillStyle = "#17100c"; ctx.fillRect(0, 0, width, 540);
  if (!bank) { ctx.restore(); return; }
  const { images, manifest } = bank, camera = soloV68CameraX(s, width);
  const backdrop = images.get(manifest.scenes.desert!.src)!, backdropScale = 430 / manifest.scenes.desert!.groundY!;
  const backdropWidth = backdrop.width * backdropScale, offset = Math.min(camera * .15, Math.max(0, backdropWidth - width));
  ctx.drawImage(backdrop, -offset, 0, backdropWidth, backdrop.height * backdropScale);
  // Continuous navigable ground shares one level plane; distant scenery moves at bounded parallax.
  const soil = ctx.createLinearGradient(0, 430, 0, 540); soil.addColorStop(0, "#9c7855"); soil.addColorStop(.1, "#705138"); soil.addColorStop(1, "#30241b"); ctx.fillStyle = soil; ctx.fillRect(0, 430, width, 110);
  ctx.translate(-camera, 0);
  const prop = (sprite: YouthPropSprite, x: number, y: number, height: number) => { const scale = height / sprite.rect[3]; ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, x - sprite.pivot[0] * scale, y - sprite.pivot[1] * scale, sprite.rect[2] * scale, height); };
  const label = (text: string, x: number, y: number, color = "#f4d49a") => { ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = color; ctx.fillText(text, x, y); };
  for (const r of soloV68Rocks(s.route)) { const sprite = manifest.desertProps!.stone; ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, r.x, r.y, r.width, r.height); ctx.strokeStyle = "#c9a57f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.width, r.y); ctx.stroke(); }
  for (const route of SOLO_V68_PREPARATION) { prop(manifest.props.marker, route.x, 430, 35); if (s.phase === "route") label(route.label, route.x, 310, s.route === route.route ? "#a8d6ad" : "#f4d49a"); }
  prop(manifest.desertProps!.branch, 2020, 430, 36);
  SOLO_V68_RELAY.forEach((x, i) => { prop(manifest.props.marker, x, 430, 30); if (s.phase === "relay") label(["Vek", "Saar", "Toi"][i], x, 385); });
  prop(manifest.props.marker, 2800, 430, 34);
  prop(manifest.props.cot, 4500, 430, 26); prop(manifest.desertProps!.stone, 4540, 430, 45);
  // The cache is a marked rest station; no invented drawing is presented as a canonical medicomp.
  prop(manifest.props.marker, 4930, 430, 35); prop(manifest.props.cot, 4950, 430, 23); prop(manifest.props.marker, 5260, 430, 42);
  if (s.phase === "medicine") label("CACHE DE SECOURS", 4930, 330);
  const actor = (kind: "player" | "rival", x: number, y: number, facing: -1 | 1, height: number, pose: YouthArtPose, id?: string, follow?: boolean, injured = false) => {
    const atlas = manifest.actors[kind][facing === 1 ? "right" : "left"];
    const frame = youthClipFrame(atlas.clips[pose], pose === "jab" ? 22 - s.player.strike : reducedMotion && (pose === "idle" || pose === "hurt") ? 0 : s.tick);
    const image = images.get(atlas.src)!, scale = height / atlas.bodyHeight, contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const floor = soloV68Support(s, { x, y }); drawActorContactShadow(ctx, x, floor, kind === "rival" && height > 120 ? 19 : 15, floor - y);
    ctx.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale, y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale, frame.rect[2] * scale, frame.rect[3] * scale);
    if (id) { label(id, x, y - height - 12, injured ? "#ffb7a0" : id === "Saar" ? "#d0ba90" : "#9ec9cf"); if (follow !== undefined) label(injured ? "SOIN NÉCESSAIRE" : follow ? "SUIT" : "ATTEND", x, y - height - 29, injured ? "#ffb7a0" : "#c9c3b7"); }
    if (kind === "player" && manifest.cage) prop(manifest.cage.insignia, x, y - 68, 13);
  };
  actor("rival", 160, 430, 1, 150, "idle");
  const b = s.prey, art = manifest.patrolGrazer!, side = art[b.facing === 1 ? "right" : "left"];
  if (b.phase !== "gone") { const sprite = b.phase === "telegraph" ? side.telegraph : b.phase === "charge" || b.phase === "retreat" ? side.charge[Math.floor(s.tick / 9) % side.charge.length] : side.watch; drawActorContactShadow(ctx, b.x, 430, 48, 0); prop(sprite, b.x, 430, art.displayHeight); }
  s.companions.forEach(c => actor("rival", c.x, c.y, c.facing, c.id === "saar" ? 113 : 106, c.injured ? "hurt" : c.vy ? "jump" : Math.abs(c.vx) > .01 ? "walk" : "idle", c.id === "saar" ? "Saar" : "Vek", c.joined ? c.following : undefined, c.injured));
  const a = s.player; actor("player", a.x, a.y, a.facing, 112, a.strike ? "jab" : a.invulnerable > 62 ? "hurt" : a.vy ? "jump" : Math.abs(a.vx) > .01 ? "walk" : "idle");
  const target = soloV68Objective(s).targetX;
  if (target !== null) { ctx.strokeStyle = "#eed198"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(target - 30, 434); ctx.lineTo(target + 30, 434); ctx.stroke(); ctx.setLineDash([]); if (s.scan) { const limit = ["rescue", "recognition"].includes(s.phase) ? 90 : ["medicine", "relay"].includes(s.phase) ? 45 : 60; ctx.fillStyle = "#ead090"; ctx.fillRect(target - 28, 447, 56 * s.scan / limit, 5); } }
  if (s.phase === "encounter") { const text = b.phase === "telegraph" ? "CHARGE IMMINENTE" : b.phase === "recover" ? "FENÊTRE DE TOUCHE" : ""; ctx.font = "bold 16px sans-serif"; const half = ctx.measureText(text).width / 2; label(text, Math.max(camera + half + 8, Math.min(camera + width - half - 8, b.x)), 300, b.phase === "recover" ? "#b5e6bf" : "#ffd2b0"); }
  ctx.restore();
}
