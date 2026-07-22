"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  CATALOGUE_RECONSTRUCTION_WARNING,
  catalogueReferenceUrlsForEntry,
  catalogueSelectionForEntry,
  filterCatalogueEntries,
  isCatalogueEntryPlayable,
  paginateCatalogueEntries,
  type CataloguePlayableSelection,
} from "./catalogueAppearance";
import {
  CATALOGUE_ROSTER,
  type CatalogueContinuity,
  type CatalogueEntryKind,
  type CatalogueStableId,
  type CatalogueYautjaEntry,
} from "./catalogueRoster";
import { HUNTER_PRESET_BY_ID, type HunterLorePresetId } from "./hunterLore";

export interface CatalogueHunterBrowserProps {
  readonly entries?: readonly CatalogueYautjaEntry[];
  readonly pageSize?: number;
  readonly initialQuery?: string;
  readonly selectedEntryId?: CatalogueStableId | null;
  readonly onSelect: (
    entry: CatalogueYautjaEntry,
    selection: CataloguePlayableSelection,
  ) => void;
}

const KIND_LABELS: Readonly<Record<CatalogueEntryKind, string>> = {
  individual: "Individus jouables",
  alias: "Alias",
  group: "Groupes et clans",
  rank: "Rangs et classes",
};

const CONTINUITY_LABELS: Readonly<Record<CatalogueContinuity, string>> = {
  canon: "Écran / canon",
  expanded: "Univers étendu",
  fan: "Fan-made",
};

function resetPageAfter<T>(
  setter: (value: T) => void,
  value: T,
  reset: () => void,
) {
  setter(value);
  reset();
}

export function referenceUrlsForCatalogueEntry(
  entry: CatalogueYautjaEntry,
): readonly string[] {
  return catalogueReferenceUrlsForEntry(entry);
}

export function CatalogueHunterBrowser({
  entries = CATALOGUE_ROSTER,
  pageSize,
  initialQuery = "",
  selectedEntryId = null,
  onSelect,
}: CatalogueHunterBrowserProps) {
  const idPrefix = useId();
  const [query, setQuery] = useState(initialQuery);
  const [media, setMedia] = useState<string | "all">("all");
  const [kind, setKind] = useState<CatalogueEntryKind | "all">("all");
  const [continuity, setContinuity] = useState<
    CatalogueContinuity | "all"
  >("all");
  const [page, setPage] = useState(1);
  const [automaticPageSize, setAutomaticPageSize] = useState(9);

  useEffect(() => {
    if (pageSize !== undefined) return;
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updatePageSize = () => {
      setAutomaticPageSize(mediaQuery.matches ? 6 : 18);
      setPage(1);
    };
    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, [pageSize]);

  const resolvedPageSize = Math.max(1, pageSize ?? automaticPageSize);
  const playableEntries = entries.filter(isCatalogueEntryPlayable);
  const directPlayableCount = playableEntries.filter(
    (entry) => entry.presetIds.length > 0,
  ).length;
  const reconstructedPlayableCount = playableEntries.length - directPlayableCount;

  const mediaOptions = useMemo(
    () =>
      Array.from(new Set(entries.flatMap((entry) => entry.media))).sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    [entries],
  );
  const filteredEntries = useMemo(
    () =>
      filterCatalogueEntries(entries, {
        query,
        media,
        kind,
        continuity,
      }),
    [continuity, entries, kind, media, query],
  );
  const cataloguePage = useMemo(
    () => paginateCatalogueEntries(filteredEntries, page, resolvedPageSize),
    [filteredEntries, page, resolvedPageSize],
  );
  const resetPage = () => setPage(1);
  const visibleStart = cataloguePage.total === 0 ? 0 : cataloguePage.startIndex + 1;

  const onQueryChange = (event: ChangeEvent<HTMLInputElement>) =>
    resetPageAfter(setQuery, event.currentTarget.value, resetPage);
  const onMediaChange = (event: ChangeEvent<HTMLSelectElement>) =>
    resetPageAfter(setMedia, event.currentTarget.value, resetPage);
  const onKindChange = (event: ChangeEvent<HTMLSelectElement>) =>
    resetPageAfter(
      setKind,
      event.currentTarget.value as CatalogueEntryKind | "all",
      resetPage,
    );
  const onContinuityChange = (event: ChangeEvent<HTMLSelectElement>) =>
    resetPageAfter(
      setContinuity,
      event.currentTarget.value as CatalogueContinuity | "all",
      resetPage,
    );

  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const navigationKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (![...navigationKeys, "Home", "End"].includes(event.key)) return;

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-catalogue-playable='true']:not(:disabled)",
      ),
    );
    const currentIndex = buttons.indexOf(event.target as HTMLButtonElement);
    if (currentIndex < 0 || buttons.length === 0) return;

    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }

    event.preventDefault();
    buttons[nextIndex]?.focus();
  };

  const selectEntry = (
    entry: CatalogueYautjaEntry,
    presetId?: HunterLorePresetId,
  ) => {
    if (!isCatalogueEntryPlayable(entry)) return;
    onSelect(entry, catalogueSelectionForEntry(entry, presetId));
  };

  return (
    <section
      className="catalogueHunterBrowser"
      aria-labelledby={`${idPrefix}-title`}
    >
      <header className="catalogueHunterBrowser__header">
        <div>
          <p className="catalogueHunterBrowser__eyebrow">ARCHIVES YAUTJA</p>
          <h2 id={`${idPrefix}-title`}>Catalogue tous médias</h2>
        </div>
        <p className="catalogueHunterBrowser__summary">
          {entries.length} entrées consultables · {playableEntries.length} individus
          jouables · {directPlayableCount} profils directs ·{" "}
          {reconstructedPlayableCount} reconstructions signalées
        </p>
      </header>

      <p className="catalogueHunterBrowser__provenance" role="note">
        Un profil direct charge sa plaque et son preset documenté. Une
        reconstruction reste une approximation modulaire fondée sur la fiche du
        personnage et une base visuelle distinctement citée ; elle n’est jamais
        présentée comme une reproduction individuelle exacte.
      </p>

      <form
        className="catalogueHunterBrowser__filters"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="catalogueHunterBrowser__filter">
          <label htmlFor={`${idPrefix}-query`}>Rechercher</label>
          <input
            id={`${idPrefix}-query`}
            type="search"
            value={query}
            onChange={onQueryChange}
            placeholder="Nom, alias, œuvre, identifiant…"
            autoComplete="off"
          />
        </div>

        <div className="catalogueHunterBrowser__filter">
          <label htmlFor={`${idPrefix}-media`}>Média</label>
          <select id={`${idPrefix}-media`} value={media} onChange={onMediaChange}>
            <option value="all">Tous les médias</option>
            {mediaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="catalogueHunterBrowser__filter">
          <label htmlFor={`${idPrefix}-kind`}>Type</label>
          <select id={`${idPrefix}-kind`} value={kind} onChange={onKindChange}>
            <option value="all">Tous les types</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="catalogueHunterBrowser__filter">
          <label htmlFor={`${idPrefix}-continuity`}>Statut</label>
          <select
            id={`${idPrefix}-continuity`}
            value={continuity}
            onChange={onContinuityChange}
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(CONTINUITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p
        className="catalogueHunterBrowser__resultCount"
        role="status"
        aria-live="polite"
      >
        {cataloguePage.total === 0
          ? "Aucune entrée ne correspond aux filtres."
          : `${visibleStart}–${cataloguePage.endIndex} sur ${cataloguePage.total} entrées`}
      </p>

      <div
        className="catalogueHunterBrowser__grid"
        role="list"
        onKeyDown={onResultsKeyDown}
      >
        {cataloguePage.items.map((entry) => {
          const playable = isCatalogueEntryPlayable(entry);
          const reconstructed = playable && entry.presetIds.length === 0;
          const selected = selectedEntryId === entry.id;
          const titleId = `${idPrefix}-${entry.id}-title`;
          const referenceUrls = referenceUrlsForCatalogueEntry(entry);

          return (
            <article
              key={entry.id}
              className="catalogueHunterBrowser__card"
              role="listitem"
              aria-labelledby={titleId}
              aria-current={selected ? "true" : undefined}
              data-selected={selected || undefined}
            >
              <header className="catalogueHunterBrowser__cardHeader">
                <span className="catalogueHunterBrowser__id">{entry.id}</span>
                <span className="catalogueHunterBrowser__status">
                  {CONTINUITY_LABELS[entry.continuity]}
                </span>
              </header>
              <h3 id={titleId}>{entry.name}</h3>
              <p className="catalogueHunterBrowser__work">
                {entry.work} · {entry.year ?? "année non renseignée"}
              </p>
              <dl className="catalogueHunterBrowser__details">
                <div>
                  <dt>Type</dt>
                  <dd>{KIND_LABELS[entry.kind]}</dd>
                </div>
                <div>
                  <dt>Média</dt>
                  <dd>{entry.media.join(", ")}</dd>
                </div>
                {entry.aliases.length > 0 ? (
                  <div>
                    <dt>Alias</dt>
                    <dd>{entry.aliases.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
              {entry.notes ? (
                <p className="catalogueHunterBrowser__notes">{entry.notes}</p>
              ) : null}

              <nav
                className="catalogueHunterBrowser__sources"
                aria-label={`Références de ${entry.name}`}
              >
                <span className="catalogueHunterBrowser__sourcesLabel">
                  {reconstructed
                    ? "Sources fiche + base visuelle"
                    : "Références"}
                </span>
                {referenceUrls.length > 0 ? (
                  referenceUrls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source {index + 1}
                    </a>
                  ))
                ) : (
                  <span className="catalogueHunterBrowser__sourceMissing">
                    Source manquante dans le classeur et les presets associés
                  </span>
                )}
              </nav>

              {reconstructed ? (
                <p className="catalogueHunterBrowser__warning" role="note">
                  {CATALOGUE_RECONSTRUCTION_WARNING}
                </p>
              ) : null}

              <footer className="catalogueHunterBrowser__actions">
                {!playable ? (
                  <span className="catalogueHunterBrowser__readOnly">
                    Consultation uniquement
                  </span>
                ) : entry.presetIds.length > 0 ? (
                  entry.presetIds.map((presetId) => (
                    <button
                      key={presetId}
                      type="button"
                      data-catalogue-playable="true"
                      onClick={() => selectEntry(entry, presetId)}
                      aria-label={`Jouer ${entry.name} avec le preset ${HUNTER_PRESET_BY_ID[presetId].name}`}
                    >
                      Jouer · {HUNTER_PRESET_BY_ID[presetId].name}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    data-catalogue-playable="true"
                    onClick={() => selectEntry(entry)}
                    aria-label={`Jouer ${entry.name} avec sa reconstruction modulaire`}
                  >
                    Jouer la reconstruction
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      <nav
        className="catalogueHunterBrowser__pagination"
        aria-label="Pagination du catalogue Yautja"
      >
        <button
          type="button"
          onClick={() => setPage(Math.max(1, cataloguePage.page - 1))}
          disabled={cataloguePage.page <= 1}
        >
          Page précédente
        </button>
        <span aria-live="polite">
          Page {cataloguePage.page} sur {cataloguePage.pageCount}
        </span>
        <button
          type="button"
          onClick={() =>
            setPage(Math.min(cataloguePage.pageCount, cataloguePage.page + 1))
          }
          disabled={cataloguePage.page >= cataloguePage.pageCount}
        >
          Page suivante
        </button>
      </nav>
    </section>
  );
}
