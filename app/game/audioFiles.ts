/** Optional authored audio. No browser object is created until GameAudio unlocks. */
export type AudioCategory = "sfx" | "ambience" | "music";
export type AudioFileState = "absent" | "loading" | "ready" | "unusable" | "blocked" | "disabled";
export interface AudioFileSource { url: string; mime: string; bytes: number; sha256: string }
export interface AudioManifestEntry { id: string; category: AudioCategory; folder: string; sources: AudioFileSource[]; fallback: "procedural" | "silence" }
export interface AudioManifest { schemaVersion: 1; version: string; entries: AudioManifestEntry[] }
export interface AudioDiagnostic extends AudioManifestEntry { state: AudioFileState; selectedSource: string | null; fallbackUsed: boolean }
type Graph = { context: AudioContext; effects: GainNode; music: GainNode };
type CachedEffect = { state: AudioFileState; buffer?: AudioBuffer; source?: string; failedAt?: number; attempts: number; fallbackUsed: boolean };
type Stream = { audio: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode; dispose(): void };
type Channel = { id: string | null; serial: number; pending: boolean; stream: Stream | null; controller: AbortController | null; onReady?: () => void; onUnavailable?: () => void; fade: number };
const TIMEOUT_MS = 8_000;
const RETRY_MS = 60_000;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));


function isLocalAudioUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return false;
  try {
    const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    return !pathname.startsWith("//") && !/[\\\x00-\x1f]/.test(pathname) && !pathname.split("/").some(part => part === ".." || part === ".");
  } catch { return false; }
}

export function validateAudioManifest(value: unknown): AudioManifest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as AudioManifest;
  if (candidate.schemaVersion !== 1 || typeof candidate.version !== "string" || !Array.isArray(candidate.entries)) return null;
  const keys = new Set<string>();
  const entries: AudioManifestEntry[] = [];
  for (const entry of candidate.entries) {
    if (!entry || !["sfx", "ambience", "music"].includes(entry.category) || typeof entry.id !== "string" || !/^[a-z0-9-]+$/.test(entry.id) || !Array.isArray(entry.sources)) return null;
    const key = `${entry.category}/${entry.id}`;
    if (keys.has(key)) return null;
    keys.add(key);
    const sources = entry.sources.filter(source => source && isLocalAudioUrl(source.url) && typeof source.mime === "string" && Number.isFinite(source.bytes) && source.bytes > 0 && /^[a-f0-9]{64}$/.test(source.sha256));
    entries.push({ id: entry.id, category: entry.category, folder: typeof entry.folder === "string" ? entry.folder : key, sources, fallback: entry.category === "music" ? "silence" : "procedural" });
  }
  return { schemaVersion: 1, version: candidate.version, entries };
}

export class OptionalAudioFiles {
  private manifest: AudioManifest | null = null;
  private manifestPromise: Promise<void> | null = null;
  private disposed = false;
  private effects = new Map<string, CachedEffect>();
  private fallbackSeen = new Set<string>();
  private loopStates = new Map<string, CachedEffect>();
  private controllers = new Set<AbortController>();
  private sources = new Set<AudioBufferSourceNode>();
  private timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private compatibility: HTMLAudioElement | null = null;
  private channels: Record<"ambience" | "music", Channel> = {
    ambience: { id: null, serial: 0, pending: false, stream: null, controller: null, fade: .6 },
    music: { id: null, serial: 0, pending: false, stream: null, controller: null, fade: .6 },
  };

  private readonly graph: () => Graph | null;
  private readonly manifestUrl: string;
  private manifestAttemptAt = 0;
  constructor(graph: () => Graph | null, manifestUrl = "/audio/manifest.json") { this.graph = graph; this.manifestUrl = manifestUrl; }

  unlock(): void {
    if (this.disposed || typeof window === "undefined" || !this.graph()) return;
    this.compatibility ??= document.createElement("audio");
    void this.loadManifest().then(() => this.preloadSfx());
    for (const category of ["ambience", "music"] as const) {
      const channel = this.channels[category];
      if (channel.id && this.loopStates.get(`${category}/${channel.id}`)?.state === "blocked") {
        void this.startLoop(category, channel.id, channel.fade, channel.onReady, channel.onUnavailable);
      }
    }
    if (process.env.NODE_ENV === "development" && !this.refreshTimer) {
      this.refreshTimer = setInterval(() => { if (!document.hidden) void this.loadManifest(true); }, 3_000);
    }
  }

  private entry(category: AudioCategory, id: string): AudioManifestEntry | undefined {
    return this.manifest?.entries.find(entry => entry.category === category && entry.id === id);
  }

  private async loadManifest(refresh = false): Promise<void> {
    if (this.manifestPromise) return this.manifestPromise;
    if (this.disposed || (!refresh && this.manifest) || !refresh && Date.now() - this.manifestAttemptAt < RETRY_MS) return;
    this.manifestAttemptAt = Date.now();
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    this.manifestPromise = (async () => {
      try {
        const response = await fetch(this.manifestUrl, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const next = validateAudioManifest(await response.json());
        if (!next || this.disposed) return;
        const changed = this.manifest && this.manifest.version !== next.version;
        this.manifest = next;
        if (changed) {
          this.effects.clear(); this.loopStates.clear(); this.fallbackSeen.clear();
          for (const category of ["ambience", "music"] as const) {
            const previous = { ...this.channels[category] };
            this.stopLoop(category, .2);
            if (previous.id) void this.startLoop(category, previous.id, previous.fade, previous.onReady, previous.onUnavailable);
          }
        }
      } catch { /* Optional inventory cannot block a scene. */ }
      finally { clearTimeout(timer); this.controllers.delete(controller); this.manifestPromise = null; }
    })();
    return this.manifestPromise;
  }

  private candidates(entry: AudioManifestEntry): AudioFileSource[] {
    return entry.sources.filter(source => !this.compatibility || this.compatibility.canPlayType(source.mime) !== "");
  }

  async preloadSfx(ids?: readonly string[]): Promise<void> {
    if (this.disposed || !this.graph()) return;
    if (!this.manifest) await this.loadManifest();
    const pending = this.manifest?.entries.filter(entry => entry.category === "sfx" && (!ids || ids.includes(entry.id))) ?? [];
    let index = 0;
    // Decode only short effects, with bounded concurrency. Long loops stream.
    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, async () => {
      while (!this.disposed && index < pending.length) await this.loadEffect(pending[index++].id);
    }));
  }

  private async loadEffect(id: string): Promise<void> {
    const graph = this.graph();
    const entry = this.entry("sfx", id);
    if (!graph || !entry?.sources.length || this.disposed) return;
    const old = this.effects.get(id);
    if (old?.state === "loading" || old?.state === "ready" || old && (old.attempts >= 2 || Date.now() - (old.failedAt ?? 0) < RETRY_MS)) return;
    const state: CachedEffect = { state: "loading", attempts: (old?.attempts ?? 0) + 1, fallbackUsed: old?.fallbackUsed ?? false };
    this.effects.set(id, state);
    const version = this.manifest?.version;
    for (const source of this.candidates(entry)) {
      if (this.disposed || version !== this.manifest?.version) return;
      // Large files do not become decoded SFX by accident.
      if (source.bytes > 12 * 1024 * 1024) continue;
      const controller = new AbortController(); this.controllers.add(controller);
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel: (() => void) | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          cancel = () => reject(new Error("Audio cancelled"));
          controller.signal.addEventListener("abort", cancel, { once: true });
          timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        });
        const buffer = await Promise.race([(async () => {
          const response = await fetch(source.url, { signal: controller.signal });
          if (!response.ok) throw new Error("Audio unavailable");
          const bytes = await response.arrayBuffer();
          if (!bytes.byteLength || bytes.byteLength > 12 * 1024 * 1024) throw new Error("Invalid SFX size");
          return graph.context.decodeAudioData(bytes);
        })(), timeout]);
        if (this.disposed || version !== this.manifest?.version) return;
        if (!Number.isFinite(buffer.duration) || buffer.duration > 30) continue;
        state.buffer = buffer; state.source = source.url; state.state = "ready";
        return;
      } catch { /* Try the next compatible encoding, never replay the past event. */ }
      finally { if (timer) clearTimeout(timer); if (cancel) controller.signal.removeEventListener("abort", cancel); this.controllers.delete(controller); }
    }
    if (this.disposed || version !== this.manifest?.version) return;
    state.state = "unusable"; state.failedAt = Date.now();
  }

  /** Synchronous dispatch: a loading source only benefits future events. */
  playSfx(id: string, intensity = 1): boolean {
    const graph = this.graph();
    if (this.disposed || !graph || graph.context.state !== "running") return false;
    const entry = this.entry("sfx", id);
    if (!entry?.sources.length) { this.fallbackSeen.add(id); return false; }
    const state = this.effects.get(id);
    if (state?.state === "ready" && state.buffer) {
      try {
        const source = graph.context.createBufferSource(); const gain = graph.context.createGain();
        source.buffer = state.buffer; gain.gain.value = clamp(intensity, 0, 1.5);
        source.connect(gain); gain.connect(graph.effects); this.sources.add(source);
        source.onended = () => { source.disconnect(); gain.disconnect(); this.sources.delete(source); };
        source.start(); return true;
      } catch { state.state = "unusable"; state.failedAt = Date.now(); }
    }
    this.fallbackSeen.add(id);
    if (state) state.fallbackUsed = true;
    void this.loadEffect(id);
    const loading = this.effects.get(id); if (loading) loading.fallbackUsed = true;
    return false;
  }

  activeLoop(category: "ambience" | "music"): string | null {
    const channel = this.channels[category]; return channel.stream ? channel.id : null;
  }

  async startLoop(category: "ambience" | "music", id: string, fade = .6, onReady?: () => void, onUnavailable?: () => void): Promise<void> {
    if (this.disposed) return;
    const channel = this.channels[category];
    channel.onReady = onReady; channel.onUnavailable = onUnavailable;
    if (channel.id === id && (channel.pending || channel.stream)) return;
    this.stopLoop(category, fade);
    channel.id = id; channel.fade = clamp(fade, 0, 5); channel.pending = true;
    const serial = channel.serial;
    await this.loadManifest();
    if (this.disposed || channel.serial !== serial) return;
    const graph = this.graph(); const entry = this.entry(category, id); const key = `${category}/${id}`;
    const previousState = this.loopStates.get(key);
    if (!graph || !entry?.sources.length) { channel.pending = false; onUnavailable?.(); return; }
    if (previousState?.state === "unusable" && (previousState.attempts >= 2 || Date.now() - (previousState.failedAt ?? 0) < RETRY_MS)) { channel.pending = false; onUnavailable?.(); return; }
    const state: CachedEffect = { state: "loading", attempts: (previousState?.attempts ?? 0) + 1, fallbackUsed: category === "ambience" };
    this.loopStates.set(key, state);
    for (const candidate of this.candidates(entry)) {
      const controller = new AbortController(); channel.controller = controller;
      const audio = document.createElement("audio"); audio.preload = "auto"; audio.loop = true; audio.src = candidate.url;
      const gain = graph.context.createGain(); gain.gain.value = 0;
      let source: MediaElementAudioSourceNode | null = null;
      const clean = () => { audio.pause(); audio.removeAttribute("src"); audio.load(); source?.disconnect(); gain.disconnect(); };
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => done(new Error("Audio timeout")), TIMEOUT_MS);
          const ready = () => done(); const error = () => done(new Error("Audio decode failed")); const abort = () => done(new Error("Audio cancelled"));
          const done = (reason?: Error) => { clearTimeout(timer); audio.removeEventListener("canplay", ready); audio.removeEventListener("error", error); controller.signal.removeEventListener("abort", abort); if (reason) reject(reason); else resolve(); };
          audio.addEventListener("canplay", ready, { once: true }); audio.addEventListener("error", error, { once: true }); controller.signal.addEventListener("abort", abort, { once: true }); audio.load();
        });
        if (this.disposed || channel.serial !== serial) { clean(); return; }
        source = graph.context.createMediaElementSource(audio); source.connect(gain); gain.connect(graph.music);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => finish(new Error("Audio play timeout")), TIMEOUT_MS);
          const abort = () => finish(new Error("Audio cancelled"));
          const finish = (error?: unknown) => { clearTimeout(timer); controller.signal.removeEventListener("abort", abort); if (error) reject(error); else resolve(); };
          controller.signal.addEventListener("abort", abort, { once: true });
          void audio.play().then(() => finish(), finish);
        });
        if (this.disposed || channel.serial !== serial) { clean(); return; }
        const error = () => {
          if (channel.stream?.audio !== audio) return;
          state.state = "unusable"; state.failedAt = Date.now(); channel.stream.dispose(); channel.stream = null; channel.onUnavailable?.();
        };
        audio.addEventListener("error", error);
        channel.stream = { audio, source, gain, dispose: () => { audio.removeEventListener("error", error); clean(); } };
        channel.pending = false; channel.controller = null; state.state = "ready"; state.source = candidate.url;
        gain.gain.setValueAtTime(0, graph.context.currentTime); gain.gain.linearRampToValueAtTime(1, graph.context.currentTime + channel.fade);
        channel.onReady?.(); return;
      } catch (error) {
        clean();
        if (this.disposed || channel.serial !== serial) return;
        if (error instanceof Error && error.name === "NotAllowedError") { state.state = "blocked"; channel.pending = false; channel.controller = null; return; }
      }
    }
    state.state = "unusable"; state.failedAt = Date.now(); channel.pending = false; channel.controller = null; channel.onUnavailable?.();
  }

  stopLoop(category: "ambience" | "music", fade = .4): void {
    const channel = this.channels[category]; channel.serial++; channel.controller?.abort(); channel.controller = null; channel.pending = false; channel.id = null;
    const stream = channel.stream; channel.stream = null;
    if (!stream) return;
    const graph = this.graph(); const duration = clamp(fade, 0, 5);
    if (!graph || !duration) { stream.dispose(); return; }
    stream.gain.gain.cancelScheduledValues(graph.context.currentTime); stream.gain.gain.setValueAtTime(stream.gain.gain.value, graph.context.currentTime); stream.gain.gain.linearRampToValueAtTime(0, graph.context.currentTime + duration);
    const timer = setTimeout(() => { stream.dispose(); this.timers.delete(timer); }, duration * 1000 + 30); this.timers.set(timer, () => stream.dispose());
  }

  diagnostics(disabled = false): AudioDiagnostic[] {
    return this.manifest?.entries.map(entry => { const state = entry.category === "sfx" ? this.effects.get(entry.id) : this.loopStates.get(`${entry.category}/${entry.id}`); return { ...entry, state: disabled ? "disabled" : !entry.sources.length ? "absent" : state?.state ?? "loading", selectedSource: state?.source ?? null, fallbackUsed: entry.fallback === "procedural" && (!entry.sources.length || state?.fallbackUsed === true || entry.category === "sfx" && this.fallbackSeen.has(entry.id)) }; }) ?? [];
  }

  dispose(): void {
    this.disposed = true;
    for (const controller of this.controllers) controller.abort(); this.controllers.clear();
    this.stopLoop("ambience", 0); this.stopLoop("music", 0);
    for (const source of this.sources) { try { source.stop(); } catch {} source.disconnect(); } this.sources.clear();
    for (const [timer, clean] of this.timers) { clearTimeout(timer); clean(); } this.timers.clear();
    if (this.refreshTimer) clearInterval(this.refreshTimer); this.refreshTimer = null;
    this.effects.clear(); this.loopStates.clear(); this.fallbackSeen.clear(); this.compatibility = null;
  }
}
