/* Áudio opcional: síntese local, sem downloads obrigatórios. */
class GardenAudio {
  constructor(config) {
    this.config = config;
    this.enabled = config.enabledInitially;
    this.context = null;
  }
  unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? this.config.masterVolume : 0;
      this.master.connect(this.context.destination);
      const buffer = this.context.createBuffer(
          1,
          this.context.sampleRate * 3,
          this.context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) * 0.98;
        data[i] = last;
      }
      const wind = this.context.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;
      wind.connect(filter);
      filter.connect(this.master);
      wind.start();
    }
    if (this.context.state === "suspended")
      this.context.resume().catch(() => {});
  }
  toggle() {
    this.unlock();
    this.enabled = !this.enabled;
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.enabled ? this.config.masterVolume : 0,
        this.context.currentTime,
        0.2,
      );
    if (this.config.ambienceUrl && !this.ambience) {
      this.ambience = new window.Audio(this.config.ambienceUrl);
      this.ambience.loop = true;
      this.ambience.volume = 0.15;
    }
    if (this.ambience) {
      if (this.enabled) this.ambience.play().catch(() => {});
      else this.ambience.pause();
    }
    return this.enabled;
  }
  note(kind = "flower") {
    if (!this.context || !this.enabled) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = kind === "click" ? "triangle" : "sine";
    o.frequency.setValueAtTime(
      kind === "click" ? 1600 : 440 + Math.random() * 260,
      c.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      kind === "click" ? 120 : 330,
      c.currentTime + 0.14,
    );
    g.gain.setValueAtTime(0.001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + 0.32);
  }
}
