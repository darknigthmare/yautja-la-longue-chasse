"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignCatalogView } from "./CampaignMainMenu";
import CampaignCoopExercisePanel from "./CampaignCoopExercisePanel";
import {
  CAMPAIGN_COOP_LOBBY_KEY, CAMPAIGN_COOP_MAX_PLAYERS,
  campaignCoopLobbyIsOpen, sameCampaignCoopOwner, type CampaignCoopLobbyFailure,
} from "./systems/campaignCoopLobby";
import {
  actOnBrowserCampaignCoopLobby, browserCampaignCoopActor, browserCampaignCoopAvailable,
  campaignCoopCandidates, readBrowserCampaignCoopLobby, type BrowserCampaignCoopAction,
} from "./systems/campaignCoopLobbyBrowser";
import styles from "./CampaignCoopLobby.module.css";

const errorText: Record<CampaignCoopLobbyFailure, string> = {
  invalid: "Cette action ne correspond pas au registre du salon.",
  unavailable: "Le salon est indisponible. Vérifiez le stockage et rechargez l’onglet.",
  occupied: "Un salon est déjà ouvert sur ce profil de navigateur.",
  stale: "Ce salon a été fermé, a expiré ou sa chronique a changé.",
  owner: "Sélectionnez une chronique disponible dans les archives.",
  host: "Cette décision appartient à l’onglet hôte.",
  guest: "Cette place n’est plus réservée.",
  invitation: "Le code d’invitation est invalide, remplacé ou déjà utilisé.",
  full: "Les trois places du trio sont réservées.",
  already: "Cet onglet ou cette chronique a déjà une place dans le salon.",
  exercise: "L’exercice a changé ou ne peut plus reprendre avec ces chroniques.",
  assignment: "Cette manœuvre dépend d’un autre poste du trio.",
  order: "Le trio attend un autre signal.",
  route: "La voie signalée ne porte plus de traces fraîches. Relisez la piste.",
  support: "Cette prise cède sous la charge. Éprouvez l’autre appui.",
};

export default function CampaignCoopLobbyPanel({ catalog }: { catalog: CampaignCatalogView | null }) {
  const [snapshot, setSnapshot] = useState<ReturnType<typeof readBrowserCampaignCoopLobby> | null>(null);
  const [now, setNow] = useState(0);
  const [proof, setProof] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<{ hash: string | null; text: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const actionRunning = useRef(false);

  const refresh = useCallback(() => {
    setSnapshot(readBrowserCampaignCoopLobby());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let mounted = true;
    const pending = setTimeout(() => {
      if (!mounted) return;
      setAvailable(browserCampaignCoopAvailable());
      refresh();
      void browserCampaignCoopActor().then(value => {
        if (mounted && !actionRunning.current) setProof(value);
      });
    }, 0);
    function changed(event: StorageEvent) {
      if (event.key === null || event.key === CAMPAIGN_COOP_LOBBY_KEY) refresh();
    }
    window.addEventListener("storage", changed);
    return () => {
      mounted = false;
      clearTimeout(pending);
      window.removeEventListener("storage", changed);
    };
  }, [refresh]);

  const candidates = campaignCoopCandidates(catalog);
  const room = snapshot?.room ?? null;
  useEffect(() => {
    if (!room || room.closed || room.expiresAt <= now) return;
    const wait = Math.min(2_147_483_647, Math.max(0, room.expiresAt - Date.now()));
    const timer = setTimeout(refresh, wait);
    return () => clearTimeout(timer);
  }, [room, now, refresh]);

  const active = campaignCoopLobbyIsOpen(room, candidates, now) ? room : null;
  const host = active?.host.proof === proof;
  const authorized = active?.guests.filter(seat => candidates.some(owner => sameCampaignCoopOwner(seat, owner))) ?? [];
  const pending = active?.pending.filter(seat => candidates.some(owner => sameCampaignCoopOwner(seat, owner))) ?? [];
  const guest = authorized.some(seat => seat.proof === proof);
  const waiting = pending.some(seat => seat.proof === proof);
  const eligible = candidates.filter(owner => !active || ![active.host, ...authorized, ...pending]
    .some(seat => seat.ownerCreatedAt === owner.ownerCreatedAt));
  const chosen = eligible.find(owner => String(owner.slotId) === selected) ?? eligible[0];
  const full = authorized.length + pending.length + 1 >= CAMPAIGN_COOP_MAX_PLAYERS;
  const disabled = busy || !available || snapshot?.unavailable === true;
  const title = (identity: { slotId: number; ownerCreatedAt: string }) =>
    candidates.find(owner => sameCampaignCoopOwner(owner, identity))?.hunterName ?? "Chronique indisponible";

  async function act(action: BrowserCampaignCoopAction) {
    if (disabled || !snapshot || actionRunning.current) return;
    actionRunning.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await actOnBrowserCampaignCoopLobby(action);
      refresh();
      if (result.actorProof) setProof(result.actorProof);
      if (!result.ok) {
        setMessage(errorText[result.reason]);
        return;
      }
      if (action.type === "join") setCode("");
      if (result.inviteCode) setIssued({ hash: result.room.invitationHash, text: result.inviteCode });
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  return <div className={styles.panel} data-campaign-coop-lobby aria-busy={busy}>
    <p>Réunissez jusqu’à trois chroniques dans des onglets de ce même profil de navigateur pour jouer la relève de balise.</p>
    {!snapshot ? <p role="status">Lecture du registre du salon…</p> : snapshot.unavailable ?
      <p role="alert">Le registre local du salon est illisible ou inaccessible.</p> : !available ?
      <p role="alert">Le salon exige le stockage et le verrouillage d’un navigateur récent sur une adresse sécurisée.</p> :
      !active ? <p>{room ? "Le précédent salon est clos ou sa chronique n’est plus disponible." : "Aucun salon ouvert."}</p> : <>
        <p><strong>Hôte</strong> · {title(active.host)} <span>· {authorized.length + 1} / {CAMPAIGN_COOP_MAX_PLAYERS} membres</span></p>
        {authorized.length > 0 && <ul className={styles.roster} aria-label="Invités admis">{authorized.map(seat =>
          <li key={seat.ownerCreatedAt}><span>{title(seat)}</span>
            {host && <button type="button" disabled={disabled} aria-label={"Retirer " + title(seat)}
              onClick={() => { void act({ type: "decline", roomId: active.id, guest: seat }); }}>Retirer</button>}
          </li>)}</ul>}
        {host && pending.length > 0 && <ul className={styles.roster} aria-label="Demandes d’admission">{pending.map(seat =>
          <li key={seat.ownerCreatedAt}><span>{title(seat)}</span><div className={styles.actions}>
            <button type="button" disabled={disabled} aria-label={"Admettre " + title(seat)}
              onClick={() => { void act({ type: "admit", roomId: active.id, guest: seat }); }}>Admettre</button>
            <button type="button" disabled={disabled} aria-label={"Refuser " + title(seat)}
              onClick={() => { void act({ type: "decline", roomId: active.id, guest: seat }); }}>Refuser</button>
          </div></li>)}</ul>}
        {waiting && <p role="status">Demande d’admission en attente de l’hôte.</p>}
        {guest && <p role="status">Votre chronique a été admise dans le trio.</p>}
      </>}
    {snapshot && available && !snapshot.unavailable && (active && host ?
      <div>
        <div className={styles.actions}>
          <button type="button" disabled={disabled || full} onClick={() => { void act({ type: "issue", roomId: active.id }); }}>
            {active.invitationHash ? "Renouveler le code" : "Créer un code d’invitation"}
          </button>
          <button type="button" disabled={disabled} onClick={() => { void act({ type: "close", roomId: active.id }); }}>Fermer le salon</button>
        </div>
        {active.invitationHash && issued?.hash === active.invitationHash && <p className={styles.code}>
          <output aria-label="Code d’invitation">{issued.text}</output>
        </p>}
        {active.invitationHash && issued?.hash !== active.invitationHash && <p>Un code est en circulation. Renouvelez-le pour en afficher un autre.</p>}
      </div> : active && (waiting || guest) ?
      <button type="button" disabled={disabled} onClick={() => { void act({ type: "leave", roomId: active.id }); }}>
        {waiting ? "Annuler ma demande" : "Quitter le salon"}
      </button> : !chosen ?
      <p>{active ? "Une autre chronique disponible est nécessaire pour demander une place." : "Créez ou récupérez une chronique pour ouvrir un salon."}</p> :
      <form className={styles.form} onSubmit={event => {
        event.preventDefault();
        const owner = { slotId: chosen.slotId, ownerCreatedAt: chosen.ownerCreatedAt };
        void act(active ? { type: "join", roomId: active.id, owner, code } : { type: "open", owner });
      }}>
        <label htmlFor="coop-lobby-owner">Chronique</label>
        <select id="coop-lobby-owner" disabled={disabled || Boolean(active && full)} value={chosen.slotId} onChange={event => setSelected(event.target.value)}>
          {eligible.map(owner => <option key={owner.ownerCreatedAt} value={owner.slotId}>{owner.hunterName} · partie {owner.slotId}</option>)}
        </select>
        {active && <>
          <label htmlFor="coop-lobby-code">Code d’invitation</label>
          <input id="coop-lobby-code" disabled={disabled || full} value={code} onChange={event => setCode(event.target.value)}
            maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </>}
        <button type="submit" disabled={disabled || Boolean(active && (full || !code.trim()))}>
          {active ? "Demander à rejoindre" : "Ouvrir un salon"}
        </button>
      </form>)}
    {active && (host || guest) && <CampaignCoopExercisePanel room={active} proof={proof} disabled={disabled}
      players={[active.host, ...authorized].map(seat => ({ proof: seat.proof, name: title(seat) }))}
      run={command => { void act(command); }} />}
    {active && full && <p>Les trois places du trio sont réservées.</p>}
    <p aria-live="polite" role="status">{message}</p>
  </div>;
}
