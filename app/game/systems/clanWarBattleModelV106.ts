/** The existing free-front equation, shared by resolution and conditional
 * planning. No random source, hidden roster or mutable simulation enters it. */
export function warBattleModelV106(attackers: number, defenders: number, roll: number) {
  const won = attackers >= Math.max(1, defenders + (roll === 0 ? 1 : 0));
  const losses = won ? Math.min(attackers - 1, Math.floor(defenders / 3))
    : Math.min(attackers, Math.max(1, Math.floor(defenders / 3)));
  return { won, losses: Math.max(0, losses) };
}
