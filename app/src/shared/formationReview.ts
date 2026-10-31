import { slotsOverlap, timeToMinutes, type Window } from './scheduling';

/** Conflicts are independent of capacity and cannot be overridden. */
export function formationSchedulesOverlap(a: Window, b: Window): boolean {
  const startA = timeToMinutes(a.startTime), endA = timeToMinutes(a.endTime);
  const startB = timeToMinutes(b.startTime), endB = timeToMinutes(b.endTime);
  if (startA == null || endA == null || startB == null || endB == null) return true;
  return slotsOverlap({ weekday: a.weekday, start: startA, end: endA }, { weekday: b.weekday, start: startB, end: endB });
}

export function reviewCapacity(capacity: number, occupants: number) {
  return { overCapacity: occupants > capacity, excess: Math.max(0, occupants - capacity) };
}
