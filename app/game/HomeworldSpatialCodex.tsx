"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS, HOMEWORLD_WORLD, type HomeworldVec2 } from "./systems/homeworldCity";
import { HOMEWORLD_CODEX_SOURCES, HOMEWORLD_SPATIAL_SITES, homeworldPlacementRecords, homeworldRouteGuidance, homeworldSpatialRoute, type HomeworldSpatialRoute } from "./systems/homeworldSpatialCodex";
import { createHomeworldGamepadState, nextHomeworldDialogChoice, stepHomeworldGamepad } from "./systems/homeworldInput";
import styles from "./HomeworldSpatialCodex.module.css";
import HomeworldElementCodex from "./HomeworldElementCodex";
import type { SaveGame } from "./types";
import { HOMEWORLD_ATLAS_ROUTES_V70, homeworldAtlasRouteAccessV70 } from "./systems/homeworldAtlasRoutesV70";

export interface HomeworldSpatialCodexProps {
  actor: HomeworldVec2;
  visitedDistrictIds: readonly string[];
  youthWelcome: boolean;
  open: boolean;
  disabled?: boolean;
  onOpenChange(open: boolean): void;
  save?: SaveGame;
}

export default function HomeworldSpatialCodex({ actor, visitedDistrictIds, youthWelcome, open, disabled = false, onOpenChange, save }: HomeworldSpatialCodexProps) {
  const [siteId, setSiteId] = useState("port");
  const [scope, setScope] = useState<'city' | 'regions'>('city');
  const [route, setRoute] = useState<HomeworldSpatialRoute | null>(null);
  const [guidedSite, setGuidedSite] = useState<string | null>(null);
  const [tab, setTab] = useState<"places" | "placement" | "elements">("places");
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
      const choices = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)') ?? [])];
      if (input.actions.menuDirection && choices.length) {
        choices[nextHomeworldDialogChoice(choices.indexOf(document.activeElement as HTMLElement), choices.length, input.actions.menuDirection)]?.focus();
      }
      if (input.actions.confirm) choices.find(choice => choice === document.activeElement)?.click();
    }, 50);
    return () => window.clearInterval(timer);
  }, [open]);
  const destinations = scope === 'regions' ? HOMEWORLD_ATLAS_ROUTES_V70 : HOMEWORLD_SPATIAL_SITES;
  const site = destinations.find(entry => entry.id === siteId) ?? destinations[0];
  const regionalSite = scope === 'regions' ? HOMEWORLD_ATLAS_ROUTES_V70.find(entry => entry.id === site.id) : null;
  const regionalAccess = regionalSite ? homeworldAtlasRouteAccessV70(save, regionalSite.regionId) : null;
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
    const focusable = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className={styles.root} data-homeworld-spatial-codex="v54">
    <button type="button" className={styles.toggle} disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => onOpenChange(true)}>Atlas de la cité <span>{visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length}</span></button>
    {!open && guidance && <div className={styles.guidance} role="status" data-homeworld-route-guidance={guidance.arrived ? "arrived" : "active"}>
      <strong>{[...HOMEWORLD_SPATIAL_SITES, ...HOMEWORLD_ATLAS_ROUTES_V70].find(entry => entry.id === guidedSite)?.name}</strong>
      <span>{guidance.direction}</span>
      <button type="button" aria-label="Effacer l’itinéraire" onClick={() => { setRoute(null); setGuidedSite(null); }}>×</button>
    </div>}
    {open && <div className={styles.scrim}>
      <div ref={modalRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-atlas-title" onKeyDown={handleModalKeys} onPointerDown={event => event.stopPropagation()}>
        <header><div><small>REGISTRE DE NAVIGATION · HOMEWORLD</small><h2 id="homeworld-atlas-title">Atlas de la cité</h2></div>
          <button ref={closeRef} type="button" onClick={() => onOpenChange(false)} aria-label="Fermer l’atlas">Fermer · Échap</button></header>
        <p className={styles.notice}>{youthWelcome ? "Parcours de jeunesse : la carte ne déverrouille ni vaisseau personnel, ni équipement adulte, ni expédition." : "Carte de la cité originale du projet. L’itinéraire guide tes pas ; il ne téléporte pas et ne débloque aucun service."}</p>
        <div className={styles.tabs} role="group" aria-label="Informations de l’atlas">
          <button type="button" aria-pressed={tab === "places" && scope === "city"} onClick={() => { setTab("places"); setScope("city"); selectSite("port"); }}>Quartiers</button>
          <button type="button" data-homeworld-atlas-regions aria-pressed={tab === "places" && scope === "regions"} onClick={() => { setTab("places"); setScope("regions"); selectSite(HOMEWORLD_ATLAS_ROUTES_V70[0].id); }}>Routes et villages · 10</button>
          <button type="button" aria-pressed={tab === "placement"} onClick={() => setTab("placement")}>Plan d’implantation</button>
          <button type="button" aria-pressed={tab === "elements"} onClick={() => setTab("elements")}>Codex des éléments</button>
        </div>
        <div className={`${styles.body} ${tab === "elements" ? styles.elementBody : ""}`}>
          {tab !== "elements" && <nav className={styles.list} aria-label={scope === 'regions' ? 'Routes vers les dix villages' : 'Quartiers de la cité'}>{destinations.map((entry, index) => <button type="button" key={entry.id}
            data-selected={site.id === entry.id} data-homeworld-atlas-site={entry.id} aria-pressed={site.id === entry.id} onClick={() => selectSite(entry.id)}>
            <span>{scope === 'regions' ? String(index + 1).padStart(2, '0') : visitedDistrictIds.includes(entry.id) ? "◆" : "◇"}</span>{entry.name}<small>{scope === 'regions' ? HOMEWORLD_ATLAS_ROUTES_V70[index].village : visitedDistrictIds.includes(entry.id) ? "Visité" : "À parcourir"}</small>
          </button>)}</nav>}
          <section className={styles.detail} aria-label={tab === "elements" ? "Inventaire de la cité" : "Détail du quartier"}>
            {tab !== "elements" && <svg className={styles.map} viewBox={`0 0 ${HOMEWORLD_WORLD.width} ${HOMEWORLD_WORLD.height}`} role="img" aria-label={`Plan de la cité. Position du chasseur et approche de ${site.name}.`}>
              {HOMEWORLD_STREETS.map(street => <polygon key={street.id} points={points(street.polygon)} fill="#31423e" />)}
              {HOMEWORLD_DISTRICTS.map(district => <polygon key={district.id} points={points(district.polygon)} fill={district.id === siteId ? "#6b6143" : "#233035"} stroke={district.accent} strokeWidth="8" />)}
              {scope === 'regions' && HOMEWORLD_ATLAS_ROUTES_V70.map((entry, index) => <g key={entry.id} data-homeworld-atlas-threshold={entry.regionId}>
                <circle cx={entry.approach.x} cy={entry.approach.y} r="65" fill={entry.accent} stroke="#16212a" strokeWidth="14" />
                <text x={entry.approach.x} y={entry.approach.y + 24} textAnchor="middle" fill="#071316" fontSize="82" fontWeight="bold">{index + 1}</text>
              </g>)}
              {route?.status === "reachable" && <polyline data-homeworld-route="true" points={points(route.points)} fill="none" stroke="#e9e8ba" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />}
              <circle cx={actor.x} cy={actor.y} r="42" fill="#f8ffff" stroke="#0d1a20" strokeWidth="12" />
              <circle cx={site.approach.x} cy={site.approach.y} r="45" fill="#d7aa5b" stroke="#fff3bd" strokeWidth="12" />
            </svg>}
            {tab !== "elements" && <h3>{site.name}</h3>}
            {tab === "places" ? <>
              <span className={styles.badge}>ADAPTATION ORIGINALE · plan, noms et institutions</span>
              {regionalSite && <div className={styles.regionVista} style={{ backgroundImage: `linear-gradient(0deg,#0a171e,transparent 80%),url('${regionalSite.panorama}')` }} role="img" aria-label={`Aperçu du paysage de ${regionalSite.name}`}><strong>{regionalSite.village}</strong><span>{regionalSite.clan} · {Math.round(regionalSite.corridorMetres)} m de passage après le seuil</span></div>}
              <p>{site.description}</p><p>{site.connectors}</p><p className={styles.muted}>{site.access}</p>
              {regionalAccess && <p className={styles.routeAccess} data-homeworld-atlas-access={regionalAccess.allowed ? 'open' : 'locked'}>{regionalAccess.allowed ? 'Route autorisée depuis cette partie. Rejoins le seuil puis parle au guide du village.' : regionalAccess.reason}</p>}
              {source && <aside className={styles.source}><strong>MOTIF ATTESTÉ · distinct du plan de la cité</strong><p>{source.fact}</p><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></aside>}
            </> : tab === "elements" ? <HomeworldElementCodex /> : <>
              <p>Projection orthographique à 35°. Chaque objet conserve ses proportions ; son pivot est mesuré sur son contact au sol ou son seuil peint. La profondeur suit sa coordonnée Y. Les bornes ne sont pas des portes.</p>
              <p>Empreinte du chasseur : {records.actorFootprint.halfWidth * 2} × {records.actorFootprint.halfDepth * 2} unités au sol. Les façades s’effacent à {Math.round(records.rules.buildingFadeOpacity * 100)} % lorsque le chasseur passe derrière.</p>
              {regionalSite && <p>Balise : {regionalSite.beacon.x}, {regionalSite.beacon.y}. Approche praticable : {regionalSite.approach.x}, {regionalSite.approach.y}. Le seuil précède {Math.round(regionalSite.corridorMetres)} m de chemin local ; la distance affichée ci-dessous concerne seulement la marche dans la cité.</p>}
              <ul className={styles.records}>{records.buildings.map(building => <li key={building.id}><strong>{building.label}</strong><span>Pivot {building.anchor.x}, {building.anchor.y} · profondeur {building.depth}</span><span>Approche {Math.round(building.door.x)}, {building.door.y} · passage {Math.round(building.collision.doorRight - building.collision.doorLeft)} unités</span></li>)}
                {records.props.map(prop => <li key={prop.id}><strong>{prop.id}</strong><span>Plan {prop.plane} · pivot {prop.anchor.x}, {prop.anchor.y} · profondeur {prop.depth}</span><span>{prop.fadeRadius ? `Effacement proche : rayon ${prop.fadeRadius}` : "Échelle uniforme, image complète"}</span></li>)}</ul>
            </>}
            {tab !== "elements" && <div className={styles.actions}><button type="button" onClick={prepareRoute}>Tracer le chemin à pied</button>
              {route?.status === "reachable" && <button type="button" onClick={() => onOpenChange(false)}>Suivre le repère</button>}</div>
            }
            {route && <p role="status" data-homeworld-route-status={route.status}>{route.status === "reachable" ? `Chemin praticable : ${Math.round(route.distance)} unités · arrivée ${regionalSite ? `au seuil de ${regionalSite.name}` : `devant ${HOMEWORLD_BUILDING_LABEL(site.buildingId!, records)}`}.` : "Aucun passage sûr calculé depuis ce point. Rejoins le centre de la rue puis réessaie."}</p>}
          </section>
        </div>
      </div>
    </div>}
  </div>;
}

function HOMEWORLD_BUILDING_LABEL(id: string, records: ReturnType<typeof homeworldPlacementRecords>) {
  return records.buildings.find(building => building.id === id)?.label ?? "l’approche du quartier";
}
