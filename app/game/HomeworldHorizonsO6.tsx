import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import HomeworldNativePropV64 from "./HomeworldNativePropV64";
import { HOMEWORLD_PROP_ART_V64 } from "./systems/homeworldArtV64";
import { homeworldSceneDepthV78 } from "./systems/homeworldVisualLayersV78";
import { projectHomeworldWorldV77, type HomeworldLevelV77 } from "./systems/homeworldWorldV77";
import { HORIZON_IDS_O6, HORIZON_LABELS_O6, horizonSiteO6, type HorizonsRecordO6 } from "./systems/originHorizonsO6";
import styles from "./HomeworldTownBellO6.module.css";

const workpieces = { teaching: "bench", circle: "beacon", exploration: "chest" } as const;

export default function HomeworldHorizonsO6({ level, elevation, record }: {
  level: HomeworldLevelV77; elevation: number; record?: HorizonsRecordO6;
}) {
  if (horizonSiteO6("saar").levelId !== level) return null;
  return <>
    {(["saar", ...HORIZON_IDS_O6] as const).filter(site => site === "saar" || record).map(site => {
      const { point } = horizonSiteO6(site);
      const position = projectHomeworldWorldV77(point, level);
      const depth = homeworldSceneDepthV78(point.y, elevation);
      const prepared = record?.journal.some(event => event.kind === "prepare" && event.horizon === site);
      const label = site === "saar" ? "Saar" : HORIZON_LABELS_O6[site];
      const artId = site === "saar" ? null : workpieces[site];
      return <div key={site} data-o6-horizon-post={site} data-o6-horizon-prepared={prepared || undefined}>
        {artId && <HomeworldNativePropV64 id={"o6-horizon-" + site} artId={artId} art={HOMEWORLD_PROP_ART_V64[artId]}
          x={position.x} y={position.y} depth={depth} />}
        <div className={styles.marker} style={{ left: position.x, top: position.y, zIndex: depth + 1 }}>
          {site === "saar" && <HomeworldCivilianV72 npcId="saar" role="instructor" height={108} />}
          <span className={styles.name}>{label}</span>
        </div>
      </div>;
    })}
  </>;
}
