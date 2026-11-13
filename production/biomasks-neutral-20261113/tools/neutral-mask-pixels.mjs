/**
 * User-authorized, deterministic RGB-only neutral derivatives of pinned B PNGs.
 * This module never crops, resizes, rotates, thresholds alpha, edits a source,
 * calls ImageGen, or grants art/canonical/runtime validation.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const METHOD = Object.freeze({
  id: 'srgb8-rec709-luma-v1',
  version: 1,
  formula: 'Y=floor((2126*R+7152*G+722*B+5000)/10000); RGBA=(Y,Y,Y,inputA)',
  domain: 'stored sRGB-encoded 8-bit channels; no gamma/ICC conversion or linear-light claim',
  weights: Object.freeze([2126, 7152, 722]),
  divisor: 10000,
  roundingOffset: 5000,
  alpha: 'decoded alpha bytes copied exactly, including zero and weak antialias',
  format: 'lossless non-palette PNG RGBA8',
});

const INPUT_OPTIONS = Object.freeze({ ignoreIcc: true, autoOrient: false, failOn: 'warning' });
let processor;

function fail(code, message) {
  const error = new Error(message);
  error.name = 'NeutralMaskError';
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sharpProcessor() {
  if (processor) return processor;
  const checkoutRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const dependenciesRoot = process.env.MASK_TOOL_DEPENDENCIES_ROOT
    ? filePath(process.env.MASK_TOOL_DEPENDENCIES_ROOT, 'MASK_TOOL_DEPENDENCIES_ROOT')
    : checkoutRoot;
  const local = createRequire(path.join(dependenciesRoot, 'package.json'));
  let resolved;
  try {
    // Resolve this checkout's package explicitly: a bare lookup in /tmp can
    // otherwise select an unrelated cloud-global node_modules/sharp version.
    resolved = local.resolve(path.join(dependenciesRoot, 'node_modules', 'sharp'));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    fail('SHARP_UNAVAILABLE', 'Use the locked Sharp package in this checkout or set MASK_TOOL_DEPENDENCIES_ROOT to its existing project root');
  }
  processor = { sharp: local(resolved), resolved };
  return processor;
}

function sourcePin(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value)) {
    fail('PIN_REQUIRED', 'expectedSourceSha256 must be an explicit SHA-256 hex pin');
  }
  return value.toLowerCase();
}

function filePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\0')) {
    fail('INVALID_PATH', `${label} must be a nonempty filesystem path`);
  }
  return path.resolve(value);
}

async function decodeRgba(bytes, label) {
  const { sharp } = sharpProcessor();
  const image = sharp(bytes, INPUT_OPTIONS);
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || metadata.depth !== 'uchar' || metadata.channels !== 4
      || metadata.isPalette || metadata.space !== 'srgb'
      || (metadata.pages !== undefined && metadata.pages !== 1)
      || (metadata.orientation !== undefined && metadata.orientation !== 1)) {
    fail('UNSUPPORTED_SOURCE', `${label} must be a single native PNG RGBA8 in stored sRGB orientation`);
  }
  const { data, info } = await image.raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || info.width !== metadata.width || info.height !== metadata.height
      || data.length !== info.width * info.height * 4) {
    fail('DECODE_CONTRACT', `${label} did not decode to the unchanged RGBA8 frame`);
  }
  return { data, width: info.width, height: info.height, metadata };
}

function pixelFacts(decoded) {
  const { data, width, height } = decoded;
  const alpha = Buffer.allocUnsafe(width * height);
  let chromaPixels = 0;
  let chromaPixelsAlphaNonzero = 0;
  let alphaZeroPixels = 0;
  let alpha1to9Pixels = 0;
  let minAlpha = 255;
  let maxAlpha = 0;
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let p = 0, i = 0; i < data.length; p++, i += 4) {
    const a = data[i + 3];
    alpha[p] = a;
    minAlpha = Math.min(minAlpha, a);
    maxAlpha = Math.max(maxAlpha, a);
    if (a === 0) alphaZeroPixels++;
    if (a > 0 && a < 10) alpha1to9Pixels++;
    if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) {
      chromaPixels++;
      if (a > 0) chromaPixelsAlphaNonzero++;
    }
    if (a >= 16) {
      const x = p % width;
      const y = Math.floor(p / width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return {
    alpha,
    alphaSha256: sha256(alpha),
    strictMonochrome: chromaPixels === 0,
    chromaPixels,
    chromaPixelsAlphaNonzero,
    alphaZeroPixels,
    alpha1to9Pixels,
    alphaExtrema: [minAlpha, maxAlpha],
    visibleBounds16: right > left && bottom > top ? [left, top, right, bottom] : null,
  };
}

async function pinnedSource(sourcePath, expectedSourceSha256) {
  const source = filePath(sourcePath, 'sourcePath');
  const expected = sourcePin(expectedSourceSha256);
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail('UNSUPPORTED_SOURCE', 'sourcePath must be a regular native file, not a symlink');
  }
  const bytes = await fs.readFile(source);
  const digest = sha256(bytes);
  if (digest !== expected) fail('SOURCE_PIN_MISMATCH', `Pinned source changed: ${source}`);
  const decoded = await decodeRgba(bytes, 'Source B');
  const facts = pixelFacts(decoded);
  if (!facts.visibleBounds16 || facts.alphaZeroPixels === 0) {
    fail('INVALID_MASK_ALPHA', 'Source B must contain a visible mask and actual transparent exterior');
  }
  return { source, bytes, digest, decoded, facts };
}

function inspection(source) {
  const { sharp, resolved } = sharpProcessor();
  const { facts, decoded } = source;
  return {
    sourcePath: source.source,
    sourceSha256: source.digest,
    sourceBytes: source.bytes.length,
    nativeDimensions: [decoded.width, decoded.height],
    nativeMode: 'RGBA',
    sourceAlphaSha256: facts.alphaSha256,
    strictMonochrome: facts.strictMonochrome,
    chromaPixels: facts.chromaPixels,
    chromaPixelsAlphaNonzero: facts.chromaPixelsAlphaNonzero,
    alphaExtrema: facts.alphaExtrema,
    alphaZeroPixels: facts.alphaZeroPixels,
    alpha1to9Pixels: facts.alpha1to9Pixels,
    visibleBounds16: facts.visibleBounds16,
    sourceIccProfilePresent: Boolean(decoded.metadata.icc),
    sourceSrgbIntent: decoded.metadata.srgbIntent ?? null,
    methodId: METHOD.id,
    processor: { node: process.versions.node, sharp: sharp.versions.sharp, vips: sharp.versions.vips, resolved },
    sourceFileMutation: false,
  };
}

/** Exact integer Rec709 luma on encoded sRGB8, not linear-light luminance. */
export function rec709Srgb8(r, g, b) {
  if (![r, g, b].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) {
    fail('INVALID_CHANNEL', 'Rec709 inputs must be integer channel bytes');
  }
  return Math.floor((2126 * r + 7152 * g + 722 * b + 5000) / 10000);
}

/** Decode and measure only; does not create an image or mutate any file. */
export async function inspectMaskPixels({ sourcePath, expectedSourceSha256 } = {}) {
  return inspection(await pinnedSource(sourcePath, expectedSourceSha256));
}

/**
 * Write a new C pathname only after in-memory verification. Existing paths are
 * never overwritten. Source B, including its raw alpha, is never modified.
 */
export async function createNeutralMask({ sourcePath, outputPath, expectedSourceSha256 } = {}) {
  const source = await pinnedSource(sourcePath, expectedSourceSha256);
  const output = filePath(outputPath, 'outputPath');
  if (output === source.source) fail('SOURCE_IS_OUTPUT', 'C outputPath must differ from source B');
  try {
    await fs.lstat(output);
    fail('OUTPUT_EXISTS', `Refusing to overwrite existing output: ${output}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const reuse = source.facts.strictMonochrome;
  let outputBytes = source.bytes;
  if (!reuse) {
    const { sharp } = sharpProcessor();
    const rgba = Buffer.from(source.decoded.data);
    for (let i = 0; i < rgba.length; i += 4) {
      const y = Math.floor((2126 * rgba[i] + 7152 * rgba[i + 1] + 722 * rgba[i + 2] + 5000) / 10000);
      rgba[i] = rgba[i + 1] = rgba[i + 2] = y;
      // rgba[i+3] is intentionally never assigned: retain its original byte.
    }
    outputBytes = await sharp(rgba, {
      raw: { width: source.decoded.width, height: source.decoded.height, channels: 4 },
    }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  }

  const result = await decodeRgba(outputBytes, 'Derived C');
  const resultFacts = pixelFacts(result);
  if (result.width !== source.decoded.width || result.height !== source.decoded.height
      || !resultFacts.alpha.equals(source.facts.alpha) || !resultFacts.strictMonochrome) {
    fail('OUTPUT_PIXEL_CONTRACT', 'C changed native dimensions/alpha or is not strictly monochrome');
  }
  for (let i = 0; i < result.data.length; i += 4) {
    const rgb = source.decoded.data;
    const expected = Math.floor((2126 * rgb[i] + 7152 * rgb[i + 1] + 722 * rgb[i + 2] + 5000) / 10000);
    if (result.data[i] !== expected || result.data[i + 1] !== expected || result.data[i + 2] !== expected) {
      fail('OUTPUT_LUMA_MISMATCH', `C pixel ${i / 4} violates ${METHOD.id}`);
    }
  }
  // Do not admit an output derived from a source concurrently changed on disk.
  if (sha256(await fs.readFile(source.source)) !== source.digest) {
    fail('SOURCE_PIN_MISMATCH', 'Source B changed during conversion; no C was written');
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  const handle = await fs.open(output, 'wx');
  try {
    await handle.writeFile(outputBytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const digest = sha256(outputBytes);
  if (sha256(await fs.readFile(output)) !== digest) {
    fail('OUTPUT_WRITE_MISMATCH', 'Written C does not match the verified output buffer');
  }
  return {
    ...inspection(source),
    outputPath: output,
    sha256: digest,
    bytes: outputBytes.length,
    outputAlphaSha256: resultFacts.alphaSha256,
    alphaByteIdentical: true,
    strictMonochrome: true,
    sourceStrictMonochrome: source.facts.strictMonochrome,
    sourceChromaPixels: source.facts.chromaPixels,
    sourceChromaPixelsAlphaNonzero: source.facts.chromaPixelsAlphaNonzero,
    chromaPixels: resultFacts.chromaPixels,
    chromaPixelsAlphaNonzero: resultFacts.chromaPixelsAlphaNonzero,
    visibleBounds16: resultFacts.visibleBounds16,
    renderMode: reuse ? 'source-reuse' : 'deterministic-grayscale',
    derivedNew: !reuse,
    newImageGeneration: false,
    generatedNew: false,
    pixelEditingPerformed: !reuse,
    sourceFileMutation: false,
    encodedSourceByteReuse: reuse,
    nativeCopyIdentical: reuse,
    method: METHOD,
    canonCertified: false,
    humanArtValidated: false,
    runtimeIntegrated: false,
    animated: false,
  };
}

async function cli(argv) {
  if (argv.includes('--help')) {
    process.stdout.write('Inspect: node neutral-mask-pixels.mjs --inspect --source B.png --source-sha SHA256\n'
      + 'Create C: node neutral-mask-pixels.mjs --source B.png --source-sha SHA256 --output C.png\n');
    return;
  }
  const options = {};
  let inspect = false;
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--inspect') { inspect = true; continue; }
    const field = { '--source': 'sourcePath', '--source-sha': 'expectedSourceSha256', '--output': 'outputPath' }[key];
    if (!field || i + 1 >= argv.length || argv[i + 1].startsWith('--') || field in options) {
      fail('CLI_ARGUMENT', `Invalid, duplicate or incomplete argument: ${key}`);
    }
    options[field] = argv[++i];
  }
  if (inspect && options.outputPath) fail('CLI_ARGUMENT', '--inspect cannot write an --output');
  const result = inspect ? await inspectMaskPixels(options) : await createNeutralMask(options);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await cli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error.code ?? error.name, message: error.message }) + '\n');
    process.exitCode = 1;
  }
}
