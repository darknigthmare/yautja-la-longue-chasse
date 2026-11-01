"use client";

import { useEffect, useRef, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { DEFAULT_PLANET_MATERIAL_SETTINGS_V101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101 } from "./systems/planetMaterialV101";
import { drawPlanetMaterialV101, PLANET_RENDERER_EVENT_V101 } from "./planetMaterialRendererV101";
import { planetCanvasRenderSignatureV143 } from "./systems/planetRenderSignatureV143";

interface PlanetMaterialCanvasV101Props {
  planet: WarPlanetV96;
  projection?: "globe" | "map";
  width?: number;
  height?: number;
  longitude?: number;
  latitude?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
  mapTop?: number;
  mapHeight?: number;
  resolution?: number;
  layer?: PlanetMaterialLayerV101;
  settings?: Readonly<PlanetMaterialSettingsV101>;
  onReady?: (ready: boolean) => void;
  regionalKit?: PlanetRegionalMaterialKitV128 | null;
  regionalPbr?: boolean;
  coastalInfluenceKm?: number;
}

/** Visible-only, event-driven raster layer. HTML canvas is decorative; the SVG
 * above it owns keyboard controls, labels, territory hit targets and fallback. */
export default function PlanetMaterialCanvasV101({
  planet, projection = "globe", width = 100, height = 100, longitude = -25, latitude = 15,
  radius = 43, centerX = 50, centerY = 50, mapTop = 0, mapHeight = height,
  resolution = 192, layer = "composite", settings = DEFAULT_PLANET_MATERIAL_SETTINGS_V101, onReady,
  regionalKit = null, regionalPbr = false, coastalInfluenceKm = 900,
}: PlanetMaterialCanvasV101Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRequest = useRef("");
  const [visible, setVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("waiting");
  const [completedSignature, setCompletedSignature] = useState("");
  const { atmosphere, clouds, weather, lighting, aurora } = settings;
  const renderSignature = planetCanvasRenderSignatureV143({
    worldCode: planet.id, projection,
    geometry: [width,height,longitude,latitude,radius,centerX,centerY,mapTop,mapHeight,resolution],
    qualityPbr: regionalPbr, coastKm: coastalInfluenceKm, layer,
    switches: [atmosphere,clouds,weather,lighting,aurora],
    regions: regionalKit?.entries ?? null,
    revision,
  });
  const currentStatus = completedSignature === renderSignature ? status : "waiting";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { rootMargin: "80px" });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const changed = () => setRevision(value => value + 1);
    window.addEventListener(PLANET_RENDERER_EVENT_V101, changed);
    return () => window.removeEventListener(PLANET_RENDERER_EVENT_V101, changed);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      if (lastRequest.current !== renderSignature) {
        // A new viewpoint or regional material invalidates the actual pixels
        // even when the immutable planet code has not changed.
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        onReady?.(false);
        lastRequest.current = renderSignature;
      }
      setStatus("loading");
      void drawPlanetMaterialV101(canvas, {
        planet, regionalKit: regionalKit ?? undefined, regionalPbr, coastalInfluenceKm, projection,
        width, height, longitude, latitude, radius, centerX, centerY, mapTop, mapHeight, layer,
        settings: { atmosphere, clouds, weather, lighting, aurora }, signal: controller.signal,
      }).then(ready => {
        if (controller.signal.aborted) return;
        if (!ready) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        setCompletedSignature(renderSignature);
        setStatus(ready ? "ready" : "fallback"); onReady?.(ready);
      }).catch(() => {
        if (controller.signal.aborted) return;
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        setCompletedSignature(renderSignature);
        setStatus("fallback"); onReady?.(false);
      });
    });
    return () => { controller.abort(); cancelAnimationFrame(frame); };
  }, [planet, regionalKit, regionalPbr, coastalInfluenceKm, projection, width, height, longitude, latitude, radius, centerX, centerY, mapTop, mapHeight, resolution, layer, atmosphere, clouds, weather, lighting, aurora, onReady, visible, revision, renderSignature]);

  return <canvas ref={canvasRef} width={resolution} height={Math.round(resolution * height / width)}
    aria-hidden="true" data-testid="planet-material-v101" data-planet-id={planet.id} data-projection={projection}
    data-layer={layer} data-render-status={currentStatus} data-render-signature={renderSignature}
    data-render-current={completedSignature === renderSignature}
    data-regional-kit-applied={Boolean(regionalKit)} data-mapping={planet.procedural?.recipe.biomeDiversity === "varied" ? "world-space-triplanar-regional" : "world-space-triplanar-mirrored"}
    style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}/>;
}
