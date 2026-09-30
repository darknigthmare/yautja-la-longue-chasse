/** Display-only identity clarifications. Historical IDs, pixels and replay owners stay intact. */
export const PIT_ROSTER_IDENTITY_NOTES_V62: Readonly<Record<string, {
  readonly name?: string;
  readonly sourceLabel?: string;
  readonly intro: string;
}>> = {
  'user-emissary-phg': {
    name: 'Emissary — Hunting Grounds',
    sourceLabel: 'Predator: Hunting Grounds · Emissary DLC · références officielles IllFonic et PlayStation',
    intro: 'Emissary de Hunting Grounds : chasseur qui étudie et imite le matériel des militaires humains. Cette incarnation du jeu possède son propre dossier ; les deux concepts Emissary supprimés du film restent séparés. Masque et tenue suivent le visuel promotionnel officiel. Le dos et le bas des jambes hors cadre sont reconstruits, sans certification 1:1. Les poses de garde natives disponibles ne constituent pas un kit de combat complet.',
  },
  'user-samurai': {
    name: 'Samurai — Hunting Grounds',
    sourceLabel: 'Predator: Hunting Grounds · interprétation des figurines NECA fournies',
    intro: 'Samurai de Hunting Grounds, déjà présent dans les packs fournis. Ce dossier ne désigne pas Oni du récit The Sword. Les deux apparences sont conservées dans la même case ; aucune nouvelle identité ni animation ne sont déduites de ce reclassement.',
  },
  'user-emissary-1': {
    name: 'Emissary #1 — The Predator',
    sourceLabel: 'The Predator (2018) · concept de scène supprimée · figurine NECA fournie',
    intro: 'Premier Emissary du concept supprimé de The Predator, documenté par NECA. Ce dossier ne remplace pas l’Emissary de Hunting Grounds, dont la biographie et la tenue doivent rester attribuées au jeu.',
  },
  'user-emissary-2': {
    name: 'Emissary #2 — The Predator',
    sourceLabel: 'The Predator (2018) · concept de scène supprimée · figurine NECA fournie',
    intro: 'Second Emissary du concept supprimé de The Predator, documenté par NECA. Il reste distinct du premier Emissary et du dossier Hunting Grounds ; aucune fusion de leurs apparences.',
  },
  'user-classic-2010': {
    sourceLabel: 'Predators (2010) · Classic capturé · figurines NECA fournies',
    intro: 'Classic du film Predators (2010). Le mot Classic ne désigne ici ni le protagoniste d’Aliens versus Predator Classic 2000, ni une apparence Captured de Hunting Grounds.',
  },
  'user-captive': {
    intro: 'Captive des comics, identifié ainsi dans le pack fourni. Sa variante masquée est une reconstruction hypothétique explicitement signalée par la source. Il ne remplace ni Classic de Predators, ni Captured de Hunting Grounds.',
  },
};

/** Variant labels expose the source era instead of showing two indistinguishable “Casque porté”. */
export function getPitVariantLabelV62(fighterId: string, variantId: string, originalLabel: string): string {
  if (fighterId === 'greyback') {
    if (variantId.startsWith('golden-angel-')) return `Golden Angel · ${originalLabel}`;
    if (variantId.startsWith('elder-greyback-')) return `Predator 2 · ${originalLabel}`;
  }
  if (fighterId === 'user-jotun-grendel' || fighterId === 'user-oni') {
    if (variantId.includes('-warp-')) return `Film · interprétation · ${originalLabel}`;
    if (variantId.includes('-avec-casque-')) return `Hunting Grounds · ${originalLabel}`;
    if (variantId.includes('-sans-casque-')) return `Tenue PHG, visage film · ${originalLabel}`;
  }
  if (fighterId === 'user-captive' && variantId.includes('-avec-casque-')) return `Masque hypothétique · ${originalLabel}`;
  return originalLabel;
}
