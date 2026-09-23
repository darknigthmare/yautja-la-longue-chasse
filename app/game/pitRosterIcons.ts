import manifest from './data/pitRosterIconsV45.json';

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
/** Only the roster grid uses resized derivatives; selected portraits and combat keep source art. */
export function getPitRosterIcon(fighterId: string): PitRosterIcon | null {
  return Object.hasOwn(icons, fighterId) ? icons[fighterId] : null;
}