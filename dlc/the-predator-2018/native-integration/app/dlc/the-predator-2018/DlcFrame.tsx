"use client";

/* THE_PREDATOR_2018_NATIVE_ROUTE */
import { useEffect, useRef, useState } from "react";
import {
  createThePredator2018Command,
  isThePredator2018RuntimeMessage,
} from "../../game/dlc/the-predator-2018/hostBridge";
import { THE_PREDATOR_2018_INTEGRATION_CONTRACT } from "../../game/dlc/the-predator-2018/integrationContract";

const MIRROR_KEY = THE_PREDATOR_2018_INTEGRATION_CONTRACT.hostMirrorKey;

export default function DlcFrame() {
  const [status, setStatus] = useState("Initialisation du DLC…");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const send = (command: "snapshot" | "pause" | "resume", args: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      createThePredator2018Command(command, args),
      window.location.origin,
    );
  };

  useEffect(() => {
    const persistMirror = (value: unknown) => {
      try {
        sessionStorage.setItem(MIRROR_KEY, JSON.stringify(value));
      } catch {
        // La sauvegarde v5 du runtime reste la source de vérité si le miroir est indisponible.
      }
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || !isThePredator2018RuntimeMessage(event.data)) {
        return;
      }
      const data = event.data;
      window.dispatchEvent(
        new CustomEvent(THE_PREDATOR_2018_INTEGRATION_CONTRACT.eventName, { detail: data }),
      );

      if (data.type === "ready") {
        setStatus(`DLC ${data.version} prêt · protocole ${data.protocol}`);
        send("snapshot");
      } else if (data.type === "checkpoint") {
        const payload = data.payload ?? {};
        setStatus(
          `Checkpoint · ${String(payload.scene ?? "")} · zone ${Number(payload.room ?? 0) + 1}`,
        );
        persistMirror({ version: data.version, type: data.type, payload, ts: data.ts });
      } else if (data.type === "mirror-complete") {
        setStatus(`Événement miroir ${String(data.payload?.event ?? "")} maîtrisé`);
        persistMirror({ version: data.version, type: data.type, payload: data.payload, ts: data.ts });
      } else if (data.type === "scene-complete") {
        setStatus(`Séquence ${String(data.payload?.scene ?? "")} terminée`);
      } else if (data.type === "campaign-complete") {
        setStatus("Campagne DLC terminée");
      } else if (data.type === "command-ack" && data.payload?.command === "snapshot") {
        persistMirror({ version: data.version, type: data.type, payload: data.payload, ts: data.ts });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main
      style={{
        width: "100vw",
        height: "100svh",
        margin: 0,
        background: "#010403",
        position: "relative",
      }}
    >
      <iframe
        ref={iframeRef}
        title="The Predator 2018 — Chasse croisée"
        src="/dlc/the-predator-2018/index.html"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        allow="fullscreen"
      />
      <nav
        aria-label="Navigation du DLC"
        style={{
          position: "fixed",
          left: 12,
          top: 12,
          zIndex: 50,
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "7px 9px",
          border: "1px solid rgba(164,255,103,.28)",
          background: "rgba(3,8,7,.88)",
          color: "#d9ccb0",
          font: "12px system-ui, sans-serif",
        }}
      >
        <a href="/" style={{ color: "#c8f58e", textDecoration: "none", fontWeight: 700 }}>
          ← La Longue Chasse
        </a>
        <button type="button" onClick={() => send("pause", { value: true })}>Pause</button>
        <button type="button" onClick={() => send("pause", { value: false })}>Reprendre</button>
        <span aria-live="polite" style={{ opacity: 0.72 }}>{status}</span>
      </nav>
    </main>
  );
}
