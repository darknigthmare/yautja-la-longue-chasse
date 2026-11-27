import type { PitCombatState, PitInput } from "./pitCombat";
import {
  beginPitBonusTrialV1, getPitBonusAvailabilityV1, pitBonusResultV1, pitBonusRulesV1,
  preparePitBonusTrialV1, stepPitBonusTrialV1, type PitBonusDifficultyV1, type PitBonusTrialV1,
} from "./pitBonusTrialV1";
import {
  beginPitPrecisionTrialV1, getPitPrecisionAvailabilityV1, pitPrecisionResultV1, pitPrecisionRulesV1,
  preparePitPrecisionTrialV1, stepPitPrecisionTrialV1, PIT_PRECISION_TRIAL_ID_V1, type PitPrecisionTrialV1,
} from "./pitPrecisionTrialV1";
import { loadPitBonusRecordsV1, savePitBonusRecordV1, type PitBonusStorageV1 } from "./pitBonusRecordsV1";
import { loadPitPrecisionRecordsV1, savePitPrecisionRecordV1 } from "./pitPrecisionRecordsV1";

/** The V1 riposte recipe and archive stay intact; each exercise owns its state and record key. */
export type PitBonusKindV2 = "riposte" | "precision";
export type PitBonusSessionV2 = PitBonusTrialV1 | PitPrecisionTrialV1;
export function isPitPrecisionSessionV2(trial: PitBonusSessionV2): trial is PitPrecisionTrialV1 {
  return trial.id === PIT_PRECISION_TRIAL_ID_V1;
}
export function pitBonusSessionKindV2(trial: PitBonusSessionV2): PitBonusKindV2 {
  return isPitPrecisionSessionV2(trial) ? "precision" : "riposte";
}
export function getPitBonusSessionAvailabilityV2(state: PitCombatState, kind: PitBonusKindV2) {
  return kind === "precision" ? getPitPrecisionAvailabilityV1(state) : getPitBonusAvailabilityV1(state);
}
export function preparePitBonusSessionV2(state: PitCombatState, difficulty: PitBonusDifficultyV1, kind: PitBonusKindV2) {
  return kind === "precision" ? preparePitPrecisionTrialV1(state, difficulty) : preparePitBonusTrialV1(state, difficulty);
}
export function beginPitBonusSessionV2(trial: PitBonusSessionV2, state: PitCombatState, ready: boolean) {
  return isPitPrecisionSessionV2(trial) ? beginPitPrecisionTrialV1(trial, state, ready) : beginPitBonusTrialV1(trial, state, ready);
}
export function stepPitBonusSessionV2(trial: PitBonusSessionV2, state: PitCombatState, input: PitInput) {
  return isPitPrecisionSessionV2(trial) ? stepPitPrecisionTrialV1(trial, state, input) : stepPitBonusTrialV1(trial, state, input);
}
export function pitBonusSessionRulesV2(trial: PitBonusSessionV2) {
  return isPitPrecisionSessionV2(trial) ? pitPrecisionRulesV1(trial.difficulty) : pitBonusRulesV1(trial.difficulty);
}
export function pitBonusSessionResultV2(trial: PitBonusSessionV2) {
  return isPitPrecisionSessionV2(trial) ? pitPrecisionResultV1(trial) : pitBonusResultV1(trial);
}
export function loadPitBonusSessionRecordsV2(owner: string | undefined, kind: PitBonusKindV2, storage?: PitBonusStorageV1 | null) {
  return kind === "precision" ? loadPitPrecisionRecordsV1(owner, storage) : loadPitBonusRecordsV1(owner, storage);
}
export function savePitBonusSessionRecordV2(owner: string | undefined, trial: PitBonusSessionV2,
  completedAt: string, storage?: PitBonusStorageV1 | null) {
  return isPitPrecisionSessionV2(trial) ? savePitPrecisionRecordV1(owner, trial, completedAt, storage)
    : savePitBonusRecordV1(owner, trial, completedAt, storage);
}
