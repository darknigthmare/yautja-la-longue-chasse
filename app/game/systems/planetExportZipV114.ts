/** Minimal deterministic ZIP32 writer for already-compressed PNGs and JSON.
 * STORE avoids adding a browser dependency or recompressing image data.
 * Explicit bounds prevent excessive memory use on mobile.
 */
export interface PlanetZipEntryV114 {
  name: string;
  bytes: Uint8Array;
}
const MAX_ENTRIES = 16;
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_NAME = 160;

export function planetZipCrc32V114(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function makePlanetStoredZipV114(entries: readonly PlanetZipEntryV114[]): Uint8Array {
  if (!entries.length || entries.length > MAX_ENTRIES) throw new RangeError("Le nombre de fichiers du pack planétaire est invalide.");
  const encoder = new TextEncoder();
  const names = new Set<string>();
  const files = entries.map(entry => {
    if (typeof entry.name !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(entry.name)
      || entry.name.startsWith("/") || entry.name.split("/").includes("..") || names.has(entry.name)
      || !(entry.bytes instanceof Uint8Array)) throw new RangeError("Nom ou contenu de fichier ZIP invalide.");
    names.add(entry.name);
    const name = encoder.encode(entry.name);
    if (name.length > MAX_NAME) throw new RangeError("Nom de fichier ZIP trop long.");
    return { name, bytes: entry.bytes, crc: planetZipCrc32V114(entry.bytes) };
  });
  const localLength = files.reduce((sum, file) => sum + 30 + file.name.length + file.bytes.byteLength, 0);
  const centralLength = files.reduce((sum, file) => sum + 46 + file.name.length, 0);
  const total = localLength + centralLength + 22;
  if (!Number.isSafeInteger(total) || total > MAX_BYTES) throw new RangeError("Pack planétaire trop volumineux (64 Mio maximum).");
  const output = new Uint8Array(total), view = new DataView(output.buffer);
  const u16 = (at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (at: number, value: number) => view.setUint32(at, value, true);
  const DOS_DATE = 33; // 1980-01-01; stable across exports
  const offsets: number[] = [];
  let offset = 0;
  for (const file of files) {
    offsets.push(offset);
    u32(offset, 0x04034b50);
    u16(offset + 4, 20); // ZIP 2.0
    u16(offset + 6, 0x0800); // UTF-8 names
    u16(offset + 8, 0); // STORE, no compression
    u16(offset + 10, 0); u16(offset + 12, DOS_DATE);
    u32(offset + 14, file.crc);
    u32(offset + 18, file.bytes.byteLength);
    u32(offset + 22, file.bytes.byteLength);
    u16(offset + 26, file.name.byteLength); u16(offset + 28, 0);
    offset += 30;
    output.set(file.name, offset); offset += file.name.byteLength;
    output.set(file.bytes, offset); offset += file.bytes.byteLength;
  }
  const centralStart = offset;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    u32(offset, 0x02014b50);
    u16(offset + 4, 20); u16(offset + 6, 20); u16(offset + 8, 0x0800);
    u16(offset + 10, 0); u16(offset + 12, 0); u16(offset + 14, DOS_DATE);
    u32(offset + 16, file.crc);
    u32(offset + 20, file.bytes.byteLength); u32(offset + 24, file.bytes.byteLength);
    u16(offset + 28, file.name.byteLength);
    u16(offset + 30, 0); u16(offset + 32, 0);
    u16(offset + 34, 0); u16(offset + 36, 0);
    u32(offset + 38, 0); u32(offset + 42, offsets[i]);
    offset += 46;
    output.set(file.name, offset); offset += file.name.byteLength;
  }
  u32(offset, 0x06054b50);
  u16(offset + 4, 0); u16(offset + 6, 0);
  u16(offset + 8, files.length); u16(offset + 10, files.length);
  u32(offset + 12, offset - centralStart);
  u32(offset + 16, centralStart);
  u16(offset + 20, 0);
  if (offset + 22 !== total) throw new Error("Le répertoire ZIP est incomplet.");
  return output;
}
