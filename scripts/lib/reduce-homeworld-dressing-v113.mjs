/** Reduce removable dressing against the actual pinned-walk runner. A failed
 * baseline (including retained facades) is a test/environment failure, not an
 * instruction to keep deleting props forever. The input is never mutated. */
export function reduceHomeworldDressingV113(candidate, passes) {
  let result = {...candidate, fixtures: [...candidate.fixtures], places: [...candidate.places]};
  const removed = [];
  if (passes(result)) return {result, removed};
  if (!passes({...result, fixtures: [], places: []})) {
    throw new Error('Pinned Homeworld walk fails without removable dressing. Check the base, facade placement and test dependencies before regenerating the plan.');
  }
  const budget = result.fixtures.length + result.places.length;
  const without = ids => ({...result, fixtures: result.fixtures.filter(item => !ids.has(item.id)), places: result.places.filter(item => !ids.has(item.id))});
  for (let attempt = 0; attempt < budget; attempt++) {
    let pool = [...result.fixtures, ...result.places].map(item => item.id);
    if (!pool.length) throw new Error('Pinned Homeworld walk changed while reducing an empty dressing plan.');
    while (pool.length > 1) {
      const half = pool.slice(0, pool.length >> 1), keep = new Set(half);
      const omitted = new Set([...result.fixtures, ...result.places].map(item => item.id).filter(id => !keep.has(id)));
      pool = passes(without(omitted)) ? pool.slice(pool.length >> 1) : half;
    }
    const before = result.fixtures.length + result.places.length;
    result = without(new Set(pool));
    if (result.fixtures.length + result.places.length >= before) throw new Error('Dressing reduction made no progress; the original plan must be retained.');
    removed.push(pool[0]);
    if (passes(result)) return {result, removed};
  }
  throw new Error('Pinned Homeworld walk no longer passes its empty baseline; the original plan must be retained.');
}
