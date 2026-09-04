"use client";

import { useId, type CSSProperties } from "react";
import type { ExplorationProgress, MissionId } from "./types";
import {
  EXPANSION_EXPLORATION_SPECS,
  expansionRegionMapSnapshot,
  type ExpansionExplorationMissionId,
} from "./systems/expansionExplorationRegions";

export interface ExpansionExplorationMapProps {
  missionId: ExpansionExplorationMissionId;
  progress: ExplorationProgress;
  /** Runtime coordinates of the centre of the player's body. */
  playerX: number;
  playerY: number;
}

const panelStyle: CSSProperties = {
  margin: "8px 0",
  padding: "10px 12px",
  border: "1px solid #6b7151",
  borderRadius: 10,
  background: "#151912",
  color: "#edf0dc",
  textAlign: "left",
};

const roomBoxes = [
  { x: 20, y: 112, width: 150, height: 38 },
  { x: 200, y: 24, width: 150, height: 38 },
  { x: 390, y: 24, width: 160, height: 38 },
  { x: 580, y: 112, width: 120, height: 38 },
] as const;

const connections = [
  { from: 0, to: 1, path: "M95 112 V82 H275 V62", lock: 0 },
  { from: 1, to: 2, path: "M350 43 H390", lock: 0 },
  { from: 2, to: 3, path: "M550 43 H640 V112", lock: 1 },
  { from: 3, to: 0, path: "M640 150 V172 H95 V150", lock: 1 },
] as const;

const MISSION_LABELS: Readonly<Record<MissionId, string>> = {
  "jungle-vey": "Jungle d’Osiris",
  "ice-cryostalker": "Banquise de Nivalis",
  "volcano-bad-blood": "Volcan de Cinder",
  "swamp-hydra": "Marais de Naraka",
  "desert-sandmaw": "Désert de Serekh",
  "ocean-leviathan": "Océan de Pelagos",
  "fungal-hivemind": "Monde fongique de Mycora",
  "ruins-ancient-guardian": "Ruines d’Acheron",
};

/** Read-only local map; it reveals no room, trophy or Apex trace before discovery. */
export function ExpansionExplorationMap({
  missionId,
  progress,
  playerX,
  playerY,
}: ExpansionExplorationMapProps) {
  const titleId = useId();
  const snapshot = expansionRegionMapSnapshot(
    missionId,
    progress,
    playerX,
    playerY,
  );
  if (!snapshot) return null;
  const spec = EXPANSION_EXPLORATION_SPECS[missionId];
  const discoveredCount = snapshot.rooms.filter((room) => room.discovered).length;
  return (
    <section
      aria-labelledby={titleId}
      data-expansion-exploration-map={missionId}
      style={panelStyle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 14 }}>{snapshot.title}</h3>
        <span style={{ fontSize: 12, color: "#cbd29f" }}>
          {discoveredCount}/{snapshot.rooms.length} salles
        </span>
      </div>
      <svg
        viewBox="0 0 720 184"
        aria-hidden="true"
        focusable="false"
        style={{ width: "100%", maxHeight: 154, display: "block" }}
      >
        <text x={20} y={46} fill="#aeb78e" fontSize={12}>Branche</text>
        <text x={20} y={100} fill="#aeb78e" fontSize={12}>Route principale</text>
        {connections.map((connection, index) => {
          const from = snapshot.rooms[connection.from];
          const to = snapshot.rooms[connection.to];
          if (!from.discovered && !to.discovered) return null;
          const lock = snapshot.locks[connection.lock];
          const explored = from.discovered && to.discovered;
          return (
            <g key={connection.path} data-expansion-connection={index}>
              <path
                d={connection.path}
                fill="none"
                stroke={lock.opened ? "#a8d27a" : "#ddad62"}
                strokeWidth={2}
                strokeDasharray={lock.opened && explored ? undefined : "4 4"}
              />
              <title>{`${lock.label} — ${lock.opened ? "ouvert" : "fermé"}`}</title>
            </g>
          );
        })}
        {snapshot.rooms.map((room, index) => {
          const box = roomBoxes[index];
          return (
            <g key={room.id} data-expansion-room={index} data-discovered={room.discovered ? "true" : "false"}>
              <rect
                {...box}
                rx={5}
                fill={room.current ? "#50652f" : room.discovered ? "#29381f" : "#20261d"}
                stroke={room.current ? "#efffc8" : room.discovered ? "#91aa68" : "#626d57"}
                strokeWidth={room.current ? 2 : 1}
                strokeDasharray={room.discovered ? undefined : "4 4"}
              />
              <text
                x={box.x + box.width / 2}
                y={box.y + 24}
                fill="#edf0dc"
                fontSize={12}
                textAnchor="middle"
              >
                {room.label ?? "?"}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ margin: "0 0 4px", fontSize: 12 }}>
        <strong style={{ color: "#efffb2" }}>Objectif : </strong>{snapshot.objective}
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 11, lineHeight: 1.4 }}>
        <strong>Capacité : </strong>{snapshot.reminder} · <strong>Danger : </strong>{snapshot.danger}
      </p>
      <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 11, lineHeight: 1.4 }}>
        {snapshot.locks.map((lock) => (
          <li key={lock.id}>
            {lock.label} — {lock.opened ? "ouvert" : "fermé"} · origine : {MISSION_LABELS[lock.originMissionId]}
          </li>
        ))}
      </ul>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#cad0ae" }}>
        <strong>Trophée : </strong>{snapshot.secret.label ?? "signature inconnue"}
        {snapshot.secret.recovered ? " · récupéré" : ""}
        {snapshot.apexTrace ? ` · Trace Apex : ${snapshot.apexTrace}` : ""}
      </p>
      <ul style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", listStyle: "none" }}>
        {snapshot.rooms.map((room) => (
          <li key={room.id} aria-current={room.current ? "location" : undefined}>
            {room.label ?? "Salle inconnue"}{room.current ? " — vous êtes ici" : ""}
          </li>
        ))}
      </ul>
      <span hidden data-expansion-route={spec.routeId}>{spec.routeId}</span>
    </section>
  );
}
