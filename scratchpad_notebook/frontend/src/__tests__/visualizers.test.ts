import { describe, it, expect } from 'vitest';
import { soundEffects } from '../utils/soundEffects';
import { repairLatex } from '../utils/inkOnInference';

describe('MathAI Visualizers and Utilities', () => {
  it('soundEffects should initialize without error', () => {
    expect(soundEffects).toBeDefined();
    soundEffects.setMuted(true);
    expect(() => soundEffects.playClick()).not.toThrow();
  });

  it('repairLatex should balance unclosed brackets', () => {
    const tokens = ['\\sqrt', '{', 'x', '+', '5'];
    const repaired = repairLatex(tokens);
    expect(repaired).toContain('}');
  });
});

