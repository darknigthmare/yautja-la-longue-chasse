var Badge = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    DISCOVERY_HUD_LAYOUT_V112: () => DISCOVERY_HUD_LAYOUT_V112,
    DISCOVERY_LABELS_V112: () => DISCOVERY_LABELS_V112,
    DISCOVERY_RESPONSE_LABELS_V112: () => DISCOVERY_RESPONSE_LABELS_V112,
    discoverySignalLabelV112: () => discoverySignalLabelV112,
    discoverySignalTextV112: () => discoverySignalTextV112,
    drawDiscoverySignalV112: () => drawDiscoverySignalV112
  });

  // app/game/discoverySignalsV112.ts
  var DISCOVERY_LABELS_V112 = {
    visual: "CORPS REP\xC9R\xC9",
    radio: "RADIO \xB7 CORPS",
    scent: "ODEUR \xB7 CORPS",
    avoid: "\xC9VITEMENT",
    inspect: "EXAMEN",
    guard: "GARDE"
  };
  var DISCOVERY_RESPONSE_LABELS_V112 = {
    investigate: "Examen demand\xE9",
    avoid: "\xC9vitement demand\xE9",
    inspect: "Inspection demand\xE9e",
    guard: "Garde demand\xE9e"
  };
  var DISCOVERY_HUD_LAYOUT_V112 = {
    width: 132,
    height: 26,
    causeBaseline: -2,
    responseBaseline: 9,
    causeFontPx: 9,
    responseFontPx: 8,
    textLeft: -39,
    textMaximumWidth: 101
  };
  function discoverySignalTextV112(reaction) {
    return { cause: DISCOVERY_LABELS_V112[reaction.channel], response: DISCOVERY_RESPONSE_LABELS_V112[reaction.response] };
  }
  function discoverySignalLabelV112(reaction) {
    return reaction.response === "investigate" ? DISCOVERY_LABELS_V112[reaction.channel] : DISCOVERY_LABELS_V112[reaction.response];
  }
  function drawDiscoverySignalV112(context, reaction, x, y) {
    const layout = DISCOVERY_HUD_LAYOUT_V112, text = discoverySignalTextV112(reaction);
    context.save();
    context.translate(x, y);
    context.globalAlpha = 0.96;
    context.fillStyle = "#10231fee";
    context.fillRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height);
    context.strokeStyle = reaction.channel === "radio" ? "#8bd7ff" : "#f1d49a";
    context.lineWidth = 1.8;
    context.beginPath();
    if (reaction.response !== "investigate") {
      context.arc(-51, 2, 3, 0, Math.PI * 2);
      context.moveTo(-54, -5);
      context.arc(-55, -5, 1.4, 0, Math.PI * 2);
      context.moveTo(-48, -6);
      context.arc(-49, -6, 1.4, 0, Math.PI * 2);
      context.moveTo(-44, -3);
      context.arc(-45, -3, 1.4, 0, Math.PI * 2);
    } else if (reaction.channel === "radio") {
      context.moveTo(-54, 7);
      context.lineTo(-54, -6);
      context.lineTo(-49, -10);
      context.moveTo(-50, -4);
      context.arc(-54, 1, 7, -0.75, 0.75);
      context.moveTo(-47, -7);
      context.arc(-54, 1, 11, -0.75, 0.75);
    } else {
      context.ellipse(-53, 0, 8, 5, 0, 0, Math.PI * 2);
      context.moveTo(-50, 0);
      context.arc(-53, 0, 2.4, 0, Math.PI * 2);
    }
    context.stroke();
    context.fillStyle = "#f3f0df";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = `700 ${layout.causeFontPx}px sans-serif`;
    context.fillText(text.cause, layout.textLeft, layout.causeBaseline, layout.textMaximumWidth);
    context.font = `600 ${layout.responseFontPx}px sans-serif`;
    context.fillText(text.response, layout.textLeft, layout.responseBaseline, layout.textMaximumWidth);
    context.restore();
  }
  return __toCommonJS(stdin_exports);
})();
