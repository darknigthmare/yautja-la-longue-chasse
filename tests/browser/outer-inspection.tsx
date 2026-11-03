import React from "react";
import {createRoot} from "react-dom/client";
import ClanWarOperationsV115 from "../../app/game/ClanWarOperationsV115";
import {DEFAULT_WAR_RULES_V6} from "../../app/game/systems/clanWarBibleV6";
createRoot(document.getElementById("root")!).render(
  <ClanWarOperationsV115 rules={DEFAULT_WAR_RULES_V6} persist />,
);
