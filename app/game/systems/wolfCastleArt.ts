/**
 * Alpha16 silhouette measurements from the generated PNGs; see the production
 * castle art manifest. Image files stay intact. Authored dimensions describe the
 * visible prop, so large transparent margins cannot shrink a column or move feet.
 */
const FRAMES: Readonly<Record<string, { width: number; height: number; visible: readonly [number, number, number, number] }>> = {
  'throne': { width: 1024, height: 1536, visible: [9, 32, 1016, 1512] },
  'column': { width: 1024, height: 1536, visible: [280, 12, 745, 1524] },
  'dais': { width: 1536, height: 1024, visible: [4, 408, 1533, 831] },
  'airlock-frame': { width: 1024, height: 1536, visible: [14, 8, 1009, 1521] },
  'airlock-leaf': { width: 1024, height: 1536, visible: [177, 90, 847, 1473] },
  'trophy-plinth': { width: 1254, height: 1254, visible: [286, 86, 971, 1189] },
  'council-table': { width: 1536, height: 1024, visible: [9, 141, 1529, 900] },
  'archive-console': { width: 1024, height: 1536, visible: [89, 10, 936, 1496] },
  'bay-anchor': { width: 1254, height: 1254, visible: [15, 11, 1169, 1241] },
  'access-beacon': { width: 1254, height: 1254, visible: [298, 45, 958, 1208] },
  'predator-king-seated': { width: 1199, height: 1312, visible: [157, 139, 1044, 1153] },
  'royal-guard': { width: 1024, height: 1536, visible: [134, 5, 840, 1511] },
};

export function wolfCastleSpriteImageFrame(asset: string, x: number, footY: number, width: number, height: number) {
  const name = asset.slice(asset.lastIndexOf('/') + 1).replace(/\.png$/, '');
  const frame = FRAMES[name];
  if (!frame) return { x: x - width / 2, y: footY - height, width, height };
  const [left, top, right, bottom] = frame.visible;
  const scale = Math.min(width / (right - left), height / (bottom - top));
  return { x: x - (left + right) / 2 * scale, y: footY - bottom * scale, width: frame.width * scale, height: frame.height * scale };
}
