"use client";
/**
 * V146 customisation workshop (campaign bible, "Personnalisation"):
 * per-piece colours in three zones plus light, glowing effects, skin pattern,
 * earned marks, saved outfits, one outfit per mode, share codes, clan palette
 * and forge repair of heavy wear. Draft-only until the player confirms.
 */
import { useEffect, useMemo, useState } from "react";
import type { HunterAppearance, SaveGame } from "./types";
import {
  HUNTER_LIGHT_IDS_V146, HUNTER_LIGHT_LABELS_V146, HUNTER_PIECES_V146,
  normalizeHexV146, type HunterLightIdV146, type HunterPieceIdV146,
  type PieceColorsV146, type PieceZoneV146,
} from "./hunterPiecesV146";
import { CHROMATIC_PALETTE_PRESETS_V115 } from "./hunterChromaticsV113";
import {
  CUSTOMIZATION_MODES_V146, HUNTER_MARKS_V146, OUTFIT_SLOTS_V146, SKIN_PATTERN_IDS_V146,
  assignModeOutfitV146, clanColorsForNpcV146, decodeOutfitShareCodeV146, deleteOutfitV146,
  earnedCosmeticsV146, effectivePrimaryV146, emptyCustomizationV146, encodeOutfitShareCodeV146,
  payRepairFromArchiveV146, repairCostV146, repairPieceV146, saveOutfitV146,
  type CustomizationModeV146, type CustomizationV146, type HunterMarkIdV146, type SkinPatternIdV146,
} from "./systems/hunterCustomizationV146";
import { normalizeHunterAppearanceV146 } from "./save";
import styles from "./HunterPieceForgeV146.module.css";

type Tab = "pieces" | "lights" | "body" | "outfits" | "clan" | "forge";
const TABS: readonly [Tab, string][] = [
  ["pieces", "Pièces"], ["lights", "Lumières"], ["body", "Motifs et marques"],
  ["outfits", "Tenues"], ["clan", "Couleurs du clan"], ["forge", "Réparations"],
];
const MODE_LABELS: Record<CustomizationModeV146, string> = { campaign: "Campagne", multiplayer: "Multijoueur", pit: "Pit" };
const ZONES: readonly PieceZoneV146[] = ["primary", "secondary", "accent"];
const ZONE_LABELS: Record<PieceZoneV146, string> = { primary: "Principale", secondary: "Secondaire", accent: "Accent" };
const PATTERN_LABELS: Record<SkinPatternIdV146, string> = {
  spots: "Taches", stripes: "Rayures", marbled: "Marbrures", scales: "Écailles", bands: "Bandes",
};
const EMPTY: PieceColorsV146 = { primary: null, secondary: null, accent: null, light: null };

export type CustomizationApplyV146 = (save: SaveGame) => SaveGame | null;

export default function HunterPieceForgeV146({
  save, disabled = false, onPreview, onCommit,
}: {
  save: SaveGame;
  disabled?: boolean;
  /** Draft appearance for the preview; null restores the saved one. */
  onPreview?: (appearance: HunterAppearance | null) => void;
  /** Durable change; returns true once the campaign write is confirmed. */
  onCommit: (apply: CustomizationApplyV146, confirmation: string) => boolean;
}) {
  const [tab, setTab] = useState<Tab>("pieces");
  const [draft, setDraft] = useState<HunterAppearance>(() => normalizeHunterAppearanceV146(save.appearance));
  const [pieceId, setPieceId] = useState<HunterPieceIdV146>("chest");
  const [message, setMessage] = useState("");
  const [outfitName, setOutfitName] = useState("");
  const [shareInput, setShareInput] = useState("");
  const customization: CustomizationV146 = save.customizationV146 ?? emptyCustomizationV146();
  const earned = useMemo(() => earnedCosmeticsV146({
    honor: save.profile.honor, rankId: save.profile.rankId, trophies: save.trophies,
    justiceDeclaration: save.justice?.declaration,
  }, customization.earned), [save, customization.earned]);

  useEffect(() => { onPreview?.(draft); }, [draft, onPreview]);
  useEffect(() => () => onPreview?.(null), [onPreview]);

  const dirty = JSON.stringify(normalizeHunterAppearanceV146(draft)) !==
    JSON.stringify(normalizeHunterAppearanceV146(save.appearance));
  const piece = HUNTER_PIECES_V146.find(item => item.id === pieceId)!;
  const colors = draft.piecesV146?.[pieceId] ?? EMPTY;

  const setPieceColor = (zone: keyof PieceColorsV146, value: string | null) => setDraft(current => {
    const pieces = { ...(current.piecesV146 ?? {}) };
    const next = { ...(pieces[pieceId] ?? EMPTY), [zone]: value };
    if (!next.primary && !next.secondary && !next.accent && !next.light) delete pieces[pieceId];
    else pieces[pieceId] = next;
    return { ...current, presetId: "custom", piecesV146: pieces };
  });
  const setLight = (id: HunterLightIdV146, value: string | null) => setDraft(current => {
    const lights = { ...(current.lightsV146 ?? {}) };
    if (value) lights[id] = value; else delete lights[id];
    return { ...current, presetId: "custom", lightsV146: lights };
  });
  const setMark = (id: HunterMarkIdV146, shown: boolean, color: string | null = null) => setDraft(current => {
    const marks = { ...(current.marksV146 ?? {}) };
    if (shown) marks[id] = { color }; else delete marks[id];
    return { ...current, presetId: "custom", marksV146: marks };
  });

  const commit = (apply: CustomizationApplyV146, confirmation: string) => {
    if (disabled) return;
    setMessage(onCommit(apply, confirmation) ? confirmation : "Changement non enregistré : la sauvegarde n'a pas confirmé l'écriture.");
  };
  const commitAppearance = () => commit(current => ({
    ...current, appearance: normalizeHunterAppearanceV146(draft),
    customizationV146: { ...(current.customizationV146 ?? emptyCustomizationV146()), earned },
  }), "Couleurs enregistrées dans la campagne.");
  const withCustomization = (change: (state: CustomizationV146) => CustomizationV146): CustomizationApplyV146 =>
    current => ({ ...current, customizationV146: change({ ...(current.customizationV146 ?? emptyCustomizationV146()), earned }) });

  const zoneInput = (zone: keyof PieceColorsV146, label: string) => {
    const fallback = zone === "primary" ? effectivePrimaryV146(draft, pieceId) : null;
    const value = colors[zone] ?? fallback ?? "#808080";
    return <label key={zone} className={styles.zone}>
      <span>{label}</span>
      <input type="color" value={value} disabled={disabled}
        onChange={event => setPieceColor(zone, normalizeHexV146(event.target.value))} />
      <button type="button" className={styles.link} disabled={disabled || !colors[zone]}
        onClick={() => setPieceColor(zone, null)}>Par défaut</button>
    </label>;
  };

  return <section className={styles.forge} aria-label="Atelier de personnalisation par pièce" data-hunter-pieces-v146>
    <header className={styles.heading}>
      <h2>Atelier des pièces</h2>
      <p>Chaque pièce se teint en trois zones, plus sa lumière quand elle brille. La roue de couleurs est libre ; motifs, matières et marques se gagnent en chasse.</p>
    </header>
    <div className={styles.tabs} role="tablist">
      {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id}
        className={tab === id ? styles.active : undefined} onClick={() => setTab(id)}>{label}</button>)}
    </div>

    {tab === "pieces" && <div className={styles.panel}>
      <ul className={styles.pieceList}>
        {HUNTER_PIECES_V146.map(item => <li key={item.id}>
          <button type="button" aria-pressed={item.id === pieceId} onClick={() => setPieceId(item.id)}
            className={item.id === pieceId ? styles.active : undefined}>
            <span className={styles.swatch} style={{ background: draft.piecesV146?.[item.id]?.primary ?? effectivePrimaryV146(draft, item.id) ?? "transparent" }} />
            {item.label}
          </button>
        </li>)}
      </ul>
      <div className={styles.editor}>
        <h3>{piece.label}</h3>
        {ZONES.map(zone => piece.zones[zone] ? zoneInput(zone, `${ZONE_LABELS[zone]} : ${piece.zones[zone]}`) : null)}
        {piece.light && zoneInput("light", `Lumière : ${piece.light}`)}
        {piece.channel && <div className={styles.presets} aria-label="Teintes du clan">
          {CHROMATIC_PALETTE_PRESETS_V115.filter(item => item.channel === piece.channel).map(item =>
            <button key={item.hex} type="button" title={item.label} disabled={disabled}
              style={{ background: item.hex }} onClick={() => setPieceColor("primary", item.hex)}>
              <span className={styles.visuallyHidden}>{item.label}</span></button>)}
        </div>}
        <p className={styles.note}>{piece.channel
          ? "Aperçu : la couleur principale s'applique déjà à cette pièce. Les zones secondaire, accent et lumière s'afficheront avec les planches V146 (base grise et carte des zones)."
          : "Couleurs enregistrées. Cette pièce n'a pas encore de calque teintable : elles s'afficheront avec ses planches V146."}</p>
      </div>
    </div>}

    {tab === "lights" && <div className={styles.panel}>
      {HUNTER_LIGHT_IDS_V146.map(id => <label key={id} className={styles.zone}>
        <span>{HUNTER_LIGHT_LABELS_V146[id]}</span>
        <input type="color" value={draft.lightsV146?.[id] ?? "#ff302a"} disabled={disabled}
          onChange={event => setLight(id, normalizeHexV146(event.target.value))} />
        <button type="button" className={styles.link} disabled={disabled || !draft.lightsV146?.[id]}
          onClick={() => setLight(id, null)}>Par défaut</button>
      </label>)}
      <p className={styles.note}>Le laser se voit déjà en jeu et dans l&apos;aperçu. Le sang reste vert (canon).</p>
    </div>}

    {tab === "body" && <div className={styles.panel}>
      <fieldset className={styles.group}>
        <legend>Motif de peau</legend>
        <label><input type="radio" name="pattern-v146" checked={!draft.skinPatternIdV146}
          onChange={() => setDraft(current => ({ ...current, skinPatternIdV146: null }))} /> Aucun</label>
        {SKIN_PATTERN_IDS_V146.map(id => {
          const unlocked = earned.includes("pattern:" + id);
          return <label key={id} data-locked={!unlocked}>
            <input type="radio" name="pattern-v146" disabled={disabled || !unlocked}
              checked={draft.skinPatternIdV146 === id}
              onChange={() => setDraft(current => ({ ...current, presetId: "custom", skinPatternIdV146: id }))} />
            {PATTERN_LABELS[id]}{unlocked ? "" : " (à gagner)"}
          </label>;
        })}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Marques gagnées</legend>
        {HUNTER_MARKS_V146.map(mark => {
          const unlocked = earned.includes("mark:" + mark.id);
          const shown = !!draft.marksV146?.[mark.id];
          return <div key={mark.id} className={styles.mark} data-locked={!unlocked}>
            <label><input type="checkbox" checked={shown} disabled={disabled || !unlocked}
              onChange={event => setMark(mark.id, event.target.checked, draft.marksV146?.[mark.id]?.color ?? null)} />
              {mark.label}</label>
            {unlocked
              ? <input type="color" aria-label={`Couleur : ${mark.label}`} disabled={disabled || !shown}
                value={draft.marksV146?.[mark.id]?.color ?? mark.defaultColor}
                onChange={event => setMark(mark.id, true, normalizeHexV146(event.target.value))} />
              : <small>{mark.how}</small>}
          </div>;
        })}
      </fieldset>
    </div>}

    {tab === "outfits" && <div className={styles.panel}>
      <label className={styles.zone}><span>Nom de la tenue</span>
        <input type="text" maxLength={40} value={outfitName} onChange={event => setOutfitName(event.target.value)} /></label>
      <ol className={styles.slots}>
        {Array.from({ length: OUTFIT_SLOTS_V146 }, (_, slot) => {
          const outfit = customization.outfits[slot];
          return <li key={slot}>
            <strong>{outfit ? outfit.name : `Emplacement ${slot + 1} (vide)`}</strong>
            <button type="button" disabled={disabled} onClick={() => commit(
              withCustomization(state => saveOutfitV146(state, slot, outfitName || outfit?.name || "", normalizeHunterAppearanceV146(draft))),
              "Tenue enregistrée.")}>Enregistrer ici</button>
            {outfit && <button type="button" disabled={disabled}
              onClick={() => setDraft(normalizeHunterAppearanceV146(outfit.appearance))}>Essayer</button>}
            {outfit && <button type="button" disabled={disabled} onClick={() => commit(
              withCustomization(state => deleteOutfitV146(state, slot)), "Tenue supprimée.")}>Supprimer</button>}
          </li>;
        })}
      </ol>
      <fieldset className={styles.group}>
        <legend>Tenue par mode</legend>
        {CUSTOMIZATION_MODES_V146.map(mode => <label key={mode} className={styles.zone}>
          <span>{MODE_LABELS[mode]}</span>
          <select disabled={disabled} value={customization.modeOutfits[mode] ?? ""}
            onChange={event => commit(withCustomization(state => assignModeOutfitV146(state, mode,
              event.target.value === "" ? null : Number(event.target.value))), "Tenue du mode enregistrée.")}>
            <option value="">Apparence actuelle</option>
            {customization.outfits.map((outfit, slot) => outfit &&
              <option key={slot} value={slot}>{outfit.name}</option>)}
          </select>
        </label>)}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Code de partage</legend>
        <textarea readOnly rows={3} value={encodeOutfitShareCodeV146(normalizeHunterAppearanceV146(draft) as unknown as Record<string, unknown>)} />
        <textarea rows={3} placeholder="Coller un code YLC1..." value={shareInput}
          onChange={event => setShareInput(event.target.value)} />
        <button type="button" disabled={disabled || !shareInput.trim()} onClick={() => {
          const decoded = decodeOutfitShareCodeV146(shareInput, raw =>
            normalizeHunterAppearanceV146(raw) as unknown as Record<string, unknown>, earned);
          if (!decoded.ok) { setMessage(decoded.reason === "version" ? "Code d'une version plus récente." : "Code illisible."); return; }
          setDraft(normalizeHunterAppearanceV146(decoded.appearance));
          setMessage(decoded.replaced.length
            ? `Tenue chargée. Remplacé par la pièce de base (non débloqué ici) : ${decoded.replaced.join(", ")}.`
            : "Tenue chargée dans l'aperçu. Confirme pour l'enregistrer.");
        }}>Charger le code</button>
      </fieldset>
    </div>}

    {tab === "clan" && <ClanPaletteEditor customization={customization} disabled={disabled}
      onSave={palette => commit(withCustomization(state => ({ ...state, clanPalette: palette })), "Couleurs du clan enregistrées.")} />}

    {tab === "forge" && <div className={styles.panel}>
      {Object.keys(customization.heavyWear).length === 0
        ? <p>Aucune pièce fissurée. Les éraflures de mission disparaissent au retour au navire.</p>
        : <ul className={styles.slots}>
          {(Object.entries(customization.heavyWear) as [HunterPieceIdV146, number][]).map(([id, level]) => {
            const cost = repairCostV146(customization, id);
            return <li key={id}>
              <strong>{HUNTER_PIECES_V146.find(p => p.id === id)?.label} : usure {level}/3</strong>
              <button type="button" disabled={disabled} onClick={() => commit(current => {
                const archive = payRepairFromArchiveV146(current.inventory.harvestV112.archive, cost);
                if (!archive) return null;
                return {
                  ...current,
                  inventory: { ...current.inventory, harvestV112: { ...current.inventory.harvestV112, archive } },
                  customizationV146: repairPieceV146(current.customizationV146 ?? emptyCustomizationV146(), id),
                };
              }, "Pièce réparée à la forge.")}>Réparer ({cost} matériaux)</button>
            </li>;
          })}
        </ul>}
      <p className={styles.note}>Les matériaux viennent de l&apos;archive des prélèvements (récolte).</p>
    </div>}

    <footer className={styles.footer}>
      <button type="button" className="alien-button" disabled={disabled || !dirty} onClick={commitAppearance}>Confirmer les couleurs</button>
      <button type="button" className="ghost-button" disabled={disabled || !dirty}
        onClick={() => setDraft(normalizeHunterAppearanceV146(save.appearance))}>Annuler</button>
      <p role="status" aria-live="polite">{message}</p>
    </footer>
  </section>;
}

function ClanPaletteEditor({ customization, disabled, onSave }: {
  customization: CustomizationV146; disabled: boolean;
  onSave: (palette: CustomizationV146["clanPalette"]) => void;
}) {
  const [palette, setPalette] = useState(customization.clanPalette ?? { primary: "#98704b", secondary: "#3b2f27", accent: "#c9a24a" });
  return <div className={styles.panel}>
    {(["primary", "secondary", "accent"] as const).map(zone => <label key={zone} className={styles.zone}>
      <span>{ZONE_LABELS[zone]}</span>
      <input type="color" value={palette[zone]} disabled={disabled}
        onChange={event => setPalette(current => ({ ...current, [zone]: normalizeHexV146(event.target.value) ?? current[zone] }))} />
    </label>)}
    <p>Membres du clan (petites variations individuelles) :</p>
    <div className={styles.presets}>
      {["gardien", "pisteuse", "forgeron", "ancien"].map(npc => {
        const colors = clanColorsForNpcV146(palette, npc);
        return <span key={npc} title={npc} className={styles.npc}>
          <i style={{ background: colors.primary }} /><i style={{ background: colors.secondary }} /><i style={{ background: colors.accent }} />
        </span>;
      })}
    </div>
    <button type="button" disabled={disabled} onClick={() => onSave(palette)}>Enregistrer les couleurs du clan</button>
    {customization.clanPalette && <button type="button" disabled={disabled} onClick={() => onSave(null)}>Retirer</button>}
  </div>;
}
