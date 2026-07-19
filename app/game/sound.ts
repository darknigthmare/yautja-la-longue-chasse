/**
 * Petit moteur sonore procédural pour le jeu.
 *
 * Aucun AudioContext n'est créé au chargement du module : la classe peut donc
 * être importée pendant le rendu serveur sans accéder aux API du navigateur.
 */

const OUTPUT_HEADROOM = 0.18;
const SILENCE = 0.0001;

type AudioContextFactory = new () => AudioContext;

export type GameAudioBiome = "ship" | "jungle" | "ice" | "volcano";

export type GameSfxId =
  | "ui"
  | "select"
  | "jump"
  | "footstep"
  | "slash"
  | "plasma"
  | "scan"
  | "cloak-on"
  | "cloak-off"
  | "mask-on"
  | "mask-off"
  | "weapon-switch"
  | "medicomp"
  | "netgun"
  | "snare"
  | "enemy-alert"
  | "objective"
  | "hit"
  | "trophy"
  | "victory"
  | "defeat";

export interface GameAudioMix {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

export interface AmbienceOptions {
  fadeSeconds?: number;
}

type ToneOptions = {
  at?: number;
  duration?: number;
  endFrequency?: number;
  gain?: number;
  type?: OscillatorType;
  filterFrequency?: number;
};

type NoiseOptions = {
  at?: number;
  duration?: number;
  gain?: number;
  filterFrequency?: number;
  filterType?: BiquadFilterType;
  endFilterFrequency?: number;
};

type CloakVoice = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
};

type AmbienceVoice = {
  biome: GameAudioBiome;
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
};

interface SafariAudioWindow extends Window {
  webkitAudioContext?: AudioContextFactory;
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private muted = false;
  private masterVolume = 1;
  private musicVolume = 0.65;
  private effectsVolume = 1;
  private disposed = false;
  private cloakVoice: CloakVoice | null = null;
  private ambienceVoice: AmbienceVoice | null = null;

  /**
   * À appeler depuis une interaction utilisateur pour satisfaire les règles
   * d'autoplay des navigateurs. La méthode est idempotente et sûre côté SSR.
   */
  async unlock(): Promise<void> {
    if (this.disposed || typeof window === "undefined") {
      return;
    }

    if (!this.context) {
      const BrowserAudioContext =
        window.AudioContext ??
        (window as SafariAudioWindow).webkitAudioContext;

      if (!BrowserAudioContext) {
        return;
      }

      try {
        const context = new BrowserAudioContext();
        const master = context.createGain();
        const music = context.createGain();
        const effects = context.createGain();
        const limiter = context.createDynamicsCompressor();

        // Le limiteur garde les superpositions discrètes et sans saturation.
        master.gain.value = this.targetMasterGain();
        music.gain.value = this.musicVolume;
        effects.gain.value = this.effectsVolume;
        limiter.threshold.value = -16;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.14;
        music.connect(master);
        effects.connect(master);
        master.connect(limiter);
        limiter.connect(context.destination);

        this.context = context;
        this.master = master;
        this.music = music;
        this.effects = effects;
      } catch {
        return;
      }
    }

    try {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      // Une impulsion muette amorce notamment Web Audio sur Safari/iOS.
      const primer = this.context.createBufferSource();
      primer.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      primer.connect(this.master!);
      primer.start();
    } catch {
      // Un refus d'autoplay ne doit jamais interrompre la partie.
    }
  }

  /** Active ou coupe le bus principal sans recréer le contexte audio. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMix();
  }

  /** Niveau général normalisé entre 0 et 1. */
  setMasterGain(gain: number): void {
    this.masterVolume = this.normalizedGain(gain);
    this.applyMix();
  }

  setMasterVolume(volume: number): void {
    this.setMasterGain(volume);
  }

  /** Niveau du bus d'ambiance normalisé entre 0 et 1. */
  setMusicGain(gain: number): void {
    this.musicVolume = this.normalizedGain(gain);
    this.applyMix();
  }

  setMusicVolume(volume: number): void {
    this.setMusicGain(volume);
  }

  /** Niveau des sons courts et des boucles de gameplay. */
  setEffectsGain(gain: number): void {
    this.effectsVolume = this.normalizedGain(gain);
    this.applyMix();
  }

  setEffectsVolume(volume: number): void {
    this.setEffectsGain(volume);
  }

  setMix(mix: Partial<GameAudioMix>): void {
    if (mix.master !== undefined) {
      this.masterVolume = this.normalizedGain(mix.master);
    }
    if (mix.music !== undefined) {
      this.musicVolume = this.normalizedGain(mix.music);
    }
    if (mix.effects !== undefined) {
      this.effectsVolume = this.normalizedGain(mix.effects);
    }
    if (mix.muted !== undefined) {
      this.muted = mix.muted;
    }
    this.applyMix();
  }

  getMix(): GameAudioMix {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      effects: this.effectsVolume,
      muted: this.muted,
    };
  }

  get activeAmbience(): GameAudioBiome | null {
    return this.ambienceVoice?.biome ?? null;
  }

  /**
   * Démarre ou remplace l'ambiance procédurale d'un lieu. Rappeler le biome
   * actif est idempotent et ne crée aucune voix supplémentaire.
   */
  async startAmbience(
    biome: GameAudioBiome,
    options: AmbienceOptions = {},
  ): Promise<void> {
    if (this.disposed || this.ambienceVoice?.biome === biome) return;
    await this.unlock();
    const now = this.readyTime();
    if (now === null) return;
    const fadeSeconds = Math.max(0, options.fadeSeconds ?? 0.7);
    const previous = this.ambienceVoice;
    const next = this.createAmbienceVoice(biome, now, fadeSeconds);
    if (!next) return;
    this.ambienceVoice = next;
    if (previous) {
      this.stopAmbienceVoice(previous, now, fadeSeconds);
    }
  }

  stopAmbience(fadeSeconds = 0.45): void {
    const voice = this.ambienceVoice;
    const context = this.context;
    if (!voice || !context) return;
    this.ambienceVoice = null;
    this.stopAmbienceVoice(
      voice,
      context.currentTime,
      Math.max(0, fadeSeconds),
    );
  }

  // -------------------------------------------------------------------------
  // Sons courts d'interface et de déplacement
  // -------------------------------------------------------------------------

  ui(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.tone(620, {
      at: now,
      duration: 0.045,
      endFrequency: 780,
      gain: 0.11,
      type: "sine",
    });
  }

  select(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.tone(330, {
      at: now,
      duration: 0.07,
      endFrequency: 430,
      gain: 0.12,
      type: "triangle",
    });
    this.tone(660, {
      at: now + 0.055,
      duration: 0.09,
      endFrequency: 820,
      gain: 0.1,
      type: "sine",
    });
  }

  jump(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.16,
      gain: 0.13,
      filterType: "bandpass",
      filterFrequency: 420,
      endFilterFrequency: 1_500,
    });
    this.tone(115, {
      at: now,
      duration: 0.17,
      endFrequency: 310,
      gain: 0.14,
      type: "triangle",
      filterFrequency: 1_200,
    });
  }

  /**
   * Point d'entrée réutilisable pour les événements de gameplay pilotés par
   * des données. Les méthodes historiques restent disponibles individuellement.
   */
  playSfx(id: GameSfxId): void {
    switch (id) {
      case "ui":
        this.ui();
        break;
      case "select":
        this.select();
        break;
      case "jump":
        this.jump();
        break;
      case "footstep":
        this.footstep();
        break;
      case "slash":
        this.slash();
        break;
      case "plasma":
        this.plasma();
        break;
      case "scan":
        this.scan();
        break;
      case "cloak-on":
        this.cloak(true);
        break;
      case "cloak-off":
        this.cloak(false);
        break;
      case "mask-on":
        this.mask(true);
        break;
      case "mask-off":
        this.mask(false);
        break;
      case "weapon-switch":
        this.weaponSwitch();
        break;
      case "medicomp":
        this.medicomp();
        break;
      case "netgun":
        this.netgun();
        break;
      case "snare":
        this.snare();
        break;
      case "enemy-alert":
        this.enemyAlert();
        break;
      case "objective":
        this.objective();
        break;
      case "hit":
        this.hit();
        break;
      case "trophy":
        this.trophy();
        break;
      case "victory":
        this.victory();
        break;
      case "defeat":
        this.defeat();
        break;
    }
  }

  footstep(intensity = 1): void {
    const now = this.readyTime();
    if (now === null) return;
    const weight = Math.max(0.25, Math.min(1.5, intensity));

    this.noise({
      at: now,
      duration: 0.065,
      gain: 0.075 * weight,
      filterType: "lowpass",
      filterFrequency: 310,
      endFilterFrequency: 90,
    });
    this.tone(72, {
      at: now,
      duration: 0.075,
      endFrequency: 44,
      gain: 0.055 * weight,
      type: "sine",
      filterFrequency: 280,
    });
  }

  weaponSwitch(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.055,
      gain: 0.09,
      filterType: "bandpass",
      filterFrequency: 1_900,
      endFilterFrequency: 650,
    });
    this.tone(210, {
      at: now + 0.025,
      duration: 0.065,
      endFrequency: 340,
      gain: 0.075,
      type: "square",
      filterFrequency: 1_100,
    });
  }

  mask(on: boolean): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: on ? 0.19 : 0.12,
      gain: 0.075,
      filterType: "bandpass",
      filterFrequency: on ? 760 : 1_400,
      endFilterFrequency: on ? 2_100 : 430,
    });
    this.tone(on ? 235 : 510, {
      at: now + 0.02,
      duration: 0.16,
      endFrequency: on ? 720 : 150,
      gain: 0.065,
      type: "triangle",
      filterFrequency: 1_700,
    });
  }

  medicomp(): void {
    const now = this.readyTime();
    if (now === null) return;

    [0, 0.13, 0.26].forEach((offset, index) => {
      this.tone(410 + index * 145, {
        at: now + offset,
        duration: 0.1,
        endFrequency: 520 + index * 160,
        gain: 0.065,
        type: "sine",
        filterFrequency: 2_200,
      });
    });
  }

  netgun(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.22,
      gain: 0.16,
      filterType: "highpass",
      filterFrequency: 780,
      endFilterFrequency: 3_700,
    });
    this.tone(185, {
      at: now,
      duration: 0.16,
      endFrequency: 520,
      gain: 0.11,
      type: "sawtooth",
      filterFrequency: 1_900,
    });
  }

  snare(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.18,
      gain: 0.13,
      filterType: "bandpass",
      filterFrequency: 2_800,
      endFilterFrequency: 540,
    });
    this.tone(104, {
      at: now + 0.025,
      duration: 0.22,
      endFrequency: 62,
      gain: 0.1,
      type: "triangle",
      filterFrequency: 520,
    });
  }

  enemyAlert(): void {
    const now = this.readyTime();
    if (now === null) return;

    [0, 0.16].forEach((offset) => {
      this.tone(690, {
        at: now + offset,
        duration: 0.105,
        endFrequency: 460,
        gain: 0.075,
        type: "square",
        filterFrequency: 1_650,
      });
    });
  }

  objective(): void {
    const now = this.readyTime();
    if (now === null) return;

    [392, 523.25, 659.25].forEach((frequency, index) => {
      this.tone(frequency, {
        at: now + index * 0.085,
        duration: 0.16,
        endFrequency: frequency * 1.04,
        gain: 0.065,
        type: "sine",
        filterFrequency: 2_300,
      });
    });
  }

  // -------------------------------------------------------------------------
  // Armes et capacités Yautja
  // -------------------------------------------------------------------------

  slash(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.13,
      gain: 0.22,
      filterType: "bandpass",
      filterFrequency: 3_400,
      endFilterFrequency: 720,
    });
    this.tone(1_250, {
      at: now,
      duration: 0.1,
      endFrequency: 160,
      gain: 0.1,
      type: "sawtooth",
      filterFrequency: 2_800,
    });
  }

  plasma(): void {
    const now = this.readyTime();
    if (now === null) return;

    // Deux balayages désaccordés donnent un tir énergétique non terrestre.
    this.tone(540, {
      at: now,
      duration: 0.2,
      endFrequency: 72,
      gain: 0.19,
      type: "sawtooth",
      filterFrequency: 1_900,
    });
    this.tone(780, {
      at: now + 0.012,
      duration: 0.16,
      endFrequency: 105,
      gain: 0.1,
      type: "square",
      filterFrequency: 2_400,
    });
    this.noise({
      at: now + 0.015,
      duration: 0.18,
      gain: 0.16,
      filterType: "lowpass",
      filterFrequency: 2_200,
      endFilterFrequency: 180,
    });
  }

  scan(): void {
    const now = this.readyTime();
    if (now === null) return;

    // Trois impulsions évoquent le motif de visée sans reprendre un son connu.
    [0, 0.095, 0.19].forEach((offset, index) => {
      this.tone(520 + index * 115, {
        at: now + offset,
        duration: 0.075,
        endFrequency: 760 + index * 130,
        gain: 0.085,
        type: "sine",
        filterFrequency: 2_800,
      });
    });
  }

  cloak(on: boolean): void {
    const now = this.readyTime();
    if (now === null) return;

    if (!on) {
      this.stopCloak(now);
      this.tone(470, {
        at: now,
        duration: 0.13,
        endFrequency: 95,
        gain: 0.09,
        type: "triangle",
        filterFrequency: 1_200,
      });
      return;
    }

    if (this.cloakVoice) {
      return;
    }

    const context = this.context!;
    const bus = context.createGain();
    const shimmer = context.createBiquadFilter();
    const lowOscillator = context.createOscillator();
    const highOscillator = context.createOscillator();
    const noise = context.createBufferSource();

    bus.gain.setValueAtTime(SILENCE, now);
    bus.gain.exponentialRampToValueAtTime(0.055, now + 0.12);
    shimmer.type = "bandpass";
    shimmer.frequency.value = 1_050;
    shimmer.Q.value = 0.75;

    lowOscillator.type = "triangle";
    lowOscillator.frequency.value = 47;
    highOscillator.type = "sine";
    highOscillator.frequency.value = 53;
    noise.buffer = this.makeNoiseBuffer(0.45);
    noise.loop = true;

    lowOscillator.connect(shimmer);
    highOscillator.connect(shimmer);
    noise.connect(shimmer);
    shimmer.connect(bus);
    bus.connect(this.effects!);

    lowOscillator.start(now);
    highOscillator.start(now);
    noise.start(now);

    this.cloakVoice = {
      gain: bus,
      sources: [lowOscillator, highOscillator, noise],
    };

    // Une montée aiguë marque l'activation avant le bourdonnement discret.
    this.tone(85, {
      at: now,
      duration: 0.19,
      endFrequency: 920,
      gain: 0.08,
      type: "sine",
      filterFrequency: 1_800,
    });
  }

  hit(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.12,
      gain: 0.2,
      filterType: "lowpass",
      filterFrequency: 440,
      endFilterFrequency: 95,
    });
    this.tone(82, {
      at: now,
      duration: 0.16,
      endFrequency: 38,
      gain: 0.2,
      type: "sine",
      filterFrequency: 520,
    });
  }

  // -------------------------------------------------------------------------
  // Rituels et fins de mission
  // -------------------------------------------------------------------------

  trophy(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.drum(now, 95, 0.18);
    this.drum(now + 0.18, 82, 0.16);
    this.tone(410, {
      at: now + 0.12,
      duration: 0.46,
      endFrequency: 615,
      gain: 0.09,
      type: "triangle",
      filterFrequency: 1_500,
    });
  }

  victory(): void {
    const now = this.readyTime();
    if (now === null) return;

    // Battements tribaux sobres, suivis d'un accord alien ascendant.
    this.drum(now, 76, 0.19);
    this.drum(now + 0.22, 88, 0.18);
    this.drum(now + 0.44, 64, 0.22);

    [146.83, 220, 329.63].forEach((frequency, index) => {
      this.tone(frequency, {
        at: now + 0.34 + index * 0.11,
        duration: 0.72 - index * 0.08,
        endFrequency: frequency * 1.06,
        gain: 0.1,
        type: index === 1 ? "triangle" : "sine",
        filterFrequency: 1_100,
      });
    });
  }

  defeat(): void {
    const now = this.readyTime();
    if (now === null) return;

    this.noise({
      at: now,
      duration: 0.9,
      gain: 0.08,
      filterType: "lowpass",
      filterFrequency: 380,
      endFilterFrequency: 70,
    });
    this.tone(245, {
      at: now,
      duration: 0.85,
      endFrequency: 58,
      gain: 0.15,
      type: "sawtooth",
      filterFrequency: 650,
    });
    this.tone(154, {
      at: now + 0.08,
      duration: 0.92,
      endFrequency: 42,
      gain: 0.11,
      type: "triangle",
      filterFrequency: 480,
    });
  }

  /** Arrête les boucles, déconnecte le graphe et ferme le contexte. */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    if (this.context) {
      this.stopCloak(this.context.currentTime, true);
      if (this.ambienceVoice) {
        const voice = this.ambienceVoice;
        this.ambienceVoice = null;
        this.stopAmbienceVoice(voice, this.context.currentTime, 0);
      }
    }

    const context = this.context;
    this.music?.disconnect();
    this.effects?.disconnect();
    this.master?.disconnect();
    this.music = null;
    this.effects = null;
    this.master = null;
    this.context = null;

    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }

  // -------------------------------------------------------------------------
  // Outils de synthèse internes
  // -------------------------------------------------------------------------

  /** Renvoie l'instant audio courant uniquement lorsque le moteur est prêt. */
  private normalizedGain(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  private targetMasterGain(): number {
    return this.muted ? 0 : OUTPUT_HEADROOM * this.masterVolume;
  }

  private applyMix(fadeSeconds = 0.025): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    this.rampGain(this.master, this.targetMasterGain(), now, fadeSeconds);
    this.rampGain(this.music, this.musicVolume, now, fadeSeconds);
    this.rampGain(this.effects, this.effectsVolume, now, fadeSeconds);
  }

  private rampGain(
    node: GainNode | null,
    target: number,
    at: number,
    duration: number,
  ): void {
    if (!node) return;
    const parameter = node.gain;
    parameter.cancelScheduledValues(at);
    parameter.setValueAtTime(parameter.value, at);
    parameter.linearRampToValueAtTime(
      Math.max(0, target),
      at + Math.max(0.005, duration),
    );
  }

  private readyTime(): number | null {
    if (
      this.disposed ||
      !this.context ||
      !this.master ||
      !this.effects ||
      this.context.state !== "running"
    ) {
      return null;
    }

    return this.context.currentTime;
  }

  /** Synthétise une note avec une attaque brève et une extinction douce. */
  private tone(frequency: number, options: ToneOptions = {}): void {
    const context = this.context;
    const effects = this.effects;
    if (!context || !effects) return;

    const start = options.at ?? context.currentTime;
    const duration = Math.max(0.025, options.duration ?? 0.12);
    const end = start + duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.endFrequency ?? frequency),
      end,
    );

    filter.type = "lowpass";
    filter.frequency.value = options.filterFrequency ?? 4_800;
    filter.Q.value = 0.55;

    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(SILENCE, options.gain ?? 0.12),
      start + Math.min(0.012, duration * 0.2),
    );
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(effects);
    oscillator.start(start);
    oscillator.stop(end + 0.02);

    oscillator.addEventListener(
      "ended",
      () => {
        oscillator.disconnect();
        filter.disconnect();
        envelope.disconnect();
      },
      { once: true },
    );
  }

  /** Produit un souffle filtré, utilisé pour impacts, lames et énergie. */
  private noise(options: NoiseOptions = {}): void {
    const context = this.context;
    const effects = this.effects;
    if (!context || !effects) return;

    const start = options.at ?? context.currentTime;
    const duration = Math.max(0.035, options.duration ?? 0.15);
    const end = start + duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();

    source.buffer = this.makeNoiseBuffer(duration + 0.03);
    filter.type = options.filterType ?? "bandpass";
    filter.frequency.setValueAtTime(
      Math.max(20, options.filterFrequency ?? 1_200),
      start,
    );
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(
        20,
        options.endFilterFrequency ?? options.filterFrequency ?? 1_200,
      ),
      end,
    );
    filter.Q.value = options.filterType === "lowpass" ? 0.7 : 1.1;

    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(SILENCE, options.gain ?? 0.12),
      start + Math.min(0.008, duration * 0.15),
    );
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(effects);
    source.start(start);
    source.stop(end + 0.015);

    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      },
      { once: true },
    );
  }

  /** Tambour synthétique : membrane grave accompagnée d'un léger claquement. */
  private drum(at: number, frequency: number, gain: number): void {
    this.tone(frequency, {
      at,
      duration: 0.24,
      endFrequency: Math.max(32, frequency * 0.42),
      gain,
      type: "sine",
      filterFrequency: 620,
    });
    this.noise({
      at,
      duration: 0.055,
      gain: gain * 0.45,
      filterType: "lowpass",
      filterFrequency: 680,
      endFilterFrequency: 160,
    });
  }

  /** Assemble une ambiance continue et l'envoie exclusivement vers la musique. */
  private createAmbienceVoice(
    biome: GameAudioBiome,
    at: number,
    fadeSeconds: number,
  ): AmbienceVoice | null {
    const context = this.context;
    const music = this.music;
    if (!context || !music) return null;

    const gain = context.createGain();
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    const targetGain = 0.34;

    gain.gain.setValueAtTime(0, at);
    if (fadeSeconds > 0) {
      gain.gain.linearRampToValueAtTime(targetGain, at + fadeSeconds);
    } else {
      gain.gain.setValueAtTime(targetGain, at);
    }
    gain.connect(music);

    const addOscillator = (
      frequency: number,
      type: OscillatorType,
      level: number,
    ) => {
      const oscillator = context.createOscillator();
      const levelGain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      levelGain.gain.value = level;
      oscillator.connect(levelGain);
      levelGain.connect(gain);
      oscillator.start(at);
      sources.push(oscillator);
      nodes.push(levelGain);
    };

    const addNoise = (
      filterType: BiquadFilterType,
      filterFrequency: number,
      level: number,
      q = 0.7,
    ) => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const levelGain = context.createGain();
      source.buffer = this.makeNoiseBuffer(2.4);
      source.loop = true;
      filter.type = filterType;
      filter.frequency.value = filterFrequency;
      filter.Q.value = q;
      levelGain.gain.value = level;
      source.connect(filter);
      filter.connect(levelGain);
      levelGain.connect(gain);
      source.start(at);
      sources.push(source);
      nodes.push(filter, levelGain);
    };

    switch (biome) {
      case "ship":
        addOscillator(42, "triangle", 0.11);
        addOscillator(61, "sine", 0.035);
        addNoise("lowpass", 300, 0.035);
        break;
      case "jungle":
        addOscillator(58, "triangle", 0.035);
        addNoise("bandpass", 850, 0.07, 0.45);
        addNoise("lowpass", 2_200, 0.025);
        break;
      case "ice":
        addOscillator(118, "sine", 0.025);
        addOscillator(920, "sine", 0.008);
        addNoise("bandpass", 1_100, 0.075, 0.35);
        break;
      case "volcano":
        addOscillator(34, "sine", 0.12);
        addOscillator(47, "triangle", 0.06);
        addNoise("lowpass", 180, 0.09);
        break;
    }

    const movement = context.createOscillator();
    const movementDepth = context.createGain();
    movement.type = "sine";
    movement.frequency.value = biome === "jungle" ? 0.12 : 0.075;
    movementDepth.gain.value = biome === "volcano" ? 0.025 : 0.016;
    movement.connect(movementDepth);
    movementDepth.connect(gain.gain);
    movement.start(at);
    sources.push(movement);
    nodes.push(movementDepth);

    return { biome, gain, sources, nodes };
  }

  private stopAmbienceVoice(
    voice: AmbienceVoice,
    at: number,
    fadeSeconds: number,
  ): void {
    const fade = Math.max(0, fadeSeconds);
    const stopAt = at + fade;
    const parameter = voice.gain.gain;
    parameter.cancelScheduledValues(at);
    parameter.setValueAtTime(parameter.value, at);
    if (fade > 0) {
      parameter.linearRampToValueAtTime(0, stopAt);
    } else {
      parameter.setValueAtTime(0, at);
    }

    voice.sources.forEach((source) => {
      try {
        source.stop(stopAt + 0.015);
      } catch {
        // Les appels répétés de nettoyage restent sans effet sur la partie.
      }
    });

    const cleanup = () => {
      voice.sources.forEach((source) => source.disconnect());
      voice.nodes.forEach((node) => node.disconnect());
      voice.gain.disconnect();
    };

    if (fade === 0) {
      cleanup();
      return;
    }

    globalThis.setTimeout(cleanup, (fade + 0.04) * 1_000);
  }

  /** Crée un buffer de bruit blanc à la demande, sans fichier sonore. */
  private makeNoiseBuffer(duration: number): AudioBuffer {
    const context = this.context!;
    const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  /** Éteint progressivement le bourdonnement persistant du camouflage. */
  private stopCloak(at: number, immediate = false): void {
    const voice = this.cloakVoice;
    if (!voice) return;

    this.cloakVoice = null;
    const stopAt = immediate ? at : at + 0.12;

    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(
      immediate ? SILENCE : Math.max(SILENCE, voice.gain.gain.value),
      at,
    );

    if (!immediate) {
      voice.gain.gain.exponentialRampToValueAtTime(SILENCE, stopAt);
    }

    voice.sources.forEach((source) => {
      try {
        source.stop(stopAt + 0.01);
      } catch {
        // Une source déjà arrêtée ne nécessite aucune autre action.
      }
    });

    const cleanupDelay = Math.max(0, (stopAt - at + 0.03) * 1_000);
    globalThis.setTimeout(() => {
      voice.sources.forEach((source) => source.disconnect());
      voice.gain.disconnect();
    }, cleanupDelay);
  }
}
