import { environmentGameplayPropForGeometryId } from "../../app/game/environmentPropRegistry";
import { worldBlueprintFor } from "../../app/game/systems/worldBlueprints";
import { drawEnvironmentProp, environmentPropDrawPlan } from "../../app/game/environmentPropDrawing";

// This is a limited foreground projection. It is deliberately not HuntCanvas:
// flexible supports take an earlier native rendering path there, and native
// procedural fallbacks are described rather than imitated by this fixture.
export const ENVIRONMENT_PROP_RACCORD_SCENARIOS_20261120 = [
  { id: "jungle-tree", missionId: "jungle-vey", geometryId: "j-tree-west", expected: "buttress-trunk", evidence: "canvas-production-draw-helper" },
  { id: "jungle-ladder", missionId: "jungle-vey", geometryId: "feature-j-ruins-ladder", expected: "field-ladder", evidence: "canvas-production-draw-helper" },
  { id: "ice-wall", missionId: "ice-cryostalker", geometryId: "i-wall-west", expected: "ice-wall", evidence: "canvas-production-draw-helper" },
  { id: "volcano-column", missionId: "volcano-bad-blood", geometryId: "v-column-west", expected: "basalt-column", evidence: "canvas-production-draw-helper" },
  { id: "ice-rope-registry", missionId: "ice-cryostalker", geometryId: "i-gantry-rope", expected: "maintenance-rope", evidence: "registry-only-flexible" },
  { id: "jungle-vine-registry", missionId: "jungle-vey", geometryId: "feature-j-canopy-vine", expected: "hanging-vine", evidence: "registry-only-flexible" },
  { id: "jungle-rock-fallback", missionId: "jungle-vey", geometryId: "j-rock-cut", expected: null, evidence: "registry-only-native-fallback" },
  { id: "ice-ladder-fallback", missionId: "ice-cryostalker", geometryId: "i-mine-ladder", expected: null, evidence: "registry-only-native-fallback" },
];

export function resolveEnvironmentPropRaccordCases20261120(encounterRun = 0) {
  return ENVIRONMENT_PROP_RACCORD_SCENARIOS_20261120.map((scenario) => {
    const world = worldBlueprintFor(scenario.missionId);
    const geometry = world.climbables.find(({ id }) => id === scenario.geometryId);
    if (!geometry) throw new Error("Missing real physical support: " + scenario.geometryId);
    const assignment = environmentGameplayPropForGeometryId(scenario.missionId, geometry.id, encounterRun);
    if ((assignment?.asset.archetypeId ?? null) !== scenario.expected) {
      throw new Error(scenario.id + ": unexpected visual family " + (assignment?.asset.archetypeId ?? "native-fallback"));
    }
    return {
      ...scenario,
      encounterRun,
      biomeId: world.biome,
      geometry: JSON.parse(JSON.stringify(geometry)),
      asset: assignment ? { ...assignment.asset } : null,
      assignmentSource: assignment ? ("source" in assignment ? assignment.source : "room-plan-feature") : null,
    };
  });
}

function textElement(doc, tag, text) {
  const element = doc.createElement(tag);
  element.textContent = text;
  return element;
}

export async function mountEnvironmentPropRaccordCases20261120(root, { encounterRun = 0 } = {}) {
  const doc = root.ownerDocument;
  const report = {
    schemaVersion: 1,
    scope: "Limited Canvas2D foreground projection with real registry, world geometry and drawEnvironmentProp; no GameClient, input, animation phase, native fallback rendering or human artistic qualification.",
    encounterRun, nativeGameClient: false, humanArtReview: false, nativeFallbacksRendered: false,
    cases: [],
  };
  root.replaceChildren();
  root.append(textElement(doc, "h1", "Raccords V19 — projection limitée des supports"));
  root.append(textElement(doc, "p", report.scope));
  for (const scenario of resolveEnvironmentPropRaccordCases20261120(encounterRun)) {
    const card = doc.createElement("article");
    card.dataset.raccordCase = scenario.id;
    card.append(textElement(doc, "h2", scenario.geometryId));
    card.append(textElement(doc, "p",
      scenario.biomeId + " / " + scenario.geometry.kind + " → " + (scenario.asset?.archetypeId ?? "dessin natif conservé")));
    const record = { ...scenario, rendered: false };
    if (scenario.evidence === "canvas-production-draw-helper") {
      if (!scenario.asset) throw new Error(scenario.id + ": no admitted image");
      const image = doc.createElement("img");
      image.src = scenario.asset.runtimeUrl;
      await image.decode();
      if (!(image.naturalWidth > 48 && image.naturalHeight > 48)) throw new Error("Invalid original image dimensions");
      const plan = environmentPropDrawPlan(image.naturalWidth, image.naturalHeight, scenario.asset.role, scenario.geometry);
      if (!plan || plan.tiles.length !== 1) throw new Error("Unexpected climbing draw plan");
      const tile = plan.tiles[0];
      if (Math.abs(tile.x + tile.width / 2 - scenario.geometry.x - scenario.geometry.width / 2) > 1e-7) {
        throw new Error("The production draw plan is no longer centered on the physical support");
      }
      const left = Math.min(scenario.geometry.x, tile.x) - 32;
      const right = Math.max(scenario.geometry.x + scenario.geometry.width, tile.x + tile.width) + 32;
      const width = Math.ceil(Math.max(640, right - left));
      const height = Math.ceil(Math.max(720, scenario.geometry.y + scenario.geometry.height + 32));
      if (width > 4096 || height > 2048) throw new Error("Unbounded QA canvas");
      const cameraX = left - (width - (right - left)) / 2;
      const canvas = doc.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.dataset.raccordCanvas = scenario.id;
      canvas.setAttribute("aria-label", scenario.geometryId + " — original V19 image and QA collider outline");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas2D unavailable");
      context.setTransform(1, 0, 0, 1, -cameraX, 0);
      drawEnvironmentProp(context, image, scenario.asset.role, scenario.geometry);
      context.setTransform(1, 0, 0, 1, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;
      let paintedPixels = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) paintedPixels += 1;
      if (!paintedPixels) throw new Error("The original asset produced no visible pixels");
      // This outline is a disclosed QA aid; pixel coverage above was measured
      // before it, so the outline cannot stand in for successfully loaded art.
      context.strokeStyle = "#f4d35e"; context.lineWidth = 1;
      context.strokeRect(scenario.geometry.x - cameraX, scenario.geometry.y, scenario.geometry.width, scenario.geometry.height);
      card.append(canvas);
      Object.assign(record, {
        rendered: true,
        image: { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
        drawPlan: plan,
        canvas: { width, height, cameraX, worldUnitsPerPixel: 1, paintedPixelsBeforeQaOverlay: paintedPixels, qaColliderOutline: true },
      });
    } else {
      card.append(textElement(doc, "p", scenario.evidence === "registry-only-flexible"
        ? "Métadonnées seulement : HuntCanvas emploie son rendu flexible natif avant le lookup V19."
        : "Métadonnées seulement : aucune image V19 appropriée, le dessin natif existant n’est pas reproduit ici."));
    }
    root.append(card); report.cases.push(record);
  }
  globalThis.__environmentPropRaccordReport20261120 = report;
  await new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)));
  root.dataset.raccordReady = "true";
  return report;
}
