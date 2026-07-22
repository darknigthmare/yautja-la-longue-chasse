"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  ECOLOGY_V8_CATEGORIES,
  ECOLOGY_V8_PLANETS,
  ecologyV8ForPlanet,
  type EcologyV8Category,
  type EcologyV8Distribution,
  type EcologyV8PlanetId,
} from "./ecologyV8";

const CATEGORY_LABELS: Record<EcologyV8Category, string> = {
  fauna: "Faune",
  flora: "Flore hostile",
  humanoid: "Humanoïdes",
  "bad-blood": "Bad Blood",
  other: "Autres",
};

type CategoryFilter = "all" | EcologyV8Category;
type DistributionFilter = "all" | EcologyV8Distribution;

export default function EnemyBestiaryV8() {
  const [planetId, setPlanetId] = useState<EcologyV8PlanetId>(
    ECOLOGY_V8_PLANETS[0].id,
  );
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [distribution, setDistribution] =
    useState<DistributionFilter>("all");

  const planet = useMemo(
    () =>
      ECOLOGY_V8_PLANETS.find((candidate) => candidate.id === planetId) ??
      ECOLOGY_V8_PLANETS[0],
    [planetId],
  );
  const planetEnemies = useMemo(() => ecologyV8ForPlanet(planet.id), [planet]);
  const visibleEnemies = useMemo(
    () =>
      planetEnemies.filter(
        (enemy) =>
          (category === "all" || enemy.category === category) &&
          (distribution === "all" || enemy.distribution === distribution),
      ),
    [category, distribution, planetEnemies],
  );

  return (
    <section className="enemy-bestiary-v8" aria-labelledby="enemy-bestiary-v8-title">
      <header className="enemy-bestiary-v8-heading">
        <div>
          <p className="eyebrow">Archive écologique // V8</p>
          <h2 id="enemy-bestiary-v8-title">Écosystèmes planétaires</h2>
          <p>
            Chaque monde possède 30 rencontres : 24 espèces endémiques et 6
            menaces voyageuses. Chaque créature utilise une planche d&apos;animation
            indépendante en six poses.
          </p>
        </div>
        <span className="enemy-bestiary-count" aria-live="polite">
          {visibleEnemies.length} / 30
        </span>
      </header>

      <nav className="ecology-planet-tabs" aria-label="Choisir une planète">
        {ECOLOGY_V8_PLANETS.map((candidate) => (
          <button
            className={candidate.id === planet.id ? "selected" : ""}
            type="button"
            key={candidate.id}
            aria-pressed={candidate.id === planet.id}
            onClick={() => {
              setPlanetId(candidate.id);
              setCategory("all");
              setDistribution("all");
            }}
          >
            <strong>{candidate.name}</strong>
            <span>{candidate.biomeLabel}</span>
          </button>
        ))}
      </nav>

      <div className="ecology-planet-brief">
        <div>
          <span>Planète sélectionnée</span>
          <strong>{planet.name}</strong>
        </div>
        <p>{planet.description}</p>
        <dl>
          <div><dt>Endémiques</dt><dd>24</dd></div>
          <div><dt>Communes</dt><dd>6</dd></div>
          <div><dt>Total</dt><dd>30</dd></div>
        </dl>
      </div>

      <div className="ecology-filter-row">
        <nav className="enemy-bestiary-filters" aria-label="Filtrer par catégorie">
          <button
            className={category === "all" ? "selected" : ""}
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            Toutes · 30
          </button>
          {ECOLOGY_V8_CATEGORIES.map((candidate) => {
            const count = planetEnemies.filter(
              (enemy) => enemy.category === candidate,
            ).length;
            return (
              <button
                className={category === candidate ? "selected" : ""}
                type="button"
                key={candidate}
                aria-pressed={category === candidate}
                onClick={() => setCategory(candidate)}
              >
                {CATEGORY_LABELS[candidate]} · {count}
              </button>
            );
          })}
        </nav>
        <nav className="ecology-distribution-filter" aria-label="Filtrer par origine">
          {(["all", "endemic", "common"] as const).map((candidate) => (
            <button
              className={distribution === candidate ? "selected" : ""}
              type="button"
              key={candidate}
              aria-pressed={distribution === candidate}
              onClick={() => setDistribution(candidate)}
            >
              {candidate === "all"
                ? "Toutes origines"
                : candidate === "endemic"
                  ? "Endémiques · 24"
                  : "Communes · 6"}
            </button>
          ))}
        </nav>
      </div>

      <div className="enemy-bestiary-grid">
        {visibleEnemies.map((enemy) => (
          <article
            className={`enemy-bestiary-card category-${enemy.category}`}
            key={enemy.id}
          >
            <figure>
              <div
                className="enemy-sprite-preview"
                role="img"
                aria-label={`${enemy.name}, planche d'animation en six poses`}
              >
                <img
                  className="enemy-sprite-preview-track"
                  src={enemy.sheetPath}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ animationDuration: `${Math.max(2.6, 4.8 - enemy.threat * 0.35)}s` }}
                />
              </div>
              <figcaption>
                <span>{CATEGORY_LABELS[enemy.category]}</span>
                <strong>Menace {enemy.threat}/4</strong>
              </figcaption>
            </figure>
            <div className="enemy-bestiary-card-copy">
              <div className="ecology-card-kicker">
                <span className={`distribution-${enemy.distribution}`}>
                  {enemy.distribution === "endemic" ? "Endémique" : "Commune"}
                </span>
                <span>{enemy.role}</span>
              </div>
              <h3>{enemy.name}</h3>
              <p>{enemy.behavior}</p>
              <dl>
                <div>
                  <dt>Trophée</dt>
                  <dd>{enemy.trophy}</dd>
                </div>
                <div>
                  <dt>Présence</dt>
                  <dd>
                    {enemy.distribution === "endemic"
                      ? planet.name
                      : `${enemy.planetIds.length} mondes`}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
