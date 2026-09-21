import {
  buildMaterialRows,
  formatMeetingSchedule,
  meetingThemeLabel,
  parseMaterialLines,
} from '../meetings/meetingPresentation';

describe('meetingPresentation', () => {
  it('formats schedule with default duration', () => {
    const label = formatMeetingSchedule('2025-06-15T15:00:00.000Z', 90);
    expect(label).toMatch(/15/);
    expect(label).toMatch(/•/);
    expect(label).toMatch(/-/);
  });

  it('parses material lines and classifies kinds', () => {
    const rows = parseMaterialLines('Apresentação.pdf\nVídeo: O Espírito Santo');
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('pdf');
    expect(rows[1].kind).toBe('video');
  });

  it('adds biblical reference row', () => {
    const rows = buildMaterialRows({
      content: { materials: 'Apresentação.pdf', biblicalRef: 'Jo 14,16-17' },
    });
    expect(rows.some((r) => r.kind === 'bible')).toBe(true);
  });

  it('prefixes theme label', () => {
    expect(meetingThemeLabel({ theme: 'O Espírito Santo' })).toBe('Tema: O Espírito Santo');
  });
});
