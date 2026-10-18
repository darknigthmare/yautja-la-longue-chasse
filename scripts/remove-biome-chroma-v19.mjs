import sharp from "sharp";

export const BIOME_CHROMA_PARAMETERS_V19 = Object.freeze({
  transparentThreshold: 12,
  opaqueThreshold: 220,
  despill: true,
});

function parametersFor(keyColor, options) {
  if (!Array.isArray(keyColor) || keyColor.length !== 3 || keyColor.some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    throw new Error("La couleur chroma doit contenir trois canaux RGB entiers.");
  }
  const parameters = { ...BIOME_CHROMA_PARAMETERS_V19, ...options };
  const { transparentThreshold, opaqueThreshold, despill } = parameters;
  if (!Number.isInteger(transparentThreshold) || !Number.isInteger(opaqueThreshold)
    || transparentThreshold < 0 || opaqueThreshold > 255 || transparentThreshold >= opaqueThreshold || typeof despill !== "boolean") {
    throw new Error("Seuils chroma invalides : 0 ≤ transparent < opaque ≤ 255.");
  }
  const green = keyColor[1] >= Math.max(keyColor[0], keyColor[2]) + 70;
  const magenta = Math.min(keyColor[0], keyColor[2]) >= keyColor[1] + 70;
  if (!green && !magenta) throw new Error("Le traitement portable V19 demande un fond vert ou magenta.");
  return { ...parameters, keyColor: [...keyColor], family: green ? "green" : "magenta" };
}

/** Project-owned RGB-distance matte for the reserved green/magenta backgrounds
 * of V19 props. This is not the external imagegen Python helper and does not
 * claim pixel-equivalent results. Fully separated opaque subject colors stay
 * unchanged; partial matte pixels are unmixed and despilled. Existing input
 * transparency can only decrease, and transparent RGB is always cleaned. */
export function removeBiomeChromaPixelsV19(input, keyColor, options = {}) {
  const parameters = parametersFor(keyColor, options);
  if (!(input instanceof Uint8Array) || input.length % 4 !== 0) throw new Error("Une image RGBA 8 bits est requise.");
  const output = Buffer.from(input);
  const { transparentThreshold, opaqueThreshold, despill, family } = parameters;
  const byte = value => Math.max(0, Math.min(255, Math.round(value)));
  let transparentPixels = 0, softPixels = 0, opaquePixels = 0;
  for (let offset = 0; offset < input.length; offset += 4) {
    const distance = Math.hypot(input[offset] - keyColor[0], input[offset + 1] - keyColor[1], input[offset + 2] - keyColor[2]);
    const matte = Math.max(0, Math.min(1, (distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)));
    const alpha = byte(input[offset + 3] * matte);
    output[offset + 3] = alpha;
    if (alpha === 0) {
      output.fill(0, offset, offset + 4);
      transparentPixels++;
      continue;
    }
    if (matte < 1) {
      for (let channel = 0; channel < 3; channel++) output[offset + channel] = byte((input[offset + channel] - (1 - matte) * keyColor[channel]) / matte);
      if (despill && family === "green") output[offset + 1] = Math.min(output[offset + 1], Math.max(output[offset], output[offset + 2]));
      if (despill && family === "magenta") {
        const spill = Math.max(0, Math.min(output[offset], output[offset + 2]) - output[offset + 1]);
        output[offset] -= spill;
        output[offset + 2] -= spill;
      }
    }
    if (alpha === 255) opaquePixels++;
    else softPixels++;
  }
  return { data: output, parameters, transparentPixels, softPixels, opaquePixels };
}

export async function removeBiomeChromaV19({ input, output, keyColor, ...options }) {
  const { data, info } = await sharp(input).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const processed = removeBiomeChromaPixelsV19(data, keyColor, options);
  await sharp(processed.data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
  return { parameters: processed.parameters, transparentPixels: processed.transparentPixels, softPixels: processed.softPixels, opaquePixels: processed.opaquePixels };
}
