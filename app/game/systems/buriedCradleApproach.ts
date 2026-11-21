/** R2-M025 approach post. The ship writer receives the completed route only. */
export const CRADLE_APPROACH_TRACK = { start: 80, min: 40, max: 920, length: 960, stride: 40, reach: 35 } as const;
export const CRADLE_APPROACH_SITES = [
  { id: 'risks', x: 160, label: 'Inspecter les risques', art: '021',
    detail: 'La résine et les griffures se concentrent près de l’entrée. Les balises de repli jalonnent le retour.' },
  { id: 'container', x: 360, label: 'Sceller le contenant', art: '048',
    detail: 'Le contenant est scellé. La crête devra rester hors des nappes d’acide pendant le transport.' },
  { id: 'beacon', x: 560, label: 'Tester la balise d’extraction', art: '047',
    detail: 'Le signal de retour atteint le vaisseau. La piste vers la ruche reste accessible.' },
  { id: 'trace', x: 800, label: 'Examiner l’exuvie et les traces', art: '028',
    detail: 'Les traces contournent une poche de résine. Rapporte le relevé à la balise avant le départ.' },
] as const;

type ApproachSite = typeof CRADLE_APPROACH_SITES[number];
type ApproachObservation = { id: ApproachSite['id']; x: number };
export type CradleApproachRoute = 'direct' | 'reconnaissance';
export interface CradleApproachReceipt {
  version: 1;
  route: CradleApproachRoute;
  returnX: number;
  observations: ApproachObservation[];
}
export interface CradleApproachRun {
  x: number;
  facing: -1 | 1;
  scouting: boolean;
  observations: ApproachObservation[];
}

export function createCradleApproachRun(): CradleApproachRun {
  return { x: CRADLE_APPROACH_TRACK.start, facing: 1, scouting: false, observations: [] };
}

export function currentCradleApproachSite(run: CradleApproachRun): ApproachSite | undefined {
  const site = CRADLE_APPROACH_SITES[run.observations.length];
  return site?.id === 'trace' && !run.scouting ? undefined : site;
}

export function nearCradleApproachSite(x: number, site: ApproachSite): boolean {
  return Number.isInteger(x) && Math.abs(x - site.x) <= CRADLE_APPROACH_TRACK.reach;
}

export function advanceCradleApproach(run: CradleApproachRun, command: 'left' | 'right' | 'observe' | 'scout'): CradleApproachRun {
  const beacon = CRADLE_APPROACH_SITES[2];
  if (command === 'scout') {
    return !run.scouting && run.observations.length === 3 && nearCradleApproachSite(run.x, beacon)
      ? { ...run, scouting: true } : run;
  }
  const site = currentCradleApproachSite(run);
  if (command === 'observe') {
    return site && nearCradleApproachSite(run.x, site)
      ? { ...run, observations: [...run.observations, { id: site.id, x: run.x }] } : run;
  }
  const facing = command === 'left' ? -1 : 1;
  const bound = site ? site.x + CRADLE_APPROACH_TRACK.reach : run.scouting ? CRADLE_APPROACH_TRACK.max : beacon.x + CRADLE_APPROACH_TRACK.reach;
  const x = Math.min(bound, Math.max(CRADLE_APPROACH_TRACK.min, run.x + facing * CRADLE_APPROACH_TRACK.stride));
  return { ...run, x, facing };
}

export function buildCradleApproachReceipt(run: CradleApproachRun): CradleApproachReceipt | null {
  if (!nearCradleApproachSite(run.x, CRADLE_APPROACH_SITES[2])) return null;
  return parseCradleApproachReceipt({ version: 1, route: run.scouting ? 'reconnaissance' : 'direct',
    returnX: run.x, observations: run.observations });
}

export function parseCradleApproachReceipt(value: unknown): CradleApproachReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join('|') !== 'observations|returnX|route|version') return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || (raw.route !== 'direct' && raw.route !== 'reconnaissance') ||
      typeof raw.returnX !== 'number' || !nearCradleApproachSite(raw.returnX, CRADLE_APPROACH_SITES[2]) ||
      !Array.isArray(raw.observations) || raw.observations.length !== (raw.route === 'direct' ? 3 : 4)) return null;
  const observations: ApproachObservation[] = [];
  for (const [index, value] of raw.observations.entries()) {
    const site = CRADLE_APPROACH_SITES[index];
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== 'id|x' ||
        value.id !== site.id || !nearCradleApproachSite(value.x, site)) return null;
    observations.push({ id: site.id, x: value.x });
  }
  return { version: 1, route: raw.route, returnX: raw.returnX, observations };
}
