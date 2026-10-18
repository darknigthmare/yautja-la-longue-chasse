import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mausoleum from '../../app/game/Mausoleum';
import { defaultSave } from '../../app/game/save';
import type { MausoleumProgress } from '../../app/game/systems/mausoleum';

type Event = { kind: 'write' | 'refused' | 'sound' | 'exit'; value?: unknown };
type Audit = {
  events: Event[];
  failWrites: boolean;
  reset(preview?: boolean): void;
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
const audit: Audit = { events: [], failWrites: false, reset: () => {}, suspend: () => {}, rerender: () => {} };
function Fixture() {
  const [save, setSave] = useState(fresh), [epoch, setEpoch] = useState(0);
  const [preview, setPreview] = useState(false), [suspended, setSuspended] = useState(false);
  const [, update] = useState(0);
  audit.reset = (nextPreview = false) => {
    audit.events = []; audit.failWrites = false;
    setSave(fresh()); setPreview(nextPreview); setSuspended(false); setEpoch(value => value + 1);
  };
  audit.suspend = setSuspended;
  audit.rerender = () => update(value => value + 1);
  const persist = (progress: MausoleumProgress) => {
    audit.events.push({ kind: audit.failWrites ? 'refused' : 'write', value: progress });
    if (audit.failWrites) return false;
    setSave(current => ({ ...current, homeworld: { ...current.homeworld, mausoleum: progress } }));
    return true;
  };
  return <Mausoleum key={epoch} save={preview ? null : save} suspended={suspended} source="menu"
    onProgress={persist} onSound={value => audit.events.push({ kind: 'sound', value })}
    onExit={() => audit.events.push({ kind: 'exit' })}/>;
}
window.__mausoleumAuditV94 = audit;
createRoot(document.getElementById('root')!).render(<Fixture/>);
