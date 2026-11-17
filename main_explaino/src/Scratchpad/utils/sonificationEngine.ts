import type { SonificationPoint } from '../types/umr';

/**
 * Clean-room Web Audio API mathematical curve sonification engine.
 *
 * Maps mathematical curve values (y -> pitch in 220 Hz..880 Hz) using standard
 * browser Web Audio primitives. Does NOT bundle upstream GPL-3.0 MAIDR source code;
 * consumes pure JSON point payloads from /api/math/orchestrate/process or local
 * parabola parameters (a, b, c).
 */

export interface SonificationPlayOptions {
  speed?: number; // 0.5 to 2.0 (default 1.0)
  volume?: number; // 0.02 to 0.35 (default 0.15)
  onPointChange?: (point: SonificationPoint, index: number, total: number) => void;
  onFinish?: () => void;
}

export function buildParabolaSonificationPoints(
  a: number,
  b: number,
  c: number,
  minX = -5,
  maxX = 5,
  step = 1
): SonificationPoint[] {
  const baseFreq = 220.0; // A3
  const maxFreq = 880.0; // A5
  const raw: Array<{ x: number; y: number }> = [];

  for (let x = minX; x <= maxX + 1e-9; x += step) {
    const roundedX = Math.round(x * 100) / 100;
    const y = a * roundedX * roundedX + b * roundedX + c;
    raw.push({ x: roundedX, y });
  }

  const ys = raw.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY !== minY ? maxY - minY : 1.0;

  return raw.map(({ x, y }) => {
    const normalizedY = (y - minY) / range;
    const freq = Math.round((baseFreq + normalizedY * (maxFreq - baseFreq)) * 10) / 10;
    const roundedY = Math.round(y * 100) / 100;
    return {
      x,
      y: roundedY,
      frequency_hz: freq,
      duration_ms: 140,
      braille: `(${x}, ${Math.round(y * 10) / 10})`,
      aria_label: `At x equals ${x}, y is ${roundedY}, pitch ${freq} Hz`,
    };
  });
}

export class CurveSonificationPlayer {
  private ctx: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private timers: number[] = [];
  private playing = false;

  public isPlaying(): boolean {
    return this.playing;
  }

  public stop(): void {
    this.playing = false;

    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];

    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Oscillator may already have finished
      }
    }
    this.activeOscillators = [];

    if (this.ctx) {
      const ctxToClose = this.ctx;
      this.ctx = null;
      if (ctxToClose.state !== 'closed') {
        void ctxToClose.close().catch(() => {
          // Ignore close errors in headless environments
        });
      }
    }
  }

  public play(points: SonificationPoint[], options: SonificationPlayOptions = {}): boolean {
    this.stop();

    if (!points || points.length === 0) {
      options.onFinish?.();
      return false;
    }

    const speed = Math.min(2.0, Math.max(0.5, options.speed ?? 1.0));
    const volume = Math.min(0.35, Math.max(0.02, options.volume ?? 0.15));

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return false;
      }

      const ctx = new AudioContextClass();
      this.ctx = ctx;
      this.playing = true;

      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }

      let offsetSec = 0.04;
      const baseStart = ctx.currentTime;

      points.forEach((pt, idx) => {
        const durationSec = Math.max(0.06, ((pt.duration_ms || 140) / 1000) / speed);
        const startAt = baseStart + offsetSec;
        const freq = Math.min(2000, Math.max(110, pt.frequency_hz || 440));

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);

        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.02, durationSec * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec * 0.95);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startAt);
        osc.stop(startAt + durationSec);
        this.activeOscillators.push(osc);

        const delayMs = Math.max(0, Math.round(offsetSec * 1000));
        const t = window.setTimeout(() => {
          if (this.playing) {
            options.onPointChange?.(pt, idx, points.length);
          }
        }, delayMs);
        this.timers.push(t);

        offsetSec += durationSec;
      });

      const finishTimer = window.setTimeout(() => {
        if (this.playing) {
          this.stop();
          options.onFinish?.();
        }
      }, Math.round(offsetSec * 1000) + 40);
      this.timers.push(finishTimer);

      return true;
    } catch {
      this.stop();
      return false;
    }
  }
}

