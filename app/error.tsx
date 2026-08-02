"use client";

import { useEffect } from "react";

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Yautja game route failed", error);
  }, [error]);

  return (
    <main className="game-shell" aria-label="Erreur de la partie">
      <section className="screen title-screen" aria-labelledby="error-title">
        <div className="screen-safe">
          <p className="eyebrow">Système de bord // récupération</p>
          <h1 id="error-title">La chasse est interrompue</h1>
          <p>
            Le journal de progression reste sur cet appareil. Tentez de
            relancer l’interface ou revenez au sas principal.
          </p>
          <div className="title-actions">
            <button type="button" className="alien-button" onClick={reset}>
              Relancer
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => window.location.reload()}
            >
              Revenir au sas
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
