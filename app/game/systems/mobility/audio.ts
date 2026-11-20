import type { SceneAudioPort, SceneAudioSound } from '../sceneAudio';
import { MOBILITY_YARD, type MobilityCourseState, type MobilityInput } from './course';
import type { MountRideCourseV156 } from './mountRidingV156';

const SILENT_MOTOR: SceneAudioSound = {};
const MACHINE_MOTOR = {
  sled: { base: 83, upper: 174, type: 'sine' },
  bike: { base: 46, upper: 97, type: 'triangle' },
} as const;

const COURSE_MARK: SceneAudioSound = { tones: [
  { frequency: 510, duration: .08, gain: .075 },
  { frequency: 735, delay: .08, duration: .12, gain: .07 },
] };
const LOAD: SceneAudioSound = {
  tones: [{ frequency: 148, endFrequency: 91, duration: .19, type: 'triangle', gain: .14 }],
  noises: [{ duration: .11, filterType: 'lowpass', filterFrequency: 580, gain: .16 }],
};
const UNLOAD: SceneAudioSound = {
  tones: [{ frequency: 230, endFrequency: 375, duration: .13, type: 'triangle', gain: .12 }],
  noises: [{ duration: .15, filterFrequency: 770, gain: .105 }],
};
const DRIVE_IMPACT: SceneAudioSound = {
  tones: [{ frequency: 70, endFrequency: 34, duration: .26, type: 'triangle', gain: .19 }],
  noises: [{ duration: .27, filterFrequency: 1750, endFilterFrequency: 320, gain: .21 }],
};
const SKID: SceneAudioSound = {
  noises: [{ duration: .25, filterFrequency: 1260, endFilterFrequency: 405, gain: .13 }],
};
const DUST: SceneAudioSound = {
  noises: [{ duration: .28, filterType: 'lowpass', filterFrequency: 510, endFilterFrequency: 240, gain: .12 }],
};
const HEAT_LIMIT: SceneAudioSound = {
  tones: [{ frequency: 460, endFrequency: 235, duration: .26, type: 'triangle', gain: .1 }],
};

const HOOF: SceneAudioSound = {
  tones: [{ frequency: 96, endFrequency: 40, duration: .1, type: 'triangle', gain: .13 }],
  noises: [{ duration: .075, filterFrequency: 315, gain: .12 }],
};
const FAST_HOOF: SceneAudioSound = {
  tones: [{ frequency: 127, endFrequency: 45, duration: .095, type: 'triangle', gain: .17 }],
  noises: [{ duration: .08, filterFrequency: 510, gain: .16 }],
};
const MOUNT_EFFORT: SceneAudioSound = {
  noises: [{ duration: .43, filterFrequency: 470, endFilterFrequency: 200, gain: .12 }],
};
const MOUNT_PANIC: SceneAudioSound = {
  tones: [{ frequency: 335, endFrequency: 111, duration: .4, type: 'triangle', gain: .15 }],
  noises: [{ duration: .38, filterFrequency: 720, endFilterFrequency: 270, gain: .19 }],
};

function onAsh(state: Pick<MobilityCourseState, 'x' | 'y'>): boolean {
  const ash = MOBILITY_YARD.mud;
  return state.x >= ash.x && state.x <= ash.x + ash.w && state.y >= ash.y && state.y <= ash.y + ash.h;
}

export const createMobilityAudio = (
  port: SceneAudioPort,
  modelId: string,
) => {
  let motorKey: string | null = null;
  let braking = false;

  function drive(before: MobilityCourseState, after: MobilityCourseState, input: MobilityInput) {
    const machine = modelId === 'scout_grav_sled' ? 'sled' : 'bike';
    const speed = Math.abs(after.speed);
    const hasPower = after.condition > 0 && after.energy > 0;
    const engineMode = !hasPower ? 'off'
      : input.boost && !input.brake && input.throttle > 0 && !after.overheated ? 'boost'
      : speed > 20 || input.throttle !== 0 ? 'drive' : 'idle';
    const key = machine + ':' + engineMode;
    if (key !== motorKey) {
      motorKey = key;
      const motor = MACHINE_MOTOR[machine];
      const pitch = engineMode === 'boost' ? 1.72 : engineMode === 'drive' ? 1.28 : 1;
      port.loop(key, hasPower ? {
        tones: [
          { frequency: motor.base * pitch, type: motor.type, gain: .075, filterFrequency: 380 },
          { frequency: motor.upper * pitch, type: 'sine', gain: .026 },
        ],
      } : SILENT_MOTOR);
    }
    if (after.impacts > before.impacts) port.play(DRIVE_IMPACT);
    if (after.cargoKg > before.cargoKg) port.play(LOAD);
    if (after.cargoDelivered && !before.cargoDelivered) port.play(UNLOAD);
    if (after.checkpoint > before.checkpoint) port.play(COURSE_MARK);
    if (after.overheated && !before.overheated) port.play(HEAT_LIMIT);
    if (input.brake && !braking && Math.abs(before.speed) > 26) port.play(SKID);
    if (speed > 18 && onAsh(after) && !onAsh(before)) port.play(DUST);
    braking = input.brake;
  }

  function ride(before: MountRideCourseV156, after: MountRideCourseV156) {
    if (after.checkpoint > before.checkpoint) port.play(COURSE_MARK);
    if (after.panicked && !before.panicked) {
      port.play(MOUNT_PANIC);
      return;
    }
    if (after.impacts > before.impacts) port.play(HOOF);
    if (after.fatigue >= 80 && before.fatigue < 80) port.play(MOUNT_EFFORT);
    const running = Math.abs(after.speed) > 64;
    const stride = running ? 34 : 24;
    if (after.distance > before.distance && Math.floor(after.distance / stride) > Math.floor(before.distance / stride)) {
      port.play(running ? FAST_HOOF : HOOF);
    }
  }

  return {
    drive,
    ride,
    unlock: () => port.unlock(),
    stop() {
      motorKey = null;
      braking = false;
      port.stop();
    },
    dispose: () => port.dispose(),
  };
};
