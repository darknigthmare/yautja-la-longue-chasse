"use client";

import { useCallback, useEffect, useState } from 'react';
import { preloadNativeImagesV94, type NativeImageProgressV94, type NativeImageSourceV94 } from './systems/nativeImagePreloadV94';

export interface NativeImageAssetsV94 extends NativeImageProgressV94 { retry(): void }

/** Image metadata is the identity, not the caller's array/object allocation.
 * Serializing only consumed fields also avoids delimiter collisions in URLs.
 * No Image object, decoded pixels or game state is cached by this hook. */
export function useNativeImageAssetsV94(sources: readonly NativeImageSourceV94[]): NativeImageAssetsV94 {
  const serializedSources = JSON.stringify(sources.map(({ src, sourceWidth, sourceHeight, kind }) => ({
    src, sourceWidth, sourceHeight, ...(kind === 'scene' ? { kind } : {}),
  })));
  const [attempt, setAttempt] = useState(0);
  const key = `${attempt}:${serializedSources}`;
  const total = sources.length;
  const [progress, setProgress] = useState<NativeImageProgressV94 & { key: string }>({
    key: '', ready: false, error: null, loaded: 0, total,
  });
  const retry = useCallback(() => setAttempt(previous => previous + 1), []);
  useEffect(() => {
    let alive = true;
    const snapshot: NativeImageSourceV94[] = JSON.parse(serializedSources);
    const preload = preloadNativeImagesV94({ sources: snapshot, reload: attempt > 0,
      onProgress: next => { if (alive) setProgress({ ...next, key }); },
    });
    return () => { alive = false; preload.cancel(); };
  }, [serializedSources, attempt, key]);
  // A changed URL, dimensions, role or retry is unready in this very render,
  // before cleanup/setup. Late callbacks from an old attempt cannot unlock it.
  return progress.key === key ? { ready: progress.ready, error: progress.error, loaded: progress.loaded, total, retry } :
    { ready: false, error: null, loaded: 0, total, retry };
}
