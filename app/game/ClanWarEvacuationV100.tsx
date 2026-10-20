import { warEvacuationManifestV100 } from "./systems/clanWarEvacuationV100";
import { warTerritoryForSimulationV96, type WarOrderV85, type WarSimulationV85 } from "./systems/clanWarV85";
import styles from "./ClanWarEvacuationV100.module.css";

export default function ClanWarEvacuationV100({ simulation, draft }: {
  simulation: WarSimulationV85;
  draft: Pick<WarOrderV85, "fromId" | "targetId" | "combatantIds" | "cargo">;
}) {
  const manifest = warEvacuationManifestV100(simulation, draft);
  const destination = warTerritoryForSimulationV96(simulation, draft.targetId);
  return <section className={styles.manifest} aria-label="Manifeste d’évacuation" data-testid="war-evacuation-v100">
    <h5>Évacuer, puis soigner</h5>
    <p>Deux escortes aptes par blessé, huit personnes au maximum. Un seul trajet voisin vers un site ami, au prochain tour résolu. Coût local : <strong>S1</strong> ; le créneau logistique est réservé.</p>
    <dl>
      <div><dt>Escortes aptes</dt><dd data-testid="war-evacuation-escorts-v100">{manifest.escorts.map(person => person.id).join(", ") || "Aucune sélectionnée"}</dd></div>
      <div><dt>Patients blessés</dt><dd data-testid="war-evacuation-patients-v100">{manifest.patients.map(person => person.id).join(", ") || "Aucun sélectionné"}</dd></div>
      <div><dt>Capacité du détachement</dt><dd>{manifest.patients.length}/{manifest.capacity} blessé(s)</dd></div>
      <div><dt>Accueil</dt><dd>{destination?.name ?? "Choisir une route"}{simulation.territories[draft.targetId]?.controller !== "CON-F01" ? " · hors de votre contrôle" : " · site ami"}</dd></div>
    </dl>
    <p>Les patients restent blessés après l’arrivée. Leurs soins nécessitent un nouvel ordre local ; les morts restent au mémorial et les escortes quittent leur garde si elles étaient affectées.</p>
  </section>;
}
