/** A role belongs to a browser slot/device until the player returns to selection.
 * Empty browser slots are not player numbers: a lone pad at index 2 is still J1.
 * Reserved disconnected roles never consume another player's connected pad.
 */
export type PitGamepadIdentity = { id?: string; connected?: boolean };
export type PitGamepadBinding = { slot: number; id: string; connected: boolean; revision: number };
export type PitGamepadAssignments = [PitGamepadBinding | null, PitGamepadBinding | null];

export function createPitGamepadAssignments(): PitGamepadAssignments {
  return [null, null];
}

export function resolvePitGamepadAssignments<T extends PitGamepadIdentity>(
  previous: PitGamepadAssignments,
  browserPads: readonly (T | null | undefined)[],
): { assignments: PitGamepadAssignments; pads: [T | null, T | null] } {
  const assignments: PitGamepadAssignments = [null, null];
  const pads: [T | null, T | null] = [null, null];
  const reservedSlots = new Set(previous.flatMap(binding => binding ? [binding.slot] : []));
  for (const player of [0, 1] as const) {
    const binding = previous[player];
    if (binding) {
      const candidate = browserPads[binding.slot];
      const pad = candidate && candidate.connected !== false && (candidate.id ?? "") === binding.id ? candidate : null;
      const connected = pad !== null;
      assignments[player] = { ...binding, connected, revision: binding.revision + Number(connected !== binding.connected) };
      pads[player] = pad;
      continue;
    }
    const slot = browserPads.findIndex((pad, index) => pad != null && pad.connected !== false && !reservedSlots.has(index));
    if (slot < 0) continue;
    const pad = browserPads[slot]!;
    reservedSlots.add(slot);
    assignments[player] = { slot, id: pad.id ?? "", connected: true, revision: 1 };
    pads[player] = pad;
  }
  return { assignments, pads };
}

/** Preserve a disconnect even when it occurs while simulation/briefing polling is paused. */
export function disconnectPitGamepadAssignment(
  previous: PitGamepadAssignments,
  slot: number,
  id: string,
): PitGamepadAssignments {
  return previous.map(binding => binding && binding.slot === slot && binding.id === id && binding.connected
    ? { ...binding, connected: false, revision: binding.revision + 1 }
    : binding) as PitGamepadAssignments;
}
