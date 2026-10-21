import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import {
  DEFAULT_PLANET_MATERIAL_SETTINGS_V101, PLANET_MATERIAL_LAYERS_V101, planetMaterialRecipeV101,
  unwrapPlanetPolygonV101, planetMaterialSourceV101, type PlanetMaterialLayerV101, type PlanetMaterialSettingsV101, type PlanetMaterialViewV101,
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
precision highp float;
uniform vec2 uResolution, uLogical, uCenter, uCamera, uMap;
uniform float uRadius, uProjection, uLayer, uSeed;
uniform vec3 uBase, uDeep, uAccent, uDetail, uLandColor, uSky;
uniform vec4 uSettings, uEffects;
uniform sampler2D uMask, uLand, uSurface, uClouds, uWeather, uAurora;
const float PI = 3.141592653589793;

vec2 mirrorUV(vec2 uv) { return 1.0 - abs(mod(uv, 2.0) - 1.0); }
vec4 triplanar(sampler2D image, vec3 world, float scale, float offset) {
  vec3 weight = pow(abs(world), vec3(4.0));
  weight /= max(0.001, weight.x + weight.y + weight.z);
  vec3 p = world * scale + vec3(offset, offset * .71, offset * .37);
  vec4 premultiplied = texture2D(image, mirrorUV(p.yz)) * weight.x
       + texture2D(image, mirrorUV(p.xz)) * weight.y
       + texture2D(image, mirrorUV(p.xy)) * weight.z;
  return vec4(premultiplied.rgb / max(premultiplied.a, .00001), premultiplied.a);
}
vec4 over(vec4 under, vec4 top) {
  float alpha = top.a + under.a * (1.0 - top.a);
  return vec4((top.rgb * top.a + under.rgb * under.a * (1.0 - top.a)) / max(alpha, .00001), alpha);
}
float brightness(vec3 color) { return dot(color, vec3(.2126, .7152, .0722)); }

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) * uLogical / uResolution;
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
  vec4 terrainTex = triplanar(uLand, world, 3.1, uSeed);
  vec4 seaTex = triplanar(uSurface, world, 2.4, uSeed + 4.0);
  float seaValue = brightness(seaTex.rgb);
  vec3 sea = mix(uDeep, uBase, clamp(seaValue * 1.6, .0, 1.0));
  sea = mix(sea, uDetail, smoothstep(.6, .98, seaValue) * .36);
  float landValue = brightness(terrainTex.rgb);
  vec3 tint = uLandColor * (.43 + landValue * 1.25);
  vec3 terrain = mix(terrainTex.rgb, tint, .4);
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
  vec4 weatherLayer = vec4(mix(weatherTex.rgb, uAccent, .37), weatherTex.a * uEffects.y * inside);
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
    if (uSettings.z > .5) { color = over(color, weatherLayer); color = over(color, auroraLayer); }
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

function initializeRenderer(canvas: HTMLCanvasElement): SharedRenderer {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!gl) throw new Error("WebGL unavailable");
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource), fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Planet program allocation failed");
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Planet shader link failed");
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { canvas, gl, program, uniforms: new Map(), textures: new Map() };
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

function bindTexture(state: SharedRenderer, slot: number, name: string, key: string, source: HTMLCanvasElement | null) {
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
    const mipmaps = source && !key.startsWith("mask:") && (source.width & (source.width - 1)) === 0 && (source.height & (source.height - 1)) === 0;
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    trim(textures, TEXTURE_LIMIT, item => gl.deleteTexture(item));
  }
  gl.activeTexture(gl.TEXTURE0 + slot); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uniform(state, name), slot);
}

/** Draw into an ordinary 2D canvas; the result may be exported with toDataURL.
 * The canvas dimensions choose output resolution; width/height choose the SVG
 * coordinate space. A false result keeps the existing accessible SVG fallback. */
export async function drawPlanetMaterialV101(target: HTMLCanvasElement, request: PlanetMaterialRenderRequestV101): Promise<boolean> {
  const state = renderer();
  if (!state) return false;
  const layer = request.layer ?? "composite", settings = request.settings ?? DEFAULT_PLANET_MATERIAL_SETTINGS_V101;
  const recipe = planetMaterialRecipeV101(request.planet), size = request.textureSize ?? 512;
  const materials = ["composite", "albedo", "surface", "land", "emissive"].includes(layer);
  const useClouds = layer === "clouds" || layer === "composite" && settings.clouds;
  const useWeather = layer === "weather" || layer === "composite" && settings.weather;
  const useAurora = recipe.auroraOpacity > 0 && (layer === "aurora" || layer === "composite" && settings.weather);
  const urls = [materials ? recipe.land : null, materials ? recipe.surface : null, useClouds ? recipe.clouds : null, useWeather ? recipe.weather : null, useAurora ? recipe.aurora : null].map(url => url && size > 512 ? planetMaterialSourceV101(url) : url);
  try {
    const images = await Promise.all(urls.map(url => url ? loadMaterial(url, size) : null));
    if (request.signal?.aborted || state !== shared || state.gl.isContextLost()) return false;
    const { gl, canvas } = state;
    const max = Math.min(4096, Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)));
    const width = Math.max(1, Math.min(max, Math.round(target.width))), height = Math.max(1, Math.min(max, Math.round(target.height)));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, width, height); gl.useProgram(state.program);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const maskWidth = size > 512 ? 2048 : 1024;
    bindTexture(state, 0, "uMask", `mask:${request.planet.id}:${maskWidth}`, createPlanetLandMaskV101(request.planet, maskWidth));
    ["uLand", "uSurface", "uClouds", "uWeather", "uAurora"].forEach((name, index) => bindTexture(state, index + 1, name, urls[index] ? `${size}:${urls[index]}` : "empty", images[index]));
    gl.uniform2f(uniform(state, "uResolution"), width, height);
    gl.uniform2f(uniform(state, "uLogical"), request.width, request.height);
    gl.uniform2f(uniform(state, "uCenter"), request.centerX, request.centerY);
    gl.uniform2f(uniform(state, "uCamera"), request.longitude * Math.PI / 180, request.latitude * Math.PI / 180);
    gl.uniform2f(uniform(state, "uMap"), request.mapTop, request.mapHeight);
    gl.uniform1f(uniform(state, "uRadius"), request.radius);
    gl.uniform1f(uniform(state, "uProjection"), request.projection === "map" ? 1 : 0);
    gl.uniform1f(uniform(state, "uLayer"), PLANET_MATERIAL_LAYERS_V101.indexOf(layer));
    gl.uniform1f(uniform(state, "uSeed"), (recipe.seed % 1000) / 113);
    gl.uniform4f(uniform(state, "uSettings"), Number(settings.atmosphere), Number(settings.clouds), Number(settings.weather), Number(settings.lighting));
    gl.uniform4f(uniform(state, "uEffects"), recipe.cloudOpacity, recipe.weatherOpacity, recipe.auroraOpacity, recipe.emission);
    for (const [name, color] of Object.entries({ uBase: request.planet.surface.base, uDeep: request.planet.surface.deep, uAccent: request.planet.surface.accent, uDetail: request.planet.surface.detail, uLandColor: recipe.landColor, uSky: recipe.atmosphereColor })) gl.uniform3f(uniform(state, name), ...rgb(color));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const context = target.getContext("2d");
    if (!context) return false;
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(canvas, 0, 0, target.width, target.height);
    rendererError = "";
    return true;
  } catch (error) { rendererError = String(error); return false; }
}

export function planetMaterialRendererStatusV101() {
  return { available: Boolean(shared), error: rendererError, decodedSources: sourceCache.size, pendingSources: pendingSources.size, activeLoads, masks: maskCache.size, gpuTextures: shared?.textures.size ?? 0, contexts: shared ? 1 : 0 };
}
