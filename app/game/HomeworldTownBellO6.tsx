"use client";

/* The native street, rooms and actor atlases stay owned by Homeworld. */
import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import type { SaveGame } from "./types";
import type { HomeworldActor } from "./systems/homeworldCity";
import { homeworldProjectGroundV64 } from "./systems/homeworldGeometryV64";
import { projectHomeworldWorldV77, type HomeworldLevelV77 } from "./systems/homeworldWorldV77";
import { homeworldSceneDepthV78 } from "./systems/homeworldVisualLayersV78";
import { townBellActionsO6, type TownBellActionO6 } from "./systems/originTownBellO6";
import { townBellGuidePoseO6, townBellSiteO6, TOWN_BELL_MARKS_O6 } from "./systems/originTownBellPlacesO6";
import styles from "./HomeworldTownBellO6.module.css";

interface Props {
  save: SaveGame;
  actor: HomeworldActor;
  level: HomeworldLevelV77;
  interiorId: string | null;
  elevation: number;
  seconds: number;
  reducedMotion: boolean;
}

export default function HomeworldTownBellO6({ save, actor, level, interiorId, elevation, seconds, reducedMotion }: Props) {
  const remaining = townBellActionsO6(save);
  if (!remaining.length) return null;
  const record = save.originV151?.townBellO6;
  const project = (point: { x: number; y: number }) => {
    const placement = interiorId ? homeworldProjectGroundV64(point) : projectHomeworldWorldV77(point, level);
    return { left: placement.x, top: placement.y, zIndex: interiorId ? Math.round(point.y) : homeworldSceneDepthV78(point.y, elevation) };
  };
  const here = (action: TownBellActionO6) => {
    const site = townBellSiteO6(action);
    return site.levelId === level && site.interiorId === interiorId ? site.point : null;
  };
  const guide = townBellGuidePoseO6(save, level, actor, interiorId);
  const forgeGate = record && here("unlatch");
  const forgeBell = record?.journal.some(event => event.action === "deliver") && here("ring");
  const open = record?.journal.some(event => event.action === "unlatch");
  const rung = record?.journal.some(event => event.action === "ring");
  const point = remaining[0] && here(remaining[0]);
  const youth = remaining.filter(action => action === "workshop" || action === "kennel");
  const cohort = record?.race.success
    ? record.race.connected === "harek" ? ["harek", "yena", "tov"] as const : ["yena", "tov", "harek"] as const
    : ["yena", "tov"] as const;
  const names = { yena: "Yena", tov: "Tov", harek: "Harek" };
  return <>
    {guide && <div className={styles.marker} style={project(guide)} data-o6-town-saar>
      <HomeworldCivilianV72 npcId="saar" role="instructor" facing={guide.facing} moving={guide.moving}
        speed={Math.hypot(actor.vx, actor.vy)} seconds={seconds} reducedMotion={reducedMotion} />
      <span className={styles.name}>Saar</span>
    </div>}
    {guide && record && remaining[0] !== "regroup" && cohort.map((who, i) => <div key={who} className={styles.marker}
      style={project({ x: guide.x - (30 + i * 27) * guide.facing, y: guide.y + 18 + i * 7 })}
      data-o6-town-cohort={who}>
      <HomeworldCivilianV72 npcId={who} role="apprentice" height={92} facing={guide.facing} moving={guide.moving}
        speed={Math.hypot(actor.vx, actor.vy)} seconds={seconds} reducedMotion={reducedMotion} />
      <span className={styles.name}>{names[who]}</span>
    </div>)}
    {record?.carriesPiece && <div className={styles.marker} style={project({ x: actor.x + actor.facing * 15, y: actor.y + 1 })}
      data-o6-town-piece>
      <span className={styles.piece} />
    </div>}
    {forgeGate && <div className={styles.marker} style={project(forgeGate)} data-o6-town-gate={open ? "open" : "closed"}>
      <span className={styles.gate} data-open={open ? "true" : "false"} />
    </div>}
    {forgeBell && <div className={styles.marker} style={project(forgeBell)} data-o6-town-bell={rung ? "rung" : "ready"}>
      <span className={styles.bell} data-rung={rung ? "true" : "false"} />
      <span className={styles.rope} />
    </div>}
    {point && !youth.length && <span className={styles.marker} style={project(point)} data-o6-town-waypoint={remaining[0]}>
      <span className={styles.sign}>{TOWN_BELL_MARKS_O6[remaining[0]]}</span>
    </span>}
    {youth.map(action => {
      const station = here(action);
      if (!station) return null;
      const who = action === "workshop" ? "yena" : "tov";
      return <div className={styles.marker} style={project({ x: station.x + 24, y: station.y })} key={who} data-o6-town-companion={who}>
        <HomeworldCivilianV72 npcId={who} role="apprentice" height={92} seconds={seconds} reducedMotion={reducedMotion} />
        <span className={styles.name}>{who === "yena" ? "Yena" : "Tov"}</span>
      </div>;
    })}
  </>;
}
