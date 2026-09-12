"use client";

import { useId, type CSSProperties } from "react";
import type { ExplorationProgress } from "./types";
import { normalizeExplorationProgress } from "./systems/explorationProgress";
import {
  OSERIS_ROOM_CONNECTIONS,
  PILOT_ABILITY_ID,
  PILOT_HATCH_ID,
  PILOT_ROOMS,
  PILOT_SEAL_ID,
  pilotRoomAt,
} from "./systems/metroidvaniaPilot";

export interface PilotExplorationMapProps {
  progress: ExplorationProgress;
  /** World coordinates of the player's body centre. */
  playerX: number;
  playerY: number;
}

const panelStyle: CSSProperties = {
  margin: "8px 0",
  padding: "10px 12px",
  color: "#e1f1e8",
  textAlign: "left",
  background: "#091b19",
  border: "1px solid #426857",
  borderRadius: 10,
};

function gateOpen(gate: (typeof OSERIS_ROOM_CONNECTIONS)[number]["gate"], state: ExplorationProgress): boolean {
  if (gate === "ability") return state.abilityIds.includes(PILOT_ABILITY_ID);
  if (gate === "seal") return state.openedGateIds.includes(PILOT_SEAL_ID);
  if (gate === "hatch") return state.openedGateIds.includes(PILOT_HATCH_ID);
  return true;
}

/** Data-driven schematic of the real Oseris room graph; it never teleports. */
export function PilotExplorationMap({ progress, playerX, playerY }: PilotExplorationMapProps) {
  const titleId = useId();
  const state = normalizeExplorationProgress(progress);
  const currentRoom = pilotRoomAt(playerX, playerY);
  const visitedIds = new Set(state.discoveredRoomIds);
  if (currentRoom) visitedIds.add(currentRoom.id);
  const visited = PILOT_ROOMS.map((room) => visitedIds.has(room.id));
  const currentIndex = PILOT_ROOMS.findIndex((room) => room.id === currentRoom?.id);
  const currentBox = currentIndex >= 0 ? PILOT_ROOMS[currentIndex].mapBox : null;
  const playerRatio = currentRoom
    ? Math.min(1, Math.max(0, (playerX - currentRoom.x) / currentRoom.width))
    : 0;
  const seen = (id: string) => visitedIds.has(id);
  const statuses = [
    seen("jungle-pilot-approach") || seen("jungle-pilot-gallery") || seen("jungle-pilot-canopy-west")
      ? `Canopée : ${state.abilityIds.includes(PILOT_ABILITY_ID) ? "réseau d’impulsion accessible" : "module requis"}`
      : null,
    seen("jungle-pilot-gallery") || seen("jungle-pilot-archive")
      ? `Sceau ${state.openedGateIds.includes(PILOT_SEAL_ID) ? "ouvert" : "fermé"}`
      : null,
    seen("jungle-pilot-descent") || seen("jungle-pilot-underpass")
      ? `Trappe ${state.openedGateIds.includes(PILOT_HATCH_ID) ? "ouverte, corde disponible" : "fermée, commande en haut"}`
      : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby={titleId} style={panelStyle} data-pilot-map="jungle-vey">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 14 }}>Oseris IV · réseau de salles</h3>
        <span style={{ color: "#afd8bf", fontSize: 12 }}>{visited.filter(Boolean).length}/{PILOT_ROOMS.length} salles</span>
      </div>
      <svg viewBox="0 0 1000 250" aria-hidden="true" focusable="false" style={{ display: "block", width: "100%", maxHeight: 190 }}>
        <text x={14} y={48} fill="#97b6a5" fontSize={11}>Canopée</text>
        <text x={14} y={126} fill="#97b6a5" fontSize={11}>Ruines</text>
        <text x={14} y={192} fill="#97b6a5" fontSize={11}>Sol</text>
        <text x={540} y={238} fill="#97b6a5" fontSize={11}>Grottes</text>
        {OSERIS_ROOM_CONNECTIONS.map((connection) => {
          const fromIndex = PILOT_ROOMS.findIndex(({ id }) => id === connection.from);
          const toIndex = PILOT_ROOMS.findIndex(({ id }) => id === connection.to);
          if (fromIndex < 0 || toIndex < 0 || (!visited[fromIndex] && !visited[toIndex])) return null;
          const from = PILOT_ROOMS[fromIndex].mapBox;
          const to = PILOT_ROOMS[toIndex].mapBox;
          const fromX = from.x + from.width / 2;
          const fromY = from.y + 18;
          const toX = to.x + to.width / 2;
          const toY = to.y + 18;
          const middleX = (fromX + toX) / 2;
          const middleY = (fromY + toY) / 2;
          const open = gateOpen(connection.gate, state);
          return <g key={connection.id} data-pilot-connection={connection.id}>
            <path
              d={`M${fromX} ${fromY} C${middleX} ${fromY},${middleX} ${toY},${toX} ${toY}`}
              fill="none"
              stroke={open ? "#89cbaa" : "#ebbf79"}
              strokeWidth={connection.shortcut ? 3 : 2}
              strokeDasharray={open && visited[fromIndex] && visited[toIndex] ? undefined : "4 4"}
            />
            {connection.gate && <rect x={middleX - 4} y={middleY - 5} width={8} height={10}
              fill={open ? "#194a36" : "#cba363"} stroke={open ? "#8dddaf" : "#ffe0a7"} />}
          </g>;
        })}
        {PILOT_ROOMS.map((room, index) => {
          const box = room.mapBox;
          const current = room.id === currentRoom?.id;
          return <g key={room.id} data-pilot-room={index} data-pilot-level={room.level} data-pilot-visited={visited[index] ? "true" : "false"}>
            <rect {...box} height={36} rx={5}
              fill={current ? "#285943" : visited[index] ? "#17372b" : "#112320"}
              stroke={current ? "#d4ffe2" : visited[index] ? "#74b08d" : "#526d65"}
              strokeWidth={current ? 2 : 1}
              strokeDasharray={visited[index] ? undefined : "4 4"} />
            <text x={box.x + box.width / 2} y={box.y + 23} fill="#e1f1e8" fontSize={11} textAnchor="middle">
              {visited[index] ? room.label : "?"}
            </text>
          </g>;
        })}
        {currentBox && <path data-pilot-player={PILOT_ROOMS[currentIndex].level}
          d={`M ${currentBox.x + 8 + playerRatio * (currentBox.width - 16)} ${currentBox.y - 3} l -5 -7 h 10 Z`}
          fill="#fff2ac" stroke="#fff8d8" strokeWidth={1} />}
      </svg>
      <p style={{ margin: "0 0 4px", fontSize: 12 }}><strong style={{ color: "#fff2ac" }}>Position : </strong>{currentRoom?.label ?? "Entre deux salles cartographiées"}</p>
      <p style={{ margin: 0, color: "#c7d6cb", fontSize: 11, lineHeight: 1.4 }}>
        {statuses.length ? statuses.join(" · ") : "Les salles et leurs accès se révèlent à la visite."}
      </p>
      <ul style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", whiteSpace: "nowrap", listStyle: "none", clipPath: "inset(50%)" }}>
        {PILOT_ROOMS.map((room, index) => <li key={room.id} aria-current={room.id === currentRoom?.id ? "location" : undefined}>
          {visited[index] ? room.label : "Salle inconnue"}{room.id === currentRoom?.id ? " — vous êtes ici" : ""}
        </li>)}
      </ul>
    </section>
  );
}
