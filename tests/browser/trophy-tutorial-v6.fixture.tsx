import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import TrophyTutorialBay from '../../app/game/TrophyTutorialBay';
import { acceptTrophyTutorialCheckpointV6, inspectTrophyTutorialV6, type TrophyTutorialStateV6 } from '../../app/game/systems/trophyTutorialV6';
import { defaultSave } from '../../app/game/save';

/** Browser fixture only: the production component receives a controlled owner.
 * This storage key is never imported or used by the game. */
const KEY = 'qa.trophy-tutorial-v6.fixture';
const OWNER = '2026-11-09T12:00:00.000Z';
const SAVE = defaultSave(OWNER);
function Fixture() {
  const [initial] = useState(() => {
    const raw = localStorage.getItem(KEY);
    return raw === null ? undefined : JSON.parse(raw);
  });
  const [ledger, setLedger] = useState<TrophyTutorialStateV6 | undefined>(initial);
  const [fail, setFail] = useState(false), [paused, setPaused] = useState(false), [mounted, setMounted] = useState(true);
  const current = useRef(ledger);
  const checkpoint = (candidate: TrophyTutorialStateV6) => {
    if (fail || paused) return false;
    const next = acceptTrophyTutorialCheckpointV6(current.current, candidate, OWNER);
    if (!next) return false;
    const bytes = JSON.stringify(next);
    localStorage.setItem(KEY, bytes);
    if (localStorage.getItem(KEY) !== bytes) return false;
    current.current = next; setLedger(next); return true;
  };
  useEffect(() => {
    const observer = () => ({ ledger: current.current,
      inspection: inspectTrophyTutorialV6(current.current, OWNER), save: SAVE, fixtureOnly: true });
    Object.defineProperty(window, '__trophyTutorialFixture', { configurable: true, value: observer });
    return () => {
      if (Object.getOwnPropertyDescriptor(window, '__trophyTutorialFixture')?.value === observer) {
        Reflect.deleteProperty(window, '__trophyTutorialFixture');
      }
    };
  }, []);
  return <main style={{ margin: 0, padding: 12, background: '#020708', minHeight: '100vh', fontFamily: 'Arial,sans-serif' }}>
    <div style={{ padding: 12, color: '#fff', display: 'flex', gap: 18, flexWrap: 'wrap' }} aria-label="Fixture de propriétaire, pas un écran du jeu">
      <label><input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)} />Refuser l’écriture du fixture</label>
      <label><input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} />Suspendre le fixture</label>
      {!mounted && <button type="button" onClick={() => setMounted(true)}>Revenir au tutoriel</button>}
    </div>
    {mounted && <TrophyTutorialBay owner={OWNER} save={SAVE} initialState={ledger} onCheckpoint={checkpoint} suspended={paused} onExit={() => setMounted(false)} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
