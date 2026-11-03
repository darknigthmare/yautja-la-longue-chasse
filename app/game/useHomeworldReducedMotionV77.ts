import {useSyncExternalStore} from 'react';
const query='(prefers-reduced-motion: reduce)';
const snapshot=()=>typeof window!=='undefined'&&window.matchMedia(query).matches;
const subscribe=(notify:()=>void)=>{const media=window.matchMedia(query);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
/** Decorative motion follows the operating-system preference without a save
 * migration or a second animation clock. Actual vehicle travel remains visible. */
export const useHomeworldReducedMotionV77=()=>useSyncExternalStore(subscribe,snapshot,()=>false);
