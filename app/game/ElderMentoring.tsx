"use client";

import { useEffect, useRef, useState } from "react";
import type { SaveGame } from "./types";
import { GameAudio } from "./sound";
import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import { samePassagePoint, type PassagePoint } from "./systems/elderPassageJudgmentV168";
import {
  currentMentoringFrame, initialElderMentoring, inspectElderMentoring, isMentoringPath,
  MENTORING_MAP, MENTORING_MENTOR, MENTORING_POST, MENTORING_SIDE_LABEL, MENTORING_START,
  MENTORING_SUPPORTS, mentoringFrames, mentoringLookout, mentoringNoviceSide,
  type MentoringCommand, type MentoringFrame, type MentoringOperation, type MentoringResponse,
} from "./systems/elderMentoringV168";
import styles from "./ElderMentoring.module.css";

const directions = [
  { key: "ArrowUp", label: "Nord", symbol: "↑", column: 0, row: -1 },
  { key: "ArrowLeft", label: "Ouest", symbol: "←", column: -1, row: 0 },
  { key: "ArrowDown", label: "Sud", symbol: "↓", column: 0, row: 1 },
  { key: "ArrowRight", label: "Est", symbol: "→", column: 1, row: 0 },
] as const;
const sides = ["west", "east"] as const;
const art = YOUTH_ART_MANIFEST;
type Playback = { command: MentoringCommand; frames: MentoringFrame[]; index: number };

function ChartSprite({ src, rect, kind }: {
  src: string;
  rect: readonly [number, number, number, number];
  kind: "novice" | "mentor" | "prey";
}) {
  const [x, y, width, height] = rect;
  return <span className={styles.sprite} data-actor={kind}
    style={{ width, height, backgroundImage: "url(" + src + ")", backgroundPosition: -x + "px " + -y + "px" }} />;
}

export default function ElderMentoring({ save, onCommand, onClose }: {
  save: SaveGame;
  onCommand: (command: MentoringCommand) => MentoringResponse;
  onClose: () => void;
}) {
  const inspection = inspectElderMentoring(save.elderMentoringV168, save.createdAt);
  const state = inspection.state ?? initialElderMentoring(save.createdAt);
  const playable = inspection.status === "absent" || inspection.status === "valid";
  const [position, setPosition] = useState(MENTORING_START);
  const [message, setMessage] = useState("");
  const [playback, setPlayback] = useState<Playback | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const { masterVolume, effectsVolume } = save.settings;

  useEffect(() => {
    const audio = new GameAudio();
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMix({ master: masterVolume, effects: effectsVolume, music: 0 });
  }, [masterVolume, effectsVolume]);

  useEffect(() => {
    if (!playback) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 140 : 440;
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setPlayback({ ...playback });
      } else if (playback.index + 1 < playback.frames.length) {
        const nextIndex = playback.index + 1;
        if (!samePassagePoint(playback.frames[playback.index].novice, playback.frames[nextIndex].novice)) {
          audioRef.current?.footstep(0.45);
        }
        setPlayback({ ...playback, index: nextIndex });
      } else {
        setPlayback(null);
        setMessage(onCommand(playback.command).message);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [onCommand, playback]);

  const move = (direction: PassagePoint) => {
    if (playback) return;
    const next = { column: position.column + direction.column, row: position.row + direction.row };
    if (!isMentoringPath(next)) {
      setMessage("Les rochers ferment ce passage.");
      return;
    }
    void audioRef.current?.unlock().then(() => audioRef.current?.footstep(0.55));
    setPosition(next);
    setMessage("");
  };

  const perform = (operation: MentoringOperation) => {
    const command = { expectedRevision: state.revision, position, operation };
    if (operation.type === "watch" && state.attempt && state.attempt.observed < 2) {
      const stage = state.attempt.observed === 0 ? 0 : 1;
      void audioRef.current?.unlock();
      setMessage("");
      setPlayback({ command, frames: mentoringFrames(state, stage), index: 0 });
      return;
    }
    const result = onCommand(command);
    setMessage(result.message);
    if (result.ok) {
      void audioRef.current?.unlock().then(() => {
        const audio = audioRef.current;
        if (operation.type === "prepare") audio?.fieldAction("field-work");
        if (operation.type === "begin" && operation.choice === "hint") audio?.select();
        if (operation.type === "report") audio?.objective();
      });
    }
  };

  const sideHere = sides.find(side => samePassagePoint(position, MENTORING_SUPPORTS[side]));
  const atPost = samePassagePoint(position, MENTORING_POST);
  const atLookout = samePassagePoint(position, mentoringLookout(state));
  const atMentor = samePassagePoint(position, MENTORING_MENTOR);
  const observed = state.attempt?.observed;
  const frame = playback ? playback.frames[playback.index] : currentMentoringFrame(state);
  const direction = mentoringNoviceSide(state) === "west" ? "left" : "right";
  const novice = art.actors.player[direction];
  const noviceClip = novice.clips[playback && playback.index > 0 ? "walk" : "idle"].frames;
  const noviceFrame = noviceClip[(playback?.index ?? 0) % noviceClip.length];
  const mentor = art.actors.rival.left;
  const prey = art.patrolGrazer?.[direction].watch;
  const step = !playable ? "Ce dossier ne peut pas être lu." :
    state.resolved ? "Le témoin a consigné la décision et la réussite du novice." :
    state.supports.length < 2 ? "Prépare les deux appuis, à l’ouest et à l’est." :
    !state.attempt ? "Rejoins le poste de départ pour lancer la chasse." :
    observed === 0 ? "Depuis le poste de départ, observe le choix du novice." :
    observed === 1 ? "Rejoins le belvédère " + MENTORING_SIDE_LABEL[mentoringNoviceSide(state)] + " et observe l’approche." :
    "Rejoins le témoin pour consigner la chasse.";

  const place = sideHere ? "Appui " + MENTORING_SIDE_LABEL[sideHere] :
    atMentor ? "Auprès du témoin" :
    atPost ? "Poste de départ" :
    atLookout && state.attempt ? "Belvédère" : "Sentier";

  return <section className={styles.scene} aria-label="Former sans remplacer" data-elder-mentoring>
    <header className={styles.header}>
      <h3>Former sans remplacer</h3>
      <button type="button" onClick={onClose}>Fermer le terrain du novice</button>
    </header>
    <p>{step}</p>
    {state.resolved ? <p className={styles.receipt}>
      {state.attempt?.choice === "hint" ? "Piste repérée avec un indice." : "Piste repérée en autonomie."}
    </p> : playable && <>
      <div className={styles.board} role="region" tabIndex={0} aria-label="Terrain d’exercice"
        onKeyDown={event => {
          const direction = directions.find(direction => direction.key === event.key);
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          move(direction);
        }}>
        {MENTORING_MAP.flatMap((line, row) => [...line].map((terrain, column) => {
          const tile = { column, row };
          const side = sides.find(side => samePassagePoint(tile, MENTORING_SUPPORTS[side]));
          const player = samePassagePoint(tile, position);
          const marker = side ? "support" : samePassagePoint(tile, MENTORING_POST) ? "post" :
            observed === 1 && samePassagePoint(tile, mentoringLookout(state)) ? "lookout" : undefined;
          return <span className={styles.tile} key={row * 9 + column} aria-hidden="true"
            data-terrain={terrain === "#" ? "wall" : row < 3 ? "cover" : "path"}
            data-marker={marker} data-ready={side && state.supports.includes(side) ? "" : undefined}
            data-player={player ? "" : undefined}>
            {marker && <span className={styles.marker}>{marker === "support" ? "◇" : "◎"}</span>}
            {samePassagePoint(tile, frame.novice) &&
              <ChartSprite src={novice.src} rect={noviceFrame.rect} kind="novice" />}
            {samePassagePoint(tile, MENTORING_MENTOR) &&
              <ChartSprite src={mentor.src} rect={mentor.clips.idle.frames[0].rect} kind="mentor" />}
            {prey && samePassagePoint(tile, frame.prey) &&
              <ChartSprite src={prey.src} rect={prey.rect} kind="prey" />}
            {player && <span className={styles.pointer}>◆</span>}
          </span>;
        }))}
      </div>
      <p className={styles.legend} aria-live="polite">{place} · Appuis prêts {state.supports.length}/2</p>
      <div className={styles.controls} aria-label="Déplacement">
        {directions.map(direction => <button key={direction.key} type="button" onClick={() => move(direction)}
          disabled={Boolean(playback)}><span aria-hidden="true">{direction.symbol} </span>{direction.label}</button>)}
      </div>
      <div className={styles.controls}>
        {sideHere && !state.supports.includes(sideHere) && <button type="button"
          onClick={() => perform({ type: "prepare", side: sideHere })}>
          Préparer l’appui {MENTORING_SIDE_LABEL[sideHere]}
        </button>}
        {atPost && state.supports.length === 2 && !state.attempt && <>
          <button type="button" onClick={() => perform({ type: "begin", choice: "hint" })}>Donner un indice</button>
          <button type="button" onClick={() => perform({ type: "begin", choice: "alone" })}>Laisser le novice tenter seul</button>
        </>}
        {((atPost && observed === 0) || (atLookout && observed === 1)) && <button type="button"
          disabled={Boolean(playback)} onClick={() => perform({ type: "watch" })}>
          {observed === 0 ? "Observer son choix" : "Observer l’approche"}
        </button>}
        {atMentor && observed === 2 && <button type="button" onClick={() => perform({ type: "report" })}>
          Consigner la chasse
        </button>}
      </div>
    </>}
    <p role="status" className={styles.status}>{playback ? playback.frames[0].cue ?? "Le novice avance à couvert." :
      state.resolved ? "" : message}</p>
  </section>;
}
