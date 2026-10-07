"use client";

import { useEffect, useRef, useState } from "react";
import type { ShipId } from "./shipCatalogue";
import { SHIP_LEVEL_ROOMS } from "./systems/shipLevelLayout";
import { readBibleDocumentV85, readBibleShipExerciseSettingsV85 as settingsFrom, type BibleShipExerciseSettingsV85 as ExerciseSource } from "./systems/bibleSourceV85";
import { SHIP_SPATIAL_STOPS_V85, shipReturnRoomsV85, type ShipCargoV85, type ShipCommittedDepartureV85,
  type ShipPersonReturnV85, type ShipCargoReturnV85, type ShipReturnReceiptV85, type ShipTravellerV85 } from "./systems/shipOperationsV85";
import styles from "./ShipManifestExerciseV85.module.css";
import { createBibleLoadGateV85, fetchBibleDocumentsV85 } from "./systems/bibleResourceV85";

interface ExercisePerson extends ShipTravellerV85 { player: boolean }
const CONDITION_LABELS = { fit: "Apte", wounded: "Blessé", missing: "Disparu", dead: "Mort" } as const;
const ROLE_LABELS = { hunter: "Chasseur", crew: "Équipage", escort: "Escorte", medic: "Soins", guest: "Invité" } as const;
const PURPOSE_LABELS = { "personal-kit": "Kit personnel", delivery: "Livraison", loan: "Prêt", return: "Restitution" } as const;
const DISPOSITION_LABELS = { retained: "Conservé à bord", delivered: "Livré", "returned-to-owner": "Restitué au propriétaire", abandoned: "Abandonné" } as const;
const ROOM_USES: Record<string, string> = {
  "galaxy-map": "Vérifier la route, l’escale et le retour.", "wall-armory": "Ranger le kit conservé et identifier les prêts à restituer.",
  "clan-archives": "Consigner le témoignage, les pertes et les livraisons.", "appearance-forge": "Entretenir les parures déjà possédées, sans en attribuer de nouvelles.",
  "trophy-hall": "Présenter seulement une prise réellement rapportée ; cet exercice n’en crée aucune.", "medical-bay": "Organiser la prise en charge des blessés, sans guérison automatique.",
  "training-arena": "Transmettre les observations des voyageurs revenus.", "launch-airlock": "Contrôler les présences et le chargement avant embarquement.",
};

/** Free exercise state remains in this component; it never reaches campaign saves. */
export default function ShipManifestExerciseV85({ shipId, hunterName, sourceUrl }: { shipId: ShipId; hunterName: string; sourceUrl?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [cache, setCache] = useState<{ origin: string; settings: ExerciseSource } | null>(null);
  const [loadMode, setLoadMode] = useState<"remote" | "local">("remote");
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [networkFailure, setNetworkFailure] = useState<{ key: string; message: string } | null>(null);
  const [tier, setTier] = useState("");
  const [people, setPeople] = useState<ExercisePerson[]>([{ id: "exercise-person-1", name: hunterName, player: true, role: "hunter", condition: "fit", branchId: "exercise-origin" }]);
  const [cargo, setCargo] = useState<ShipCargoV85[]>([]);
  const [acquired, setAcquired] = useState(false);
  const [spacesReady, setSpacesReady] = useState(false);
  const [careReady, setCareReady] = useState(false);
  const [cargoReady, setCargoReady] = useState(false);
  const [returnReady, setReturnReady] = useState(false);
  const [origin, setOrigin] = useState<string>(SHIP_SPATIAL_STOPS_V85[0].id);
  const [destination, setDestination] = useState<string>(SHIP_SPATIAL_STOPS_V85[1].id);
  const [departure, setDeparture] = useState<ShipCommittedDepartureV85 | null>(null);
  const [returnPeople, setReturnPeople] = useState<ShipPersonReturnV85[]>([]);
  const [returnCargo, setReturnCargo] = useState<ShipCargoReturnV85[]>([]);
  const [witness, setWitness] = useState("");
  const [receipt, setReceipt] = useState<ShipReturnReceiptV85 | null>(null);
  const nextId = useRef(2);
  const request = useRef(createBibleLoadGateV85());
  const source = cache && (cache.origin === "local" || cache.origin === sourceUrl) ? cache.settings : null;
  const networkError = networkFailure && networkFailure.key === sourceUrl ? networkFailure.message : "";
  const networkNeeded = expanded && loadMode === "remote" && Boolean(sourceUrl) && !source && !networkError;
  const loading = localLoading || networkNeeded;
  const error = localError || networkError;
  const currentTier = source?.tiers.find(entry => String(entry.level) === tier);
  const wounded = people.filter(person => person.condition === "wounded").length;
  const players = people.filter(person => person.player).length;
  const normalizedNames = people.map(person => person.name.trim().toLocaleLowerCase("fr"));
  const missing = [
    ...(!currentTier || !source ? ["Charger les capacités du scénario depuis l’extraction V6."] : []),
    ...(!acquired || !spacesReady ? ["Confirmer l’acquisition et les espaces prêts pour ce scénario d’exercice."] : []),
    ...(players < 1 || (source && players > source.maxPlayers) ? ["Inscrire un joueur au minimum, sans dépasser la limite du scénario coopératif."] : []),
    ...(people[0]?.player ? [] : ["Le joueur occupe la première place du manifeste de cet exercice."]),
    ...(currentTier && people.length > currentTier.persons ? [`Capacité dépassée : ${people.length} personnes pour ${currentTier.persons}.`] : []),
    ...(normalizedNames.some(name => !name) || new Set(normalizedNames).size !== people.length ? ["Donner une identité distincte à chaque voyageur."] : []),
    ...(origin === destination ? ["Choisir une escale différente du départ."] : []),
    ...(wounded > 0 && !careReady ? ["Confirmer la prise en charge adaptée aux blessés de cet exercice."] : []),
    ...(cargo.length > 0 && (!cargoReady || cargo.some(item => !item.name.trim() || !item.ownerId.trim())) ? ["Confirmer le rangement et le propriétaire de chaque objet."] : []),
    ...(!returnReady ? ["Réserver le moyen de retour avant l’embarquement simulé."] : []),
  ];

  useEffect(() => {
    if (!networkNeeded || !sourceUrl) return;
    const ticket = request.current.begin();
    fetchBibleDocumentsV85([sourceUrl], window.location.href, ticket.signal).then(documents => {
      const result = settingsFrom(documents[0]);
      if (ticket.isCurrent()) { setCache({ origin: sourceUrl, settings: result }); setTier(String(result.tiers[0].level)); }
    }).catch(reason => { if (ticket.isCurrent()) setNetworkFailure({ key: sourceUrl, message: reason instanceof Error ? reason.message : "Lecture impossible." }); });
    return () => ticket.cancel();
  }, [networkNeeded, sourceUrl]);
  useEffect(() => { const gate = request.current; return () => gate.cancel(); }, []);
  const usePublicSource = () => {
    request.current.cancel(); setLocalLoading(false); setLocalError(""); setNetworkFailure(null); setLoadMode("remote"); setCache(null);
  };

  const importLocal = async (file: File | undefined) => {
    if (!file) return;
    const ticket = request.current.begin();
    setLoadMode("local"); setLocalLoading(true); setLocalError(""); setNetworkFailure(null);
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error("Ce fichier dépasse la taille admise pour l’extraction V6.");
      const result = settingsFrom(readBibleDocumentV85(JSON.parse(await file.text())));
      if (ticket.isCurrent()) { setCache({ origin: "local", settings: result }); setTier(String(result.tiers[0].level)); }
    } catch (reason) { if (ticket.isCurrent()) setLocalError(reason instanceof Error ? reason.message : "Lecture impossible."); }
    finally { if (ticket.isCurrent()) setLocalLoading(false); }
  };
  const embark = () => {
    if (missing.length || departure) return;
    // This snapshot is an exercise, never a travel authorization or fuel debit.
    const snapshot: ShipCommittedDepartureV85 = { manifest: {
      id: `free-manifest-${nextId.current++}`, ownerSaveCreatedAt: "free-exercise-v85", shipId, kind: "spatial",
      originId: origin, destinationId: destination, originBranchId: "exercise-origin", destinationBranchId: "exercise-origin",
      travellers: people.map(person => ({ ...person })), cargo: cargo.map(item => ({ ...item })), outwardFuel: 0, returnFuelReserve: 0,
    }, returnAnchorId: "exercise-return-only", returnFuelReserve: 0 };
    setDeparture(snapshot); setReturnPeople(snapshot.manifest.travellers.map(person => ({ id: person.id, condition: person.condition })));
    setReturnCargo(snapshot.manifest.cargo.map(item => ({ id: item.id, disposition: "retained" }))); setWitness(""); setReceipt(null);
  };
  const confirmReturn = () => {
    if (!departure || !witness.trim() || receipt) return;
    const result: ShipReturnReceiptV85 = { operationId: departure.manifest.id, ownerSaveCreatedAt: "free-exercise-v85", branchId: "exercise-origin", people: returnPeople, cargo: returnCargo, witness: witness.trim() };
    if (shipReturnRoomsV85(departure, result)) setReceipt(result);
  };
  const rooms = departure && receipt ? shipReturnRoomsV85(departure, receipt) : null;

  return <details className={styles.exercise} onToggle={event => { const open = event.currentTarget.open; setExpanded(open); if (!open) { request.current.cancel(); setLocalLoading(false); } }} onKeyDown={event => event.stopPropagation()}>
    <summary>Exercice libre de manifeste et retour</summary>
    <p className={styles.notice}>État séparé en mémoire : aucun départ de campagne, équipage recruté, trophée, carburant consommé ou XP. Les capacités appartiennent au scénario original de navire de clan V6 ; elles ne décrivent pas la coque canonique affichée au hangar.</p>
    <fieldset disabled={departure !== null}><legend>Source et préparation du scénario</legend>
      <label>Extraction V6 locale <input type="file" accept=".json,application/json" onChange={event => { void importLocal(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>
      <small>bible-ships.json reste dans ce navigateur, sans upload. Aucune capacité de chargement ou masse canonique n’est inventée.</small>
      {sourceUrl && <button type="button" onClick={usePublicSource}>Recharger les réglages publics</button>}
      {loading && <p role="status">Lecture des réglages…</p>}{error && <p role="alert">{error}</p>}
      <div className={styles.row}><label>Palier du scénario <select value={tier} onChange={event => setTier(event.currentTarget.value)} disabled={!source}><option value="">Source requise</option>{source?.tiers.map(entry => <option key={entry.level} value={entry.level}>Palier {entry.level} · {entry.persons} places</option>)}</select></label>
        <label>Origine <select value={origin} onChange={event => setOrigin(event.currentTarget.value)}>{SHIP_SPATIAL_STOPS_V85.map(stop => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></label>
        <label>Escale <select value={destination} onChange={event => setDestination(event.currentTarget.value)}>{SHIP_SPATIAL_STOPS_V85.map(stop => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></label></div>
      {source && <p>{people.length}/{currentTier?.persons ?? "—"} personnes · {players}/{source.maxPlayers} joueurs simulés. Le scénario coopératif ne connecte aucun joueur réel.</p>}
      <div className={styles.checks}><label><input type="checkbox" checked={acquired} onChange={event => setAcquired(event.currentTarget.checked)} />Navire acquis dans le scénario</label><label><input type="checkbox" checked={spacesReady} onChange={event => setSpacesReady(event.currentTarget.checked)} />Espaces du palier prêts</label></div>
      <h4>Voyageurs de l’exercice</h4>{people.map(person => <div className={styles.row} key={person.id}>
        <label>Identité <input value={person.name} maxLength={120} onChange={event => { const name = event.currentTarget.value; setPeople(current => current.map(entry => entry.id === person.id ? { ...entry, name } : entry)); }} /></label>
        <label>Type <select value={person.player ? "player" : "npc"} onChange={event => { const player = event.currentTarget.value === "player"; setPeople(current => current.map(entry => entry.id === person.id ? { ...entry, player } : entry)); }}><option value="player">Joueur simulé</option><option value="npc">PNJ</option></select></label>
        <label>Fonction <select value={person.role} onChange={event => { const role = event.currentTarget.value as ShipTravellerV85["role"]; setPeople(current => current.map(entry => entry.id === person.id ? { ...entry, role } : entry)); }}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>État <select value={person.condition} onChange={event => { const condition = event.currentTarget.value as "fit" | "wounded"; setPeople(current => current.map(entry => entry.id === person.id ? { ...entry, condition } : entry)); }}><option value="fit">Apte</option><option value="wounded">Blessé</option></select></label>
        <button type="button" onClick={() => setPeople(current => current.filter(entry => entry.id !== person.id))}>Retirer</button></div>)}
      <div className={styles.actions}><button type="button" onClick={() => setPeople(current => [...current, { id: `exercise-person-${nextId.current++}`, name: "", player: false, role: "crew", condition: "fit", branchId: "exercise-origin" }])}>Ajouter un voyageur</button>
        {source?.occupants.length ? <button type="button" onClick={() => setPeople((source?.occupants ?? []).map(person => ({ ...person, id: `exercise-person-${nextId.current++}`, condition: "fit" as const, branchId: "exercise-origin" })))}>Charger le manifeste d’exemple du classeur</button> : null}</div>
      <label className={styles.check}><input type="checkbox" checked={careReady} onChange={event => setCareReady(event.currentTarget.checked)} />Prise en charge adaptée aux {wounded} blessé(s) confirmée dans l’exercice</label>
      <h4>Objets identifiés, livraisons et prêts</h4>{cargo.map(item => <div className={styles.row} key={item.id}>
        <label>Objet <input value={item.name} maxLength={120} onChange={event => { const name = event.currentTarget.value; setCargo(current => current.map(entry => entry.id === item.id ? { ...entry, name } : entry)); }} /></label>
        <label>Propriétaire <input value={item.ownerId} maxLength={120} onChange={event => { const ownerId = event.currentTarget.value; setCargo(current => current.map(entry => entry.id === item.id ? { ...entry, ownerId } : entry)); }} /></label>
        <label>Usage <select value={item.purpose} onChange={event => { const purpose = event.currentTarget.value as ShipCargoV85["purpose"]; setCargo(current => current.map(entry => entry.id === item.id ? { ...entry, purpose } : entry)); }}>{Object.entries(PURPOSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={() => setCargo(current => current.filter(entry => entry.id !== item.id))}>Retirer</button></div>)}
      <button type="button" onClick={() => setCargo(current => [...current, { id: `exercise-cargo-${nextId.current++}`, name: "", ownerId: "", units: 1, purpose: "personal-kit", branchId: "exercise-origin" }])}>Ajouter un objet identifié</button>
      <div className={styles.checks}><label><input type="checkbox" checked={cargoReady} onChange={event => setCargoReady(event.currentTarget.checked)} />Rangement et arrimage des objets confirmés</label><label><input type="checkbox" checked={returnReady} onChange={event => setReturnReady(event.currentTarget.checked)} />Moyen de retour réservé avant départ</label></div>
      {missing.length > 0 && <ul>{missing.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      <button type="button" disabled={missing.length > 0 || loading} onClick={embark}>Embarquer ce scénario libre</button>
    </fieldset>
    {departure && <section className={styles.return}><h4>Rapport du retour simulé</h4><p>Manifeste figé : {departure.manifest.travellers.length} voyageurs et {departure.manifest.cargo.length} objets identifiés. Le retour ne recrée aucune identité.</p>
      <fieldset disabled={receipt !== null}><legend>Dispositions de chaque personne et objet</legend>{returnPeople.map(person => <label key={person.id}>{departure.manifest.travellers.find(entry => entry.id === person.id)?.name}<select value={person.condition} onChange={event => { const condition = event.currentTarget.value as ShipPersonReturnV85["condition"]; setReturnPeople(current => current.map(entry => entry.id === person.id ? { ...entry, condition } : entry)); }}>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
        {returnCargo.map(item => <label key={item.id}>{departure.manifest.cargo.find(entry => entry.id === item.id)?.name}<select value={item.disposition} onChange={event => { const disposition = event.currentTarget.value as ShipCargoReturnV85["disposition"]; setReturnCargo(current => current.map(entry => entry.id === item.id ? { ...entry, disposition } : entry)); }}>{Object.entries(DISPOSITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
        <label>Témoignage de l’exercice <textarea value={witness} maxLength={160} onChange={event => setWitness(event.currentTarget.value)} /></label><button type="button" disabled={!witness.trim()} onClick={confirmReturn}>Consigner ce retour</button></fieldset>
      {receipt && rooms && <div><p role="status">Retour consigné dans cet exercice. Blessures, disparitions et morts restent dans ce rapport.</p>{rooms.map(room => <p key={room.stationId}><strong>{room.label}</strong> : {room.personIds.map(id => departure.manifest.travellers.find(person => person.id === id)?.name).join(", ") || "aucun voyageur"} ; {room.cargoIds.map(id => departure.manifest.cargo.find(item => item.id === id)?.name).join(", ") || "aucun objet"}.</p>)}
        {departure.manifest.cargo.filter(item => (item.purpose === "loan" || item.purpose === "return") && receipt.cargo.find(entry => entry.id === item.id)?.disposition !== "returned-to-owner").map(item => <p key={item.id} className={styles.notice}>{item.name} : restitution à {item.ownerId} encore due, ou perte à déclarer.</p>)}</div>}
      <button type="button" onClick={() => { setDeparture(null); setReceipt(null); }}>Préparer un nouvel exercice séparé</button>
    </section>}
    <details className={styles.rooms}><summary>Les huit stations du vaisseau et leurs usages</summary>{SHIP_LEVEL_ROOMS.map(room => <p key={room.id}><strong>{room.label}</strong> : {ROOM_USES[room.id]}</p>)}</details>
  </details>;
}
