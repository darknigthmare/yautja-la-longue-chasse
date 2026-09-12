"use client";

/* eslint-disable @next/next/no-img-element -- local transparent game plates and props */

import { memo, type CSSProperties } from "react";
import { shipProfileAssetPath, type ShipId } from "./shipCatalogue";
import type { TrophyRecord } from "./types";
import {
  HOMEWORLD_BUILDINGS,
  HOMEWORLD_DISTRICTS,
  HOMEWORLD_NPCS,
  HOMEWORLD_POINTS,
  HOMEWORLD_PROPS,
  HOMEWORLD_STREETS,
  homeworldNpcPlate,
  homeworldTrophyDisplays,
  polygonCss,
  type HomeworldPoint,
} from "./systems/homeworld";
import styles from "./HomeworldCity.module.css";

const WORLD_ART = "/game/ship-interior/";

function pointArt(point: HomeworldPoint): string {
  if (point.kind === "region") return WORLD_ART + "v21/door-frame.webp";
  if (point.kind === "evidence") {
    return point.evidenceId === "suspect-trophy"
      ? "/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp"
      : WORLD_ART + "v22/archive-terminal.webp";
  }
  const service = String(point.service ?? "");
  if (/forge|workshop|craft|customization/.test(service)) return WORLD_ART + "v22/forge-station.webp";
  if (/med|heal/.test(service)) return WORLD_ART + "v22/medbay-bed.webp";
  if (/armor|market|trade/.test(service)) return WORLD_ART + "v22/armory-rack.webp";
  if (/training|pit/.test(service)) return WORLD_ART + "v22/gantry.webp";
  if (/troph|codex|justice/.test(service)) return WORLD_ART + "v22/archive-terminal.webp";
  return WORLD_ART + "v21/console-navigation.webp";
}

function polygonBounds(points: readonly { x: number; y: number }[]) {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  return { x, y, width, height };
}

const BUILDING_WALLS = {
  hall: "/game/ship-interior/v21/wall-sanctum.webp",
  stall: "/game/ship-interior/v20/corridor-wall.webp",
  forge: "/game/ship-interior/v21/wall-machinery.webp",
  archive: "/game/ship-interior/v21/wall-observatory.webp",
  gate: "/game/ship-interior/v21/wall-machinery.webp",
  tower: "/game/ship-interior/v21/wall-observatory.webp",
} as const;

interface HomeworldCitySceneProps {
  selectedShipId: ShipId;
  activeDoorId: string | null;
  fadedFrontPropIds: string;
  trophies: readonly TrophyRecord[];
}

/** Authored modules remain independent so doors, stations, NPCs and trophies can overlap by depth. */
const HomeworldCityScene = memo(function HomeworldCityScene({ selectedShipId, activeDoorId, fadedFrontPropIds, trophies }: HomeworldCitySceneProps) {
  const trophyDisplays = homeworldTrophyDisplays(trophies);
  const fadedPropIds = new Set(fadedFrontPropIds.split("|").filter(Boolean));
  return <>
    {HOMEWORLD_STREETS.map((street) => {
      const bounds = polygonBounds(street.polygon);
      return <div
        key={street.id}
        className={styles.street}
        data-kind={street.kind}
        title={street.label}
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          clipPath: polygonCss(street.polygon, bounds),
          "--street-accent": street.accent,
        } as CSSProperties}
      />;
    })}
    {HOMEWORLD_DISTRICTS.map((district, index) => <div
      key={district.id}
      className={styles.district}
      data-texture={district.texture}
      style={{
        left: district.x,
        top: district.y,
        width: district.width,
        height: district.height,
        clipPath: polygonCss(district.polygon, district),
        "--district-accent": district.accent,
      } as CSSProperties}
    >
      <div className={styles.districtTexture} />
      <div className={styles.districtName}>
        <span className={styles.districtNumber}>QUARTIER {String(index + 1).padStart(2, "0")}</span>
        {district.name}
      </div>
    </div>)}
    {HOMEWORLD_BUILDINGS.map((building) => {
      const active = activeDoorId === building.id;
      return <div
        key={building.id}
        className={styles.building}
        data-variant={building.variant}
        data-door-active={active}
        style={{
          left: building.x - building.width / 2,
          top: building.y - building.height,
          width: building.width,
          height: building.height,
          zIndex: Math.round(building.y),
          "--building-wall": `url('${BUILDING_WALLS[building.variant]}')`,
        } as CSSProperties}
      >
        <div className={styles.buildingRoof} />
        <div className={styles.buildingFacade} />
        <div className={styles.buildingDoor} data-side={building.doorSide} data-active={active}>
          <i className={styles.buildingDoorLeaf} />
          <img className={styles.buildingDoorFrame} src={WORLD_ART + "v21/door-frame.webp"} alt="" draggable={false} />
          <i className={styles.buildingDoorGlow} />
        </div>
        <span>{building.label}</span>
      </div>;
    })}
    {HOMEWORLD_PROPS.filter(({ plane }) => plane !== "front").map((prop) => <img
      key={prop.id}
      className={styles.decorProp}
      data-plane={prop.plane}
      data-prop-id={prop.id}
      src={prop.asset}
      alt=""
      draggable={false}
      style={{
        left: prop.x - prop.width / 2,
        top: prop.y - prop.height,
        width: prop.width,
        height: prop.height,
        zIndex: Math.round(prop.y) - (prop.plane === "rear" ? 180 : 0),
      }}
    />)}
    {trophyDisplays.map((trophy) => <img
      key={trophy.claimId}
      className={styles.trophyDisplay}
      data-trophy-claim-id={trophy.claimId}
      data-plane={trophy.plane}
      src={trophy.asset}
      title={trophy.label}
      alt=""
      draggable={false}
      style={{
        left: trophy.x,
        top: trophy.y,
        width: trophy.width,
        height: trophy.height,
        zIndex: Math.round(trophy.y) - (trophy.plane === "rear" ? 90 : 0),
      }}
    />)}
    {HOMEWORLD_POINTS.map((point) => {
      const npc = HOMEWORLD_NPCS.find((entry) => entry.id === point.npcId);
      const hasStation = point.kind !== "ship" && point.kind !== "npc" && point.kind !== "audience";
      return <div
        key={point.id}
        className={styles.point}
        data-kind={point.kind}
        data-point-id={point.id}
        data-has-npc={!!npc}
        data-has-station={hasStation}
        style={{ left: point.x, top: point.y, zIndex: Math.round(point.y) }}
      >
        {point.kind === "ship" && <img className={styles.prop} src={shipProfileAssetPath(selectedShipId)} alt="" draggable={false} />}
        {hasStation && <img className={`${styles.prop} ${styles.stationProp}`} src={pointArt(point)} alt="" draggable={false} data-station-art="true" />}
        {npc && <img
          className={styles.wholeNpc}
          src={homeworldNpcPlate(npc.id)}
          alt=""
          draggable={false}
          data-whole-character-plate="true"
          data-original-city-character="true"
        />}
        <span className={styles.pointTag}>{point.kind === "evidence" ? "◇ " : point.kind === "region" ? "↗ " : ""}{point.label}</span>
        <i className={styles.pointBeacon} />
      </div>;
    })}
    {HOMEWORLD_PROPS.filter(({ plane }) => plane === "front").map((prop) => {
      const faded = fadedPropIds.has(prop.id);
      return <img
        key={prop.id}
        className={styles.decorProp}
        data-plane="front"
        data-prop-id={prop.id}
        data-fade-radius={prop.fadeRadius}
        data-faded={faded}
        src={prop.asset}
        alt=""
        draggable={false}
        style={{
          left: prop.x - prop.width / 2,
          top: prop.y - prop.height,
          width: prop.width,
          height: prop.height,
          zIndex: Math.round(prop.y),
        }}
      />;
    })}
  </>;
});

export default HomeworldCityScene;
