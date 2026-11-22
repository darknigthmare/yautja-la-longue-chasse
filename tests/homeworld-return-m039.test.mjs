import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const { actHomeworldReturnM039, homeworldReturnHuntsM039, normalizeHomeworldReturnM039, HOMEWORLD_RETURN_CONTACTS_M039, HOMEWORLD_RETURN_LINKS_M039 } = qa.load("app/game/systems/homeworldReturnM039.ts");
const { defaultSave, normalizeSave, parseSaveImport } = qa.load("app/game/save.ts");
const { HOMEWORLD_ACTOR } = qa.load("app/game/systems/homeworld.ts");
const { isHomeworldInteriorWalkableV64, homeworldInteriorForBuildingV64, nearestHomeworldInteriorTargetV64 } = qa.load("app/game/systems/homeworldInteriorsV64.ts");
const ReturnDialogue = qa.load("app/game/HomeworldReturnM039.tsx").default;
const InteriorSurface = qa.load("app/game/HomeworldInteriorSurface.tsx").default;
const at = contact => ({ ...HOMEWORLD_RETURN_CONTACTS_M039[contact], suspended: false });

function campaign() {
  const save = defaultSave("2026-11-22T10:00:00.000Z");
  save.profile.rankId = "blooded";
  save.profile.acquiredRankIdV166 = "blooded";
  save.missionProgress["jungle-vey"] = { ...save.missionProgress["jungle-vey"], status: "completed", attempts: 1, completions: 1 };
  save.missionProgress["ice-cryostalker"].status = "available";
  return save;
}

function confirm(save, action, contact) {
  const result = actHomeworldReturnM039(save.homeworld.returnM039, save, action, at(contact));
  assert.ok(result.state, result.message);
  const normalized = normalizeSave(JSON.parse(JSON.stringify({
    ...save, homeworld: { ...save.homeworld, returnM039: result.state },
  })));
  assert.deepEqual(normalized.homeworld.returnM039, result.state, "A save round-trip must conserve the step and the owner");
  return normalized;
}

test("M039 requires a recorded hunt and admits each action only at the correct native station", () => {
  const save = campaign();
  assert.deepEqual(homeworldReturnHuntsM039(save).map(hunt => hunt.id), ["jungle-vey"]);
  for (const place of ["officer", "artisan"]) {
    const { roomId, pointId } = at(place);
    const room = homeworldInteriorForBuildingV64(roomId);
    assert.ok(room);
    const point = room.points.find(point => point.pointId === pointId);
    assert.ok(point);
    const nearby = [];
    for (let dx = -60; dx <= 60; dx += 4) {
      for (let dy = -60; dy <= 60; dy += 4) {
        const actor = { x: point.x + dx, y: point.y + dy };
        const target = nearestHomeworldInteriorTargetV64(room, actor);
        if (target?.kind === "point" && target.pointId === pointId &&
          isHomeworldInteriorWalkableV64(room, actor, HOMEWORLD_ACTOR)) nearby.push(actor);
      }
    }
    assert.ok(nearby.length, pointId);
  }
  const accept = { kind: "accept" };
  assert.equal(actHomeworldReturnM039(undefined, save, accept, at("artisan")).state, undefined);
  assert.equal(actHomeworldReturnM039(undefined, save, accept, { ...at("officer"), suspended: true }).state, undefined);
  assert.equal(actHomeworldReturnM039(undefined, save, { kind: "mount" }, at("officer")).state, undefined);
  save.missionProgress["jungle-vey"].status = "available";
  assert.equal(actHomeworldReturnM039(undefined, save, accept, at("officer")).state, undefined);
  save.missionProgress["jungle-vey"].status = "completed";
  save.missionProgress["jungle-vey"].completions = 0;
  assert.equal(actHomeworldReturnM039(undefined, save, accept, at("officer")).state, undefined);
  save.missionProgress["jungle-vey"].completions = 1;
  save.profile.rankId = "young-blood";
  assert.equal(actHomeworldReturnM039(undefined, save, accept, at("officer")).state, undefined);
});

test("M039 repairs the same relay and files one report after the verified sequence", () => {
  for (const choice of HOMEWORLD_RETURN_LINKS_M039) {
    const original = campaign();
    let save = confirm(original, { kind: "accept" }, "officer");
    assert.equal(save.homeworld.returnM039.phase, "assigned");
    assert.equal(actHomeworldReturnM039(save.homeworld.returnM039, save, { kind: "mount" }, at("officer")).state, undefined);
    assert.equal(actHomeworldReturnM039(save.homeworld.returnM039, save, { kind: "receive-part" }, at("officer")).state, undefined);
    save = confirm(save, { kind: "receive-part" }, "artisan");
    assert.equal(save.homeworld.returnM039.phase, "part-ready");
    save = confirm(save, { kind: "mount" }, "officer");
    assert.equal(save.homeworld.returnM039.phase, "mounted");
    assert.equal(actHomeworldReturnM039(save.homeworld.returnM039, save, { kind: "report", link: choice.id }, at("officer")).state, undefined);
    save = confirm(save, { kind: "test" }, "officer");
    assert.equal(save.homeworld.returnM039.phase, "commissioned");
    save = confirm(save, { kind: "report", link: choice.id }, "officer");
    assert.equal(save.homeworld.returnM039.phase, "reported");
    assert.equal(save.homeworld.returnM039.link, choice.id);
    assert.equal(parseSaveImport(JSON.stringify(save)).save.homeworld.returnM039.link, choice.id);
    assert.equal(actHomeworldReturnM039(save.homeworld.returnM039, save, { kind: "report", link: choice.id }, at("officer")).state, undefined);
    assert.deepEqual(save.profile, original.profile);
    assert.deepEqual(save.inventory, original.inventory);
    assert.deepEqual(save.missionProgress, original.missionProgress);
  }
});

test("M039 rejects mismatched owners, invalid links and duplicated evidence", () => {
  const save = campaign();
  const receipt = confirm(save, { kind: "accept" }, "officer").homeworld.returnM039;
  assert.equal(normalizeHomeworldReturnM039({ ...receipt, huntIds: ["jungle-vey", "jungle-vey"] }), null);
  assert.equal(normalizeHomeworldReturnM039({ ...receipt, phase: "reported", link: "unexpected" }), null);
  for (const altered of [
    { ...receipt, ownerCreatedAt: "2026-11-22T09:00:00.000Z" },
    { ...receipt, huntIds: ["ice-cryostalker"] },
  ]) {
    assert.equal(actHomeworldReturnM039(altered, save, { kind: "receive-part" }, at("artisan")).state, undefined);
  }
});

test("M039 renders dialogue grounded in the completed hunt and changes the native relay signal", () => {
  const save = campaign();
  const markup = renderToStaticMarkup(createElement(ReturnDialogue, {
    contact: "officer", hunts: homeworldReturnHuntsM039(save), disabled: false, onAction() {},
  }));
  assert.match(markup, /Oseris-IV/);
  assert.doesNotMatch(markup, /Nivalis-K/);
  assert.match(markup, /Prendre en charge le relais du quai/);

  let progressing = confirm(save, { kind: "accept" }, "officer");
  const room = homeworldInteriorForBuildingV64(at("officer").roomId);
  const renderRoom = () => renderToStaticMarkup(createElement(InteriorSurface, {
    room, actorPosition: room.spawn, activePointId: at("officer").pointId, returnM039: progressing.homeworld.returnM039,
  }));
  assert.match(renderRoom(), /data-homeworld-relay-m039="offline"/);
  progressing = confirm(progressing, { kind: "receive-part" }, "artisan");
  progressing = confirm(progressing, { kind: "mount" }, "officer");
  assert.match(renderRoom(), /data-homeworld-relay-m039="offline"/);
  progressing = confirm(progressing, { kind: "test" }, "officer");
  assert.match(renderRoom(), /data-homeworld-relay-m039="online"/);
});
