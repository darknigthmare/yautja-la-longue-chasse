import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { ExpeditionAnimationImport, ExpeditionAnimationFrame } from "../app/game/systems/expeditionAnimationContract";

const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/expeditionAnimationContract.ts", import.meta.url))], bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/expeditionAnimationContract");
const source = { src: "/game/test-only/expedition.png", sha256: "a".repeat(64), width: 256, height: 256, facing: "right" as const, orientation: "native" as const };
function frame(location: "right-hand" | "world" | "belt", id: string): ExpeditionAnimationFrame {
  return {
    id, durationTicks: 6, body: { assetId: "body", rect: [0, 0, 128, 256], pivot: [64, 254] },
    attachments: Object.fromEntries(api.EXPEDITION_ATTACHMENTS.map(id => [id, { x: 64, y: 128, rotation: 0 }])) as ExpeditionAnimationFrame["attachments"],
    ownership: [{ itemId: "disc-1", family: "held-items", location }],
    equipment: [{ itemId: "disc-1", assetId: "disc", rect: [0, 0, 64, 64], location, occlusion: { mode: "mask", assetId: "hand-mask", rect: [0, 0, 128, 256] } }],
    cues: [{ eventId: `disc-${id}`, source: "gameplay", effects: [] }],
  };
}
function fixture(): ExpeditionAnimationImport {
  return { schemaVersion: 1, mode: "expedition", assets: [
    { ...source, id: "body", kind: "body", construction: "whole-anatomy", anatomy: [...api.EXPEDITION_BODY_PARTS], fusedEquipment: [] },
    { ...source, id: "disc", kind: "equipment", family: "held-items", construction: "separate-piece" },
    { ...source, id: "hand-mask", kind: "occlusion-mask" },
  ], clips: [{ id: "disc-cycle", appearanceId: "test-body", facing: "right", bodyClock: "gameplay", equipmentClock: "independent", frames: [frame("right-hand", "held"), frame("world", "flight"), frame("right-hand", "caught"), frame("belt", "stored")] }] };
}
function rejects(value: unknown, code: string) {
  const result = api.validateExpeditionAnimationImport(value);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === code), JSON.stringify(result));
  assert.equal(result.conformingRuntimeClipCount, 0);
}

test("a complete declared body and synchronized disc ownership import without claiming runtime coverage", () => {
  const input = fixture(), before = JSON.stringify(input);
  const result = api.validateExpeditionAnimationImport(input);
  assert.deepEqual(result, { valid: true, issues: [], declaredClipCount: 1, conformingRuntimeClipCount: 0 });
  assert.equal(JSON.stringify(input), before);
  assert.equal(api.EXPEDITION_ANIMATION_SOURCE_BUDGET.announcedEntries, 517);
  assert.equal(api.EXPEDITION_ANIMATION_SOURCE_BUDGET.completeIdCatalogueRecovered, false);
  assert.equal(api.EXPEDITION_ANIMATION_SOURCE_BUDGET.conformingRuntimeClipCount, 0);
});

test("PIT and malformed imports cannot masquerade as Expedition contracts", () => {
  for (const input of [null, [], 4, "atlas"]) rejects(input, "invalid-manifest");
  rejects({ ...fixture(), mode: "pit" }, "unsupported-contract");
  rejects({ schemaVersion: 1, mode: "expedition" }, "missing-arrays");
  rejects({ ...fixture(), assets: new Array(20001).fill(null) }, "import-too-large");
});

test("missing hands, detached limb construction and fused customizable gear are rejected", () => {
  const input = fixture(), body = input.assets[0];
  rejects({ ...input, assets: [{ ...body, anatomy: api.EXPEDITION_BODY_PARTS.filter(part => part !== "left-hand") }, ...input.assets.slice(1)] }, "incomplete-anatomy");
  rejects({ ...input, assets: [{ ...body, construction: "limb-rig" }, ...input.assets.slice(1)] }, "whole-body-required");
  rejects({ ...input, assets: [{ ...body, fusedEquipment: ["biomask"] }, ...input.assets.slice(1)] }, "fused-equipment-forbidden");
});

test("source hashes, native orientation and crop bounds are checked independently", () => {
  const input = fixture(), body = input.assets[0];
  for (const [patch, code] of [
    [{ sha256: "" }, "missing-source-hash"], [{ src: "/game/../private.png" }, "invalid-source-path"],
    [{ width: Infinity }, "invalid-dimensions"], [{ orientation: "mirrored" }, "native-orientation-required"],
    [{ facing: "left" }, "orientation-mismatch"],
  ] as const) rejects({ ...input, assets: [{ ...body, ...patch }, ...input.assets.slice(1)] }, code);
  const f = input.clips[0].frames[0];
  rejects({ ...input, clips: [{ ...input.clips[0], frames: [{ ...f, body: { ...f.body, rect: [200, 0, 128, 256] } }] }] }, "invalid-rect");
});

test("every frame needs its own finite attachment map and explicit occlusion", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, attachments: {} }] }] }, "invalid-attachment");
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, attachments: { ...f.attachments, face: { x: NaN, y: 1, rotation: 0 } } }] }] }, "invalid-attachment");
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, equipment: [{ ...f.equipment[0], occlusion: undefined }] }] }] }, "missing-occlusion");
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, equipment: [{ ...f.equipment[0], occlusion: { mode: "mask", assetId: "body", rect: [0, 0, 128, 256] } }] }] }] }, "invalid-asset-reference");
});

test("the same physical disc cannot be in a hand and at its belt or in flight simultaneously", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, ownership: [...f.ownership, { ...f.ownership[0], location: "belt" }] }] }] }, "duplicate-item-state");
  for (const location of ["belt", "world"] as const) {
    rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, equipment: [...f.equipment, { ...f.equipment[0], location }] }] }] }, "ownership-mismatch");
  }
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, equipment: [...f.equipment, f.equipment[0]] }] }] }, "item-missing-or-duplicated");
});

test("absence removes the item image; a missing held item cannot pass silently", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, equipment: [] }] }] }, "item-missing-or-duplicated");
  const absent = { ...f, ownership: [{ ...f.ownership[0], location: "absent" as const }] };
  rejects({ ...input, clips: [{ ...clip, frames: [absent] }] }, "absent-item-drawn");
  assert.equal(api.validateExpeditionAnimationImport({ ...input, clips: [{ ...clip, frames: [{ ...absent, equipment: [] }] }] }).valid, true);
});

test("a hairstyle consists of one complete style or one complementary front/back pair", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  const hair = { ...source, id: "hair", kind: "equipment", family: "dreadlocks", construction: "whole-hairstyle" };
  const state = { itemId: "hair-1", family: "dreadlocks", location: "dread-roots" };
  const draw = { itemId: "hair-1", assetId: "hair", rect: [0, 0, 128, 256], location: "dread-roots", occlusion: { mode: "none" } };
  const manifest = { ...input, assets: [...input.assets, hair], clips: [{ ...clip, frames: [{ ...f, ownership: [state], equipment: [draw] }] }] };
  assert.equal(api.validateExpeditionAnimationImport(manifest).valid, true);
  rejects({ ...manifest, assets: [...input.assets, { ...hair, construction: "cloned-strand" }] }, "whole-hairstyle-required");
  rejects({ ...manifest, clips: [{ ...clip, frames: [{ ...f, ownership: [state], equipment: [draw, draw] }] }] }, "item-missing-or-duplicated");
  const split = { ...manifest, assets: [...input.assets, { ...hair, id: "front", construction: "hairstyle-front" }, { ...hair, id: "back", construction: "hairstyle-back" }],
    clips: [{ ...clip, frames: [{ ...f, ownership: [state], equipment: [{ ...draw, assetId: "front" }, { ...draw, assetId: "back" }] }] }] };
  assert.equal(api.validateExpeditionAnimationImport(split).valid, true);
  rejects({ ...split, clips: [{ ...clip, frames: [{ ...f, ownership: [state], equipment: [{ ...draw, assetId: "front" }] }] }] }, "item-missing-or-duplicated");
});

test("all ten customizable families are separate and unknown families are rejected", () => {
  assert.equal(new Set(api.EXPEDITION_EQUIPMENT_FAMILIES).size, 10);
  const input = fixture();
  rejects({ ...input, assets: [...input.assets, { ...source, id: "custom", kind: "equipment", family: "whole-character", construction: "separate-piece" }] }, "unknown-equipment-family");
  rejects({ ...input, assets: [...input.assets, input.assets[0]] }, "duplicate-asset-id");
});

test("caster animation cannot reset the body clock or emit gameplay side effects", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  rejects({ ...input, clips: [{ ...clip, equipmentClock: "restart-body" }] }, "gameplay-clock-required");
  for (const effect of ["spawn-projectile", "consume-ammo", "heal", "immobilize"]) {
    rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, cues: [{ eventId: "trigger", source: "gameplay", effects: [effect] }] }] }] }, "animation-effect-forbidden");
  }
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, cues: [{ eventId: "trigger", source: "animation-end", effects: [] }] }] }] }, "animation-effect-forbidden");
});

test("duplicate clips, invalid timing and physical item identity changes do not pass", () => {
  const input = fixture(), clip = input.clips[0], f = clip.frames[0];
  rejects({ ...input, clips: [clip, clip] }, "duplicate-clip");
  rejects({ ...input, clips: [{ ...clip, frames: [{ ...f, durationTicks: 0 }] }] }, "invalid-duration");
  rejects({ ...input, clips: [{ ...clip, frames: [f, { ...frame("belt", "other"), ownership: [{ itemId: "disc-1", family: "biomask", location: "belt" }] }] }] }, "item-family-changed");
});
