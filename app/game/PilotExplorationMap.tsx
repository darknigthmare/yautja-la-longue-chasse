"use client";

import { useId, type CSSProperties } from "react";
import type { ExplorationProgress } from "./types";
import { normalizeExplorationProgress } from "./systems/explorationProgress";
import { PILOT_ABILITY_ID, PILOT_HATCH_ID, PILOT_ROOMS, PILOT_SEAL_ID, pilotRoomAt } from "./systems/metroidvaniaPilot";

export interface PilotExplorationMapProps {
  progress: ExplorationProgress;
  /** World coordinates of the player's body centre. */
  playerX: number;
  playerY: number;
}

const panelStyle: CSSProperties = {
  margin: "8px 0", padding: "10px 12px", border: "1px solid #426857", borderRadius: 10,
  background: "#091b19", color: "#e1f1e8", textAlign: "left",
};
const boxes = [
  { x: 20, y: 108, width: 140 }, { x: 202, y: 108, width: 290 }, { x: 536, y: 108, width: 160 },
  { x: 145, y: 20, width: 130 }, { x: 323, y: 20, width: 160 }, { x: 526, y: 20, width: 150 },
] as const;
const edges = [
  { from: 0, to: 1, path: "M160 126 H202", gate: null, x: 181, y: 126 },
  { from: 1, to: 2, path: "M492 126 H536", gate: null, x: 514, y: 126 },
  { from: 0, to: 3, path: "M90 108 V76 H210 V56", gate: "ability", x: 150, y: 76 },
  { from: 3, to: 4, path: "M275 38 H323", gate: "seal", x: 299, y: 38 },
  { from: 4, to: 5, path: "M483 38 H526", gate: null, x: 504, y: 38 },
  { from: 5, to: 1, path: "M600 56 V84 H454 V108", gate: "hatch", x: 550, y: 84 },
] as const;

/** Compact schematic of the real loop; it neither teleports nor reveals unvisited room names. */
export function PilotExplorationMap({ progress, playerX, playerY }: PilotExplorationMapProps) {
  const titleId = useId();
  const state = normalizeExplorationProgress(progress);
  const currentRoom = pilotRoomAt(playerX, playerY);
  const visitedIds = new Set(state.discoveredRoomIds);
  if (currentRoom) visitedIds.add(currentRoom.id);
  const visited = PILOT_ROOMS.map((room) => visitedIds.has(room.id));
  const hasBoost = state.abilityIds.includes(PILOT_ABILITY_ID);
  const sealOpen = state.openedGateIds.includes(PILOT_SEAL_ID);
  const hatchOpen = state.openedGateIds.includes(PILOT_HATCH_ID);
  const currentIndex = PILOT_ROOMS.findIndex((room) => room.id === currentRoom?.id);
  const currentBox = currentIndex >= 0 ? boxes[currentIndex] : null;
  const playerRatio = currentRoom ? Math.min(1, Math.max(0, (playerX - currentRoom.x) / currentRoom.width)) : 0;
  const statuses = [
    visited[0] || visited[3] ? `Accès supérieur : ${hasBoost ? "impulsion installée" : "module requis"}` : null,
    visited[3] || visited[4] ? `Sceau ${sealOpen ? "ouvert" : "fermé"}` : null,
    visited[5] || visited[1] ? `Trappe ${hatchOpen ? "ouverte, corde disponible" : "fermée, commande en haut"}` : null,
  ].filter(Boolean);
  return (
    <section aria-labelledby={titleId} style={panelStyle} data-pilot-map="jungle-vey">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 14 }}>Branche de la canopée</h3>
        <span style={{ fontSize: 12, color: "#afd8bf" }}>{visited.filter(Boolean).length}/{PILOT_ROOMS.length} salles</span>
      </div>
      <svg viewBox="0 0 720 160" aria-hidden="true" focusable="false" style={{ width: "100%", maxHeight: 150, display: "block" }}>
        <text x={20} y={42} fill="#97b6a5" fontSize={12}>Haut</text>
        <text x={20} y={97} fill="#97b6a5" fontSize={12}>Sol</text>
        {edges.map((edge, index) => {
          if (!visited[edge.from] && !visited[edge.to]) return null;
          const open = edge.gate === "ability" ? hasBoost : edge.gate === "seal" ? sealOpen : edge.gate === "hatch" ? hatchOpen : true;
          return (
            <g key={index} data-pilot-connection={index}>
              <path d={edge.path} fill="none" stroke={open ? "#89cbaa" : "#ebbf79"} strokeWidth={2}
                strokeDasharray={open && visited[edge.from] && visited[edge.to] ? undefined : "4 4"} />
              {edge.gate && <rect x={edge.x - 4} y={edge.y - 5} width={8} height={10}
                fill={open ? "#194a36" : "#cba363"} stroke={open ? "#8dddaf" : "#ffe0a7"} />}
            </g>
          );
        })}
        {PILOT_ROOMS.map((room, index) => {
          const box = boxes[index];
          const current = room.id === currentRoom?.id;
          return (
            <g key={room.id} data-pilot-room={index} data-pilot-level={room.level} data-pilot-visited={visited[index] ? "true" : "false"}>
              <rect {...box} height={36} rx={5} fill={current ? "#285943" : visited[index] ? "#17372b" : "#112320"}
                stroke={current ? "#d4ffe2" : visited[index] ? "#74b08d" : "#526d65"} strokeWidth={current ? 2 : 1}
                strokeDasharray={visited[index] ? undefined : "4 4"} />
              <text x={box.x + box.width / 2} y={box.y + 23} fill="#e1f1e8" fontSize={12} textAnchor="middle">
                {visited[index] ? room.label : "?"}
              </text>
            </g>
          );
        })}
        {currentBox && <path data-pilot-player={PILOT_ROOMS[currentIndex].level}
          d={`M ${currentBox.x + 8 + playerRatio * (currentBox.width - 16)} ${currentBox.y - 3} l -5 -7 h 10 Z`}
          fill="#fff2ac" stroke="#fff8d8" strokeWidth={1} />}
      </svg>
      <p style={{ margin: "0 0 4px", fontSize: 12 }}><strong style={{ color: "#fff2ac" }}>Position : </strong>{currentRoom?.label ?? "Hors de cette branche"}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#c7d6cb", lineHeight: 1.4 }}>
        {statuses.length ? statuses.join(" · ") : "Les salles et leurs accès se révèlent à la visite."}
      </p>
      <ul style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", listStyle: "none" }}>
        {PILOT_ROOMS.map((room, index) => <li key={room.id} aria-current={room.id === currentRoom?.id ? "location" : undefined}>
          {visited[index] ? room.label : "Salle inconnue"}{room.id === currentRoom?.id ? " — vous êtes ici" : ""}
        </li>)}
      </ul>
    </section>
  );
}
