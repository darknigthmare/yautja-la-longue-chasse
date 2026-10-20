"use client";

import { useMemo, useState } from "react";
import { warCommandV98, warOrderPreviewV98, type WarOrderDraftV98 } from "./systems/clanWarCommandV98";
import type { WarOrderKindV85, WarSimulationV85 } from "./systems/clanWarV85";
import styles from "./ClanWarCommandV98.module.css";

const short = (id: string) => id.replace("CON-", "");
const resources = (stock: { s: number; m: number; i: number }) => `S${stock.s} · M${stock.m} · I${stock.i}`;
const filters = [
  ["priority", "Priorités"], ["all", "Tous les sites"], ["frontier", "Frontière"],
  ["isolated", "Isolés"], ["unguarded", "Sans garnison"], ["wounded", "Blessés à soigner"],
] as const;
type Filter = typeof filters[number][0];

export default function ClanWarCommandV98({ simulation, selectedTerritoryId, onPrepare, onManageGarrison }: {
  simulation: WarSimulationV85; selectedTerritoryId: string;
  onPrepare: (fromId: string, targetId?: string, kind?: WarOrderKindV85) => void;
  onManageGarrison?: (territoryId: string) => void;
}) {
  const command = useMemo(() => warCommandV98(simulation), [simulation]);
  const [filter, setFilter] = useState<Filter>("priority");
  const visible = command.sites.filter(site => filter === "all" || filter === "priority" && site.priority > 0 ||
    filter === "frontier" && site.frontierIds.length > 0 || filter === "isolated" && !site.supplied ||
    filter === "unguarded" && site.garrison === 0 || filter === "wounded" && site.wounded > 0);
  return <section className={styles.command} aria-labelledby="war-command-title-v98" data-testid="war-command-v98">
    <header><div><p className={styles.eyebrow}>SITUATION DU FRONT</p><h4 id="war-command-title-v98">Poste de commandement</h4></div><span>{command.sites.length} sites sous vos ordres</span></header>
    <div className={styles.summary}>
      <div><strong>Créneaux du tour</strong><p data-testid="war-command-slots-v98">{command.slots.map(slot => <span key={slot.kind}>{slot.kind === "operation" ? "Opérations" : slot.kind === "logistics" ? "Convoi" : "Diplomatie"} <b>{slot.used}/{slot.limit}</b></span>)}</p></div>
      <div data-warning={command.upkeepAvailable < command.upkeep}><strong>Entretien à effectif actuel</strong><p>S{command.upkeepAvailable} après dépenses réservées · dû S{command.upkeep}</p><small>Les lots des convois restent dans vos dépôts. Pertes et conquêtes peuvent modifier l’entretien.</small></div>
      <div><strong>Production à positions constantes</strong><p>{resources(command.income)}</p><small>{command.sites.filter(site => site.producing).length} sites intacts, garnis et reliés. La résolution peut modifier ces recettes.</small></div>
    </div>
    <details className={styles.objectives} data-testid="war-command-objectives-v98"><summary>Ce qu’il reste à sécuriser pour les objectifs</summary>
      <p>Domination : les sites doivent être contrôlés, intacts et reliés, avec une garnison apte par région. Région tenue : chacun de ses sites doit aussi être garni. Ces conditions se confirment en fin de tour avec l’entretien payé.</p>
      <div className={styles.regions}>{command.regions.map(region => <article key={region.name}>
        <strong>{region.name.replace(/^CON-REG\d+\s*/, "")}</strong>
        <p>Contrôle {region.controlled}/{region.total} · reliés {region.supplied}/{region.total} · intacts {region.intact}/{region.total}</p>
        <p>Garnisons {region.guarded}/{region.total} · {region.ready === region.total ? "région prête à tenir" : `${region.ready}/${region.total} sites prêts pour tenir la région`}</p>
        <small>{region.guarded > 0 ? "Couverture de garnison présente pour la domination." : "Une garnison apte manque pour la domination."}</small>
      </article>)}</div>
      <p><strong>Corridor des Haltes</strong> · {command.corridor.filter(site => site.ready).length}/{command.corridor.length} sites prêts</p>
      <div className={styles.corridor}>{command.corridor.map(site => <span key={site.id} data-ready={site.ready}>{short(site.id)} · {site.ready ? "prêt" : !site.controlled ? "à contrôler" : !site.intact ? "installation rompue" : !site.supplied ? "à relier" : "à garnir"}</span>)}</div>
      {!simulation.planetId || simulation.planetId === "korthas" ? <p>T02 : liaison {command.corridorBaseLinked ? "ouverte" : "manquante"} pour l’objectif du corridor.</p> : null}
      <p>{command.transits.length ? `Transits actifs : ${command.transits.map(transit => `${short(transit.id)} jusqu’au tour ${transit.expires}`).join(" · ")}.` : "Transit manquant : négociez un passage auprès d’une communauté indépendante pour valider le corridor."}</p>
    </details>
    <fieldset className={styles.filters}><legend>Afficher les sites contrôlés</legend>{filters.map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</fieldset>
    <p className={styles.resultCount} role="status">{visible.length} site{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}</p>
    <div className={styles.sites} data-testid="war-command-sites-v98">{visible.map(site => <article key={site.id} data-war-command-site={site.id} data-selected={selectedTerritoryId === site.id}>
      <div><strong>{short(site.id)} · {site.name}</strong><small>{site.region.replace(/^CON-REG\d+\s*/, "")}</small></div>
      <p className={styles.signals}><span data-warning={!site.supplied}>{site.supplied ? "Relié" : "Isolé"}</span><span data-warning={site.garrison === 0}>{site.garrison} garde{site.garrison > 1 ? "s" : ""}</span>{!site.intact && <span data-warning="true">Installation rompue</span>}{site.frontierIds.length > 0 && <span>Frontière des Forges</span>}{site.wounded > 0 && <span data-warning="true">{site.wounded} blessé{site.wounded > 1 ? "s" : ""}</span>}</p>
      <p>{site.available}/{site.ready} aptes libres · stock disponible {resources(site.availableStock)}</p>
      {site.reserved.s + site.reserved.m + site.reserved.i > 0 && <small>Déjà réservé localement : {resources(site.reserved)}</small>}
      <div className={styles.actions}><button type="button" onClick={() => onPrepare(site.id)}>Commander {short(site.id)}</button>{onManageGarrison && <button type="button" onClick={() => onManageGarrison(site.id)}>Organiser la garde de {short(site.id)}</button>}{site.frontierIds[0] && <button type="button" onClick={() => onPrepare(site.id, site.frontierIds[0], "recon")}>Reconnaître {short(site.frontierIds[0])}</button>}{site.wounded > 0 && <><button type="button" onClick={() => onPrepare(site.id, site.id, "heal")}>Préparer les soins</button><button type="button" onClick={() => onPrepare(site.id, site.neighbors.find(id => simulation.territories[id].controller === "CON-F01"), "evacuate")}>Préparer l’évacuation</button></>}</div>
    </article>)}</div>
    {visible.length === 0 && <p>Aucun site ne correspond à ce filtre. Le registre des autres sites reste accessible avec « Tous les sites ».</p>}
  </section>;
}

export function ClanWarOrderPreviewV98({ simulation, draft }: { simulation: WarSimulationV85; draft: WarOrderDraftV98 }) {
  const preview = warOrderPreviewV98(simulation, draft);
  return <div className={styles.preview} data-testid="war-order-preview-v98" data-ready={!preview.issue} aria-live="polite">
    <h5>Vérification de l’ordre</h5>
    <p>{preview.issue ? `À préparer : ${preview.issue}` : "Ordre admissible à la réservation. La résolution aura lieu en fin de tour."}</p>
    {preview.available && <p>Disponible au départ {resources(preview.available)} · coût {resources(preview.cost)}.</p>}
    {draft.kind === "attack" && <p>Renseignement : {preview.intel.label}. L’issue du combat reste à résoudre.</p>}
    {preview.warnings.length > 0 && <ul>{preview.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
  </div>;
}
