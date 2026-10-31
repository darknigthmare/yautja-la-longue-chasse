import React from "react";
import {createRoot} from "react-dom/client";
import GauntletVisualQaV136 from "../../app/gauntlet-qa-v136/page";

const mount=document.getElementById("root");
if(!mount) throw new Error("Missing QA mount");
createRoot(mount).render(<GauntletVisualQaV136/>);
