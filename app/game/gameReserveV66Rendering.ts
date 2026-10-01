import { drawActorContactShadow } from "./spriteContact";
import { GAME_RESERVE_V66_COVER, GAME_RESERVE_V66_PEOPLE, GAME_RESERVE_V66_PLATFORMS, GAME_RESERVE_V66_SHIPS, GAME_RESERVE_V66_SUPPLIES, gameReserveV66Interaction, gameReserveV66Sector, type GameReserveV66State } from "./systems/gameReserveV66";

/** Reused native art. The original hunter is a held drawing, not an invented animation sheet. */
export const GAME_RESERVE_V66_ART = {
  background: "/game/assets/v2/environments/jungle/layers/far-lake.webp",
  branch: "/game/props/v4/root-platform.png", industrialPlatform: "/game/props/v4/expedition-platform.png",
  ferns: "/game/props/v4/foreground-ferns.png", machinery: "/game/ship-interior/v21/wall-machinery.webp",
  hunter: "/game/sprites/hunter.webp", ship: "/game/ships/v14/game-preserve-ship.webp",
  raider: "/game/sprites/v7/enemies/humanoid-badblood/frontier-raider-sheet.png",
  marine: "/game/sprites/v7/enemies/humanoid-badblood/colonial-marine-sheet.png",
  sniper: "/game/sprites/v7/enemies/humanoid-badblood/colonial-sniper-sheet.png",
} as const;
export type GameReserveV66Art = Record<keyof typeof GAME_RESERVE_V66_ART, HTMLImageElement>;
export async function loadGameReserveV66Art(): Promise<GameReserveV66Art> {
  const items = await Promise.all(Object.entries(GAME_RESERVE_V66_ART).map(([key, src]) => new Promise<[string, HTMLImageElement]>((resolve, reject) => {
    const image = new Image(); image.decoding = "async";
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve([key, image]) : reject(new Error("Image vide : " + src));
    image.onerror = () => reject(new Error("Image indisponible : " + src)); image.src = src;
  })));
  const bank = Object.fromEntries(items) as GameReserveV66Art;
  for (const id of ["raider", "marine", "sniper"] as const) if (bank[id].naturalWidth !== 1536 || bank[id].naturalHeight !== 192) throw new Error("Atlas humain incompatible : " + id);
  return bank;
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#e9efd4") {
  ctx.save(); ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  const width = ctx.measureText(text).width + 16; ctx.fillStyle = "#081210dc"; ctx.fillRect(x - width / 2, y - 15, width, 21);
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
/** Tactical component icon belongs to the HUD layer, never represented as a new native prop. */
function componentMarker(ctx: CanvasRenderingContext2D, x: number, y: number, count?: number) {
  ctx.save(); ctx.strokeStyle = "#b2e9dc"; ctx.fillStyle = "#102a25e8"; ctx.lineWidth = 2; ctx.fillRect(x - 11, y - 20, 22, 19); ctx.strokeRect(x - 11, y - 20, 22, 19);
  ctx.beginPath(); ctx.moveTo(x - 4, y - 16); ctx.lineTo(x + 4, y - 16); ctx.lineTo(x + 4, y - 5); ctx.lineTo(x - 4, y - 5); ctx.closePath(); ctx.stroke();
  if (count !== undefined) label(ctx, "Pièces × " + count, x, y - 31, "#b2e9dc"); ctx.restore();
}
export function drawGameReserveV66(ctx: CanvasRenderingContext2D, s: GameReserveV66State, bank: GameReserveV66Art | null, reducedMotion = false) {
  const viewportWidth = ctx.canvas.width;
  ctx.save(); ctx.clearRect(0, 0, viewportWidth, 540); ctx.fillStyle = "#07100e"; ctx.fillRect(0, 0, viewportWidth, 540);
  if (!bank) { ctx.restore(); return; }
  // Expand the visible horizontal world for short screens instead of shrinking a fixed 16:9 postcard.
  // Vertical gameplay coordinates, floor contact, actor proportions and collision geometry stay unchanged.
  const camera = Math.max(0, Math.min(Math.max(0, 4800 - viewportWidth), s.player.x - viewportWidth * .4));
  // One cover panorama keeps the moon and skyline unique; only its bounded overscan can scroll.
  // A high focal point retains the sky on wide screens. The ground strip remains independently tiled.
  const bg = bank.background, overscan = Math.min(160, viewportWidth * .12);
  const scale = Math.max((viewportWidth + overscan) / bg.naturalWidth, 438 / 770);
  const width = bg.naturalWidth * scale, height = 770 * scale;
  const travel = camera / Math.max(1, 4800 - viewportWidth);
  ctx.drawImage(bg, 0, 0, bg.naturalWidth, 770, -(width - viewportWidth) * travel, -(height - 438) * .15, width, height);
  for (let x = -camera % 700 - 700; x < viewportWidth; x += 700) ctx.drawImage(bg, 0, 770, bg.naturalWidth, bg.naturalHeight - 770, x, 438, 700, 102);
  ctx.translate(-camera, 0);
  // Derelict machine walls stay behind the walkable strip. Native hulls never sit on the canopy route.
  ctx.drawImage(bank.machinery, 1960, 200, 690, 233); ctx.drawImage(bank.machinery, 4310, 251, 380, 182);
  for (const platform of GAME_RESERVE_V66_PLATFORMS) {
    const image = platform.x >= 1700 && platform.x < 3000 ? bank.industrialPlatform : bank.branch;
    ctx.drawImage(image, platform.x, platform.y - 3, platform.w, Math.min(115, platform.w * image.naturalHeight / image.naturalWidth));
    ctx.strokeStyle = "#a9c68988"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(platform.x + 8, platform.y); ctx.lineTo(platform.x + platform.w - 8, platform.y); ctx.stroke();
  }
  for (const track of s.tracks) {
    ctx.globalAlpha = Math.max(.15, 1 - (s.tick - track.tick) / 2400); ctx.fillStyle = "#c6bb83";
    ctx.beginPath(); ctx.ellipse(track.x - 3, 444, 4, 1.7, -.3 * track.direction, 0, Math.PI * 2); ctx.ellipse(track.x + 5, 448, 4, 1.7, -.3 * track.direction, 0, Math.PI * 2); ctx.fill();
  } ctx.globalAlpha = 1;
  s.supplies.forEach((count, n) => { if (count) componentMarker(ctx, GAME_RESERVE_V66_SUPPLIES[n], 437, count); });
  for (let n = 0; n < s.ships.length; n++) {
    const ship = s.ships[n], definition = GAME_RESERVE_V66_SHIPS[n], elapsed = ship.departedAt === null ? 0 : s.tick - ship.departedAt;
    if (elapsed < 150) {
      const lift = ship.departedAt !== null ? Math.min(600, elapsed * 3.5) : ship.launch !== null && !reducedMotion ? Math.sin(s.tick / 8) * 1.4 : 0;
      // Measured native alpha rectangle; a 3/4 side cutout is retained without distorting its perspective.
      ctx.drawImage(bank.ship, 152, 146, 1385, 525, definition.x - 195 + elapsed * 1.5, 435 - 149 - lift, 392, 149);
    }
    const status = ship.departedAt !== null ? "Parti" : ship.launch !== null ? "Départ " + Math.max(0, 15 - Math.floor((s.tick - ship.launch) / 60)) + " s" : "Pièces " + Math.min(3, ship.parts) + "/3 · réparation " + Math.floor(ship.repair / 36) + " %";
    label(ctx, definition.name, definition.x, 242); label(ctx, status, definition.x, 266, ship.launch !== null ? "#ffc276" : "#b8d3c2");
    if (ship.departedAt === null) { ctx.strokeStyle = "#7cbcaf"; ctx.strokeRect(definition.x - 25, 399, 50, 39); label(ctx, "Accès", definition.x, 459); }
  }
  for (let n = 0; n < s.humans.length; n++) {
    const h = s.humans[n]; if (h.status === "boarded" || h.status === "escaped") continue;
    const definition = GAME_RESERVE_V66_PEOPLE[n], source = bank[definition.art];
    const cell = h.status === "down" ? 5 : h.windup > 0 ? 3 : h.moving ? 1 + Math.floor(s.tick / 10) % 2 : 0;
    drawActorContactShadow(ctx, h.x, 438, h.status === "down" ? 34 : 13, 0, .85);
    ctx.save(); ctx.translate(h.x, 438); ctx.scale(h.facing, 1); ctx.globalAlpha = h.secured ? .52 : 1;
    ctx.drawImage(source, cell * 256, 0, 256, 192, -67, -98, 134, 101); ctx.restore();
    if (h.carrying) componentMarker(ctx, h.x - h.facing * 19, h.status === "down" ? 436 : 379);
    if (h.status === "active") {
      label(ctx, h.identified ? definition.name : "Combattant armé", h.x, 329, h.alertUntil > s.tick ? "#f8b495" : "#e9efd4");
      if (h.windup > 0) { ctx.fillStyle = "#ffab69"; ctx.beginPath(); ctx.moveTo(h.x, 292); ctx.lineTo(h.x - 7, 307); ctx.lineTo(h.x + 7, 307); ctx.closePath(); ctx.fill(); }
      if (h.scan > 0 && !h.identified) { ctx.fillStyle = "#76e2d0"; ctx.fillRect(h.x - 25, 311, h.scan / 90 * 50, 3); }
    } else label(ctx, h.secured ? "Prise sécurisée" : "Prélèvement possible", h.x, 404, "#dac29f");
  }
  const p = s.player, floor = GAME_RESERVE_V66_PLATFORMS.find(a => p.x >= a.x && p.x <= a.x + a.w && a.y >= p.y)?.y ?? 438;
  drawActorContactShadow(ctx, p.x, floor, 18, floor - p.y);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.globalAlpha = p.cloak ? .34 : 1;
  ctx.drawImage(bank.hunter, 308, 56, 667, 1013, -41, -124, 82, 124); ctx.restore();
  for (const b of s.projectiles) { ctx.strokeStyle = b.owner === "hunter" ? "#8ee9ff" : "#ffd990"; ctx.lineWidth = b.owner === "hunter" ? 4 : 2; ctx.beginPath(); ctx.moveTo(b.x - b.vx * 1.6, b.y - b.vy * 1.6); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const cover of GAME_RESERVE_V66_COVER) { ctx.globalAlpha = p.x > cover.x - 30 && p.x < cover.x + cover.w + 30 ? .5 : .85; ctx.drawImage(bank.ferns, cover.x - 12, cover.top, cover.w + 24, 438 - cover.top + 7); } ctx.globalAlpha = 1;
  label(ctx, "EXTRACTION · maintenir Interagir", 150, 294, "#b9e5c0");
  ctx.strokeStyle = "#b9e5c0"; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(65, 441); ctx.lineTo(165, 441); ctx.stroke(); ctx.setLineDash([]);
  const interaction = gameReserveV66Interaction(s);
  if (interaction.kind !== "none") label(ctx, interaction.kind === "return" ? "Maintenir : rentrer" : interaction.kind === "trophy" ? "Maintenir : prélever (3 s)" : "Maintenir : saboter (1,5 s)", p.x, Math.min(p.y + 29, 483), "#f8d793");
  if (s.channel.ticks) { ctx.fillStyle = "#13261ee8"; ctx.fillRect(p.x - 42, p.y - 143, 84, 8); ctx.fillStyle = "#cfdd94"; ctx.fillRect(p.x - 42, p.y - 143, 84 * s.channel.ticks / (s.channel.kind === "return" ? 60 : s.channel.kind === "trophy" ? 180 : 90), 8); }
  ctx.restore();
  // Topographic line shows geography and the player's position only, never unseen prey positions.
  const mapWidth = Math.min(380, viewportWidth - 36), mapLeft = (viewportWidth - mapWidth) / 2;
  ctx.save(); ctx.fillStyle = "#071713d9"; ctx.fillRect(mapLeft - 12, 505, mapWidth + 24, 29); ctx.strokeStyle = "#769384"; ctx.beginPath(); ctx.moveTo(mapLeft, 520); ctx.lineTo(mapLeft + mapWidth, 520); ctx.stroke();
  for (let n = 0; n < 4; n++) { ctx.beginPath(); ctx.moveTo(mapLeft + n * mapWidth / 3, 515); ctx.lineTo(mapLeft + n * mapWidth / 3, 525); ctx.stroke(); }
  ctx.fillStyle = "#dddfad"; ctx.beginPath(); ctx.arc(mapLeft + p.x / 4800 * mapWidth, 520, 4, 0, Math.PI * 2); ctx.fill(); ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(gameReserveV66Sector(p.x).name, viewportWidth / 2, 496); ctx.restore();
}
