export const HUNT_GAMEPAD_LABELS_V112=["A / Croix","B / Cercle","X / Carré","Y / Triangle","LB / L1","RB / R1","LT / L2","RT / R2","Select / Share","Start / Options","Stick gauche","Stick droit"] as const;
/** Serializable preferences; runtime latches never enter a campaign/checkpoint. */
export const HUNT_GAMEPAD_ACTIONS_V112 = ["jump","melee","weapon","scan","cloak","heal","interact","weaponNext","gearOne","gearTwo","pause","aim"] as const;
export type HuntGamepadActionV112 = typeof HUNT_GAMEPAD_ACTIONS_V112[number];
export type HuntGamepadButtonsV112 = Readonly<Record<HuntGamepadActionV112,number>>;
export interface HuntAccessibilityV112 {
  version:1;
  ritualTiming:"normal"|"generous"|"unlimited";
  ritualConfirm:"press"|"hold"|"toggle";
  gripInput:"hold"|"toggle";
  aimInput:"hold"|"toggle";
  fieldGuide:boolean;
  largeGlyphs:boolean;
  gamepadButtons:HuntGamepadButtonsV112;
}
export const DEFAULT_HUNT_GAMEPAD_V112:HuntGamepadButtonsV112=Object.freeze({jump:0,melee:2,weapon:7,scan:4,cloak:3,heal:5,interact:1,weaponNext:8,gearOne:10,gearTwo:11,pause:9,aim:6});
export const DEFAULT_HUNT_ACCESSIBILITY_V112:HuntAccessibilityV112=Object.freeze({
  version:1,ritualTiming:"normal",ritualConfirm:"press",gripInput:"hold",aimInput:"hold",
  fieldGuide:true,largeGlyphs:true,gamepadButtons:DEFAULT_HUNT_GAMEPAD_V112,
});
const object=(raw:unknown):raw is Record<string,unknown>=>!!raw&&typeof raw==="object"&&!Array.isArray(raw);
export function normalizeHuntAccessibilityV112(raw:unknown):HuntAccessibilityV112 {
  if(!object(raw)||raw.version!==1)return {...DEFAULT_HUNT_ACCESSIBILITY_V112,gamepadButtons:{...DEFAULT_HUNT_GAMEPAD_V112}};
  const source=object(raw.gamepadButtons)?raw.gamepadButtons:{};
  const values=HUNT_GAMEPAD_ACTIONS_V112.map(action=>source[action]);
  const valid=values.every(value=>Number.isInteger(value)&&(value as number)>=0&&(value as number)<12)&&new Set(values).size===12;
  return {
    version:1,
    ritualTiming:raw.ritualTiming==="generous"||raw.ritualTiming==="unlimited"?raw.ritualTiming:"normal",
    ritualConfirm:raw.ritualConfirm==="hold"||raw.ritualConfirm==="toggle"?raw.ritualConfirm:"press",
    gripInput:raw.gripInput==="toggle"?"toggle":"hold",
    aimInput:raw.aimInput==="toggle"?"toggle":"hold",
    fieldGuide:typeof raw.fieldGuide==="boolean"?raw.fieldGuide:true,
    largeGlyphs:typeof raw.largeGlyphs==="boolean"?raw.largeGlyphs:true,
    gamepadButtons:valid?Object.fromEntries(HUNT_GAMEPAD_ACTIONS_V112.map(action=>[action,source[action]])) as Record<HuntGamepadActionV112,number>:{...DEFAULT_HUNT_GAMEPAD_V112},
  };
}
/** Swapping preserves every action, unlike assigning a conflicting button. */
export function rebindHuntGamepadV112(settings:HuntAccessibilityV112,action:HuntGamepadActionV112,button:number):HuntAccessibilityV112 {
  const normalized=normalizeHuntAccessibilityV112(settings);
  if(!HUNT_GAMEPAD_ACTIONS_V112.includes(action)||!Number.isInteger(button)||button<0||button>=12)return normalized;
  const other=HUNT_GAMEPAD_ACTIONS_V112.find(id=>normalized.gamepadButtons[id]===button);
  const gamepadButtons={...normalized.gamepadButtons,[action]:button};
  if(other)gamepadButtons[other]=normalized.gamepadButtons[action];
  return {...normalized,gamepadButtons};
}
export interface HoldToggleStateV112 { upPhysical:boolean;aimPhysical:boolean;upLatched:boolean;aimLatched:boolean }
export function stepHoldTogglesV112(previous:HoldToggleStateV112|undefined,physical:{up:boolean;aim:boolean},reset=false):HoldToggleStateV112 {
  const p=previous??{upPhysical:false,aimPhysical:false,upLatched:false,aimLatched:false};
  return {upPhysical:physical.up,aimPhysical:physical.aim,
    upLatched:reset?false:physical.up&&!p.upPhysical?!p.upLatched:p.upLatched,
    aimLatched:reset?false:physical.aim&&!p.aimPhysical?!p.aimLatched:p.aimLatched};
}
export type RitualAssistEventV112="press"|"down"|"up"|"cancel"|null;
export interface RitualAssistStateV112 { cueKey:string|null;held:boolean;armed:boolean;heldSeconds:number }
export const freshRitualAssistV112=():RitualAssistStateV112=>({cueKey:null,held:false,armed:false,heldSeconds:0});
/** One explicit confirmation per glyph. Holding/latching never auto-solves the next cue. */
export function stepRitualAssistV112(previous:RitualAssistStateV112,options:{
  cueKey:string;phase:"ready"|"cue";cueElapsedSeconds:number;deltaSeconds:number;
  mode:HuntAccessibilityV112["ritualConfirm"];timing:HuntAccessibilityV112["ritualTiming"];event:RitualAssistEventV112;
}):{state:RitualAssistStateV112;confirm:boolean} {
  const delta=Number.isFinite(options.deltaSeconds)?Math.max(0,Math.min(.1,options.deltaSeconds)):0;
  let state=previous.cueKey===options.cueKey?{...previous}:{...freshRitualAssistV112(),cueKey:options.cueKey};
  if(options.event==="cancel")return {state:{...freshRitualAssistV112(),cueKey:options.cueKey},confirm:false};
  if(options.event==="up")state={...state,held:false,heldSeconds:0};
  if(options.event==="down")state.held=true;
  if(options.event==="press"&&options.mode==="toggle")state.armed=!state.armed;
  if(options.phase==="ready")return {state,confirm:false};
  const target=options.timing==="unlimited"?.4:options.timing==="generous"?1:.5;
  if(state.held)state.heldSeconds+=delta;
  const confirm=options.mode==="press"?options.event==="press":
    options.mode==="hold"?state.held&&state.heldSeconds>=.35&&options.cueElapsedSeconds+delta>=target:
      state.armed&&options.cueElapsedSeconds+delta>=target;
  return {state:confirm?{...state,held:false,armed:false,heldSeconds:0}:state,confirm};
}
