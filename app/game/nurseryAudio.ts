/** Short procedural crowd texture for the arrival. No recorded or imitated franchise voice. */
export class NurseryCrowdAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private enabled = true;
  private volume = 1;
  private disposed = false;
  async unlock(): Promise<void> {
    if (this.disposed || typeof window === "undefined") return;
    try {
      const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      if (!this.context) {
        this.context = new Audio(); this.output = this.context.createGain();
        this.output.gain.value = this.enabled ? 0.045 * this.volume : 0;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch { /* Text description remains available if the device cannot play audio. */ }
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.output && this.context) this.output.gain.setValueAtTime(enabled ? 0.045 * this.volume : 0, this.context.currentTime);
    if (!enabled) this.stop();
  }
  setVolume(volume: number): void {
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    this.setEnabled(this.enabled);
  }
  arrival(): void {
    const context = this.context, output = this.output;
    if (!context || !output || !this.enabled || this.disposed || context.state !== "running") return;
    this.stop();
    const start = context.currentTime;
    for (let voice = 0; voice < 6; voice++) {
      const duration = 0.85 + voice * 0.07;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 8729 + voice * 331;
      for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; samples[i] = seed / 2147483648; }
      const source = context.createBufferSource(); source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 280 + voice * 85; filter.Q.value = 1.8;
      const gain = context.createGain(), at = start + voice * 0.055;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.65, at + 0.14);
      gain.gain.linearRampToValueAtTime(0.15, at + duration * 0.8); gain.gain.linearRampToValueAtTime(0, at + duration);
      source.connect(filter); filter.connect(gain); gain.connect(output); this.voices.add(source);
      source.onended = () => { this.voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(at); source.stop(at + duration);
    }
  }
  stop(): void {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  dispose(): void { this.disposed = true; this.stop(); this.output?.disconnect(); void this.context?.close().catch(() => {}); this.output = null; this.context = null; }
}
