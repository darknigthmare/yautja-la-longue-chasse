import React from "react";
import {createRoot} from "react-dom/client";
import ClanWarOperationsV115 from "../../app/game/ClanWarOperationsV115";
import {DEFAULT_WAR_RULES_V6} from "../../app/game/systems/clanWarBibleV6";
import {createWarOperationsV115,warMissionEligibleV115} from "../../app/game/systems/clanWarOperationsV115";

/** V151 production V115 four-mode UI, original W3/V6 source rules.
 * Intentionally lacks gauntlet art from the unmerged #42 branch. */
const rules=DEFAULT_WAR_RULES_V6;
const seeded=createWarOperationsV115(rules);
const team=seeded.teams[0]?.id??"";
const target=rules.territories.find(t=>t.id!==seeded.baseId&&
  warMissionEligibleV115(seeded,rules,t.id,[team])===null)?.id??"";
if(!team||!target)throw new Error("Missing valid native V115 operation");
function Fixture(){
  return <main data-testid="v147-actual-four-mode-lab"
      data-legal-team={team} data-legal-target={target}
      data-initial-rav={seeded.rav}>
    <h1>V151 : Quatre modes V115 et verrou réel des archives</h1>
    <ClanWarOperationsV115 rules={rules} active persist />
  </main>;
}
const mount=document.getElementById("root");
if(!mount)throw new Error("V151 root missing");
createRoot(mount).render(<Fixture/>);
