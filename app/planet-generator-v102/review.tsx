"use client";

import { useState } from "react";
import Link from "next/link";
import ClanWarPanelV85 from "../game/ClanWarPanelV85";
import PlanetGeneratorV102 from "../game/PlanetGeneratorV102";
import { defaultSave } from "../game/save";
import styles from "./review.module.css";

// The strategic mode owns its independent local archives. This profile only
// supplies the panel's display fields and never writes the main campaign.
const explorationSave = defaultSave("2026-01-01T00:00:00.000Z");
explorationSave.profile.hunterName = "Éclaireur";

export default function PlanetGeneratorReviewV102() {
  const [frontId, setFrontId] = useState<string | null>(null);

  return <main className={styles.page}>
    <header className={styles.header}><div><p>YAUTJA / GUERRES DE TERRITOIRE</p><h1>Exploration des mondes</h1><span>Des terres, des régions et des atmosphères à composer. Chaque front possède sa propre progression locale.</span></div><Link href="/">Rejoindre le jeu</Link></header>
    <div hidden={frontId !== null}><PlanetGeneratorV102 onOpen={setFrontId}/></div>
    {frontId && <ClanWarPanelV85 key={frontId} initialPlanetId={frontId} save={explorationSave} onClose={() => setFrontId(null)}/>}
  </main>;
}
