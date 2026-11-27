"use client";
import { useState } from "react";
import type { BiomaskId, SaveGame, WeaponId } from "./types";
import { V6_MASK_VISUAL_BY_ID } from "./v6Visuals";
import {
  BLACK_GOD_GESTURES_V162, BLACK_GOD_HONOR_THRESHOLD_V162, BLACK_GOD_MAX_WOUNDS_V162, BLACK_GOD_PHASES_V162, BLACK_GOD_SOURCE_V162,
  BLACK_GOD_ATTACK_LABELS_V162, actBlackGodTrialV162, blackGodActionsV162, blackGodCurrentAttackV162, blackGodTrialAccessV162,
  isFutureBlackGodV162, normalizeBlackGodV162, startBlackGodTrialV162, type BlackGodGestureV162, type BlackGodTrialRunV162,
} from "./systems/blackGodV162";
import { heritageMaskLabelV152, heritageWeaponLabelV152, normalizeHeritageV152 } from "./systems/heritageV152";
import styles from "./HeritagePanelV152.module.css";

export interface BlackGodSacrificeChoiceV162 { weaponId: WeaponId | null; maskId: BiomaskId | null; gesture: BlackGodGestureV162 }
type Result = { ok: boolean; message: string };
const date = (value: string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const OUT_OF_CANON = "Hors canon : le canon ne prévoit pas qu’un Yautja devienne le Black Warrior. Ce rang, cette épreuve et ce sacrifice sont des inventions du projet.";

/**
 * V162 · Black God (hors canon), au Mausolée des Chasseurs (proposé : la bible ouvre le mausolée et les
 * chroniques au Level 9). Épreuve finale en texte, victoire inscrite avant d'être annoncée, puis sacrifice
 * au choix en deux temps (préparer, confirmer). Refuser ou remettre le sacrifice n'écrit rien.
 */
export default function BlackGodPanelV162({ save, disabled, onTrialEnd, onSacrifice }: {
  save: SaveGame; disabled: boolean;
  onTrialEnd(run: BlackGodTrialRunV162): Result;
  onSacrifice(choice: BlackGodSacrificeChoiceV162): Result;
}) {
  const future = isFutureBlackGodV162(save.blackGodV162);
  const state = save.blackGodV162 ? normalizeBlackGodV162(save.blackGodV162, save.createdAt) : null;
  const testament = save.heritageV152 ? normalizeHeritageV152(save.heritageV152, save.createdAt)?.testament ?? null : null;
  const access = blackGodTrialAccessV162(save);
  const wornMask = save.appearance.biomaskId && Object.hasOwn(V6_MASK_VISUAL_BY_ID, save.appearance.biomaskId) ? save.appearance.biomaskId : null;
  const [run, setRun] = useState<BlackGodTrialRunV162 | null>(null);
  const [message, setMessage] = useState("");
  const [weaponId, setWeaponId] = useState<WeaponId | "">(""), [maskId, setMaskId] = useState<BiomaskId | "">("");
  const [gesture, setGesture] = useState<BlackGodGestureV162 | "">("");
  const [step, setStep] = useState<"idle" | "choose" | "confirm">("idle");
  const victory = !!state?.victoryAt;
  const ready = !!gesture && (!!testament || (!!weaponId && (!!wornMask || !!maskId)));
  const phase = run && run.phase !== "victoire" && run.phase !== "defaite" ? BLACK_GOD_PHASES_V162.find(p => p.id === run.phase) : null;

  return <section className={styles.panel} aria-labelledby="black-god-v162-title" data-black-god-v162={victory ? "victory" : run ? "trial" : "locked"}>
    <p className={styles.eyebrow}>Level 10 · Black God · hors canon</p>
    <h2 id="black-god-v162-title">La chasse mythique</h2>
    <p className={styles.proposed} data-black-god-out-of-canon>{OUT_OF_CANON}</p>
    {future && <p role="alert">Registre Black God d’une version plus récente : affichage et modifications désactivés.</p>}
    {!future && !victory && !run && <>
      <p>{BLACK_GOD_SOURCE_V162.prey}</p>
      <p data-black-god-honor>Honneur cumulé : {save.profile.honor} / {BLACK_GOD_HONOR_THRESHOLD_V162}.{state?.failedAttempts ? ` Tentatives perdues : ${state.failedAttempts}.` : ""}</p>
      {access.allowed
        ? <div className={styles.actions}><button type="button" data-black-god-start disabled={disabled} onClick={() => {
            const started = startBlackGodTrialV162(save);
            if (started.ok) { setRun(started.run); setMessage(""); } else setMessage(started.reason);
          }}>Partir pour le monde-ruche</button></div>
        : <ul data-black-god-locked>{access.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    </>}
    {!future && !victory && run && <div data-black-god-phase={run.phase}>
      <p>{phase ? <strong>{phase.label}</strong> : null} · blessures {run.wounds} / {BLACK_GOD_MAX_WOUNDS_V162} · tentative {run.attempt}</p>
      {phase && <p className={styles.note}>Bible : {phase.bible}</p>}
      {run.phase === "ancienne" && <p data-black-god-attack={blackGodCurrentAttackV162(run)}>{BLACK_GOD_ATTACK_LABELS_V162[blackGodCurrentAttackV162(run)]}.</p>}
      <ol aria-live="polite">{run.log.slice(-4).map((line, i) => <li key={`${run.log.length}-${i}`}>{line}</li>)}</ol>
      <div className={styles.actions}>
        {blackGodActionsV162(run).map(action => <button type="button" key={action.id} data-black-god-action={action.id} disabled={disabled} onClick={() => setRun(actBlackGodTrialV162(run, action.id))}>{action.label}</button>)}
        {(run.phase === "victoire" || run.phase === "defaite") && <button type="button" data-black-god-record disabled={disabled} onClick={() => {
          const result = onTrialEnd(run); setMessage(result.message); if (result.ok) setRun(null);
        }}>{run.phase === "victoire" ? "Inscrire la victoire" : "Inscrire la retraite"}</button>}
        {phase && <button type="button" data-black-god-leave disabled={disabled} onClick={() => { setRun(null); setMessage("Épreuve quittée : rien n’est inscrit ; elle recommencera au début (proposé)."); }}>Quitter l’épreuve</button>}
      </div>
    </div>}
    {!future && victory && state && <div data-black-god-sacrifice-step={step}>
      <p data-black-god-status>Statut quasi divin de Black God depuis le {date(state.victoryAt!)} (hors canon, annoncé comme tel). Les capacités de figure légendaire ne sont pas encore implémentées.</p>
      <p>Le sacrifice ultime reste à ton choix : le Black Warrior réclame le chasseur, la chronique est close (lecture seule, aucune donnée effacée) et le legs passe à la partie suivante. Tu peux aussi ne pas te sacrifier et continuer la chronique.</p>
      {step === "idle" && <div className={styles.actions}><button type="button" data-black-god-prepare disabled={disabled} onClick={() => setStep("choose")}>Envisager le sacrifice…</button></div>}
      {step !== "idle" && <>
        {testament ? <p>Legs déjà scellé ({heritageMaskLabelV152(testament.maskId)}, {heritageWeaponLabelV152(testament.weaponId)}) : il reste le seul legs de ce chasseur.</p> : <>
          {wornMask ? <p>Masque déposé au mausolée : <strong>{heritageMaskLabelV152(wornMask)}</strong> (masque porté).</p> : <p>
            <label htmlFor="black-god-v162-mask">Masque déposé au mausolée (aucun masque porté)</label>{" "}
            <select id="black-god-v162-mask" value={maskId} disabled={disabled || step === "confirm"} onChange={(event: { target: { value: string } }) => setMaskId(event.target.value as BiomaskId | "")}>
              <option value="">Choisir un masque</option>
              {(Object.keys(V6_MASK_VISUAL_BY_ID) as BiomaskId[]).map(id => <option key={id} value={id}>{heritageMaskLabelV152(id)}</option>)}
            </select></p>}
          <p><label htmlFor="black-god-v162-weapon">Arme léguée (bible : choisie avant la fin)</label>{" "}
          <select id="black-god-v162-weapon" value={weaponId} disabled={disabled || step === "confirm"} onChange={(event: { target: { value: string } }) => setWeaponId(event.target.value as WeaponId | "")}>
            <option value="">Choisir une arme possédée</option>
            {save.inventory.unlockedWeaponIds.map(id => <option key={id} value={id}>{heritageWeaponLabelV152(id)}</option>)}
          </select></p>
        </>}
        <p><label htmlFor="black-god-v162-gesture">Dernier geste de l’épilogue (R2-M060)</label>{" "}
        <select id="black-god-v162-gesture" value={gesture} disabled={disabled || step === "confirm"} onChange={(event: { target: { value: string } }) => setGesture(event.target.value as BlackGodGestureV162 | "")}>
          <option value="">Choisir</option>
          {BLACK_GOD_GESTURES_V162.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select></p>
        <div className={styles.actions}>
          {step === "choose"
            ? <button type="button" data-black-god-ready disabled={disabled || !ready} onClick={() => setStep("confirm")}>Préparer le sacrifice…</button>
            : <button type="button" data-black-god-sacrifice disabled={disabled || !ready} onClick={() => {
                if (!gesture) return;
                const result = onSacrifice({ weaponId: weaponId || null, maskId: wornMask ?? (maskId || null), gesture });
                setMessage(result.message); if (!result.ok) setStep("choose");
              }}>Confirmer · être réclamé par le Black Warrior (irréversible)</button>}
          <button type="button" data-black-god-decline disabled={disabled} onClick={() => { setStep("idle"); setMessage("Pas de sacrifice : la chronique continue. Rien n’est inscrit."); }}>Ne pas me sacrifier</button>
        </div>
      </>}
    </div>}
    <p role="status" aria-live="polite">{message}</p>
    <details><summary>Source</summary><ul>
      <li>{BLACK_GOD_SOURCE_V162.rank}</li><li>{BLACK_GOD_SOURCE_V162.threshold}</li><li>{BLACK_GOD_SOURCE_V162.canon}</li>
      <li>{BLACK_GOD_SOURCE_V162.heritage}</li><li>{BLACK_GOD_SOURCE_V162.epilogue}</li><li>{BLACK_GOD_SOURCE_V162.badBlood}</li>
    </ul><p className={styles.note}>Proposé : rang Elder à la place de Philosopher (L7 → L9 absents du jeu) ; épreuve en texte (le combat 2,5D n’est pas produit) avec ses actions, ses parades et la limite de trois blessures ; accès depuis le Mausolée ; tentative non sauvegardée ; sauvegardes antérieures non chargeables après le sacrifice. Non implémenté : contrôle Bad Blood (le jeu n’a pas d’état Bad Blood du joueur), capacités de figure légendaire, scène d’épilogue, masque déposé au lieu de la fin de voie, défaite en Hardcore comme mort définitive.</p></details>
  </section>;
}

/** Chronique close par le sacrifice : remplace toute la session, en lecture seule. */
export function BlackGodChronicleClosedV162({ save, busy, onMainMenu }: { save: SaveGame; busy: boolean; onMainMenu(): void }) {
  const state = save.blackGodV162 ? normalizeBlackGodV162(save.blackGodV162, save.createdAt) : null;
  const testament = save.heritageV152 ? normalizeHeritageV152(save.heritageV152, save.createdAt)?.testament ?? null : null;
  const gesture = BLACK_GOD_GESTURES_V162.find(g => g.id === state?.sacrifice?.gesture)?.label ?? "—";
  return <section className="screen panel-screen" role="alertdialog" aria-modal="true" aria-labelledby="black-god-closed-title" data-black-god-chronicle="closed">
    <div className="screen-safe">
      <p className="eyebrow">Black God · hors canon</p>
      <h1 id="black-god-closed-title">Réclamé par le Black Warrior</h1>
      <p><strong>{save.profile.hunterName || "Chasseur sans nom"}</strong>{state?.sacrifice ? ` · sacrifice du ${date(state.sacrifice.sacrificedAt)}` : ""}. Dernier geste : {gesture}.</p>
      <dl>
        <dt>Légende</dt><dd>{save.profile.honor} d’honneur · {save.trophies.length} trophée(s) · {save.statistics.missionsCompleted} chasse(s) réussie(s)</dd>
        {testament && <><dt>Legs scellé</dt><dd data-black-god-testament={testament.trigger}>{heritageMaskLabelV152(testament.maskId)} au mausolée · {heritageWeaponLabelV152(testament.weaponId)} aux Archives des Lignées</dd></>}
      </dl>
      <p>Cette chronique est close et en lecture seule. Ses sauvegardes sont conservées. Une nouvelle partie créée dans un emplacement libre peut recevoir ce legs une seule fois (« Descendant de … »).</p>
      <p className="eyebrow">{OUT_OF_CANON}</p>
      <div className="modal-actions"><button type="button" className="ghost-button" data-black-god-menu disabled={busy} onClick={onMainMenu}>Revenir au menu principal</button></div>
      <details><summary>Source</summary><ul><li>{BLACK_GOD_SOURCE_V162.rank}</li><li>{BLACK_GOD_SOURCE_V162.epilogue}</li></ul>
        <p>La scène d’épilogue R2-M060 n’est pas produite : seul le geste choisi est inscrit.</p></details>
    </div>
  </section>;
}
