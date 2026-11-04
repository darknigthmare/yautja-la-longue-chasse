"use client";

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import GameVersionBadge from "../game/GameVersionBadge";
import { DEV_DESTINATIONS, resolveDevDestination, type DevDestination } from "./destinations";
import styles from "./dev-travel.module.css";

const DevTravelSession = lazy(() => import("./session"));

const CATEGORIES = [
  { id: "all", label: "Tous les lieux" },
  { id: "hubs", label: "Vaisseau personnel" },
  { id: "clan", label: "Clan Ship" },
  { id: "wolf", label: "Château Wolf" },
  { id: "homeworld", label: "Homeworld" },
  { id: "arrivals", label: "Arrivées planétaires" },
  { id: "missions", label: "Chasses" },
] as const;
type Category = (typeof CATEGORIES)[number]["id"];

function searchable(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function destinationUrl(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("lieu", id);
  else url.searchParams.delete("lieu");
  url.hash = "";
  return url;
}

class SceneBoundary extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <section className={styles.loading} role="alert">
      <h2>Ce lieu n’a pas pu s’ouvrir.</h2>
      <p>Reviens au choix des lieux pour relancer l’essai. Ta campagne est conservée.</p>
      <button type="button" onClick={this.props.onExit}>Choisir un lieu</button>
    </section> : this.props.children;
  }
}

export default function DevTravelClient({ initialDestinationId = null }: { initialDestinationId?: string | null }) {
  const [destination, setDestination] = useState<DevDestination | null>(() => resolveDevDestination(initialDestinationId) ?? null);
  const [epoch, setEpoch] = useState(0);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(() => initialDestinationId && !resolveDevDestination(initialDestinationId)
    ? "Ce point d’arrivée est inconnu. Choisis un lieu dans la liste." : "");
  const [manualLink, setManualLink] = useState("");
  const catalogueHeading = useRef<HTMLHeadingElement>(null);
  const lastLaunch = useRef<string | null>(null);

  const launch = (id: string) => {
    const next = resolveDevDestination(id);
    if (!next) return;
    lastLaunch.current = id;
    setDestination(next);
    setEpoch(value => value + 1);
    setNotice("");
    setManualLink("");
    window.history.replaceState(null, "", destinationUrl(id));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const back = useCallback(() => {
    setDestination(null);
    setNotice("");
    setManualLink("");
    window.history.replaceState(null, "", destinationUrl(null));
    requestAnimationFrame(() => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-dev-launch]"))
        .find(element => element.dataset.devLaunch === lastLaunch.current);
      (button ?? catalogueHeading.current)?.focus({ preventScroll: false });
    });
  }, []);

  useEffect(() => {
    if (!destination) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F8" || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      back();
    };
    // Native scenes may trap focus inside their own pause/preparation modal.
    // Capture provides a reliable exit owned solely by this development route.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [back, destination]);

  const copyLink = async () => {
    if (!destination) return;
    const link = destinationUrl(destination.id).toString();
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Lien copié. Il rouvre ce lieu avec une nouvelle session de test.");
      setManualLink("");
    } catch {
      setManualLink(link);
      setNotice("Sélectionne ce lien pour le copier ou l’ajouter à tes favoris.");
    }
  };

  const search = searchable(query.trim());
  const visible = DEV_DESTINATIONS.filter(item => (category === "all" || item.category === category)
    && (!search || searchable(`${item.label} ${item.description} ${item.id}`).includes(search)));

  return <main className={styles.root} data-dev-travel>
    <header className={styles.header}>
      <Link className={styles.brand} href="/" prefetch={false} data-dev-quit>
        <span className={styles.brandMark} aria-hidden="true">Ⅲ</span>
        <span><strong>LA LONGUE CHASSE</strong><small>Retour au jeu</small></span>
      </Link>
      <div className={styles.headerMeta}>
        <span className={styles.devBadge}><i aria-hidden="true" />Mode développement</span>
        <GameVersionBadge compact />
      </div>
    </header>

    {destination ? <>
      <section className={styles.toolbar} aria-label="Navigation des lieux de test">
        <div className={styles.activeLocation}>
          <button className={styles.backButton} type="button" onClick={back} data-dev-back aria-keyshortcuts="F8" title="Choisir un lieu · F8">← Lieux</button>
          <label>Point d’arrivée
            <select value={destination.id} onChange={event => launch(event.target.value)} data-dev-destination>
              {CATEGORIES.filter(item => item.id !== "all").map(group => <optgroup key={group.id} label={group.label}>
                {DEV_DESTINATIONS.filter(item => item.category === group.id).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </optgroup>)}
            </select>
          </label>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" data-dev-reset onClick={() => { setEpoch(value => value + 1); setNotice("Nouvel essai démarré au point d’arrivée."); }}>Recommencer</button>
          <button type="button" data-dev-copy-link onClick={copyLink}>Copier le lien</button>
          <span className={styles.sessionLabel}>Session temporaire · campagne conservée · F8 : retour aux lieux</span>
        </div>
      </section>
      {notice && <p className={styles.notice} role="status" data-dev-notice>{notice}</p>}
      {manualLink && <label className={styles.manualLink}>Lien direct<input readOnly value={manualLink} onFocus={event => event.currentTarget.select()} /></label>}
      <div className={styles.scene}>
        <SceneBoundary key={`${destination.id}:${epoch}`} onExit={back}>
          <Suspense fallback={<section className={styles.loading} role="status"><span className={styles.loadingMark} aria-hidden="true">Ⅲ</span><h2>Ouverture du lieu…</h2><p>{destination.label}</p></section>}>
            <DevTravelSession destination={destination} onTravel={launch} onExit={back} />
          </Suspense>
        </SceneBoundary>
      </div>
    </> : <div className={styles.catalogue} data-dev-catalogue>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>ACCÈS DIRECT / LIEUX JOUABLES</p>
          <h1 ref={catalogueHeading} tabIndex={-1}>Choisis ton point d’arrivée.</h1>
          <p className={styles.intro}>Explore les vaisseaux, le château Wolf et le Homeworld, ou teste une arrivée planétaire avant la chasse. Chaque essai s’ouvre directement, sans avancer la campagne.</p>
        </div>
        <aside className={styles.sessionCard}>
          <span className={styles.sessionIcon} aria-hidden="true">↺</span>
          <strong>Un terrain d’essai à toi.</strong>
          <p>Ta campagne est conservée. Les essais restent temporaires : changer de lieu ou recommencer repart du point d’arrivée.</p>
        </aside>
      </section>
      {notice && <p className={styles.notice} role="status" data-dev-notice>{notice}</p>}
      <section className={styles.filters} aria-label="Trouver un lieu">
        <div className={styles.categories}>
          {CATEGORIES.map(item => <button key={item.id} type="button" data-dev-category={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>
        <label className={styles.search}><span>Rechercher un lieu</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Vaisseau, château, arrivée, marché…" data-dev-search /></label>
      </section>
      <div className={styles.listHeading}><h2>Destinations</h2><span role="status">{visible.length} lieu{visible.length > 1 ? "x" : ""}</span></div>
      <div className={styles.grid}>
        {visible.map((item, index) => <article key={item.id} className={styles.card} data-dev-card={item.id}>
          <div className={styles.cardTop}><span>{CATEGORIES.find(group => group.id === item.category)?.label}</span><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
          <h3>{item.label}</h3>
          <p>{item.description}</p>
          <button type="button" data-dev-launch={item.id} aria-label={`Entrer : ${item.label}`} onClick={() => launch(item.id)}>Entrer ici <span aria-hidden="true">↗</span></button>
        </article>)}
      </div>
      {!visible.length && <section className={styles.empty}><h3>Aucun lieu ne correspond.</h3><p>Essaie un autre nom ou affiche toutes les destinations.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Afficher tous les lieux</button></section>}
      <footer className={styles.footer}><span>Page de test accessible par l’adresse <code>/dev</code>.</span><span>Clavier, souris et commandes tactiles des scènes d’origine.</span></footer>
    </div>}
  </main>;
}
