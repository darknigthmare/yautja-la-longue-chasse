"use client";

import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import ClanWarAtlasV95 from "./ClanWarAtlasV95";
import PlanetLayerExportV102 from "./PlanetLayerExportV102";
import {
  DEFAULT_WAR_PLANET_RECIPE_V102, encodeWarPlanetV102, generateWarPlanetV102,
  generatedWarPlanetV102, seedFromTextV102, validateWarPlanetRecipeV102,
  type GeneratedWarPlanetV102, type WarPlanetRecipeV102,
} from "./systems/clanWarPlanetGeneratorV102";
import { WAR_BIOME_LABELS_V96, WAR_SURFACE_LABELS_V96 } from "./systems/clanWarPlanetLabelsV102";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { createWarSimulationV85 } from "./systems/clanWarV85";
import { rememberGeneratedWorldV102, useGeneratedWarCatalogV102 } from "./useGeneratedWarCatalogV102";
import styles from "./PlanetGeneratorV102.module.css";

const landformNames: Record<WarPlanetRecipeV102["landform"], string> = {
  supercontinent: "Supercontinent", continents: "Continents", archipelago: "Archipels", shattered: "Îles fragmentées",
};
const coverageNames: Record<WarPlanetRecipeV102["landCoverage"], string> = {
  low: "Terres réduites", balanced: "Équilibrée", high: "Terres étendues",
};
const coastNames: Record<WarPlanetRecipeV102["coast"], string> = {
  smooth: "Côtes douces", rugged: "Caps et baies", fjords: "Fjords et criques",
};
const atmosphereNames: Record<WarPlanetRecipeV102["atmosphere"], string> = {
  clear: "Ciel clair", haze: "Brumes et aérosols", storm: "Systèmes orageux", aurora: "Aurores polaires",
};

function numericSeed(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Saisissez une graine, un nombre ou un nom de votre choix.");
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw new Error("Une graine numérique doit être comprise entre 0 et 4 294 967 295.");
    return value;
  }
  return seedFromTextV102(trimmed);
}

function worldForRecipe(recipe: WarPlanetRecipeV102): GeneratedWarPlanetV102 {
  return generatedWarPlanetV102(encodeWarPlanetV102(recipe)) ?? generateWarPlanetV102(recipe);
}

function downloadJson(planet: GeneratedWarPlanetV102) {
  const contents = JSON.stringify({
    format: "yautja-war-planet", version: 102, code: planet.id, recipe: planet.procedural.recipe,
    name: planet.name, description: planet.description, environment: planet.procedural.environment,
    landmasses: planet.procedural.landmasses, regions: planet.procedural.regions, traits: planet.procedural.traits,
  }, null, 2) + "\n";
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `${planet.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface PlanetGeneratorV102Props {
  activePlanet?: WarPlanetV96;
  pending?: boolean;
  onOpen: (planetId: string) => boolean | void;
}

/** A draft never changes the active front. Generating, remembering and opening
 * are separate user actions; the same world code always resolves the same map. */
export default function PlanetGeneratorV102({ activePlanet, pending = false, onOpen }: PlanetGeneratorV102Props) {
  const initialRecipe = activePlanet?.procedural?.recipe.version === 102 ? activePlanet.procedural.recipe : DEFAULT_WAR_PLANET_RECIPE_V102;
  const [draft, setDraft] = useState<WarPlanetRecipeV102>(() => ({ ...initialRecipe }));
  const [seedText, setSeedText] = useState(() => String(initialRecipe.seed));
  const [planet, setPlanet] = useState(() => worldForRecipe(initialRecipe));
  const [selectedId, setSelectedId] = useState("CON-T02");
  const [targetId, setTargetId] = useState("");
  const [importCode, setImportCode] = useState("");
  const [message, setMessage] = useState("");
  const [memoryOpening, setMemoryOpening] = useState<string | null>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const importIntent = useRef(0);
  const unique = `planet-generator-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const catalogue = useGeneratedWarCatalogV102();
  const worlds = useMemo(() => catalogue.ids.map(generatedWarPlanetV102).filter((item): item is GeneratedWarPlanetV102 => Boolean(item)), [catalogue.ids]);
  const simulation = useMemo(() => createWarSimulationV85(undefined, planet.id), [planet.id]);
  const selected = planet.definitions.find(item => item.id === selectedId) ?? planet.definitions[0];
  const target = selected.neighbors.includes(targetId) ? targetId : selected.neighbors[0];
  const regionId = planet.territories.find(item => item.id === selected.id)?.regionId;
  const selectedRegion = planet.procedural.regions.find(item => item.regionId === regionId);
  const details = planet.procedural;
  let changed = true;
  try { changed = encodeWarPlanetV102({ ...draft, seed: numericSeed(seedText) }) !== planet.id; } catch { /* Keep the last valid preview visible while editing. */ }

  function showWorld(next: GeneratedWarPlanetV102) {
    importIntent.current++;
    setPlanet(next); setDraft({ ...next.procedural.recipe }); setSeedText(String(next.procedural.recipe.seed));
    setSelectedId("CON-T02"); setTargetId(""); setMemoryOpening(null);
  }

  function generate(freshSeed = false) {
    try {
      const seed = freshSeed
        ? typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0
        : numericSeed(seedText);
      const next = worldForRecipe({ ...draft, seed });
      showWorld(next);
      setMessage(`${next.name} est prêt à explorer. Le front actif conserve sa progression.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cette combinaison ne peut pas être générée."); }
  }

  function importWorld() {
    const next = generatedWarPlanetV102(importCode.trim());
    if (!next) { setMessage("Ce code de monde n’est pas reconnu. Vérifiez qu’il est complet."); return; }
    showWorld(next); setMessage(`${next.name} retrouvé à partir de son code.`);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const intent = ++importIntent.current;
    try {
      if (file.size > 65536) throw new Error("Cette fiche est trop volumineuse. Choisissez une fiche de monde exportée ici.");
      const value: unknown = JSON.parse(await file.text());
      if (importIntent.current !== intent) return;
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Fiche de monde invalide.");
      const record = value as Record<string, unknown>;
      const recipe = validateWarPlanetRecipeV102(record.recipe);
      if (record.format !== "yautja-war-planet" || record.version !== 102 || !recipe || record.code !== encodeWarPlanetV102(recipe)) throw new Error("Le code et les paramètres de cette fiche ne correspondent pas.");
      showWorld(worldForRecipe(recipe)); setMessage("Fiche importée. Sa géographie est reconstruite à partir du code de monde.");
    } catch (error) { if (importIntent.current === intent) setMessage(error instanceof Error ? error.message : "La fiche n’a pas pu être ouverte."); }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(planet.id); setMessage("Code copié. Il permet de retrouver exactement ce monde et ses régions.");
    } catch { codeRef.current?.focus(); codeRef.current?.select(); setMessage("La copie automatique est indisponible. Le code est sélectionné : copiez-le depuis ce champ."); }
  }

  function remember(open: boolean) {
    if (pending) return;
    const result = rememberGeneratedWorldV102(planet.id);
    if (!result.persisted) {
      setMemoryOpening(open ? planet.id : null);
      setMessage(`${result.issue ?? "Le raccourci ne peut pas être mémorisé."} Conservez le code ou la fiche pour retrouver ce monde.`);
      return;
    }
    setMemoryOpening(null);
    setMessage(`${planet.name} ajouté aux mondes retrouvés sur cet appareil.`);
    if (open) openPreview();
  }

  function openPreview() {
    if (pending) return;
    if (onOpen(planet.id) === false) {
      setMessage("Ce front n’a pas été ouvert. Enregistrez les progrès des autres fronts avant d’en ouvrir un nouveau. Le code, la fiche et les textures de ce monde restent disponibles ici.");
      return;
    }
    setMemoryOpening(null);
  }

  return <section className={styles.generator} aria-labelledby={`${unique}-title`} data-testid="planet-generator-v102" data-preview-planet-code={planet.id} data-draft-modified={changed}>
    <header className={styles.header}><div><p className={styles.eyebrow}>EXPLORATION / NOUVEAUX THÉÂTRES</p><h3 id={`${unique}-title`}>Générateur de mondes</h3><p>Composez des terres, des mers et des atmosphères. Une même graine et les mêmes réglages retrouvent la même planète.</p></div><span className={styles.badge}>{planet.regions.length} régions · {planet.territories.length} territoires</span></header>
    <div className={styles.workspace}>
      <form className={styles.recipe} onSubmit={event => { event.preventDefault(); generate(); }}>
        <h4>Composer un monde</h4>
        <label className={styles.full}>Graine du monde<input value={seedText} maxLength={64} autoComplete="off" spellCheck={false} onChange={event => setSeedText(event.target.value)} placeholder="Un nom ou un nombre"/></label>
        <label>Répartition des terres<select value={draft.landform} onChange={event => setDraft(value => ({ ...value, landform: event.target.value as WarPlanetRecipeV102["landform"] }))}>{Object.entries(landformNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Étendue des terres<select value={draft.landCoverage} onChange={event => setDraft(value => ({ ...value, landCoverage: event.target.value as WarPlanetRecipeV102["landCoverage"] }))}>{Object.entries(coverageNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Dessin des côtes<select value={draft.coast} onChange={event => setDraft(value => ({ ...value, coast: event.target.value as WarPlanetRecipeV102["coast"] }))}>{Object.entries(coastNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Biomes des régions<select value={draft.biomeDiversity} onChange={event => setDraft(value => ({ ...value, biomeDiversity: event.target.value as WarPlanetRecipeV102["biomeDiversity"] }))}><option value="uniform">Même famille de terres</option><option value="varied">Régions variées</option></select></label>
        <label>Terres dominantes<select value={draft.landBiome} onChange={event => setDraft(value => ({ ...value, landBiome: event.target.value as WarPlanetRecipeV102["landBiome"] }))}>{Object.entries(WAR_BIOME_LABELS_V96).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Mers et milieux intermédiaires<select value={draft.surface} onChange={event => setDraft(value => ({ ...value, surface: event.target.value as WarPlanetRecipeV102["surface"] }))}>{Object.entries(WAR_SURFACE_LABELS_V96).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className={styles.full}>Atmosphère<select value={draft.atmosphere} onChange={event => setDraft(value => ({ ...value, atmosphere: event.target.value as WarPlanetRecipeV102["atmosphere"] }))}>{Object.entries(atmosphereNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <div className={styles.actions}><button type="submit" className={styles.primary}>Générer l’aperçu</button><button type="button" onClick={() => generate(true)}>Créer un autre monde</button></div>
        <p className={styles.hint}>{changed ? "Réglages modifiés : générez l’aperçu pour les appliquer." : "L’aperçu correspond à ces réglages."} La partie active ne change qu’à l’ouverture du front.</p>
      </form>
      <div className={styles.identity}>
        <p className={styles.eyebrow}>MONDE EN EXPLORATION</p><h4>{planet.name}</h4><p className={styles.subtitle}>{planet.subtitle}</p><p>{planet.description}</p>
        <dl className={styles.facts}>
          <div><dt>Terres</dt><dd>{Math.round(planet.landFraction * 100)} % du globe</dd></div>
          <div><dt>Continents et îles</dt><dd>{planet.landmasses.length} masses terrestres</dd></div>
          <div><dt>Milieu entre les terres</dt><dd>{details.environment.liquid}</dd></div>
          <div><dt>Climat</dt><dd>{details.environment.climate}</dd></div>
          <div><dt>Atmosphère</dt><dd>{details.environment.atmosphere}</dd></div>
          <div><dt>Gravité / cycle diurne</dt><dd>{details.environment.gravity.toLocaleString("fr")} g · {details.environment.dayLengthHours.toLocaleString("fr")} h</dd></div>
        </dl>
        <div className={styles.openActions}><button type="button" className={styles.primary} disabled={pending || activePlanet?.id === planet.id} onClick={() => remember(true)}>{activePlanet?.id === planet.id ? "Front déjà actif" : "Ouvrir ce front"}</button><button type="button" disabled={pending} onClick={() => remember(false)}>Mémoriser ce monde</button></div>
        {memoryOpening === planet.id && <button type="button" disabled={pending} onClick={openPreview}>Ouvrir avec ce code sans mémoriser le raccourci</button>}
        <p className={styles.hint}>Une progression existante sur ce monde sera reprise. Les caractéristiques de la fiche décrivent l’environnement ; les coûts de guerre restent ceux des règles du mode.</p>
      </div>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{message}</p>
    <div className={styles.preview} data-testid="planet-generator-atlas-v102"><ClanWarAtlasV95 simulation={simulation} selectedTerritoryId={selected.id} targetTerritoryId={target} onSelectTerritory={id => { setSelectedId(id); setTargetId(""); }} onSelectTarget={setTargetId}/></div>
    <PlanetLayerExportV102 key={planet.id} planet={planet}/>
    <div className={styles.dossier}>
      <section aria-label="Particularités du monde"><h4>Particularités de {planet.name}</h4><div className={styles.traits}>{details.traits.map(trait => <article key={trait.id}><h5>{trait.name}</h5><p>{trait.description}</p></article>)}</div></section>
      <section aria-label="Continents et îles"><h4>Continents et îles</h4><div className={styles.landmasses}>{details.landmasses.map(landmass => <article key={landmass.landmassId}><span>{landmass.kind === "island" ? "Île" : "Continent"}</span><h5>{landmass.name}</h5><p>{landmass.description}</p></article>)}</div></section>
      <section aria-label="Régions et milieux"><h4>Régions et milieux</h4><p className={styles.hint}>Sélectionnez un territoire sur l’atlas pour retrouver sa région.</p><div className={styles.regions}>{details.regions.map(region => <article key={region.regionId} data-region-id={region.regionId} data-active-region={selectedRegion?.regionId === region.regionId}><p className={styles.regionKind}>{WAR_BIOME_LABELS_V96[region.biome]}</p><h5>{planet.regions.find(item => item.id === region.regionId)?.name ?? region.regionId}</h5><p>{region.description}</p><dl><div><dt>Climat</dt><dd>{region.climate}</dd></div><div><dt>Relief et particularités</dt><dd>{region.features.join(" · ")}</dd></div><div><dt>Ressources observées</dt><dd>{region.resources.join(" · ")}</dd></div></dl></article>)}</div></section>
    </div>
    <div className={styles.sharing}>
      <section><h4>Retrouver ce monde</h4><p>Le code inclut la graine et les réglages. Il partage la planète, sans transférer la progression d’une guerre.</p><label>Code du monde<textarea ref={codeRef} readOnly rows={3} value={planet.id} spellCheck={false}/></label><div className={styles.actions}><button type="button" onClick={() => { void copyCode(); }}>Copier le code</button><button type="button" onClick={() => { try { downloadJson(planet); setMessage("Fiche du monde exportée avec ses régions et particularités."); } catch { setMessage("La fiche n’a pas pu être téléchargée. Le code du monde reste disponible."); } }}>Télécharger la fiche</button></div></section>
      <section><h4>Explorer un monde partagé</h4><label>Importer un code de monde<input value={importCode} maxLength={256} autoComplete="off" spellCheck={false} onChange={event => setImportCode(event.target.value)} placeholder="Collez un code de monde"/></label><button type="button" disabled={!importCode.trim()} onClick={importWorld}>Retrouver le monde</button><label className={styles.file}>Ou importer une fiche<input type="file" accept="application/json,.json" onChange={event => { void importFile(event); }}/></label></section>
    </div>
    <section className={styles.discoveries} aria-label="Mondes retrouvés"><h4>Mondes retrouvés sur cet appareil <span>{worlds.length} / 24</span></h4>{catalogue.issue && <p className={styles.hint}>{catalogue.issue}</p>}{worlds.length ? <div>{worlds.map(world => <button type="button" key={world.id} aria-pressed={world.id === planet.id} onClick={() => { showWorld(world); setMessage(`${world.name} retrouvé. Ouvrez son front pour reprendre la guerre.`); }}><strong>{world.name}</strong><small>{world.subtitle}</small></button>)}</div> : <p>Mémorisez les mondes qui vous intéressent pour les retrouver ici.</p>}<p className={styles.hint}>Les 24 derniers raccourcis sont conservés. Une ancienne guerre reste accessible avec son code, même lorsque son raccourci sort de cette liste.</p></section>
    <footer className={styles.provenance}>{details.provenance}</footer>
  </section>;
}
