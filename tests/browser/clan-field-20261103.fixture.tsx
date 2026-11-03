import React from "react";
import {createRoot} from "react-dom/client";
import ClanWarOperationsV115 from "../../app/game/ClanWarOperationsV115";
import ClanWarRtsSquadsV133 from "../../app/game/ClanWarRtsSquadsV133";
import {DEFAULT_WAR_RULES_V6} from "../../app/game/systems/clanWarBibleV6";
import {createWarOperationsV115,warMissionEligibleV115} from "../../app/game/systems/clanWarOperationsV115";
import {createWarRtsSquadsV133,launchWarRtsSquadsV133,commandWarRtsSquadsV133,visibleWarRtsEnemiesV133} from "../../app/game/systems/clanWarRtsSquadsV133";

// Native V6 scenarios and production components; no injected gameplay state.
const rules=DEFAULT_WAR_RULES_V6;
const operations=createWarOperationsV115(rules);
const team=operations.teams[0]?.id??"";
const target=rules.territories.find(t=>t.id!==operations.baseId&&
  warMissionEligibleV115(operations,rules,t.id,[team])===null)?.id??"";
const deployment=launchWarRtsSquadsV133(createWarRtsSquadsV133("W3-RTS01",rules));
if(!team||!target||!deployment.accepted)throw new Error("Native field QA scenario is unavailable");
const deployed=deployment.state;
const directions=[['up','ArrowUp'],['left','ArrowLeft'],['down','ArrowDown'],['right','ArrowRight']] as const;
const blockedKey=directions.find(([direction])=>!commandWarRtsSquadsV133(deployed,
  {kind:"move",squadId:deployed.squads[0].id,direction}).accepted)?.[1];
if(!blockedKey)throw new Error("Native RTS spawn needs a blocked adjacent cell for this regression");

function Fixture(){
  return <main data-testid="field-20261103-lab" data-legal-target={target}
    data-blocked-key={blockedKey} data-visible-rivals={visibleWarRtsEnemiesV133(deployed).length}
    data-total-rivals={deployed.enemies.filter(enemy=>enemy.hp>0).length}>
    <h1>Prototype original : clavier et zoom des panneaux de production</h1>
    <ClanWarOperationsV115 rules={rules} active persist />
    <ClanWarRtsSquadsV133 rules={rules}/>
  </main>;
}
const mount=document.getElementById("root");
if(!mount)throw new Error("Field QA root missing");
createRoot(mount).render(<Fixture/>);
