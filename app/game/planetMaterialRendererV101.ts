import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import {
  createPlanetRegionMaskV102, loadPlanetRegionalAtlasV102, planetRegionalMaterialStatusV102,
  PLANET_REGIONAL_ATLAS_LIMIT_V102, planetRegionalAtlasKeyV102,
} from "./planetRegionalMaterialsV102";
import { loadPlanetDetailedMaterialV103, planetDetailedMaterialKeyV103, planetDetailedMaterialStatusV103 } from "./planetDetailMaterialsV103";
import { planetMaterialSourceV103, planetRegionalLayoutV103 } from "./systems/planetMaterialProfilesV103";
import { createPlanetTextureCanvasV115 } from "./systems/clanWarTextureLibraryV115";
import {
  DEFAULT_PLANET_MATERIAL_SETTINGS_V101, PLANET_MATERIAL_LAYERS_V101, planetMaterialRecipeV101,
  unwrapPlanetPolygonV101, wrapPlanetLongitudeV101, planetMaterialSourceV101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101, type PlanetMaterialViewV101,
} from "./systems/planetMaterialV101";

export interface PlanetMaterialRenderRequestV101 extends PlanetMaterialViewV101 {
  planet: WarPlanetV96;
  layer?: PlanetMaterialLayerV101;
  settings?: Readonly<PlanetMaterialSettingsV101>;
  textureSize?: 512 | 1024 | 2048;
  signal?: AbortSignal;
}

/** One shared GPU context serves the atlas and every visible portrait. Sources,
 * masks and GPU textures are bounded; no animation loop runs while idle. */
const sourceCache = new Map<string, HTMLCanvasElement>();
const pendingSources = new Map<string, Promise<HTMLCanvasElement>>();
const loadQueue: Array<() => void> = [];
let activeLoads = 0;
const maskCache = new Map<string, HTMLCanvasElement>();
const SOURCE_LIMIT = 16, MASK_LIMIT = 6, TEXTURE_LIMIT = 22;
export const PLANET_RENDERER_EVENT_V101 = "yautja-planet-renderer-v101";

function touch<K, V>(cache: Map<K, V>, key: K, value: V) { cache.delete(key); cache.set(key, value); return value; }
function trim<K, V>(cache: Map<K, V>, limit: number, dispose?: (value: V) => void) {
  while (cache.size > limit) {
    const key = cache.keys().next().value as K;
    const value = cache.get(key)!;
    cache.delete(key);
    dispose?.(value);
  }
}

function loadMaterial(url: string, size: number): Promise<HTMLCanvasElement> {
  const key = `${size}:${url}`, existing = sourceCache.get(key);
  if (existing) return Promise.resolve(touch(sourceCache, key, existing));
  const pending = pendingSources.get(key);
  if (pending) return pending;
  if (url.startsWith("yautja-v115:")) {
    try {
      const canvas = createPlanetTextureCanvasV115(url, size);
      sourceCache.set(key, canvas); trim(sourceCache, SOURCE_LIMIT);
      return Promise.resolve(canvas);
    } catch (error) { return Promise.reject(error); }
  }
  const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
    loadQueue.push(() => {
      activeLoads++;
      const image = new Image();
      image.decoding = "async";
      let settled = false;
      const finish = (canvas: HTMLCanvasElement | null) => {
        if (settled) return;
        settled = true; clearTimeout(timeout); image.onload = null; image.onerror = null;
        pendingSources.delete(key); activeLoads--;
        if (canvas) { sourceCache.set(key, canvas); trim(sourceCache, SOURCE_LIMIT); resolve(canvas); }
        else reject(new Error(`Texture unavailable: ${url}`));
        pumpLoads();
      };
      const timeout = setTimeout(() => { finish(null); image.src = ""; }, 25000);
      image.onload = () => {
        const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context || !image.naturalWidth || !image.naturalHeight) { finish(null); return; }
        context.drawImage(image, 0, 0, size, size); finish(canvas);
      };
      image.onerror = () => finish(null);
      image.src = url;
    });
  });
  pendingSources.set(key, promise);
  pumpLoads();
  return promise;
}

function pumpLoads() {
  while (activeLoads < 4 && loadQueue.length) loadQueue.shift()!();
}

/** Same geographic polygons as the SVG. Draw wrap copies, not a second
 * generated geography. North is row zero in both CPU and shader coordinates. */
export function createPlanetLandMaskV101(planet: WarPlanetV96, width = 1024): HTMLCanvasElement {
  const key = `${planet.id}:${planet.seed}:${width}`;
  const existing = maskCache.get(key);
  if (existing) return touch(maskCache, key, existing);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Planet mask canvas unavailable");
  context.fillStyle = "#000"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  for (const landmass of planet.landmasses) {
    const points = unwrapPlanetPolygonV101(landmass.points);
    for (const offset of [-360, 0, 360]) {
      context.beginPath();
      points.forEach(([longitude, latitude], index) => {
        const x = (longitude + offset + 180) / 360 * width, y = (90 - latitude) / 180 * canvas.height;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.closePath(); context.fill();
    }
  }
  const procedural = planet.procedural;
  if (procedural?.recipe.version === 103 && "hydrology" in procedural) {
    context.fillStyle = "#000";
    for (const feature of procedural.hydrology.features) {
      const points = unwrapPlanetPolygonV101(feature.points);
      for (const offset of [-360, 0, 360]) {
        context.beginPath();
        points.forEach(([longitude, latitude], index) => {
          const x = (longitude + offset + 180) / 360 * width, y = (90 - latitude) / 180 * canvas.height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.closePath(); context.fill();
      }
    }
  }
  maskCache.set(key, canvas); trim(maskCache, MASK_LIMIT);
  return canvas;
}

const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

/** Artistic Rayleigh/Mie-style limb scattering, not a physical atmosphere
 * solver. Triplanar sampling uses world coordinates and mirrored periodic UVs:
 * the native rasters need neither seamless edges nor a special pole texture. */
const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
const float ALPHA_EPSILON = .00001;
#else
precision mediump float;
// ESSL 1.00 only guarantees nonzero mediump values down to 2^-14.
// Transparent samples must never turn alpha unpremultiplication into 0 / 0.
const float ALPHA_EPSILON = .0001;
#endif
uniform vec2 uResolution, uLogical, uCenter, uCamera, uMap;
uniform float uRadius, uProjection, uLayer, uSeed, uRegionalLand, uRegionalInset;
uniform vec3 uBase, uDeep, uAccent, uDetail, uLandColor, uSky, uWeatherColor;
uniform vec4 uSettings, uEffects;
uniform float uAuroraSwitch;
uniform sampler2D uMask, uLand, uSurface, uClouds, uWeather, uAurora, uRegions;
#ifdef PLANET_MATERIAL_V103
uniform vec3 uRegionalGrid;
uniform vec4 uMaterialScaleContrast, uLandPalette;
#endif
const float PI = 3.141592653589793;

vec2 mirrorUV(vec2 uv) { return 1.0 - abs(mod(uv, 2.0) - 1.0); }
vec4 triplanar(sampler2D image, vec3 world, float scale, float offset) {
  vec3 weight = pow(abs(world), vec3(4.0));
  weight /= max(0.001, weight.x + weight.y + weight.z);
  vec3 p = world * scale + vec3(offset, offset * .71, offset * .37);
  vec4 premultiplied = texture2D(image, mirrorUV(p.yz)) * weight.x
       + texture2D(image, mirrorUV(p.xz)) * weight.y
       + texture2D(image, mirrorUV(p.xy)) * weight.z;
  return vec4(premultiplied.rgb / max(premultiplied.a, ALPHA_EPSILON), premultiplied.a);
}
vec4 regionalSample(vec2 uv, float region) {
#ifdef PLANET_MATERIAL_V103
  vec2 cell = vec2(mod(region, uRegionalGrid.x), floor(region / uRegionalGrid.x));
#else
  vec2 cell = vec2(mod(region, 4.0), floor(region / 4.0));
#endif
  // Clamp to the interior of this cell. Adjacent atlas cells are independent
  // biomes and must never bleed into the mirrored material's edge samples.
  // A half-texel margin alone can round onto a cell boundary when mediump
  // adds a small fraction to column 2 or 3. Keep two half-float ULPs there.
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    float inset = uRegionalInset;
  #else
    #ifdef PLANET_MATERIAL_V103
      // Three atlas rows introduce a non-power-of-two division. One extra
      // half-float ULP before it preserves a half-texel margin in every row.
      float inset = max(uRegionalInset + .002, .004);
    #else
      float inset = max(uRegionalInset, .004);
    #endif
  #endif
  vec2 local = clamp(mirrorUV(uv), vec2(inset), vec2(1.0 - inset));
#ifdef PLANET_MATERIAL_V103
  return texture2D(uLand, (cell + local) / uRegionalGrid.xy);
#else
  return texture2D(uLand, (cell + local) / vec2(4.0, 2.0));
#endif
}
vec4 regionalTriplanar(vec3 world, float region) {
  vec3 weight = pow(abs(world), vec3(4.0));
  weight /= max(.001, weight.x + weight.y + weight.z);
#ifdef PLANET_MATERIAL_V103
  vec3 p = world * (3.1 * uMaterialScaleContrast.x) + vec3(uSeed, uSeed * .71, uSeed * .37);
#else
  vec3 p = world * 3.1 + vec3(uSeed, uSeed * .71, uSeed * .37);
#endif
  return regionalSample(p.yz, region) * weight.x + regionalSample(p.xz, region) * weight.y + regionalSample(p.xy, region) * weight.z;
}
vec4 over(vec4 under, vec4 top) {
  float alpha = top.a + under.a * (1.0 - top.a);
  return vec4((top.rgb * top.a + under.rgb * under.a * (1.0 - top.a)) / max(alpha, ALPHA_EPSILON), alpha);
}
float brightness(vec3 color) { return dot(color, vec3(.2126, .7152, .0722)); }

void main() {
#ifdef GL_FRAGMENT_PRECISION_HIGH
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) * uLogical / uResolution;
#else
  // Normalize before multiplying: a 4096px export otherwise creates
  // intermediates near 2^24, beyond mediump's guaranteed +/-2^14 range.
  // Keep the established highp evaluation above for the published exports.
  vec2 pixel = (vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uResolution) * uLogical;
#endif
  vec2 sphere = (pixel - uCenter) / uRadius;
  sphere.y *= -1.0;
  float radius2 = dot(sphere, sphere);
  float limb = sqrt(max(0.0, 1.0 - radius2));
  float lon, lat;
  float globe = 1.0 - uProjection;
  float inside = 1.0;
  if (uProjection > .5) {
    if (pixel.y < uMap.x || pixel.y > uMap.x + uMap.y) { gl_FragColor = vec4(0.0); return; }
    lon = (pixel.x / uLogical.x - .5) * 2.0 * PI;
    lat = (.5 - (pixel.y - uMap.x) / uMap.y) * PI;
  } else {
    if (radius2 > 1.22) { gl_FragColor = vec4(0.0); return; }
    inside = 1.0 - smoothstep(1.0 - 1.6 / uRadius, 1.0 + .7 / uRadius, sqrt(radius2));
    vec2 edge = sphere / max(1.0, sqrt(radius2));
    lat = asin(clamp(edge.y * cos(uCamera.y) + limb * sin(uCamera.y), -1.0, 1.0));
    lon = uCamera.x + atan(edge.x, limb * cos(uCamera.y) - edge.y * sin(uCamera.y));
  }
  vec3 world = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  vec2 mapUV = vec2(fract(lon / (2.0 * PI) + .5), .5 - lat / PI);
  float land = texture2D(uMask, mapUV).r;
#ifdef PLANET_MATERIAL_V103
  float region = clamp(floor(texture2D(uRegions, mapUV).r * 255.0 + .5), 0.0, uRegionalGrid.z);
  vec4 terrainTex = uRegionalLand > .5 ? regionalTriplanar(world, region) : triplanar(uLand, world, 3.1 * uMaterialScaleContrast.x, uSeed);
  vec4 seaTex = triplanar(uSurface, world, 2.4 * uMaterialScaleContrast.y, uSeed + 4.0);
  if (uMaterialScaleContrast.z != 1.0) terrainTex.rgb = clamp((terrainTex.rgb - .5) * uMaterialScaleContrast.z + .5, 0.0, 1.0);
  if (uMaterialScaleContrast.w != 1.0) seaTex.rgb = clamp((seaTex.rgb - .5) * uMaterialScaleContrast.w + .5, 0.0, 1.0);
#else
  float region = clamp(floor(texture2D(uRegions, mapUV).r * 255.0 + .5), 0.0, 5.0);
  vec4 terrainTex = uRegionalLand > .5 ? regionalTriplanar(world, region) : triplanar(uLand, world, 3.1, uSeed);
  vec4 seaTex = triplanar(uSurface, world, 2.4, uSeed + 4.0);
#endif
  float seaValue = brightness(seaTex.rgb);
  vec3 sea = mix(uDeep, uBase, clamp(seaValue * 1.6, .0, 1.0));
  sea = mix(sea, uDetail, smoothstep(.6, .98, seaValue) * .36);
  float landValue = brightness(terrainTex.rgb);
  vec3 tint = uLandColor * (.43 + landValue * 1.25);
  vec3 terrain = uRegionalLand > .5 ? terrainTex.rgb : mix(terrainTex.rgb, tint, .4);
#ifdef PLANET_MATERIAL_V103
  if (uLandPalette.a > 0.0) terrain = mix(terrain, uLandPalette.rgb * (.43 + brightness(terrain) * 1.25), uLandPalette.a);
#endif
  vec3 albedo = mix(sea, terrain, land);

  vec3 sun = normalize(vec3(.67101, .57358, -.46985));
  float sunDot = dot(world, sun);
  float light = .52 + .48 * max(0.0, sunDot);
  float shadeAlpha = (1.0 - light) * uSettings.w;
  vec4 nightLayer = vec4(.008, .016, .028, shadeAlpha * inside);

  vec4 cloudTex = triplanar(uClouds, world, 1.37, uSeed * .43 + 2.0);
  float cloudAlpha = cloudTex.a * uEffects.x * inside;
  vec3 cloudColor = mix(vec3(.73, .79, .82), vec3(.98, .98, .94), max(0.0, sunDot));
  vec4 cloudLayer = vec4(cloudColor * (.8 + .2 * brightness(cloudTex.rgb)), cloudAlpha);

  vec4 weatherTex = triplanar(uWeather, world, 1.8, uSeed * .57 + 8.0);
  vec4 weatherLayer = vec4(mix(weatherTex.rgb, uWeatherColor, .37), weatherTex.a * uEffects.y * inside);
  vec4 auroraTex = triplanar(uAurora, world, 1.12, uSeed * .11);
  float polarBand = smoothstep(.5, .72, abs(world.y)) * (1.0 - smoothstep(.88, .99, abs(world.y)));
  vec4 auroraLayer = vec4(mix(auroraTex.rgb, uSky, .15), auroraTex.a * polarBand * uEffects.z * inside);

  float limbPower = pow(1.0 - limb, 3.4);
  float halo = exp(-max(0.0, sqrt(radius2) - 1.0) * 48.0) * (1.0 - inside) * .36;
  float rayleigh = (limbPower * .28 * inside + halo) * globe;
  float forwardLight = .22 + .78 * smoothstep(-.45, .75, sunDot);
  float twilight = (1.0 - smoothstep(.0, .23, abs(sunDot))) * globe;
  vec3 scatterColor = mix(uSky, vec3(1.0, .48, .22), twilight * .36);
  vec4 atmosphereLayer = vec4(scatterColor, clamp((rayleigh * forwardLight + .025 * inside) * uSettings.x, 0.0, .65));

  float emissionAlpha = (1.0 - land) * uEffects.w * (.2 + .8 * smoothstep(.35, .8, seaValue)) * inside;
  vec4 emissiveLayer = vec4(mix(uAccent, uDetail, .27), emissionAlpha);
  vec4 color = vec4(albedo, inside);
  if (uLayer < .5) {
    color = over(color, nightLayer);
    color = over(color, emissiveLayer);
    if (uSettings.y > .5) color = over(color, cloudLayer);
    if (uSettings.z > .5) color = over(color, weatherLayer);
    if (uAuroraSwitch > .5) color = over(color, auroraLayer);
    color = over(color, atmosphereLayer);
  } else if (uLayer < 1.5) { color = vec4(albedo, inside); }
  else if (uLayer < 2.5) { color = vec4(sea, inside); }
  else if (uLayer < 3.5) { color = vec4(terrain, land * inside); }
  else if (uLayer < 4.5) { color = cloudLayer; }
  else if (uLayer < 5.5) { color = weatherLayer; }
  else if (uLayer < 6.5) { color = atmosphereLayer; }
  else if (uLayer < 7.5) { color = nightLayer; }
  else if (uLayer < 8.5) { color = auroraLayer; }
  else { color = emissiveLayer; }
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), clamp(color.a, 0.0, 1.0));
}
`;

interface SharedRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
  textures: Map<string, WebGLTexture>;
  programs: Map<number, { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> }>;
}
let shared: SharedRenderer | null | undefined;
let rendererError = "";

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const result = gl.createShader(type);
  if (!result) throw new Error("Planet shader allocation failed");
  gl.shaderSource(result, source); gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result) || "Planet shader compilation failed";
    gl.deleteShader(result); throw new Error(message);
  }
  return result;
}

function createProgram(gl: WebGLRenderingContext, version: 102 | 103) {
  // Two small programs share one context and texture pool. Preprocessing keeps
  // the published V101/V102 arithmetic intact when the V103 define is absent.
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource), fragment = shader(gl, gl.FRAGMENT_SHADER, (version === 103 ? "#define PLANET_MATERIAL_V103\n" : "") + fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Planet program allocation failed");
  gl.attachShader(program, vertex); gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition"); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Planet shader link failed");
  return program;
}

function initializeRenderer(canvas: HTMLCanvasElement): SharedRenderer {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!gl) throw new Error("WebGL unavailable");
  const program = createProgram(gl, 102), uniforms = new Map<string, WebGLUniformLocation | null>();
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { canvas, gl, program, uniforms, textures: new Map(), programs: new Map([[102, { program, uniforms }]]) };
}

function selectProgram(state: SharedRenderer, version: 102 | 103) {
  let selected = state.programs.get(version);
  if (!selected) {
    selected = { program: createProgram(state.gl, version), uniforms: new Map() };
    state.programs.set(version, selected);
  }
  state.program = selected.program; state.uniforms = selected.uniforms;
}

function renderer(): SharedRenderer | null {
  if (shared !== undefined) return shared;
  try {
    const canvas = document.createElement("canvas");
    shared = initializeRenderer(canvas);
    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault(); shared = null; rendererError = "WebGL context lost";
      window.dispatchEvent(new Event(PLANET_RENDERER_EVENT_V101));
    });
    canvas.addEventListener("webglcontextrestored", () => {
      try { shared = initializeRenderer(canvas); rendererError = ""; } catch (error) { shared = null; rendererError = String(error); }
      window.dispatchEvent(new Event(PLANET_RENDERER_EVENT_V101));
    });
    rendererError = "";
  } catch (error) { rendererError = String(error); shared = null; }
  return shared;
}

function uniform(state: SharedRenderer, name: string) {
  if (!state.uniforms.has(name)) state.uniforms.set(name, state.gl.getUniformLocation(state.program, name));
  return state.uniforms.get(name)!;
}
function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
}

function bindTexture(state: SharedRenderer, slot: number, name: string, key: string, source: HTMLCanvasElement | null, nearest = false) {
  const { gl, textures } = state;
  gl.activeTexture(gl.TEXTURE0 + slot);
  let texture = textures.get(key);
  if (texture) touch(textures, key, texture);
  else {
    texture = gl.createTexture() ?? undefined;
    if (!texture) throw new Error("Planet texture allocation failed");
    textures.set(key, texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Blend and filter transparent texels in premultiplied space, then undo
    // premultiplication in the sampler before straight-alpha layer compositing.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const mipmaps = source && !nearest && !key.startsWith("mask:") && !key.startsWith("regional-land:") && (source.width & (source.width - 1)) === 0 && (source.height & (source.height - 1)) === 0;
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    trim(textures, TEXTURE_LIMIT, item => gl.deleteTexture(item));
    const regional = [...textures.keys()].filter(item => item.startsWith("regional-land:"));
    while (regional.length > PLANET_REGIONAL_ATLAS_LIMIT_V102) {
      const oldest = regional.shift()!;
      gl.deleteTexture(textures.get(oldest)!); textures.delete(oldest);
    }
  }
  gl.activeTexture(gl.TEXTURE0 + slot); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uniform(state, name), slot);
}

/** Draw into an ordinary 2D canvas; the result may be exported with toDataURL.
 * The canvas dimensions choose output resolution; width/height choose the SVG
 * coordinate space. A false result keeps the existing accessible SVG fallback. */
export async function drawPlanetMaterialV101(target: HTMLCanvasElement, request: PlanetMaterialRenderRequestV101): Promise<boolean> {
  if (request.signal?.aborted) return false;
  const state = renderer();
  if (!state) return false;
  const layer = request.layer ?? "composite", settings = request.settings ?? DEFAULT_PLANET_MATERIAL_SETTINGS_V101;
  const recipe = planetMaterialRecipeV101(request.planet), size = request.textureSize ?? 512;
  const useLand = ["composite", "albedo", "land"].includes(layer);
  const regionalLand = useLand && recipe.mapping === "world-space-triplanar-regional";
  const regionalSourceSize = Math.min(size, 1024);
  const maxTextureSize = Number(state.gl.getParameter(state.gl.MAX_TEXTURE_SIZE));
  const regionalLayout = recipe.materials ? planetRegionalLayoutV103(request.planet.regions.length, regionalSourceSize, maxTextureSize) : null;
  const regionalTileSize = regionalLayout?.tileSize ?? 2 ** Math.floor(Math.log2(Math.max(16, Math.min(regionalSourceSize, maxTextureSize / 4))));
  const regionalKey = `regional-land:${planetRegionalAtlasKeyV102(request.planet, regionalTileSize, regionalSourceSize)}`;
  const useSurface = ["composite", "albedo", "surface", "emissive"].includes(layer);
  const useClouds = layer === "clouds" || layer === "composite" && settings.clouds;
  const useWeather = layer === "weather" || layer === "composite" && settings.weather;
  const useAurora = recipe.auroraOpacity > 0 && (layer === "aurora" || layer === "composite" && (settings.aurora ?? settings.weather));
  const urls = [useLand && !regionalLand ? recipe.land : null, useSurface ? recipe.surface : null, useClouds ? recipe.clouds : null, useWeather ? recipe.weather : null, useAurora ? recipe.aurora : null].map(url => url && size > 512 ? planetMaterialSourceV101(url) : url);
  const details = [recipe.materials?.land.detail, recipe.materials?.surface.detail].map(url => url && size > 512 ? planetMaterialSourceV103(url) : url);
  // Composition canvases stay <=1024 even for a 4096px output. The native
  // detail source is 1254px; output resolution does not multiply cache memory.
  const imageSizes = urls.map((url, index) => url && details[index] ? Math.min(size, 1024) : size);
  const imageKeys = urls.map((url, index) => index === 0 && regionalLand ? regionalKey : url
    ? details[index] ? planetDetailedMaterialKeyV103(url, details[index]!, imageSizes[index]) : `${size}:${url}` : "empty");
  try {
    const images = await Promise.all(urls.map((url, index) => index === 0 && regionalLand
      ? loadPlanetRegionalAtlasV102(request.planet, regionalTileSize, regionalSourceSize, loadMaterial)
      : url ? details[index] ? loadPlanetDetailedMaterialV103(url, details[index]!, imageSizes[index], loadMaterial) : loadMaterial(url, size) : null));
    if (request.signal?.aborted || state !== shared || state.gl.isContextLost()) return false;
    selectProgram(state, recipe.materials ? 103 : 102);
    const { gl, canvas } = state;
    const max = Math.min(4096, Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)));
    const width = Math.max(1, Math.min(max, Math.round(target.width))), height = Math.max(1, Math.min(max, Math.round(target.height)));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, width, height); gl.useProgram(state.program);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const maskWidth = size > 512 ? 2048 : 1024;
    bindTexture(state, 0, "uMask", `mask:${request.planet.id}:${maskWidth}`, createPlanetLandMaskV101(request.planet, maskWidth));
    ["uLand", "uSurface", "uClouds", "uWeather", "uAurora"].forEach((name, index) => bindTexture(state, index + 1, name, imageKeys[index], images[index]));
    bindTexture(state, 6, "uRegions", regionalLand ? `regions:${request.planet.id}:${maskWidth}` : "empty",
      regionalLand ? createPlanetRegionMaskV102(request.planet, maskWidth) : null, true);
    gl.uniform2f(uniform(state, "uResolution"), width, height);
    gl.uniform2f(uniform(state, "uLogical"), request.width, request.height);
    gl.uniform2f(uniform(state, "uCenter"), request.centerX, request.centerY);
    // Export callers may rotate through multiple turns. Keep trig arguments
    // bounded even on GPUs whose fragment shader only supports mediump.
    gl.uniform2f(uniform(state, "uCamera"), wrapPlanetLongitudeV101(request.longitude) * Math.PI / 180, request.latitude * Math.PI / 180);
    gl.uniform2f(uniform(state, "uMap"), request.mapTop, request.mapHeight);
    gl.uniform1f(uniform(state, "uRadius"), request.radius);
    gl.uniform1f(uniform(state, "uProjection"), request.projection === "map" ? 1 : 0);
    gl.uniform1f(uniform(state, "uLayer"), PLANET_MATERIAL_LAYERS_V101.indexOf(layer));
    gl.uniform1f(uniform(state, "uSeed"), (recipe.seed % 1000) / 113);
    gl.uniform1f(uniform(state, "uRegionalLand"), Number(regionalLand));
    gl.uniform1f(uniform(state, "uRegionalInset"), .5 / regionalTileSize);
    if (recipe.materials) {
      gl.uniform3f(uniform(state, "uRegionalGrid"), regionalLayout!.columns, regionalLayout!.rows, request.planet.regions.length - 1);
      gl.uniform4f(uniform(state, "uMaterialScaleContrast"), recipe.materials.land.scale, recipe.materials.surface.scale, recipe.materials.land.contrast, recipe.materials.surface.contrast);
      gl.uniform4f(uniform(state, "uLandPalette"), ...rgb(recipe.materials.land.palette ?? "#000000"), recipe.materials.land.palette ? .72 : 0);
    }
    gl.uniform4f(uniform(state, "uSettings"), Number(settings.atmosphere) * recipe.atmosphereDensity, Number(settings.clouds), Number(settings.weather), Number(settings.lighting));
    gl.uniform1f(uniform(state, "uAuroraSwitch"), Number(settings.aurora ?? settings.weather));
    gl.uniform4f(uniform(state, "uEffects"), recipe.cloudOpacity, recipe.weatherOpacity, recipe.auroraOpacity, recipe.emission);
    const surfaceColors = recipe.materials?.surface.palette ?? request.planet.surface;
    for (const [name, color] of Object.entries({ uBase: surfaceColors.base, uDeep: surfaceColors.deep, uAccent: surfaceColors.accent, uDetail: surfaceColors.detail, uLandColor: recipe.landColor, uSky: recipe.atmosphereColor, uWeatherColor: recipe.weatherColor })) gl.uniform3f(uniform(state, name), ...rgb(color));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const context = target.getContext("2d");
    if (!context) return false;
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(canvas, 0, 0, target.width, target.height);
    rendererError = "";
    return true;
  } catch (error) { rendererError = String(error); return false; }
}

/** Export the exact regional biome/detail atlas already used by the WebGL
 * renderer. No parallel interpretation of a region or its terrain is created.
 * Consumers may cancel after decoding, before publishing the PNG or ZIP. */
export async function createPlanetRegionalMaterialAtlasV124(
  planet: WarPlanetV96, signal?: AbortSignal,
): Promise<HTMLCanvasElement | null> {
  if (signal?.aborted) return null;
  const atlas = await loadPlanetRegionalAtlasV102(planet, 256, 512, loadMaterial);
  return signal?.aborted ? null : atlas;
}

export function planetMaterialRendererStatusV101() {
  return { available: Boolean(shared), error: rendererError, decodedSources: sourceCache.size, pendingSources: pendingSources.size, activeLoads, masks: maskCache.size, gpuTextures: shared?.textures.size ?? 0, contexts: shared ? 1 : 0, programs: shared?.programs.size ?? 0, ...planetRegionalMaterialStatusV102(), ...planetDetailedMaterialStatusV103() };
}
