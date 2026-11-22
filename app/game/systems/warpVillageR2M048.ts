/** R2-M048. The Cedar Hamlet and its residents belong to the W-02 branch. */
const SITES = {
  bank: { name: 'Berge du hameau', ground: 'Les vanniers attendent au-dessus du gué. La pluie a emporté les repères bas.' },
  mill: { name: 'Moulin des cèdres', ground: 'Les habitants voient encore le toit du moulin depuis le coteau. Le courant couvre les pierres du gué.' },
  ridge: { name: 'Coteau des cèdres', ground: 'Une levée de terre relie l’ancien verger au grenier construit sur la pente.' },
  granary: { name: 'Grenier sur la pente', ground: 'Les familles ont atteint le grenier. Une habitante compte les gens de chaque maison.' },
} as const;

const ACTIONS = {
  'meet-weavers': { label: 'Écouter la porte-parole des vanniers', at: 'bank' },
  'survey-mill': { label: 'Suivre les traces de crue jusqu’au moulin', at: 'mill' },
  'limited-aid': { label: 'Proposer un passage sur le coteau', at: 'ridge' },
  'observation': { label: 'Observer la décision des vanniers', at: 'ridge' },
  'guide-from-bank': { label: 'Signaler la levée avec les fanions du hameau', at: 'ridge' },
  'follow-locals': { label: 'Suivre les repères choisis par les vanniers', at: 'ridge' },
  'verify-granary': { label: 'Vérifier le rassemblement près du grenier', at: 'granary' },
  'record-trace': { label: 'Relever le trajet de mémoire', at: 'granary' },
} as const satisfies Record<string, { label: string; at: keyof typeof SITES }>;

export type WarpVillageOrder = keyof typeof ACTIONS;
export interface WarpVillageRecord {
  orders: WarpVillageOrder[];
  advancedBranchResolved: boolean;
}

export function warpVillageView(orders: readonly WarpVillageOrder[]) {
  const choice = orders[2];
  const observe = choice === 'observation';
  const complete = orders.at(-1) === 'record-trace';
  const route: readonly WarpVillageOrder[][] = [
    ['meet-weavers'], ['survey-mill'], ['limited-aid', 'observation'],
    [observe ? 'follow-locals' : 'guide-from-bank'], ['verify-granary'], ['record-trace'],
  ];
  const lastOrder = orders.at(-1);
  const location = lastOrder ? ACTIONS[lastOrder].at : 'bank';
  const notes = [
    'Le gué du hameau est inondé. La porte-parole cherche un trajet praticable avant la prochaine montée des eaux.',
    '« Le passage du moulin d’abord. Si le repère bas a disparu, c’est nous qui choisirons quel chemin prendre. »',
    'Le repère fait de pierres est submergé. La levée du coteau reste praticable.',
    observe ? 'La porte-parole prend la levée. Elle demande à deux vanniers d’allumer des lanternes sur le coteau.'
      : 'La porte-parole accepte de vérifier la levée. Elle te remet deux fanions locaux pour signaler les virages. Elle conduira son groupe.',
    observe ? 'Les lanternes indiquent les virages. Les vanniers conduisent les familles par petits groupes.'
      : 'Les fanions indiquent les deux virages. Les vanniers conduisent les familles par petits groupes.',
    'Toutes les maisons ont répondu à l’appel. La porte-parole rend les signaux au grenier.',
    observe ? 'Le dossier conserve un relevé du trajet choisi par les vanniers.'
      : 'Le dossier conserve un relevé du trajet balisé avec les vanniers.',
  ];
  return {
    complete, choice, site: SITES[location], location, note: notes[orders.length],
    options: (route[orders.length] ?? []).map(id => ({ id, label: ACTIONS[id].label })),
  };
}

export function normalizeWarpVillage(value: unknown): WarpVillageRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Reflect.ownKeys(record).length !== 2 || !Object.hasOwn(record, 'orders') ||
      !Object.hasOwn(record, 'advancedBranchResolved') || !Array.isArray(record.orders) ||
      record.orders.length < 1 || record.orders.length > 6) return null;
  const orders: WarpVillageOrder[] = [];
  for (const id of record.orders) {
    const next = warpVillageView(orders).options.find(option => option.id === id);
    if (!next) return null;
    orders.push(next.id);
  }
  const complete = warpVillageView(orders).complete;
  return record.advancedBranchResolved === complete ? { orders, advancedBranchResolved: complete } : null;
}

export function actWarpVillage(value: WarpVillageRecord | undefined, order: unknown): WarpVillageRecord | null {
  const orders = value?.orders ?? [];
  const next = warpVillageView(orders).options.find(option => option.id === order);
  if (!next) return null;
  return { orders: [...orders, next.id], advancedBranchResolved: next.id === 'record-trace' };
}
