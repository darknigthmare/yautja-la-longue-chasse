/** Physical keys, not actions: aliases and opposite directions may be held together. */
export type HeldDirectionV94 = -1 | 0 | 1;
export function createHeldDirectionV94() {
  const keys = new Map<string, -1 | 1>();
  const direction = (): HeldDirectionV94 => {
    let result: HeldDirectionV94 = 0;
    for (const value of keys.values()) result = value;
    return result;
  };
  return {
    press(code: string, value: -1 | 1, repeat = false): HeldDirectionV94 {
      // Auto-repeat must not steal priority from a more recently pressed key.
      if (code && !keys.has(code) && !repeat) keys.set(code, value);
      return direction();
    },
    release(code: string): HeldDirectionV94 { keys.delete(code); return direction(); },
    reset(): void { keys.clear(); },
    direction,
  };
}
