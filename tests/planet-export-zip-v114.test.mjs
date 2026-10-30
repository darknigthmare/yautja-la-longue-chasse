import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: { contents: 'export * from "./app/game/systems/planetExportZipV114";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm", target: "es2022", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const encode = value => new TextEncoder().encode(value);
const decode = value => new TextDecoder().decode(value);

function unpackStoredZip(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength), files = new Map();
  const u16 = offset => view.getUint16(offset, true), u32 = offset => view.getUint32(offset, true);
  let cursor = 0;
  while (cursor + 4 <= data.length && u32(cursor) === 0x04034b50) {
    assert.equal(u16(cursor + 8), 0, "PNG remains stored, never recompressed");
    assert.equal(u16(cursor + 6), 0x0800, "names explicitly use UTF-8");
    const crc = u32(cursor + 14), size = u32(cursor + 18), nameLength = u16(cursor + 26), extraLength = u16(cursor + 28);
    assert.equal(size, u32(cursor + 22));
    const nameStart = cursor + 30, start = nameStart + nameLength + extraLength, end = start + size;
    assert(end <= data.byteLength);
    const name = decode(data.subarray(nameStart, nameStart + nameLength));
    const bytes = data.slice(start, end);
    assert.equal(api.planetZipCrc32V114(bytes), crc, name);
    assert(!files.has(name), "no duplicate names");
    files.set(name, bytes);
    cursor = end;
  }
  const centralStart = cursor, centralNames = [];
  while (cursor + 4 <= data.length && u32(cursor) === 0x02014b50) {
    const len = u16(cursor + 28), extra = u16(cursor + 30), comment = u16(cursor + 32);
    centralNames.push(decode(data.subarray(cursor + 46, cursor + 46 + len)));
    cursor += 46 + len + extra + comment;
  }
  assert.equal(u32(cursor), 0x06054b50, "end of central directory is present");
  assert.equal(u16(cursor + 8), files.size);
  assert.equal(u16(cursor + 10), files.size);
  assert.equal(u32(cursor + 12), cursor - centralStart);
  assert.equal(u32(cursor + 16), centralStart);
  assert.equal(cursor + 22, data.length);
  assert.deepEqual(centralNames, [...files.keys()]);
  return files;
}

test("ZIP32 holds independent PNG layers and the exact JSON manifest", () => {
  const input = [
    { name: "land-map.png", bytes: new Uint8Array([137, 80, 78, 71, 0, 1, 2, 255]) },
    { name: "aurora-globe.png", bytes: new Uint8Array([137, 80, 78, 71, 7, 0, 0, 255]) },
    { name: "manifest.json", bytes: encode(JSON.stringify({ code: "proc-v103-test", version: 114 })) },
  ];
  const zip = api.makePlanetStoredZipV114(input), files = unpackStoredZip(zip);
  assert.deepEqual([...files.keys()], input.map(entry => entry.name));
  for (const entry of input) assert.deepEqual(files.get(entry.name), entry.bytes);
  assert.equal(JSON.parse(decode(files.get("manifest.json"))).version, 114);
  assert.deepEqual(api.makePlanetStoredZipV114(input), zip, "deterministic bytes and timestamps");
});

test("ZIP32 protects memory, names, paths, and repeated entries", () => {
  const small = { name: "layer.png", bytes: new Uint8Array([0, 1, 2]) };
  assert.throws(() => api.makePlanetStoredZipV114([]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114(Array.from({ length: 17 }, (_, i) => ({ ...small, name: i + ".png" }))), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([small, small]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([{ ...small, name: "../escape" }]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([{ ...small, name: "/absolute.png" }]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([{ ...small, name: "bad\\name.png" }]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([{ ...small, bytes: "not bytes" }]), RangeError);
  assert.throws(() => api.makePlanetStoredZipV114([{ ...small, bytes: new Uint8Array(65 * 1024 * 1024) }]), RangeError);
});

test("ZIP32 permits a zero-length layer and nested safe filenames", () => {
  const files = unpackStoredZip(api.makePlanetStoredZipV114([{ name: "layers/empty.png", bytes: new Uint8Array(0) }]));
  assert.equal(files.get("layers/empty.png").length, 0);
});
