import {
  YOUTH_WORKSHOP_REPORT, YOUTH_WORKSHOP_SURFACES, workshopSightBlocked, workshopTarget,
  type YouthWorkshop,
} from "./systems/youthWorkshopV174";
import type { YouthActor } from "./systems/youthTraining";

type Attempt = NonNullable<YouthWorkshop["active"]>;
type WorkshopProp = (kind: "trainingTarget" | "bladeRack" | "maskPedestal" | "marker", x: number, y: number, height: number) => void;
const floor = 430;

export function drawYouthWorkshopV174(ctx: CanvasRenderingContext2D, a: Attempt, player: YouthActor,
    tick: number, reducedMotion: boolean, prop: WorkshopProp) {
  const phase = tick - a.stageAt;
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 3) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  const disc = (x: number, y: number, radius: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2); ctx.fill();
  };
  const label = (x: number, y: number, text: string, color = "#ffe2a8") => {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#1f170f"; ctx.lineWidth = 4; ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center"; ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
  };
  const board = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = "#211d19"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    line(x + w / 2, y + h, x + w / 2, floor, "#81715c", 5);
  };
  ctx.save();
  if (a.lesson === 0) {
    prop("maskPedestal", 196, floor, 100);
    if (a.stage < 3) {
      const target = workshopTarget(a, tick);
      line(350, 362, 438, 362, "#826c53", 4);
      disc(target.x, target.y, 19, "#d5924d");
      if (a.stage === 2) { ctx.strokeStyle = "#f5df93"; ctx.lineWidth = 3; ctx.strokeRect(375, 324, 38, 55); }
    } else {
      const colors = ["#829391", "#4d9aab", "#dd8739", "#63956b"];
      for (const [index, surface] of YOUTH_WORKSHOP_SURFACES.entries()) {
        const x = surface.x, signal = colors[index];
        board(x - 38, 323, 76, 66, signal);
        const width = index === 0 ? 18 : index === 1 ? 51 : index === 2 ? 43 : 28;
        ctx.globalAlpha = a.route === "wide" ? .76 : .48;
        ctx.fillStyle = signal; ctx.fillRect(x - width / 2, 340, width, 24 + index * 4);
        ctx.globalAlpha = 1;
        label(x, 314, surface.label);
      }
    }
  }
  if (a.lesson === 1) {
    prop("trainingTarget", 550, floor, 103);
    for (const [x, name] of [[414, "repli"], [480, "portée"], [547, "contact"]] as const) {
      line(x - 17, floor - 2, x + 17, floor - 2, "#c9965d"); label(x, 461, name);
    }
    const color = a.stage === 2 && phase >= 8 ? "#ff795e" : "#ae9275";
    line(552, 343, a.stage === 2 ? 446 : 515, a.stage === 2 ? 363 : 387, color, 8);
    board(695, 274, 47, 30, a.equipped ? "#d87962" : "#a8be80");
    label(718, 258, "Passage étroit");
    if (a.equipped) line(player.x, player.y - 65, player.x + 38 * player.facing, player.y - 73, "#d4d5c8", 4);
  }
  if (a.lesson === 2) {
    ctx.fillStyle = "#43798699"; ctx.fillRect(302, floor - 8, 102, 11);
    for (let row = 0; row < 3; row++) {
      const motion = reducedMotion ? 0 : Math.sin((tick + row * 12) / 11) * 7;
      line(310 + row * 9 + motion, floor - 6 + row * 3, 395 - row * 10, floor - 6 + row * 3, "#a0d2c7", 1);
    }
    board(428, 332, 72, 55, "#69bbad");
    for (let mark = 0; mark < (a.stage >= 1 ? 4 : 0); mark++) {
      ctx.strokeStyle = "#9ce6d3"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(448 + mark * 10, 355 + mark % 2 * 8, 11, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    label(464, 321, "Écran des traces");
    board(510, 372, 34, 58, "#94816b");
    disc(527, 360, 7, a.route === "wait" && phase < 42 ? "#f4a25c" : "#9fcc91");
    for (let stone = 0; stone < 7; stone++) {
      disc(570 + stone * 12, 424 - stone % 2 * 3, 5, "#a3a299");
    }
    for (let leaf = 0; leaf < 12; leaf++) {
      line(656 + leaf * 7, 426, 660 + leaf * 7, 420 - leaf % 3 * 3, "#a59a59", 3);
    }
    label(609, 451, "Pierres"); label(705, 451, "Feuilles");
  }
  if (a.lesson === 3 || a.lesson === 4) {
    const target = workshopTarget(a, tick);
    const radius = a.lesson === 4 ? [24, 15, 11][Math.min(2, Math.floor(a.stage / 2))] : 19;
    line(a.lesson === 3 ? 618 : 754, a.lesson === 3 ? target.y : 282,
      a.lesson === 3 ? 700 : 754, a.lesson === 3 ? target.y : 400, "#8e7661", 4);
    disc(target.x, target.y, radius, "#d29e59"); disc(target.x, target.y, Math.max(4, radius / 3), "#272521");
    if (a.lesson === 3) {
      prop("bladeRack", 180, floor, 110);
      if (a.equipped) line(player.x - 25, player.y - 85, player.x + 43, player.y - 58, "#d5c4a7", 4);
    } else if (a.stage < 6 && a.stage % 2 === 0 && player.x < 744) {
      ctx.setLineDash([8, 6]);
      line(player.x, player.y - 74, target.x, target.y, workshopSightBlocked(a, player, tick) ? "#ff8d77" : "#a3e8d3", 2);
      ctx.setLineDash([]);
    }
  }
  if (a.lesson === 5) {
    for (const x of [439, 520, 642]) prop("marker", x, floor, 19);
    line(626, 414, 804, 414, "#83d6a4", 4); label(720, 401, "Passage de l’allié", "#afe0ae");
    line(321, 389, 598, 389, "#d39e68", 3);
    const x = a.stage === 2 ? Math.min(a.tool?.x ?? 598, 322 + phase * 3) : 322;
    disc(x, 387, 13, "#be8a52");
    if (a.tool) {
      ctx.strokeStyle = a.notice === "ally" ? "#e18265" : a.equipped ? "#f0b86d" : "#aac6ac";
      ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(a.tool.x, floor - 2, 36, 10, 0, 0, Math.PI * 2); ctx.stroke();
      disc(a.tool.x, 420, 9, a.tool.hit ? "#cf9a75" : "#b7b5a0");
    }
  } else if (a.tool) {
    line(a.tool.x - 23, a.tool.y + 7, a.tool.x + 16, a.tool.y - 6, "#e7d2af", 4);
    if (!a.tool.flying) label(a.tool.x, a.tool.y - 26, "Récupérer");
  }
  if (a.stage === [8, 4, 4, 5, 6, 5][a.lesson]) {
    board(YOUTH_WORKSHOP_REPORT - 17, 356, 34, 38, "#b9d692");
    label(YOUTH_WORKSHOP_REPORT, 341, "Consigner");
  }
  ctx.restore();
}
