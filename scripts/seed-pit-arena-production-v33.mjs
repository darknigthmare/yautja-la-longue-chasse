import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

// Creation is deliberately exclusive: rerunning never overwrites generated/reviewed work.
const destination = path.resolve("art-source/v33/pit-arenas/production-manifest.json");
const bundle = await build({ entryPoints: ["app/game/systems/pitArenaCatalogue.ts"], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { PIT_ARENA_CATALOGUE } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const dir = "/game/sprites/v33/pit-arenas/the-pit";
const placement = ([x, y, width, height]) => ({ x, y, width, height });
const slot = (id, role, box, { mode = "module", parallax, alpha = true, contour = "silhouette découpée, alpha réel", frames = 1, opacity = 1, extraPlacements = [], required = true } = {}) => ({
  id, role, contour, alphaRequired: alpha, requiredForRuntime: required, mode, parallax, opacity,
  placements: [box, ...extraPlacements].map(placement),
  animation: frames > 1 ? { fps: 8, reducedMotionFrame: 0, loop: true } : null,
  frames: Array.from({ length: frames }, (_, index) => ({
    path: `${dir}/${id}${frames > 1 ? `-f${String(index).padStart(2, "0")}` : ""}.png`,
    status: "planned", generation: null, review: null, integration: null,
  })),
});
const originalPit = {
  P0: [
    slot("p0-a-vault-depth", "Profondeur de la voûte orbitale", [-160, -100, 1280, 700], { mode: "cover", parallax: .05, alpha: false, contour: "panorama opaque sans sol, piliers proches, portes, public ou props" }),
    slot("p0-b-vault-haze", "Brume haute indépendante", [-160, -100, 1280, 650], { parallax: .05, opacity: .5, required: false, contour: "voile alpha doux, centre et sol de combat dégagés" }),
  ],
  P1: [
    slot("p1-a-gallery-left", "Galerie lointaine gauche", [0, 90, 280, 330], { parallax: .12 }),
    slot("p1-b-gallery-right", "Galerie lointaine droite indépendante", [680, 90, 280, 330], { parallax: .12 }),
  ],
  P2: [
    slot("p2-a-ritual-pillar-left", "Pilier rituel gauche", [-35, 70, 170, 365], { parallax: .24 }),
    slot("p2-b-ritual-pillar-right", "Pilier rituel droit indépendant", [825, 70, 170, 365], { parallax: .24 }),
    slot("p2-c-service-door-frame", "Cadre de la porte de service", [385, 105, 190, 320], { parallax: .24, contour: "cadre ajouré, pas de vantail ni d'extérieur peint dans l'ouverture" }),
    slot("p2-d-service-door-leaf", "Vantail indépendant fermé", [410, 128, 140, 295], { parallax: .24, contour: "silhouette rectangulaire fermée ajustée dans le cadre, alpha hors contour" }),
  ],
  P3: [
    slot("p3-a-brazier-left", "Brasero gauche sans flamme peinte", [148, 352, 116, 76], { parallax: .43 }),
    slot("p3-b-brazier-right", "Brasero droit sans flamme peinte", [696, 352, 116, 76], { parallax: .43 }),
    slot("p3-c-brazier-flame", "Flamme indépendante, première pose utilisable avant la boucle complète", [168, 324, 76, 62], { parallax: .43, frames: 6, extraPlacements: [[716, 324, 76, 62]], required: false, contour: "flamme alpha sans brasero; six dessins différents avec base et échelle stables" }),
    slot("p3-d-ceremonial-trophy", "Trophée original du lieu, sans attribution canonique inventée", [446, 135, 68, 100], { parallax: .43, required: false }),
  ],
  P4: [
    slot("p4-a-ring-rear-fascia", "Bande arrière décorative sans collision", [-180, 411, 1320, 32], { parallax: .78, contour: "bande horizontale; ne constitue jamais la ligne de contact jouable" }),
    slot("p4-b-basalt-floor-tile", "Tuile du sol de combat", [0, 430, 360, 170], { mode: "repeat-x", parallax: 1, contour: "bord supérieur plat et opaque au pixel y0; bords gauche/droite raccordables; aucun dessus en perspective" }),
    slot("p4-c-ring-front-fascia", "Façade avant sous le niveau des pieds", [-180, 447, 1320, 160], { parallax: 1, contour: "sommet horizontal, uniquement sous la ligne de combat" }),
  ],
  P5: [
    slot("p5-a-chain-left", "Chaîne proche gauche", [-72, 58, 120, 492], { parallax: 1.08, contour: "maillons et anneaux réellement ajourés, pas de panneau opaque" }),
    slot("p5-b-chain-right", "Chaîne proche droite indépendante", [912, 58, 120, 492], { parallax: 1.08, contour: "maillons et anneaux réellement ajourés, pas de panneau opaque" }),
  ],
};
const manifest = {
  schemaVersion: 1,
  production: "v33-pit-independent-arena-art",
  sourceNote: "Catalogue local versionné : 100 concepts, 8 jouables. Conversation dédiée en cours de récupération. Le détail THE PIT est une proposition originale provisoire, pas une transcription attribuée à tort.",
  stages: PIT_ARENA_CATALOGUE.map(entry => ({
    number: entry.number,
    catalogueId: entry.id,
    assetDirectory: entry.runtimeArenaId === "the-pit" ? dir : `/game/sprites/v33/pit-arenas/${entry.runtimeArenaId ?? entry.id}`,
    name: entry.name, setting: entry.setting, wave: entry.wave,
    legacyRuntimeArenaId: entry.runtimeArenaId,
    legacyRuntimeStatus: entry.runtimeStatus,
    sourceConfirmation: "pending-dedicated-conversation",
    runtimeEnabled: false,
    planes: entry.layers.map(layer => ({
      id: layer.id, role: layer.role, nominalParallax: layer.parallax, status: "planned",
      subplanSpecification: entry.runtimeArenaId === "the-pit" ? "proposed-original" : "pending-conversation",
      assets: entry.runtimeArenaId === "the-pit" ? originalPit[layer.id] : [],
    })),
  })),
};
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
const list = [
  "\n| Nº | Stage local | Identifiant du catalogue | Lot | Runtime actuel |",
  "|---:|---|---|---|---|",
  ...PIT_ARENA_CATALOGUE.map(entry => `| ${entry.number} | ${entry.name} | \`${entry.id}\` | ${entry.wave} | ${entry.runtimeArenaId ? `jouable : \`${entry.runtimeArenaId}\`` : "concept"} |`),
  "",
].join("\n");
await fs.appendFile("docs/v33-arena-production-spec.md", list);
console.log(JSON.stringify({ manifest: destination, stages: manifest.stages.length, primaryPlanes: manifest.stages.reduce((sum, entry) => sum + entry.planes.length, 0), specifiedSubplans: Object.values(originalPit).flat().length, requestedImageFiles: Object.values(originalPit).flat().reduce((sum, asset) => sum + asset.frames.length, 0) }));
