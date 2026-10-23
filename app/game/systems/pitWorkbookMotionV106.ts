/** Relative numpad motions are sampled at the combat's fixed 60 Hz clock.
 * A change of facing, air/guard/stun/action or a fresh button consumes history.
 * Neutral may follow a finished motion for at most six ticks. There is no
 * forgiveness for missing diagonals, opposite directions or held-down 22. */
export const PIT_WORKBOOK_MOTION_WINDOW_V106 = 24;
export const PIT_WORKBOOK_MOTION_BUTTON_WINDOW_V106 = 6;
export type PitWorkbookDirectionV106 = 1 | 2 | 3 | 4 | 5 | 6;
export interface PitWorkbookMotionStateV106 {
  facing: -1 | 1;
  held: PitWorkbookDirectionV106;
  steps: Array<{direction: PitWorkbookDirectionV106; frame: number}>;
}
interface DirectionInput {left?: boolean; right?: boolean; down?: boolean}
export function freshPitWorkbookMotionV106(facing: -1 | 1): PitWorkbookMotionStateV106 {
  return {facing, held: 5, steps: []};
}
export function samplePitWorkbookMotionV106(previous: PitWorkbookMotionStateV106, input: DirectionInput, facing: -1 | 1, frame: number, eligible: boolean): PitWorkbookMotionStateV106 {
  if (!eligible) return freshPitWorkbookMotionV106(facing);
  const horizontal = (Number(Boolean(input.right)) - Number(Boolean(input.left))) * facing;
  const direction = (input.down ? 2 + horizontal : 5 + horizontal) as PitWorkbookDirectionV106;
  const steps = previous.facing === facing ? previous.steps.filter(step => frame - step.frame <= PIT_WORKBOOK_MOTION_WINDOW_V106).map(step => ({...step})) : [];
  if (previous.facing !== facing || previous.held !== direction) steps.push({direction, frame});
  return {facing, held: direction, steps: steps.slice(-12)};
}
export function resolvePitWorkbookMotionV106(motion: PitWorkbookMotionStateV106, frame: number): '236236' | '236' | '623' | '214' | '22' | null {
  const steps = motion.steps.slice();
  if (steps.at(-1)?.direction === 5) steps.pop();
  const final = steps.at(-1);
  if (!final || frame - final.frame > PIT_WORKBOOK_MOTION_BUTTON_WINDOW_V106) return null;
  for (const [name, pattern] of [['236236',[2,3,6,2,3,6]],['623',[6,2,3]],['236',[2,3,6]],['214',[2,1,4]],['22',[2,5,2]]] as const) {
    const part = steps.slice(-pattern.length);
    if (part.length === pattern.length && part.every((step,index) => step.direction === pattern[index]) &&
      frame - part[0].frame <= PIT_WORKBOOK_MOTION_WINDOW_V106) return name;
  }
  return null;
}
export function validPitWorkbookMotionV106(value: unknown, frame: number): value is PitWorkbookMotionStateV106 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const motion=value as PitWorkbookMotionStateV106;
  if (Object.keys(value).length !== 3 || ![1,2,3,4,5,6].includes(motion.held) || motion.facing !== -1 && motion.facing !== 1 || !Array.isArray(motion.steps) || motion.steps.length > 12) return false;
  if (motion.steps.length && motion.steps.at(-1)?.direction !== motion.held) return false;
  return motion.steps.every((step,index) => step && Object.keys(step).length === 2 && [1,2,3,4,5,6].includes(step.direction) && Number.isSafeInteger(step.frame) && step.frame >= Math.max(0,frame-PIT_WORKBOOK_MOTION_WINDOW_V106) && step.frame <= frame &&
    (index === 0 || step.frame > motion.steps[index-1].frame && step.direction !== motion.steps[index-1].direction));
}
