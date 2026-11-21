/**
 * Live proof of the confirmed local post, scoped to one synchronous campaign write.
 * The saved passage records the source and revision, never this capability.
 */
export interface W3S18RoutePost {
  readonly sourceSha256: string;
  readonly supplyRevision: number;
}

const activePosts = new WeakSet<W3S18RoutePost>();

export function withW3S18RoutePost<T>(sourceSha256: string, supplyRevision: number, operation: (post: W3S18RoutePost) => T): T {
  const post = Object.freeze({ sourceSha256, supplyRevision });
  activePosts.add(post);
  try {
    return operation(post);
  } finally {
    activePosts.delete(post);
  }
}

export function activeW3S18RoutePost(post: W3S18RoutePost) {
  return activePosts.has(post);
}
