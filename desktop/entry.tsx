import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import GameClient from "../app/game/GameClient";
import "../app/globals.css";

const PitLab = lazy(() => import("../app/pit-lab/PitProductionAnimationLab"));
const RigLab = lazy(() => import("../app/rig-lab/RigLabClient"));
const path = window.location.pathname.replace(/\/$/, "") || "/";
const page = path === "/pit-lab" ? <PitLab /> : path === "/rig-lab" ? <RigLab /> : <GameClient />;
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p role="status">Chargement des ressources locales…</p>}>{page}</Suspense>,
);
