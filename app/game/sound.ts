/**
 * Petit moteur sonore procédural pour le jeu.
 *
 * Aucun AudioContext n'est créé au chargement du module : la classe peut donc
 * être importée pendant le rendu serveur sans accéder aux API du navigateur.
 */

const MASTER_VOLUME = 0.18;
const SILENCE = 0.0001;

type AudioContextFactory = new () => AudioContext;

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

interface SafariAudioWindow extends Window {
  webkitAudioContext?: AudioContextFactory;
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private disposed = false;
  private cloakVoice: CloakVoice | null = null;

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
        const limiter = context.createDynamicsCompressor();

        // Le limiteur garde les superpositions discrètes et sans saturation.
        master.gain.value = this.muted ? 0 : MASTER_VOLUME;
        limiter.threshold.value = -16;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.14;
        master.connect(limiter);
        limiter.connect(context.destination);

        this.context = context;
        this.master = master;
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

    const context = this.context;
    const master = this.master;
    if (!context || !master) {
      return;
    }

    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(
      muted ? 0 : MASTER_VOLUME,
      now + 0.025,
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
    bus.connect(this.master!);

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
    }

    const context = this.context;
    this.master?.disconnect();
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
  private readyTime(): number | null {
    if (
      this.disposed ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    ) {
      return null;
    }

    return this.context.currentTime;
  }

  /** Synthétise une note avec une attaque brève et une extinction douce. */
  private tone(frequency: number, options: ToneOptions = {}): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;

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
    envelope.connect(master);
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
    const master = this.master;
    if (!context || !master) return;

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
    envelope.connect(master);
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
    window.setTimeout(() => {
      voice.sources.forEach((source) => source.disconnect());
      voice.gain.disconnect();
    }, cleanupDelay);
  }
}
