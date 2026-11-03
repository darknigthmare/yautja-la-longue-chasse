"use client";

import { useEffect, useState } from "react";
import PlanetMaterialCanvasV101 from "../game/PlanetMaterialCanvasV101";
import { createPlanetLandMaskV101, drawPlanetMaterialV101, planetMaterialRendererStatusV101 } from "../game/planetMaterialRendererV101";
import { WAR_PLANETS_V96, warPlanetV96 } from "../game/systems/clanWarPlanetsV96";
import { DEFAULT_PLANET_MATERIAL_SETTINGS_V101, PLANET_MATERIAL_LAYERS_V101, planetMaterialRecipeV101, planetMaterialSourceV101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101 } from "../game/systems/planetMaterialV101";
import styles from "./review.module.css";

interface ExportOptions {
  planetId: string;
  projection?: "globe" | "map";
  layer?: PlanetMaterialLayerV101 | "mask";
  width?: number;
  height?: number;
  longitude?: number;
  latitude?: number;
  settings?: PlanetMaterialSettingsV101;
  textureSize?: 512 | 1024 | 2048;
}

declare global {
  interface Window {
    __YAUTJA_PLANET_MATERIALS_V101__?: {
      export: (options: ExportOptions) => Promise<string>;
      recipes: () => ReturnType<typeof planetMaterialRecipeV101>[];
      status: typeof planetMaterialRendererStatusV101;
    };
  }
}

const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback;

async function exportMaterial(options: ExportOptions) {
  const planet = warPlanetV96(options.planetId);
  if (!planet) throw new Error("Planète inconnue");
  const projection = options.projection === "map" ? "map" : "globe";
  const layer = options.layer ?? "composite";
  if (layer !== "mask" && !PLANET_MATERIAL_LAYERS_V101.includes(layer)) throw new Error("Calque inconnu");
  const width = Math.round(Math.max(64, Math.min(4096, finite(options.width, projection === "map" ? 2048 : 512))));
  const height = Math.round(Math.max(64, Math.min(4096, finite(options.height, projection === "map" ? width / 2 : width))));
  const target = document.createElement("canvas"); target.width = width; target.height = height;
  if (layer === "mask") {
    const mask = createPlanetLandMaskV101(planet, width);
    const context = target.getContext("2d");
    if (!context) throw new Error("Export indisponible");
    context.drawImage(mask, 0, 0, width, height);
  } else {
    const ready = await drawPlanetMaterialV101(target, {
      planet, projection, layer, width, height, mapTop: 0, mapHeight: height,
      longitude: finite(options.longitude, -25), latitude: Math.max(-90, Math.min(90, finite(options.latitude, 15))),
      centerX: width / 2, centerY: height / 2, radius: Math.min(width, height) * .43,
      settings: options.settings ?? DEFAULT_PLANET_MATERIAL_SETTINGS_V101, textureSize: options.textureSize ?? 1024,
    });
    if (!ready) throw new Error(planetMaterialRendererStatusV101().error || "Export indisponible");
  }
  return target.toDataURL("image/png");
}

const layerNames: Record<PlanetMaterialLayerV101, string> = {
  composite: "Assemblage complet", albedo: "Surface et terres sans éclairage", surface: "Fond de surface", land: "Terres seules",
  clouds: "Nuages", weather: "Brumes, cendres ou spores", atmosphere: "Diffusion atmosphérique", night: "Ombre jour / nuit", aurora: "Aurores", emissive: "Lueur de surface",
};

/** Dedicated asset review, separate from game menus and campaign state. */
export default function PlanetMaterialsReviewV101() {
  const [planetId, setPlanetId] = useState("korthas");
  const [projection, setProjection] = useState<"globe" | "map">("globe");
  const [layer, setLayer] = useState<PlanetMaterialLayerV101>("composite");
  const [longitude, setLongitude] = useState(-25);
  const [latitude, setLatitude] = useState(15);
  const [settings, setSettings] = useState({ ...DEFAULT_PLANET_MATERIAL_SETTINGS_V101 });
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const planet = warPlanetV96(planetId)!;
  const recipe = planetMaterialRecipeV101(planet);

  useEffect(() => {
    const api = { export: exportMaterial, recipes: () => WAR_PLANETS_V96.map(planetMaterialRecipeV101), status: planetMaterialRendererStatusV101 };
    window.__YAUTJA_PLANET_MATERIALS_V101__ = api;
    return () => { if (window.__YAUTJA_PLANET_MATERIALS_V101__ === api) delete window.__YAUTJA_PLANET_MATERIALS_V101__; };
  }, []);

  const download = async () => {
    setExporting(true); setMessage("");
    try {
      const href = await exportMaterial({ planetId, projection, layer, longitude, latitude, settings });
      const link = document.createElement("a"); link.href = href; link.download = `${planetId}-${projection}-${layer}.png`; link.click();
      setMessage("PNG exporté avec les calques choisis.");
    } catch { setMessage("Ce rendu n’est pas disponible. Les autres planètes et les images sources restent consultables."); }
    finally { setExporting(false); }
  };

  return <main className={styles.page}>
    <header className={styles.header}><p>YAUTJA / GUERRES DES CLANS</p><h1>Matières des trente mondes</h1><p>Surfaces, terres et atmosphères indépendantes. Les continents suivent les cartes de la guerre des clans.</p></header>
    <section className={styles.inspector} aria-label="Aperçu des calques planétaires">
      <div className={styles.preview} data-preview-projection={projection}>
        <PlanetMaterialCanvasV101 planet={planet} projection={projection} width={800} height={500} longitude={longitude} latitude={latitude} radius={211} centerX={400} centerY={250} mapTop={50} mapHeight={400} resolution={1000} layer={layer} settings={settings}/>
      </div>
      <div className={styles.controls}>
        <p className={styles.eyebrow}>{planet.style === "classic" ? "Monde classique" : "Monde exotique"}</p><h2>{planet.name}</h2><p>{planet.surface.name} · {planet.landmasses.length} continents</p>
        <label>Planète<select aria-label="Planète" value={planetId} onChange={event => setPlanetId(event.target.value)}>{WAR_PLANETS_V96.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Projection<select aria-label="Projection" value={projection} onChange={event => setProjection(event.target.value as "globe" | "map")}><option value="globe">Globe</option><option value="map">Planisphère</option></select></label>
        <label>Calque<select aria-label="Calque" value={layer} onChange={event => setLayer(event.target.value as PlanetMaterialLayerV101)}>{PLANET_MATERIAL_LAYERS_V101.map(item => <option key={item} value={item}>{layerNames[item]}</option>)}</select></label>
        <label>Longitude · {longitude}°<input type="range" min={-180} max={180} value={longitude} onChange={event => setLongitude(Number(event.target.value))} disabled={projection === "map"}/></label>
        <label>Latitude · {latitude}°<input type="range" min={-75} max={75} value={latitude} onChange={event => setLatitude(Number(event.target.value))} disabled={projection === "map"}/></label>
        <fieldset><legend>Assemblage</legend>{([
          ["atmosphere", "Atmosphère"], ["clouds", "Nuages"], ["weather", "Brumes et aurores"], ["lighting", "Éclairage"],
        ] as const).map(([id, label]) => <label key={id} className={styles.check}><input type="checkbox" checked={settings[id]} onChange={event => setSettings(value => ({ ...value, [id]: event.target.checked }))}/>{label}</label>)}</fieldset>
        <button type="button" disabled={exporting} onClick={() => { void download(); }}>{exporting ? "Préparation…" : "Exporter ce calque en PNG"}</button>
        <p role="status" className={styles.status}>{message}</p>
      </div>
    </section>
    <section className={styles.sourceLinks} aria-label="Fichiers sources"><h2>Éléments indépendants de {planet.name}</h2>
      <a href={planetMaterialSourceV101(recipe.land)} download>Terres</a><a href={planetMaterialSourceV101(recipe.surface)} download>Surface</a><a href={planetMaterialSourceV101(recipe.clouds)} download>Nuages</a><a href={planetMaterialSourceV101(recipe.weather)} download>Brumes / particules</a>{recipe.auroraOpacity > 0 && <a href={planetMaterialSourceV101(recipe.aurora)} download>Aurores</a>}
      <p>La diffusion atmosphérique et l’ombre se règlent séparément. Le planisphère d’albédo s’exporte en 2 048 × 1 024 ; le globe en 512 × 512. Les textures natives ne sont pas des cartes de hauteur ou des normales physiques.</p>
    </section>
    <section className={styles.gallery} aria-label="Catalogue des trente planètes">{WAR_PLANETS_V96.map(item => <button type="button" key={item.id} className={styles.card} aria-pressed={planetId === item.id} onClick={() => setPlanetId(item.id)}>
      <div className={styles.thumbnail}><PlanetMaterialCanvasV101 planet={item} resolution={192}/></div><strong>{item.name}</strong><span>{item.surface.name}</span>
    </button>)}</section>
    <footer className={styles.footer}>Créations du projet Yautja. Matières générées, géographie issue du jeu et diffusion atmosphérique artistique ; aucune nouvelle règle de terrain, de météo ou de conquête.</footer>
  </main>;
}
