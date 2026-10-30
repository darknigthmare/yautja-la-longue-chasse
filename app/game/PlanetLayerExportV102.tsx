"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPlanetLandMaskV101, createPlanetRegionalMaterialAtlasV124, drawPlanetMaterialV101 } from "./planetMaterialRendererV101";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { DEFAULT_PLANET_MATERIAL_SETTINGS_V101, planetMaterialRecipeV101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101 } from "./systems/planetMaterialV101";
import { makePlanetStoredZipV114, type PlanetZipEntryV114 } from "./systems/planetExportZipV114";
import { analyzeWarPlanetStrategyV114 } from "./systems/clanWarPlanetStrategyV114";
import { createPlanetRegionIndexMaskV124, createPlanetInlandMaskV124, describePlanetModularMasksV124, planetInlandFeaturesV124 } from "./planetModularExportV124";
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
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);
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
    <p className={styles.status} role="status" aria-live="polite">{message || "Les masques régionaux utilisent R=indice+1 et A=255 sur terre seulement. L'atlas régional exporte de véritables tuiles de matière ; les bassins et chenaux restent séparés."}</p>
  </details>;
}
