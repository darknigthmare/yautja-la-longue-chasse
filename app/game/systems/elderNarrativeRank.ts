import {
  CHRONICLE_EVIDENCE, CHRONICLE_RITES, performChronicleRite, recordChronicleEvidence, type ClanChronicle,
} from "./clanChronicle";

type SeniorRite = "elder-recognition" | "ancient-recognition";

/** Called only by a completed campaign ceremony, after validating its own record. */
export function completeNarrativeSeniorRite(chronicle: unknown, id: SeniorRite): ClanChronicle | null {
  const rite = CHRONICLE_RITES.find(candidate => candidate.id === id);
  if (!rite) return null;
  let next = chronicle;
  for (const proof of CHRONICLE_EVIDENCE.filter(proof => rite.requiredEvidenceIds.includes(proof.id))) {
    const result = recordChronicleEvidence(next, proof);
    if (!result.accepted) return null;
    next = result.state;
  }
  const recognized = performChronicleRite(next, rite);
  return recognized.accepted && recognized.changed ? recognized.state : null;
}

export function seniorRiteMatchesRecord(chronicle: ClanChronicle | null | undefined, id: SeniorRite, completed: boolean): boolean {
  const rite = CHRONICLE_RITES.find(candidate => candidate.id === id);
  if (!rite) return false;
  return (chronicle?.rites.some(entry => entry.id === id) === true) === completed &&
    rite.requiredEvidenceIds.every(proof => (chronicle?.evidence.some(entry => entry.id === proof) === true) === completed);
}
