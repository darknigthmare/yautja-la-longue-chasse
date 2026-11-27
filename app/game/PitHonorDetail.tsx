import { useEffect, useId, useRef } from "react";
import type { PitRewardSlotV1 } from "./systems/pitContentAccessV1";
import { buildPitHonorGalleryDetailV1, type PitHonorRouteRequestV1 } from "./systems/pitHonorGalleryV1";
import styles from "./PitHonorsPanel.module.css";

interface Props {
  readonly slot: PitRewardSlotV1;
  readonly onClose: () => void;
  readonly onOpenPit: (request?: PitHonorRouteRequestV1) => void;
}

/** A consultation of existing records, never a reward claim or a world location. */
export default function PitHonorDetail({ slot, onClose, onOpenPit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const statusId = useId();
  const detail = buildPitHonorGalleryDetailV1(slot);
  const { access, honor } = slot;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    headingRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const openRoute = (request: PitHonorRouteRequestV1) => {
    onClose();
    onOpenPit(request);
  };
  return <dialog ref={dialogRef} className={styles.detail} aria-modal="true" aria-labelledby={titleId} aria-describedby={statusId}
    data-pit-honor-detail={honor.id}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), summary, a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !controls.includes(active as HTMLElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault(); first.focus();
      }
    }} onKeyUp={event => event.stopPropagation()}>
    <header className={styles.detailHeader}>
      <div><p className={styles.eyebrow}>REGISTRE DES DISTINCTIONS</p><h2 id={titleId} ref={headingRef} tabIndex={-1}>{access.label}</h2></div>
      <button type="button" onClick={onClose} aria-label="Fermer la fiche de distinction">Fermer</button>
    </header>
    <p id={statusId} className={styles.detailStatus} data-pit-honor-detail-status>{access.statusLabel}</p>
    {detail ? <>
      <p>{honor.description}</p>
      <dl className={styles.detailFacts}>
        <div><dt>Parcours</dt><dd>{detail.sourceLabel}</dd></div>
        <div><dt>Attribution</dt><dd>{honor.earned ? "Acquise pour cette campagne" : "Automatique après réussite de l’objectif"}</dd></div>
        <div><dt>Origine</dt><dd>{detail.loreLabel}</dd></div>
      </dl>
      {honor.palette ? <div className={styles.detailPalette}>
        <p>{access.canPreview ? "Couleurs de la distinction" : "Couleurs scellées jusqu’à l’obtention de la distinction"}</p>
        <div className={[styles.palette, !access.canPreview ? styles.paletteSilhouette : ""].join(" ")} aria-hidden="true">
          {Object.entries(honor.palette).map(([name, color]) => <span key={name} style={access.canPreview ? { backgroundColor: color } : undefined} />)}
        </div>
      </div> : null}
      <section className={styles.detailSection} aria-label="Conditions de la distinction">
        <h3>Voie d’obtention</h3><p>{access.conditionLabel}</p>
        <ol>{detail.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <p className={styles.detailNote}>{detail.progressNote}</p>
      </section>
      <section className={styles.detailSection} aria-label="Progression enregistrée">
        <h3>Votre progression</h3>
        <p>{honor.progress.label}</p>
        <progress value={honor.progress.current} max={honor.progress.total} aria-label={`${access.label} · ${honor.progress.label}`} />
        {detail.paths.length > 1 ? <details className={styles.pathDetails}>
          <summary>Voir les {detail.paths.length} parcours de chasseurs · une seule voie suffit</summary>
          <ul className={styles.pathList}>{detail.paths.map(path => <li key={path.fighterId} data-pit-honor-path={path.fighterId}>
            <div><strong>{path.fighterName}</strong><span>{path.progressLabel} · {path.complete ? "Objectif accompli" : "À poursuivre"}</span></div>
            <button type="button" onClick={() => openRoute(path.route)} aria-label={`${detail.routeLabel} avec ${path.fighterName}`}>Choisir ce chasseur</button>
          </li>)}</ul>
        </details> : null}
      </section>
      {access.installation !== "ready" || access.compatibility !== "compatible" ? <div className={styles.notice}>
        <p>{access.reasons.join(" · ")}</p>
        <p>Votre distinction et la possibilité de l’afficher sont suivies séparément.</p>
      </div> : null}
      <p className={styles.detailNote}>Les distinctions restent propres à THE PIT. Elles ne changent ni l’honneur ni l’équipement de la campagne. Consulter ce registre n’accorde aucune récompense.</p>
      <footer className={styles.detailFooter}>
        <p>Chasseur proposé : <strong>{detail.paths.find(path => path.fighterId === detail.route.fighterId)?.fighterName}</strong>. Le parcours se prépare avant votre confirmation.</p>
        <div><button type="button" onClick={onClose}>Retour aux distinctions</button><button type="button" className={styles.routeButton} data-pit-honor-open-route onClick={() => openRoute(detail.route)}>{detail.routeLabel}</button></div>
      </footer>
    </> : <>
      <p>{access.conditionLabel}</p>
      <p>Les archives dévoileront cette distinction au fil des épreuves.</p>
      <button type="button" onClick={onClose}>Retour aux distinctions</button>
    </>}
  </dialog>;
}
