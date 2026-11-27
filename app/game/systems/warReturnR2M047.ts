/** R2-M047, a local aftermath operation reached through the first collective escort. */
const REBUILD = [
  ['walk-to-depot', 'Rejoindre le dépôt du talus'],
  ['take-material', 'Prendre les deux étais réservés'],
  ['carry-to-bridge', 'Rapporter les étais au pont'],
  ['anchor', 'Ancrer les étais sur la dalle intacte'],
  ['test-crossing', 'Franchir la passerelle avec la vétérane'],
] as const;

const ESCORT = [
  ['walk-to-aid', 'Prendre le sentier jusqu’au poste de soins'],
  ['ready-litter', 'Préparer le brancard et prévenir les blessés'],
  ['escort-bend', 'Accompagner le brancard jusqu’au coude'],
  ['escort-shelter', 'Abriter l’équipe derrière le mur du refuge'],
  ['hand-over', 'Remettre les blessés à l’équipe de relève'],
] as const;

const ARRIVAL = [
  ['land', 'Débarquer à la Passe des Cendres'],
  ['walk-to-veterans', 'Rejoindre le poste des vétérans'],
  ['meet-veterans', 'Parler à la vétérane du Talus'],
  ['walk-to-bridge', 'Suivre la vétérane jusqu’au pont de service'],
  ['inspect-bridge', 'Examiner le tablier effondré et les deux rives'],
] as const;

const CHOICES = [
  ['reconstruct', 'Rouvrir le passage'],
  ['escort', 'Accompagner les blessés'],
] as const;

const RETURN = ['return-aboard', 'Rentrer au hangar et déposer le relevé'] as const;

export type WarReturnChoice = typeof CHOICES[number][0];
export type WarReturnOrder =
  | typeof ARRIVAL[number][0] | WarReturnChoice | typeof REBUILD[number][0] | typeof ESCORT[number][0] | typeof RETURN[0];
type WarReturnOption = readonly [WarReturnOrder, string];

export interface WarReturnRecord {
  escortRevision: number;
  departureRevision: number;
  orders: WarReturnOrder[];
  returnConsequenceSeen: boolean;
}

const ARRIVAL_LOCATIONS = ['landing', 'landing', 'veterans', 'veterans', 'bridge', 'bridge'] as const;
const REBUILD_LOCATIONS = ['bridge', 'depot', 'depot', 'bridge', 'bridge', 'far-bank'] as const;
const ESCORT_LOCATIONS = ['bridge', 'aid', 'aid', 'bend', 'refuge', 'refuge'] as const;

const NOTES: Partial<Record<WarReturnOrder, string>> = {
  land: 'Les feux sont éteints. Les cendres couvrent le seuil que le transport extrait a permis de ravitailler.',
  'walk-to-veterans': 'Le poste du Talus occupe le replat au-dessus du ravin. La vétérane rassemble les survivants de son unité.',
  'meet-veterans': '« Mon unité a tenu la rive jusqu’à l’extraction. Viens voir ce qui reste de la liaison. »',
  'walk-to-bridge': 'Le tablier est tombé dans le ravin. Avant de choisir une tâche, relève où le sol peut encore porter une charge.',
  'inspect-bridge': 'La rive proche tient encore. Les blessés attendent sous un auvent, loin du tablier. La vétérane prend en charge la tâche que tu lui laisses.',
  reconstruct: 'La vétérane envoie sa relève au poste de soins. Tu prends en charge la liaison entre les deux rives.',
  'walk-to-depot': 'Les secours ont isolé deux étais sains avec leurs attaches.',
  'take-material': 'Les deux étais et les attaches sont à ta charge jusqu’au pont.',
  'carry-to-bridge': 'L’ancienne dalle est encore stable. Place les étais sous le tablier de secours avant de le tester.',
  anchor: 'Les deux appuis portent. La vétérane attend le signal pour faire le premier passage avec toi.',
  'test-crossing': 'La passerelle tient sous deux personnes. L’unité du Talus garde le nouveau passage ouvert.',
  escort: 'La vétérane confie le pont à son unité. Tu rejoins le poste de soins par le sentier de rive.',
  'walk-to-aid': 'Les blessés attendent le brancard sous l’auvent. Le sentier du refuge évite le tablier.',
  'ready-litter': 'Les porteurs sont prêts. Le premier repère se trouve au coude, à l’abri des gravats.',
  'escort-bend': 'Le brancard a passé le coude. La relève attend derrière le mur du refuge.',
  'escort-shelter': 'Le brancard est posé à couvert. La relève doit encore recevoir les blessés.',
  'hand-over': 'La relève a reçu les blessés. Le pont reste fermé jusqu’à l’arrivée de l’équipe de réparation.',
};

export function warReturnView(orders: readonly WarReturnOrder[]) {
  const arrivalStep = orders.length;
  const choice = orders[ARRIVAL.length] as WarReturnChoice | undefined;
  const branchStep = orders.length - ARRIVAL.length - 1;
  const lastOrder = orders.at(-1);
  const complete = lastOrder === RETURN[0];
  const branch = choice === 'reconstruct' ? REBUILD : ESCORT;
  const options: readonly WarReturnOption[] = complete ? [] :
    arrivalStep < ARRIVAL.length ? [ARRIVAL[arrivalStep]] :
    !choice ? CHOICES : branchStep < branch.length ? [branch[branchStep]] : [RETURN];
  const location = complete ? 'aboard' :
    !choice ? ARRIVAL_LOCATIONS[Math.min(arrivalStep, ARRIVAL.length)] :
    (choice === 'reconstruct' ? REBUILD_LOCATIONS : ESCORT_LOCATIONS)[branchStep];
  const note = complete ? (choice === 'reconstruct'
    ? 'Le relevé du hangar confirme la remise en service de la passerelle.'
    : 'Le relevé du hangar confirme que les blessés sont arrivés au refuge.')
    : lastOrder ? NOTES[lastOrder] : 'Le premier transport escorté a déposé des secours sur le front. La vétérane du Talus a demandé une visite au sol.';
  return { complete, options, location, choice, note };
}

const MAX_ORDERS = ARRIVAL.length + 1 + Math.max(REBUILD.length, ESCORT.length) + 1;
export function inspectWarReturn(
  value: unknown,
  escortRevision: number | undefined,
  operationsRevision: number,
): value is WarReturnRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = ['escortRevision', 'departureRevision', 'orders', 'returnConsequenceSeen'];
  if (Reflect.ownKeys(record).length !== keys.length || !keys.every(key => Object.hasOwn(record, key)) ||
      escortRevision === undefined || record.escortRevision !== escortRevision ||
      typeof record.departureRevision !== 'number' || !Number.isSafeInteger(record.departureRevision) ||
      record.departureRevision <= escortRevision || !Array.isArray(record.orders) ||
      record.orders.length < 1 || record.orders.length > MAX_ORDERS ||
      record.departureRevision + record.orders.length - 1 > operationsRevision) return false;

  const orders: WarReturnOrder[] = [];
  for (const order of record.orders) {
    const next = warReturnView(orders).options.find(option => option[0] === order);
    if (!next) return false;
    orders.push(next[0]);
  }
  return record.returnConsequenceSeen === warReturnView(orders).complete;
}

export function applyWarReturnOrder(
  current: WarReturnRecord | undefined,
  order: unknown,
  escortRevision: number,
  nextRevision: number,
): WarReturnRecord | null {
  const orders = current?.orders ?? [];
  const nextOrder = warReturnView(orders).options.find(option => option[0] === order)?.[0];
  if (!nextOrder) return null;
  return {
    escortRevision, departureRevision: current?.departureRevision ?? nextRevision,
    orders: [...orders, nextOrder], returnConsequenceSeen: nextOrder === RETURN[0],
  };
}
