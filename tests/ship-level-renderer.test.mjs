import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SHIP_LEVEL_ART } from "../app/game/shipInteriorKit.ts";

// Bundle the real renderer and layout; the independently tested animated rig is
// replaced with a tiny element so these tests need no canvas or browser globals.
const bundle = await build({
  entryPoints: ["app/game/ShipLevelScene.tsx"], bundle: true, write: false,
  platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom"],
  plugins: [{ name: "isolate-hunter-canvas", setup(builder) {
    builder.onResolve({ filter: /^\.\/HunterRigPreview$/ }, () => ({ path: "hunter-rig", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "export default function HunterRigPreview() { return null; }", loader: "js" }));
  } }],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url), console });
const { default: Scene, ShipLevelMiniMap, ShipTrophyWall, shipArtPlacement } = compiled.exports;
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const player = { x: 3500, y: 1360, velocityX: 0, velocityY: 0, facing: -1, onSurface: true, climbing: false, phase: 0 };
const base = {
  player, camera: { x: 2900, y: 850, width: 1100, height: 650 }, doors: {},
  appearance: {}, loadout: { armorId: "hunter", weaponIds: ["combistick", "yautja-bow"], gearIds: ["motion-sensor", "audio-decoy"] },
  trophyDisplays: [], activeStationId: "launch-airlock", waypointId: null,
  suspended: false, highContrast: false, onStationRequest() {},
};
const trophyRoom = { id: "trophy-hall", kind: "trophies", label: "Galerie des trophées", x: 120, y: 960, width: 760, height: 400, deckY: 1360 };
function* elements(node) {
  if (Array.isArray(node)) { for (const child of node) yield* elements(child); }
  else if (node && typeof node === "object" && node.props) { yield node; yield* elements(node.props.children); }
}

test("empty trophy galleries contain no invented skull or owned image", () => {
  const html = render(ShipTrophyWall, { room: trophyRoom, trophyDisplays: [] });
  assert.doesNotMatch(html, /<image|data-owned-trophy/);
  assert.match(html, /Aucun trophée possédé/);
});

test("each displayed owned trophy keeps its exact individual image and accessible identity", () => {
  const trophies = [
    { id: "claim-insignia", label: "Insigne de Vey", image: "/game/assets/v15/trophies/trophy-vey.webp" },
    { id: "claim-mask", label: "Masque du Gardien", image: "/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp" },
  ];
  const html = render(ShipTrophyWall, { room: trophyRoom, trophyDisplays: trophies });
  assert.equal((html.match(/<image/g) ?? []).length, 2);
  for (const trophy of trophies) {
    assert.ok(html.includes(`href="${trophy.image}"`));
    assert.ok(html.includes(`data-owned-trophy="${trophy.id}"`));
    assert.ok(html.includes(`<title>${trophy.label}</title>`));
  }
  assert.doesNotMatch(html, /skull|crâne/i);
});

test("the scene uses its bounded camera and draws fixtures before hunter and foreground", () => {
  const html = render(Scene, base);
  assert.match(html, /viewBox="2900 850 1100 650"/);
  assert.ok(html.includes('data-ship-space="launch-airlock"'));
  assert.ok(!html.includes('data-ship-space="galaxy-map"'), "distant rooms are culled from the scene");
  const layers = [...html.matchAll(/data-ship-layer="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(layers, ["background", "fixtures", "structure", "doors", "stations", "hunter", "foreground"]);
});

test("door leaf rendering follows each physical door state independently", () => {
  const props = { ...base, camera: { x: 750, y: 450, width: 600, height: 300 }, doors: {
    "door-700-880": { openness: 1, holdSeconds: 1 },
    "door-700-1220": { openness: 0, holdSeconds: 0 },
  } };
  const html = render(Scene, props);
  assert.match(html, /data-ship-door="door-700-880" data-openness="1\.00"/);
  assert.match(html, /data-ship-door="door-700-1220" data-openness="0\.00"/);
  const placement = (tag) => Object.fromEntries(["x", "y", "width", "height"].map((name) => [name, Number(tag.match(new RegExp(` ${name}="([^\"]+)"`))?.[1])]));
  const leaf = SHIP_LEVEL_ART.doorLeaf;
  for (const [id, opening, centerX] of [["door-700-880", 1, 880], ["door-700-1220", 0, 1220]]) {
    const tag = html.match(new RegExp(`data-ship-door="${id}"[\\s\\S]*?(<image[^>]*>)`))?.[1];
    assert.ok(tag, "door leaf image is rendered");
    const box = placement(tag);
    const scale = box.width / leaf.sourceWidth;
    const paintedBottom = box.y + (leaf.alphaBounds.y + leaf.alphaBounds.height) * scale;
    assert.ok(Math.abs(paintedBottom - (520 + 180 * (1 - opening))) < 1e-8,
      "the visible leaf edge, not the transparent canvas edge, tracks the physical opening");
    const frameTag = html.match(new RegExp(`<image data-ship-portal-frame="${id}"[^>]*>`))?.[0];
    assert.ok(frameTag);
    const frame = placement(frameTag);
    const frameArt = SHIP_LEVEL_ART.doorFrame;
    const frameScale = frame.width / frameArt.sourceWidth;
    assert.ok(Math.abs(frame.y + frameArt.aperture.y * frameScale - 520) < 1e-8);
    assert.ok(Math.abs(frameArt.aperture.height * frameScale - 180) < 1e-8);
    assert.ok(Math.abs(frame.x + (frameArt.aperture.x + frameArt.aperture.width / 2) * frameScale - centerX) < 1e-8);
  }
});

test("all transparent ship props anchor their painted bounds to the requested socket", () => {
  for (const asset of [SHIP_LEVEL_ART.navigationConsole, SHIP_LEVEL_ART.foregroundRib, SHIP_LEVEL_ART.doorFrame, SHIP_LEVEL_ART.doorLeaf]) {
    const box = shipArtPlacement(asset, 500, 700, 240, 300);
    const scale = box.width / asset.sourceWidth;
    const bounds = asset.alphaBounds;
    assert.ok(Math.abs(box.y + (bounds.y + bounds.height) * scale - 700) < 1e-8, `${asset.src}: painted feet meet the floor`);
    assert.ok(Math.abs(box.x + (bounds.x + bounds.width / 2) * scale - 500) < 1e-8, `${asset.src}: painted silhouette is centered`);
    assert.ok(bounds.width * scale <= 240 + 1e-8);
    assert.ok(bounds.height * scale <= 300 + 1e-8);
    assert.ok(Math.abs(box.width / box.height - asset.sourceWidth / asset.sourceHeight) < 1e-8, "native aspect ratio is preserved");
  }
});

test("armory props contain only equipped weapons, using standalone images", () => {
  const html = render(Scene, { ...base, camera: { x: 1200, y: 250, width: 710, height: 475 } });
  assert.match(html, /data-owned-weapon="combistick"/);
  assert.match(html, /data-owned-weapon="yautja-bow"/);
  assert.doesNotMatch(html, /data-owned-weapon="(?:plasma-caster|smart-disc|wristblades)"/);
  assert.doesNotMatch(html, /weapons\/registered\//);
});

test("the minimap selects a waypoint with pointer or keyboard and never moves the hunter", () => {
  const selected = [];
  const originalPlayer = { ...player };
  const props = { player, camera: base.camera, activeStationId: null, waypointId: null, suspended: false, onSelect: (id) => selected.push(id) };
  const tree = ShipLevelMiniMap(props);
  const buttons = [...elements(tree)].filter((element) => element.props.role === "button");
  assert.equal(buttons.length, 8);
  buttons[0].props.onClick();
  let prevented = false;
  let stopped = false;
  buttons[1].props.onKeyDown({ key: "Enter", preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.deepEqual(selected, ["galaxy-map", "wall-armory"]);
  assert.equal(prevented && stopped, true);
  assert.deepEqual(player, originalPlayer);
  const inactive = [...elements(ShipLevelMiniMap({ ...props, suspended: true }))].filter((element) => element.props.role === "button");
  inactive[0].props.onClick();
  assert.equal(selected.length, 2);
  assert.ok(inactive.every((button) => button.props.tabIndex === -1));
});
