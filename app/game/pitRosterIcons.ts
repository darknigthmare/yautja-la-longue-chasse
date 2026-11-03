import manifest from './data/pitRosterIconsV45.json';
import originalArtV56 from './data/pitOriginalFighterArtV56.json';
import additionsV62 from './data/pitUserHuntersV62.json';
import additionsV79 from './data/pitUserHuntersV79.json';

export interface PitRosterIcon {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly sourceSrc: string;
  readonly sourceSha256: string;
  readonly sourceVariantId: string;
  readonly bytes: number;
}
const icons: Readonly<Record<string, PitRosterIcon>> = manifest.icons;
const additions = [...additionsV62.fighters, ...additionsV79.fighters] as unknown as readonly { readonly id: string; readonly icon: PitRosterIcon }[];
/** Only the roster grid uses resized derivatives; selected portraits and combat keep source art. */
export function getPitRosterIcon(fighterId: string): PitRosterIcon | null {
  const added = additions.find(entry => entry.id === fighterId);
  if (added) return added.icon;
  const supplied = originalArtV56.fighters.find(entry => entry.fighterId === fighterId);
  if (supplied) return supplied.icon;
  return Object.hasOwn(icons, fighterId) ? icons[fighterId] : null;
}
