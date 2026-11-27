"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./GreybackSelectionReview.module.css";

const ASSET_ROOT = "/game/review/the-pit/greyback-unmasked-20261127";
const POSES = [
  { file: "preview-calm-01-right.png", label: "Aperçu · repos", family: "Sélection", note: "Main libre ouverte, épée tenue basse. L’écartement des pieds diffère de la référence." },
  { file: "preview-acknowledge-02-right.png", label: "Aperçu · attention", family: "Sélection", note: "Inclinaison légère de la tête et abaissement de la main. Geste proposé pour le jeu." },
  { file: "deselection-rest-01-right.png", label: "Sortie · relâchement", family: "Désélection", note: "Dessin de sortie distinct, à comparer au précédent avant assemblage." },
  { file: "deselection-rest-02-right.png", label: "Sortie · repos", family: "Désélection", note: "Deuxième dessin de sortie. Les intervalles et la continuité de l’équipement restent à revoir." },
] as const;

/** Review-only surface: these candidates never enter the validated combat atlas. */
export default function GreybackSelectionReview() {
  const [index, setIndex] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [light, setLight] = useState(false);
  const [equipmentRevision, setEquipmentRevision] = useState(true);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(() => new Set());
  const pose = POSES[index];
  const candidateFile = index === 0 && equipmentRevision ? "preview-calm-01-right-equipment-v2.png" : pose.file;
  const failImage = (file: string) => setFailedImages(previous => new Set([...previous, file]));

  return (
    <main className={styles.root} data-pit-selection-review data-review-variant="elder-greyback-sans-casque-7955bb66ac" data-review-status="candidate-unadmitted" data-frame={index} data-equipment-revision={index === 0 && equipmentRevision ? "v2" : "original"}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>THE PIT · ATELIER DES PORTRAITS</p>
          <h1>Greyback / Elder</h1>
          <p className={styles.subtitle}>Sans casque · orientation droite · quatre poses et une révision</p>
        </div>
        <Link href="/pit-lab" className={styles.back}>Retour à l’atelier</Link>
      </header>

      <section className={styles.notice} aria-label="État de la revue">
        <strong>Candidats à revoir · fidélité 1:1 non certifiée</strong>
        <p>Ces cinq sorties individuelles proposent quatre poses de sélection et de désélection, dont une corrigée. Elles restent hors des animations validées du jeu. Les gestes sont une adaptation pour The PIT ; ce lot ne constitue pas encore un cycle fluide.</p>
        <p>La référence est conservée telle quelle. Comparez notamment le visage, les ornements, les pieds et le déploiement des lames de poignet. L’orientation gauche et les dessins intermédiaires restent à produire.</p>
      </section>

      <fieldset className={styles.poses}>
        <legend>Choisir un dessin</legend>
        {POSES.map((item, itemIndex) => (
          <button type="button" key={item.file} aria-pressed={index === itemIndex} onClick={() => setIndex(itemIndex)}>
            <span>{item.family} · {itemIndex + 1}/4</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </fieldset>

      <div className={styles.options}>
        {index === 0 && <label><input type="checkbox" checked={equipmentRevision} onChange={event => setEquipmentRevision(event.target.checked)} />Voir la correction des lames et de l’arme au côté</label>}
        <label><input type="checkbox" checked={overlay} onChange={event => setOverlay(event.target.checked)} />Superposer la référence au candidat</label>
        <label><input type="checkbox" checked={light} onChange={event => setLight(event.target.checked)} />Fond clair pour inspecter la transparence</label>
      </div>

      <div className={styles.comparison} data-review-background={light ? "light" : "dark"}>
        <figure>
          <figcaption><strong>Référence d’origine</strong><span>Apparence exacte utilisée comme point de départ</span></figcaption>
          <div className={styles.imageFrame}>
            {failedImages.has("reference-original.png") ? <p role="alert">Référence indisponible. La comparaison ne peut pas être validée.</p> : <Image src={`${ASSET_ROOT}/reference-original.png`} alt="Référence Greyback sans casque, armure sombre, épée abaissée, arme ancienne au côté et lames de poignet sorties." width={1024} height={1536} unoptimized onError={() => failImage("reference-original.png")} />}
          </div>
        </figure>
        <figure>
          <figcaption aria-live="polite"><strong>{pose.label}{index === 0 && equipmentRevision ? " · équipement révisé" : " · première sortie"}</strong><span>{pose.note} {index === 0 && equipmentRevision ? "Lames et arme au côté rétablies ; les détails restent à comparer." : "Correction de l’équipement encore à vérifier."}</span></figcaption>
          <div className={styles.imageFrame}>
            {failedImages.has(candidateFile) ? <p role="alert">Dessin indisponible. Choisissez une autre pose ou rechargez la page.</p> : <Image key={candidateFile} src={`${ASSET_ROOT}/${candidateFile}`} alt={`Candidat Greyback sans casque, vers la droite : ${pose.label.toLowerCase()}${index === 0 && equipmentRevision ? ", équipement révisé" : ", première sortie"}.`} width={1024} height={1536} unoptimized onError={() => failImage(candidateFile)} data-review-candidate />}
            {overlay && !failedImages.has(candidateFile) && !failedImages.has("reference-original.png") && <Image className={styles.overlay} src={`${ASSET_ROOT}/reference-original.png`} alt="" aria-hidden="true" width={1024} height={1536} unoptimized onError={() => failImage("reference-original.png")} />}
          </div>
        </figure>
      </div>

      <section className={styles.notes} aria-labelledby="review-observations">
        <h2 id="review-observations">Points à contrôler avant admission</h2>
        <dl>
          <div><dt>Identité</dt><dd>Cette revue concerne uniquement la variante sans casque référencée ici. Elle ne valide aucune autre apparence d’Elder.</dd></div>
          <div><dt>Équipement</dt><dd>Une révision de la pose de repos rétablit les longues lames de poignet et corrige l’arme au côté. Les trois autres poses conservent l’écart initial. Épée, gantelets et ornements restent à comparer pièce par pièce.</dd></div>
          <div><dt>Silhouette et raccord</dt><dd>Les pieds sont moins écartés que sur la référence. Des détails du visage et des ornements sont réinterprétés ; l’ancrage et la continuité entre dessins demandent une revue.</dd></div>
          <div><dt>Lecture des images</dt><dd>Les PNG sont affichés à proportions identiques, sans miroir ni déformation. La superposition conserve les coordonnées de l’image d’origine ; elle ne corrige pas l’ancrage.</dd></div>
        </dl>
        <a className={styles.back} href={`${ASSET_ROOT}/manifest.json`} download>Consulter le manifeste et les empreintes des PNG</a>
      </section>
    </main>
  );
}
