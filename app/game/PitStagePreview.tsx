"use client";
import { useEffect, useRef, useState } from "react";
import { createPitCombatState, PIT_ARENAS, type PitArenaId } from "./systems/pitCombat";
import { loadPitArenaArt, drawPitArenaBackdrop, drawPitArenaForeground } from "./pitArenaRendering";
import type { PitPresentationCamera } from "./systems/pitCamera";
import styles from "./PitSelectionFlow.module.css";

export type PitStagePreviewStatus = "loading" | "ready" | "failed";

/** The preview uses the combat renderer and its real independent planes. */
export default function PitStagePreview({ arenaId, reducedMotion, highContrast, onStatus }: {
  arenaId: PitArenaId; reducedMotion: boolean; highContrast: boolean;
  onStatus: (arenaId: PitArenaId, status: PitStagePreviewStatus) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ id: PitArenaId; status: PitStagePreviewStatus } | null>(null);
  const status = result?.id === arenaId ? result.status : "loading";
  useEffect(() => {
    const controller = new AbortController(); let frame = 0;
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    onStatus(arenaId, "loading");
    if (!canvas || !context) {
      if (canvas) canvas.dataset.previewStatus = "failed";
      setResult({ id: arenaId, status: "failed" });
      onStatus(arenaId, "failed");
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.dataset.previewStatus = "loading";
    void loadPitArenaArt(arenaId, { signal: controller.signal }).then(bank => {
      if (controller.signal.aborted) return;
      if (bank.cancelled || bank.unavailable || bank.failedPaths.size) throw new Error("Incomplete stage preview");
      const arena = PIT_ARENAS[arenaId], state = createPitCombatState("jungle-hunter", "berserker", { arenaId });
      const startedAt = performance.now();
      const draw = (now: number) => {
        if (controller.signal.aborted) return;
        const elapsed = reducedMotion ? 0 : (now - startedAt) / 1000;
        state.frame = Math.floor(elapsed * 60);
        const camera: PitPresentationCamera = { arenaId, frame: state.frame, mode: reducedMotion ? "fixed" : "follow", centerX: arena.width / 2 + Math.sin(elapsed * .35) * 32, centerY: arena.height / 2, zoom: 1.04, targetZoom: 1.04 };
        context.clearRect(0, 0, canvas.width, canvas.height);
        const back = drawPitArenaBackdrop(context, state, camera, bank, { reducedMotion, highContrast });
        const front = drawPitArenaForeground(context, state, camera, bank, { reducedMotion, highContrast });
        canvas.dataset.previewPlanes = [...back.drawnPlanes, ...front.drawnPlanes].join(",");
        canvas.dataset.previewFrame = String(state.frame);
        canvas.dataset.previewCameraX = String(camera.centerX);
        if (!reducedMotion) frame = requestAnimationFrame(draw);
      };
      draw(startedAt); canvas.dataset.previewStatus = "ready";
      setResult({ id: arenaId, status: "ready" }); onStatus(arenaId, "ready");
    }).catch(() => {
      if (controller.signal.aborted) return;
      canvas.dataset.previewStatus = "failed";
      setResult({ id: arenaId, status: "failed" }); onStatus(arenaId, "failed");
    });
    return () => { controller.abort(); cancelAnimationFrame(frame); };
  }, [arenaId, reducedMotion, highContrast, retry, onStatus]);
  return <div className={styles.stageCanvasShell} aria-busy={status === "loading"}>
    <canvas ref={canvasRef} width={960} height={540} role="img" aria-label={`Aperçu des plans réels de ${PIT_ARENAS[arenaId].name}`} data-pit-stage-preview={arenaId} />
    {status !== "ready" ? <div className={styles.previewNotice} role="status">{status === "loading" ? "Chargement des plans du stage…" : <><span>Aperçu indisponible. Le combat n’est pas lancé.</span><button type="button" onClick={() => { setResult(null); setRetry(value => value + 1); }}>Réessayer l’aperçu</button></>}</div> : null}
  </div>;
}
