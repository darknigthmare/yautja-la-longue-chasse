/** The Isles V1 · three.js renderer (decision of 21 November 2026: three.js, WebGL2).
 * Terrain columns are merged per 32 × 32 tile zone; trees, bushes and crates are instanced.
 * Every world material shares the cut-away of islesCameraV1.cutawayHidesV1, in GLSL. */
import {
  AnimationMixer, Box3, LoopRepeat, type AnimationAction, type AnimationClip,
  AmbientLight, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DodecahedronGeometry,
  Float32BufferAttribute, Group, HemisphereLight, InstancedMesh, Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  Object3D, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Quaternion, Scene, Vector3, WebGLRenderer,
  BackSide, DoubleSide,
} from "three";
import {GLTFLoader, type GLTF} from "three/examples/jsm/loaders/GLTFLoader.js";
import {clone as cloneSkinned} from "three/examples/jsm/utils/SkeletonUtils.js";
import {BODY_ABOVE_CHEST_V1, BODY_BELOW_CHEST_V1, type IslesCameraTuningV1} from "./islesCameraV1";
import {heightAtV1, isTreeKindV1, kindAtV1, type IslesMapV1, type IslesTileKindV1} from "./islesMapV1";

export const ISLES_ZONE_TILES_V1 = 32;

/** Something drawn on the map this frame. */
export interface IslesViewEntityV1 {
  id: string;
  kind: "yautja" | "human" | "prey" | "plane" | "piece" | "beacon" | "npc" | "animal" | "decor" | "marker";
  /** Runtime model id (app/game/data/islesModelsV1.json); the simple volume stands in until it loads. */
  model?: string;
  moving?: boolean;
  running?: boolean;
  /** Extra scale (the legendary jaguar is larger). */
  scale?: number;
  x: number; y: number; z: number;
  facing: number;
  cloaked?: boolean;
  /** Body colour for a human role. */
  color?: string;
  downed?: boolean;
  surrendered?: boolean;
  /** 0..1, used to fade out the dead and the far. */
  opacity?: number;
}

export interface IslesViewStateV1 {
  /** Camera target (feet of the hunter plus the look-ahead). */
  target: {x: number; y: number; z: number};
  /** Feet of the local hunter, for the cut-away. */
  feet: {x: number; y: number; z: number};
  yaw: number;
  zoomHalfHeight: number;
  entities: IslesViewEntityV1[];
  thermal: boolean;
  /** Night lowers the light (the reverse hunt draws day or night at the start). */
  night?: boolean;
  seconds: number;
}

export interface IslesSceneV1 {
  render(view: IslesViewStateV1): void;
  resize(width: number, height: number, pixelRatio: number): void;
  /** Screen position (CSS pixels) of a world point after the last render. */
  project(x: number, y: number, z: number): {x: number; y: number; visible: boolean};
  stats(): {zones: number; terrainTriangles: number; instances: number; drawCalls: number; modelsReady: number};
  /** Turns the cut-away off (browser QA compares both renders). */
  setCutaway(enabled: boolean): void;
  dispose(): void;
}

const KIND_COLORS: Record<IslesTileKindV1, string> = {
  water: "#3a5a52", ford: "#5d7a5e", sand: "#d8c48a", grass: "#6f9a4a", jungle: "#3f6b34", mud: "#7a6345",
  road: "#8b8072", bush: "#3f6b34", crate: "#8a6a3a", rock: "#8c8a80", tree: "#3f6b34", wall: "#b9ad97",
  roof: "#9b4f35", pillar: "#a8a397", ruin: "#a39a7c",
  snow: "#eef3f6", lava: "#e2531f", savanna: "#c2b062", pine: "#2c5a44", palm: "#5f9a52", building: "#8d929c",
};

function hash(x: number, z: number): number {
  let h = Math.imul(x * 374761393 + z * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
}

type Uniforms = Record<string, {value: unknown}>;

/** Shared uniforms of the cut-away and the biomask thermal view. */
function createCutawayUniforms(): Uniforms {
  return {
    uIslesFeet: {value: new Vector3()},
    uIslesToCam: {value: new Vector3(0, 1, 0)},
    uIslesRight: {value: new Vector3(1, 0, 0)},
    uIslesUp: {value: new Vector3(0, 0, -1)},
    uIslesCut: {value: [2.6, 0.35, 0.25, 1]},
    uIslesPitch: {value: [Math.sin(0.61), Math.cos(0.61)]},
    uIslesThermal: {value: 0},
    uIslesCanopy: {value: [0, 0]},
  };
}

const CUT_DECLARATIONS = `
uniform vec3 uIslesFeet; uniform vec3 uIslesToCam; uniform vec3 uIslesRight; uniform vec3 uIslesUp;
uniform vec4 uIslesCut; uniform vec2 uIslesPitch; uniform float uIslesThermal; uniform vec2 uIslesCanopy;
varying vec3 vIslesWorld;
bool islesHidden() {
  if (uIslesCut.w < 0.5 || vIslesWorld.y <= uIslesFeet.y + uIslesCut.z) return false;
  vec3 v = vIslesWorld - (uIslesFeet + vec3(0.0, ${BODY_BELOW_CHEST_V1.toFixed(2)}, 0.0));
  float t = dot(v, uIslesToCam);
  float sx = dot(v, uIslesRight);
  float su = dot(v, uIslesUp);
  float u = clamp(su / uIslesPitch.y, -${BODY_BELOW_CHEST_V1.toFixed(2)}, ${BODY_ABOVE_CHEST_V1.toFixed(2)});
  float du = su - u * uIslesPitch.y;
  if (sx * sx + du * du >= uIslesCut.x * uIslesCut.x) return false;
  return t > u * uIslesPitch.x + uIslesCut.y;
}
`;

/** Adds the cut-away (dithered) to decor, and the thermal tint: cold decor, hot bodies. Bodies (hot) are never cut. */
function withCutaway<T extends Material>(material: T, uniforms: Uniforms, hot = false, cut = !hot, canopy = false): T {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = "varying vec3 vIslesWorld;\n" + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
#ifdef USE_INSTANCING
  vIslesWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vIslesWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    shader.fragmentShader = CUT_DECLARATIONS + shader.fragmentShader
      .replace("void main() {", cut ? `void main() {
  if (islesHidden()) { vec2 cell = mod(floor(gl_FragCoord.xy), 2.0); if (cell.x + cell.y > 0.5) discard; }` + (canopy ? `
  if (uIslesCanopy.x > 0.0 && vIslesWorld.y > uIslesFeet.y + uIslesCanopy.y && distance(vIslesWorld.xz, uIslesFeet.xz) < uIslesCanopy.x) {
    vec2 leaf = mod(floor(gl_FragCoord.xy), 3.0); if (leaf.x + leaf.y > 0.5) discard;
  }` : "") : "void main() {")
      .replace("#include <tonemapping_fragment>", hot
        ? "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.55 + 0.4 * gl_FragColor.g, 0.12), uIslesThermal);\n#include <tonemapping_fragment>"
        : "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.04, 0.09, 0.32) + gl_FragColor.rgb * vec3(0.05, 0.15, 0.35), uIslesThermal);\n#include <tonemapping_fragment>");
  };
  material.customProgramCacheKey = () => (hot ? "isles-hot" : "isles-cold") + (cut ? "-cut" : "") + (canopy ? "-canopy" : "");
  return material;
}

/** Trees, bushes and crates are instanced; their tile shows the ground they stand on. */
function groundOfV1(map: IslesMapV1, tx: number, tz: number): {kind: IslesTileKindV1; top: number} {
  if (map.sample && tx >= 0 && tz >= 0 && tx < map.width && tz < map.depth) {
    const t = map.sample(tx, tz) as {kind: IslesTileKindV1; height: number; base?: number; ground?: IslesTileKindV1};
    return isTreeKindV1(t.kind) || t.kind === "bush" || t.kind === "crate" ? {kind: t.ground ?? "grass", top: t.base ?? 0} : {kind: t.kind, top: t.height};
  }
  const kind = kindAtV1(map, tx, tz);
  if (isTreeKindV1(kind) || kind === "bush") return {kind: map.id.includes("verdant") ? "jungle" : "grass", top: 0};
  if (kind === "crate") return {kind: "grass", top: 0};
  return {kind, top: heightAtV1(map, tx, tz)};
}

/** Merged columns of one zone, with faces only where the neighbour is lower. */
function buildZoneGeometry(map: IslesMapV1, x0: number, z0: number): BufferGeometry | null {
  const t = map.tileMeters;
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const color = new Color();
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], shade: number) => {
    for (const p of [a, b, c, a, c, d]) { positions.push(p[0], p[1], p[2]); normals.push(n[0], n[1], n[2]); colors.push(color.r * shade, color.g * shade, color.b * shade); }
  };
  const groundOf = (tx: number, tz: number) => groundOfV1(map, tx, tz);
  const columnTop = (tx: number, tz: number) => groundOf(tx, tz).top;
  for (let tz = z0; tz < Math.min(map.depth, z0 + ISLES_ZONE_TILES_V1); tz++) {
    for (let tx = x0; tx < Math.min(map.width, x0 + ISLES_ZONE_TILES_V1); tx++) {
      const {kind: groundKind, top} = groundOf(tx, tz);
      color.set(KIND_COLORS[groundKind]);
      const jitter = 0.92 + hash(tx, tz) * 0.12;
      const x = tx * t, z = tz * t;
      quad([x, top, z], [x, top, z + t], [x + t, top, z + t], [x + t, top, z], [0, 1, 0], jitter);
      if (top > 0.6) {
        // Ground inside a tall column, seen only through the cut-away.
        const inner = color.clone();
        color.set(KIND_COLORS[map.sample ? "road" : map.id.includes("verdant") ? "jungle" : "grass"]);
        quad([x, 0.01, z], [x, 0.01, z + t], [x + t, 0.01, z + t], [x + t, 0.01, z], [0, 1, 0], jitter * 0.7);
        color.copy(inner);
      }
      const sides: [number, number, number[], (bottom: number) => number[][]][] = [
        [1, 0, [1, 0, 0], b => [[x + t, top, z + t], [x + t, b, z + t], [x + t, b, z], [x + t, top, z]]],
        [-1, 0, [-1, 0, 0], b => [[x, top, z], [x, b, z], [x, b, z + t], [x, top, z + t]]],
        [0, 1, [0, 0, 1], b => [[x, top, z + t], [x, b, z + t], [x + t, b, z + t], [x + t, top, z + t]]],
        [0, -1, [0, 0, -1], b => [[x + t, top, z], [x + t, b, z], [x, b, z], [x, top, z]]],
      ];
      for (const [dx, dz, n, corners] of sides) {
        const neighbour = tx + dx < 0 || tz + dz < 0 || tx + dx >= map.width || tz + dz >= map.depth ? -1.2 : columnTop(tx + dx, tz + dz);
        if (neighbour >= top) continue;
        const [a, b, c, d] = corners(neighbour);
        quad(a, b, c, d, n, jitter * (dx !== 0 ? 0.78 : 0.88));
      }
    }
  }
  if (!positions.length) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function lambert(color: string, uniforms: Uniforms, hot = false): MeshLambertMaterial {
  return withCutaway(new MeshLambertMaterial({color}), uniforms, hot);
}

/** Simple-volume hunter: legs, torso, head, biomask, dreadlocks, shoulder cannon. */
function buildHunter(uniforms: Uniforms, tint: string): {group: Group; body: Mesh[]; outline: Group} {
  const group = new Group();
  const skin = lambert("#68714a", uniforms, true), armour = lambert(tint, uniforms, true), mask = lambert("#c9c6b6", uniforms, true);
  const dark = lambert("#2b2a24", uniforms, true);
  const parts: [BufferGeometry, MeshLambertMaterial, number, number, number][] = [
    [new BoxGeometry(0.26, 0.95, 0.3), skin, -0.17, 0.48, 0], [new BoxGeometry(0.26, 0.95, 0.3), skin, 0.17, 0.48, 0],
    [new BoxGeometry(0.72, 0.8, 0.42), armour, 0, 1.35, 0], [new BoxGeometry(0.2, 0.75, 0.24), skin, -0.47, 1.3, 0],
    [new BoxGeometry(0.2, 0.75, 0.24), skin, 0.47, 1.3, 0], [new BoxGeometry(0.38, 0.38, 0.38), skin, 0, 1.95, -0.02],
    [new BoxGeometry(0.34, 0.3, 0.1), mask, 0, 1.97, 0.2], [new BoxGeometry(0.16, 0.12, 0.42), dark, -0.34, 1.86, 0.05],
  ];
  const body: Mesh[] = [];
  for (const [geometry, material, x, y, z] of parts) {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); body.push(mesh);
  }
  for (let i = 0; i < 6; i++) {
    const lock = new Mesh(new BoxGeometry(0.06, 0.5, 0.06), dark);
    lock.position.set(-0.15 + (i % 3) * 0.15, 1.7, -0.2 - Math.floor(i / 3) * 0.06); lock.rotation.x = -0.25; lock.castShadow = true;
    group.add(lock); body.push(lock);
  }
  // Thin outline kept on screen while cloaked (section 4.3).
  const outline = new Group();
  const edge = new MeshBasicMaterial({color: "#7fe3ff", side: BackSide, transparent: true, opacity: 0.85, depthWrite: false});
  for (const mesh of body) {
    const shell = new Mesh(mesh.geometry, edge); shell.position.copy(mesh.position); shell.rotation.copy(mesh.rotation);
    shell.scale.setScalar(1.18); outline.add(shell);
  }
  outline.visible = false;
  group.add(outline);
  return {group, body, outline};
}

function buildHuman(uniforms: Uniforms, vest: string): Group {
  const group = new Group();
  const skin = lambert("#c79a74", uniforms, true), cloth = lambert("#4d5640", uniforms, true), coat = lambert(vest, uniforms, true);
  const gun = lambert("#22221f", uniforms, true);
  const add = (geometry: BufferGeometry, material: MeshLambertMaterial, x: number, y: number, z: number, name?: string) => {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; if (name) mesh.name = name; group.add(mesh);
  };
  add(new BoxGeometry(0.2, 0.8, 0.22), cloth, -0.12, 0.4, 0); add(new BoxGeometry(0.2, 0.8, 0.22), cloth, 0.12, 0.4, 0);
  add(new BoxGeometry(0.5, 0.62, 0.3), coat, 0, 1.12, 0); add(new BoxGeometry(0.26, 0.26, 0.26), skin, 0, 1.58, 0);
  add(new BoxGeometry(0.08, 0.08, 0.8), gun, 0.2, 1.15, 0.35, "gun");
  return group;
}

function buildPlane(uniforms: Uniforms): Group {
  const group = new Group();
  const white = lambert("#e8e2d0", uniforms), yellow = lambert("#d9a531", uniforms), dark = lambert("#2d3330", uniforms);
  const add = (geometry: BufferGeometry, material: MeshLambertMaterial, x: number, y: number, z: number) => {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh);
  };
  add(new BoxGeometry(1.1, 1.1, 6), white, 0, 1.6, 0); add(new BoxGeometry(11, 0.18, 1.5), yellow, 0, 2.2, 0.4);
  add(new BoxGeometry(3.2, 0.14, 0.9), yellow, 0, 1.9, -2.7); add(new BoxGeometry(0.14, 1.2, 0.9), yellow, 0, 2.5, -2.7);
  add(new BoxGeometry(0.4, 0.4, 5), dark, -1.5, 0.3, 0); add(new BoxGeometry(0.4, 0.4, 5), dark, 1.5, 0.3, 0);
  return group;
}

function buildPrey(uniforms: Uniforms): Group {
  const group = new Group();
  const hide = lambert("#5a4334", uniforms, true), tusk = lambert("#e8dfc8", uniforms, true);
  const body = new Mesh(new BoxGeometry(0.7, 0.6, 1.3), hide); body.position.y = 0.55; body.castShadow = true; group.add(body);
  const head = new Mesh(new BoxGeometry(0.45, 0.42, 0.5), hide); head.position.set(0, 0.6, 0.85); group.add(head);
  const tusks = new Mesh(new BoxGeometry(0.5, 0.06, 0.08), tusk); tusks.position.set(0, 0.48, 1.08); group.add(tusks);
  return group;
}

/** One runtime model: GLB url, height in metres, yaw correction, optional run clip. */
export interface IslesModelSpecV1 { url: string; height?: number; length?: number; yaw?: number; runUrl?: string }

/** Options of the scene: zone streaming radius (in zones of 32 tiles) and runtime models. */
export interface IslesSceneOptionsV1 { streamRadius?: number; models?: Record<string, IslesModelSpecV1> }

/** Creates the scene for a map on a canvas. */
export function createIslesSceneV1(canvas: HTMLCanvasElement, map: IslesMapV1, camera: IslesCameraTuningV1, options: IslesSceneOptionsV1 = {}): IslesSceneV1 {
  const renderer = new WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor("#1d3a40");
  const scene = new Scene();
  const uniforms = createCutawayUniforms();
  const view = new OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
  const hemi = new HemisphereLight("#dfeee6", "#3b4a32", 1.1);
  const sun = new DirectionalLight("#fff1d6", 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160});
  scene.add(hemi, sun, sun.target, new AmbientLight("#ffffff", 0.15));

  const t = map.tileMeters, width = map.width * t, depth = map.depth * t;
  const sea = new Mesh(new PlaneGeometry(Math.min(width, 1200) + 400, Math.min(depth, 1200) + 400), new MeshLambertMaterial({color: "#2a6f86", transparent: true, opacity: 0.72}));
  sea.rotation.x = -Math.PI / 2; sea.position.set(width / 2, -0.06, depth / 2); sea.receiveShadow = true;
  scene.add(sea);

  // Terrain and props are streamed by 32 × 32 zones around the camera target (ISLES_MONDE_LEVEL_DESIGN §11).
  const terrain = withCutaway(new MeshLambertMaterial({vertexColors: true}), uniforms);
  const trunkGeometry = new CylinderGeometry(0.22, 0.32, 1, 6), crownGeometry = new DodecahedronGeometry(1, 0);
  const bushGeometry = new DodecahedronGeometry(0.55, 0), crateGeometry = new BoxGeometry(1.6, 1, 1.6);
  const trunkMaterial = lambert("#5b4630", uniforms), leafMaterial = lambert("#ffffff", uniforms), crateMaterial = lambert("#8a6a3a", uniforms);
  // Crowns open around a hunter on the ground (§4.1: the camera follows the three levels of Verdant).
  const crownMaterial = withCutaway(new MeshLambertMaterial({color: "#ffffff"}), uniforms, false, true, true);
  const matrix = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3(), up = new Vector3(0, 1, 0);
  const pineColors = [new Color("#1f4a3a"), new Color("#28584a")], palmColor = new Color("#5f9a52");
  const crownColors = [new Color("#2f5d2a"), new Color("#3b6e30"), new Color("#28502a")], bushColors = [new Color("#4c7a37"), new Color("#3e6a30")];
  interface ZoneV1 { objects: Mesh[]; triangles: number; instances: number }
  const loaded = new Map<string, ZoneV1>();
  const zoneCountX = Math.ceil(map.width / ISLES_ZONE_TILES_V1), zoneCountZ = Math.ceil(map.depth / ISLES_ZONE_TILES_V1);
  const streamRadius = options.streamRadius ?? 3;

  function buildZone(zx: number, zz: number): ZoneV1 {
    const x0 = zx * ISLES_ZONE_TILES_V1, z0 = zz * ISLES_ZONE_TILES_V1;
    const zone: ZoneV1 = {objects: [], triangles: 0, instances: 0};
    const geometry = buildZoneGeometry(map, x0, z0);
    if (geometry) {
      const mesh = new Mesh(geometry, terrain); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = "zone-" + x0 + "-" + z0;
      zone.objects.push(mesh); zone.triangles = geometry.getAttribute("position").count / 3;
    }
    const cells: Record<"tree" | "bush" | "crate", [number, number][]> = {tree: [], bush: [], crate: []};
    for (let tz = z0; tz < Math.min(map.depth, z0 + ISLES_ZONE_TILES_V1); tz++) for (let tx = x0; tx < Math.min(map.width, x0 + ISLES_ZONE_TILES_V1); tx++) {
      const kind = kindAtV1(map, tx, tz);
      if (isTreeKindV1(kind)) cells.tree.push([tx, tz]); else if (kind === "bush" || kind === "crate") cells[kind].push([tx, tz]);
    }
    const instance = (shape: BufferGeometry, material: MeshLambertMaterial, list: [number, number][],
      place: (tx: number, tz: number) => [number, number, number, number, number, number, number], tint?: (tx: number, tz: number) => Color) => {
      if (!list.length) return;
      const mesh = new InstancedMesh(shape, material, list.length);
      list.forEach(([tx, tz], i) => {
        const [x, y, z, sx, sy, sz, rot] = place(tx, tz);
        p.set(x, y, z); s.set(sx, sy, sz); q.setFromAxisAngle(up, rot); matrix.compose(p, q, s); mesh.setMatrixAt(i, matrix);
        if (tint) mesh.setColorAt(i, tint(tx, tz));
      });
      mesh.castShadow = true; mesh.receiveShadow = true; zone.objects.push(mesh); zone.instances += list.length;
    };
    const base = (tx: number, tz: number) => groundOfV1(map, tx, tz).top;
    const tall = (tx: number, tz: number) => heightAtV1(map, tx, tz) - base(tx, tz);
    instance(trunkGeometry, trunkMaterial, cells.tree, (tx, tz) => [(tx + .5) * t, base(tx, tz) + tall(tx, tz) * 0.3, (tz + .5) * t, 1, tall(tx, tz) * 0.6, 1, 0]);
    instance(crownGeometry, crownMaterial, cells.tree, (tx, tz) => {
      const kind = kindAtV1(map, tx, tz), h = tall(tx, tz);
      // Pines are narrow and tall, palms a small tuft, broadleaves a wide crown.
      return kind === "pine" ? [(tx + .5) * t, base(tx, tz) + h - 3, (tz + .5) * t, 0.85, 3, 0.85, hash(tx, tz) * 6]
        : kind === "palm" ? [(tx + .5) * t, base(tx, tz) + h - 0.8, (tz + .5) * t, 1.25, 0.8, 1.25, hash(tx, tz) * 6]
        : [(tx + .5) * t, base(tx, tz) + h - 1.7, (tz + .5) * t, 1.15, 1.7, 1.15, hash(tx, tz) * 6];
    }, (tx, tz) => { const kind = kindAtV1(map, tx, tz); return kind === "pine" ? pineColors[Math.floor(hash(tz, tx) * 2)] : kind === "palm" ? palmColor : crownColors[Math.floor(hash(tz, tx) * 3)]; });
    instance(bushGeometry, leafMaterial, cells.bush, (tx, tz) => [(tx + .5) * t, base(tx, tz) + 0.35, (tz + .5) * t, 1.3, 0.8, 1.3, hash(tx, tz) * 6],
      (tx, tz) => bushColors[Math.floor(hash(tz, tx) * 2)]);
    instance(crateGeometry, crateMaterial, cells.crate, (tx, tz) => [(tx + .5) * t, base(tx, tz) + 0.5, (tz + .5) * t, 1, 1, 1, hash(tx, tz) * 0.6]);
    for (const object of zone.objects) scene.add(object);
    return zone;
  }
  function dropZone(zone: ZoneV1) {
    for (const object of zone.objects) {
      scene.remove(object);
      if (object.geometry !== trunkGeometry && object.geometry !== crownGeometry && object.geometry !== bushGeometry && object.geometry !== crateGeometry) object.geometry.dispose();
      if (object instanceof InstancedMesh) object.dispose();
    }
  }
  /** Loads the zones within the radius (nearest first, `budget` per call) and drops the far ones. */
  function stream(x: number, z: number, budget: number) {
    const cx = Math.floor(x / t / ISLES_ZONE_TILES_V1), cz = Math.floor(z / t / ISLES_ZONE_TILES_V1);
    const wanted: [number, number, number][] = [];
    for (let zz = Math.max(0, cz - streamRadius); zz <= Math.min(zoneCountZ - 1, cz + streamRadius); zz++) {
      for (let zx = Math.max(0, cx - streamRadius); zx <= Math.min(zoneCountX - 1, cx + streamRadius); zx++) {
        if (!loaded.has(zx + ":" + zz)) wanted.push([zx, zz, Math.hypot(zx - cx, zz - cz)]);
      }
    }
    wanted.sort((a, b) => a[2] - b[2]);
    for (const [zx, zz] of wanted.slice(0, budget)) loaded.set(zx + ":" + zz, buildZone(zx, zz));
    for (const [key, zone] of loaded) {
      const [zx, zz] = key.split(":").map(Number);
      if (Math.max(Math.abs(zx - cx), Math.abs(zz - cz)) > streamRadius + 1) { dropZone(zone); loaded.delete(key); }
    }
  }
  let streamedOnce = false;

  // Runtime models (Meshy, public/game/isles/models), loaded once and cloned per entity.
  const loader = new GLTFLoader();
  const gltfCache = new Map<string, Promise<GLTF | null>>();
  const loadGltf = (url: string) => {
    if (!gltfCache.has(url)) gltfCache.set(url, loader.loadAsync(url).catch(() => null));
    return gltfCache.get(url)!;
  };
  const hotMaterials = new WeakMap<Material, Material>();
  let modelsReady = 0;
  /** Puts the model into `fallback` once loaded; the fallback volume is hidden then. */
  function withModel(entity: IslesViewEntityV1, fallback: Group): Slot {
    const slot: Slot = {object: new Group(), kind: entity.kind};
    slot.object.add(fallback);
    const spec = entity.model ? options.models?.[entity.model] : undefined;
    if (!spec) return slot;
    void Promise.all([loadGltf(spec.url), spec.runUrl ? loadGltf(spec.runUrl) : Promise.resolve(null)]).then(([gltf, run]) => {
      if (!gltf || disposed) return;
      const model = cloneSkinned(gltf.scene);
      const box = new Box3().setFromObject(gltf.scene);
      const height = Math.max(0.01, box.max.y - box.min.y), length = Math.max(0.01, box.max.x - box.min.x, box.max.z - box.min.z);
      const k = spec.length ? spec.length / length : (spec.height ?? 1.8) / height;
      model.scale.setScalar(k);
      model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
      const holder = new Group(); holder.rotation.y = spec.yaw ?? 0; holder.add(model);
      model.traverse(object => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        const swap = (material: Material) => {
          if (!hotMaterials.has(material)) hotMaterials.set(material, withCutaway(material.clone(), uniforms, true));
          return hotMaterials.get(material)!;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
      });
      fallback.visible = false;
      slot.object.add(holder);
      const clips: AnimationClip[] = gltf.animations ?? [];
      if (clips.length) {
        slot.mixer = new AnimationMixer(model);
        slot.walk = slot.mixer.clipAction(clips[0]); slot.walk.setLoop(LoopRepeat, Infinity).play();
        const runClip = run?.animations?.[0];
        if (runClip) { slot.run = slot.mixer.clipAction(runClip); slot.run.setLoop(LoopRepeat, Infinity).play(); slot.run.weight = 0; }
      }
      modelsReady++;
    });
    return slot;
  }

  // Entity pool.
  interface Slot { object: Object3D; kind: IslesViewEntityV1["kind"]; hunter?: ReturnType<typeof buildHunter>; mixer?: AnimationMixer; walk?: AnimationAction; run?: AnimationAction }
  let disposed = false, lastSeconds = 0;
  const pool = new Map<string, Slot>();
  const cloakMaterial = new MeshBasicMaterial({color: "#7fe3ff", transparent: true, opacity: 0.12, depthWrite: false, side: DoubleSide});
  const original = new WeakMap<Mesh, Material | Material[]>();
  const pieceMaterial = new MeshBasicMaterial({color: "#ffb547"});
  const beaconMaterial = new MeshBasicMaterial({color: "#ff5a3c", transparent: true, opacity: 0.35, depthWrite: false});
  const make = (entity: IslesViewEntityV1): Slot => {
    if (entity.kind === "yautja") {
      const hunter = buildHunter(uniforms, entity.color ?? (entity.kind === "yautja" ? "#8c7f5a" : "#5a6f8c"));
      return {object: hunter.group, kind: entity.kind, hunter};
    }
    if (entity.kind === "human") return {object: buildHuman(uniforms, entity.color ?? "#a8742f"), kind: entity.kind};
    if (entity.kind === "prey") return {object: buildPrey(uniforms), kind: entity.kind};
    if (entity.kind === "plane") return {object: buildPlane(uniforms), kind: entity.kind};
    if (entity.kind === "beacon") {
      const beam = new Mesh(new CylinderGeometry(0.5, 0.5, 30, 8, 1, true), beaconMaterial); beam.position.y = 15;
      const group = new Group(); group.add(beam); return {object: group, kind: entity.kind};
    }
    if (entity.kind === "npc") return withModel(entity, buildHuman(uniforms, entity.color ?? "#6b6b52"));
    if (entity.kind === "animal") return withModel(entity, buildPrey(uniforms));
    if (entity.kind === "decor") {
      const stand = new Group(); const block = new Mesh(new BoxGeometry(2, 1, 1.2), lambert("#9a9078", uniforms)); block.position.y = 0.5; stand.add(block);
      return withModel(entity, stand);
    }
    if (entity.kind === "marker") {
      const group = new Group();
      const glow = new MeshBasicMaterial({color: entity.color ?? "#7fe3ff", transparent: true, opacity: 0.85});
      const glyph = new Mesh(new ConeGeometry(0.35, 0.8, 3), glow); glyph.position.y = 1.4; glyph.rotation.x = Math.PI; group.add(glyph);
      const ring = new Mesh(new CylinderGeometry(0.9, 0.9, 0.05, 16, 1, true), glow); ring.position.y = 0.1; group.add(ring);
      return {object: group, kind: entity.kind};
    }
    const group = new Group();
    const box = new Mesh(new BoxGeometry(0.5, 0.35, 0.4), pieceMaterial); box.position.y = 0.4; group.add(box);
    const marker = new Mesh(new ConeGeometry(0.3, 0.6, 4), pieceMaterial); marker.position.y = 1.6; marker.rotation.x = Math.PI; group.add(marker);
    return {object: group, kind: entity.kind};
  };

  let cssWidth = 1, cssHeight = 1, cutEnabled = true;
  const toCam = new Vector3(), right = new Vector3(), screenUp = new Vector3();

  function render(state: IslesViewStateV1) {
    const pitch = camera.pitchDegrees * Math.PI / 180;
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    toCam.set(sy * cp, sp, cy * cp); right.set(cy, 0, -sy); screenUp.set(-sy * sp, cp, -cy * sp);
    const aspect = cssWidth / cssHeight, half = state.zoomHalfHeight;
    Object.assign(view, {left: -half * aspect, right: half * aspect, top: half, bottom: -half});
    view.updateProjectionMatrix();
    view.position.set(state.target.x + toCam.x * camera.distance, state.target.y + toCam.y * camera.distance, state.target.z + toCam.z * camera.distance);
    view.up.set(0, 1, 0);
    view.lookAt(state.target.x, state.target.y, state.target.z);
    sun.position.set(state.target.x - 30, state.target.y + 60, state.target.z + 20);
    sun.target.position.set(state.target.x, state.target.y, state.target.z);
    (uniforms.uIslesFeet.value as Vector3).set(state.feet.x, state.feet.y, state.feet.z);
    (uniforms.uIslesToCam.value as Vector3).copy(toCam);
    (uniforms.uIslesRight.value as Vector3).copy(right);
    (uniforms.uIslesUp.value as Vector3).copy(screenUp);
    uniforms.uIslesCut.value = [camera.cutawayRadius, camera.cutawayMinDepth, camera.cutawayFeetMargin, cutEnabled ? 1 : 0];
    uniforms.uIslesPitch.value = [sp, cp];
    uniforms.uIslesThermal.value = state.thermal ? 1 : 0;
    // On the ground the canopy opens in a 14 m circle; on the canopy itself it stays whole.
    uniforms.uIslesCanopy.value = state.feet.y < 4 ? [14, 3] : [0, 0];
    sea.material.color.set(state.thermal ? "#0a1a4a" : "#2a6f86");
    hemi.intensity = state.night ? 0.32 : 1.1;
    sun.intensity = state.night ? 0.35 : 1.8;
    sun.color.set(state.night ? "#9fb6ff" : "#fff1d6");
    renderer.setClearColor(state.night ? "#070d14" : "#1d3a40");
    stream(state.target.x, state.target.z, streamedOnce ? 4 : Infinity);
    streamedOnce = true;
    sea.position.x = state.target.x; sea.position.z = state.target.z;

    const seen = new Set<string>();
    for (const entity of state.entities) {
      seen.add(entity.id);
      let slot = pool.get(entity.id);
      if (slot && slot.kind !== entity.kind) { scene.remove(slot.object); pool.delete(entity.id); slot = undefined; }
      if (!slot) { slot = make(entity); pool.set(entity.id, slot); scene.add(slot.object); }
      const object = slot.object;
      object.position.set(entity.x, entity.y, entity.z);
      object.rotation.set(0, entity.facing, 0);
      object.scale.setScalar(entity.scale ?? 1);
      if (slot.mixer) {
        const moving = Boolean(entity.moving), running = Boolean(entity.running);
        if (slot.walk) slot.walk.weight = moving && !(running && slot.run) ? 1 : moving ? 0 : 1;
        if (slot.run) slot.run.weight = moving && running ? 1 : 0;
        slot.mixer.timeScale = moving ? 1 : 0;
        slot.mixer.update(Math.max(0, Math.min(0.1, state.seconds - lastSeconds)));
      }
      if (entity.kind === "piece") object.children[1].position.y = 1.6 + Math.sin(state.seconds * 3) * 0.15;
      if ((entity.kind === "npc" || entity.kind === "animal") && entity.downed) {
        // Bodies lie on their side.
        object.rotation.set(0, entity.facing, Math.PI / 2);
        object.position.y += entity.kind === "npc" ? 0.3 : 0.2;
      }
      if (entity.kind === "human") {
        object.rotation.z = entity.downed ? Math.PI / 2 : 0;
        if (entity.downed) object.position.y += 0.3;
        const gun = object.getObjectByName("gun");
        if (gun) gun.visible = !entity.surrendered;
      }
      if (slot.hunter) {
        const cloaked = Boolean(entity.cloaked);
        for (const mesh of slot.hunter.body) {
          if (!original.has(mesh)) original.set(mesh, mesh.material);
          mesh.material = cloaked ? cloakMaterial : original.get(mesh)!;
          mesh.castShadow = !cloaked;
        }
        slot.hunter.outline.visible = cloaked && entity.kind === "yautja";
      }
      object.visible = (entity.opacity ?? 1) > 0.02;
    }
    for (const [id, slot] of pool) if (!seen.has(id)) { scene.remove(slot.object); pool.delete(id); }
    lastSeconds = state.seconds;
    renderer.render(scene, view);
  }

  return {
    render,
    resize(width, height, pixelRatio) {
      cssWidth = Math.max(1, width); cssHeight = Math.max(1, height);
      renderer.setPixelRatio(Math.min(2, pixelRatio));
      renderer.setSize(cssWidth, cssHeight, false);
    },
    project(x, y, z) {
      const v = new Vector3(x, y, z).project(view);
      return {x: (v.x + 1) / 2 * cssWidth, y: (1 - v.y) / 2 * cssHeight, visible: Math.abs(v.x) <= 1.1 && Math.abs(v.y) <= 1.1 && v.z < 1};
    },
    setCutaway(enabled) { cutEnabled = enabled; },
    stats() {
      let triangles = 0, instances = 0;
      for (const zone of loaded.values()) { triangles += zone.triangles; instances += zone.instances; }
      return {zones: loaded.size, terrainTriangles: triangles, instances, drawCalls: renderer.info.render.calls, modelsReady};
    },
    dispose() {
      disposed = true;
      scene.traverse(object => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(material)) material.forEach(item => item.dispose()); else material?.dispose?.();
      });
      renderer.dispose();
    },
  };
}
