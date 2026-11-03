"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  ENEMY_V7_CATEGORIES,
  ENEMY_V7_DEFINITIONS,
  ENEMY_V7_FRAME_LABELS,
  type EnemyV7Category,
} from "./enemyRosterV7";
import EnemyTrophyPreview from "./EnemyTrophyPreview";

const CATEGORY_LABELS: Record<EnemyV7Category, string> = {
  fauna: "Faune",
  flora: "Flore hostile",
  humanoid: "Humanoïdes",
  "bad-blood": "Bad Blood",
  other: "Autres",
};

type EnemyFilter = "all" | EnemyV7Category;

export default function EnemyBestiaryV7() {
  const [filter, setFilter] = useState<EnemyFilter>("all");
  const visibleEnemies = useMemo(
    () =>
      filter === "all"
        ? ENEMY_V7_DEFINITIONS
        : ENEMY_V7_DEFINITIONS.filter((enemy) => enemy.category === filter),
    [filter],
  );

  return (
    <section className="enemy-bestiary-v7" aria-labelledby="enemy-bestiary-v7-title">
      <header className="enemy-bestiary-v7-heading">
        <div>
          <p className="eyebrow">Archives du clan // Étude biologique</p>
          <h2 id="enemy-bestiary-v7-title">30 menaces répertoriées</h2>
          <p>
            Chaque adversaire est étudié selon six attitudes :{" "}
            {ENEMY_V7_FRAME_LABELS.join(" · ")}.
          </p>
        </div>
        <span className="enemy-bestiary-count" aria-live="polite">
          {visibleEnemies.length} / {ENEMY_V7_DEFINITIONS.length}
        </span>
      </header>

      <nav className="enemy-bestiary-filters" aria-label="Filtrer le bestiaire">
        <button
          className={filter === "all" ? "selected" : ""}
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Toutes · 30
        </button>
        {ENEMY_V7_CATEGORIES.map((category) => {
          const count = ENEMY_V7_DEFINITIONS.filter(
            (enemy) => enemy.category === category,
          ).length;
          return (
            <button
              className={filter === category ? "selected" : ""}
              type="button"
              key={category}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {CATEGORY_LABELS[category]} · {count}
            </button>
          );
        })}
      </nav>

      <div className="enemy-bestiary-grid">
        {visibleEnemies.map((enemy) => (
          <article className={`enemy-bestiary-card category-${enemy.category}`} key={enemy.id}>
            <figure>
              <div
                className="enemy-sprite-preview"
                role="img"
                aria-label={`${enemy.name}, étude en six attitudes : ${ENEMY_V7_FRAME_LABELS.join(", ")}`}
              >
                <img
                  className="enemy-sprite-preview-track"
                  src={enemy.sheetPath}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    animationDuration: `${Math.max(2.4, 16 / enemy.animationFps).toFixed(2)}s`,
                  }}
                />
              </div>
              <figcaption>
                <span>{enemy.categoryLabel}</span>
                <strong>Menace {enemy.threat}/4</strong>
              </figcaption>
            </figure>
            <div className="enemy-bestiary-card-copy">
              <h3>{enemy.name}</h3>
              <p className="enemy-role">{enemy.role}</p>
              <p>{enemy.behavior}</p>
              <EnemyTrophyPreview
                enemyId={enemy.id}
                consumer="enemy-bestiary-v7"
              />
              <dl>
                <div>
                  <dt>Trophée</dt>
                  <dd>{enemy.trophy}</dd>
                </div>
                <div>
                  <dt>Origine visuelle</dt>
                  <dd>
                    {enemy.provenance === "canon-remix"
                      ? "Référence canon, représentation originale"
                      : "Extension originale du lore"}
                  </dd>
                </div>
              </dl>
              <nav aria-label={`Références de ${enemy.name}`}>
                {enemy.sourceUrls.map((sourceUrl, index) => (
                  <a href={sourceUrl} key={sourceUrl} rel="noreferrer" target="_blank">
                    Source {index + 1}
                  </a>
                ))}
              </nav>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
