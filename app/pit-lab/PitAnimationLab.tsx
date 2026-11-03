"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPitAnimationSamples, PIT_ANIMATION_SAMPLES, type PitAnimationSampleId } from "../game/pitAnimationSamples";
import { resolvePitFighterAnimation } from "../game/pitFighterAnimation";
import { drawPitModularFighter, loadPitFighterArt, type PitFighterArtBank, type PitModularFighterId } from "../game/pitFighterRendering";
import { PIT_FIGHTERS } from "../game/systems/pitCombat";
import styles from "./PitAnimationLab.module.css";
import knownHunterReview from "../../public/game/assets/v28/sprite-review/manifest.json";

export default function PitAnimationLab() {
  const [fighterId, setFighterId] = useState<PitModularFighterId>("jungle-hunter");
  const [action, setAction] = useState<PitAnimationSampleId>("idle");
  const [facing, setFacing] = useState<1 | -1>(1);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(.5);
  const [zoom, setZoom] = useState(2.2);
  const [highContrast, setHighContrast] = useState(false);
  const [bank, setBank] = useState<PitFighterArtBank | null>(null);
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samples = useMemo(() => createPitAnimationSamples(fighterId, action), [fighterId, action]);
  const currentIndex = Math.min(index, samples.length - 1);
  const sample = samples[currentIndex];
  const fighter = useMemo(() => ({
    ...sample.fighter,
    x: 480,
    y: 0,
    facing,
    velocityX: sample.fighter.velocityX * facing,
  }), [sample, facing]);
  const animation = resolvePitFighterAnimation(fighter, sample.frame);
  const ready = Boolean(bank?.readyIds.has(fighterId));
  const failed = loadError || Boolean(bank?.failedIds.has(fighterId));

  useEffect(() => {
    let active = true;
    void loadPitFighterArt().then((result) => {
      if (active) setBank(result);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) setPlaying(false); };
    media.addEventListener("change", stop);
    return () => media.removeEventListener("change", stop);
  }, []);

  useEffect(() => {
    if (!playing || !ready) return;
    let previous: number | null = null;
    let accumulator = 0;
    let request = 0;
    const advance = (now: number) => {
      if (document.hidden) { previous = null; accumulator = 0; }
      else if (previous !== null) {
        accumulator += Math.min(100, now - previous) * speed;
        const ticks = Math.floor(accumulator / (1000 / 60));
        if (ticks > 0) {
          accumulator -= ticks * (1000 / 60);
          setIndex((value) => (value + ticks) % samples.length);
        }
      }
      previous = document.hidden ? null : now;
      request = window.requestAnimationFrame(advance);
    };
    request = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(request);
  }, [playing, ready, samples.length, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, 960, 540);
    context.fillStyle = highContrast ? "#060b10" : "#0d1818";
    context.fillRect(0, 0, 960, 540);
    context.strokeStyle = highContrast ? "#294757" : "#1c3030";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= 960; x += 40) { context.moveTo(x, 0); context.lineTo(x, 540); }
    for (let y = 35; y <= 540; y += 40) { context.moveTo(0, y); context.lineTo(960, y); }
    context.stroke();
    context.strokeStyle = "#acd47f";
    context.beginPath(); context.moveTo(30, 476); context.lineTo(930, 476); context.stroke();
    context.fillStyle = "#739489";
    context.font = "14px system-ui";
    context.fillText("SOL · vue recentrée", 28, 505);
    context.save();
    context.translate(480, 475);
    context.scale(zoom, zoom);
    context.translate(-480, -475);
    const drawn = bank && drawPitModularFighter(context, bank, fighter, sample.frame, 475, { highContrast });
    context.restore();
    if (!drawn) {
      context.fillStyle = "#d5dfd5";
      context.textAlign = "center";
      context.font = "20px system-ui";
      context.fillText(failed ? "Profil incomplet · rendu suspendu" : "Chargement des pièces…", 480, 280);
      context.textAlign = "start";
    }
  }, [bank, failed, fighter, sample.frame, zoom, highContrast]);

  const step = (direction: number) => {
    setPlaying(false);
    setIndex((value) => Math.max(0, Math.min(samples.length - 1, value + direction)));
  };
  return (
    <main className={styles.root} data-pit-animation-lab data-fighter={fighterId} data-motion={animation.motion} data-sample-frame={sample.frame}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input, select, button, a")) return;
        if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
        else if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
        else if (event.code === "Space") { event.preventDefault(); setPlaying((value) => !value); }
      }}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>THE PIT · CONTRÔLE DE PRODUCTION</p>
          <h1>Atelier d’animation</h1>
          <p>Revue des planches dessinées et contrôle des rigs provisoires.</p>
        </div>
        <Link href="/" className={styles.back}>Retour au jeu</Link>
      </header>
      <section className={styles.notice} aria-label="Revue des planches dessinées">
        <div className={styles.buttons}>
          <a className={styles.back} href="/game/assets/v34/production-review/index.html" target="_blank" rel="noopener noreferrer">Galerie V34 depuis l’archive des rigs</a>
          <a className={styles.back} href="/game/assets/v28/sprite-review/index.html"
            target="_blank" rel="noopener noreferrer" aria-describedby="sprite-review-v28-status">
            Planches dessinées · revue V28
          </a>
          <a className={styles.back} href="/game/assets/v27/sprite-review/index.html" target="_blank" rel="noopener noreferrer">Archive V27</a>
        </div>
        <p id="sprite-review-v28-status">
          <strong>Brouillons · {knownHunterReview.counts.sheets} séquences · {knownHunterReview.counts.cells} cellules · {knownHunterReview.counts.subjects} personnages.</strong>{" "}
          Machiko et Theta restent des personnages humains, avec leurs variantes séparées. Ces essais ne constituent pas des animations complètes et ne sont pas validés pour les combats.
        </p>
      </section>
      <p className={styles.notice}>
        <strong>Rigs V3 provisoires · fidélité des personnages non validée.</strong>{" "}
        Les masques et armures doivent encore être corrigés. Cet atelier ne remplace pas le rendu des combats ni les illustrations V23.
      </p>
      <div className={styles.layout}>
        <section className={styles.viewer} aria-label="Inspection du personnage">
          <canvas ref={canvasRef} width={960} height={540} className={styles.canvas} tabIndex={0}
            aria-label={PIT_FIGHTERS[fighterId].name + " · " + action + ". Flèches pour avancer d’une image, espace pour lire ou mettre en pause."} />
          <div className={styles.readout}>
            <strong>{PIT_FIGHTERS[fighterId].name}</strong>
            <span>{animation.motion}</span>
            <span>Simulation #{sample.frame} · action {fighter.action?.frame ?? "—"}</span>
          </div>
          <p className={styles.status} role="status">
            {failed ? "Une pièce n’a pas chargé. Aucun personnage partiel n’est affiché." : ready ? "Toutes les pièces du profil sont chargées." : "Chargement des pièces indépendantes…"}
          </p>
          <div className={styles.timeline}>
            <label htmlFor="sample-frame">Image {currentIndex + 1} / {samples.length}</label>
            <input id="sample-frame" type="range" min={0} max={samples.length - 1} value={currentIndex}
              onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }} />
            <div className={styles.buttons}>
              <button type="button" onClick={() => { setPlaying(false); setIndex(0); }}>Début</button>
              <button type="button" onClick={() => step(-1)} disabled={currentIndex === 0}>−1 image</button>
              <button type="button" onClick={() => setPlaying((value) => !value)} disabled={!ready} aria-pressed={playing}>{playing ? "Pause" : "Lecture"}</button>
              <button type="button" onClick={() => step(1)} disabled={currentIndex === samples.length - 1}>+1 image</button>
            </div>
          </div>
        </section>
        <aside className={styles.controls} aria-label="Réglages de l’atelier">
          <label htmlFor="fighter">Combattant</label>
          <select id="fighter" value={fighterId} onChange={(event) => { setPlaying(false); setIndex(0); setFighterId(event.target.value as PitModularFighterId); }}>
            <option value="jungle-hunter">Jungle Hunter</option><option value="berserker">Berserker</option>
          </select>
          <label htmlFor="motion">Séquence</label>
          <select id="motion" value={action} onChange={(event) => { setPlaying(false); setIndex(0); setAction(event.target.value as PitAnimationSampleId); }}>
            {PIT_ANIMATION_SAMPLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <label htmlFor="facing">Orientation de contrôle</label>
          <select id="facing" value={facing} onChange={(event) => setFacing(Number(event.target.value) as 1 | -1)}>
            <option value={1}>Vers la droite</option><option value={-1}>Vers la gauche</option>
          </select>
          <label htmlFor="speed">Vitesse de lecture</label>
          <select id="speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={.25}>Ralenti ×0,25</option><option value={.5}>Ralenti ×0,5</option><option value={1}>Temps réel · 60 images/s</option>
          </select>
          <label htmlFor="zoom">Zoom ×{zoom.toFixed(1)}</label>
          <input id="zoom" type="range" min={1} max={2.8} step={.1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <label className={styles.check}><input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /> Contraste renforcé</label>
          <p>Le déplacement est recentré pour examiner les articulations. La garde et les réactions proviennent de simulations isolées, sans toucher à ta sauvegarde.</p>
          <p>Le miroir vérifie les attaches. Des orientations artistiques distinctes restent nécessaires pour préserver l’asymétrie des équipements.</p>
          <p>Projection : geste solo seulement. Les prises synchronisées et les finishers restent à produire.</p>
          <p>À retoucher avant intégration : mains fermées, coutures des membres et contacts au sol de certaines réactions, dont le KO.</p>
        </aside>
      </div>
    </main>
  );
}
