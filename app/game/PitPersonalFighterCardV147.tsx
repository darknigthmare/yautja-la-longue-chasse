"use client";

import type { CSSProperties } from "react";
import { HunterRigPreview } from "./HunterRigPreview";
import { PIT_FIGHTERS } from "./systems/pitCombat";
import { modeAppearanceLabelV147 } from "./systems/hunterModeAppearanceV147";
import type { PitPersonalFighterV147 } from "./systems/pitPersonalFighterV147";
import type { ArmorId, GearId, HunterAppearance, WeaponId } from "./types";
import styles from "./PitCanvas.module.css";

export type PitPersonalFighterPropV147 = PitPersonalFighterV147<
  HunterAppearance,
  { readonly armorId: ArmorId; readonly weaponIds: readonly WeaponId[]; readonly gearIds: readonly GearId[] }
>;

/** J1 card of the personal slot: campaign rig and the base fighter's duel profile. */
export default function PitPersonalFighterCardV147({ personal }: { personal: PitPersonalFighterPropV147 }) {
  const base = PIT_FIGHTERS[personal.baseFighterId];
  const source = modeAppearanceLabelV147({ source: personal.appearanceSource, outfitName: personal.outfitName });
  return (
    <article className={styles.fighterCard} style={{ "--fighter": base.palette.primary } as CSSProperties}
      aria-label={`Profil de ${personal.name} · côté gauche`} data-fighter-id={personal.baseFighterId}
      data-pit-personal-fighter-v147="true" data-pit-personal-appearance-v147={personal.appearanceSource}>
      <span className={styles.sideLabel}>GAUCHE · TON YAUTJA</span>
      <div className={styles.fighterMedia} data-pit-fighter-media>
        <HunterRigPreview appearance={personal.appearance} armorId={personal.loadout.armorId}
          weaponIds={personal.loadout.weaponIds} gearIds={personal.loadout.gearIds} size="min(100%, 300px)"
          label={`${personal.name}, apparence ${source.toLocaleLowerCase("fr")}`} />
      </div>
      <h3>{personal.name}</h3>
      <small className={styles.fighterArtNotice}>{source} · couleurs par pièce</small>
      <p>Yautja de ta campagne · profil de duel de {base.name}</p>
      <small className={styles.techniqueName}>TECHNIQUE · {base.attacks.technique.label}</small>
      <dl>
        <div><dt>VIE</dt><dd>{base.maxHealth}</dd></div>
        <div><dt>PUISSANCE</dt><dd>{Math.round(base.power * 100)}</dd></div>
        <div><dt>MOBILITÉ</dt><dd>{Math.round(base.walkSpeed * 20)}</dd></div>
      </dl>
      <details className={styles.fighterProfile} data-pit-fighter-profile>
        <summary aria-label={`Consulter le profil de ${personal.name}`}>Profil du combattant</summary>
        <p>Nom et apparence viennent de ta sauvegarde de campagne : la tenue assignée au Pit si elle existe, sinon ton apparence de campagne. Le combat utilise les règles équilibrées de {base.name} ; ta campagne n’est pas modifiée.</p>
        <p>Duel CPU, versus local et entraînement. Arcade, Circuit et Descente restent réservés aux chroniques du roster. Les replays rejouent le duel avec {base.name}.</p>
        <p>En combat, le rig modulaire est teint pièce par pièce (peau, filet, dreads, biomasque, plastron, ceinture, épaulette, jambières). Les équipements sans planche teintable gardent leurs couleurs d’origine ; les poses dessinées de {base.name} servent tant que le rig n’est pas chargé.</p>
      </details>
    </article>
  );
}
