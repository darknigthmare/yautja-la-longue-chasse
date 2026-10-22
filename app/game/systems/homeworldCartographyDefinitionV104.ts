import source from '../data/bibleCartographySceneV104.json';

/** Original local staging of the exact V6 profession scene. The lectern,
 * planter and lamp already exist; no named resident or canonical map is reused. */
export const HOMEWORLD_CARTOGRAPHY_V104 = {
  sceneId: 'D6-W-PNJ-ROLE-12', routeId: 'port-known-lectern-v104', levelId: '0', districtId: 'port',
  npcId: 'bible-v104:port-cartographer', npcName: 'Cartographe du poste rencontré',
  lecternId: 'urban-v81:port-4:register', host: { x: 5860, y: 5160 }, post: { x: 5920, y: 5190 },
  radius: 100, waypointRadius: 48,
  waypoints: [
    { id: 'street-v92:port-registers:basalt-planter-left', label: 'Bac de basalte du registre', x: 6120, y: 5020 },
    { id: 'urban-v81:port-4:light', label: 'Lampe de la cour du registre', x: 6240, y: 5260 },
  ],
  envelope: { left: 5780, right: 6380, top: 4930, bottom: 5380 },
} as const;
export const HOMEWORLD_CARTOGRAPHY_SOURCE_V104 = source;
const cell = (row: { number: number; cells: { address: string; value?: unknown }[] }, column: string) => String(row.cells.find(c => c.address === `${column}${row.number}`)?.value ?? '');
const scene = source.sheets.find(s => s.name === 'Scènes de dialogue V6')!.rows[0];
export const HOMEWORLD_CARTOGRAPHY_SCENE_V104 = {
  title: cell(scene, 'B'), location: cell(scene, 'F'), conditions: cell(scene, 'H'), knowledge: cell(scene, 'I'),
  address: `Scènes de dialogue V6!A${scene.number}:Q${scene.number}`,
};
export const HOMEWORLD_CARTOGRAPHY_LINES_V104 = source.sheets.find(s => s.name === 'Répliques V6')!.rows.map(row => ({
  id: cell(row, 'A'), kind: cell(row, 'C'), option: cell(row, 'D'), speaker: cell(row, 'F'), text: cell(row, 'G'), gesture: cell(row, 'H'),
  address: `Répliques V6!A${row.number}:K${row.number}`,
}));
export const HOMEWORLD_CARTOGRAPHY_OPTION_V104 = (() => {
  const row = source.sheets.find(s => s.name === 'Choix et actions V6')!.rows.find(row => cell(row, 'C') === 'B')!;
  return { action: cell(row, 'F'), conditions: cell(row, 'G'), consequence: cell(row, 'H'), address: `Choix et actions V6!A${row.number}:H${row.number}` };
})();
