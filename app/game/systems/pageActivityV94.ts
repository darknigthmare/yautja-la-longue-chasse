/** Stable external-store callbacks: reading focus never writes game progression. */
export function pageActivitySnapshotV94(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus();
}
export const serverPageActivityV94 = () => false;
export function subscribePageActivityV94(notify: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  window.addEventListener('focus', notify);
  window.addEventListener('blur', notify);
  document.addEventListener('visibilitychange', notify);
  return () => {
    window.removeEventListener('focus', notify);
    window.removeEventListener('blur', notify);
    document.removeEventListener('visibilitychange', notify);
  };
}
