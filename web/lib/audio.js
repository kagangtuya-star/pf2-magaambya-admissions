const MUSIC_SRC = "/assets/music/replace-me.ogg";
const MUSIC_VOLUME = 0.32;

export class CourtyardAudio {
  enabled = false;
  context = null;
  gain = null;
  music = null;

  async enable() {
    if (this.enabled) return true;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error("当前浏览器无法播放庭院音景。");
    if (!this.context) this.create(Context);
    if (!this.music) {
      this.music = new Audio(MUSIC_SRC);
      this.music.loop = true;
      this.music.preload = "auto";
      this.music.volume = MUSIC_VOLUME;
    }
    const musicPlayback = this.music.play();
    await this.context.resume();
    await musicPlayback;
    this.enabled = true;
    this.gain.gain.setTargetAtTime(0.075, this.context.currentTime, 0.8);
    this.chime();
    return true;
  }

  disable() {
    if (!this.enabled) return false;
    this.enabled = false;
    this.music?.pause();
    this.gain?.gain.setTargetAtTime(0, this.context.currentTime, 0.35);
    return false;
  }

  async toggle() {
    return this.enabled ? this.disable() : this.enable();
  }

  create(Context) {
    const ctx = (this.context = new Context());
    const gain = (this.gain = ctx.createGain());
    gain.gain.value = 0;
    gain.connect(ctx.destination);
  }

  chime() {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    [523.25, 783.99, 1046.5].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.11;
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.13 / (i + 1), at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
      osc.connect(gain).connect(this.gain);
      osc.start(at);
      osc.stop(at + 1.9);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  pause() {
    this.context?.suspend().catch(() => {});
    this.music?.pause();
  }

  resume() {
    if (!this.enabled) return;
    this.context?.resume().catch(() => {});
    this.music?.play().catch(() => {});
  }

  dispose() {
    this.music?.pause();
    this.music = null;
    this.context?.close().catch(() => {});
    this.context = null;
    this.gain = null;
    this.enabled = false;
  }
}
