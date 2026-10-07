import { BIBLE_SOURCE_SHA_V85, type BibleSheetV85 } from './bibleSourceV85';

/** Documentary directions only. No clip URL, audio state or actor impersonation
 * is inferred from these authoring notes. */
export interface BibleVoiceProfileV88 {
  id: string;
  name: string;
  context: string;
  direction: string;
  vocabulary: string;
  gestures: string;
  knowledge: string;
  limits: string;
  provenance: string;
  source: { sheet: 'Voix V6'; row: number; range: string; sha256: string };
}
export interface BibleVoiceResolutionV88 {
  kind: 'identity' | 'unique' | 'ambiguous' | 'missing';
  candidates: readonly BibleVoiceProfileV88[];
  resolved: BibleVoiceProfileV88 | null;
}

export function readBibleVoiceProfilesV88(sheet: BibleSheetV85 | undefined): BibleVoiceProfileV88[] {
  if (sheet?.name !== 'Voix V6') return [];
  return sheet.rows.filter(row => row.number > 5).flatMap(row => {
    const text = (column: string) => {
      const value = row.cells.find(cell => cell.address === `${column}${row.number}`)?.value;
      return typeof value === 'string' ? value : '';
    };
    const id = text('A'), name = text('B');
    if (!/^D6-V-[A-Z0-9-]+$/.test(id) || !name.trim()) return [];
    return [{ id, name, context: text('C'), direction: text('D'), vocabulary: text('E'),
      gestures: text('F'), knowledge: text('G'), limits: text('H'), provenance: text('I'),
      source: { sheet: 'Voix V6' as const, row: row.number, range: `A${row.number}:I${row.number}`, sha256: BIBLE_SOURCE_SHA_V85 } }];
  });
}

/** Names remain exact source strings: accents/case, clan/rank, role fragments
 * and scene domains cannot prove that two homonyms are the same person.
 * A literal profile ID in the source speaker cell is explicit identity.
 * The current corpus supplies no verified scene-to-profile bindings for its
 * homonyms, so none is invented here. Reordering rows cannot change resolution. */
export function resolveBibleVoiceProfileV88(speaker: string, profiles: readonly BibleVoiceProfileV88[]): BibleVoiceResolutionV88 {
  if (!speaker.trim()) return { kind: 'missing', candidates: [], resolved: null };
  const identities = profiles.filter(profile => profile.id === speaker);
  if (identities.length) return { kind: identities.length === 1 ? 'identity' : 'ambiguous',
    candidates: identities, resolved: identities.length === 1 ? identities[0] : null };
  const candidates = profiles.filter(profile => profile.name === speaker);
  return { kind: !candidates.length ? 'missing' : candidates.length === 1 ? 'unique' : 'ambiguous',
    candidates, resolved: candidates.length === 1 ? candidates[0] : null };
}
