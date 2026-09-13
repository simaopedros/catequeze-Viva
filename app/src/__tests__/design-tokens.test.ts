import { describe, expect, it } from 'vitest';
import { brandColors, chartColors } from '../shared/designTokens';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const EXPO = {
  ink: '#071d36',
  gold: '#bd8b58',
  goldDark: '#8d6238',
  paper: '#fffdf8',
  cream: '#f6efe4',
  canvas: '#f4efe6',
  muted: '#5c6b7a',
  line: '#e6ddd0',
  danger: '#b42318',
  success: '#1f7a4d',
};

describe('design tokens', () => {
  it('mirrors the Expo paper/ink/gold palette', () => {
    expect(brandColors.ink).toBe(EXPO.ink);
    expect(brandColors.gold).toBe(EXPO.gold);
    expect(brandColors.goldDark).toBe(EXPO.goldDark);
    expect(brandColors.paper).toBe(EXPO.paper);
    expect(brandColors.cream).toBe(EXPO.cream);
    expect(brandColors.canvas).toBe(EXPO.canvas);
    expect(brandColors.muted).toBe(EXPO.muted);
    expect(brandColors.line).toBe(EXPO.line);
    expect(brandColors.danger).toBe(EXPO.danger);
    expect(brandColors.success).toBe(EXPO.success);
    expect(chartColors).toContain(EXPO.ink);
    expect(chartColors).toContain(EXPO.gold);
    expect(chartColors.join(' ')).not.toMatch(/#D4AF37|#D39A2B|#071A2D/i);
  });

  it('keeps Main.css brand hex in sync', () => {
    const css = readFileSync(resolve(__dirname, '../client/Main.css'), 'utf8');
    expect(css).toContain('--color-brand-ink: #071d36');
    expect(css).toContain('--color-brand-gold: #bd8b58');
    expect(css).toContain('--color-brand-paper: #fffdf8');
    expect(css).toContain('--color-brand-ink-muted: #c9d6e4');
    expect(css).toContain('--color-brand-line: #e6ddd0');
    expect(css).toContain('Source Serif 4');
    expect(css).not.toContain('Cormorant Garamond');
    expect(css).not.toContain('#D39A2B');
    expect(css).not.toContain('#071A2D');
  });
});
