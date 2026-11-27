/** The Isles V1 · three.js renderer (decision of 21 November 2026: three.js, WebGL2).
 * Terrain columns are merged per 32 × 32 tile zone; trees, bushes and crates are instanced.
 * Every world material shares the cut-away of islesCameraV1.cutawayHidesV1, in GLSL. */
import {
  AmbientLight, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DodecahedronGeometry,
  Float32BufferAttribute, Group, HemisphereLight, InstancedMesh, Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  Object3D, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Quaternion, Scene, Vector3, WebGLRenderer,
  BackSide, DoubleSide,
} from "three";
import {BODY_ABOVE_CHEST_V1, BODY_BELOW_CHEST_V1, type IslesCameraTuningV1} from "./islesCameraV1";
import {heightAtV1, kindAtV1, type IslesMapV1, type IslesTileKindV1} from "./islesMapV1";

export const ISLES_ZONE_TILES_V1 = 32;

/** Something drawn on the map this frame. */
export interface IslesViewEntityV1 {
  id: string;
  kind: "yautja" | "human" | "prey" | "plane" | "piece" | "beacon";
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
  stats(): {zones: number; terrainTriangles: number; instances: number; drawCalls: number};
  /** Turns the cut-away off (browser QA compares both renders). */
  setCutaway(enabled: boolean): void;
  dispose(): void;
}

const KIND_COLORS: Record<IslesTileKindV1, string> = {
  water: "#3a5a52", ford: "#5d7a5e", sand: "#d8c48a", grass: "#6f9a4a", jungle: "#3f6b34", mud: "#7a6345",
  road: "#8b8072", bush: "#3f6b34", crate: "#8a6a3a", rock: "#8c8a80", tree: "#3f6b34", wall: "#b9ad97",
  roof: "#9b4f35", pillar: "#a8a397", ruin: "#a39a7c",
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
  };
}

const CUT_DECLARATIONS = `
uniform vec3 uIslesFeet; uniform vec3 uIslesToCam; uniform vec3 uIslesRight; uniform vec3 uIslesUp;
uniform vec4 uIslesCut; uniform vec2 uIslesPitch; uniform float uIslesThermal;
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
function withCutaway<T extends Material>(material: T, uniforms: Uniforms, hot = false, cut = !hot): T {
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
  if (islesHidden()) { vec2 cell = mod(floor(gl_FragCoord.xy), 2.0); if (cell.x + cell.y > 0.5) discard; }` : "void main() {")
      .replace("#include <tonemapping_fragment>", hot
        ? "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.55 + 0.4 * gl_FragColor.g, 0.12), uIslesThermal);\n#include <tonemapping_fragment>"
        : "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.04, 0.09, 0.32) + gl_FragColor.rgb * vec3(0.05, 0.15, 0.35), uIslesThermal);\n#include <tonemapping_fragment>");
  };
  material.customProgramCacheKey = () => (hot ? "isles-hot" : "isles-cold") + (cut ? "-cut" : "");
  return material;
}

/** Merged columns of one zone, with faces only where the neighbour is lower. */
function buildZoneGeometry(map: IslesMapV1, x0: number, z0: number): BufferGeometry | null {
  const t = map.tileMeters;
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const color = new Color();
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], shade: number) => {
    for (const p of [a, b, c, a, c, d]) { positions.push(p[0], p[1], p[2]); normals.push(n[0], n[1], n[2]); colors.push(color.r * shade, color.g * shade, color.b * shade); }
  };
  const columnTop = (tx: number, tz: number) => {
    const kind = kindAtV1(map, tx, tz);
    // Trees are drawn as instanced trunks and crowns; their tile is ground underneath.
    if (kind === "tree" || kind === "crate" || kind === "bush") return 0;
    return heightAtV1(map, tx, tz);
  };
  for (let tz = z0; tz < Math.min(map.depth, z0 + ISLES_ZONE_TILES_V1); tz++) {
    for (let tx = x0; tx < Math.min(map.width, x0 + ISLES_ZONE_TILES_V1); tx++) {
      const kind = kindAtV1(map, tx, tz);
      const top = columnTop(tx, tz);
      const groundKind: IslesTileKindV1 = kind === "tree" || kind === "bush" ? (map.id.includes("verdant") ? "jungle" : "grass") : kind === "crate" ? "grass" : kind;
      color.set(KIND_COLORS[groundKind]);
      const jitter = 0.92 + hash(tx, tz) * 0.12;
      const x = tx * t, z = tz * t;
      quad([x, top, z], [x, top, z + t], [x + t, top, z + t], [x + t, top, z], [0, 1, 0], jitter);
      if (top > 0.6) {
        // Ground inside a tall column, seen only through the cut-away.
        const inner = color.clone();
        color.set(KIND_COLORS[map.id.includes("verdant") ? "jungle" : "grass"]);
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

/** Creates the scene for a map on a canvas. */
export function createIslesSceneV1(canvas: HTMLCanvasElement, map: IslesMapV1, camera: IslesCameraTuningV1): IslesSceneV1 {
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
  const sea = new Mesh(new PlaneGeometry(width + 400, depth + 400), new MeshLambertMaterial({color: "#2a6f86", transparent: true, opacity: 0.72}));
  sea.rotation.x = -Math.PI / 2; sea.position.set(width / 2, -0.06, depth / 2); sea.receiveShadow = true;
  scene.add(sea);

  const terrain = withCutaway(new MeshLambertMaterial({vertexColors: true}), uniforms);
  let zones = 0, terrainTriangles = 0;
  for (let z0 = 0; z0 < map.depth; z0 += ISLES_ZONE_TILES_V1) {
    for (let x0 = 0; x0 < map.width; x0 += ISLES_ZONE_TILES_V1) {
      const geometry = buildZoneGeometry(map, x0, z0);
      if (!geometry) continue;
      const mesh = new Mesh(geometry, terrain); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = "zone-" + x0 + "-" + z0;
      scene.add(mesh); zones++; terrainTriangles += geometry.getAttribute("position").count / 3;
    }
  }

  // Instanced props.
  const cells: Record<"tree" | "bush" | "crate", [number, number][]> = {tree: [], bush: [], crate: []};
  for (let tz = 0; tz < map.depth; tz++) for (let tx = 0; tx < map.width; tx++) {
    const kind = kindAtV1(map, tx, tz);
    if (kind === "tree" || kind === "bush" || kind === "crate") cells[kind].push([tx, tz]);
  }
  const matrix = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3(), up = new Vector3(0, 1, 0);
  const instanced: InstancedMesh[] = [];
  const instance = (geometry: BufferGeometry, material: MeshLambertMaterial, list: [number, number][],
    place: (tx: number, tz: number, i: number) => [number, number, number, number, number, number, number], tint?: (i: number) => Color) => {
    if (!list.length) return;
    const mesh = new InstancedMesh(geometry, material, list.length);
    list.forEach(([tx, tz], i) => {
      const [x, y, z, sx, sy, sz, rot] = place(tx, tz, i);
      p.set(x, y, z); s.set(sx, sy, sz); q.setFromAxisAngle(up, rot); matrix.compose(p, q, s); mesh.setMatrixAt(i, matrix);
      if (tint) mesh.setColorAt(i, tint(i));
    });
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); instanced.push(mesh);
  };
  const treeHeight = (tx: number, tz: number) => heightAtV1(map, tx, tz);
  instance(new CylinderGeometry(0.22, 0.32, 1, 6), lambert("#5b4630", uniforms), cells.tree,
    (tx, tz) => [(tx + .5) * t, treeHeight(tx, tz) * 0.3, (tz + .5) * t, 1, treeHeight(tx, tz) * 0.6, 1, 0]);
  instance(new DodecahedronGeometry(1, 0), lambert("#ffffff", uniforms), cells.tree,
    (tx, tz) => [(tx + .5) * t, treeHeight(tx, tz) - 1.7, (tz + .5) * t, 1.35, 1.7, 1.35, hash(tx, tz) * 6],
    i => new Color(i % 3 === 0 ? "#2f5d2a" : i % 3 === 1 ? "#3b6e30" : "#28502a"));
  instance(new DodecahedronGeometry(0.55, 0), lambert("#ffffff", uniforms), cells.bush,
    (tx, tz) => [(tx + .5) * t, 0.35, (tz + .5) * t, 1.3, 0.8, 1.3, hash(tx, tz) * 6], i => new Color(i % 2 ? "#4c7a37" : "#3e6a30"));
  instance(new BoxGeometry(1.6, 1, 1.6), lambert("#8a6a3a", uniforms), cells.crate,
    (tx, tz) => [(tx + .5) * t, 0.5, (tz + .5) * t, 1, 1, 1, hash(tx, tz) * 0.6]);

  // Entity pool.
  const pool = new Map<string, {object: Object3D; kind: IslesViewEntityV1["kind"]; hunter?: ReturnType<typeof buildHunter>}>();
  const cloakMaterial = new MeshBasicMaterial({color: "#7fe3ff", transparent: true, opacity: 0.12, depthWrite: false, side: DoubleSide});
  const original = new WeakMap<Mesh, Material | Material[]>();
  const pieceMaterial = new MeshBasicMaterial({color: "#ffb547"});
  const beaconMaterial = new MeshBasicMaterial({color: "#ff5a3c", transparent: true, opacity: 0.35, depthWrite: false});
  const make = (entity: IslesViewEntityV1) => {
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
    sea.material.color.set(state.thermal ? "#0a1a4a" : "#2a6f86");
    hemi.intensity = state.night ? 0.32 : 1.1;
    sun.intensity = state.night ? 0.35 : 1.8;
    sun.color.set(state.night ? "#9fb6ff" : "#fff1d6");
    renderer.setClearColor(state.night ? "#070d14" : "#1d3a40");

    const seen = new Set<string>();
    for (const entity of state.entities) {
      seen.add(entity.id);
      let slot = pool.get(entity.id);
      if (slot && slot.kind !== entity.kind) { scene.remove(slot.object); pool.delete(entity.id); slot = undefined; }
      if (!slot) { slot = make(entity); pool.set(entity.id, slot); scene.add(slot.object); }
      const object = slot.object;
      object.position.set(entity.x, entity.y, entity.z);
      object.rotation.set(0, entity.facing, 0);
      if (entity.kind === "piece") object.children[1].position.y = 1.6 + Math.sin(state.seconds * 3) * 0.15;
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
      return {zones, terrainTriangles, instances: instanced.reduce((sum, mesh) => sum + mesh.count, 0), drawCalls: renderer.info.render.calls};
    },
    dispose() {
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
