"use client";

import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import ClanWarAtlasV95 from "./ClanWarAtlasV95";
import PlanetMaterialCanvasV101 from "./PlanetMaterialCanvasV101";
import PlanetLayerExportV102 from "./PlanetLayerExportV102";
import type { PlanetVisualProfileV134 } from "./systems/clanWarPlanetVisualProfileV134";
import PlanetShapePreviewV125 from "./PlanetShapePreviewV125";
import PlanetShapeLibraryV137 from "./PlanetShapeLibraryV137";
import PlanetEnvironmentalDossierV146 from "./PlanetEnvironmentalDossierV146";
import PlanetEarthReferenceV147 from "./PlanetEarthReferenceV147";
import PlanetPreflightV149 from "./PlanetPreflightV149";
import { recommendPlanetTopologyV139 } from "./systems/clanWarPlanetTopologyAdvisorV139";
import {
  randomizePlanetDraftV144, selectablePlanetRandomFieldsV144,
  type PlanetAdvancedFieldV144, type PlanetRandomScopeV144,
} from "./systems/clanWarPlanetDraftRandomV144";
import {
  DEFAULT_WAR_PLANET_RECIPE_V103, WAR_PLANET_RECIPE_FIELDS_V103,
  seedFromTextV103, type WarPlanetRecipeFieldV103, type WarPlanetRecipeV103,
} from "./systems/clanWarPlanetGeneratorV103";
import {
  describeProceduralWarPlanetV103, encodeWarPlanetRecipeCodeV103, resolveProceduralWarPlanetV103, validateWarPlanetRecipeAnyV103,
  type GeneratedWarPlanetAnyV103, type WarPlanetRecipeAnyV103, type WarPlanetSummaryV103,
} from "./systems/clanWarProceduralV103";
import {
  applyWarPlanetAmbiencePresetV114, applyWarPlanetPresetV103, applyWarPlanetStrategicPresetV114, prepareWarPlanetVariantV103,
  WAR_PLANET_AMBIENCE_PRESETS_V114, WAR_PLANET_STRATEGIC_PRESETS_V114,
  type WarPlanetAmbiencePresetV114, type WarPlanetPresetV103, type WarPlanetStrategicPresetV114,
} from "./systems/clanWarPlanetDraftV103";
import { WAR_BIOME_LABELS_V96 } from "./systems/clanWarPlanetLabelsV102";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import {
  DEFAULT_WAR_PLANET_RECIPE_V115, type WarPlanetRecipeV115,
} from "./systems/clanWarPlanetGeneratorV115";
import { PLANET_SIZE_LABELS_V115, WAR_SHAPE_TEMPLATES_V115, type PlanetSizeV115 } from "./systems/clanWarShapeAtlasV115";
import { WAR_PLANET_LAND_TEXTURES_V115, WAR_PLANET_LIQUID_TEXTURES_V115 } from "./systems/clanWarTextureLibraryV115";
import { createWarSimulationV85 } from "./systems/clanWarV85";
import { analyzeWarPlanetStrategyV114 } from "./systems/clanWarPlanetStrategyV114";
import { analyzeWarPlanetPhysicalIndexV125 } from "./systems/clanWarPlanetPhysicalIndexV125";
import { analyzePlanetPhysicalSurfaceV136 } from "./systems/clanWarPlanetSurfaceBudgetV136";
import { describeWarPlanetMaterialsV114 } from "./systems/clanWarPlanetMaterialCodexV114";
import { rememberGeneratedWorldV103, useGeneratedWarCatalogV103 } from "./useGeneratedWarCatalogV103";
import { PLANET_GENERATOR_CONTROLS_V103, PLANET_GENERATOR_SECTIONS_V103, type PlanetGeneratorSelectFieldV103 } from "./planetGeneratorControlsV103";
import styles from "./PlanetGeneratorV103.module.css";

function numericSeed(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Saisissez une graine, un nombre ou un nom de votre choix.");
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value > 0xffffffff) throw new Error("Une graine numérique doit être comprise entre 0 et 4 294 967 295.");
    return value;
  }
  return seedFromTextV103(trimmed);
}

function entropy(): number {
  return typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
}

function worldForRecipe(recipe: WarPlanetRecipeAnyV103): GeneratedWarPlanetAnyV103 {
  const world = resolveProceduralWarPlanetV103(encodeWarPlanetRecipeCodeV103(recipe));
  if (!world) throw new Error("Ce monde n’a pas pu être reconstruit.");
  return world;
}

function convertToV103Recipe(recipe: WarPlanetRecipeAnyV103): WarPlanetRecipeV103 {
  if (recipe.version === 102) return prepareWarPlanetVariantV103(recipe);
  if (recipe.version === 103) return { ...recipe };
  const { version, planetSize, islandShape, continentShape, regionShape, landMaterial, liquidMaterial, ...base } = recipe;
  return { ...base, version: 103 };
}

function downloadJson(planet: GeneratedWarPlanetAnyV103) {
  const details = planet.procedural;
  const contents = JSON.stringify({
    format: "yautja-war-planet", version: details.recipe.version, code: planet.id, recipe: details.recipe,
    name: planet.name, description: planet.description, environment: details.environment,
    landmasses: details.landmasses, regions: details.regions, traits: details.traits,
    strategicDossier: analyzeWarPlanetStrategyV114(planet),
    materialDossier: describeWarPlanetMaterialsV114(planet),
    ...("hydrology" in details ? { hydrology: {
      coveredFraction: details.hydrology.coveredFraction,
      features: details.hydrology.features.map(({ id, kind, name, description, regionIds }) => ({ id, kind, name, description, regionIds })),
    } } : {}),
  }, null, 2) + "\n";
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `${planet.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface ModuleControlProps {
  field: PlanetGeneratorSelectFieldV103;
  recipe: WarPlanetRecipeV103;
  locked: boolean;
  prefix: string;
  onEdit: (field: PlanetGeneratorSelectFieldV103, value: string | number) => void;
  onLock: (field: WarPlanetRecipeFieldV103) => void;
  onRandom: (field: WarPlanetRecipeFieldV103) => void;
}

function ModuleControl({ field, recipe, locked, prefix, onEdit, onLock, onRandom }: ModuleControlProps) {
  const control = PLANET_GENERATOR_CONTROLS_V103[field];
  const helpId = control.help ? `${prefix}-${field}-help` : undefined;
  return <div className={styles.control} data-generator-field={field}>
    <label htmlFor={`${prefix}-${field}`}>{control.label}</label>
    <select id={`${prefix}-${field}`} value={recipe[field]} aria-describedby={helpId} onChange={event => onEdit(field, typeof recipe[field] === "number" ? Number(event.target.value) : event.target.value)}>
      {control.choices.map(choice => {
        const unavailable = field === "territoryCount" ? Number(choice.value) < 3 * recipe.regionCount : field === "regionCount" ? Number(choice.value) * 3 > recipe.territoryCount : false;
        return <option key={choice.value} value={choice.value} disabled={unavailable}>{choice.label}{unavailable ? " — format incompatible" : ""}</option>;
      })}
    </select>
    {control.help && <p className={styles.hint} id={helpId}>{control.help}</p>}
    <div className={styles.controlTools}>
      <label className={styles.lock}><input type="checkbox" checked={locked} aria-label={`Conserver : ${control.label}`} onChange={() => onLock(field)}/><span>Conserver</span></label>
      <button type="button" disabled={locked} aria-label={`Tirer au hasard : ${control.label}`} onClick={() => onRandom(field)}>Au hasard</button>
    </div>
  </div>;
}

interface PlanetGeneratorV103Props {
  activePlanet?: WarPlanetV96;
  pending?: boolean;
  onOpen: (planetId: string) => boolean | void;
}

function PlanetQuicklook({ planet, visualProfile }: { planet: WarPlanetV96; visualProfile?: PlanetVisualProfileV134 | null }) {
  const [ready, setReady] = useState(false);
  return <div className={styles.quicklook} aria-hidden="true" data-testid="planet-generator-quicklook-v103">
    {!ready && <span className={styles.quicklookFallback} style={{ background: `radial-gradient(circle at 28% 24%,${planet.surface.accent},${planet.surface.base} 35%,${planet.surface.deep} 75%,#020a10)` }}/>}
    <PlanetMaterialCanvasV101 planet={planet} regionalKit={visualProfile?.kit}
      regionalPbr={visualProfile?.quality === "pbr"}
      coastalInfluenceKm={visualProfile?.coastalInfluenceKm} resolution={320} onReady={setReady}/>
  </div>;
}

/** The preview and active war are immutable while the recipe is being edited.
 * Imports retain their version; upgrading a V102 recipe requires its own action. */
export default function PlanetGeneratorV103({ activePlanet, pending = false, onOpen }: PlanetGeneratorV103Props) {
  const initialRecipe = activePlanet?.procedural?.recipe ?? DEFAULT_WAR_PLANET_RECIPE_V103;
  const [draft, setDraft] = useState<WarPlanetRecipeV103>(() => convertToV103Recipe(initialRecipe));
  const [advancedV115, setAdvancedV115] = useState(initialRecipe.version === 115);
  const [planetSizeV115, setPlanetSizeV115] = useState<PlanetSizeV115>(initialRecipe.version === 115 ? initialRecipe.planetSize : DEFAULT_WAR_PLANET_RECIPE_V115.planetSize);
  const [islandShapeV115, setIslandShapeV115] = useState(initialRecipe.version === 115 ? initialRecipe.islandShape : DEFAULT_WAR_PLANET_RECIPE_V115.islandShape);
  const [continentShapeV115, setContinentShapeV115] = useState(initialRecipe.version === 115 ? initialRecipe.continentShape : DEFAULT_WAR_PLANET_RECIPE_V115.continentShape);
  const [regionShapeV115, setRegionShapeV115] = useState(initialRecipe.version === 115 ? initialRecipe.regionShape : DEFAULT_WAR_PLANET_RECIPE_V115.regionShape);
  const [landMaterialV115, setLandMaterialV115] = useState(initialRecipe.version === 115 ? initialRecipe.landMaterial : DEFAULT_WAR_PLANET_RECIPE_V115.landMaterial);
  const [liquidMaterialV115, setLiquidMaterialV115] = useState(initialRecipe.version === 115 ? initialRecipe.liquidMaterial : DEFAULT_WAR_PLANET_RECIPE_V115.liquidMaterial);
  const [seedText, setSeedText] = useState(() => String(initialRecipe.seed));
  const [planet, setPlanet] = useState(() => worldForRecipe(initialRecipe));
  const [mainVisualProfileV134, setMainVisualProfileV134] = useState<PlanetVisualProfileV134 | null>(null);
  const [editorEnabled, setEditorEnabled] = useState(initialRecipe.version !== 102);
  const [locked, setLocked] = useState<WarPlanetRecipeFieldV103[]>([]);
  const [advancedLockedV144, setAdvancedLockedV144] = useState<PlanetAdvancedFieldV144[]>([]);
  const [selectedId, setSelectedId] = useState("CON-T02");
  // Explicit dossier navigation may reset only the atlas camera, not the war.
  const [atlasFocusRevision, setAtlasFocusRevision] = useState(0);
  const [targetId, setTargetId] = useState("");
  const [importCode, setImportCode] = useState("");
  const [message, setMessage] = useState("");
  const [memoryOpening, setMemoryOpening] = useState<string | null>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  // A later world choice cancels older file reads even when its input is rejected.
  const importIntent = useRef(0);
  const unique = `planet-generator-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const catalogue = useGeneratedWarCatalogV103();
  const worlds = useMemo(() => catalogue.ids.map(describeProceduralWarPlanetV103).filter((item): item is WarPlanetSummaryV103 => Boolean(item)), [catalogue.ids]);
  const simulation = useMemo(() => createWarSimulationV85(undefined, planet.id), [planet.id]);
  const selected = planet.definitions.find(item => item.id === selectedId) ?? planet.definitions[0];
  const target = selected.neighbors.includes(targetId) ? targetId : selected.neighbors[0];
  const regionId = planet.territories.find(item => item.id === selected.id)?.regionId;
  const details = planet.procedural;
  const strategic = useMemo(() => analyzeWarPlanetStrategyV114(planet), [planet]);
  const physicalIndex = useMemo(() => analyzeWarPlanetPhysicalIndexV125(planet), [planet]);
  const surfaceBudgetV136 = useMemo(() => analyzePlanetPhysicalSurfaceV136(planet), [planet]);
  const materialDossier = useMemo(() => describeWarPlanetMaterialsV114(planet), [planet]);
  const topologySuggestionV139 = recommendPlanetTopologyV139(planetSizeV115,draft,locked);
  const availableRandomFieldsV144 = (scope: PlanetRandomScopeV144) =>
    selectablePlanetRandomFieldsV144(scope, advancedV115, locked, advancedLockedV144);
  function currentRecipe(): WarPlanetRecipeAnyV103 {
    const base = { ...draft, seed: numericSeed(seedText) };
    if (!advancedV115) return base;
    return { ...base, version: 115, planetSize: planetSizeV115, islandShape: islandShapeV115,
      continentShape: continentShapeV115, regionShape: regionShapeV115,
      landMaterial: landMaterialV115, liquidMaterial: liquidMaterialV115 };
  }
  let changed = editorEnabled;
  try { changed = editorEnabled && encodeWarPlanetRecipeCodeV103(currentRecipe()) !== planet.id; }
  catch { /* Invalid drafts must not replace the valid preview. */ }

  function showWorld(next: GeneratedWarPlanetAnyV103) {
    importIntent.current++;
    const recipe = next.procedural.recipe;
    setPlanet(next); setDraft(convertToV103Recipe(recipe)); setMainVisualProfileV134(null);
    setEditorEnabled(recipe.version !== 102); setSeedText(String(recipe.seed));
    setAdvancedV115(recipe.version === 115);
    if (recipe.version === 115) {
      setPlanetSizeV115(recipe.planetSize); setIslandShapeV115(recipe.islandShape);
      setContinentShapeV115(recipe.continentShape); setRegionShapeV115(recipe.regionShape);
      setLandMaterialV115(recipe.landMaterial); setLiquidMaterialV115(recipe.liquidMaterial);
    }
    setSelectedId(next.definitions[1]?.id ?? next.definitions[0].id); setTargetId(""); setMemoryOpening(null);
  }

  function generate() {
    importIntent.current++;
    try {
      const next = worldForRecipe(currentRecipe());
      showWorld(next); setMessage(`${next.name} est prêt à explorer : ${next.territories.length} territoires et ${next.regions.length} régions.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cette combinaison ne peut pas être générée."); }
  }

  function edit(field: PlanetGeneratorSelectFieldV103, value: string | number) {
    importIntent.current++;
    setDraft(current => ({ ...current, [field]: value }));
  }

  function toggleLock(field: WarPlanetRecipeFieldV103) {
    setLocked(current => current.includes(field) ? current.filter(item => item !== field) : [...current, field]);
  }

  function toggleAdvancedLockV144(field: PlanetAdvancedFieldV144) {
    setAdvancedLockedV144(current => current.includes(field)
      ? current.filter(item => item !== field) : [...current, field]);
  }

  function randomize(scope: PlanetRandomScopeV144) {
    importIntent.current++;
    try {
      const available = availableRandomFieldsV144(scope);
      if (!available.length) {
        setMessage("Cette section est entièrement verrouillée. Déverrouillez au moins un réglage pour la mélanger.");
        return;
      }
      const base = { ...draft, seed: available.includes("seed") ? draft.seed : numericSeed(seedText) };
      const result = randomizePlanetDraftV144({
        recipe: base,
        advanced: {
          planetSize: planetSizeV115, islandShape: islandShapeV115,
          continentShape: continentShapeV115, regionShape: regionShapeV115,
          landMaterial: landMaterialV115, liquidMaterial: liquidMaterialV115,
        },
        advancedEnabled: advancedV115, lockedV103: locked,
        lockedV115: advancedLockedV144, scope, entropy: entropy(),
      });
      if (result.changedFields.length === 0) {
        setMessage("Aucune variation disponible avec les verrous actuels.");
        return;
      }
      setDraft(result.recipe);
      if (result.changedFields.includes("seed")) setSeedText(String(result.recipe.seed));
      if (advancedV115) {
        setPlanetSizeV115(result.advanced.planetSize);
        setIslandShapeV115(result.advanced.islandShape);
        setContinentShapeV115(result.advanced.continentShape);
        setRegionShapeV115(result.advanced.regionShape);
        setLandMaterialV115(result.advanced.landMaterial);
        setLiquidMaterialV115(result.advanced.liquidMaterial);
      }
      const label = typeof scope === "object" ? "Réglage individuel" :
        scope === "all" ? "Tirage aléatoire global" :
        scope === "v115" ? "Section avancée V115" :
        scope === "v115-shapes" ? "Formes V115" :
        scope === "v115-materials" ? "Matières V115" :
        scope === "v115-size" ? "Taille physique V115" :
        scope === "seed" ? "Graine" : "Section " + scope;
      setMessage(label + " : " + result.changedFields.length +
        " réglage(s) modifié(s), verrous préservés. Générez l’aperçu pour appliquer ce brouillon.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le tirage n’a pas pu être préparé.");
    }
  }

  function preset(value: WarPlanetPresetV103) {
    importIntent.current++;
    try {
      const next = applyWarPlanetPresetV103({ ...draft, seed: numericSeed(seedText) }, value, locked);
      setDraft(next);
      setMessage(`Base ${value === "earthlike" ? "terrestre" : "extraterrestre"} préparée. La graine et les réglages conservés restent identiques ; le format respecte trois territoires minimum par région. Générez l’aperçu pour l’appliquer.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cette base n’a pas pu être préparée."); }
  }

  function strategicPreset(value: WarPlanetStrategicPresetV114) {
    importIntent.current++;
    try {
      setDraft(applyWarPlanetStrategicPresetV114(draft, value, locked));
      setMessage(`Format stratégique « ${WAR_PLANET_STRATEGIC_PRESETS_V114[value]} » préparé. Les matières, la graine et tous les réglages conservés restent indépendants.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ce format stratégique ne peut pas être préparé avec les verrous actuels."); }
  }

  function ambiencePreset(value: WarPlanetAmbiencePresetV114) {
    importIntent.current++;
    try {
      setDraft(applyWarPlanetAmbiencePresetV114(draft, value, locked));
      setMessage(`Ambiance « ${WAR_PLANET_AMBIENCE_PRESETS_V114[value]} » préparée. La géographie et les réglages conservés restent inchangés.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cette ambiance ne peut pas être préparée avec les verrous actuels."); }
  }

  function prepareVariant() {
    if (details.recipe.version !== 102) return;
    importIntent.current++; setDraft(prepareWarPlanetVariantV103(details.recipe)); setSeedText(String(details.recipe.seed)); setEditorEnabled(true); setAdvancedV115(false);
    setMessage("Variante préparée. Générer l’aperçu créera une nouvelle géographie et un nouveau code. Le monde d’origine et sa progression restent accessibles avec leur code.");
  }

  function importWorld() {
    importIntent.current++;
    const next = resolveProceduralWarPlanetV103(importCode.trim());
    if (!next) { setMessage("Ce code de monde n’est pas reconnu. Vérifiez qu’il est complet."); return; }
    showWorld(next); setMessage(`${next.name} retrouvé à partir de sa recette d’origine.`);
  }

  function rediscover(id: string) {
    try {
      const next = resolveProceduralWarPlanetV103(id);
      if (!next) throw new Error("Ce code de monde n’est pas reconnu.");
      showWorld(next); setMessage(`${next.name} retrouvé. Ouvrez son front pour reprendre la guerre.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ce monde n’a pas pu être retrouvé."); }
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
      const recipe = validateWarPlanetRecipeAnyV103(record.recipe);
      if (record.format !== "yautja-war-planet" || !recipe || record.version !== recipe.version || record.code !== encodeWarPlanetRecipeCodeV103(recipe)) throw new Error("Le code et les paramètres de cette fiche ne correspondent pas.");
      showWorld(worldForRecipe(recipe)); setMessage("Fiche importée. Le monde conserve sa version et sa géographie d’origine.");
    } catch (error) { if (importIntent.current === intent) setMessage(error instanceof Error ? error.message : "La fiche n’a pas pu être ouverte."); }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(planet.id); setMessage("Code copié. Il retrouve exactement ce monde et ses régions.");
    } catch { codeRef.current?.focus(); codeRef.current?.select(); setMessage("La copie automatique est indisponible. Le code est sélectionné : copiez-le depuis ce champ."); }
  }

  function remember(open: boolean) {
    if (pending) return;
    const result = rememberGeneratedWorldV103(planet.id);
    if (!result.persisted) {
      setMemoryOpening(open ? planet.id : null);
      setMessage(`${result.issue ?? "Le raccourci ne peut pas être mémorisé."} Conservez le code ou la fiche pour retrouver ce monde.`);
      return;
    }
    setMemoryOpening(null);
    setMessage(`${planet.name} ajouté aux mondes retrouvés sur cet appareil.${result.issue ? ` ${result.issue}` : ""}`);
    if (open) openPreview();
  }

  function openPreview() {
    if (pending) return;
    if (onOpen(planet.id) === false) {
      setMessage("Ce front n’a pas été ouvert. Enregistrez les progrès des autres fronts avant d’en ouvrir un nouveau. Le code, la fiche et les textures restent disponibles ici.");
      return;
    }
    setMemoryOpening(null);
  }

  return <section className={styles.generator} aria-labelledby={`${unique}-title`} data-testid="planet-generator-v103" data-preview-planet-code={planet.id} data-draft-modified={changed} data-recipe-version={details.recipe.version}>
    <header className={styles.header}><div><p className={styles.eyebrow}>EXPLORATION / MONDES À COMPOSER</p><h3 id={`${unique}-title`}>Générateur de mondes</h3><p>Choisissez l’échelle de la guerre, dessinez ses terres et composez chaque matière. Une graine et ses réglages retrouvent exactement le même monde.</p></div><span className={styles.badge}>Aperçu : {planet.regions.length} régions · {planet.territories.length} territoires</span></header>
    <div className={styles.workspace}>
      <div className={styles.composer}>
        {!editorEnabled ? <div className={styles.legacy} data-testid="planet-legacy-recipe-v103"><p className={styles.eyebrow}>RECETTE D’ORIGINE · V102</p><h4>Ce monde conserve son histoire</h4><p>Son code retrouve sa géographie exacte, ses textures et son front existant. Vous pouvez l’explorer, exporter sa fiche ou reprendre la guerre.</p><p>Préparer une variante ouvre les nouveaux réglages. Sa génération créera une nouvelle planète avec un nouveau code et un front distinct.</p><button type="button" className={styles.primary} onClick={prepareVariant}>Préparer une variante</button></div> : <form className={styles.recipe} onSubmit={event => { event.preventDefault(); generate(); }}>
          <div className={styles.composerHeading}><h4>Composer un monde</h4><span>{locked.length + (advancedV115 ? advancedLockedV144.length : 0)} réglage(s) conservé(s)</span></div>
          <div className={styles.globalRandomV144} data-testid="planet-random-global-v144">
            <button type="button" className={styles.primary} data-testid="planet-random-all-v144"
              disabled={!availableRandomFieldsV144("all").length} onClick={() => randomize("all")}>
              Tout aléatoire · {advancedV115 ? "V103 + V115" : "V103"}
            </button>
            <p>Un seul tirage pour toutes les sections actives ; « Conserver » protège les champs verrouillés. Le monde affiché ne change qu’après « Générer l’aperçu ».</p>
          </div>
          {details.recipe.version === 102 && <p className={styles.variantNotice}>Variante en préparation : l’aperçu affiche encore le monde d’origine. La génération créera un nouveau code.</p>}
          <div className={styles.control} data-generator-field="seed"><label htmlFor={`${unique}-seed`}>Graine du monde</label><input id={`${unique}-seed`} value={seedText} maxLength={64} autoComplete="off" spellCheck={false} onChange={event => { importIntent.current++; setSeedText(event.target.value); }} placeholder="Un nom ou un nombre"/><div className={styles.controlTools}><label className={styles.lock}><input type="checkbox" checked={locked.includes("seed")} aria-label="Conserver : Graine du monde" onChange={() => toggleLock("seed")}/><span>Conserver</span></label><button type="button" disabled={locked.includes("seed")} aria-label="Tirer au hasard : Graine du monde" onClick={() => randomize({ field: "seed" })}>Au hasard</button></div></div>
          <div className={styles.presetBar}><span>Point de départ</span><button type="button" disabled={locked.length === WAR_PLANET_RECIPE_FIELDS_V103.length} onClick={() => preset("earthlike")}>Base terrestre</button><button type="button" disabled={locked.length === WAR_PLANET_RECIPE_FIELDS_V103.length} onClick={() => preset("alien")}>Base extraterrestre</button></div>
          <div className={styles.presetBar}><span>Génération avancée versionnée</span><button type="button" onClick={() => { importIntent.current++; setAdvancedV115(value => !value); }}>{advancedV115 ? "Revenir aux réglages V103" : "Activer le générateur V115"}</button></div>
          <div className={styles.presetBar} data-testid="planet-strategy-presets-v114"><span>Format stratégique</span>{Object.entries(WAR_PLANET_STRATEGIC_PRESETS_V114).map(([id, label]) => <button key={id} type="button" disabled={locked.length === WAR_PLANET_RECIPE_FIELDS_V103.length} onClick={() => strategicPreset(id as WarPlanetStrategicPresetV114)}>{label}</button>)}</div>
          <div className={styles.presetBar} data-testid="planet-ambience-presets-v114"><span>Ambiance de planète</span>{Object.entries(WAR_PLANET_AMBIENCE_PRESETS_V114).map(([id, label]) => <button key={id} type="button" disabled={locked.length === WAR_PLANET_RECIPE_FIELDS_V103.length} onClick={() => ambiencePreset(id as WarPlanetAmbiencePresetV114)}>{label}</button>)}</div>
          <details className={styles.module} open={advancedV115} data-testid="planet-generator-v115-modules">
            <summary><span><strong>V115 · taille physique, 120 formes et 32 textures</strong><small>6 modules indépendants</small></span></summary>
            <div className={styles.moduleBody}>
              <label className={styles.lock}><input type="checkbox" checked={advancedV115}
                onChange={event => { importIntent.current++; setAdvancedV115(event.target.checked); }}/>
                <span>Activer une nouvelle recette V115 (ancien monde préservé)</span></label>
              {advancedV115 && <div className={styles.advancedRandomBarV144} data-testid="planet-random-advanced-v144">
                <button type="button" data-testid="planet-random-v115-all-v144"
                  disabled={!availableRandomFieldsV144("v115").length} onClick={() => randomize("v115")}>
                  Aléatoire : toute la section V115
                </button>
                <button type="button" data-testid="planet-random-v115-size-v144"
                  disabled={!availableRandomFieldsV144("v115-size").length} onClick={() => randomize("v115-size")}>
                  Taille au hasard
                </button>
                <button type="button" data-testid="planet-random-v115-shapes-v144"
                  disabled={!availableRandomFieldsV144("v115-shapes").length} onClick={() => randomize("v115-shapes")}>
                  Formes au hasard
                </button>
                <button type="button" data-testid="planet-random-v115-materials-v144"
                  disabled={!availableRandomFieldsV144("v115-materials").length} onClick={() => randomize("v115-materials")}>
                  Textures au hasard
                </button>
              </div>}
              {advancedV115 && <div className={styles.controlGrid}>
                <div className={styles.control} data-generator-advanced-field="planetSize"><label htmlFor={`${unique}-planet-size-v115`}>Rayon de la planète</label>
                  <select id={`${unique}-planet-size-v115`} value={planetSizeV115} onChange={event => { importIntent.current++; setPlanetSizeV115(event.target.value as PlanetSizeV115); }}>
                    {Object.entries(PLANET_SIZE_LABELS_V115).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                  <div className={styles.controlTools}>
                    <label className={styles.lock}><input type="checkbox" checked={advancedLockedV144.includes("planetSize")}
                      aria-label="Conserver : Rayon de la planète" onChange={() => toggleAdvancedLockV144("planetSize")}/><span>Conserver</span></label>
                    <button type="button" aria-label="Tirer au hasard : Rayon de la planète"
                      disabled={advancedLockedV144.includes("planetSize")} onClick={() => randomize({ field: "planetSize" })}>Au hasard</button>
                  </div>
                </div>
                <div className={styles.control} data-testid="planet-scale-topology-v139">
                  <p className={styles.hint}>Maillage conseillé : {topologySuggestionV139.recommendedTerritories} territoires, {topologySuggestionV139.recommendedRegions} régions. Pour la géographie sélectionnée, {topologySuggestionV139.range[0]} à {topologySuggestionV139.range[1]} masses terrestres. Plafond : 96 territoires et 12 régions.</p>
                  <button type="button" data-testid="planet-scale-apply-v139"
                    disabled={topologySuggestionV139.locked ||
                      (topologySuggestionV139.territoryCount===draft.territoryCount &&
                       topologySuggestionV139.regionCount===draft.regionCount)}
                    onClick={()=>{
                      importIntent.current++;
                      setDraft(current=>({...current,
                        territoryCount:topologySuggestionV139.territoryCount,
                        regionCount:topologySuggestionV139.regionCount}));
                      setMessage("Maillage adapté au rayon dans le brouillon V115 ; générez la planète pour appliquer la nouvelle géographie.");
                    }}>Adapter le maillage à cette taille</button>
                </div>
                {([
                  ["island", "Forme des îles", islandShapeV115, setIslandShapeV115],
                  ["continent", "Forme des continents", continentShapeV115, setContinentShapeV115],
                  ["region", "Forme des régions", regionShapeV115, setRegionShapeV115],
                ] as const).map(([category, label, value, setValue]) => {
                  const field: PlanetAdvancedFieldV144 = category === "island" ? "islandShape" :
                    category === "continent" ? "continentShape" : "regionShape";
                  return <div className={styles.control} key={category} data-generator-advanced-field={field}>
                    <label htmlFor={`${unique}-${category}-shape-v115`}>{label} · 40 modèles</label>
                    <select id={`${unique}-${category}-shape-v115`} value={value}
                      onChange={event => { importIntent.current++; setValue(Number(event.target.value)); }}>
                      {WAR_SHAPE_TEMPLATES_V115[category].map(template => <option value={template.index} key={template.id}>{template.name}</option>)}
                    </select>
                    <div className={styles.controlTools}>
                      <label className={styles.lock}><input type="checkbox" checked={advancedLockedV144.includes(field)}
                        aria-label={`Conserver : ${label}`} onChange={() => toggleAdvancedLockV144(field)}/><span>Conserver</span></label>
                      <button type="button" disabled={advancedLockedV144.includes(field)}
                        aria-label={`Tirer au hasard : ${label}`} onClick={() => randomize({ field })}>Au hasard</button>
                    </div>
                  </div>;
                })}
                {([
                  ["land", "Texture des terres", landMaterialV115, setLandMaterialV115, WAR_PLANET_LAND_TEXTURES_V115],
                  ["liquid", "Texture des mers et liquides", liquidMaterialV115, setLiquidMaterialV115, WAR_PLANET_LIQUID_TEXTURES_V115],
                ] as const).map(([category, label, value, setValue, textures]) => {
                  const field: PlanetAdvancedFieldV144 = category === "land" ? "landMaterial" : "liquidMaterial";
                  return <div className={styles.control} key={category} data-generator-advanced-field={field}>
                    <label htmlFor={`${unique}-${category}-detail-v115`}>{label} · 16 matières</label>
                    <select id={`${unique}-${category}-detail-v115`} value={value}
                      onChange={event => { importIntent.current++; setValue(Number(event.target.value)); }}>
                      {textures.map((material, index) => <option value={index} key={material.id}>{material.name} · {material.origin === "alien" ? "extraterrestre" : "terrestre"}</option>)}
                    </select>
                    <div className={styles.controlTools}>
                      <label className={styles.lock}><input type="checkbox" checked={advancedLockedV144.includes(field)}
                        aria-label={`Conserver : ${label}`} onChange={() => toggleAdvancedLockV144(field)}/><span>Conserver</span></label>
                      <button type="button" disabled={advancedLockedV144.includes(field)}
                        aria-label={`Tirer au hasard : ${label}`} onClick={() => randomize({ field })}>Au hasard</button>
                    </div>
                  </div>;
                })}
              </div>}
              {advancedV115 && <PlanetShapePreviewV125 island={islandShapeV115} continent={continentShapeV115} region={regionShapeV115}/>}
              {advancedV115 && <PlanetShapeLibraryV137 island={islandShapeV115}
                continent={continentShapeV115} region={regionShapeV115} planetSize={planetSizeV115}
                onChoose={(category,index)=>{
                  importIntent.current++;
                  if(category==="island")setIslandShapeV115(index);
                  else if(category==="continent")setContinentShapeV115(index);
                  else setRegionShapeV115(index);
                  setMessage("Forme V137 choisie dans le brouillon. Générez la planète pour appliquer sa géographie.");
                }}/>}
              <p className={styles.hint}>La taille modifie les kilomètres et km² réels du monde, sans modifier artificiellement les coûts de guerre. Les formes changent véritablement les contours et les frontières des régions ; les 32 matières enrichissent le rendu WebGL. Une nouvelle recette reçoit un code V115 distinct.</p>
            </div>
          </details>
          <p className={styles.hint}>« Conserver » protège un réglage des bases et des tirages au hasard. Vous pouvez toujours le modifier directement. Les motifs règlent les textures, indépendamment de la taille du monde.</p>
          <div className={styles.modules}>{PLANET_GENERATOR_SECTIONS_V103.map((section, index) =>
            <details className={styles.module} key={section.id} open={index === 0} data-generator-section={section.id}>
              <summary><span><strong>{section.title}</strong><small>{section.fields.length} réglage{section.fields.length > 1 ? "s" : ""}</small></span></summary>
              <div className={styles.moduleBody}>
                <div className={styles.sectionRandomBarV144} data-testid="planet-random-section-toolbar-v144" data-section={section.id}>
                  <p className={styles.moduleDescription}>{section.description}</p>
                  <button type="button" data-testid="planet-random-section-v144" data-section={section.id}
                    disabled={!availableRandomFieldsV144(section.id as PlanetRandomScopeV144).length}
                    onClick={() => randomize(section.id as PlanetRandomScopeV144)}>
                    Aléatoire : cette section
                  </button>
                </div>
                {section.id === "geography" && <p className={styles.hint}>Chaque région contient au moins trois territoires. Pour un petit front, réduisez d’abord le nombre de régions ; pour davantage de régions, augmentez d’abord les territoires.</p>}
                <div className={styles.controlGrid}>{section.fields.map(field =>
                  <ModuleControl key={field} field={field} prefix={unique} recipe={draft}
                    locked={locked.includes(field)} onEdit={edit} onLock={toggleLock}
                    onRandom={field => randomize({ field })}/>)}</div>
              </div>
            </details>)}</div>
          <div className={styles.actions}><button type="submit" className={styles.primary}>Générer l’aperçu</button>
            <button type="button" disabled={!availableRandomFieldsV144("all").length}
              onClick={() => randomize("all")}>Tout mélanger au hasard</button></div>
          <p className={styles.draftStatus} data-testid="planet-draft-status-v103">{changed ? "Brouillon modifié : générez l’aperçu pour appliquer les réglages." : "L’aperçu correspond à ces réglages."} La partie active ne change qu’à l’ouverture du front.</p>
        </form>}
      </div>
      <div className={styles.identity}>
        <p className={styles.eyebrow}>MONDE EN EXPLORATION</p><h4>{planet.name}</h4><p className={styles.subtitle}>{planet.subtitle}</p><PlanetQuicklook key={planet.id} planet={planet} visualProfile={mainVisualProfileV134}/><p>{planet.description}</p>
        <p className={styles.hint} data-testid="planet-main-kit-status-v133">{mainVisualProfileV134
          ? `Matières régionales ${mainVisualProfileV134.quality.toUpperCase()}, côte ${mainVisualProfileV134.coastalInfluenceKm} km : appliquées au globe principal et à l’atlas stratégique (non sauvegardées dans la campagne).`
          : "Globe principal : apparence native de la recette actuelle."}</p>
        <dl className={styles.facts}>
          <div><dt>Format de la guerre</dt><dd>{planet.territories.length} territoires · {planet.regions.length} régions</dd></div>
          <div><dt>Terres</dt><dd>{Math.round(planet.landFraction * 100)} % du globe</dd></div>
          <div><dt>Continents et îles</dt><dd>{planet.landmasses.length} masses terrestres</dd></div>
          <div><dt>Milieu entre les terres</dt><dd>{details.environment.liquid}</dd></div>
          <div><dt>Climat</dt><dd>{details.environment.climate}</dd></div>
          <div><dt>Atmosphère</dt><dd>{details.environment.atmosphere}</dd></div>
          <div><dt>Gravité / cycle diurne</dt><dd>{details.environment.gravity.toLocaleString("fr")} g · {details.environment.dayLengthHours.toLocaleString("fr")} h</dd></div>
          <div><dt>Recette du monde</dt><dd>V{details.recipe.version} · graine {details.recipe.seed}</dd></div>
          {"physical" in details && "shapes" in details && "materialDiversity" in details && details.recipe.version === 115 && <><div><dt>Taille physique</dt><dd>Rayon {details.physical.radiusKm.toLocaleString("fr-FR")} km · surface {details.physical.surfaceKm2.toLocaleString("fr-FR")} km²</dd></div>
          <div><dt>Formes de terrain</dt><dd>{details.shapes.continent} · {details.shapes.island} · {details.shapes.region}</dd></div>
          <div><dt>Textures complémentaires</dt><dd>{details.materialDiversity.land} · {details.materialDiversity.liquid}</dd></div></>}
          {physicalIndex && <><div><dt>Terres émergées</dt><dd>{physicalIndex.landAreaKm2.toLocaleString("fr-FR")} km²</dd></div>
          {surfaceBudgetV136 && <><div><dt>Milieux intérieurs cartographiés</dt><dd>{surfaceBudgetV136.inlandMediumKm2.toLocaleString("fr-FR")} km² · {surfaceBudgetV136.inlandFeatureCount} bassins/chenaux</dd></div>
          <div><dt>Milieu extérieur aux continents</dt><dd>{surfaceBudgetV136.exteriorMediumKm2.toLocaleString("fr-FR")} km²</dd></div>
          <div><dt>Budget sphérique de surface</dt><dd>{surfaceBudgetV136.surfaceKm2.toLocaleString("fr-FR")} km²</dd></div></>}
          <div><dt>Étendues entre les terres</dt><dd>{physicalIndex.surroundingsKm2.toLocaleString("fr-FR")} km²</dd></div></>}
          <div><dt>Distance entre bases</dt><dd>{strategic.headquartersDistance} liaison{strategic.headquartersDistance > 1 ? "s" : ""}{strategic.headquartersDistanceKm !== undefined ? ` · ${strategic.headquartersDistanceKm.toLocaleString("fr-FR")} km` : ""}</dd></div>
          <div><dt>Points d’étranglement</dt><dd>{strategic.chokepointTerritoryIds.length} · {strategic.crossingCount} traversée{strategic.crossingCount > 1 ? "s" : ""}</dd></div>
        </dl>
        <div className={styles.openActions}><button type="button" className={styles.primary} disabled={pending || activePlanet?.id === planet.id} onClick={() => remember(true)}>{activePlanet?.id === planet.id ? "Front déjà actif" : "Ouvrir ce front"}</button><button type="button" disabled={pending} onClick={() => remember(false)}>Mémoriser ce monde</button><a className={styles.atlasLink} href={`#${unique}-atlas`}>Explorer l’atlas ↓</a></div>
        {memoryOpening === planet.id && <button type="button" disabled={pending} onClick={openPreview}>Ouvrir avec ce code sans mémoriser le raccourci</button>}
        <p className={styles.hint}>L’ouverture utilise le monde affiché dans cet aperçu. Sa progression existante sera reprise. Les caractéristiques de la fiche décrivent l’environnement ; les règles du mode déterminent les coûts de guerre.</p>
      </div>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{message}</p>
    <div className={styles.preview} id={`${unique}-atlas`} data-testid="planet-generator-atlas-v103"><ClanWarAtlasV95 key={`${planet.id}-${atlasFocusRevision}`} simulation={simulation} selectedTerritoryId={selected.id} targetTerritoryId={target} onSelectTerritory={id => { setSelectedId(id); setTargetId(""); }} onSelectTarget={setTargetId} visualProfile={mainVisualProfileV134}/></div>
    <PlanetLayerExportV102 key={planet.id} planet={planet} onApplyVisualProfile={setMainVisualProfileV134}/>
    <div className={styles.dossier}>
      <PlanetPreflightV149 key={planet.id} planet={planet} regionalKit={mainVisualProfileV134?.kit}/>
      <PlanetEnvironmentalDossierV146 key={planet.id} planet={planet}/>
      <PlanetEarthReferenceV147/>
      <section aria-label="Particularités du monde"><h4>Particularités de {planet.name}</h4><div className={styles.traits}>{details.traits.map(trait => <article key={trait.id}><h5>{trait.name}</h5><p>{trait.description}</p></article>)}</div></section>
      <section aria-label="Continents et îles"><h4>Continents et îles</h4><div className={styles.landmasses}>{details.landmasses.map(landmass => <article key={landmass.landmassId}><span>{landmass.kind === "island" ? "Île" : "Continent"}</span><h5>{landmass.name}</h5><p>{landmass.description}</p></article>)}</div></section>
      {"hydrology" in details && details.hydrology.features.length > 0 && <section aria-label="Bassins et cours intérieurs"><h4>Bassins et cours intérieurs</h4><div className={styles.landmasses}>{details.hydrology.features.map(feature => <article key={feature.id}><span>{feature.kind === "lake" ? "Bassin" : "Cours"}</span><h5>{feature.name}</h5><p>{feature.description}</p></article>)}</div></section>}
      <section aria-label="Lecture stratégique du monde" data-testid="planet-strategic-dossier-v114"><h4>Lecture stratégique</h4><p className={styles.hint}>Analyse dérivée uniquement de la carte publique : routes, régions, sites et revenus. Aucun stock ou effectif ennemi caché n’est consulté.</p><div className={styles.traits}><article><h5>Échelle du front</h5><p>{strategic.scale} · {strategic.topology} · {strategic.territoryCount} territoires / {strategic.regionCount} régions.</p></article><article><h5>Axes principaux</h5><p>Bases séparées par {strategic.headquartersDistance} liaisons. Corridor public : {strategic.headquartersPath.join(" → ") || "aucun chemin"}.</p></article><article><h5>Passages critiques</h5><p>{strategic.chokepointTerritoryIds.length ? strategic.chokepointTerritoryIds.join(" · ") : "Aucun point d’articulation unique"} · {strategic.crossingCount} traversée{strategic.crossingCount > 1 ? "s" : ""} balisée{strategic.crossingCount > 1 ? "s" : ""} de milieux entre terres.</p></article></div><div className={styles.regions}>{strategic.regions.map(region => { const first = planet.regions.find(item => item.id === region.regionId)?.territoryIds[0]; return <article key={region.regionId}><p className={styles.regionKind}>{region.territoryCount} territoires · {region.borderLinks} accès interrégion · {region.crossingLinks} traversée{region.crossingLinks > 1 ? "s" : ""}</p><h5>{region.name}</h5><p>Voisines : {region.neighboringRegionIds.join(" · ") || "aucune"}. Revenus de base : S {region.income.s} · M {region.income.m} · I {region.income.i}.{surfaceBudgetV136 && ` Sol estimé hors bassins : ${(surfaceBudgetV136.regions.find(item => item.regionId === region.regionId)?.estimatedNetDryKm2 ?? 0).toLocaleString("fr-FR")} km² (${(surfaceBudgetV136.regions.find(item => item.regionId === region.regionId)?.shareOfNetMappedLandPercent ?? 0).toLocaleString("fr-FR")} % des cellules nettes).`}</p><dl><div><dt>Points d’étranglement</dt><dd>{region.chokepointTerritoryIds.join(" · ") || "aucun"}</dd></div><div><dt>Base présente</dt><dd>{region.headquarters.length ? region.headquarters.join(" · ") : "non"}</dd></div></dl>{first && <button type="button" onClick={() => { setSelectedId(first); setTargetId(""); setAtlasFocusRevision(value => value + 1); document.getElementById(`${unique}-atlas`)?.scrollIntoView({ block: "start" }); }}>Voir cette région sur l’atlas</button>}</article>; })}</div></section>
      <section aria-label="Matériaux et milieux planétaires" data-testid="planet-material-codex-v114">
        <h4>Géologie, sols et « mers »</h4>
        <p className={styles.hint}>{materialDossier.rule}</p>
        <div className={styles.traits}><article><h5>{materialDossier.surface.title}</h5>
          <p>État : {materialDossier.surface.state} · matière : {materialDossier.surface.substrate}</p>
          <p>Motifs : {materialDossier.surface.structure}. {materialDossier.surface.peculiarity}</p>
          <p className={styles.regionKind}>Texture : {materialDossier.surface.sourceTextureId}</p></article></div>
        <div className={styles.regions}>{materialDossier.regions.map(region => <article key={region.regionId}>
          <p className={styles.regionKind}>{region.regionName} · {region.sourceTextureId}</p>
          <h5>{region.title}</h5>
          <p>Substrat : {region.substrate}. Motifs : {region.structure}.</p>
          <p>{region.peculiarity}</p>
        </article>)}</div>
      </section>
      <section aria-label="Régions et milieux"><h4>Régions et milieux</h4><p className={styles.hint}>Sélectionnez un territoire sur l’atlas pour retrouver sa région.</p><div className={styles.regions}>{details.regions.map(region => <article key={region.regionId} data-region-id={region.regionId} data-active-region={regionId === region.regionId}><p className={styles.regionKind}>{WAR_BIOME_LABELS_V96[region.biome]} · {planet.regions.find(item => item.id === region.regionId)?.territoryIds.length ?? 0} territoires</p><h5>{planet.regions.find(item => item.id === region.regionId)?.name ?? region.regionId}</h5><p>{region.description}</p><dl><div><dt>Climat</dt><dd>{region.climate}</dd></div><div><dt>Relief et particularités</dt><dd>{region.features.join(" · ")}</dd></div><div><dt>Ressources observées</dt><dd>{region.resources.join(" · ")}</dd></div></dl></article>)}</div></section>
    </div>
    <div className={styles.sharing}>
      <section><h4>Retrouver ce monde</h4><p>Le code inclut la graine et les réglages. Il partage le monde affiché dans l’aperçu, sans transférer la progression d’une guerre.</p><label>Code du monde<textarea ref={codeRef} readOnly rows={3} value={planet.id} spellCheck={false}/></label><div className={styles.actions}><button type="button" onClick={() => { void copyCode(); }}>Copier le code</button><button type="button" onClick={() => { try { downloadJson(planet); setMessage("Fiche du monde exportée avec sa recette d’origine et ses descriptions."); } catch { setMessage("La fiche n’a pas pu être téléchargée. Le code du monde reste disponible."); } }}>Télécharger la fiche</button></div></section>
      <section><h4>Explorer un monde partagé</h4><label>Importer un code de monde<input value={importCode} maxLength={256} autoComplete="off" spellCheck={false} onChange={event => { importIntent.current++; setImportCode(event.target.value); }} placeholder="Collez un code de monde"/></label><button type="button" disabled={!importCode.trim()} onClick={importWorld}>Retrouver le monde</button><label className={styles.file}>Ou importer une fiche<input type="file" accept="application/json,.json" onChange={event => { void importFile(event); }}/></label><p className={styles.hint}>Les mondes créés avec la recette précédente sont retrouvés à l’identique.</p></section>
    </div>
    <section className={styles.discoveries} aria-label="Mondes retrouvés"><h4>Mondes retrouvés sur cet appareil <span>{worlds.length} / 24</span></h4>{catalogue.issue && <p className={styles.hint}>{catalogue.issue}</p>}{worlds.length ? <div>{worlds.map(world => <button type="button" key={world.id} aria-pressed={world.id === planet.id} onClick={() => rediscover(world.id)}><strong>{world.name}</strong><small>{world.territoryCount} territoires · {world.regionCount} régions · {world.subtitle}</small></button>)}</div> : <p>Mémorisez les mondes qui vous intéressent pour les retrouver ici.</p>}<p className={styles.hint}>Les 24 derniers raccourcis sont conservés. Une ancienne guerre reste accessible avec son code, même lorsque son raccourci sort de cette liste.</p></section>
    <footer className={styles.provenance}>{details.provenance}</footer>
  </section>;
}
