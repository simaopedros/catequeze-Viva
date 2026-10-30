import { z } from 'zod';
import { normalizeDayOfWeek } from './classSchedule';

const time = z.string().regex(/^(?:0[5-9]|1\d|2[0-3]):[0-5]\d$/);
const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
});
const windowSchema = z.object({ weekday: z.number().int().min(0).max(6), startTime: time, endTime: time }).strict().refine(w => w.startTime < w.endTime);
const closureSchema = z.object({ from: civilDate, to: civilDate, reason: z.string().max(120).refine(s => !/[\r\n]/.test(s)).optional() }).strict().refine(c => c.from <= c.to && (Date.parse(`${c.to}T00:00:00Z`) - Date.parse(`${c.from}T00:00:00Z`)) / 86400000 <= 365);
export const availabilitySchema = z.object({
  version: z.literal(1),
  windows: z.array(windowSchema).max(50).superRefine((windows, ctx) => {
    windows.forEach((w, i) => { if (windows.slice(0, i).some(p => p.weekday === w.weekday && p.startTime < w.endTime && w.startTime < p.endTime)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: 'Janelas sobrepostas' }); });
  }),
  closures: z.array(closureSchema).max(100),
}).strict();
export type Availability = z.infer<typeof availabilitySchema>;
export type Window = Availability['windows'][number];
export type Closure = Availability['closures'][number];
export const emptyAvailability = (): Availability => ({ version: 1, windows: [], closures: [] });
export function normalizeRoomName(value: string): { name: string; nameKey: string } {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name.length || name.length > 80) throw new Error('Nome de sala inválido');
  return { name, nameKey: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() };
}
export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export type Interval = { start: number; end: number };
export type Slot = Interval & { weekday: number };
export function intervalsOverlap(a: Interval, b: Interval): boolean { return a.start < b.end && b.start < a.end; }
export function classSlot(cls: { dayOfWeek?: unknown; startTime?: string | null; endTime?: string | null }): Slot | null {
  const weekday = normalizeDayOfWeek(cls.dayOfWeek), start = timeToMinutes(cls.startTime), end = timeToMinutes(cls.endTime);
  return weekday == null || start == null || end == null || start >= end ? null : { weekday, start, end };
}
export function slotsOverlap(a: Slot, b: Slot): boolean { return a.weekday === b.weekday && intervalsOverlap(a, b); }
export function fitsWindows(slot: Slot, windows: Window[]): boolean {
  return windows.some(w => w.weekday === slot.weekday && timeToMinutes(w.startTime)! <= slot.start && timeToMinutes(w.endTime)! >= slot.end);
}
export function closuresOnWeekday(closures: Closure[], weekday: number, onOrAfter?: string): Closure[] {
  return closures.filter(c => {
    const start = onOrAfter && onOrAfter > c.from ? onOrAfter : c.from;
    if (start > c.to) return false;
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (weekday - date.getUTCDay() + 7) % 7);
    return date.toISOString().slice(0, 10) <= c.to;
  });
}
type CapacityArgs = { classMax?: number | null; roomCapacity?: number | null; occupied: number; adding?: number };
export function effectiveCapacity({ classMax, roomCapacity }: Pick<CapacityArgs, 'classMax' | 'roomCapacity'>): number | null {
  const limits = [classMax, roomCapacity].filter((x): x is number => x != null);
  return limits.length ? Math.min(...limits) : null;
}
/** occupied and adding count enrolled catechumens only; catechists never consume seats. */
export function evaluateCapacity({ classMax, roomCapacity, occupied, adding = 0 }: CapacityArgs) {
  const effective = effectiveCapacity({ classMax, roomCapacity }), after = occupied + adding;
  const overBy = effective == null ? 0 : Math.max(0, after - effective);
  const bound: 'CLASS' | 'ROOM' | null = effective == null ? null : classMax != null && (roomCapacity == null || classMax <= roomCapacity) ? 'CLASS' : 'ROOM';
  return { effective, occupied, after, free: effective == null ? null : Math.max(0, effective - after), overBy, over: overBy > 0, bound };
}
export function evaluateCapacityOverride(args: CapacityArgs & { reason?: string | null }): { allowed: boolean; requiresReason: boolean; overBy: number; reasonError?: 'REASON_REQUIRED' | 'REASON_TOO_SHORT' | 'REASON_TOO_LONG' } {
  const { overBy } = evaluateCapacity(args);
  if (!overBy) return { allowed: true, requiresReason: false, overBy };
  const reason = (args.reason ?? '').trim();
  const reasonError = !reason ? 'REASON_REQUIRED' : reason.length < 10 ? 'REASON_TOO_SHORT' : reason.length > 500 ? 'REASON_TOO_LONG' : undefined;
  return { allowed: !reasonError, requiresReason: true, overBy, ...(reasonError ? { reasonError } : {}) };
}
export type SchedulingClass = { id: string; name: string; yearId: string | null; status: string; dayOfWeek?: unknown; startTime?: string | null; endTime?: string | null; roomId?: string | null; catechistIds: string[]; enrolledProfileIds: string[]; maxCapacity?: number | null };
export type SchedulingRoom = { id: string; active: boolean; capacity: number; availability: Availability };
export type Conflict = { kind: 'ROOM_DOUBLE_BOOKED' | 'CATECHIST_DOUBLE_BOOKED' | 'PERSON_DOUBLE_BOOKED' | 'ROOM_OUTSIDE_WINDOWS' | 'ROOM_INACTIVE' | 'ROOM_CLOSURE' | 'CATECHIST_UNAVAILABLE' | 'CLASS_WITHOUT_SCHEDULE' | 'ROOM_CAPACITY_BELOW_CLASS'; severity: 'BLOCKING' | 'WARNING'; classIds: string[]; roomId?: string; userId?: string; profileId?: string };
type ConflictInput = { classes: SchedulingClass[]; rooms: SchedulingRoom[]; availabilityByUser: Record<string, Availability | undefined>; onOrAfter?: string };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function detectConflicts(input: ConflictInput): Conflict[] {
  const classes = input.classes.filter(c => c.status !== 'ARCHIVED' && c.status !== 'CONCLUDED').slice().sort((a, b) => compare(a.id, b.id));
  const rooms = new Map(input.rooms.map(r => [r.id, r]));
  const result: Conflict[] = [];
  for (let i = 0; i < classes.length; i++) {
    const c = classes[i], slot = classSlot(c), room = c.roomId ? rooms.get(c.roomId) : undefined;
    if (!slot) result.push({ kind: 'CLASS_WITHOUT_SCHEDULE', severity: 'WARNING', classIds: [c.id] });
    if (room && !room.active) result.push({ kind: 'ROOM_INACTIVE', severity: 'WARNING', classIds: [c.id], roomId: room.id });
    if (!slot) continue;
    if (room) {
      if (room.availability.windows.length && !fitsWindows(slot, room.availability.windows)) result.push({ kind: 'ROOM_OUTSIDE_WINDOWS', severity: 'BLOCKING', classIds: [c.id], roomId: room.id });
      if (closuresOnWeekday(room.availability.closures, slot.weekday, input.onOrAfter).length) result.push({ kind: 'ROOM_CLOSURE', severity: 'WARNING', classIds: [c.id], roomId: room.id });
    }
    for (const userId of new Set(c.catechistIds)) {
      const availability = input.availabilityByUser[userId];
      if (!availability || !fitsWindows(slot, availability.windows) || closuresOnWeekday(availability.closures, slot.weekday, input.onOrAfter).length) result.push({ kind: 'CATECHIST_UNAVAILABLE', severity: 'WARNING', classIds: [c.id], userId });
    }
    for (const other of classes.slice(i + 1)) {
      const otherSlot = classSlot(other);
      if (c.yearId !== other.yearId || !otherSlot || !slotsOverlap(slot, otherSlot)) continue;
      const classIds = [c.id, other.id];
      if (c.roomId && c.roomId === other.roomId) result.push({ kind: 'ROOM_DOUBLE_BOOKED', severity: 'BLOCKING', classIds, roomId: c.roomId });
      for (const userId of new Set(c.catechistIds.filter(id => other.catechistIds.includes(id)))) result.push({ kind: 'CATECHIST_DOUBLE_BOOKED', severity: 'BLOCKING', classIds, userId });
      for (const profileId of new Set(c.enrolledProfileIds.filter(id => other.enrolledProfileIds.includes(id)))) result.push({ kind: 'PERSON_DOUBLE_BOOKED', severity: 'BLOCKING', classIds, profileId });
    }
  }
  return result.sort((a, b) => compare(a.kind, b.kind) || compare(a.classIds.join('\0'), b.classIds.join('\0')) || compare(a.roomId ?? '', b.roomId ?? '') || compare(a.userId ?? '', b.userId ?? '') || compare(a.profileId ?? '', b.profileId ?? ''));
}
export function evaluateRoomAssignment({ cls, room, otherClasses }: { cls: SchedulingClass; room: SchedulingRoom; otherClasses: SchedulingClass[] }) {
  const assigned = { ...cls, roomId: room.id };
  const conflicts = detectConflicts({ classes: [assigned, ...otherClasses.filter(c => c.id !== cls.id)], rooms: [room], availabilityByUser: {} }).filter(c => c.classIds.includes(cls.id) && (c.kind.startsWith('ROOM_') || c.kind === 'CLASS_WITHOUT_SCHEDULE'));
  if (cls.maxCapacity != null && room.capacity < cls.maxCapacity) conflicts.push({ kind: 'ROOM_CAPACITY_BELOW_CLASS', severity: 'WARNING', classIds: [cls.id], roomId: room.id });
  conflicts.sort((a, b) => compare(a.kind, b.kind) || compare(a.classIds.join('\0'), b.classIds.join('\0')));
  return { blocking: conflicts.filter(c => c.severity === 'BLOCKING'), warnings: conflicts.filter(c => c.severity === 'WARNING'), capacity: evaluateCapacity({ classMax: cls.maxCapacity, roomCapacity: room.capacity, occupied: new Set(cls.enrolledProfileIds).size }) };
}
