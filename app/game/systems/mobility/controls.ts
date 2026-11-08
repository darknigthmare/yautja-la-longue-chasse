import type { MobilityInput } from './course.ts';

export type MobilityControl = 'forward' | 'reverse' | 'left' | 'right' | 'brake' | 'boost' | 'interact';
const VALID = new Set<MobilityControl>(['forward','reverse','left','right','brake','boost','interact']);
export const idleMobilityInput = (): MobilityInput => ({ throttle:0, steer:0, brake:false, boost:false, interact:false });

/** One source per physical key or pointer. Releasing one finger never releases another. */
export class MobilityHeldControls {
  private readonly sources = new Map<string, readonly MobilityControl[]>();
  press(source: string, controls: readonly MobilityControl[]): void {
    if (!source || source.length > 80 || !controls.every(c => VALID.has(c))) return;
    if (!this.sources.has(source) && this.sources.size >= 32) return;
    this.sources.set(source, [...new Set(controls)]);
  }
  release(source: string): void { this.sources.delete(source); }
  clear(): void { this.sources.clear(); }
  resolve(pad: MobilityInput = idleMobilityInput()): MobilityInput {
    const held = new Set([...this.sources.values()].flat());
    const axis = (positive: MobilityControl, negative: MobilityControl, fallback: -1|0|1): -1|0|1 =>
      held.has(positive) || held.has(negative) ? (Number(held.has(positive)) - Number(held.has(negative))) as -1|0|1 : fallback;
    return { throttle:axis('forward','reverse',pad.throttle), steer:axis('right','left',pad.steer),
      brake:held.has('brake') || pad.brake, boost:held.has('boost') || pad.boost,
      interact:held.has('interact') || pad.interact };
  }
}

export interface MobilityPadSnapshot {
  index:number; id:string; connected:boolean; mapping:string;
  axes:readonly number[]; buttons:readonly { pressed:boolean }[];
}
interface PadSample { input:MobilityInput; pauseRequested:boolean; waitingForNeutral:boolean }
const isUsable = (p: MobilityPadSnapshot | null | undefined): p is MobilityPadSnapshot => Boolean(p && p.connected && p.mapping === 'standard' &&
  Number.isSafeInteger(p.index) && p.index >= 0 && p.axes.length >= 2 &&
  p.axes.slice(0,2).every(a => Number.isFinite(a) && Math.abs(a) <= 1));

/** A newly selected/reconnected pad must return to neutral before driving. */
export class MobilityPadGate {
  private selected: {index:number; id:string} | null = null;
  private armed = false;
  private used = false;
  reset(): void { this.selected=null; this.armed=false; this.used=false; }
  sample(pads: readonly (MobilityPadSnapshot|null)[]): PadSample {
    const empty = (): PadSample => ({input:idleMobilityInput(),pauseRequested:false,waitingForNeutral:false});
    let pad: MobilityPadSnapshot | undefined;
    if (this.selected) {
      pad = pads.find(p => isUsable(p) && p.index === this.selected!.index && p.id === this.selected!.id) ?? undefined;
      if (!pad) { const pauseRequested=this.used; this.reset(); return {...empty(),pauseRequested}; }
    } else {
      pad = pads.find(isUsable) ?? undefined;
      if (!pad) return empty();
      this.selected={index:pad.index,id:pad.id};
    }
    const pressed = (i:number) => pad!.buttons[i]?.pressed === true;
    const axis = (value:number): -1|0|1 => value < -.25 ? -1 : value > .25 ? 1 : 0;
    const input:MobilityInput = {throttle:axis(-pad.axes[1]),steer:axis(pad.axes[0]),
      brake:pressed(0),boost:pressed(7),interact:pressed(2)};
    const neutral=input.throttle===0 && input.steer===0 && !input.brake && !input.boost && !input.interact && !pressed(9);
    if (!this.armed) { if (neutral) this.armed=true; return {...empty(),waitingForNeutral:!neutral}; }
    if (!neutral) this.used=true;
    return {input,pauseRequested:pressed(9),waitingForNeutral:false};
  }
}
