import type { MissionId, SaveGame } from "./types";
import {
  rankTrialViewsV168,
  TRIAL_RANK_LABELS_V168,
  type RankTrialPartIdV168,
  type RankTrialViewContextV168,
} from "./systems/rankTrialsV168";

/**
 * V168 : volet d'épreuve de rang joué par la chasse du briefing. Engager
 * l'épreuve fait compter la prochaine chasse de cette mission comme tentative.
 */
export function RankTrialBriefingV168({
  save,
  missionId,
  context,
  busy,
  onArm,
  onDisarm,
}: {
  save: SaveGame;
  missionId: MissionId;
  context?: RankTrialViewContextV168;
  busy: boolean;
  onArm: (partId: RankTrialPartIdV168) => void;
  onDisarm: () => void;
}) {
  const entries = rankTrialViewsV168(save, context).flatMap((view) =>
    view.parts
      .filter(({ part }) => part.kind === "hunt" && part.hunt?.missionId === missionId)
      .map((partView) => ({ view, partView })),
  );
  if (entries.length === 0) return null;
  return (
    <section className="briefing-rank-trial" aria-label="Épreuve de rang" data-rank-trial-briefing-v168>
      {entries.map(({ view, partView }) => {
        const { part, done, armed, attempts, lastFailureReasons, conditions, blockers } = partView;
        const label = TRIAL_RANK_LABELS_V168[view.trial.rankId];
        return (
          <div key={part.id}>
            <small>Épreuve du rang {label} · bible : {view.trial.bibleTrial}</small>
            <strong>{part.label}</strong>
            <p>{view.statusLabel}</p>
            {view.status === "unlocked" && !done && (
              <>
                <p>Conditions : {conditions.join(", ")}.{attempts > 0 ? ` Tentatives : ${attempts}.` : ""}</p>
                {lastFailureReasons.length > 0 && <p>Dernier échec : {lastFailureReasons.join(" ")} Nouvel essai possible.</p>}
                {blockers.length > 0 && <p>Obstacle : {blockers.join(" ")}</p>}
                {part.missingContent && <p>Substitut proposé. Contenu de la bible absent : {part.missingContent}</p>}
                {armed ? (
                  <button type="button" className="ghost-button" disabled={busy} onClick={onDisarm}>
                    Épreuve engagée · revenir à une chasse ordinaire
                  </button>
                ) : (
                  <button type="button" className="ghost-button" disabled={busy} onClick={() => onArm(part.id)}>
                    Engager l’épreuve du rang {label}
                  </button>
                )}
              </>
            )}
            {view.status === "unlocked" && done && <p>Volet réussi ; le rang attend les autres volets.</p>}
          </div>
        );
      })}
    </section>
  );
}
