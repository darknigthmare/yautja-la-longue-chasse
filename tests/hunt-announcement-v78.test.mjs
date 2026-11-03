import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const queueSource = fs.readFileSync("app/game/huntAnnouncementQueueV78.ts", "utf8");
const exports = {};
runInNewContext(ts.transpileModule(queueSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { createHuntAnnouncementQueueV78: empty, enqueueHuntAnnouncementV78: enqueue,
  advanceHuntAnnouncementQueueV78: advance } = exports;
const source = fs.readFileSync("app/game/HuntCanvas.tsx", "utf8");
const file = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function runtimeFunctions(names, context) {
  const declarations = names.map(name => {
    const declaration = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert(declaration, "actual " + name + " must exist");
    return declaration.getText(file) + "\nthis." + name + "=" + name + ";";
  }).join("\n");
  runInNewContext(ts.transpileModule(declarations, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context;
}
function scene() {
  const context = runtimeFunctions(["announce", "visibleHuntAnnouncementV78", "selectWeaponSlot", "addHonor", "completeObjective"], {
    huntAnnouncementsV78: new WeakMap(),
    createHuntAnnouncementQueueV78: empty, enqueueHuntAnnouncementV78: enqueue, advanceHuntAnnouncementQueueV78: advance,
    equippedWeapon: (_loadout, slot) => ({ name: slot === 1 ? "Plasma" : "Combistick" }),
    queueSound: (state, sound) => state.sounds.push(sound),
  });
  const state = { elapsed: 0, phase: "target", trophyExtracting: false, message: "", messageTimer: 0,
    player: { activeWeaponSlot: 0, weaponChargeSeconds: 0 }, sounds: [],
    honor: 0, honorEvents: [], completedObjectives: new Set(), inventory: { trophy: 0 } };
  return { context, state };
}

test("real weapon callback cannot erase a narrative beat or grant extra progress", () => {
  const { context: c, state } = scene();
  c.announce(state, "Technologie du clan récupérée.", 4, "narrative");
  state.elapsed = 1;
  c.selectWeaponSlot(state, {}, 1);
  assert.equal(state.player.activeWeaponSlot, 1);
  assert.equal(state.message, "Plasma sélectionné.", "legacy canonical fields remain intact");
  assert.equal(state.messageTimer, 1.2);
  assert.equal(c.visibleHuntAnnouncementV78(state), "Technologie du clan récupérée.");
  assert.equal(state.phase, "target"); assert.equal(state.honor, 0);
  assert.equal(state.completedObjectives.size, 0); assert.equal(state.inventory.trophy, 0);
  state.elapsed = 4;
  assert.equal(c.visibleHuntAnnouncementV78(state), "", "discard stale tool feedback instead of replaying it");
  assert.equal("announcementQueue" in state, false, "queue is outside serializable game state");
});

test("same-frame narrative beats keep FIFO order despite repeated routine feedback", () => {
  let q = enqueue(empty(), "Objectif accompli.", 4, "narrative", 0);
  q = enqueue(q, "La cible peut être pistée.", 4, "narrative", 0);
  for (let i = 0; i < 20; i++) q = enqueue(q, "Arme " + i, 1, "routine", 1);
  assert.equal(advance(q, 3.9).active.text, "Objectif accompli.");
  assert.equal(advance(q, 4).active.text, "La cible peut être pistée.");
  assert.equal(advance(q, 8).active, null);
});

test("tactical warnings preempt immediately, then finish the interrupted narrative duration", () => {
  let q = enqueue(empty(), "Relais synchronisé.", 4, "narrative", 0);
  q = enqueue(q, "La glace se fissure.", 1, "tactical", 1);
  assert.equal(q.active.text, "La glace se fissure.");
  q = enqueue(q, "Biomask retiré.", 1, "routine", 1.5);
  assert.equal(q.active.text, "La glace se fissure.");
  const resumed = advance(q, 2);
  assert.equal(resumed.active.text, "Relais synchronisé.");
  assert.equal(resumed.active.remaining, 3);
  assert.equal(advance(resumed, 5).active, null);
});

test("warnings never wait in a backlog and prose is bounded and expires", () => {
  let q = enqueue(empty(), "Narration 0", 6, "narrative", 0);
  for (let i = 1; i <= 50; i++) q = enqueue(q, "Narration " + i, 6, "narrative", 0);
  assert.equal(q.pending.length, 2);
  assert.equal(q.pending[0].text, "Narration 49");
  q = enqueue(q, "Danger A", 1, "tactical", 0);
  q = enqueue(q, "Danger B", 1, "tactical", .1);
  assert.equal(q.active.text, "Danger B"); assert(q.pending.every(item => item.priority === "narrative"));
  assert.equal(advance(q, 20).active, null); assert.equal(advance(q, 20).pending.length, 0);
});

test("duplicate feedback cannot extend prose forever; frozen simulation time freezes the queue", () => {
  let q = enqueue(empty(), "Objectif accompli.", 4, "narrative", 0);
  q = enqueue(q, "Objectif accompli.", 4, "narrative", 3);
  assert.equal(q.active.remaining, 1);
  const frozen = advance(q, 3); assert.equal(advance(frozen, 3).active.remaining, 1);
  assert.equal(advance(q, 4).active, null);
  const rewound = advance(q, 1);
  assert.equal(rewound.active, null, "a rewound owner cannot replay a future announcement");
});

test("real QTE/death helper uses immediate canonical feedback and a resumed owner inherits no prose", () => {
  const { context: c, state } = scene();
  c.announce(state, "Objectif accompli.", 4, "narrative");
  c.announce(state, "Rythme manqué.", 1.25, "routine");
  state.trophyExtracting = true;
  assert.equal(c.visibleHuntAnnouncementV78(state), "Rythme manqué.");
  state.trophyExtracting = false; state.phase = "dead";
  assert.equal(c.visibleHuntAnnouncementV78(state), "Rythme manqué.");
  const resumed = { ...state, phase: "target", message: "Chasse reprise.", messageTimer: 4 };
  assert.equal(c.visibleHuntAnnouncementV78(resumed), "Chasse reprise.");
});

test("actual completed-objective callback retains its single authored honor event and sound", () => {
  const { context: c, state } = scene();
  const mission = { objectives: [{ id: "scan", label: "Étudier la cible", honorBonus: 5 }] };
  c.completeObjective(state, mission, "scan"); c.completeObjective(state, mission, "scan");
  c.selectWeaponSlot(state, {}, 1);
  assert.equal(c.visibleHuntAnnouncementV78(state), "Objectif accompli : Étudier la cible");
  assert.equal(state.completedObjectives.size, 1); assert.equal(state.honor, 5); assert.equal(state.honorEvents.length, 1);
  assert.equal(state.sounds.filter(sound => sound === "objective").length, 1);
  assert.equal(state.phase, "target"); assert.equal(state.inventory.trophy, 0);
});

test("actual local-map condition exposes detailed topology only for authored region graphs", () => {
  const component = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "HuntCanvas");
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "hasLocalMap") initializer = node.initializer.getText(file);
    ts.forEachChild(node, visit);
  } visit(component);
  assert(initializer);
  for (const [id, expected] of [["jungle-vey", true], ["ice-colony", true], ["authored-expansion", true], ["unsupported", false]]) {
    const context = { mission: { id }, PILOT_MISSION_ID: "jungle-vey", ICE_MISSION_ID: "ice-colony",
      isExpansionExplorationMission: missionId => missionId === "authored-expansion" };
    runInNewContext("this.hasLocal=" + initializer + ";", context); assert.equal(context.hasLocal, expected);
  }
});
