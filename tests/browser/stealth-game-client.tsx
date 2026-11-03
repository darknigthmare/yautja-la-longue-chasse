import React from "react";
import {createRoot} from "react-dom/client";
import GameClient from "../../app/game/GameClient";

createRoot(document.getElementById("root")!).render(<GameClient />);
