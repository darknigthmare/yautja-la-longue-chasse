"use client";

import type { CSSProperties, ReactNode } from "react";
import { GAUNTLET_EVIDENCE_LABELS_V132, GAUNTLET_PALETTES_V132, gauntletByIdV132, type GauntletDefinitionV132 } from "./systems/clanWarGauntletCatalogV132";
import HunterGauntletArtV132 from "./HunterGauntletArtV132";
import JungleHunterLayeredV134 from "./JungleHunterLayeredV134";
import GauntletKnownHuntersV135, {isKnownHunterGauntletV135} from "./GauntletKnownHuntersV135";
import GauntletArchiveStudiesV136, {isGauntletArchiveStudyV136} from "./GauntletArchiveStudiesV136";
import type { ClanWarPresentationV131 } from "./systems/clanWarViewV131";
import styles from "./ClanWarGauntletV131.module.css";

interface ClanWarGauntletV131Props {
  view: ClanWarPresentationV131;
  planetName: string;
  turn: number;
  departure: string;
  destination: string;
  controlled: number;
  territories: number;
  queuedOrders: number;
  persisted: boolean;
  pending: boolean;
  gauntletId: string;
  readoutLabel: string;
  readoutValue: string;
  children: ReactNode;
}

/** One real atlas for two presentations. Keeping children mounted preserves its
 * zoom, rotation, filters and keyboard focus while the player changes views. */
export default function ClanWarGauntletV131({
  view, planetName, turn, departure, destination, controlled,
  territories, queuedOrders, persisted, pending, gauntletId, readoutLabel, readoutValue, children,
}: ClanWarGauntletV131Props) {
  const equipped = gauntletByIdV132(gauntletId) ?? gauntletByIdV132("jungle-hunter") as GauntletDefinitionV132;
  const palette = GAUNTLET_PALETTES_V132[equipped.theme];
  const colors = { "--holo-accent":palette.accent, "--holo-secondary":palette.secondary, "--holo-display":palette.display, "--holo-metal":palette.metal } as CSSProperties;
  return <section className={styles.stage} style={colors} data-testid="clan-war-gauntlet-v131" data-war-presentation={view} data-gauntlet-model={equipped.id} data-gauntlet-scan={palette.scan}
    aria-label="Projection stratégique et atlas des guerres de clans">
    <div className={styles.projector} aria-hidden={view === "classic"}>
      <div className={styles.gauntletArt}>
        {equipped.id==="jungle-hunter"?<JungleHunterLayeredV134/>:isKnownHunterGauntletV135(equipped.id)?<GauntletKnownHuntersV135 variant={equipped.id}/>:isGauntletArchiveStudyV136(equipped.id)?<GauntletArchiveStudiesV136 entry={equipped}/>:<HunterGauntletArtV132 entry={equipped}/>} 
      </div>
      <div className={styles.projectionInfo}>
        <p className={styles.eyebrow}>COMMANDANT YAUTJA · {equipped.name}</p>
        <h3>{planetName}</h3>
        <p className={styles.routeInfo}>Départ : {departure} <span aria-hidden="true">◇</span> Destination : {destination}</p>
        <div className={styles.telemetry}>
          <span>Cycle <strong>{String(turn).padStart(2, "0")}</strong></span>
          <span>Contrôle <strong>{controlled}/{territories}</strong></span>
          <span>Ordres <strong>{queuedOrders}</strong></span>
        </div>
        <p className={styles.feature} data-testid="gauntlet-readout-v132"><strong>{readoutLabel}</strong> · {readoutValue}</p>
        <p className={styles.archiveState}>{pending ? "Transmission des archives…" : persisted ? "Archives locales confirmées" : "Front actif en mémoire"}</p>
        <p className={styles.accuracy} title={equipped.notes}>Modèle : {GAUNTLET_EVIDENCE_LABELS_V132[equipped.evidence]} · visuel prototype</p>
      </div>
    </div>
    <div className={styles.mapWindow} data-testid="clan-war-shared-atlas-v131">
      <div className={styles.projectionLegend} aria-hidden={view === "classic"}>
        <span>CARTE DE CAMPAGNE HOLOGRAPHIQUE · {equipped.name}</span>
        <span>TRANSMISSION · {planetName} · TOUR {turn}</span>
      </div>
      {children}
    </div>
  </section>;
}
