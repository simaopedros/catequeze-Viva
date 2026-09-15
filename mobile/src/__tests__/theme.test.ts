import { colors } from '../theme';

describe('theme tokens', () => {
  it('keeps a single ink/gold/paper palette', () => {
    expect(colors.ink).toBe('#071d36');
    expect(colors.gold).toBe('#bd8b58');
    expect(colors.goldDark).toBe('#8d6238');
    expect(colors.paper).toBe('#fffdf8');
    expect(colors.immersive).toBe('#000000');
    expect((colors as { rhemaGold?: string }).rhemaGold).toBeUndefined();
  });
});
