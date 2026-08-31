"use client";

import { useId } from "react";
import type { ExplorationProgress } from "./types";
import { normalizeExplorationProgress } from "./systems/explorationProgress";
import { ICE_HATCH_ID, ICE_RELAY_ID, ICE_ROOMS, iceRoomAt } from "./systems/iceExplorationRegion";

export interface IceExplorationMapProps {
  progress: ExplorationProgress;
  /** Runtime coordinates of the centre of the player's body. */
  playerX: number;
  playerY: number;
}
const boxes = [
  { x: 22, y: 142, width: 140, height: 36 },
  { x: 200, y: 88, width: 120, height: 90 },
  { x: 345, y: 16, width: 150, height: 36 },
  { x: 525, y: 88, width: 155, height: 36 },
  { x: 525, y: 142, width: 155, height: 36 },
] as const;
const edges = [
  { from: 0, to: 1, path: "M162 160 H200", lock: null, x: 181, y: 160 },
  { from: 1, to: 2, path: "M260 88 V34 H345", lock: "boost", x: 260, y: 64 },
  { from: 2, to: 3, path: "M495 34 H603 V88", lock: "relay", x: 548, y: 34 },
  { from: 3, to: 4, path: "M603 124 V142", lock: "hatch", x: 603, y: 133 },
  { from: 4, to: 0, path: "M603 178 V193 H92 V178", lock: null, x: 360, y: 193 },
] as const;

/** The mine climbs, crosses a powered bridge, then drops into a separate return shaft. */
export function IceExplorationMap({ progress, playerX, playerY }: IceExplorationMapProps) {
  const titleId = useId();
  const state = normalizeExplorationProgress(progress);
  const current = iceRoomAt(playerX, playerY);
  const discovered = new Set(state.discoveredRoomIds);
  if (current) discovered.add(current.id);
  const visited = ICE_ROOMS.map(room => discovered.has(room.id));
  const boost = state.abilityIds.includes("aerial-boost");
  const relay = state.openedGateIds.includes(ICE_RELAY_ID);
  const hatch = state.openedGateIds.includes(ICE_HATCH_ID);
  const index = ICE_ROOMS.findIndex(room => room.id === current?.id);
  const box = index >= 0 ? boxes[index] : null;
  const ratioX = current ? Math.min(1, Math.max(0, (playerX - current.x) / current.width)) : 0;
  const ratioY = current ? Math.min(1, Math.max(0, (playerY - current.y) / current.height)) : 0;
  const status = [
    visited[0] || visited[1] ? (boost ? "Impulsion disponible" : "Impulsion de la jungle requise") : null,
    visited[2] || visited[3] ? (relay ? "Relais alimenté · pont déployé" : "Relais à alimenter en hauteur") : null,
    visited[4] ? (hatch ? "Échelle ouverte dans les deux sens" : "Trappe commandée depuis le haut") : null,
  ].filter(Boolean);
  return (
    <section aria-labelledby={titleId} data-ice-exploration-map="ice-cryostalker" style={{ margin: "8px 0", padding: "10px 12px", border: "1px solid #416b80", borderRadius: 10, background: "#0a1b28", color: "#e0f3f7", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 14 }}>Boucle minière</h3>
        <span style={{ fontSize: 12, color: "#aed3df" }}>{visited.filter(Boolean).length}/{ICE_ROOMS.length} salles</span>
      </div>
      <svg viewBox="0 0 720 204" aria-hidden="true" focusable="false" style={{ width: "100%", maxHeight: 160, display: "block" }}>
        <text x={22} y={34} fill="#90b4c5" fontSize={12}>Relais haut</text>
        <text x={22} y={107} fill="#90b4c5" fontSize={12}>Palier</text>
        {edges.map((edge, i) => {
          if (!visited[edge.from] && !visited[edge.to]) return null;
          const open = edge.lock === "boost" ? boost : edge.lock === "relay" ? relay : edge.lock === "hatch" ? hatch : true;
          return <g key={i} data-ice-connection={i}>
            <path d={edge.path} fill="none" stroke={open ? "#83cadb" : "#d7b06c"} strokeWidth={2} strokeDasharray={open && visited[edge.from] && visited[edge.to] ? undefined : "4 4"} />
            {edge.lock && <rect x={edge.x - 4} y={edge.y - 5} width={8} height={10} fill={open ? "#244c5b" : "#cba363"} stroke={open ? "#9cdeeb" : "#efd398"} />}
          </g>;
        })}
        {ICE_ROOMS.map((room, i) => {
          const cell = boxes[i];
          const active = room.id === current?.id;
          return <g key={room.id} data-ice-room={i} data-ice-visited={visited[i] ? "true" : "false"}>
            <rect {...cell} rx={5} fill={active ? "#254e64" : visited[i] ? "#183345" : "#10212c"} stroke={active ? "#d3f6ff" : visited[i] ? "#73acc2" : "#4e6874"} strokeWidth={active ? 2 : 1} strokeDasharray={visited[i] ? undefined : "4 4"} />
            <text x={cell.x + cell.width / 2} y={cell.y + cell.height / 2 + 4} fill="#e0f3f7" fontSize={12} textAnchor="middle">{visited[i] ? room.label : "?"}</text>
          </g>;
        })}
        {box && <circle data-ice-player={index} cx={box.x + 7 + ratioX * (box.width - 14)} cy={box.y + 5 + ratioY * (box.height - 10)} r={4} fill="#fff0ab" stroke="#fff9db" strokeWidth={1} />}
      </svg>
      <p style={{ margin: "0 0 4px", fontSize: 12 }}><strong style={{ color: "#fff0ab" }}>Position : </strong>{current?.label ?? "Chemin de chasse, hors de la boucle"}</p>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: "#bbd3de" }}>{status.length ? status.join(" · ") : "Les salles et leurs accès se révèlent à la visite."}</p>
      <ul style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", listStyle: "none" }}>
        {ICE_ROOMS.map((room, i) => <li key={room.id} aria-current={room.id === current?.id ? "location" : undefined}>{visited[i] ? room.label : "Salle inconnue"}{room.id === current?.id ? " — vous êtes ici" : ""}</li>)}
      </ul>
    </section>
  );
}
