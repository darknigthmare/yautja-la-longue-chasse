"use client";

import { useId } from "react";
import HunterRigPreview from "./HunterRigPreview";
import { SHIP_INTERIOR_KIT, SHIP_LEVEL_ART } from "./shipInteriorKit";
import type { PhysicalShipTrophyDisplay } from "./PhysicalShipDeck";
import type { HunterAppearance, Loadout, WeaponId } from "./types";
import { V6_ATLASES, getV6Visual, type V6VisualId } from "./v6Visuals";
import type { PhysicalShipMotion } from "./systems/physicalShipMotion";
import {
  SHIP_LEVEL_WORLD,
  SHIP_LEVEL_SPACES,
  SHIP_LEVEL_ROOMS,
  SHIP_LEVEL_SOLIDS,
  SHIP_LEVEL_SURFACES,
  SHIP_LEVEL_LADDERS,
  SHIP_LEVEL_DOORS,
  SHIP_LEVEL_STATIONS,
  type ShipRectangle,
  type ShipRoomDefinition,
  type ShipSpaceDefinition,
  type ShipDoorStates,
  type PhysicalShipStationDefinition,
  type PhysicalShipStationId,
} from "./systems/shipLevelLayout";

interface ShipLevelSceneProps {
  player: PhysicalShipMotion;
  camera: ShipRectangle;
  doors: ShipDoorStates;
  appearance: HunterAppearance;
  loadout: Loadout;
  trophyDisplays: readonly PhysicalShipTrophyDisplay[];
  activeStationId: PhysicalShipStationId | null;
  waypointId: PhysicalShipStationId | null;
  suspended: boolean;
  highContrast: boolean;
  onStationRequest: (station: PhysicalShipStationDefinition) => void;
}

const WEAPON_PROP_URLS: Record<WeaponId, string> = {
  wristblades: "/game/assets/v2/actors/yautja/hunter/equipment/wristblades-extended.webp",
  combistick: "/game/assets/v3/actors/yautja/hunter/weapons/combistick.webp",
  "plasma-caster": "/game/assets/v2/actors/yautja/hunter/equipment/plasma-caster.webp",
  "smart-disc": "/game/assets/v3/actors/yautja/hunter/weapons/smart-disc.webp",
  "yautja-bow": "/game/assets/v3/actors/yautja/hunter/weapons/yautja-bow.webp",
};

const MAP_ROOM_LABELS: Record<PhysicalShipStationId, string> = {
  "galaxy-map": "NAV", "wall-armory": "ARM", "clan-archives": "ARC", "appearance-forge": "PAR",
  "trophy-hall": "TRO", "medical-bay": "SOINS", "training-arena": "TRAIN", "launch-airlock": "SAS",
};

interface ShipAlphaArt {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  alphaBounds: ShipRectangle;
}

/** Place the painted silhouette, not the transparent source canvas, on its socket. */
export function shipArtPlacement(asset: ShipAlphaArt, centerX: number, bottomY: number, width: number, height: number, fit: "contain" | "cover" = "contain"): ShipRectangle {
  const bounds = asset.alphaBounds;
  const scale = fit === "cover" ? Math.max(width / bounds.width, height / bounds.height) : Math.min(width / bounds.width, height / bounds.height);
  return {
    x: centerX - (bounds.x + bounds.width / 2) * scale,
    y: bottomY - (bounds.y + bounds.height) * scale,
    width: asset.sourceWidth * scale,
    height: asset.sourceHeight * scale,
  };
}

function ShipArtSprite({ asset, centerX, bottomY, width, height, fit = "contain" }: {
  asset: ShipAlphaArt; centerX: number; bottomY: number; width: number; height: number; fit?: "contain" | "cover";
}) {
  return <image href={asset.src} {...shipArtPlacement(asset, centerX, bottomY, width, height, fit)} preserveAspectRatio="xMidYMid meet" />;
}

/** The frame's measured interior, rather than its outer silhouette, defines the visual opening. */
function portalPlacement(door: ShipRectangle): { frame: ShipRectangle; opening: ShipRectangle } {
  const asset = SHIP_LEVEL_ART.doorFrame;
  const aperture = asset.aperture;
  const scale = door.height / aperture.height;
  const centerX = door.x + door.width / 2;
  return {
    frame: { x: centerX - (aperture.x + aperture.width / 2) * scale, y: door.y - aperture.y * scale, width: asset.sourceWidth * scale, height: asset.sourceHeight * scale },
    opening: { x: centerX - aperture.width * scale / 2, y: door.y, width: aperture.width * scale, height: door.height },
  };
}

function visible(rect: ShipRectangle, camera: ShipRectangle): boolean {
  return rect.x + rect.width >= camera.x - 100 && rect.x <= camera.x + camera.width + 100 &&
    rect.y + rect.height >= camera.y - 100 && rect.y <= camera.y + camera.height + 100;
}

function wallFor(space: ShipSpaceDefinition) {
  if (space.kind === "navigation") return SHIP_LEVEL_ART.wallObservatory;
  if (space.kind === "trophies" || space.kind === "archives" || space.kind === "training") return SHIP_LEVEL_ART.wallSanctum;
  if (space.kind === "corridor" || space.kind === "shaft") return SHIP_INTERIOR_KIT.wall;
  return SHIP_LEVEL_ART.wallMachinery;
}

/** The bitmap layers follow the physical layout; none can create a floor or a door. */
export default function ShipLevelScene({ player, camera, doors, appearance, loadout, trophyDisplays,
  activeStationId, waypointId, suspended, highContrast, onStationRequest }: ShipLevelSceneProps) {
  const sceneId = useId().replaceAll(":", "");
  const spaces = SHIP_LEVEL_SPACES.filter((space) => visible(space, camera));
  const rooms = SHIP_LEVEL_ROOMS.filter((room) => visible(room, camera));
  const accent = highContrast ? "#fff" : "#93f2cd";
  const activeColor = highContrast ? "#ffff00" : "#f4c879";

  return <svg className="physical-ship-deck__map ship-level-scene" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
    role="group" aria-label="Salles, coursives, portes et puits du vaisseau" data-camera-x={Math.round(camera.x)} data-camera-y={Math.round(camera.y)}>
    <title>Intérieur modulaire du vaisseau de chasse</title>
    <defs>
      {spaces.map((space) => <clipPath key={space.id} id={`${sceneId}-${space.id}`}><rect x={space.x} y={space.y} width={space.width} height={space.height} /></clipPath>)}
      {SHIP_LEVEL_DOORS.map((door) => <clipPath key={door.id} id={`${sceneId}-${door.id}`}><rect {...portalPlacement(door).opening} /></clipPath>)}
      <pattern id={`${sceneId}-floor`} patternUnits="userSpaceOnUse" width="40" height="20"><rect width="40" height="20" fill="#263330" /><path d="M1 1H39M2 7H24M30 7H38M2 14H38" stroke="#60716a" strokeWidth="1.5" /></pattern>
      <linearGradient id={`${sceneId}-floor-light`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a6c4ae" stopOpacity=".2" /><stop offset="1" stopColor="#a6c4ae" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x={camera.x} y={camera.y} width={camera.width} height={camera.height} fill="#020505" />

    <g data-ship-layer="background">
      {spaces.map((space) => <g key={space.id} data-ship-space={space.id} clipPath={`url(#${sceneId}-${space.id})`}>
        <image href={wallFor(space).src} x={space.x} y={space.y} width={space.width} height={space.height} preserveAspectRatio="xMidYMid slice" />
        {space.kind === "shaft" ? <path d={`M${space.x + 20} ${space.y}V${space.y + space.height} M${space.x + space.width - 20} ${space.y}V${space.y + space.height}`} stroke="#54716b" strokeWidth="8" opacity=".5" /> : null}
        <rect x={space.x} y={space.deckY - 42} width={space.width} height="42" fill={`url(#${sceneId}-floor-light)`} />
      </g>)}
      {rooms.map((room) => <g key={room.id} aria-hidden="true">
        <path d={`M${room.x + 26} ${room.y + 26}H${room.x + room.width - 26}`} stroke={accent} strokeWidth="2" opacity=".32" />
        <text x={room.x + 40} y={room.y + 52} fill="#e3edda" fontSize="14" letterSpacing="3">{room.label.toLocaleUpperCase("fr")}</text>
      </g>)}
    </g>

    <g data-ship-layer="fixtures">
      {rooms.map((room) => <RoomFixtures key={room.id} room={room} loadout={loadout} trophyDisplays={trophyDisplays} accent={accent} />)}
    </g>

    <g data-ship-layer="structure" aria-hidden="true">
      {SHIP_LEVEL_SOLIDS.filter((solid) => visible(solid, camera)).map((solid) => <rect key={solid.id} x={solid.x} y={solid.y} width={solid.width} height={solid.height} fill="#070d0c" stroke="#31473f" strokeWidth="2" />)}
      {SHIP_LEVEL_SURFACES.filter((surface) => visible({ x: surface.left, y: surface.y, width: surface.right - surface.left, height: 22 }, camera)).map((surface) => <g key={surface.id}>
        <rect x={surface.left} y={surface.y} width={surface.right - surface.left} height={surface.kind === "gantry" ? 16 : 20} fill={`url(#${sceneId}-floor)`} stroke="#869e89" strokeWidth="2" />
        <path d={`M${surface.left} ${surface.y - 2}H${surface.right}`} stroke={accent} strokeWidth="2" opacity=".55" />
        {surface.kind === "gantry" ? <path d={`M${surface.left} ${surface.y + 18}H${surface.right}`} stroke="#25372f" strokeWidth="6" /> : null}
      </g>)}
      {SHIP_LEVEL_LADDERS.map((ladder) => <g key={ladder.id} data-ship-ladder={ladder.id}>
        <path d={`M${ladder.x - 28} ${ladder.top - 92}V${ladder.bottom} M${ladder.x + 28} ${ladder.top - 92}V${ladder.bottom}`} stroke="#85958a" strokeWidth="7" />
        {Array.from({ length: Math.ceil((ladder.bottom - ladder.top + 92) / 28) }, (_, index) => <path key={index} d={`M${ladder.x - 29} ${ladder.top - 84 + index * 28}h58`} stroke={index % 4 === 0 ? "#d5c58c" : "#657b6d"} strokeWidth="5" />)}
        <path d={`M${ladder.x - 49} ${ladder.bottom - 40}l-8 8 8 8 M${ladder.x + 49} ${ladder.bottom - 40}l8 8-8 8`} fill="none" stroke={accent} strokeWidth="2" />
      </g>)}
    </g>

    <g data-ship-layer="doors">
      {SHIP_LEVEL_DOORS.filter((door) => visible(door, camera)).map((door) => {
        const openness = doors[door.id]?.openness ?? 0;
        const { opening } = portalPlacement(door);
        return <g key={door.id} data-ship-door={door.id} data-openness={openness.toFixed(2)} aria-label={openness > .96 ? "Porte ouverte" : openness < .04 ? "Porte fermée" : "Porte en mouvement"}>
          <g clipPath={`url(#${sceneId}-${door.id})`}>
            <ShipArtSprite asset={SHIP_LEVEL_ART.doorLeaf} centerX={door.x + door.width / 2} bottomY={door.y + door.height * (1 - openness)} width={opening.width} height={opening.height} fit="cover" />
          </g>
          <path d={`M${door.x - 13} ${door.y + 12}v24 M${door.x + door.width + 13} ${door.y + 12}v24`} stroke={openness > .96 ? accent : activeColor} strokeWidth="4" />
        </g>;
      })}
    </g>

    <g data-ship-layer="stations">
      {SHIP_LEVEL_STATIONS.filter((station) => visible({ x: station.x - 100, y: station.y - 150, width: 200, height: 150 }, camera)).map((station) => {
        const active = station.id === activeStationId;
        const selected = station.id === waypointId;
        return <g key={station.id} className="ship-level-station" data-station-id={station.id} data-in-range={active}
          role="button" tabIndex={suspended ? -1 : 0} aria-disabled={suspended}
          aria-label={`${active ? "Utiliser" : "Baliser"} : ${station.label}. ${station.description}`}
          onClick={() => { if (!suspended) onStationRequest(station); }}
          onKeyDown={(event) => { if (!suspended && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); onStationRequest(station); } }}>
          <rect x={station.x - 76} y={station.y - 160} width="152" height="160" fill="transparent" />
          <ellipse cx={station.x} cy={station.y - 4} rx={active ? 60 : 42} ry="8" fill={active ? activeColor : accent} opacity={active ? .24 : .1} />
          <path d={`M${station.x - 50} ${station.y - 4}h-15v-14 M${station.x + 50} ${station.y - 4}h15v-14`} fill="none" stroke={active ? activeColor : accent} opacity={active ? 1 : .5} strokeWidth="3" />
          {(active || selected) ? <g pointerEvents="none"><path d={`M${station.x - 7} ${station.y - 164}l7 7 7-7`} fill="none" stroke={activeColor} strokeWidth="3" /><text x={station.x} y={station.y - 180} textAnchor="middle" fill={activeColor} fontSize="13" fontWeight="700">{active ? "INTERAGIR" : station.shortLabel}</text></g> : null}
        </g>;
      })}
    </g>

    <DeckHunter player={player} appearance={appearance} loadout={loadout} suspended={suspended} />

    <g data-ship-layer="foreground" pointerEvents="none" aria-hidden="true">
      {SHIP_LEVEL_DOORS.filter((door) => visible(door, camera)).map((door) => <image key={door.id} data-ship-portal-frame={door.id} href={SHIP_LEVEL_ART.doorFrame.src} {...portalPlacement(door).frame} preserveAspectRatio="xMidYMid meet" />)}
      {rooms.map((room) => {
        const height = room.height;
        const width = height * SHIP_LEVEL_ART.foregroundRib.alphaBounds.width / SHIP_LEVEL_ART.foregroundRib.alphaBounds.height;
        return <g key={room.id} clipPath={`url(#${sceneId}-${room.id})`} opacity={player.x < room.x + 110 || player.x > room.x + room.width - 110 ? .3 : .78}>
          <ShipArtSprite asset={SHIP_LEVEL_ART.foregroundRib} centerX={room.x - width * .1} bottomY={room.deckY} width={width} height={height} />
          <ShipArtSprite asset={SHIP_LEVEL_ART.foregroundRib} centerX={room.x + room.width + width * .1} bottomY={room.deckY} width={width} height={height} />
        </g>;
      })}
    </g>
  </svg>;
}

/** A certified atlas cell, clipped independently from neighbouring objects. */
function AtlasProp({ visualId, x, y, width, height }: { visualId: V6VisualId; x: number; y: number; width: number; height: number }) {
  const visual = getV6Visual(visualId);
  const atlas = V6_ATLASES[visual.atlasId];
  return <svg x={x} y={y} width={width} height={height} viewBox={`${visual.crop.x} ${visual.crop.y} ${visual.crop.width} ${visual.crop.height}`} preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-label={visual.label} data-atlas-prop={visualId}>
    <title>{visual.label}</title><image href={atlas.src} width={atlas.width} height={atlas.height} />
  </svg>;
}

function RoomFixtures({ room, loadout, trophyDisplays, accent }: {
  room: ShipRoomDefinition; loadout: Loadout; trophyDisplays: readonly PhysicalShipTrophyDisplay[]; accent: string;
}) {
  const station = SHIP_LEVEL_STATIONS.find((entry) => entry.id === room.id)!;
  const x = station.x;
  const y = station.y;
  if (room.kind === "trophies") return <ShipTrophyWall room={room} trophyDisplays={trophyDisplays} />;
  if (room.kind === "armory") {
    const weapons = [...new Set(loadout.weaponIds)];
    return <g data-room-fixture="owned-armory">
      <path d={`M${room.x + 80} ${y - 242}H${room.x + room.width - 80} M${room.x + 80} ${y - 80}H${room.x + room.width - 80}`} stroke="#777c64" strokeWidth="9" />
      {weapons.map((weaponId, index) => <g key={weaponId} data-owned-weapon={weaponId}>
        <rect x={x - weapons.length * 125 + index * 250 + 6} y={y - 252} width="238" height="172" rx="5" fill="#06100d" fillOpacity=".5" stroke="#66715c" />
        <image href={WEAPON_PROP_URLS[weaponId]} x={x - weapons.length * 125 + index * 250 + 24} y={y - 236} width="202" height="136" preserveAspectRatio="xMidYMid meet"><title>{weaponId}</title></image>
      </g>)}
      <text x={x} y={y - 275} textAnchor="middle" fontSize="13" letterSpacing="2" fill={accent}>ARMES ÉQUIPÉES</text>
      <ShipArtSprite asset={SHIP_LEVEL_ART.navigationConsole} centerX={x} bottomY={y} width={136} height={100} />
    </g>;
  }
  if (room.kind === "training") return <g data-room-fixture="training-simulacrum">
    <ShipArtSprite asset={SHIP_LEVEL_ART.foregroundRib} centerX={room.x + 148} bottomY={y} width={180} height={278} />
    <g opacity=".66"><AtlasProp visualId="prey-thornback-ravager" x={room.x + room.width - 280} y={y - 338} width={236} height={254} /></g>
    <ellipse cx={room.x + room.width - 162} cy={y - 69} rx="122" ry="15" fill="none" stroke={accent} strokeWidth="3" />
    <path d={`M${room.x + room.width - 272} ${y - 69}l28-252m192 252-28-252`} fill="none" stroke={accent} strokeWidth="1" opacity=".4" />
    <text x={x} y={room.y + 83} textAnchor="middle" fill={accent} fontSize="11" letterSpacing="2">SIMULACRE · PARCOURS LIBRE</text>
  </g>;
  return <g data-room-fixture={room.kind}>
    <ShipArtSprite asset={SHIP_LEVEL_ART.navigationConsole} centerX={x} bottomY={y} width={256} height={158} />
    {room.kind === "navigation" ? <g aria-hidden="true" stroke={accent} fill="none" opacity=".85"><ellipse cx={x} cy={y - 183} rx="124" ry="40" /><ellipse cx={x} cy={y - 183} rx="62" ry="40" /><path d={`M${x - 122} ${y - 183}h244 M${x} ${y - 223}v80`} /><circle cx={x + 62} cy={y - 207} r="6" fill={accent} /><circle cx={x - 92} cy={y - 162} r="4" fill={accent} /></g> : null}
    {room.kind === "archives" ? <g aria-hidden="true" fill="none" stroke="#a2ad90" opacity=".9"><AtlasProp visualId="equipment-wrist-computer" x={room.x + 60} y={y - 170} width={140} height={110} /><AtlasProp visualId="equipment-wrist-computer" x={room.x + room.width - 200} y={y - 170} width={140} height={110} />{[0, 1, 2].map((index) => <g key={index}><rect x={room.x + 64 + index * 180} y={room.y + 92} width="138" height="122" /><path d={`M${room.x + 84 + index * 180} ${room.y + 116}h94m-94 18h64m-64 18h84m-84 18h50`} /></g>)}</g> : null}
    {room.kind === "medbay" ? <g aria-hidden="true"><AtlasProp visualId="equipment-wrist-computer" x={x + 145} y={y - 238} width={145} height={150} /><path d={`M${x - 214} ${y - 82}h132l28 18h-160z`} fill="#547168" stroke="#bdd6c2" strokeWidth="3" /><path d={`M${x - 204} ${y - 64}v52m124-52v52`} stroke="#77938a" strokeWidth="10" /><path d={`M${x + 210} ${y - 220}v68m-34-34h68`} stroke="#9aeed0" strokeWidth="10" opacity=".8" /></g> : null}
    {room.kind === "forge" ? <g aria-hidden="true"><text x={room.x + 136} y={y - 312} textAnchor="middle" fill="#d9b878" fontSize="10" letterSpacing="1">ALCÔVE D’ÉQUIPEMENT</text><ShipArtSprite asset={SHIP_LEVEL_ART.doorFrame} centerX={room.x + 136} bottomY={y} width={160} height={292} /><path d={`M${room.x + 95} ${y - 32}h100`} stroke="#e5ae63" strokeWidth="8" />{[...new Set(loadout.gearIds)].map((gearId, index) => <image key={gearId} data-owned-gear={gearId} href={`/game/assets/v3/actors/yautja/hunter/gear/${gearId}.webp`} x={room.x + room.width - 184} y={y - 245 + index * 110} width="108" height="90" preserveAspectRatio="xMidYMid meet" />)}</g> : null}

    {room.kind === "airlock" ? <CapsulePortal centerX={room.x + room.width - 180} floorY={y} accent={accent} /> : null}
  </g>;
}

function CapsulePortal({ centerX, floorY, accent }: { centerX: number; floorY: number; accent: string }) {
  const { frame, opening } = portalPlacement({ x: centerX - 12, y: floorY - 276, width: 24, height: 276 });
  return <g aria-hidden="true">
    <svg {...opening} viewBox={`${opening.x} ${opening.y} ${opening.width} ${opening.height}`} overflow="hidden">
      <ShipArtSprite asset={SHIP_LEVEL_ART.doorLeaf} centerX={centerX} bottomY={floorY} width={opening.width} height={opening.height} fit="cover" />
    </svg>
    <image href={SHIP_LEVEL_ART.doorFrame.src} {...frame} preserveAspectRatio="xMidYMid meet" />
    <text x={centerX} y={floorY - 318} fill={accent} textAnchor="middle" fontSize="11" letterSpacing="2">CAPSULE DE CHASSE</text>
  </g>;
}

/** Only supplied, owned records become individual foreground-safe trophy images. */
export function ShipTrophyWall({ room, trophyDisplays }: { room: ShipRoomDefinition; trophyDisplays: readonly PhysicalShipTrophyDisplay[] }) {
  const displayed = trophyDisplays.slice(0, 8);
  return <g data-room-fixture="owned-trophies">
    {[0, 1].map((row) => <path key={row} d={`M${room.x + 56} ${room.y + 180 + row * 148}H${room.x + room.width - 56}`} stroke="#807354" strokeWidth="7" />)}
    {displayed.length === 0 ? <text x={room.x + room.width / 2} y={room.y + 155} textAnchor="middle" fill="#c6b98e" fontSize="15" letterSpacing="2">LES PRISES DE TES CHASSES SERONT EXPOSÉES ICI</text> : null}
    {displayed.map((trophy, index) => {
      const x = room.x + 64 + index % 4 * ((room.width - 128) / 4);
      const y = room.y + 52 + Math.floor(index / 4) * 148;
      return <g key={trophy.id} data-owned-trophy={trophy.id}>
        <rect x={x} y={y} width="142" height="130" rx="3" fill="#060b08" fillOpacity=".45" stroke="#8a7950" strokeWidth="1.5" />
        <image href={trophy.image} x={x + 9} y={y + 4} width="124" height="118" preserveAspectRatio="xMidYMid meet" aria-label={trophy.label}><title>{trophy.label}</title></image>
      </g>;
    })}
    <text x={room.x + room.width / 2} y={room.deckY - 28} textAnchor="middle" fill="#d7c598" fontSize="12">{displayed.length > 0 ? `${displayed.length} prise${displayed.length > 1 ? "s" : ""} exposée${displayed.length > 1 ? "s" : ""} · collection complète à la station` : "Aucun trophée possédé"}</text>
  </g>;
}

function DeckHunter({ player, appearance, loadout, suspended }: { player: PhysicalShipMotion; appearance: HunterAppearance; loadout: Loadout; suspended: boolean }) {
  // Rig feet are registered at y=366 in a 256×384 frame. Collision remains 112 units.
  const size = 92;
  const scale = size / 256;
  const pose = player.climbing ? "climb" : !player.onSurface ? "jump" : Math.abs(player.velocityX) > 1 && !suspended ? "run" : "idle";
  return <g data-physical-ship-hunter="" data-ship-layer="hunter" pointerEvents="none">
    <ellipse cx={player.x} cy={player.y + 1} rx="24" ry="4" fill="#000" opacity=".6" />
    <foreignObject x={player.x - size / 2} y={player.y - 366 * scale} width={size} height={384 * scale} overflow="visible">
      <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds} size={size} pose={pose} phase={player.phase} facing={player.facing} speed={suspended ? 0 : Math.abs(player.velocityX)} verticalVelocity={player.velocityY} label="Ton chasseur équipé dans le vaisseau" style={{ display: "block", filter: "drop-shadow(0 1px 3px #000)" }} />
    </foreignObject>
  </g>;
}

export function ShipLevelMiniMap({ player, camera, activeStationId, waypointId, suspended, onSelect }: {
  player: PhysicalShipMotion; camera: ShipRectangle; activeStationId: PhysicalShipStationId | null;
  waypointId: PhysicalShipStationId | null; suspended: boolean; onSelect: (stationId: PhysicalShipStationId) => void;
}) {
  return <svg viewBox={`0 0 ${SHIP_LEVEL_WORLD.width} ${SHIP_LEVEL_WORLD.height}`} role="group" aria-label="Plan des huit salles : cliquer pour baliser un trajet">
    {SHIP_LEVEL_SPACES.map((space) => <rect key={space.id} x={space.x} y={space.y} width={space.width} height={space.height} fill="#35534a" stroke="#081411" strokeWidth="18" />)}
    {SHIP_LEVEL_ROOMS.map((room) => <g key={room.id} role="button" tabIndex={suspended ? -1 : 0} aria-disabled={suspended} aria-label={`Baliser ${room.label}, sans déplacement automatique`} className="ship-level-map-room"
      onClick={() => { if (!suspended) onSelect(room.id); }} onKeyDown={(event) => { if (!suspended && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); onSelect(room.id); } }}>
      <rect x={room.x} y={room.y} width={room.width} height={room.height} fill={room.id === activeStationId ? "#679b7c" : room.id === waypointId ? "#796143" : "#223c34"} stroke={room.id === waypointId ? "#ffca79" : "#739687"} strokeWidth="12" />
      <text x={room.x + room.width / 2} y={room.y + room.height / 2 + 24} textAnchor="middle" fill="#e3edde" fontSize="140">{MAP_ROOM_LABELS[room.id]}</text>
    </g>)}
    <rect x={camera.x} y={camera.y} width={camera.width} height={camera.height} fill="none" stroke="#adccc0" strokeWidth="12" strokeDasharray="28 20" pointerEvents="none" />
    <circle cx={player.x} cy={player.y - 50} r="44" fill="#ffe19e" stroke="#111c15" strokeWidth="10" pointerEvents="none" />
  </svg>;
}
