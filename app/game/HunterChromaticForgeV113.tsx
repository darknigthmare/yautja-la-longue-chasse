"use client";
/* eslint-disable @next/next/no-img-element -- verified registered local PNGs are shown as texture samples */
import { useEffect, useState } from "react";
import type { HunterAppearance } from "./types";
import {
  CHROMATIC_PALETTE_PRESETS_V115, PHG_CHROMATIC_MATERIALS_V113,
  PHG_DRIVE_CANDIDATES_V120, chromaticAtlasBackgroundV125,
  normalizeHunterChromaticsV113,
  chromaticFacilityChannelsV115, resetChromaticFacilityV115,
  type ChromaticFacilityV115, type HunterChromaticsV113,
} from "./hunterChromaticsV113";
import { PHG_RECENT_RELEASES_V125, PHG_FERAL_CORRECTION_V125 } from "./phgRecentReleasesV125";
import { PHG_RECENT_CANDIDATES_V126, PHG_RECENT_UPDATES_V126 } from "./phgRecentMaterialsV126";
import styles from "./HunterChromaticForgeV113.module.css";

export default function HunterChromaticForgeV113({
  appearance, homeworld = false, facility, disabled = false, onCommit, onPreview,
}: {
  appearance: HunterAppearance;
  homeworld?: boolean;
  facility?: ChromaticFacilityV115;
  disabled?: boolean;
  onCommit: (value: HunterChromaticsV113) => boolean;
  /** Draft-only display; this callback never writes a campaign archive. */
  onPreview?: (value: HunterChromaticsV113 | null) => void;
}) {
  const station = facility ?? (homeworld ? "forge" : "ship");
  const [draft, setDraft] = useState(() => normalizeHunterChromaticsV113(appearance.chromaticsV113));
  const [message, setMessage] = useState("");
  useEffect(() => { onPreview?.(draft); }, [draft, onPreview]);
  useEffect(() => () => onPreview?.(null), [onPreview]);

  const change = (field: keyof HunterChromaticsV113, value: string | null) => {
    setDraft(current => normalizeHunterChromaticsV113({ ...current, [field]: value }));
    setMessage("");
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizeHunterChromaticsV113(appearance.chromaticsV113));

  return <section className={styles.forge} aria-label="Ateliers chromatiques du Yautja" data-hunter-chromatics-v113>
    <header className={styles.heading}>
      <span>V113 · Ateliers du clan</span>
      <h2>{station === "lab" ? "Analyseur de chromatophores · Maison des soins"
        : station === "forge" ? "Teinturerie et forge des parures"
        : "Établis chromatiques du chasseur"}</h2>
      <p>{station === "lab"
        ? "Les soigneurs analysent les motifs de peau et appliquent des pigments superficiels. Aucune réécriture instantanée de l’ADN n’est attribuée aux Yautja."
        : station === "forge"
          ? "Les artisans travaillent les ligatures des dreadlocks, les étoffes du clan et les patines des plaques. La pigmentation biologique appartient à la Maison des soins."
          : "Le quartier du chasseur conserve un nuancier d’entretien de ses équipements et de son apparence. Les soins complets et l’artisanat traditionnel restent disponibles à Homeworld."}</p>
      <p>Les fichiers PHG disponibles ici sont des <strong>matières 2D reconstituées</strong>. Les dégradés restent masqués par la vraie silhouette Yautja ; aucune texture extraite ni correspondance UV 1:1 officielle n’est revendiquée.</p>
    </header>
    <details className={styles.releaseNotes}>
      <summary>Archives PHG · mises à jour officielles 2025–2026</summary>
      <p>Ces dates, classes et équipements sont confirmés dans les notes officielles.
        Les matières du jeu sont des reconstructions, pas des cartes UV certifiées 1:1.</p>
      <ul>
        {PHG_RECENT_RELEASES_V125.map(release => <li key={release.id}>
          <strong>{release.predator}</strong> · {release.releasedOn} · patch {release.patch}
          {" · "}{release.featuredEquipment}{" "}
          <a href={release.sourceUrl} target="_blank" rel="noopener noreferrer">Note officielle</a>
        </li>)}
      </ul>
      <p>Dernières actualités : {PHG_RECENT_UPDATES_V126.map(update =>
        <span key={update.date}>{update.date} · {update.title} · <a href={update.url} target="_blank" rel="noopener noreferrer">Source</a>. </span>
      )}</p>
      <p>Feral · peau Default : modification dans le patch {PHG_FERAL_CORRECTION_V125.patch}
        {" ("}{PHG_FERAL_CORRECTION_V125.date}{")"}. L’étude V125 et le matériau antérieur
        sont conservés séparément ; les pixels officiels restent à vérifier.</p>
    </details>
    <div className={styles.grid}>
      {chromaticFacilityChannelsV115(station).map(channel => {
        const activeColor = draft[channel.colorKey];
        const choices = PHG_CHROMATIC_MATERIALS_V113.filter(item => item.channel === channel.id && item.status === "integrated");
        const pending = PHG_DRIVE_CANDIDATES_V120.filter(item => item.channel === channel.id && item.status === "drive-only").length
          + PHG_RECENT_CANDIDATES_V126.filter(item => item.channel === channel.id && item.status === "drive-only").length;
        const selectedMaterial = choices.find(item => item.id === draft[channel.materialKey]);
        return <fieldset className={styles.station} key={channel.id} disabled={disabled}>
          <legend>{channel.label}</legend>
          <p>{channel.subtitle}</p>
          <div className={styles.colorRow}>
            <label htmlFor={"chromatic-color-" + channel.id}>Pigment libre</label>
            <input id={"chromatic-color-" + channel.id} type="color"
              value={activeColor ?? channel.naturalHex}
              onChange={event => change(channel.colorKey, event.target.value)}
              aria-label={"Choisir la teinte " + channel.label} />
            <button type="button" onClick={() => change(channel.colorKey, null)}
              aria-label={"Retrouver la teinte de base " + channel.label}>Naturel</button>
          </div>
          <p className={styles.paletteCaption}>Nuancier du clan · interprétations originales</p>
          <div className={styles.paletteSamples} role="group" aria-label={"Nuancier rapide — " + channel.label}>
            {CHROMATIC_PALETTE_PRESETS_V115.filter(sample => sample.channel === channel.id).map(sample => (
              <button type="button" className={styles.paletteButton} key={sample.hex}
                aria-pressed={activeColor === sample.hex}
                onClick={() => change(channel.colorKey, sample.hex)}>
                <span className={styles.paletteSwatch} style={{ backgroundColor: sample.hex }} aria-hidden="true" />
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
          <label className={styles.materialLabel} htmlFor={"chromatic-material-" + channel.id}>Matière PNG</label>
          <select id={"chromatic-material-" + channel.id} value={draft[channel.materialKey] ?? ""}
            onChange={event => change(channel.materialKey, event.target.value || null)}>
            <option value="">Matière du rig d’origine</option>
            {choices.filter(item => !item.atlas).map(item =>
              <option key={item.id} value={item.id}>{item.label}{item.evidence === "provisional" ? " · provisoire" : ""}</option>
            )}
            {choices.some(item => item.atlas) && <optgroup label="Études V125–V126 — reconstructions non certifiées 1:1">
              {choices.filter(item => item.atlas).map(item =>
                <option key={item.id} value={item.id}>{item.label}</option>
              )}
            </optgroup>}
          </select>
          {selectedMaterial?.src && <div className={styles.materialPreview} data-selected-material-id={selectedMaterial.id}>
            {selectedMaterial.atlas
              ? <span aria-hidden="true" className={styles.atlasSwatch} style={{
                  backgroundImage: 'url("' + selectedMaterial.src + '")',
                  ...chromaticAtlasBackgroundV125(selectedMaterial.atlas, false),
                }} />
              : <img src={selectedMaterial.src} alt="" loading="lazy" decoding="async" />}
            <span><strong>{selectedMaterial.label}</strong><small>{selectedMaterial.evidence === "provisional" ? "Étude provisoire — fidélité artistique non validée" : "Matière plane reconstituée — UV non certifiées 1:1"}</small></span>
          </div>}
          {!selectedMaterial && <small>Calque d’origine conservé sans texture de remplacement.</small>}
          {pending > 0 && <small>{pending} matière(s) PHG vérifiée(s) sur Drive, non installée(s) dans ce jeu. L’import local V120/V126 vérifie les octets avant activation ; la fidélité UV 1:1 reste non certifiée.</small>}
        </fieldset>;
      })}
    </div>
    <div className={styles.actions}>
      {dirty && <p className={styles.draftHint}>Prévisualisation en direct sur le rig. Les modifications ne sont pas enregistrées avant validation.</p>}
      <button type="button" disabled={disabled || !dirty} onClick={() => {
        if (onCommit(draft)) setMessage("Nouvelle parure enregistrée pour ce chasseur.");
        else setMessage("Sauvegarde non confirmée ; conserve ton ancienne palette et réessaie.");
      }}>Valider les couleurs et matières</button>
      <button type="button" disabled={disabled} onClick={() => {
        setDraft(current => resetChromaticFacilityV115(current, station));
        setMessage("Matières naturelles de ce poste préparées ; valide pour les enregistrer.");
      }}>Retrouver les matières de ce poste</button>
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
