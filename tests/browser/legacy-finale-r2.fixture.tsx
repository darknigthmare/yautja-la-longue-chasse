import { useState } from "react";
import { createRoot } from "react-dom/client";
import type { SaveGame } from "../../app/game/types";
import LegacyFinaleSceneR2 from "../../app/game/LegacyFinaleSceneR2";
import { advanceLegacyFinaleR2, normalizeLegacyFinaleR2, type LegacyCommandR2, type LegacySiteR2 } from "../../app/game/systems/legacyFinaleR2";

const admission = (window as Window & { legacyAdmissionR2?: { save: SaveGame; site: LegacySiteR2 } }).legacyAdmissionR2!;
const key = "legacy-finale-fixture-r2";
const launch = new URLSearchParams(window.location.search).has("epilogue") ? "epilogue" : "cohort";
function Fixture() {
  const [save, setSave] = useState(() => ({
    ...admission.save,
    legacyFinaleR2: normalizeLegacyFinaleR2(JSON.parse(localStorage.getItem(key) ?? "null"), admission.save.createdAt),
  }));
  const [notice, setNotice] = useState("");
  const act = (command: LegacyCommandR2) => {
    const result = advanceLegacyFinaleR2(save, admission.site, command);
    if (result.next) {
      localStorage.setItem(key, JSON.stringify(result.next));
      setSave({ ...save, legacyFinaleR2: result.next });
    }
    setNotice(result.message);
  };
  return <LegacyFinaleSceneR2 scene={launch} site={admission.site} siteLabel="Foyer de la maison d’enseignement"
    identity={save} state={save.legacyFinaleR2} endingTitle="La maison des futurs chasseurs"
    belongings={save.trophies.map(item => item.targetName)} relations={Object.values(save.originV151?.relations ?? {}).map(item => item.name)}
    onCommand={act} notice={notice} onClose={() => undefined} />;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
