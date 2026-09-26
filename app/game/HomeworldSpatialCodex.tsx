"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS, HOMEWORLD_WORLD, type HomeworldVec2 } from "./systems/homeworldCity";
import { HOMEWORLD_CODEX_SOURCES, HOMEWORLD_SPATIAL_SITES, homeworldPlacementRecords, homeworldRouteGuidance, homeworldSpatialRoute, type HomeworldSpatialRoute } from "./systems/homeworldSpatialCodex";
import { createHomeworldGamepadState, nextHomeworldDialogChoice, stepHomeworldGamepad } from "./systems/homeworldInput";
import styles from "./HomeworldSpatialCodex.module.css";

export interface HomeworldSpatialCodexProps {
  actor: HomeworldVec2;
  visitedDistrictIds: readonly string[];
  youthWelcome: boolean;
  open: boolean;
  disabled?: boolean;
  onOpenChange(open: boolean): void;
}

export default function HomeworldSpatialCodex({ actor, visitedDistrictIds, youthWelcome, open, disabled = false, onOpenChange }: HomeworldSpatialCodexProps) {
  const [siteId, setSiteId] = useState("port");
  const [route, setRoute] = useState<HomeworldSpatialRoute | null>(null);
  const [guidedSite, setGuidedSite] = useState<string | null>(null);
  const [tab, setTab] = useState<"places" | "placement">("places");
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const actorRef = useRef(actor);
  const closeActionRef = useRef(onOpenChange);
  const [navigationActor, setNavigationActor] = useState(actor);
  useEffect(() => { actorRef.current = actor; }, [actor]);
  useEffect(() => { closeActionRef.current = onOpenChange; }, [onOpenChange]);
  useEffect(() => {
    if (!guidedSite || open) return;
    // Guidance refresh is bounded; it never drives the actor or the simulation clock.
    const timer = window.setInterval(() => setNavigationActor(actorRef.current), 350);
    return () => window.clearInterval(timer);
  }, [guidedSite, open]);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    let state = createHomeworldGamepadState();
    // Reuse the city adapter: held controls and reconnects require a neutral frame.
    const timer = window.setInterval(() => {
      const active = !document.hidden && document.hasFocus() && !!modalRef.current?.contains(document.activeElement);
      const pad = active ? [...(navigator.getGamepads?.() ?? [])].find(candidate => candidate?.connected) ?? null : null;
      const input = stepHomeworldGamepad(state, pad, active ? "dialog" : "inactive"); state = input.state;
      if (!active) return;
      if (input.actions.cancel || input.actions.pause) { closeActionRef.current(false); return; }
      const choices = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') ?? [])];
      if (input.actions.menuDirection && choices.length) {
        choices[nextHomeworldDialogChoice(choices.indexOf(document.activeElement as HTMLElement), choices.length, input.actions.menuDirection)]?.focus();
      }
      if (input.actions.confirm) choices.find(choice => choice === document.activeElement)?.click();
    }, 50);
    return () => window.clearInterval(timer);
  }, [open]);
  const site = HOMEWORLD_SPATIAL_SITES.find(entry => entry.id === siteId)!;
  const records = useMemo(() => homeworldPlacementRecords(siteId), [siteId]);
  const guidance = useMemo(() => route && guidedSite ? homeworldRouteGuidance(navigationActor, route) : null, [route, guidedSite, navigationActor]);
  const source = HOMEWORLD_CODEX_SOURCES.find(entry => entry.id === site.sourceId);
  const points = (list: readonly HomeworldVec2[]) => list.map(point => `${point.x},${point.y}`).join(" ");
  const selectSite = (id: string) => { setSiteId(id); setRoute(null); setGuidedSite(null); };
  const prepareRoute = () => {
    setRoute(homeworldSpatialRoute(actor, site.approach)); setNavigationActor(actor); setGuidedSite(site.id);
  };
  const handleModalKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.code === "Escape") { event.preventDefault(); onOpenChange(false); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select,[tabindex="0"]') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className={styles.root} data-homeworld-spatial-codex="v54">
    <button type="button" className={styles.toggle} disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => onOpenChange(true)}>Atlas de la cité <span>{visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length}</span></button>
    {!open && guidance && <div className={styles.guidance} role="status" data-homeworld-route-guidance={guidance.arrived ? "arrived" : "active"}>
      <strong>{HOMEWORLD_SPATIAL_SITES.find(entry => entry.id === guidedSite)?.name}</strong>
      <span>{guidance.direction}</span>
      <button type="button" aria-label="Effacer l’itinéraire" onClick={() => { setRoute(null); setGuidedSite(null); }}>×</button>
    </div>}
    {open && <div className={styles.scrim}>
      <div ref={modalRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-atlas-title" onKeyDown={handleModalKeys} onPointerDown={event => event.stopPropagation()}>
        <header><div><small>REGISTRE DE NAVIGATION · HOMEWORLD</small><h2 id="homeworld-atlas-title">Atlas de la cité</h2></div>
          <button ref={closeRef} type="button" onClick={() => onOpenChange(false)} aria-label="Fermer l’atlas">Fermer · Échap</button></header>
        <p className={styles.notice}>{youthWelcome ? "Parcours de jeunesse : la carte ne déverrouille ni vaisseau personnel, ni équipement adulte, ni expédition." : "Carte de la cité originale du projet. L’itinéraire guide tes pas ; il ne téléporte pas et ne débloque aucun service."}</p>
        <div className={styles.body}>
          <nav className={styles.list} aria-label="Quartiers de la cité">{HOMEWORLD_SPATIAL_SITES.map(entry => <button type="button" key={entry.id}
            data-selected={siteId === entry.id} aria-pressed={siteId === entry.id} onClick={() => selectSite(entry.id)}>
            <span>{visitedDistrictIds.includes(entry.id) ? "◆" : "◇"}</span>{entry.name}<small>{visitedDistrictIds.includes(entry.id) ? "Visité" : "À parcourir"}</small>
          </button>)}</nav>
          <section className={styles.detail} aria-label="Détail du quartier">
            <svg className={styles.map} viewBox={`0 0 ${HOMEWORLD_WORLD.width} ${HOMEWORLD_WORLD.height}`} role="img" aria-label={`Plan de la cité. Position du chasseur et approche de ${site.name}.`}>
              {HOMEWORLD_STREETS.map(street => <polygon key={street.id} points={points(street.polygon)} fill="#31423e" />)}
              {HOMEWORLD_DISTRICTS.map(district => <polygon key={district.id} points={points(district.polygon)} fill={district.id === siteId ? "#6b6143" : "#233035"} stroke={district.accent} strokeWidth="8" />)}
              {route?.status === "reachable" && <polyline data-homeworld-route="true" points={points(route.points)} fill="none" stroke="#e9e8ba" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />}
              <circle cx={actor.x} cy={actor.y} r="42" fill="#f8ffff" stroke="#0d1a20" strokeWidth="12" />
              <circle cx={site.approach.x} cy={site.approach.y} r="45" fill="#d7aa5b" stroke="#fff3bd" strokeWidth="12" />
            </svg>
            <div className={styles.tabs} role="group" aria-label="Informations de l’atlas">
              <button type="button" aria-pressed={tab === "places"} onClick={() => setTab("places")}>Lieu et accès</button>
              <button type="button" aria-pressed={tab === "placement"} onClick={() => setTab("placement")}>Plan d’implantation</button>
            </div>
            <h3>{site.name}</h3>
            {tab === "places" ? <>
              <span className={styles.badge}>ADAPTATION ORIGINALE · plan, noms et institutions</span>
              <p>{site.description}</p><p>{site.connectors}</p><p className={styles.muted}>{site.access}</p>
              {source && <aside className={styles.source}><strong>MOTIF ATTESTÉ · distinct du plan de la cité</strong><p>{source.fact}</p><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></aside>}
            </> : <>
              <p>Vue oblique au sol. Chaque objet conserve ses proportions et son pivot au bas de la silhouette ; sa profondeur suit sa coordonnée Y. Les bornes ne sont pas des portes.</p>
              <p>Empreinte du chasseur : {records.actorFootprint.halfWidth * 2} × {records.actorFootprint.halfDepth * 2} unités au sol. Les façades s’effacent à {Math.round(records.rules.buildingFadeOpacity * 100)} % lorsque le chasseur passe derrière.</p>
              <ul className={styles.records}>{records.buildings.map(building => <li key={building.id}><strong>{building.label}</strong><span>Pivot {building.anchor.x}, {building.anchor.y} · profondeur {building.depth}</span><span>Approche {Math.round(building.door.x)}, {building.door.y} · passage {Math.round(building.collision.doorRight - building.collision.doorLeft)} unités</span></li>)}
                {records.props.map(prop => <li key={prop.id}><strong>{prop.id}</strong><span>Plan {prop.plane} · pivot {prop.anchor.x}, {prop.anchor.y} · profondeur {prop.depth}</span><span>{prop.fadeRadius ? `Effacement proche : rayon ${prop.fadeRadius}` : "Échelle uniforme, image complète"}</span></li>)}</ul>
            </>}
            <div className={styles.actions}><button type="button" onClick={prepareRoute}>Tracer le chemin à pied</button>
              {route?.status === "reachable" && <button type="button" onClick={() => onOpenChange(false)}>Suivre le repère</button>}</div>
            {route && <p role="status" data-homeworld-route-status={route.status}>{route.status === "reachable" ? `Chemin praticable : ${Math.round(route.distance)} unités · arrivée devant ${HOMEWORLD_BUILDING_LABEL(site.buildingId, records)}.` : "Aucun passage sûr calculé depuis ce point. Rejoins le centre de la rue puis réessaie."}</p>}
          </section>
        </div>
      </div>
    </div>}
  </div>;
}

function HOMEWORLD_BUILDING_LABEL(id: string, records: ReturnType<typeof homeworldPlacementRecords>) {
  return records.buildings.find(building => building.id === id)?.label ?? "l’approche du quartier";
}
