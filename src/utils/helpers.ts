// Tiny seeded RNG for deterministic tree generation
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation = 0,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(size / 32, size / 32)
  ctx.beginPath()
  ctx.moveTo(0, 10)
  ctx.bezierCurveTo(-16, -4, -10, -16, 0, -8)
  ctx.bezierCurveTo(10, -16, 16, -4, 0, 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ── Synthesized sound engine (no audio files needed) ──
class SoundEngine {
  ctx: AudioContext | null = null
  enabled = false
  master: GainNode | null = null
  heartTimer: number | null = null

  ensure() {
    if (this.ctx) return
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.5
    this.master.connect(this.ctx.destination)
  }
  setEnabled(on: boolean) {
    this.enabled = on
    if (on) {
      this.ensure()
      this.ctx?.resume()
    } else {
      this.stopHeartbeat()
    }
  }
  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, when = 0, slideTo?: number) {
    if (!this.enabled || !this.ctx || !this.master) return
    const t = this.ctx.currentTime + when
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  chime() {
    this.tone(880, 1.2, 'sine', 0.08)
    this.tone(1320, 1.4, 'sine', 0.05, 0.12)
    this.tone(1760, 1.6, 'sine', 0.03, 0.24)
  }
  pop() {
    this.tone(520, 0.25, 'triangle', 0.12, 0, 880)
  }
  water() {
    if (!this.enabled || !this.ctx || !this.master) return
    // filtered noise burst = water
    const dur = 0.35
    const t = this.ctx.currentTime
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const f = this.ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 1800
    const g = this.ctx.createGain()
    g.gain.value = 0.06
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
  }
  whoosh() {
    this.tone(200, 1.1, 'sine', 0.06, 0, 600)
  }
  heartbeatOnce(intensity = 1) {
    this.tone(58, 0.18, 'sine', 0.28 * intensity)
    this.tone(52, 0.22, 'sine', 0.22 * intensity, 0.22)
  }
  startHeartbeat() {
    if (this.heartTimer != null) return
    const beat = () => {
      this.heartbeatOnce(1)
      this.heartTimer = window.setTimeout(beat, 900)
    }
    beat()
  }
  stopHeartbeat() {
    if (this.heartTimer != null) {
      clearTimeout(this.heartTimer)
      this.heartTimer = null
    }
  }
  envelope() {
    this.tone(392, 0.5, 'triangle', 0.1)
    this.tone(523, 0.6, 'triangle', 0.1, 0.15)
    this.tone(659, 0.9, 'sine', 0.08, 0.3)
  }
}

export const sound = new SoundEngine()
