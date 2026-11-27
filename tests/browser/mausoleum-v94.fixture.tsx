import { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mausoleum from '../../app/game/Mausoleum';
import { defaultSave, loadSaveWithStatus, replaceSaveWithStatus, writeSaveWithStatus } from '../../app/game/save';
import { CHRONICLE_EVIDENCE, CHRONICLE_RITES, normalizeClanChronicle } from "../../app/game/systems/clanChronicle";
import { createNurseryCampaign } from "../../app/game/systems/nurseryCampaign";
import type { MausoleumProgress } from '../../app/game/systems/mausoleum';

type Event = { kind: 'write' | 'refused' | 'sound' | 'exit'; value?: unknown };
type Audit = {
  events: Event[];
  failWrites: boolean;
  reset(preview?: boolean, ancient?: boolean): void;
  suspend(value: boolean): void;
  rerender(): void;
};
declare global { interface Window { __mausoleumAuditV94: Audit } }
const fresh = () => {
  const save = defaultSave('2026-10-16T00:00:00.000Z');
  return { ...save, settings: { ...save.settings, controlBindings: {
    ...save.settings.controlBindings,
    'hunt.moveLeft': ['KeyQ'], 'hunt.moveRight': ['KeyE', 'ArrowRight'],
    'hunt.interact': ['KeyF'], 'hunt.pause': ['KeyP'],
  } } };
};
const auditSaveKey = 'mausoleum-archive-playwright';
const ancientFixtureKey = 'mausoleum-ancient-view-fixture';
// Story receipts stand in for the entry rank in this browser fixture. They never enter the campaign writer.
const ancientChronicle = normalizeClanChronicle({ version: 1,
  evidence: CHRONICLE_EVIDENCE.map(({ id, sourceId }) => ({ id, sourceId })),
  rites: CHRONICLE_RITES.filter(rite => rite.grantsRankId).map(({ id, sourceId }) => ({ id, sourceId })),
  legacyRecognition: null,
});
const loadCampaign = () => {
  const result = loadSaveWithStatus(window.localStorage, auditSaveKey);
  return result.loaded ? result.save : fresh();
};
const idle = () => {};
const audit: Audit = { events: [], failWrites: false, reset: idle, suspend: idle, rerender: idle };
function Fixture() {
  const [save, setSave] = useState(loadCampaign), [epoch, setEpoch] = useState(0);
  const [preview, setPreview] = useState(false), [suspended, setSuspended] = useState(false);
  const [ancient, setAncient] = useState(() => sessionStorage.getItem(ancientFixtureKey) === 'yes');
  const [, update] = useState(0);
  useLayoutEffect(() => {
    // Register after commit, before the browser can observe the mounted scene.
    // Each cleanup owns only its callbacks, including StrictMode's replay.
    const controls: Pick<Audit, 'reset' | 'suspend' | 'rerender'> = {
      reset(nextPreview = false, nextAncient = false) {
        setAncient(nextAncient);
        if (nextAncient) sessionStorage.setItem(ancientFixtureKey, 'yes');
        else sessionStorage.removeItem(ancientFixtureKey);
        audit.events = []; audit.failWrites = false;
        const result = replaceSaveWithStatus(fresh(), window.localStorage, auditSaveKey);
        if (!result.persisted) throw new Error('Fixture save initialization refused');
        setSave(result.save); setPreview(nextPreview); setSuspended(false); setEpoch(value => value + 1);
      },
      suspend: setSuspended,
      rerender: () => update(value => value + 1),
    };
    Object.assign(audit, controls);
    return () => {
      for (const name of ['reset', 'suspend', 'rerender'] as const) {
        if (audit[name] === controls[name]) audit[name] = idle;
      }
    };
  }, []);
  const persist = (progress: MausoleumProgress) => {
    const result = audit.failWrites ? null : writeSaveWithStatus(
      { ...save, homeworld: { ...save.homeworld, mausoleum: progress } }, window.localStorage, auditSaveKey,
    );
    audit.events.push({ kind: result?.persisted ? 'write' : 'refused', value: progress });
    if (!result?.persisted) return false;
    setSave(result.save);
    return true;
  };
  const viewSave = ancient ? { ...save, prologue: { ...createNurseryCampaign(), chronicle: ancientChronicle } } : save;
  return <Mausoleum key={epoch} save={preview ? null : viewSave} suspended={suspended} source="menu"
    onProgress={persist} onSound={value => audit.events.push({ kind: 'sound', value })}
    onExit={() => audit.events.push({ kind: 'exit' })}/>;
}
window.__mausoleumAuditV94 = audit;
createRoot(document.getElementById('root')!).render(<Fixture/>);
