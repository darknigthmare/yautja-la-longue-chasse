"use client";
/**
 * V147 — Trophées : usages, dans le mur des trophées existant.
 * Bilan (respect, effets portés, échanges, pistes) et commandes par trophée.
 * Chaque changement passe par `onApply`, branché sur l'écriture durable de la
 * campagne : rien n'est annoncé tant que la sauvegarde n'est pas confirmée.
 */
import React, { useState } from "react";
import type { SaveGame, TrophyRecord } from "./types";
import {
  COMMUNITY_RESPECT_MAX_V147, MAX_WORN_TROPHIES_V147, REVELATION_LEADS_V147,
  TROPHY_DISPLAY_SITES_V147, TROPHY_DISPLAY_SITE_LABELS_V147, TROPHY_EXCHANGE_CLANS_V147,
  checkTrophyUsageV147, communityRespectV147, exchangeFavorsV147, openedRevelationLeadsV147,
  trophyUsageV147, wornTrophyEffectsV147,
  type TrophyExchangeClanIdV147, type TrophyUsageActionV147,
} from "./systems/trophyUsagesV147";
import styles from "./TrophyUsagesV147.module.css";

export type TrophyUsageApplyV147 = (action: TrophyUsageActionV147, confirmation: string) => boolean;

export function TrophyUsageSummaryV147({ save }: { save: SaveGame }) {
  const respect = communityRespectV147(save);
  const worn = wornTrophyEffectsV147(save);
  const favors = exchangeFavorsV147(save);
  const exchanges = save.trophyUsagesV147?.exchanges ?? [];
  const leads = openedRevelationLeadsV147(save);
  const studied = Object.keys(save.trophyUsagesV147?.studies ?? {}).length;
  return (
    <section className={styles.summary} aria-label="Usages des trophées">
      <div>
        <h3>Prestige</h3>
        <p>
          Respect de la communauté : <strong>{respect.value}</strong> / {COMMUNITY_RESPECT_MAX_V147}
          {" "}({respect.displayedCount} exposé{respect.displayedCount > 1 ? "s" : ""})
        </p>
        <meter min={0} max={COMMUNITY_RESPECT_MAX_V147} value={respect.value} aria-label="Respect de la communauté" />
        <p className={styles.note}>
          {TROPHY_DISPLAY_SITES_V147.map(site => `${TROPHY_DISPLAY_SITE_LABELS_V147[site]} ${respect.bySite[site]}`).join(" · ")}
        </p>
      </div>
      <div>
        <h3>Porté</h3>
        <p>{worn.wornTrophyIds.length} / {MAX_WORN_TROPHIES_V147} sur l’armure · pression sur le moral des proies : {worn.moralePressure}</p>
        {worn.reactions.length > 0
          ? <ul>{worn.reactions.map(reaction => <li key={reaction.id}>{reaction.label}</li>)}</ul>
          : <p className={styles.note}>Aucune réaction de proie déclenchée par les trophées portés.</p>}
      </div>
      <div>
        <h3>Échange</h3>
        <p>{exchanges.length} trophée{exchanges.length > 1 ? "s" : ""} cédé{exchanges.length > 1 ? "s" : ""} · {favors.length} faveur{favors.length > 1 ? "s" : ""} due{favors.length > 1 ? "s" : ""}</p>
        {exchanges.length > 0 && (
          <ul className={styles.ledger}>
            {exchanges.slice(-5).reverse().map(entry => (
              <li key={entry.trophy.id}>
                {entry.trophy.targetName} → {TROPHY_EXCHANGE_CLANS_V147.find(clan => clan.id === entry.clanId)?.name ?? entry.clanId}
                {" "}({entry.received.kind === "favor" ? "faveur" : `${entry.received.units} matériaux`})
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>Révélation</h3>
        <p>{studied} trophée{studied > 1 ? "s" : ""} étudié{studied > 1 ? "s" : ""} · {leads.length} piste{leads.length > 1 ? "s" : ""} ouverte{leads.length > 1 ? "s" : ""}</p>
        {leads.length > 0
          ? <ul>{leads.map(lead => <li key={lead.id}>{lead.id} · {lead.label}</li>)}</ul>
          : <p className={styles.note}>
            Registre : {REVELATION_LEADS_V147.length} pistes nommées par la bible, aucune encore reliée à un trophée.
          </p>}
      </div>
    </section>
  );
}

const USAGE_LABELS = { reserve: "En réserve", displayed: "Exposé", worn: "Porté", traded: "Échangé" } as const;

export function TrophyUsageControlsV147({ save, trophy, disabled, onApply }: {
  save: SaveGame;
  trophy: TrophyRecord;
  disabled: boolean;
  onApply: TrophyUsageApplyV147;
}) {
  const [clanId, setClanId] = useState<TrophyExchangeClanIdV147>(TROPHY_EXCHANGE_CLANS_V147[0].id);
  const [receive, setReceive] = useState<"favor" | "materials">("favor");
  const [confirming, setConfirming] = useState(false);
  const usage = trophyUsageV147(save, trophy.id) ?? "reserve";
  const assignment = save.trophyUsagesV147?.assignments[trophy.id];
  const study = save.trophyUsagesV147?.studies[trophy.id];
  const run = (action: TrophyUsageActionV147, confirmation: string) => {
    if (onApply(action, confirmation)) setConfirming(false);
  };
  const button = (action: TrophyUsageActionV147, label: string, confirmation: string) => {
    const check = checkTrophyUsageV147(save, action);
    return (
      <button type="button" disabled={disabled || !check.ok} title={check.ok ? undefined : check.reason}
        onClick={() => run(action, confirmation)}>{label}</button>
    );
  };
  const exchange: TrophyUsageActionV147 = { kind: "exchange", trophyId: trophy.id, clanId, receive };
  const exchangeCheck = checkTrophyUsageV147(save, exchange);
  const clanName = TROPHY_EXCHANGE_CLANS_V147.find(clan => clan.id === clanId)?.name ?? clanId;
  return (
    <div className={styles.controls} aria-label={`Usage de ${trophy.targetName}`}>
      <p className={styles.state}>
        Usage : <strong>{USAGE_LABELS[usage]}</strong>
        {assignment?.usage === "displayed" ? ` · ${TROPHY_DISPLAY_SITE_LABELS_V147[assignment.site]}` : ""}
        {study ? ` · étudié${study.leadIds.length ? ` (${study.leadIds.join(", ")})` : ", aucune piste"}` : ""}
      </p>
      <div className={styles.row}>
        {TROPHY_DISPLAY_SITES_V147.map(site => (
          <React.Fragment key={site}>
            {button({ kind: "display", trophyId: trophy.id, site },
              `Exposer · ${TROPHY_DISPLAY_SITE_LABELS_V147[site]}`,
              `Trophée exposé (${TROPHY_DISPLAY_SITE_LABELS_V147[site]}).`)}
          </React.Fragment>
        ))}
        {button({ kind: "wear", trophyId: trophy.id }, "Porter", "Trophée porté sur l’armure.")}
        {button({ kind: "store", trophyId: trophy.id }, "Ranger", "Trophée rangé en réserve.")}
        {button({ kind: "study", trophyId: trophy.id }, "Étudier", "Étude enregistrée à l’atelier.")}
      </div>
      <div className={styles.row}>
        <label>
          Clan
          <select value={clanId} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => { setClanId(event.target.value as TrophyExchangeClanIdV147); setConfirming(false); }}>
            {TROPHY_EXCHANGE_CLANS_V147.map(clan => <option key={clan.id} value={clan.id}>{clan.name}</option>)}
          </select>
        </label>
        <label>
          Contre
          <select value={receive} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => { setReceive(event.target.value as "favor" | "materials"); setConfirming(false); }}>
            <option value="favor">une faveur</option>
            <option value="materials">des matériaux</option>
          </select>
        </label>
        {confirming ? (
          <>
            <button type="button" className={styles.danger} disabled={disabled || !exchangeCheck.ok}
              onClick={() => run(exchange, `Trophée cédé à ${clanName}.`)}>
              Confirmer : l’original quitte la collection
            </button>
            <button type="button" onClick={() => setConfirming(false)}>Annuler</button>
          </>
        ) : (
          <button type="button" disabled={disabled || !exchangeCheck.ok}
            title={exchangeCheck.ok ? undefined : exchangeCheck.reason}
            onClick={() => setConfirming(true)}>Échanger…</button>
        )}
      </div>
    </div>
  );
}
