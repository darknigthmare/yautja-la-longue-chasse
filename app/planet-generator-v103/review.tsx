"use client";

import { useState } from "react";
import Link from "next/link";
import ClanWarPanelV85 from "../game/ClanWarPanelV85";
import PlanetGeneratorV103 from "../game/PlanetGeneratorV103";
import { defaultSave } from "../game/save";
import styles from "./review.module.css";

// The real strategic panel manages its own independent archives. This display
// profile never replaces the main campaign save.
const explorationSave = defaultSave("2026-01-01T00:00:00.000Z");
explorationSave.profile.hunterName = "Éclaireur";

export default function PlanetGeneratorReviewV103() {
  const [frontId, setFrontId] = useState<string | null>(null);

  return <main className={styles.page}>
    <header className={styles.header}><div><p>YAUTJA / GUERRES DE TERRITOIRE</p><h1>Exploration des mondes</h1><span>Un petit front insulaire ou une guerre à l’échelle d’un monde. Composez les régions, les sols, les mers et l’atmosphère, puis ouvrez leur propre campagne.</span></div><Link href="/">Rejoindre le jeu</Link></header>
    <div hidden={frontId !== null}><PlanetGeneratorV103 onOpen={setFrontId}/></div>
    {frontId && <ClanWarPanelV85 key={frontId} initialPlanetId={frontId} save={explorationSave} onClose={() => setFrontId(null)}/>}
  </main>;
}
