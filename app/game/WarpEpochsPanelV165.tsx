"use client";

import React, { Suspense, useMemo, useState } from "react";
import type { MissionResult, SaveGame } from "./types";
import type { ChronicleAccessContext } from "./systems/clanChronicle";
import { MISSIONS } from "./data";
import {
  WARP_BRANCHES_V165, WARP_COMPONENTS_V165, WARP_PROTOTYPE_ARC_V165, WARP_W02_CONTRACTS_V165, WARP_W02_STEPS_V165,
  W02_HUNT_BASE_MISSION_ID_V165, applyW02HuntResultV165, branchVisitV165, canLaunchW02HuntV165, canReturnFromWarpV165,
  createWarpEpochsV165, departWarpV165, evaluateWarpDepartureV165, installWarpModuleV165, normalizeWarpEpochsV165,
  resolveW02StepV165, returnFromWarpV165, selectWarpBranchV165, startWarpCommonQuestV165, verifyWarpComponentV165,
  warpAccessContextFromSaveV165, warpConditionsV165, warpW02HuntMissionV165,
  type WarpEpochsStateV165, type WarpUpdateV165,
} from "./systems/warpEpochsV165";
import { normalizeTantalusLedgerV164 } from "./systems/tantalusV164";
import styles from "./WarpEpochsPanelV165.module.css";

const HuntCanvas = React.lazy(() => import("./HuntCanvas"));

export interface WarpEpochsPanelV165Props {
  save: SaveGame;
  /** Disponibilité réelle du vaisseau, lue par le client (jamais devinée ici). */
  shipContext?: ChronicleAccessContext;
  /** Écrit l'état dans la sauvegarde ; false si l'écriture est refusée. */
  onPersist(state: WarpEpochsStateV165): boolean;
  onClose(): void;
}

export default function WarpEpochsPanelV165({ save, shipContext = { personalShipAvailable: false }, onPersist, onClose }: WarpEpochsPanelV165Props) {
  const state = useMemo(() => normalizeWarpEpochsV165(save.warpEpochsV165, save.createdAt) ?? createWarpEpochsV165(save.createdAt), [save]);
  const ctx = useMemo(() => ({
    ...warpAccessContextFromSaveV165(save, shipContext),
    otherWarpTripActive: Boolean(normalizeTantalusLedgerV164(save.tantalusV164, save.createdAt)?.activeTrip),
  }), [save, shipContext]);
  const [message, setMessage] = useState("");
  const [hunting, setHunting] = useState(false);
  const base = MISSIONS.find(mission => mission.id === W02_HUNT_BASE_MISSION_ID_V165);
  const huntMission = useMemo(() => base ? warpW02HuntMissionV165(base) : null, [base]);

  const apply = (update: WarpUpdateV165) => {
    if (!update.accepted) { setMessage(update.message); return false; }
    if (update.changed && !onPersist(update.state)) { setMessage("Sauvegarde refusée : aucun changement appliqué."); return false; }
    setMessage(update.message); return true;
  };
  const finishHunt = (result: MissionResult, aborted: boolean) => {
    setHunting(false);
    apply(applyW02HuntResultV165(state, result, aborted));
  };

  if (hunting && huntMission) {
    return <div className={styles.hunt} data-warp-hunt-v165="W-02">
      <Suspense fallback={<p className={styles.notice} role="status">Ouverture du seuil…</p>}>
        <HuntCanvas mission={huntMission} encounterRun={branchVisitV165(state, "W-02").huntRuns}
          loadout={save.loadout} inventory={save.inventory} explorationProgress={save.exploration}
          appearance={save.appearance} difficulty={save.settings.difficultyId} controlBindings={save.settings.controlBindings}
          huntAccessibility={save.settings.huntAccessibility} reducedGore={save.settings.reducedGore}
          screenShake={save.settings.screenShake} highContrastVision={save.settings.highContrastVision}
          onFinish={result => finishHunt(result, false)} onAbort={result => finishHunt(result, true)} />
      </Suspense>
    </div>;
  }

  const conditions = warpConditionsV165(state, ctx);
  const departure = evaluateWarpDepartureV165(state, ctx);
  const w02 = branchVisitV165(state, "W-02");
  const inW02 = state.activeTripBranchId === "W-02";
  const huntLaunch = canLaunchW02HuntV165(state);
  const conditionRows = [
    ["blooded", "Rang Blooded"], ["ship", "Vaisseau personnel possédé"], ["adjutant", "Fonction Adjutant"],
    ["quest", "Quête commune réussie"], ["module", "Module installé"],
  ] as const;

  return <section className={styles.panel} aria-labelledby="warp-v165-title" data-warp-epochs-v165
    data-warp-quest={state.warpQuestOutcome} data-warp-module={String(state.warpModuleInstalled)}
    data-warp-branch={state.warpBranchId ?? "none"} data-warp-trip={state.activeWarpTripId ?? "none"}
    data-warp-return={state.warpReturnReservation}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>WARP · ÉPOQUES · V165</p><h2 id="warp-v165-title">Le Warp</h2></div>
      <button type="button" onClick={onClose} disabled={!!state.activeWarpTripId} title={state.activeWarpTripId ? "Reviens d'abord par le retour réservé" : undefined}>Retour</button>
    </header>
    <p className={styles.notice}>Chapitre facultatif : aucune mission Warp ne valide un rang (WARP-R02, WARP-R24). Seule la branche W-02 (Japon féodal, 1629) est jouable ; les autres sont décrites et marquées non implémentées.</p>
    <p className={styles.message} role="status" aria-live="polite">{message}</p>

    <div className={styles.section}>
      <h3>Conditions de départ (WARP-R01)</h3>
      <ul className={styles.list}>
        {conditionRows.map(([id, label]) => {
          const miss = conditions.find(entry => entry.id === id);
          return <li key={id} className={miss ? styles.missing : styles.ok} data-warp-condition={id} data-met={String(!miss)}>
            {miss ? "✗" : "✓"} {label}{miss ? ` — ${miss.where}` : ""}
          </li>;
        })}
      </ul>
    </div>

    <div className={styles.section} data-warp-common-quest>
      <h3>Quête commune (R2-M030 → R2-M032)</h3>
      {state.warpQuestOutcome === "non_commence" && <>
        <p>Le seuil du Warp : suivre les anomalies jusqu’à l’Observatoire des Seuils. Choix : stabilité ou énergie d’abord.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => apply(startWarpCommonQuestV165(state, ctx, "stabilite"))}>Stabilité d’abord</button>
          <button type="button" onClick={() => apply(startWarpCommonQuestV165(state, ctx, "energie"))}>Énergie d’abord</button>
        </div>
      </>}
      {state.warpQuestOutcome === "en_cours" && <>
        <p>Les pièces d’un retour : chaque pièce est testée avant transport.</p>
        <ul className={styles.list}>{WARP_COMPONENTS_V165.map(component => <li key={component.id} data-warp-component={component.id}>
          {component.label} : {state.components[component.id] ? `testée (${state.components[component.id] === "reparer" ? "réparée" : "variante"})` : <>
            <button type="button" onClick={() => apply(verifyWarpComponentV165(state, component.id, "reparer"))}>Réparer</button>{" "}
            <button type="button" onClick={() => apply(verifyWarpComponentV165(state, component.id, "variante"))}>Acquérir une variante</button></>}
        </li>)}</ul>
        <div className={styles.actions}>
          <button type="button" onClick={() => apply(installWarpModuleV165(state, "marge"))}>Installer : marge de stabilité</button>
          <button type="button" onClick={() => apply(installWarpModuleV165(state, "fenetre-courte"))}>Installer : fenêtre courte</button>
        </div>
      </>}
      {state.warpQuestOutcome === "reussi" && <p className={styles.ok}>Quête réussie ; module installé et calibré.</p>}
    </div>

    <div className={styles.section}>
      <h3>Branches (L-10)</h3>
      <div className={styles.cards}>{WARP_BRANCHES_V165.map(branch => <article key={branch.id} data-warp-branch-card={branch.id} data-status={branch.status}>
        <span className={styles.badge}>{branch.status === "jouable" ? "jouable" : "non implémentée"}</span>
        <h4>{branch.id} · {branch.label}</h4>
        <p>{branch.canonFrame}</p>
        <p>Scène proposée : {branch.proposedScene}</p>
        {branch.canonHeroes.length > 0 && <p>Héros canon intouchable : {branch.canonHeroes.map(hero => hero.name).join(", ")}</p>}
        <button type="button" disabled={branch.status !== "jouable" || !!state.activeWarpTripId} aria-pressed={state.warpBranchId === branch.id}
          onClick={() => apply(selectWarpBranchV165(state, branch.id))}>{state.warpBranchId === branch.id ? "Choisie" : "Choisir"}</button>
      </article>)}</div>
      <div className={styles.actions}>
        <button type="button" disabled={!departure.allowed} onClick={() => apply(departWarpV165(state, ctx))}>Engager le voyage</button>
        <button type="button" disabled={!canReturnFromWarpV165(state)} onClick={() => apply(returnFromWarpV165(state))}>Revenir (retour réservé)</button>
      </div>
      {!departure.allowed && !state.activeWarpTripId && <p className={styles.missing}>Départ impossible : {departure.missing.map(m => m.label).join(" · ")}</p>}
      {state.activeWarpTripId && <p>Voyage {state.activeWarpTripId} engagé vers {state.activeTripBranchId}. Le retour reste réservé même si une condition de départ se perd.</p>}
    </div>

    <div className={styles.section} data-warp-w02 data-visits={w02.visits}>
      <h3>W-02 · Japon féodal, 1629</h3>
      <p>Visites : {w02.visits} · morts dans la branche : {w02.deadIds.length + w02.localKills} · objets prélevés : {w02.takenObjectIds.length}{w02.alertedPassages.length ? " · passages alertés : " + w02.alertedPassages.join(", ") : ""}</p>
      <h4>Mini-arc (fiches V6 WARP-M16 → M18, rattachement proposé)</h4>
      {WARP_W02_STEPS_V165.map(step => {
        const done = w02.steps[step.id];
        return <article key={step.id} className={styles.section} data-warp-step={step.id} data-resolved={String(!!done?.resolved)}>
          <h4>{step.title}</h4><p>{step.scene}</p>
          {done?.resolved ? <p className={styles.ok}>Résolue : {step.choices.find(c => c.id === done.choice)?.label} · {done.success ? "réussie" : "sans réussite"}</p>
            : <div className={styles.actions}>{step.choices.map(choice => <button key={choice.id} type="button" disabled={!inW02}
              onClick={() => apply(resolveW02StepV165(state, step.id, choice.id))}>{choice.label}</button>)}</div>}
        </article>;
      })}
      <h4>Chasse complète (mission existante adaptée)</h4>
      <p>Le panorama du col des cèdres situe le duel en 1629. Le terrain et les sprites viennent de « Sang dans la canopée ». Les trophées restent rattachés à la branche W-02.</p>
      <button type="button" disabled={!huntLaunch.allowed || !huntMission} onClick={() => { setMessage(""); setHunting(true); }}>Lancer la chasse</button>
      {!huntLaunch.allowed && <p className={styles.missing}>{huntLaunch.reason}</p>}
      {w02.trophy && <p className={styles.ok}>Trophée : {w02.trophy.name} — {w02.trophy.circumstances}</p>}
      <h4>Contrats rejouables</h4>
      <ul className={styles.list}>{WARP_W02_CONTRACTS_V165.map(contract => <li key={contract.id}>{contract.label} — non implémenté. {contract.note}</li>)}</ul>
      {w02.epochCompleted && <p className={styles.ok}>Époque terminée dans cette branche.</p>}
    </div>

    {state.echoes.length > 0 && <div className={styles.section} data-warp-echoes={state.echoes.length}>
      <h3>Échos temporels</h3>
      <ul className={styles.list}>{state.echoes.map(echo => <li key={echo.id}>{echo.fromBranchId} → {echo.toBranchId} : {echo.text} {echo.effect}</li>)}</ul>
    </div>}

    <div className={styles.section}>
      <h3>Arc du prototype volé — non implémenté</h3>
      <p>{WARP_PROTOTYPE_ARC_V165.source}</p>
      <ul className={styles.list}>{WARP_PROTOTYPE_ARC_V165.figures.map(figure => <li key={figure.id}>{figure.name} : {figure.role}</li>)}</ul>
    </div>
  </section>;
}
