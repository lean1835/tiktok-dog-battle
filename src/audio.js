// Real CC0 dog recordings, locally processed. No oscillator-based bark.
export class BarkAudio {
  constructor() { this.ctx = null; this.buffers = new Map(); this.muted = false; this.active = 0; this.last = 0; this.loading = null; }
  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('Trình duyệt chưa hỗ trợ Web Audio');
      this.ctx = new Ctx();
      this.master = this.ctx.createGain(); this.master.gain.value = .72;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -12; this.limiter.knee.value = 10;
      this.limiter.ratio.value = 8; this.limiter.attack.value = .003; this.limiter.release.value = .16;
      this.master.connect(this.limiter); this.limiter.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    if (!this.loading) this.loading = Promise.all(['small', 'medium'].map(async key => {
      const res = await fetch(`assets/audio/bark-${key}.wav`);
      if (!res.ok) throw new Error('Thiếu bản thu tiếng sủa');
      this.buffers.set(key, await this.ctx.decodeAudioData(await res.arrayBuffer()));
    })).catch(e => { this.loading = null; throw e; });
    await this.loading;
  }
  async play(breed = 'shiba') {
    await this.unlock();
    if (this.muted || this.active >= 3 || performance.now() - this.last < 100) return false;
    this.last = performance.now();
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(['pug','corgi'].includes(breed) ? 'small' : 'medium');
    source.playbackRate.value = .97 + Math.random() * .06;
    const gain = this.ctx.createGain(); gain.gain.value = .9;
    source.connect(gain); gain.connect(this.master); this.active++;
    source.onended = () => { this.active--; source.disconnect(); gain.disconnect(); };
    source.start(); return true;
  }
  setMuted(value) { this.muted = value; if (this.master) this.master.gain.setTargetAtTime(value ? 0 : .72, this.ctx.currentTime, .03); }
}
