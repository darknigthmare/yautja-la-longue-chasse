/** V143: permission fence for the real clan-war end-turn UI.
 * This never changes war rules, result probabilities or unit calculations.
 * It only prevents stale/duplicate confirmations while an archive writes.
 */
export interface WarTurnSnapshotV143 {
  loaded:boolean;
  pendingWrites:number;
  staleWar:boolean;
  simulation:{revision:number;turn:number};
}
export type WarTurnGateReasonV143 = "ready" | "inactive" | "loading" | "writing" | "stale" | "conflict";
export interface WarTurnGateResultV143 {
  allowed:boolean;
  reason:WarTurnGateReasonV143;
}
export function inspectWarTurnGateV143(
  snapshot:WarTurnSnapshotV143,
  expectedRevision:number | null,
  active:boolean,
  suspended:boolean,
):WarTurnGateResultV143 {
  if(!active||suspended)return {allowed:false,reason:"inactive"};
  if(!snapshot.loaded)return {allowed:false,reason:"loading"};
  if(snapshot.pendingWrites>0)return {allowed:false,reason:"writing"};
  if(snapshot.staleWar)return {allowed:false,reason:"conflict"};
  if(expectedRevision===null||!Number.isSafeInteger(expectedRevision)
      ||snapshot.simulation.revision!==expectedRevision)
    return {allowed:false,reason:"stale"};
  return {allowed:true,reason:"ready"};
}
export const WAR_TURN_GATE_MESSAGES_V143:Readonly<Record<WarTurnGateReasonV143,string>>={
  ready:"Confirmation du tour prête.",
  inactive:"Le front est suspendu ou en arrière-plan : revenez à la fenêtre active.",
  loading:"Les archives ne sont pas encore vérifiées. Attendez leur chargement.",
  writing:"L'enregistrement précédent n'est pas terminé. Relisez les ordres après la sauvegarde.",
  stale:"Le front ou ses ordres ont changé. Relisez la préparation avant de confirmer ce tour.",
  conflict:"Ce front a été modifié dans un autre onglet. Fermez et rouvrez le panneau pour récupérer sa version archivée.",
};
