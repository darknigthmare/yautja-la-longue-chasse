"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { createPlanetLandMaskV101, createPlanetRegionalMaterialAtlasV124, drawPlanetMaterialV101 } from "./planetMaterialRendererV101";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { DEFAULT_PLANET_MATERIAL_SETTINGS_V101, planetMaterialRecipeV101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101 } from "./systems/planetMaterialV101";
import { makePlanetStoredZipV114, type PlanetZipEntryV114 } from "./systems/planetExportZipV114";
import { analyzeWarPlanetStrategyV114 } from "./systems/clanWarPlanetStrategyV114";
import { WAR_PLANET_TEXTURE_CHANNELS_V125, type PlanetTextureChannelV125 } from "./systems/clanWarTextureLibraryV125";
import { createPlanetTextureCanvasV130, findPlanetTextureV130, WAR_PLANET_TEXTURES_V130 } from "./systems/clanWarTextureLibraryV130";
import { createPlanetRegionIndexMaskV124, createPlanetInlandMaskV124, describePlanetModularMasksV124, planetInlandFeaturesV124 } from "./planetModularExportV124";
import { createPlanetSingleRegionMaskV128 } from "./planetRegionKitRasterV128";
import PlanetRegionalPreviewV129 from "./PlanetRegionalPreviewV129";
import {
  createPlanetRegionalMaterialKitV128, compatibleLandMaterialsV128, compatibleSurfaceMaterialsV128,
  describePlanetRegionAssetsV128, editPlanetRegionalMaterialKitV128, validPlanetRegionalMaterialKitV128,
} from "./systems/clanWarRegionalMaterialKitV128";
import styles from "./PlanetLayerExportV102.module.css";

type ExportLayer = PlanetMaterialLayerV101 | "mask" | "region-index" | "regional-atlas" | "lake-mask" | "river-mask";
type ExportProjection = "map" | "globe" | "atlas";
const isMapOnlyLayer = (value: ExportLayer) =>
  value === "mask" || value === "region-index" || value === "lake-mask" || value === "river-mask" || value === "regional-atlas";
const layerNames: Record<ExportLayer, string> = {
  composite: "Planète assemblée", albedo: "Couleurs sans éclairage", land: "Terres et biomes",
  surface: "Surface entre les terres", clouds: "Nuages", weather: "Brumes et particules",
  atmosphere: "Atmosphère et diffusion", night: "Ombre", aurora: "Aurores",
  emissive: "Émission lumineuse", mask: "Masque des terres",
  "region-index": "Identification des régions (PNG RGBA)",
  "regional-atlas": "Atlas des matières régionales",
  "lake-mask": "Bassins intérieurs indépendants",
  "river-mask": "Cheneaux et cours intérieurs indépendants",
};

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("Le navigateur n’a pas pu encoder le PNG."));
  }, "image/png"));
}

/** All output paths use the same render/mask sources as the playable atlas. */
async function renderExportCanvasV124(
  planet: WarPlanetV96, layer: ExportLayer, selectedProjection: "map" | "globe",
  settings: PlanetMaterialSettingsV101, signal: AbortSignal,
): Promise<{ canvas: HTMLCanvasElement; projection: ExportProjection }> {
  if (signal.aborted) throw new Error("Export annulé.");
  if (layer === "region-index") return { canvas: createPlanetRegionIndexMaskV124(planet), projection: "map" };
  if (layer === "lake-mask" || layer === "river-mask")
    return { canvas: createPlanetInlandMaskV124(planet, layer === "lake-mask" ? "lake" : "river"), projection: "map" };
  if (layer === "regional-atlas") {
    const canvas = await createPlanetRegionalMaterialAtlasV124(planet, signal);
    if (!canvas || signal.aborted) throw new Error("Atlas régional indisponible ou export annulé.");
    return { canvas, projection: "atlas" };
  }
  if (layer === "mask") return { canvas: createPlanetLandMaskV101(planet, 1024), projection: "map" };
  const width = selectedProjection === "map" ? 1024 : 512;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ready = await drawPlanetMaterialV101(canvas, {
    planet, projection: selectedProjection, width, height,
    longitude: -25, latitude: 15, radius: width * .43,
    centerX: width / 2, centerY: height / 2, mapTop: 0, mapHeight: height,
    layer, textureSize: 1024, signal,
    settings: layer === "composite" ? settings : DEFAULT_PLANET_MATERIAL_SETTINGS_V101,
  });
  if (!ready || signal.aborted) throw new Error("Le calque est indisponible ou l'export a été annulé.");
  return { canvas, projection: selectedProjection };
}

/** Exports the applied preview only. A changed preview unmounts this component
 * and cancels its pending download; source loading remains shared and bounded. */
export default function PlanetLayerExportV102({ planet }: { planet: WarPlanetV96 }) {
  const unique = useId();
  const recipe = planetMaterialRecipeV101(planet);
  const [layer, setLayer] = useState<ExportLayer>("composite");
  const [projection, setProjection] = useState<"map" | "globe">("map");
  // Pure preview/export controls: never saved to, or encoded into, a world recipe.
  const [composition, setComposition] = useState<PlanetMaterialSettingsV101>({
    ...DEFAULT_PLANET_MATERIAL_SETTINGS_V101, aurora: true,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [supplementalMaterialId, setSupplementalMaterialId] = useState(WAR_PLANET_TEXTURES_V130[0].id);
  const [supplementalChannel, setSupplementalChannel] = useState<PlanetTextureChannelV125>("albedo");
  const [supplementalRegionId, setSupplementalRegionId] = useState(() => planet.regions[0]?.id ?? "");
  const [kitRegionId, setKitRegionId] = useState(() => planet.regions[0]?.id ?? "");
  const [regionalKit, setRegionalKit] = useState(() => createPlanetRegionalMaterialKitV128(planet));
  const [showRegionalPreviewV129, setShowRegionalPreviewV129] = useState(false);
  const activeKitRegion = regionalKit.entries.find(item => item.regionId === kitRegionId) ?? regionalKit.entries[0];
  const compatibleLand = activeKitRegion ? compatibleLandMaterialsV128(activeKitRegion.biome) : [];
  const compatibleSurface = activeKitRegion ? compatibleSurfaceMaterialsV128(planet.surface.kind, activeKitRegion.biome) : [];
  const selectedSupplementalMaterial = findPlanetTextureV130(supplementalMaterialId)!;
  const regionIndex = Math.max(0, planet.regions.findIndex(item => item.id === supplementalRegionId));
  const supplementalSeed = (planet.seed ^ Math.imul(regionIndex + 1, 0x9e3779b1)) >>> 0;
  const pending = useRef<AbortController | null>(null);
  const kitPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const kitImportIntent = useRef(0);
  const texturePreviewRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => () => { pending.current?.abort(); kitImportIntent.current++; }, []);
  useEffect(() => {
    const canvas = texturePreviewRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    try {
      const sample = createPlanetTextureCanvasV130(supplementalMaterialId, supplementalChannel, 160, supplementalSeed);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(sample, 0, 0, canvas.width, canvas.height);
    } catch {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [supplementalMaterialId, supplementalChannel, supplementalSeed]);
  useEffect(() => {
    const canvas = kitPreviewRef.current;
    if (!canvas || !activeKitRegion) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    try {
      const source = createPlanetTextureCanvasV130(activeKitRegion.landMaterialId, "albedo", 160, activeKitRegion.seed);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
    } catch {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [activeKitRegion?.landMaterialId, activeKitRegion?.seed]);

  const inland = planetInlandFeaturesV124(planet);
  const availableLayers = (Object.keys(layerNames) as ExportLayer[])
    .filter(value => value !== "aurora" || recipe.auroraOpacity > 0)
    .filter(value => value !== "emissive" || recipe.emission > 0)
    .filter(value => value !== "lake-mask" || inland.some(item => item.kind === "lake"))
    .filter(value => value !== "river-mask" || inland.some(item => item.kind === "river"));


  const exportLayer = async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setMessage("Préparation du calque…");
    try {
      const rendered = await renderExportCanvasV124(planet, layer, projection, composition, controller.signal);
      if (controller.signal.aborted) return;
      const blob = await encodePng(rendered.canvas);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${planet.id}-${layer}-${rendered.projection}.png`;
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      setMessage(`${layerNames[layer]} : téléchargement lancé (${rendered.canvas.width} × ${rendered.canvas.height} px).`);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Le téléchargement du calque a échoué.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const exportPack = async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setMessage("Préparation des calques du pack…");
    try {
      const entries: PlanetZipEntryV114[] = [];
      const manifestLayers: Array<{ name: string; layer: ExportLayer; projection: ExportProjection; width: number; height: number }> = [];
      for (const currentLayer of availableLayers) {
        if (controller.signal.aborted) return;
        const rendered = await renderExportCanvasV124(planet, currentLayer, projection, composition, controller.signal);
        if (controller.signal.aborted) return;
        const blob = await encodePng(rendered.canvas);
        if (controller.signal.aborted) return;
        const name = `${currentLayer}-${rendered.projection}.png`;
        entries.push({ name, bytes: new Uint8Array(await blob.arrayBuffer()) });
        manifestLayers.push({ name, layer: currentLayer, projection: rendered.projection, width: rendered.canvas.width, height: rendered.canvas.height });
        setMessage(`Pack : ${entries.length} / ${availableLayers.length} calques préparés…`);
      }
      if (controller.signal.aborted) return;
      const manifest = {
        format: "yautja-planet-layer-pack", version: 124,
        code: planet.id, name: planet.name, seed: planet.seed, recipe: planet.procedural?.recipe ?? null,
        layers: manifestLayers,
        modularMasks: describePlanetModularMasksV124(planet),
        compositionSettings: composition,
        strategicDossier: analyzeWarPlanetStrategyV114(planet),
        note: "Les couches régionales suivent les mêmes atlas, biomes et masques que le jeu. L'index des régions utilise le canal rouge (1 = première région, 0 = extérieur). Seul composite applique les interrupteurs de composition. Aucune sauvegarde de guerre dans ce ZIP.",
      };
      entries.push({ name: "manifest.json", bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n") });
      const zip = makePlanetStoredZipV114(entries);
      if (controller.signal.aborted) return;
      const buffer = new ArrayBuffer(zip.byteLength);
      new Uint8Array(buffer).set(zip);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${planet.id}-planet-layers-v124.zip`;
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
      setMessage(`Pack complet : ${availableLayers.length} PNG indépendants et manifeste (${(zip.byteLength / 1048576).toFixed(1)} Mio).`);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "L’export du pack a échoué.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  /** A material-source export. Does not change or re-encode the current planet. */
  const exportSupplementalMaterial = async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(true); setMessage("Préparation de la matière indépendante…");
    try {
      const canvas = createPlanetTextureCanvasV130(supplementalMaterialId, supplementalChannel, 512, supplementalSeed);
      const blob = await encodePng(canvas);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${supplementalMaterialId}-${supplementalChannel}-${supplementalRegionId}-seed${supplementalSeed}.png`;
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      setMessage(`Source ${selectedSupplementalMaterial.name} / ${supplementalChannel} exportée en 512 × 512 pixels.`);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Impossible d'exporter cette texture.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };


  const downloadRegionalAssignments = () => {
    try {
      if (!validPlanetRegionalMaterialKitV128(planet, regionalKit)) throw new Error("Kit régional invalide.");
      const bytes = JSON.stringify(regionalKit, null, 2) + "\n";
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = planet.id + "-regional-materials-v128.json";
      document.body.appendChild(link);
      try { link.click(); }
      finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      setMessage("Fiche des matières régionales exportée. Elle ne contient aucune sauvegarde de guerre.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export des matières impossible."); }
  };

  const importRegionalAssignments = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const intent = ++kitImportIntent.current;
    try {
      if (file.size > 65536) throw new Error("Fiche de matières trop volumineuse.");
      const candidate: unknown = JSON.parse(await file.text());
      if (kitImportIntent.current !== intent) return;
      if (!validPlanetRegionalMaterialKitV128(planet, candidate))
        throw new Error("Cette fiche ne correspond pas aux régions, à la graine ou au code de cette planète.");
      setRegionalKit(candidate);
      setMessage("Fiche régionale importée : les choix visuels sont restaurés sans modifier le monde.");
    } catch (error) {
      if (kitImportIntent.current === intent)
        setMessage(error instanceof Error ? error.message : "Impossible d’importer cette fiche régionale.");
    }
  };

  /** Region-specific asset receipt. No gameplay archive or world code is altered. */
  const exportRegionalKit = async () => {
    if (pending.current || !activeKitRegion) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(true);
    setMessage("Préparation du kit de matière régional…");
    try {
      const receipt = describePlanetRegionAssetsV128(planet, regionalKit, activeKitRegion.regionId);
      const sources = [
        { slot: "land", id: activeKitRegion.landMaterialId },
        ...(activeKitRegion.surfaceMaterialId ? [{ slot: "surface", id: activeKitRegion.surfaceMaterialId }] : []),
      ];
      const entries: PlanetZipEntryV114[] = [];
      const channelFiles: Array<{ file: string; sourceId: string; slot: string; channel: PlanetTextureChannelV125; size: number }> = [];
      for (const source of sources) for (const channel of WAR_PLANET_TEXTURE_CHANNELS_V125) {
        if (controller.signal.aborted) return;
        const canvas = createPlanetTextureCanvasV130(source.id, channel, 256, activeKitRegion.seed);
        const png = await encodePng(canvas);
        if (controller.signal.aborted) return;
        const file = source.slot + "-" + channel + ".png";
        entries.push({ name: file, bytes: new Uint8Array(await png.arrayBuffer()) });
        channelFiles.push({ file, sourceId: source.id, slot: source.slot, channel, size: 256 });
        setMessage("Kit régional : " + channelFiles.length + " canaux préparés…");
      }
      const mask = await encodePng(createPlanetSingleRegionMaskV128(planet, activeKitRegion.regionId, 512));
      if (controller.signal.aborted) return;
      entries.push({ name: "region-mask-map.png", bytes: new Uint8Array(await mask.arrayBuffer()) });
      entries.push({ name: "manifest.json", bytes: new TextEncoder().encode(JSON.stringify({
        ...receipt, files: channelFiles,
        regionMask: { file: "region-mask-map.png", projection: "equirectangular", width: 512, height: 256 },
      }, null, 2) + "\n") });
      const zip = makePlanetStoredZipV114(entries);
      if (controller.signal.aborted) return;
      const bytes = new ArrayBuffer(zip.byteLength); new Uint8Array(bytes).set(zip);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = planet.id + "-" + activeKitRegion.regionId + "-material-kit-v128.zip";
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
      setMessage("Kit de " + activeKitRegion.regionName + " exporté : " + channelFiles.length + " textures, masque et fiche.");
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Le kit régional n’a pas pu être exporté.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return <details className={styles.export} data-testid="planet-layer-export-v102" data-planet-id={planet.id}>
    <summary>Exporter les textures par calque</summary>
    <p>Chaque PNG utilise la planète de l’aperçu. Les effets et les terres conservent leur transparence pour être assemblés séparément.</p>
    <div className={styles.controls}>
      <label htmlFor={`${unique}-layer`}>Calque<select id={`${unique}-layer`} value={layer} disabled={busy} onChange={event => { setLayer(event.target.value as ExportLayer); setMessage(""); }}>
        {availableLayers.map(value => <option key={value} value={value}>{layerNames[value]}</option>)}
      </select></label>
      <label htmlFor={`${unique}-projection`}>Projection<select id={`${unique}-projection`} value={layer === "regional-atlas" ? "map" : isMapOnlyLayer(layer) ? "map" : projection} disabled={busy || isMapOnlyLayer(layer)} onChange={event => { setProjection(event.target.value as "map" | "globe"); setMessage(""); }}>
        <option value="map">Planisphère · 1024 × 512</option><option value="globe">Globe · 512 × 512</option>
      </select></label>
      <button type="button" onClick={() => void exportLayer()} disabled={busy}>{busy ? "Préparation…" : "Télécharger le PNG"}</button>
      <button type="button" onClick={() => void exportPack()} disabled={busy} data-testid="planet-export-pack-v114">{busy ? "Préparation…" : "Télécharger tous les calques (ZIP)"}</button>
    </div>
    {layer === "composite" && <fieldset className={styles.composition} disabled={busy} data-testid="planet-composition-switches-v114">
      <legend>Assembler les effets séparément</legend>
      {([
        ["atmosphere", "Diffusion atmosphérique"], ["clouds", "Nuages"],
        ["weather", "Brume et météo"], ["aurora", "Aurores"], ["lighting", "Éclairage jour/nuit"],
      ] as const).map(([key, label]) => <label key={key}>
        <input type="checkbox" checked={composition[key] !== false} onChange={event => setComposition(current => ({ ...current, [key]: event.target.checked }))}/>
        <span>{label}</span>
      </label>)}
      <p>Ces interrupteurs modifient uniquement le PNG assemblé. Chaque calque individuel conserve sa source et reste téléchargeable.</p>
    </fieldset>}
    <fieldset className={styles.composition} disabled={busy} data-testid="planet-extra-materials-v125">
      <legend>Bibliothèque supplémentaire — 48 matières de sol et de mer</legend>
      <p>Matières originales terrestres et extraterrestres, exportables indépendamment. Elles ne remplacent pas les matières déjà enregistrées dans le code de ce monde.</p>
      <div className={styles.controls}>
        <label htmlFor={`${unique}-supplemental-material`}>Texture complémentaire
          <select id={`${unique}-supplemental-material`} value={supplementalMaterialId} onChange={event => setSupplementalMaterialId(event.target.value)}>
            {WAR_PLANET_TEXTURES_V130.map(item => <option key={item.id} value={item.id}>{item.domain === "land" ? "Sol" : "Milieu"} · {item.origin === "earthlike" ? "Terrestre" : "Alien"} · {item.name}</option>)}
          </select>
        </label>
        <label htmlFor={`${unique}-supplemental-region`}>Variation par région
          <select id={`${unique}-supplemental-region`} value={supplementalRegionId} onChange={event => setSupplementalRegionId(event.target.value)}>
            {planet.regions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label htmlFor={`${unique}-supplemental-channel`}>Canal indépendant
          <select id={`${unique}-supplemental-channel`} value={supplementalChannel} onChange={event => setSupplementalChannel(event.target.value as PlanetTextureChannelV125)}>
            {WAR_PLANET_TEXTURE_CHANNELS_V125.map(channel => <option key={channel} value={channel}>{channel}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void exportSupplementalMaterial()} disabled={busy}>Télécharger cette matière PNG</button>
      </div>
      <div className={styles.texturePreviewPanel}>
        <canvas ref={texturePreviewRef} width={160} height={160}
          data-testid="planet-texture-preview-v125" role="img"
          aria-label={`Aperçu de ${selectedSupplementalMaterial.name}, canal ${supplementalChannel}`}/>
        <p>{selectedSupplementalMaterial.description} · motif : {selectedSupplementalMaterial.pattern} · rugosité {selectedSupplementalMaterial.roughness.toLocaleString("fr-FR")} · émission {selectedSupplementalMaterial.emission.toLocaleString("fr-FR")}.</p>
      </div>
    </fieldset>
    <fieldset className={styles.composition} disabled={busy} data-testid="planet-regional-kit-v128">
      <legend>Kit indépendant par région — V128</legend>
      <p>Le choix suit le biome de chaque région. Une banquise ne sera pas proposée par défaut dans une région désertique. Les textures restent des assets modulaires, sans remplacement silencieux de la carte ni des sauvegardes.</p>
      {activeKitRegion && <div className={styles.controls}>
        <label htmlFor={`${unique}-kit-region`}>Région de la planète
          <select id={`${unique}-kit-region`} value={activeKitRegion.regionId} onChange={event => setKitRegionId(event.target.value)}>
            {planet.regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </label>
        <label htmlFor={`${unique}-kit-land`}>Sol compatible avec le biome
          <select id={`${unique}-kit-land`} value={activeKitRegion.landMaterialId} onChange={event =>
            { kitImportIntent.current++; setRegionalKit(current => editPlanetRegionalMaterialKitV128(planet, current, activeKitRegion.regionId, "land", event.target.value)); }}>
            {compatibleLand.map(id => <option key={id} value={id}>{findPlanetTextureV130(id)?.name ?? id}</option>)}
          </select>
        </label>
        <label htmlFor={`${unique}-kit-surface`}>Milieu complémentaire compatible
          <select id={`${unique}-kit-surface`} value={activeKitRegion.surfaceMaterialId ?? ""} disabled={compatibleSurface.length === 0} onChange={event =>
            { kitImportIntent.current++; setRegionalKit(current => editPlanetRegionalMaterialKitV128(planet, current, activeKitRegion.regionId, "surface", event.target.value || null)); }}>
            <option value="">Conserver la surface native</option>
            {compatibleSurface.map(id => <option key={id} value={id}>{findPlanetTextureV130(id)?.name ?? id}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { void exportRegionalKit(); }} data-testid="planet-region-kit-export-v128">Télécharger le kit régional (ZIP)</button>
        <button type="button" onClick={downloadRegionalAssignments} data-testid="planet-region-kit-json-v128">Exporter les choix (JSON)</button>
        <label htmlFor={`${unique}-region-kit-import`}>Réimporter les choix de cette planète
          <input id={`${unique}-region-kit-import`} type="file" accept="application/json,.json" data-testid="planet-region-kit-import-v128" onChange={event => { void importRegionalAssignments(event); }}/>
        </label>
      </div>}
      {activeKitRegion && <div className={styles.texturePreviewPanel}>
        <canvas ref={kitPreviewRef} width={160} height={160} role="img"
          data-testid="planet-regional-material-preview-v128"
          aria-label={`Aperçu du sol ${activeKitRegion.regionName}`}/>
        <p>Source régionale : {findPlanetTextureV130(activeKitRegion.landMaterialId)?.description}. Le rendu du globe reste lié à sa recette d’origine.</p>
      </div>}
      {activeKitRegion && <div><button type="button" data-testid="planet-regional-preview-toggle-v129"
        onClick={() => setShowRegionalPreviewV129(value => !value)}>
        {showRegionalPreviewV129 ? "Fermer la comparaison régionale V129" : "Prévisualiser ces matières sur la planète V129"}
      </button>{showRegionalPreviewV129 && <PlanetRegionalPreviewV129 planet={planet} kit={regionalKit}/>}</div>}
      {activeKitRegion && <p data-testid="planet-region-kit-summary-v128">Biome : {activeKitRegion.biome} · Graine régionale : {activeKitRegion.seed} · {compatibleLand.length} sols compatibles · {compatibleSurface.length ? `${compatibleSurface.length} milieux complémentaires` : "aucun liquide à inventer pour cette surface"}.</p>}
      <p>Le ZIP contient 5 canaux pour chaque matériau sélectionné, un masque géographique transparent et un manifeste de provenance. Ce réglage visuel ne change pas le code du monde.</p>
    </fieldset>
    <p className={styles.status} role="status" aria-live="polite">{message || "Les masques régionaux utilisent R=indice+1 et A=255 sur terre seulement. L'atlas régional exporte de véritables tuiles de matière ; les bassins et chenaux restent séparés."}</p>
  </details>;
}
