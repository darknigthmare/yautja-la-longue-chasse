"use client";
/** B136 · Face, profile and back of the worn concept mask in the armory.
 * The published V133 sprite is the face view (owner decision, 2026-11-23); profile and back
 * come from maskViewsV136.json once delivered and checked, otherwise the tile says it is pending.
 * Every view shares the 256×384 mask canvas; tiles show its 128×128 head window (x 64–192, y 0–128). */
import views from "./data/maskViewsV136.json";
import { conceptBiomaskV133 } from "./conceptBiomasksV133";
import styles from "./MaskTurnaroundV136.module.css";

type MaskViewsV136 = { profile?: string; back?: string };
const registry = views.records as Record<string, MaskViewsV136>;

/** View paths for a concept mask, or null when the mask is not a V133 concept. */
export function maskTurnaroundV136(maskId: unknown): { name: string; face: string; profile: string | null; back: string | null } | null {
  const concept = conceptBiomaskV133(maskId);
  if (!concept) return null;
  const entry = registry[concept.id] ?? {};
  return { name: concept.name.replace(/^Biomask concept · /, ""), face: concept.assetPath, profile: entry.profile ?? null, back: entry.back ?? null };
}

export default function MaskTurnaroundV136({ maskId }: { maskId: unknown }) {
  const turnaround = maskTurnaroundV136(maskId);
  if (!turnaround) return null;
  const tiles = [
    { key: "face", label: "Face", src: turnaround.face },
    { key: "profile", label: "Profil", src: turnaround.profile },
    { key: "back", label: "Dos", src: turnaround.back },
  ];
  return <section className={styles.turnaround} aria-labelledby="mask-turnaround-v136" data-mask-turnaround-v136={turnaround.name}>
    <h3 id="mask-turnaround-v136">Masque porté · {turnaround.name} · trois vues</h3>
    <div className={styles.tiles} role="list">
      {tiles.map(tile => <figure key={tile.key} role="listitem" className={styles.tile} data-view={tile.key} data-pending={tile.src ? undefined : "true"}>
        {tile.src
          // eslint-disable-next-line @next/next/no-img-element -- fixed-size pixel sprite, no responsive variants
          ? <div className={styles.window}><img src={tile.src} alt={"Masque " + turnaround.name + ", vue " + tile.label.toLowerCase()} width={256} height={384} /></div>
          : <div className={styles.pending}>Vue {tile.label.toLowerCase()} à livrer<br /><small>Fiche B136</small></div>}
        <figcaption>{tile.label}</figcaption>
      </figure>)}
    </div>
  </section>;
}
