/** V174 · Launch intro: studio card, author card, then the title screen that waits
 * for a key, click, touch or gamepad button before the main menu. Pure state, no timers. */
export type StudioIntroPhaseV174 = "studio" | "author" | "title" | "done";
export interface StudioIntroStateV174 { phase: StudioIntroPhaseV174; elapsed: number }
export type StudioIntroEventV174 = { type: "tick"; seconds: number } | { type: "press" };

/** Seconds each credit card stays on screen before the next one. */
export const STUDIO_INTRO_TIMINGS_V174 = Object.freeze({ studio: 3.2, author: 2.4 });

export const STUDIO_INTRO_TEXT_V174 = Object.freeze({
  studio: "A Darknigthmare Kingdoms Games production",
  author: "by Darknigthmare",
  title: "Yautja",
  subtitle: "La Longue Chasse",
  prompt: "Appuyez sur une touche",
});

export function initialStudioIntroV174(): StudioIntroStateV174 {
  return { phase: "studio", elapsed: 0 };
}

/** Cards advance on time; a press skips any card to the title, and leaves the title. */
export function advanceStudioIntroV174(state: StudioIntroStateV174, event: StudioIntroEventV174): StudioIntroStateV174 {
  if (state.phase === "done") return state;
  if (event.type === "press") return state.phase === "title" ? { phase: "done", elapsed: 0 } : { phase: "title", elapsed: 0 };
  if (state.phase === "title" || !(event.seconds > 0)) return state;
  const elapsed = state.elapsed + event.seconds;
  const limit = STUDIO_INTRO_TIMINGS_V174[state.phase];
  if (elapsed < limit) return { phase: state.phase, elapsed };
  return { phase: state.phase === "studio" ? "author" : "title", elapsed: 0 };
}

/** The intro plays on each launch, except under automation or with ?intro=0; ?intro=1 forces it. */
export function studioIntroEnabledV174(search: string, webdriver: boolean): boolean {
  const flag = new URLSearchParams(search).get("intro");
  if (flag === "1") return true;
  if (flag === "0") return false;
  return !webdriver;
}
