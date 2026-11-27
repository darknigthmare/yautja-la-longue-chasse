import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import PitHonorsPanel from "../../app/game/PitHonorsPanel";
import { useMenuGamepad } from "../../app/game/useMenuGamepad";
import { createPitSave, pitSaveStorageKey, serializePitSave } from "../../app/game/systems/pitSave";
import type { PitHonorRouteRequestV1 } from "../../app/game/systems/pitHonorGalleryV1";
import { createPitHonorGalleryFixtureV1, PIT_HONORS_QA_OWNER } from "../fixtures/pit-honors-gallery-v1";

const OTHER_OWNER = "2026-11-26T09:00:00.000Z";
const fixture = new URLSearchParams(location.search).get("fixture") ?? "empty";
const profile = fixture === "earned" || fixture === "progress" ? fixture : "empty";
const key = pitSaveStorageKey(PIT_HONORS_QA_OWNER);
const saved = serializePitSave(createPitHonorGalleryFixtureV1(profile));
const storage = window.localStorage;
const rawSet = Storage.prototype.setItem;
rawSet.call(storage, pitSaveStorageKey(OTHER_OWNER), serializePitSave(createPitSave(OTHER_OWNER)));
rawSet.call(storage, key, fixture === "corrupt" ? "{invalid fixture" : fixture === "wrong-owner" ? serializePitSave(createPitSave(OTHER_OWNER)) : saved);

declare global { interface Window { __pitHonorGalleryQa: {
  requests: Array<PitHonorRouteRequestV1 | null>; writes: string[]; outsideKeys: string[];
  parentBackCount: number; enablePad(): void; pad(button: number, pressed: boolean): void;
  snapshot(): string; switchOwner(): void; corrupt(): void;
}; } }

const controller = { id: "pit-honor-gallery-test-pad", index: 0, connected: true, axes: [0, 0],
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
let padEnabled = false;
Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => padEnabled ? [controller] : [] });
const qa: Window["__pitHonorGalleryQa"] = {
  requests: [], writes: [], outsideKeys: [], switchOwner() {},
  parentBackCount: 0, enablePad() { padEnabled = true; },
  pad(button, pressed) { controller.buttons[button].pressed = pressed; controller.buttons[button].value = pressed ? 1 : 0; },
  snapshot: () => JSON.stringify(Object.fromEntries(Object.entries(storage))),
  corrupt() { rawSet.call(storage, key, "{invalid after opening"); window.dispatchEvent(new StorageEvent("storage", { key })); },
};
window.__pitHonorGalleryQa = qa;
for (const method of ["setItem", "removeItem", "clear"] as const) {
  const original = Storage.prototype[method];
  Object.defineProperty(Storage.prototype, method, { configurable: true, value: function (this: Storage, ...args: string[]) {
    qa.writes.push(method);
    return Reflect.apply(original, this, args);
  } });
}
document.addEventListener("keydown", event => qa.outsideKeys.push(event.key));

function Fixture() {
  const [owner, setOwner] = useState(PIT_HONORS_QA_OWNER);
  const rootRef = useRef<HTMLElement>(null);
  useMenuGamepad(rootRef, true, `gallery:${owner}`, () => { qa.parentBackCount += 1; });
  useEffect(() => {
    qa.switchOwner = () => setOwner(OTHER_OWNER);
    return () => { qa.switchOwner = () => {}; };
  }, []);
  return <main ref={rootRef} style={{ maxWidth: 1180, margin: "0 auto", padding: 16 }}>
    <p data-qa-scope>Contrôle du composant réel · profil de test {fixture} · résultats préparés par les réducteurs de sauvegarde</p>
    <PitHonorsPanel owner={owner} onOpenPit={request => qa.requests.push(request ?? null)} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
