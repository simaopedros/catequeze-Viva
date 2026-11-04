import { calculateAgeAtCutoff, offeredWindowsSchema } from './registrationCampaign';
import { Availability, Window, availabilitySchema, closuresOnWeekday, evaluateCapacity, fitsWindows, slotsOverlap, timeToMinutes } from './scheduling';

export const ALGORITHM_VERSION = 'v1';
export type FormationPolicy = { balanceOccupancy: boolean; siblingsSameClass: boolean; classCapacityDefault?: number };
export type OfferedWindow = Window & { id: string; label: string };
export type FormationApplication = { id: string; offeringId: string; submittedAt: string; birthDate: string; status: string; needsReview: boolean; identityResolved: boolean; personId?: string | null; communityId?: string | null; preferredWindows: string[]; householdKey?: string | null; kind?: 'MINOR' | 'ADULT' };
export type FormationClass = { candidateKey: string; offeringId: string; roomId: string; communityId?: string | null; windowId: string; schedule: Window; minAge: number | null; maxAge: number | null; capacity: number; catechistIds: string[] };
// Explanation codes are stable i18n keys for the future preview UI; params contain only IDs and numbers.
export type FormationPlacement = { applicationId: string; status: 'ALLOCATED' | 'WAITLISTED' | 'NEEDS_REVIEW' | 'UNPLACEABLE'; plannedClassKey?: string; waitlistOrder?: number; reasonCodes: string[]; explanation: { code: string; params: Record<string, number | string> }; score: Record<string, number>; manual: boolean; locked: boolean; overCapacity: boolean };
export type FormationInput = {
  campaign: { cutoffDate: string; offeredWindows: OfferedWindow[]; seatPolicy: 'RESERVE' | 'OFFER'; allowWaitlist: boolean };
  offerings: { id: string; stageId: string; minAge: number | null; maxAge: number | null; plannedSeats: number | null; audience: 'MINOR' | 'ADULT' | 'BOTH' }[];
  applications: FormationApplication[];
  rooms: { id: string; capacity: number; active: boolean; communityId?: string | null; availability: Availability }[];
  catechists: { userId: string; availability: Availability; communityId?: string | null; role: string; active?: boolean }[];
  existingClasses: { id: string; roomId?: string | null; schedule: Window; catechistIds: string[]; personIds: string[] }[];
  preservedClasses?: FormationClass[];
  preservedPlacements?: FormationPlacement[];
  limits?: { maxPlannedClasses?: number; maxClassesByPlan?: number };
  policy: FormationPolicy;
};
export type FormationOutput = { algorithmVersion: string; plannedClasses: FormationClass[]; placements: FormationPlacement[]; summary: { allocated: number; waitlisted: number; needsReview: number; classes: number; unallocatedReasons: Record<string, number> }; warnings: { code: string; params: Record<string, string | number> }[] };
const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const slot = (w: Window) => ({ weekday: w.weekday, start: timeToMinutes(w.startTime)!, end: timeToMinutes(w.endTime)! });
const overlap = (a: Window, b: Window) => slotsOverlap(slot(a), slot(b));
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const ageOf = (a: FormationApplication, cutoff: string) => validDate(a.birthDate) ? calculateAgeAtCutoff(new Date(`${a.birthDate}T00:00:00Z`), new Date(`${cutoff}T00:00:00Z`)) : null;
const eligibleAge = (age: number, o: { minAge: number | null; maxAge: number | null }) => age >= 0 && (o.minAge == null || age >= o.minAge) && (o.maxAge == null || age <= o.maxAge);
const orderedApplications = (input: FormationInput) => input.applications.filter(a => a.status === 'APPROVED').slice().sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt) || cmp(a.id, b.id));
// Set-like arrays are sorted recursively; preferredWindows is an ordered preference, not a set.
function canonical(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) { const values = value.map(v => canonical(v)); return key === 'preferredWindows' ? values : values.sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b))); }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => cmp(a, b)).map(([k, v]) => [k, canonical(v, k)]));
  return value;
}
export function canonicalizeInput(input: FormationInput): string { return JSON.stringify(canonical(input)); }
/** Snapshot intentionally excludes dates, free text, labels and all personal data. */
export function buildInputSnapshot(input: FormationInput) {
  return canonical({ offerings: input.offerings.map(o => ({ id: o.id, stageId: o.stageId, minAge: o.minAge, maxAge: o.maxAge, plannedSeats: o.plannedSeats })), applications: input.applications.map(a => ({ id: a.id, offeringId: a.offeringId, personId: a.personId, communityId: a.communityId, householdKey: a.householdKey, preferredWindows: a.preferredWindows })), rooms: input.rooms.map(r => ({ id: r.id, capacity: r.capacity, communityId: r.communityId })), catechists: input.catechists.map(c => ({ userId: c.userId, communityId: c.communityId })), existingClassIds: input.existingClasses.map(c => c.id), preservedClassKeys: (input.preservedClasses ?? []).map(c => c.candidateKey), windowIds: input.campaign.offeredWindows.map(w => w.id), limits: input.limits });
}
const validWindow = (w: Window) => Number.isInteger(w.weekday) && w.weekday >= 0 && w.weekday <= 6 && timeToMinutes(w.startTime) != null && timeToMinutes(w.endTime) != null && w.startTime < w.endTime;
function assertInput(input: FormationInput) {
  if (!validDate(input.campaign.cutoffDate) || !offeredWindowsSchema.safeParse(input.campaign.offeredWindows).success) throw new Error('Invalid campaign');
  for (const list of [input.offerings.map(x => x.id), input.applications.map(x => x.id), input.rooms.map(x => x.id), input.catechists.map(x => x.userId), (input.preservedClasses ?? []).map(x => x.candidateKey), (input.preservedPlacements ?? []).map(x => x.applicationId)]) if (new Set(list).size !== list.length) throw new Error('Duplicate input id');
  if (input.applications.some(a => !Number.isFinite(Date.parse(a.submittedAt)))) throw new Error('Invalid submission date');
  if (input.rooms.some(r => !Number.isInteger(r.capacity) || r.capacity <= 0 || !availabilitySchema.safeParse(r.availability).success) || input.catechists.some(c => !availabilitySchema.safeParse(c.availability).success) || input.existingClasses.some(c => !validWindow(c.schedule))) throw new Error('Invalid resources');
  if (input.offerings.some(o => (o.plannedSeats != null && (!Number.isInteger(o.plannedSeats) || o.plannedSeats < 0)) || (o.minAge != null && o.maxAge != null && o.minAge > o.maxAge)) || [input.policy.classCapacityDefault, input.limits?.maxPlannedClasses, input.limits?.maxClassesByPlan].some(n => n != null && (!Number.isInteger(n) || n < 0))) throw new Error('Invalid limits');
}
function candidateKey(offeringId: string, windowId: string, roomId: string, userId: string) { return JSON.stringify([offeringId, windowId, roomId, userId]); }
function hasResourceConflict(c: FormationClass, classes: FormationClass[], existing: FormationInput['existingClasses']) {
  return classes.some(x => overlap(c.schedule, x.schedule) && (c.roomId === x.roomId || c.catechistIds.some(id => x.catechistIds.includes(id)))) || existing.some(x => overlap(c.schedule, x.schedule) && (c.roomId === x.roomId || c.catechistIds.some(id => x.catechistIds.includes(id))));
}
function placement(a: FormationApplication, status: FormationPlacement['status'], code: string, extra: Partial<FormationPlacement> = {}): FormationPlacement {
  return { applicationId: a.id, status, reasonCodes: [code], explanation: { code, params: {} }, score: {}, manual: false, locked: false, overCapacity: false, ...extra };
}
export function generateFormationPlan(input: FormationInput): FormationOutput {
  assertInput(input);
  const apps = orderedApplications(input), offerings = input.offerings.slice().sort((a,b) => cmp(a.id,b.id));
  const classes = (input.preservedClasses ?? []).map(c => ({ ...c, catechistIds: c.catechistIds.slice().sort(cmp) })).sort((a,b) => cmp(a.candidateKey,b.candidateKey));
  const placements: FormationPlacement[] = (input.preservedPlacements ?? []).filter(p => p.manual || p.locked).map(p => ({ ...p, reasonCodes: [...p.reasonCodes], explanation: { ...p.explanation, params: { ...p.explanation.params } }, score: { ...p.score } })).sort((a,b) => cmp(a.applicationId,b.applicationId));
  const warnings: FormationOutput['warnings'] = [];
  const limit = Math.min(input.limits?.maxPlannedClasses ?? Infinity, input.limits?.maxClassesByPlan ?? Infinity);
  const possibilities: FormationClass[] = [];
  for (const o of offerings) for (const w of input.campaign.offeredWindows) for (const r of input.rooms) for (const t of input.catechists) {
    if (!r.active || t.active === false || !['LEAD', 'ASSISTANT', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(t.role) || (r.communityId && t.communityId && r.communityId !== t.communityId) || (r.availability.windows.length > 0 && !fitsWindows(slot(w), r.availability.windows)) || !fitsWindows(slot(w), t.availability.windows) || closuresOnWeekday(t.availability.closures, w.weekday).length) continue;
    const capacity = evaluateCapacity({ classMax: input.policy.classCapacityDefault ?? r.capacity, roomCapacity: r.capacity, occupied: 0 }).effective!;
    if (capacity <= 0) continue;
    possibilities.push({ candidateKey: candidateKey(o.id,w.id,r.id,t.userId), offeringId: o.id, roomId: r.id, communityId: r.communityId ?? null, windowId: w.id, schedule: { weekday: w.weekday, startTime: w.startTime, endTime: w.endTime }, minAge: o.minAge, maxAge: o.maxAge, capacity, catechistIds: [t.userId] });
  }
  possibilities.sort((a,b) => cmp(a.candidateKey,b.candidateKey));
  // Give each offering one viable class before consuming remaining shared resources.
  let added = true;
  while (added && classes.length < limit) {
    added = false;
    for (const offering of offerings) {
      if (classes.length >= limit) break;
      const used = classes.filter(c => c.offeringId === offering.id).reduce((sum,c) => sum + c.capacity, 0);
      const remaining = offering.plannedSeats == null ? Infinity : offering.plannedSeats - used;
      if (remaining <= 0) continue;
      const candidate = possibilities.find(c => c.offeringId === offering.id && !classes.some(x => x.candidateKey === c.candidateKey) && !hasResourceConflict(c, classes, input.existingClasses));
      if (!candidate) continue;
      classes.push({ ...candidate, capacity: Math.min(candidate.capacity, remaining) });
      added = true;
    }
  }
  classes.sort((a,b) => cmp(a.candidateKey,b.candidateKey));
  for (const c of classes) { const r = input.rooms.find(r => r.id === c.roomId); if (r && closuresOnWeekday(r.availability.closures, c.schedule.weekday).length) warnings.push({ code: 'ROOM_CLOSURE', params: { roomId: r.id, candidateKey: c.candidateKey } }); }
  const occupancy = (key: string) => placements.filter(p => p.status === 'ALLOCATED' && p.plannedClassKey === key).length;
  const personConflict = (a: FormationApplication, c: FormationClass, ignore?: string) => !!a.personId && (input.existingClasses.some(x => x.personIds.includes(a.personId!) && overlap(x.schedule,c.schedule)) || placements.some(p => p.applicationId !== ignore && p.status === 'ALLOCATED' && apps.find(x => x.id === p.applicationId)?.personId === a.personId && classes.some(x => x.candidateKey === p.plannedClassKey && overlap(x.schedule,c.schedule))));
  const choices = (a: FormationApplication, ignore?: string) => {
    const siblings = apps.filter(x => a.householdKey && x.id !== a.id && x.householdKey === a.householdKey).flatMap(x => placements.filter(p => p.applicationId === x.id && p.status === 'ALLOCATED').map(p => classes.find(c => c.candidateKey === p.plannedClassKey)).filter((c): c is FormationClass => !!c));
    return classes.filter(c => c.offeringId === a.offeringId && a.preferredWindows.includes(c.windowId) && !personConflict(a,c,ignore)).sort((x,y) => {
      const rank = (c: FormationClass) => [a.communityId && c.communityId === a.communityId ? 0 : 1, a.preferredWindows.indexOf(c.windowId), siblings.some(s => s.windowId === c.windowId) ? 0 : 1, input.policy.siblingsSameClass && siblings.some(s => s.candidateKey === c.candidateKey) ? 0 : 1, input.policy.balanceOccupancy ? occupancy(c.candidateKey) / c.capacity : 0];
      const ax = rank(x), ay = rank(y); for (let i=0;i<ax.length;i++) if (ax[i] !== ay[i]) return ax[i]-ay[i]; return cmp(x.candidateKey,y.candidateKey);
    });
  };
  const assign = (a: FormationApplication, c: FormationClass) => {
    const windowRank = a.preferredWindows.indexOf(c.windowId) + 1;
    const sibling = apps.some(x => x.id !== a.id && !!a.householdKey && x.householdKey === a.householdKey && placements.some(p => p.applicationId === x.id && p.status === 'ALLOCATED' && classes.some(s => s.candidateKey === p.plannedClassKey && s.windowId === c.windowId)));
    return placement(a,'ALLOCATED', sibling ? 'SIBLING_SAME_SLOT' : 'ALLOCATED', { plannedClassKey: c.candidateKey, explanation: { code: sibling ? 'SIBLING_SAME_SLOT' : 'ALLOCATED', params: { windowRank, communityMatched: Number(!!a.communityId && a.communityId === c.communityId) } }, score: { windowRank, communityMatched: Number(!!a.communityId && a.communityId === c.communityId), siblingSameSlot: Number(sibling) } });
  };
  for (const a of apps) {
    if (placements.some(p => p.applicationId === a.id)) continue;
    const offering = offerings.find(o => o.id === a.offeringId), age = ageOf(a,input.campaign.cutoffDate);
    let reason = !validDate(a.birthDate) ? 'INVALID_BIRTH_DATE' : !a.identityResolved ? 'IDENTITY_UNRESOLVED' : !offering ? 'OFFERING_NOT_FOUND' : a.kind && offering.audience !== 'BOTH' && offering.audience !== a.kind ? 'AUDIENCE_MISMATCH' : age == null || !eligibleAge(age,offering) ? 'AGE_OUT_OF_RANGE' : a.needsReview ? 'APPLICATION_NEEDS_REVIEW' : '';
    if (reason) { placements.push(placement(a,'NEEDS_REVIEW',reason)); continue; }
    const options = choices(a);
    const available = options.find(c => !evaluateCapacity({ classMax: c.capacity, occupied: occupancy(c.candidateKey), adding: 1 }).over);
    if (available) { placements.push(assign(a,available)); continue; }
    if (options.length) { placements.push(placement(a,input.campaign.allowWaitlist ? 'WAITLISTED' : 'UNPLACEABLE','ALL_COMPATIBLE_FULL')); continue; }
    const offered = classes.filter(c => c.offeringId === a.offeringId);
    if (offered.length) reason = offered.some(c => a.preferredWindows.includes(c.windowId)) ? 'PERSON_CONFLICT' : 'NO_CHOSEN_WINDOW_FITS';
    else if (!input.rooms.some(r => r.active && input.campaign.offeredWindows.some(w => !r.availability.windows.length || fitsWindows(slot(w),r.availability.windows)))) reason = 'NO_ROOM_AVAILABLE';
    else if (!input.catechists.some(t => t.active !== false && input.campaign.offeredWindows.some(w => fitsWindows(slot(w),t.availability.windows) && !closuresOnWeekday(t.availability.closures,w.weekday).length))) reason = 'NO_CATECHIST_AVAILABLE';
    else reason = 'NO_COMPATIBLE_CLASS';
    placements.push(placement(a,'NEEDS_REVIEW',reason));
  }
  // Bounded augmenting moves preserve all occupied seats and never displace an earlier applicant.
  for (let pass=0; pass<3; pass++) {
    let changed = false;
    for (const a of apps) {
      const p = placements.find(p => p.applicationId === a.id)!;
      if (p.manual || p.locked) continue;
      if (p.status === 'ALLOCATED') {
        const ranked = choices(a, a.id), current = ranked.findIndex(c => c.candidateKey === p.plannedClassKey);
        const better = current < 0 ? undefined : ranked.slice(0, current).find(c => !evaluateCapacity({ classMax: c.capacity, occupied: occupancy(c.candidateKey), adding: 1 }).over);
        if (better) { Object.assign(p, assign(a, better)); changed = true; }
        continue;
      }
      if (p.status !== 'WAITLISTED') continue;
      for (const target of choices(a)) {
        const occupant = placements.filter(q => q.status === 'ALLOCATED' && q.plannedClassKey === target.candidateKey && !q.manual && !q.locked).sort((x,y) => cmp(x.applicationId,y.applicationId));
        let moved = false;
        for (const q of occupant) { const other = apps.find(x => x.id === q.applicationId)!; const destination = choices(other, other.id).find(c => c.candidateKey !== target.candidateKey && !evaluateCapacity({ classMax: c.capacity, occupied: occupancy(c.candidateKey), adding: 1 }).over); if (!destination) continue; Object.assign(q,assign(other,destination)); Object.assign(p,assign(a,target)); moved = changed = true; break; }
        if (moved) break;
      }
    }
    if (!changed) break;
  }
  // Every placement in an overfull class must identify the preserved override.
  for (const p of placements) if ((p.manual || p.locked) && p.status === 'ALLOCATED' && p.plannedClassKey) { const c = classes.find(c => c.candidateKey === p.plannedClassKey); if (c && occupancy(c.candidateKey) > c.capacity) { p.overCapacity = true; p.reasonCodes = ['MANUAL_OVER_CAPACITY']; p.explanation = { code: 'MANUAL_OVER_CAPACITY', params: { capacity: c.capacity, occupied: occupancy(c.candidateKey) } }; } }
  placements.sort((a,b) => cmp(a.applicationId,b.applicationId));
  let wait = 0; for (const a of apps) { const p = placements.find(p => p.applicationId === a.id); if (p?.status === 'WAITLISTED') p.waitlistOrder = ++wait; }
  const reasons: Record<string,number> = {}; for (const p of placements) if (p.status !== 'ALLOCATED') for (const reason of p.reasonCodes) reasons[reason] = (reasons[reason] ?? 0) + 1;
  const output: FormationOutput = { algorithmVersion: ALGORITHM_VERSION, plannedClasses: classes, placements, summary: { allocated: placements.filter(p => p.status === 'ALLOCATED').length, waitlisted: wait, needsReview: placements.filter(p => p.status === 'NEEDS_REVIEW').length, classes: classes.length, unallocatedReasons: Object.fromEntries(Object.entries(reasons).sort(([a],[b]) => cmp(a,b))) }, warnings: warnings.sort((a,b) => cmp(JSON.stringify(a),JSON.stringify(b))) };
  const errors = validatePlan(input,output); if (errors.length) throw new Error(`Invalid formation plan: ${errors.join(', ')}`);
  return output;
}

/** Returns invariant codes, never applicant data. Empty means valid. */
export function validatePlan(input: FormationInput, output: FormationOutput): string[] {
  const errors = new Set<string>();
  const apps = orderedApplications(input), classes = output.plannedClasses;
  const seen = new Set<string>();
  for (const p of output.placements) {
    if (seen.has(p.applicationId)) errors.add('DUPLICATE_APPLICATION'); seen.add(p.applicationId);
    const a = apps.find(a => a.id === p.applicationId);
    if (!a) { errors.add('INELIGIBLE_APPLICATION'); continue; }
    if (p.status !== 'ALLOCATED') { if (p.plannedClassKey) errors.add('UNALLOCATED_CLASS'); continue; }
    const c = classes.find(c => c.candidateKey === p.plannedClassKey), o = input.offerings.find(o => o.id === a.offeringId), age = ageOf(a,input.campaign.cutoffDate);
    if (!c || !o) { errors.add('MISSING_CLASS'); continue; }
    if (!a.identityResolved || a.needsReview || c.offeringId !== o.id || age == null || !eligibleAge(age,o) || (a.kind && o.audience !== 'BOTH' && o.audience !== a.kind)) errors.add('INELIGIBLE_ALLOCATION');
    if (!a.preferredWindows.includes(c.windowId) && !(p.manual || p.locked)) errors.add('WINDOW_MISMATCH');
    if (a.personId && input.existingClasses.some(x => x.personIds.includes(a.personId!) && overlap(x.schedule,c.schedule))) errors.add('PERSON_CONFLICT');
    for (const q of output.placements) { if (q.applicationId <= p.applicationId || q.status !== 'ALLOCATED') continue; const b = apps.find(x => x.id === q.applicationId), d = classes.find(x => x.candidateKey === q.plannedClassKey); if (a.personId && b?.personId === a.personId && d && overlap(c.schedule,d.schedule)) errors.add('PERSON_CONFLICT'); }
  }
  if (apps.some(a => !seen.has(a.id))) errors.add('MISSING_APPLICATION');
  for (const original of input.preservedPlacements ?? []) if (original.manual || original.locked) {
    const current = output.placements.find(p => p.applicationId === original.applicationId);
    if (!current || current.status !== original.status || current.plannedClassKey !== original.plannedClassKey || current.manual !== original.manual || current.locked !== original.locked) errors.add('PRESERVED_PLACEMENT_CHANGED');
  }
  for (const original of input.preservedClasses ?? []) if (!classes.some(c => JSON.stringify(canonical(c)) === JSON.stringify(canonical(original)))) errors.add('PRESERVED_CLASS_CHANGED');
  if (new Set(classes.map(c => c.candidateKey)).size !== classes.length) errors.add('DUPLICATE_CLASS');
  if (classes.length > Math.min(input.limits?.maxPlannedClasses ?? Infinity,input.limits?.maxClassesByPlan ?? Infinity)) errors.add('CLASS_LIMIT');
  for (let i=0; i<classes.length; i++) {
    const c = classes[i], room = input.rooms.find(r => r.id === c.roomId), offering = input.offerings.find(o => o.id === c.offeringId), w = input.campaign.offeredWindows.find(w => w.id === c.windowId);
    if (!room || !room.active || !offering || !w || !validWindow(c.schedule) || c.schedule.weekday !== w.weekday || c.schedule.startTime !== w.startTime || c.schedule.endTime !== w.endTime || (room.availability.windows.length > 0 && !fitsWindows(slot(c.schedule),room.availability.windows)) || c.capacity <= 0 || c.capacity > room.capacity || (input.policy.classCapacityDefault != null && c.capacity > input.policy.classCapacityDefault) || c.minAge !== offering.minAge || c.maxAge !== offering.maxAge) errors.add('INVALID_CLASS');
    if (!c.catechistIds.length || new Set(c.catechistIds).size !== c.catechistIds.length || c.catechistIds.some(id => { const t = input.catechists.find(t => t.userId === id); return !t || t.active === false || !['LEAD','ASSISTANT','LEAD_CATECHIST','ASSISTANT_CATECHIST'].includes(t.role) || !fitsWindows(slot(c.schedule),t.availability.windows) || closuresOnWeekday(t.availability.closures,c.schedule.weekday).length > 0; })) errors.add('CATECHIST_UNAVAILABLE');
    if (hasResourceConflict(c,classes.slice(i+1),input.existingClasses)) errors.add('RESOURCE_CONFLICT');
    const occupants = output.placements.filter(p => p.status === 'ALLOCATED' && p.plannedClassKey === c.candidateKey);
    if (occupants.length > c.capacity && (occupants.some(p => !p.manual && !p.locked) || occupants.some(p => (p.manual || p.locked) && !p.overCapacity))) errors.add('CAPACITY_EXCEEDED');
  }
  for (const o of input.offerings) if (o.plannedSeats != null && classes.filter(c => c.offeringId === o.id).reduce((n,c) => n+c.capacity,0) > o.plannedSeats) errors.add('PLANNED_SEATS_EXCEEDED');
  const waiting = apps.map(a => output.placements.find(p => p.applicationId === a.id)).filter((p): p is FormationPlacement => p?.status === 'WAITLISTED');
  if (waiting.some((p,i) => p.waitlistOrder !== i+1)) errors.add('WAITLIST_ORDER');
  return [...errors].sort(cmp);
}
