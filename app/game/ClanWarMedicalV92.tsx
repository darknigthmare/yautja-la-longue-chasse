"use client";

import type { WarRulesV6 } from "./systems/clanWarBibleV6";
import type { WarWorksActionV6, WarWorksSessionV6, WarWorkOrderV6 } from "./systems/clanWarWorksV6";
import { warMedicalStockV92, WAR_MEDICAL_BALANCE_V92 } from "./systems/clanWarMedicalV92";
import styles from "./ClanWarPanelV85.module.css";

/** Source-backed exercise view. All buttons use the model's real transition;
 * no component grants a recovered fighter or mutates a campaign save. */
export default function ClanWarMedicalV92({ state, work, teamId, rules, act }: {
  state: WarWorksSessionV6; work: WarWorkOrderV6; teamId: string; rules: WarRulesV6; act: (action: WarWorksActionV6) => void;
}) {
  const stock = warMedicalStockV92(state, work.id), treatments = state.medical?.treatments.filter(item => item.workId === work.id) ?? [];
  const operator = state.teams.find(group => group.team.id === work.operatorTeamId);
  const selectedOperator = operator?.team.id === teamId && operator.territoryId === work.territoryId && operator.team.members.every(member => member.status === "fit");
  const patients = state.extraction?.patients.filter(patient => patient.territoryId === work.territoryId) ?? [];
  const dosePrice = WAR_MEDICAL_BALANCE_V92.ravPerDose;
  return <section className={styles.infrastructureEffect} aria-label={`Soins ${work.id}`} data-medical-work={work.id}>
    <h5>Stabilisation au poste</h5>
    <p>Réserve : {stock}/{WAR_MEDICAL_BALANCE_V92.stockCap} consommables. {operator ? `Soigneur : ${operator.team.members[0].id}.` : "Affectez un soigneur U18 au poste."} Patient et soigneur doivent rester ici pendant le soin.</p>
    <p>Réglages d’exercice : {dosePrice} RAV local par consommable, une dose par patient et {WAR_MEDICAL_BALANCE_V92.workedTurns} tours travaillés. Attendre ne soigne pas. Le patient reste blessé et indisponible après stabilisation ; l’évacuation S16 demande son vrai trajet gardé.</p>
    <div className={styles.actions}>{[1, 3].map(units => <button type="button" key={units} disabled={work.phase !== "ready" || !selectedOperator || stock + units > WAR_MEDICAL_BALANCE_V92.stockCap}
      onClick={() => act({ kind: "stock-medical", workId: work.id, teamId, units })}>Préparer {units} consommable(s) · {units * dosePrice} RAV locaux</button>)}</div>
    {patients.length === 0 ? <p>Aucun patient à ce poste. Déposez ici une personne réellement transportée.</p> : patients.map(patient => {
      const owner = state.teams.find(group => group.team.id === patient.teamId), member = owner?.team.members.find(member => member.id === patient.memberId);
      const treatment = treatments.filter(item => item.memberId === patient.memberId).at(-1);
      const following = treatment?.phase === "treating", stable = treatment?.phase === "stabilised";
      return <article className={styles.unit} key={patient.memberId} data-medical-patient={patient.memberId} data-medical-phase={treatment?.phase ?? "waiting"}>
        <h5>{member?.name ?? patient.memberId}</h5><p>{patient.memberId} · {patient.territoryId} · blessé, indisponible. {patient.carrierId ? `Encore porté par ${patient.carrierId}. Déposez-le avant le soin.` : "Déposé au poste."}</p>
        <p>{stable ? "Stabilisation terminée. Organisez l’évacuation, sans retour gratuit au combat." : following ? `Soin travaillé : ${treatment.workedTurns.length}/${WAR_MEDICAL_BALANCE_V92.workedTurns} tours.` : treatment?.phase === "cancelled" ? "Soin interrompu, dose utilisée non restituée." : "Stabilisation pas encore commencée."}</p>
        <div className={styles.actions}>{following && treatment ? <><button type="button" disabled={teamId !== treatment.operatorTeamId} onClick={() => act({ kind: "work-medical", treatmentId: treatment.id, teamId })}>Accomplir un tour de soin</button><button type="button" disabled={teamId !== treatment.operatorTeamId} onClick={() => act({ kind: "cancel-medical", treatmentId: treatment.id, teamId })}>Interrompre sans restituer la dose</button></> : !stable ? <button type="button" disabled={work.phase !== "ready" || !selectedOperator || !!patient.carrierId || stock < 1}
          onClick={() => act({ kind: "begin-medical", workId: work.id, teamId, memberId: patient.memberId })}>Commencer la stabilisation · 1 consommable</button> : null}</div>
      </article>;
    })}
    <p className={styles.source}>Source {rules.metadata.workbook} · Structures de guerre D16:J16 ; Unités de guerre D23:H23, M23:N23 ; Règles de guerre C20:D20. Le coût et la durée de stabilisation sont des adaptations de jeu explicites.</p>
  </section>;
}
