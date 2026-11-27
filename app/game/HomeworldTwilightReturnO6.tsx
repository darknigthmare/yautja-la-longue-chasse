import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import HomeworldNativePropV64 from "./HomeworldNativePropV64";
import { HOMEWORLD_PROP_ART_V64 } from "./systems/homeworldArtV64";
import { HOMEWORLD_YOUTH_PLATE_V69 } from "./systems/homeworldAccessV69";
import { homeworldSceneDepthV78 } from "./systems/homeworldVisualLayersV78";
import { projectHomeworldWorldV77, type HomeworldLevelV77 } from "./systems/homeworldWorldV77";
import { TWILIGHT_COMPANIONS_O6, TWILIGHT_NAMES_O6, twilightSiteO6, type TwilightReturnRecordO6 } from "./systems/originTwilightReturnO6";
import styles from "./HomeworldTownBellO6.module.css";

export default function HomeworldTwilightReturnO6({ level, elevation, receipt }: {
  level: HomeworldLevelV77; elevation: number; receipt?: TwilightReturnRecordO6;
}) {
  const stack = twilightSiteO6("lift-marker"), rack = twilightSiteO6("stow-marker");
  const actors = receipt?.transfers.length === 2 ? TWILIGHT_COMPANIONS_O6 : [];
  return <>
    {level === stack.levelId && receipt?.transfers.length !== 2 && ([stack, rack] as const).map((site, index) => {
      const p = projectHomeworldWorldV77(site.point, level);
      const asset = index === 0 ? "chest" : "bench";
      return <HomeworldNativePropV64 key={asset} id={"o6-twilight-" + asset} artId={asset}
        art={HOMEWORLD_PROP_ART_V64[asset]} x={p.x} y={p.y} depth={homeworldSceneDepthV78(site.point.y, elevation)} />;
    })}
    {actors.map(id => {
      const site = twilightSiteO6(id);
      if (site.levelId !== level) return null;
      const p = projectHomeworldWorldV77(site.point, level);
      return <div key={id} data-o6-twilight-companion={id} className={styles.marker}
        style={{ left: p.x, top: p.y, zIndex: homeworldSceneDepthV78(site.point.y, elevation) }}>
        <HomeworldCivilianV72 npcId={id} role={id === "saar" ? "instructor" : "apprentice"}
          height={id === "saar" ? 108 : HOMEWORLD_YOUTH_PLATE_V69.physicalHeight} />
        <span className={styles.name}>{TWILIGHT_NAMES_O6[id]}</span>
      </div>;
    })}
  </>;
}
