"use client";

import { useId, type CSSProperties } from "react";
import type { MissionId } from "./types";
import { explorationMapSnapshot } from "./systems/explorationMap";

export interface ExplorationMapProps {
  missionId: MissionId;
  playerX: number;
  visitedScreenIds: readonly string[];
  objectiveLabel?: string;
}

const panelStyle: CSSProperties = {
  margin: "16px 0", padding: "14px", border: "1px solid #45635b",
  borderRadius: 12, background: "#081a19", color: "#e2f4ec", textAlign: "left",
};

/** Read-only biomask chart of the actual six-sector mission, without invented gates. */
export function ExplorationMap({
  missionId, playerX, visitedScreenIds, objectiveLabel,
}: ExplorationMapProps) {
  const titleId = useId();
  const map = explorationMapSnapshot(missionId, playerX, visitedScreenIds);
  const chartWidth = 720;
  const inset = 12;
  const span = chartWidth - inset * 2;
  return (
    <section aria-labelledby={titleId} style={panelStyle} data-exploration-map={missionId}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 16 }}>Carte de chasse</h3>
        <span style={{ color: "#aad8c4", fontSize: 13 }}>
          {map.visitedCount}/{map.totalCount} secteurs · {map.percent} %
        </span>
      </div>
      <progress
        aria-label="Secteurs explorés"
        value={map.visitedCount}
        max={map.totalCount}
        style={{ width: "100%", height: 5, accentColor: "#7bf2b2", marginTop: 8 }}
      />
      <svg
        viewBox={`0 0 ${chartWidth} 88`}
        aria-hidden="true"
        focusable="false"
        style={{ width: "100%", display: "block", overflow: "visible" }}
      >
        {map.rooms.map((room) => {
          const x = inset + room.startRatio * span + 3;
          const width = (room.endRatio - room.startRatio) * span - 6;
          return (
            <g key={room.id} data-map-visited={room.visited ? "true" : "false"}>
              <rect
                x={x} y={28} width={width} height={38} rx={5}
                fill={room.current ? "#285f49" : room.visited ? "#17372e" : "#122124"}
                stroke={room.current ? "#c6ffe0" : room.visited ? "#6ba98b" : "#617074"}
                strokeWidth={room.current ? 2 : 1}
                strokeDasharray={room.visited ? undefined : "4 4"}
              />
              <text x={x + width / 2} y={52} fill="#e2f4ec" fontSize={17} textAnchor="middle">
                {room.visited ? room.order + 1 : "?"}
              </text>
            </g>
          );
        })}
        {map.connections.map((connection) => (
          <line
            key={connection.id}
            data-map-connection={connection.id}
            x1={inset + connection.positionRatio * span - 4}
            x2={inset + connection.positionRatio * span + 4}
            y1={47} y2={47}
            stroke={connection.explored ? "#b5ebca" : "#87998f"}
            strokeWidth={3}
            strokeDasharray={connection.explored ? undefined : "2 2"}
          />
        ))}
        <path
          d={`M ${inset + map.playerRatio * span} 25 l -6 -10 h 12 Z`}
          fill="#fff0a1" stroke="#fff6d2" strokeWidth={1}
        />
      </svg>
      <p style={{ margin: "0 0 8px", fontSize: 13 }}>
        <strong style={{ color: "#fff0a1" }}>Position : </strong>{map.currentScreenLabel}
      </p>
      <ol style={{ margin: 0, paddingLeft: 22, fontSize: 12, lineHeight: 1.5 }}>
        {map.rooms.map((room) => (
          <li key={room.id} aria-current={room.current ? "location" : undefined}>
            {room.label ?? "Secteur inexploré"}{room.current ? " · vous êtes ici" : ""}
          </li>
        ))}
      </ol>
      {objectiveLabel && (
        <p style={{ margin: "10px 0 0", fontSize: 13 }}>
          <strong>Objectif actif : </strong>{objectiveLabel}
        </p>
      )}
      <p style={{ margin: "10px 0 0", color: "#afc8bc", fontSize: 11 }}>
        Les noms se révèlent à la visite. La carte ne permet pas de se téléporter.
      </p>
    </section>
  );
}
