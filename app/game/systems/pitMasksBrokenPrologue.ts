export type PitMasksBrokenStep = "arrival" | "inspected-rack" | "guard-practised";

export const PIT_MASKS_BROKEN_STORAGE = "yautja-long-hunt.pit-masks-broken.v1";
const ORDER: readonly PitMasksBrokenStep[] = ["arrival", "inspected-rack", "guard-practised"];

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function pitMasksBrokenKey(owner: string) {
  return PIT_MASKS_BROKEN_STORAGE + "." + encodeURIComponent(owner);
}

export function parsePitMasksBrokenProgress(raw: string | null, owner: string): PitMasksBrokenStep {
  if (!raw || raw.length > 1024) return "arrival";
  try {
    const value = JSON.parse(raw);
    return value?.version === 1 && value.owner === owner && ORDER.includes(value.step) ? value.step : "arrival";
  } catch {
    return "arrival";
  }
}

export function advancePitMasksBrokenProgress(
  step: PitMasksBrokenStep,
  event: "inspect-rack" | "complete-riposte",
): PitMasksBrokenStep {
  if (event === "inspect-rack" && step === "arrival") return "inspected-rack";
  if (event === "complete-riposte" && step === "inspected-rack") return "guard-practised";
  return step;
}

export function persistPitMasksBrokenProgress(storage: Store, owner: string, step: PitMasksBrokenStep) {
  const key = pitMasksBrokenKey(owner);
  const stored = parsePitMasksBrokenProgress(storage.getItem(key), owner);
  const latest = ORDER.indexOf(stored) > ORDER.indexOf(step) ? stored : step;
  const encoded = JSON.stringify({ version: 1, owner, step: latest });
  storage.setItem(key, encoded);
  if (storage.getItem(key) !== encoded) throw Error("La progression du prélude ne peut pas être confirmée.");
  return latest;
}
