"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { ARMORS, CODEX_ENTRIES, DIFFICULTIES, GEAR, WEAPONS } from "../game/data";
import { HUNTER_PRESETS, appearanceForPreset } from "../game/hunterLore";
import { normalizeSave, recordInfractionOnSaveV147 } from "../game/save";
import { INFRACTIONS_V147 } from "../game/systems/honorTribunalV147";
import type { ShipProgressionState } from "../game/systems/progression";
import type { SaveGame } from "../game/types";
import type { HomeworldService } from "../game/systems/homeworld";
import { DEV_DESTINATIONS } from "./destinations";
import styles from "./session.module.css";

const ShipHub = lazy(() => import("../game/ShipHub"));
const HunterRigPreview = lazy(() => import("../game/HunterRigPreview"));
const HonorTribunalPanelV147 = lazy(() => import("../game/HonorTribunalPanelV147"));

/** Test dossier only: one accusation piece, one piece of each defence kind, one witness of each side. */
function recordTestInfractionV147(save: SaveGame, kind: (typeof INFRACTIONS_V147)[number]["id"], jurisdiction: "internal" | "inter-clan") {
  return recordInfractionOnSaveV147(save, {
    kind, jurisdiction, recordedAt: new Date().toISOString(),
    witnesses: [
      { id: "test-accuser", name: "Accusateur de test", role: "accuser", account: "confirms-accusation" },
      { id: "test-companion", name: "Compagnon de test", role: "companion", account: "confirms-player" },
      { id: "test-pack", name: "Membre du pack de test", role: "pack", account: "confirms-accusation" },
    ],
    traces: [
      { id: "test-act", kind: "mask-recording", label: "Enregistrement du masque (test)", shows: "act" },
      { id: "test-constraint", kind: "trace", label: "Traces d'une contrainte (test)", shows: "constraint" },
      { id: "test-contrary", kind: "trophy-provenance", label: "Provenance du trophée (test)", shows: "contrary" },
    ],
  });
}

export type DevService = HomeworldService | "map" | "airlock" | "armory" | "customization" | "trophies" | "codex" |
  "medbay" | "training" | "settings" | "clan-war" | "pit" | "justice" | "mausoleum";

interface DevServicesProps {
  service: DevService;
  save: SaveGame;
  progression: ShipProgressionState;
  host: string;
  onSave: (save: SaveGame) => void;
  onProgressionChange: (state: ShipProgressionState) => void;
  onNotify: (message: string) => void;
  onClose: () => void;
  onService: (service: DevService) => void;
  onTravel: (destinationId: string) => void;
}

const TITLES: Record<DevService, string> = {
  mobility: "Comptoir des convois — campagne",
  map: "Destinations de test", airlock: "Sas — rejoindre un lieu", armory: "Armurerie de test",
  customization: "Apparence du chasseur de test", trophies: "Salle des trophées", codex: "Archives du clan",
  medbay: "Baie médicale", training: "Entraînement", settings: "Paramètres de cet essai",
  "clan-war": "Conseil — guerre des clans", pit: "THE PIT", justice: "Tribunal du clan", mausoleum: "Mausolée",
};

/** Small test controls where the campaign's UI is embedded inside GameClient.
 * Existing standalone medbay/training panels retain their real rules. */
export default function DevServices({ service, save, progression, host, onSave, onProgressionChange, onNotify, onClose, onService, onTravel }: DevServicesProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  const visitable = service === "map"
    ? DEV_DESTINATIONS.filter(destination => destination.kind === "mission")
    : DEV_DESTINATIONS.filter(destination => destination.kind === "ship" || destination.id === "clan-docking" || destination.id === "homeworld-port");
  const nativeService = service === "medbay" || service === "training";
  const applyEquipment = (next: SaveGame) => {
    // Reuse the game's ownership, uniqueness and carrying-capacity rules.
    // normalizeSave is a pure reducer; the test host remains the sole owner.
    const normalized = normalizeSave(next);
    onSave(normalized);
    if (JSON.stringify(normalized.loadout) !== JSON.stringify(next.loadout)) {
      onNotify("Équipement de test ajusté à la capacité de l’armure.");
    }
  };

  return <section className={styles.service} data-dev-service={service} aria-label={TITLES[service]} onKeyDown={event => {
    // Native training and ship panels own Escape while they are mounted.
    if (!nativeService && event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault(); event.stopPropagation(); onClose();
    }
  }}>
    <header className={styles.serviceHeader}>
      <div><span className={styles.eyebrow}>{host} · ESSAI TEMPORAIRE</span><h2>{TITLES[service]}</h2></div>
      <button ref={backRef} type="button" onClick={onClose} data-dev-service-back>Revenir dans le lieu</button>
    </header>
    <p className={styles.scope}>Les réglages et résultats restent dans cet essai. Changer de destination crée un nouveau chasseur de test.</p>

    {(service === "map" || service === "airlock") && <div className={styles.destinationGrid}>
      {visitable.map(destination => <button type="button" key={destination.id} onClick={() => onTravel(destination.id)}>
        <strong>{destination.label}</strong><span>{destination.description}</span><span>Rejoindre ce lieu →</span>
      </button>)}
    </div>}

    {service === "armory" && <div className={styles.form}>
      <label>Armure<select value={save.loadout.armorId} onChange={event => {
        const armor = ARMORS.find(entry => entry.id === event.target.value);
        if (armor) applyEquipment({ ...save, loadout: { ...save.loadout, armorId: armor.id } });
      }}>{ARMORS.filter(entry => save.inventory.unlockedArmorIds.includes(entry.id)).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      {([0, 1] as const).map(slot => <label key={`weapon-${slot}`}>Arme {slot + 1}<select value={save.loadout.weaponIds[slot]} onChange={event => {
        const weapon = WEAPONS.find(entry => entry.id === event.target.value);
        if (!weapon || save.loadout.weaponIds[slot === 0 ? 1 : 0] === weapon.id) return;
        const ids: SaveGame["loadout"]["weaponIds"] = [...save.loadout.weaponIds]; ids[slot] = weapon.id;
        applyEquipment({ ...save, loadout: { ...save.loadout, weaponIds: ids } });
      }}>{WEAPONS.filter(entry => save.inventory.unlockedWeaponIds.includes(entry.id)).map(entry => <option key={entry.id} value={entry.id} disabled={save.loadout.weaponIds[slot === 0 ? 1 : 0] === entry.id}>{entry.name}</option>)}</select></label>)}
      {([0, 1] as const).map(slot => <label key={`gear-${slot}`}>Équipement {slot + 1}<select value={save.loadout.gearIds[slot]} onChange={event => {
        const gear = GEAR.find(entry => entry.id === event.target.value);
        if (!gear || save.loadout.gearIds[slot === 0 ? 1 : 0] === gear.id) return;
        const ids: SaveGame["loadout"]["gearIds"] = [...save.loadout.gearIds]; ids[slot] = gear.id;
        applyEquipment({ ...save, loadout: { ...save.loadout, gearIds: ids } });
      }}>{GEAR.filter(entry => save.inventory.unlockedGearIds.includes(entry.id)).map(entry => <option key={entry.id} value={entry.id} disabled={save.loadout.gearIds[slot === 0 ? 1 : 0] === entry.id}>{entry.name}</option>)}</select></label>)}
      <p>Ferme ce panneau pour voir l’équipement dans le lieu. Ces choix ne débloquent rien dans la campagne.</p>
    </div>}

    {service === "customization" && <div className={styles.form}>
      <label>Apparence<select value={save.appearance.presetId} onChange={event => {
        const preset = HUNTER_PRESETS.find(entry => entry.id === event.target.value);
        if (preset) onSave({ ...save, appearance: appearanceForPreset(preset.id) });
      }}>{HUNTER_PRESETS.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <Suspense fallback={<p>Chargement de l’apparence…</p>}><HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={save.loadout.weaponIds} gearIds={save.loadout.gearIds} size={280} /></Suspense>
    </div>}

    {service === "codex" && <div className={styles.entries}>
      {CODEX_ENTRIES.map(entry => <details key={entry.id}><summary>{entry.title}</summary><p>{entry.text}</p></details>)}
    </div>}

    {service === "trophies" && <div className={styles.empty}>
      <h3>Un chasseur de test sans trophée de campagne</h3>
      <p>La salle reste parcourable. Cet essai n’importe pas ta collection et n’attribue pas de trophées à ta partie.</p>
      <button type="button" onClick={() => onService("map")}>Tester une chasse</button>
    </div>}

    {service === "settings" && <div className={styles.form}>
      <label>Difficulté<select value={save.settings.difficultyId} onChange={event => {
        const difficulty = DIFFICULTIES.find(entry => entry.id === event.target.value);
        if (difficulty) onSave({ ...save, settings: { ...save.settings, difficultyId: difficulty.id } });
      }}>{DIFFICULTIES.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" checked={save.settings.reducedGore} onChange={event => onSave({ ...save, settings: { ...save.settings, reducedGore: event.target.checked } })} />Gore réduit</label>
      <label className={styles.check}><input type="checkbox" checked={save.settings.screenShake} onChange={event => onSave({ ...save, settings: { ...save.settings, screenShake: event.target.checked } })} />Secousses de caméra</label>
      <p>Ces paramètres appartiennent à la session de test et ne remplacent pas ceux de ta partie.</p>
    </div>}

    {nativeService && <Suspense fallback={<div className={styles.loading} role="status">Chargement du service…</div>}><ShipHub
      embedded
      roomLocked
      save={save}
      progression={progression}
      initialRoomId={service}
      installationLabel={`${host} // Test temporaire`}
      controlBindings={save.settings.controlBindings}
      onProgressionChange={onProgressionChange}
      onOpenDeck={onClose}
      onOpenMap={() => onService("map")}
      onOpenArmory={() => onService("armory")}
      onOpenTrophies={() => onService("trophies")}
      onOpenArchives={() => onService("codex")}
      onOpenCustomization={() => onService("customization")}
      onApplyLoadout={(loadout, appearance) => applyEquipment({ ...save, loadout, appearance })}
      onNotify={onNotify}
    /></Suspense>}

    {service === "justice" && <div className={styles.form}>
      <p>Tribunal V147 · inscrire une infraction de test pour jouer un procès. Ce dossier reste dans cet essai.</p>
      {INFRACTIONS_V147.map(definition => <div key={definition.id}>
        {(["internal", "inter-clan"] as const).map(jurisdiction => <button type="button" key={jurisdiction} onClick={() => {
          const recorded = recordTestInfractionV147(save, definition.id, jurisdiction);
          if (recorded) onSave(normalizeSave({ ...save, tribunalV147: recorded.tribunalV147 }));
          else onNotify("Registre des infractions plein dans cet essai.");
        }}>{definition.label} · {jurisdiction === "internal" ? "affaire interne" : "entre clans"}</button>)}
      </div>)}
      <Suspense fallback={<p>Chargement du tribunal…</p>}><HonorTribunalPanelV147 save={save} onNotify={onNotify}
        onCommit={update => { onSave(normalizeSave({ ...save, ...update })); return true; }} /></Suspense>
    </div>}

    {["mobility", "clan-war", "pit", "mausoleum"].includes(service) && <div className={styles.empty}>
      <h3>Service de campagne</h3>
      {service === "mobility" && <p data-dev-mobility-readonly>Le prêt, le permis, les achats et l’entretien utilisent le registre de ta campagne. Cet essai ne crée aucun véhicule et ne dépense aucune marque.</p>}
      <p>Tu peux explorer ce lieu dans l’essai. Ce service complet conserve sa progression propre et s’ouvre depuis la campagne.</p>
      <p>Reviens dans le lieu pour continuer sa visite ou choisis un autre point de test avec la barre supérieure.</p>
      <button type="button" onClick={onClose}>Continuer la visite</button>
    </div>}
  </section>;
}
