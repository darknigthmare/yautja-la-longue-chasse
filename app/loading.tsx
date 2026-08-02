export default function LoadingGame() {
  return (
    <main className="game-shell" aria-label="Chargement du jeu">
      <section className="screen title-screen">
        <div className="screen-safe" role="status" aria-live="polite">
          <p className="eyebrow">Système de bord // initialisation</p>
          <h1>Préparation de la chasse…</h1>
          <p>Synchronisation du vaisseau, du codex et de l’arsenal.</p>
        </div>
      </section>
    </main>
  );
}
