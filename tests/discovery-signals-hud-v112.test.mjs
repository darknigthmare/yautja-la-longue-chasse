import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCOVERY_HUD_LAYOUT_V112,
  discoverySignalLabelV112,
  discoverySignalTextV112,
  drawDiscoverySignalV112,
} from "../app/game/discoverySignalsV112.ts";

const causes = {
  visual: "CORPS REPÉRÉ",
  radio: "RADIO · CORPS",
  scent: "ODEUR · CORPS",
};
const responses = {
  investigate: "Examen demandé",
  avoid: "Évitement demandé",
  inspect: "Inspection demandée",
  guard: "Garde demandée",
};
const legacyResponses = { avoid: "ÉVITEMENT", inspect: "EXAMEN", guard: "GARDE" };
const reaction = (channel, response) => Object.freeze({
  actorId: "observed-witness",
  corpseId: "observed-body",
  channel,
  response,
  startedAt: 19.416666666666845,
  until: 26.416666666666845,
});

// Exercise the public presentation contract across both independent axes.
// This matrix does not assert that every pair is emitted by the ecology engine.
for (const [channel, cause] of Object.entries(causes)) {
  for (const [response, requestedAction] of Object.entries(responses)) {
    test(`${channel}/${response}: acquisition cause and requested response stay distinct`, () => {
      const observed = reaction(channel, response);
      assert.deepEqual(discoverySignalTextV112(observed), { cause, response: requestedAction });
      assert.equal(observed.channel, channel);
      assert.equal(observed.response, response);
    });
  }
}

test("legacy labels retain their historical cause-or-animal-response meaning", () => {
  for (const [channel, cause] of Object.entries(causes)) {
    for (const response of Object.keys(responses)) {
      assert.equal(discoverySignalLabelV112(reaction(channel, response)),
        response === "investigate" ? cause : legacyResponses[response]);
    }
  }
});

const paintKeys = ["globalAlpha", "fillStyle", "strokeStyle", "lineWidth", "font", "textAlign", "textBaseline"];
function recordingContext() {
  const calls = [], stack = [];
  return {
    calls,
    globalAlpha: .4,
    fillStyle: "#123456",
    strokeStyle: "#654321",
    lineWidth: 3,
    font: "14px serif",
    textAlign: "right",
    textBaseline: "middle",
    save() { stack.push(Object.fromEntries(paintKeys.map(key => [key, this[key]]))); calls.push({ command: "save" }); },
    restore() { Object.assign(this, stack.pop()); calls.push({ command: "restore" }); },
    translate(...args) { calls.push({ command: "translate", args }); },
    fillRect(...args) { calls.push({ command: "fillRect", args, fillStyle: this.fillStyle }); },
    beginPath() {},
    ellipse(...args) { calls.push({ command: "ellipse", args }); },
    arc(...args) { calls.push({ command: "arc", args }); },
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText(...args) {
      calls.push({ command: "fillText", args, font: this.font,
        fillStyle: this.fillStyle, textAlign: this.textAlign, textBaseline: this.textBaseline });
    },
  };
}
const paintState = context => Object.fromEntries(paintKeys.map(key => [key, context[key]]));
const fontPixels = font => Number(font.match(/([\d.]+)px/)?.[1]);

test("Canvas emits two independent text commands while preserving badge geometry and paint state", () => {
  for (const [channel, cause] of Object.entries(causes)) {
    for (const [response, requestedAction] of Object.entries(responses)) {
      const context = recordingContext(), before = paintState(context);
      drawDiscoverySignalV112(context, reaction(channel, response), 400, 220);
      const text = context.calls.filter(call => call.command === "fillText");
      assert.equal(text.length, 2, "Each badge must show cause and requested response together");
      assert.deepEqual(text.map(call => call.args), [
        [cause, -39, -2, 101],
        [requestedAction, -39, 9, 101],
      ]);
      assert.deepEqual(text.map(call => fontPixels(call.font)), [9, 8]);
      assert.ok(text.every(call => call.fillStyle === "#f3f0df" &&
        call.textAlign === "left" && call.textBaseline === "alphabetic"));
      assert.deepEqual(context.calls.find(call => call.command === "fillRect"), {
        command: "fillRect", args: [-66, -13, 132, 26], fillStyle: "#10231fee",
      });
      assert.deepEqual(context.calls.find(call => call.command === "translate")?.args, [400, 220]);
      assert.equal(context.calls[0].command, "save");
      assert.equal(context.calls.at(-1).command, "restore");
      assert.deepEqual(paintState(context), before, "A badge must not alter subsequent world drawing");
    }
  }
});

test("declared text baselines and maximum width stay inside the existing 132 by 26 badge", () => {
  assert.deepEqual(DISCOVERY_HUD_LAYOUT_V112, {
    width: 132, height: 26,
    causeBaseline: -2, responseBaseline: 9,
    causeFontPx: 9, responseFontPx: 8,
    textLeft: -39, textMaximumWidth: 101,
  });
  const layout = DISCOVERY_HUD_LAYOUT_V112;
  assert.ok(layout.textLeft >= -layout.width / 2);
  assert.ok(layout.textLeft + layout.textMaximumWidth <= layout.width / 2);
  assert.ok(layout.causeBaseline > -layout.height / 2);
  assert.ok(layout.responseBaseline < layout.height / 2);
  assert.ok(layout.responseBaseline - layout.causeBaseline >= layout.causeFontPx);
  // Actual font ascent/descent and legibility require the real browser evidence.
});
