"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { matchesControlAction } from "./systems/controlBindings";
import {
  CINEMA_MODES_M058, CINEMA_STORIES_M058, CINEMA_WIDTH_M058, advanceCinemaM058,
  availableCinemaActionsM058, cinemaKeyM058, cinemaSlotM058, openCinemaM058, withCinemaSlotM058,
  type CinemaActionM058, type CinemaRunM058, type CinemaViewM058,
} from "./systems/mausoleumCinemaM058";
import type { MausoleumAccess } from "./systems/mausoleum";
import styles from "./MausoleumCinemaM058.module.css";

const actionLabels: Record<CinemaActionM058, string> = {
  left: "Vers l’ouest", right: "Vers l’est", read: "Lire la balise", aid: "Soutenir l’éclaireur",
  cover: "Couvrir la traversée", ridge: "Ouvrir l’accès à la corniche", mark: "Activer le repère de repli",
  exit: "Confirmer la relève",
};

type Reading = { run: CinemaRunM058; view: CinemaViewM058 };
type Result = ({ ok: true } & Reading) | { ok: false; message: string };

function CinemaRoute({ view, mode }: { view: CinemaViewM058; mode: CinemaRunM058["mode"] }) {
  const laneName = view.lane === "ridge" ? "la corniche" : "le fond";
  const spotName = view.x === 0 ? "le débouché ouest" : view.x === 8 ? "le sas est" : "le repère " + (view.x + 1);
  const scout = view.escorting ? "L’éclaireur est à tes côtés." : "L’éclaireur attend au cinquième repère.";
  return <div className={styles.field}>
    <div className={styles.route} data-m058-position={view.x} data-m058-lane={view.lane}
      role="img" aria-label={"Tu es à " + spotName + ", sur " + laneName + ". " + scout}>
      {(["ridge", "ground"] as const).map(lane => <div key={lane} className={styles.lane} data-lane={lane} aria-hidden="true">
        <span className={styles.laneLabel}>{lane === "ridge" ? "Corniche" : "Fond"}</span>
        <div className={styles.cells}>
          {Array.from({ length: CINEMA_WIDTH_M058 }, (_, x) => {
            const player = view.x === x && view.lane === lane;
            const awaiting = x === 4 && lane === "ground" && !view.escorting;
            const site = lane === "ground" && x === 2 ? "signal"
              : lane === "ridge" && x === 2 && mode === "ridge" ? "mark"
              : lane === "ground" && x === 8 && mode === "faithful" || lane === "ridge" && x === 0 && mode === "ridge" ? "exit"
              : lane === "ground" && mode === "faithful" && (x === 5 || x === 6) ? "danger" : "trail";
            return <span key={x} className={styles.cell} data-player={player} data-site={site} data-scout={awaiting}>
              {player ? view.escorting ? "●◆" : "●" : awaiting ? "◆" : site === "signal" || site === "mark" ? "△" : site === "exit" ? "◫" : ""}
            </span>;
          })}
        </div>
      </div>)}
    </div>
    <div className={styles.legend} aria-hidden="true"><span>● Veilleur</span><span>◆ Éclaireur</span><span>△ Repère</span><span>◫ Sortie</span></div>
  </div>;
}

export default function MausoleumCinemaM058({ save, access, paused, onClose }: {
  save: Pick<SaveGame, "createdAt" | "settings">;
  access: MausoleumAccess;
  paused: boolean;
  onClose(): void;
}) {
  const [reading, setReading] = useState<Reading | null>(null);
  const [slots, setSlots] = useState(() => {
    try {
      return Object.fromEntries(CINEMA_MODES_M058.map(mode => [mode, cinemaSlotM058(window.localStorage, save.createdAt, mode)]));
    } catch {
      return {};
    }
  });
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const inField = !!reading && !reading.view.complete;
  useEffect(() => { if (inField && !paused) field.current?.focus(); }, [inField, paused]);

  const commit = async (mode: CinemaRunM058["mode"], work: (storage: Storage) => Result) => {
    if (paused || running.current) return;
    running.current = true;
    setPending(true);
    try {
      const result = await withCinemaSlotM058(cinemaKeyM058(save.createdAt, mode), () => panel.current
        ? work(window.localStorage) : { ok: false, message: "Lecture interrompue." });
      if (!panel.current) return;
      if (result.ok) {
        setReading(result); setNotice("");
        setSlots(current => ({ ...current, [mode]: result.view.complete ? "complete" : "ready" }));
      }
      else setNotice(result.message);
    } catch {
      if (panel.current) setNotice("La sauvegarde de la chronique est indisponible.");
    } finally {
      running.current = false;
      if (panel.current) setPending(false);
    }
  };
  const move = (action: CinemaActionM058) => {
    if (!reading) return;
    void commit(reading.run.mode, storage => advanceCinemaM058(storage, reading.run, action));
  };
  const onFieldKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.repeat) return;
    const { controlBindings } = save.settings;
    const left = matchesControlAction("hunt.moveLeft", event.nativeEvent, controlBindings);
    const right = matchesControlAction("hunt.moveRight", event.nativeEvent, controlBindings);
    if (!left && !right) return;
    event.preventDefault();
    move(left ? "left" : "right");
  };
  const story = reading && CINEMA_STORIES_M058[reading.run.mode];
  const commands = reading ? availableCinemaActionsM058(reading.view, reading.run) : [];
  const canReplay = reading && (reading.view.complete || commands.length === 0);
  return <section ref={panel} className={styles.player} data-m058-reader={reading?.view.complete ? "complete" : reading ? "field" : "select"}>
    <h2 id="mausoleum-cinema-title">L’éclaireur de Korthas</h2>
    {reading && story ? <>
      <div className={styles.chapter}><h3>{story.title}</h3><span>{story.subtitle}</span></div>
      {reading.view.complete ? <p data-m058-result>{story.ending}</p> : <>
        <p>{story.briefing}</p>
        <div ref={field} tabIndex={0} aria-label="Déplacer le veilleur" onKeyDown={onFieldKey}>
          <CinemaRoute view={reading.view} mode={reading.run.mode} />
        </div>
        <p data-m058-status>{reading.view.escorting ? "Éclaireur à couvert avec toi." : reading.view.signalRead ? "Balise lue. Rejoins l’éclaireur." : "Balise à lire au troisième repère."}
          {reading.view.cover > 0 ? " Couverture restante " + reading.view.cover + "." : ""}
          {reading.view.pathMarked ? " Repère de repli actif." : ""}</p>
        {!commands.length && <p>Le registre de cette lecture est plein. Tu peux rejouer le récit depuis la balise.</p>}
        <div className={styles.actions} aria-label="Commandes du récit">
          {commands.map(action => <button type="button" key={action} disabled={paused || pending}
            data-m058-action={action} onClick={() => move(action)}>{actionLabels[action]}</button>)}
        </div>
      </>}
    </> : <>
      <p>Le masque est posé sur le socle. Choisis le témoignage de secours ou la variante du sas fermé. Chaque récit reprend son propre point de passage.</p>
      <div className={styles.actions}>
        {CINEMA_MODES_M058.map(mode => <button type="button" key={mode} data-m058-mode={mode} disabled={paused || pending}
          onClick={() => void commit(mode, storage => openCinemaM058(storage, save.createdAt, mode, access))}>
          {CINEMA_STORIES_M058[mode].title} · {CINEMA_STORIES_M058[mode].subtitle}
          {slots[mode] === "ready" ? " · Reprendre" : slots[mode] === "complete" ? " · Bilan" : ""}
        </button>)}
      </div>
    </>}
    <p role="status" aria-live="polite">{notice}</p>
    <div className={styles.actions}>
      {canReplay && <button type="button" disabled={paused || pending}
        onClick={() => void commit(reading.run.mode, storage => openCinemaM058(storage, save.createdAt, reading.run.mode, access, reading.run))}>
        Rejouer depuis la balise
      </button>}
      {reading && <button type="button" disabled={paused || pending} onClick={() => { setReading(null); setNotice(""); }}>Choisir un récit</button>}
      <button type="button" disabled={paused || pending} onClick={onClose}>Retirer le masque et revenir au socle</button>
    </div>
  </section>;
}
