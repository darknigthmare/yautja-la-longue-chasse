/** Browser frame semantics for callback fixtures: every queued callback receives
 * the same timestamp, cancellation removes only its handle, and newly queued
 * work runs on the next frame rather than replacing another callback. */
export function animationFrameFixture() {
  const callbacks = new Map();
  let handle = 0, time = 0;
  return {
    get size() { return callbacks.size; },
    requestAnimationFrame(callback) {
      const id = ++handle;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { callbacks.delete(id); },
    tick(count = 1) {
      for (let i = 0; i < count; i++) {
        time += 1000 / 60;
        const pending = [...callbacks.keys()];
        for (const id of pending) {
          const callback = callbacks.get(id);
          if (!callback) continue;
          callbacks.delete(id);
          callback(time);
        }
      }
    },
  };
}
