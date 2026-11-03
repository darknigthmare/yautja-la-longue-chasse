import { StrictMode, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNativeImageAssetsV94 } from '../../app/game/useNativeImageAssetsV94';
import type { NativeImageSourceV94, NativeImageProgressV94 } from '../../app/game/systems/nativeImagePreloadV94';

type Audit = {
  setSources(sources: NativeImageSourceV94[]): void;
  rerender(): void;
  retry(): void;
  show(value: boolean): void;
  observations: (NativeImageProgressV94 & { source: string })[];
};
declare global { interface Window { __nativeAssetsAuditV94: Audit; __nativeDecodeCountV94: number } }
const audit: Audit = { setSources: () => {}, rerender: () => {}, retry: () => {}, show: () => {}, observations: [] };
const initial: NativeImageSourceV94[] = [{ src: '/__audit_native/a.png', sourceWidth: 1, sourceHeight: 1 }];
function Probe({ sources }: { sources: NativeImageSourceV94[] }) {
  // Fresh descriptors on EVERY render, including the hook's own progress updates.
  const state = useNativeImageAssetsV94(sources.map(source => ({ ...source })));
  useLayoutEffect(() => {
    audit.retry = state.retry;
    audit.observations.push({ ready: state.ready, error: state.error, loaded: state.loaded, total: state.total, source: sources[0]?.src ?? '' });
    if (audit.observations.length > 1000) throw new Error('Native image effect restarted in a render loop');
  });
  return <main data-native-assets data-ready={String(state.ready)} data-error={state.error ?? ''} data-loaded={state.loaded} data-total={state.total}>Native image hook fixture</main>;
}
function Fixture() {
  const [sources, setSources] = useState(initial), [visible, show] = useState(true);
  const [, rerender] = useState(0);
  useLayoutEffect(() => { audit.setSources = setSources; audit.show = show; audit.rerender = () => rerender(value => value + 1); });
  return visible ? <Probe sources={sources}/> : <p data-unmounted>Unmounted</p>;
}
window.__nativeAssetsAuditV94 = audit;
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
