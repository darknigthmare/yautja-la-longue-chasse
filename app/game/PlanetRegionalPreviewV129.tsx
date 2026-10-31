"use client";

import { useEffect, useRef, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { drawPlanetMaterialV101, planetMaterialRendererStatusV101, PLANET_RENDERER_EVENT_V101 } from "./planetMaterialRendererV101";

/** An explicitly activated visual comparison; does not mutate planet or war saves. */
export default function PlanetRegionalPreviewV129({
  planet, kit,
}: { planet: WarPlanetV96; kit: PlanetRegionalMaterialKitV128 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projection, setProjection] = useState<"map" | "globe">("map");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [revision, setRevision] = useState(0);
  const [quality, setQuality] = useState<"pbr" | "albedo">("pbr");
  const [coastKm, setCoastKm] = useState(900);
  const [activeMode, setActiveMode] = useState("waiting");

  useEffect(() => {
    const rerender = () => setRevision(current => current + 1);
    window.addEventListener(PLANET_RENDERER_EVENT_V101, rerender);
    return () => window.removeEventListener(PLANET_RENDERER_EVENT_V101, rerender);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      const map = projection === "map";
      const width = map ? 768 : 384, height = map ? 384 : 384;
      setStatus("loading");
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      void drawPlanetMaterialV101(canvas, {
        planet, regionalKit: kit, regionalPbr: quality === "pbr", coastalInfluenceKm: coastKm,
        projection, width, height,
        longitude: -25, latitude: 15, radius: map ? 164 : 170,
        centerX: width / 2, centerY: height / 2, mapTop: 0, mapHeight: height,
        textureSize: 512, signal: controller.signal,
      }).then(ready => {
        if (!controller.signal.aborted) { setActiveMode(planetMaterialRendererStatusV101().renderMode);
          setStatus(ready ? "ready" : "unavailable"); }
      }).catch(() => { if (!controller.signal.aborted) setStatus("unavailable"); });
    });
    return () => { controller.abort(); cancelAnimationFrame(frame); };
  }, [planet, kit, projection, quality, coastKm, revision]);

  const exportPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "ready") return;
    canvas.toBlob(blob => {
      if (!blob) { setStatus("unavailable"); return; }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = planet.id + "-regional-study-v131-" + activeMode + "-" + projection + ".png";
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
    }, "image/png");
  };

  return <div data-testid="planet-regional-preview-v129" data-render-status={status}
    data-render-mode={status === "ready" ? activeMode : "loading"}>
    <p><strong>Rendu régional V131</strong> — sols par région, matériaux des milieux appliqués seulement aux côtes proches et aux bassins existants. Normales, rugosité, hauteur et émission sont composées dans le shader WebGL si le GPU dispose de dix unités de texture. Il s’agit d’un éclairage de matière (GGX simplifié), pas d’une simulation physique de l’eau ni de déplacements du relief.</p>
    <label>Projection de comparaison
      <select value={projection} onChange={event => setProjection(event.target.value as "map" | "globe")} data-testid="planet-regional-projection-v129">
        <option value="map">Planisphère</option>
        <option value="globe">Globe 3D</option>
      </select>
    </label>
    <label>Qualité du matériau
      <select value={quality} onChange={event => setQuality(event.target.value as "pbr" | "albedo")}
        data-testid="planet-regional-quality-v131">
        <option value="pbr">PBR régional (WebGL)</option>
        <option value="albedo">Albédo V129 (comparaison)</option>
      </select>
    </label>
    <label>Influence côtière réelle
      <select value={coastKm} onChange={event => setCoastKm(Number(event.target.value))}
        data-testid="planet-regional-coastal-v131">
        <option value={300}>300 km</option>
        <option value={900}>900 km</option>
        <option value={1800}>1 800 km</option>
      </select>
    </label>
    <canvas ref={canvasRef} width={projection === "map" ? 768 : 384} height={384}
      data-testid="planet-regional-visual-v129" role="img"
      aria-label={"Aperçu régional " + projection + " de " + planet.name}
      style={{ display: "block", width: "100%", maxWidth: projection === "map" ? 768 : 384, height: "auto" }}/>
    <button type="button" disabled={status !== "ready"} onClick={exportPreview} data-testid="planet-regional-download-v129">Télécharger cet aperçu PNG</button>
    <p role="status">{status === "ready" ? activeMode === "pbr-v131"
      ? "Rendu PBR V131 prêt : sols et médias régionaux côtiers, sans écriture du monde."
      : quality === "pbr"
        ? "GPU limité : comparaison albédo V129 affichée en secours, sauvegarde intacte."
        : "Comparaison albédo V129 prête, sans modification du code du monde." :
      status === "loading" ? "Rendu régional en préparation…" : "WebGL indisponible : les kits V128 restent exportables."}</p>
  </div>;
}
