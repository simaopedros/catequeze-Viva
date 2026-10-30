import { describe, it, expect } from 'vitest';
import { availabilitySchema, classSlot, closuresOnWeekday, detectConflicts, emptyAvailability, evaluateCapacity, evaluateCapacityOverride, evaluateRoomAssignment, fitsWindows, intervalsOverlap, normalizeRoomName } from '../shared/scheduling';
const window = { weekday: 6, startTime: '09:00', endTime: '10:00' };
const cls = (id: string, extra = {}) => ({ id, name: id, yearId: 'y', status: 'DRAFT', dayOfWeek: 'sábado', startTime: '09:00', endTime: '10:00', roomId: 'r', catechistIds: ['u'], enrolledProfileIds: ['p'], maxCapacity: 15, ...extra });
const room = { id: 'r', active: true, capacity: 10, availability: emptyAvailability() };
describe('scheduling', () => {
  it('handles half-open intervals and windows', () => {
    expect(intervalsOverlap({ start: 1, end: 2 }, { start: 2, end: 3 })).toBe(false);
    expect(classSlot(cls('a', { startTime: '23:00', endTime: '01:00' }))).toBeNull();
    expect(fitsWindows(classSlot(cls('a'))!, [window])).toBe(true);
    expect(fitsWindows(classSlot(cls('a', { endTime: '10:01' }))!, [window])).toBe(false);
  });
  it('validates availability', () => {
    const parse = (v: unknown) => availabilitySchema.safeParse(v).success;
    expect(parse({ version: 1, windows: [window], closures: [] })).toBe(true);
    expect(parse({ version: 1, windows: [window, window], closures: [] })).toBe(false);
    expect(parse({ version: 1, windows: [{ ...window, endTime: '08:00' }], closures: [] })).toBe(false);
    expect(parse({ version: 1, windows: [], closures: [], extra: true })).toBe(false);
    expect(parse({ version: 1, windows: [], closures: [{ from: '2024-01-01', to: '2025-01-01' }] })).toBe(false);
    expect(closuresOnWeekday([{ from: '2026-10-30', to: '2026-10-31' }], 6)).toHaveLength(1);
    expect(normalizeRoomName('  Salão   São José ')).toEqual({ name: 'Salão São José', nameKey: 'salao sao jose' });
  });
  it('counts enrolled people and applies the smaller capacity', () => {
    expect(evaluateCapacity({ classMax: 15, roomCapacity: 15, occupied: 15 }).overBy).toBe(0);
    expect(evaluateCapacity({ classMax: 15, roomCapacity: 10, occupied: 16 })).toMatchObject({ effective: 10, overBy: 6, bound: 'ROOM' });
    expect(evaluateCapacity({ classMax: 15, roomCapacity: 20, occupied: 16 })).toMatchObject({ effective: 15, overBy: 1, bound: 'CLASS' });
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 15 }).allowed).toBe(true);
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 16 }).reasonError).toBe('REASON_REQUIRED');
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 16, reason: '123456789' }).reasonError).toBe('REASON_TOO_SHORT');
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 16, reason: 'x'.repeat(10) }).allowed).toBe(true);
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 16, reason: 'x'.repeat(500) }).allowed).toBe(true);
    expect(evaluateCapacityOverride({ classMax: 15, occupied: 16, reason: 'x'.repeat(501) }).reasonError).toBe('REASON_TOO_LONG');
  });
  it('finds deterministic conflicts only in the same year', () => {
    const classes = [cls('b', { dayOfWeek: '6' }), cls('a'), cls('c', { yearId: 'other', roomId: null, catechistIds: [], enrolledProfileIds: [] })];
    const run = (items: typeof classes) => detectConflicts({ classes: items, rooms: [room], availabilityByUser: {} });
    const conflicts = run(classes);
    expect(conflicts).toEqual(run([...classes].reverse()));
    expect(conflicts.filter(c => c.kind === 'ROOM_DOUBLE_BOOKED')).toHaveLength(1);
    expect(conflicts.filter(c => c.kind === 'CATECHIST_UNAVAILABLE')).toHaveLength(2);
    expect(conflicts.some(c => c.kind === 'ROOM_OUTSIDE_WINDOWS')).toBe(false);
    expect(evaluateRoomAssignment({ cls: classes[0], room, otherClasses: [classes[1]] }).warnings.some(c => c.kind === 'ROOM_CAPACITY_BELOW_CLASS')).toBe(true);
  });
});
