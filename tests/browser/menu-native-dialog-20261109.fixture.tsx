import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useMenuGamepad } from "../../app/game/useMenuGamepad";

/** UI-only hook fixture. No game reducers, saves or fake gameplay outcomes. */
function Fixture() {
  const root = useRef<HTMLElement>(null), alpha = useRef<HTMLDialogElement>(null), beta = useRef<HTMLDialogElement>(null);
  const [alphaOpen, setAlphaOpen] = useState(false), [betaOpen, setBetaOpen] = useState(false), [legacyOpen, setLegacyOpen] = useState(false);
  const [rootInert, setRootInert] = useState(false), [ownerInert, setOwnerInert] = useState(false), [veto, setVeto] = useState(false);
  const [rootBacks, setRootBacks] = useState(0), [legacyBacks, setLegacyBacks] = useState(0), [backgroundActions, setBackgroundActions] = useState(0);
  const [alphaActions, setAlphaActions] = useState(0), [betaActions, setBetaActions] = useState(0), [legacyActions, setLegacyActions] = useState(0), [alphaCancels, setAlphaCancels] = useState(0);
  useMenuGamepad(root, true, "native-dialog-fixture", () => {
    if (legacyOpen) { setLegacyOpen(false); setLegacyBacks(value => value + 1); }
    else setRootBacks(value => value + 1);
  });
  useEffect(() => {
    if (alphaOpen && !alpha.current?.open) alpha.current?.showModal();
    else if (!alphaOpen && alpha.current?.open) alpha.current.close();
  }, [alphaOpen]);
  useEffect(() => {
    if (betaOpen && !beta.current?.open) beta.current?.showModal();
    else if (!betaOpen && beta.current?.open) beta.current.close();
  }, [betaOpen]);
  return <main ref={root} inert={rootInert} data-modal-fixture data-root-backs={rootBacks} data-legacy-backs={legacyBacks}
    data-background-actions={backgroundActions} data-alpha-actions={alphaActions} data-beta-actions={betaActions}
    data-legacy-actions={legacyActions} data-alpha-cancels={alphaCancels} data-root-inert={rootInert} data-owner-inert={ownerInert}>
    <h1>Native menu dialogs · synthetic controller input</h1>
    <p>The production hook decides focus and Back. These controls do not represent a campaign or physical controller.</p>
    <button id="open-alpha" onClick={() => setAlphaOpen(true)}>Open Alpha</button>
    <button id="open-beta" onClick={() => setBetaOpen(true)}>Open Beta</button>
    <button id="open-legacy" onClick={() => setLegacyOpen(true)}>Open legacy role dialog</button>
    <button id="background-action" onClick={() => setBackgroundActions(value => value + 1)}>Background action</button>
    <section inert={ownerInert}>
      <dialog ref={alpha} id="alpha" aria-labelledby="alpha-title" onCancel={event => { event.preventDefault(); setAlphaCancels(value => value + 1); if (!veto) setAlphaOpen(false); }}>
        <h2 id="alpha-title">Alpha native dialog</h2>
        <button id="alpha-primary" onClick={() => setAlphaActions(value => value + 1)}>Alpha primary action</button>
        <button id="alpha-secondary" onClick={() => setAlphaActions(value => value + 1)}>Alpha secondary action</button>
        <label><input id="alpha-veto" type="checkbox" checked={veto} onChange={event => setVeto(event.target.checked)}/>Keep dialog open when cancellation is requested</label>
        <button id="alpha-inert-owner" onClick={() => setOwnerInert(true)}>Suspend the dialog owner</button>
        <button id="alpha-inert-root" onClick={() => setRootInert(true)}>Suspend the whole menu</button>
        <button id="alpha-resume" onClick={() => { setOwnerInert(false); setRootInert(false); }}>Resume menu ownership</button>
        <button id="alpha-close" onClick={() => setAlphaOpen(false)}>Close Alpha</button>
      </dialog>
    </section>
    <dialog ref={beta} id="beta" aria-labelledby="beta-title" onCancel={event => { event.preventDefault(); setBetaOpen(false); }}>
      <h2 id="beta-title">Beta native dialog</h2>
      <button id="beta-primary" onClick={() => setBetaActions(value => value + 1)}>Beta primary action</button>
      <button id="beta-open-alpha" onClick={() => setAlphaOpen(true)}>Open Alpha above Beta</button>
      <button id="beta-close" onClick={() => setBetaOpen(false)}>Close Beta</button>
    </dialog>
    {legacyOpen && <section role="dialog" aria-modal="true" aria-labelledby="legacy-title" id="legacy">
      <h2 id="legacy-title">Legacy role dialog</h2>
      <button id="legacy-primary" onClick={() => setLegacyActions(value => value + 1)}>Legacy primary action</button>
      <button id="legacy-secondary" onClick={() => setLegacyActions(value => value + 1)}>Legacy secondary action</button>
    </section>}
  </main>;
}
const mount = document.getElementById("root");
if (!mount) throw new Error("Missing fixture root");
createRoot(mount).render(<Fixture/>);
