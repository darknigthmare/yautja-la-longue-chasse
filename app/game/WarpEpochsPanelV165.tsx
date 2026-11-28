"use client";

/* eslint-disable @next/next/no-img-element -- keep the original transparent source image */
import React, { Suspense, useMemo, useState } from "react";
import type { MissionResult, SaveGame } from "./types";
import type { ChronicleAccessContext } from "./systems/clanChronicle";
import { MISSIONS } from "./data";
import {
  WARP_BRANCHES_V165, WARP_COMPONENTS_V165, WARP_PROTOTYPE_ARC_V165, WARP_W02_CONTRACTS_V165, WARP_W02_STEPS_V165,
  W02_HUNT_BASE_MISSION_ID_V165, WARP_W02_BONSHO_V165, WARP_W02_TERRACE_ALERT_V165,
  actWarpVillageV165, advanceWarpCommonRouteV165, advanceWarpFjordW01, advanceWarpSurveyR2, applyW02HuntResultV165, branchVisitV165, canLaunchW02HuntV165, canReturnFromWarpV165,
  createWarpEpochsV165, departWarpV165, evaluateWarpDepartureV165, installWarpModuleV165, normalizeWarpEpochsV165,
  resolveW02StepV165, returnFromWarpV165, selectWarpBranchV165, verifyWarpComponentV165,
  warpAccessContextFromSaveV165, warpConditionsV165, warpVillageRankAllowed, warpW02HuntMissionV165,
  type WarpEpochsStateV165, type WarpUpdateV165,
} from "./systems/warpEpochsV165";
import { mergeLegacyTantalusV167 } from "./systems/tantalusV164";
import { warpVillageView, type WarpVillageOrder, type WarpVillageRecord } from "./systems/warpVillageR2M048";
import TantalusPanelV164 from "./TantalusPanelV164";
import { shipReceiptV161 } from "./systems/shipReceiptV161";
import { warpCommonViewR2 } from "./systems/warpCommonRouteR2";
import WarpCommonSceneR2, { WarpSurveySceneR2 } from "./WarpCommonSceneR2";
import WarpFjordScene from "./WarpFjordScene";
import { W01_FJORD_BRANCH, W01_FJORD_ROUTES } from "./systems/warpFjordW01";
import styles from "./WarpEpochsPanelV165.module.css";

const HuntCanvas = React.lazy(() => import("./HuntCanvas"));

export interface WarpEpochsPanelV165Props {
  save: SaveGame;
  /** Disponibilité réelle du vaisseau, lue par le client (jamais devinée ici). */
  shipContext?: ChronicleAccessContext;
  /** Écrit l'état dans la sauvegarde ; false si l'écriture est refusée.
   * `clearLegacyTantalus` (V167) : l'ancien dossier `tantalusV164` est repris
   * dans `state` et doit être effacé dans la même écriture. */
  onPersist(state: WarpEpochsStateV165, clearLegacyTantalus?: boolean): boolean;
  onClose(): void;
}

function WarpVillage({ record, inBranch, eligible, onOrder }: {
  record: WarpVillageRecord | undefined;
  inBranch: boolean;
  eligible: boolean;
  onOrder: (order: WarpVillageOrder) => void;
}) {
  const view = warpVillageView(record?.orders ?? []);
  if (!inBranch && !record) return null;
  const stage = !record || record.orders.length < 2 ? "Reconnaissance" : record.orders.length < 4 ? "Passage" : "Rassemblement";
  return <article className={styles.section} aria-labelledby="warp-village-title" data-warp-village
    data-warp-village-place={view.location} data-warp-village-completed={view.complete} data-warp-village-choice={view.choice}>
    <h4 id="warp-village-title">La branche qu’on ne possède pas</h4>
    <p>Hameau des Cèdres · {view.complete ? "Trajet consigné" : stage}</p>
    {inBranch ? <><h5>{view.site.name}</h5><p>{view.site.ground}</p></> :
      !view.complete && <p>Reprends le relevé lors de ton prochain voyage vers W-02.</p>}
    {(inBranch || view.complete) && <p aria-live="polite">{view.note}</p>}
    {inBranch && !eligible && !view.complete && <p className={styles.missing}>Une expédition Elite peut reprendre ce relevé.</p>}
    {inBranch && !view.complete && <div className={styles.actions}>
      {view.options.map(option => <button key={option.id} type="button" disabled={!eligible}
        data-warp-village-order={option.id} onClick={() => onOrder(option.id)}>{option.label}</button>)}
    </div>}
  </article>;
}

export default function WarpEpochsPanelV165({ save, shipContext = { personalShipAvailable: false }, onPersist, onClose }: WarpEpochsPanelV165Props) {
  // V167 : un ancien dossier `tantalusV164` est relu dans l'état Warp commun.
  const merged = useMemo(() => mergeLegacyTantalusV167(save.warpEpochsV165, save.tantalusV164, save.createdAt), [save]);
  const state = useMemo(() => merged.state ?? normalizeWarpEpochsV165(save.warpEpochsV165, save.createdAt) ?? createWarpEpochsV165(save.createdAt), [merged, save]);
  const ctx = useMemo(() => warpAccessContextFromSaveV165(save, shipContext), [save, shipContext]);
  const [message, setMessage] = useState("");
  const [hunting, setHunting] = useState(false);
  const base = MISSIONS.find(mission => mission.id === W02_HUNT_BASE_MISSION_ID_V165);
  const w02 = branchVisitV165(state, "W-02");
  const terraceAlerted = w02.alertedPassages.includes(WARP_W02_TERRACE_ALERT_V165);
  const huntMissions = useMemo(() => base ? {
    initial: warpW02HuntMissionV165(base),
    alerted: warpW02HuntMissionV165(base, true),
  } : null, [base]);
  const huntMission = (terraceAlerted ? huntMissions?.alerted : huntMissions?.initial) ?? null;

  const apply = (update: WarpUpdateV165) => {
    if (!update.accepted) { setMessage(update.message); return false; }
    if (update.changed && !onPersist(update.state, merged.importedLegacy)) { setMessage("Sauvegarde refusée : aucun changement appliqué."); return false; }
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
  const spatialRoute = !!state.commonRouteR2 || state.warpQuestOutcome === "non_commence";
  const commonView = warpCommonViewR2(state.commonRouteR2);
  const hull = shipReceiptV161(save).receipt;
  const canWork = !!hull && ctx.blooded && ctx.adjutant && !state.activeWarpTripId;
  const inW02 = state.activeTripBranchId === "W-02";
  const inW01 = state.activeTripBranchId === W01_FJORD_BRANCH;
  const fjord = branchVisitV165(state, W01_FJORD_BRANCH).fjordW01;
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
    <p className={styles.notice}>Chapitre facultatif : aucune mission Warp ne valide un rang (WARP-R02, WARP-R24). Expéditions ouvertes : la reconnaissance du fjord en 841, le Japon féodal en 1629 et Tantalus en 2204.</p>
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
      {spatialRoute && <>
        {!canWork && commonView.section !== "ready" && <p className={styles.missing}>
          L’accès à l’observatoire exige Blooded, le dossier Adjutant et la coque remise au chantier naval.
        </p>}
        <WarpCommonSceneR2 key={commonView.section} view={commonView} identity={save} disabled={!canWork}
          onCommand={command => apply(advanceWarpCommonRouteV165(state, ctx, hull?.instanceId, command))} />
      </>}
      {!spatialRoute && state.warpQuestOutcome === "en_cours" && <>
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
      {!spatialRoute && state.warpQuestOutcome === "reussi" && <p className={styles.ok}>Quête réussie. Module installé et calibré.</p>}
    </div>

    <div className={styles.section}>
      <h3>Branches (L-10)</h3>
      <div className={styles.cards}>{WARP_BRANCHES_V165.map(branch => <article key={branch.id} data-warp-branch-card={branch.id} data-status={branch.status}>
        <span className={styles.badge}>{branch.id === W01_FJORD_BRANCH ? "Reconnaissance" : branch.status === "jouable" ? "jouable" : "non implémentée"}</span>
        <h4>{branch.id} · {branch.label}</h4>
        <p>{branch.canonFrame}</p>
        <p>Scène proposée : {branch.proposedScene}</p>
        {branch.canonHeroes.length > 0 && <p>Héros canon intouchable : {branch.canonHeroes.map(hero => hero.name).join(", ")}</p>}
        <button type="button" disabled={branch.status !== "jouable" || !!state.activeWarpTripId} aria-pressed={state.warpBranchId === branch.id}
          onClick={() => apply(selectWarpBranchV165(state, branch.id))}>{state.warpBranchId === branch.id ? "Choisie" : "Choisir"}</button>
      </article>)}</div>
      <div className={styles.actions}>
        <button type="button" disabled={!departure.allowed} onClick={() => apply(departWarpV165(state, ctx))}>Engager le voyage</button>
        <button type="button" disabled={!canReturnFromWarpV165(state)} onClick={() => apply(returnFromWarpV165(state))}>{inW01 && !fjord?.returned ? "Repli d’urgence (retour réservé)" : "Revenir (retour réservé)"}</button>
      </div>
      {!departure.allowed && !state.activeWarpTripId && <p className={styles.missing}>Départ impossible : {departure.missing.map(m => m.label).join(" · ")}</p>}
      {state.activeWarpTripId && <p>Voyage {state.activeWarpTripId} engagé vers {state.activeTripBranchId}. Le retour reste réservé même si une condition de départ se perd.</p>}
      {state.firstSurveyR2?.stage === "complete" ? <p className={styles.ok} data-warp-survey-complete>
        Le relevé du col est archivé. {state.firstSurveyR2.nicheVisited ? "L’alcôve figure dans le rapport." : "Retour direct par la fenêtre."}
      </p> : inW02 && <WarpSurveySceneR2 key={state.activeWarpTripId} survey={state.firstSurveyR2} identity={save}
        onAction={action => apply(advanceWarpSurveyR2(state, action))} />}
    </div>

    {(inW01 || fjord?.returned) && <div className={styles.section} data-warp-w01>
      <h3>W-01 · Scandinavie, 841</h3>
      {fjord?.returned ? <article data-warp-fjord-register data-route={fjord.route}>
        <h4>Registre du vaisseau · Une voile dans la brume</h4>
        <p>{W01_FJORD_ROUTES[fjord.route].label} · {W01_FJORD_ROUTES[fjord.route].finding}</p>
        <p>Voyage {fjord.tripId} · Retour par la fenêtre réservée</p>
      </article> : <WarpFjordScene key={state.activeWarpTripId} record={fjord} identity={save}
        onAction={action => apply(advanceWarpFjordW01(state, action))} />}
    </div>}

    <div className={styles.section} data-warp-w02 data-visits={w02.visits}>
      <h3>W-02 · Japon féodal, 1629</h3>
      <p>Visites : {w02.visits} · morts dans la branche : {w02.deadIds.length + w02.localKills} · objets prélevés : {w02.takenObjectIds.length}{w02.alertedPassages.length ? " · passages alertés : " + w02.alertedPassages.join(", ") : ""}</p>
      <WarpVillage record={w02.r2M048} inBranch={inW02} eligible={warpVillageRankAllowed(save)}
        onOrder={order => { apply(actWarpVillageV165(state, save, order)); }} />
      <h4>Mini-arc (fiches V6 WARP-M16 → M18, rattachement proposé)</h4>
      {WARP_W02_STEPS_V165.map(step => {
        const done = w02.steps[step.id];
        return <article key={step.id} className={styles.section} data-warp-step={step.id} data-resolved={String(!!done?.resolved)}>
          <h4>{step.title}</h4><p>{step.scene}</p>
          {inW02 && step.id === "WARP-M16" && <img className={styles.bonsho} data-warp-bonsho
            src={WARP_W02_BONSHO_V165} alt="Cloche de bronze suspendue à un portique de bois" width={1536} height={1024} />}
          {done?.resolved ? <p className={styles.ok}>Résolue : {step.choices.find(c => c.id === done.choice)?.label} · {done.success ? "réussie" : "sans réussite"}</p>
            : <div className={styles.actions}>{step.choices.map(choice => <button key={choice.id} type="button" disabled={!inW02}
              onClick={() => apply(resolveW02StepV165(state, step.id, choice.id))}>{choice.label}</button>)}</div>}
        </article>;
      })}
      <h4>Chasse complète (mission existante adaptée)</h4>
      <p>Le panorama du col des cèdres situe le duel en 1629. Le terrain et les sprites viennent de « Sang dans la canopée ». Les trophées restent rattachés à la branche W-02.</p>
      {terraceAlerted && <p>La cloche a détourné un garde de la terrasse vers le camp. Attends-toi à le retrouver près de la lame.</p>}
      <button type="button" disabled={!huntLaunch.allowed || !huntMission} onClick={() => { setMessage(""); setHunting(true); }}>Lancer la chasse</button>
      {!huntLaunch.allowed && <p className={styles.missing}>{huntLaunch.reason}</p>}
      {w02.trophy && <p className={styles.ok}>Trophée : {w02.trophy.name} — {w02.trophy.circumstances}</p>}
      <h4>Contrats rejouables</h4>
      <ul className={styles.list}>{WARP_W02_CONTRACTS_V165.map(contract => <li key={contract.id}>{contract.label} — non implémenté. {contract.note}</li>)}</ul>
      {w02.epochCompleted && <p className={styles.ok}>Époque terminée dans cette branche.</p>}
    </div>

    <TantalusPanelV164 state={state} onApply={apply} pendingLegacy={merged.pendingLegacy} />

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
