import { describe, expect, it } from 'vitest';
import { buildInputSnapshot, canonicalizeInput, FormationApplication, FormationInput, generateFormationPlan, validatePlan } from '../shared/formationEngine';
import { computeInputHash } from '../server/registrations/formationHash';
import { emptyAvailability } from '../shared/scheduling';

const w1 = { id: 'w1', weekday: 6, startTime: '14:00', endTime: '15:00', label: 'Saturday' };
const w2 = { id: 'w2', weekday: 0, startTime: '14:00', endTime: '15:00', label: 'Sunday' };
const availability = (...windows: typeof w1[]) => ({ version: 1 as const, windows: windows.map(({ weekday,startTime,endTime }) => ({ weekday,startTime,endTime })), closures: [] });
const app = (id: string, props: Partial<FormationApplication> = {}): FormationApplication => ({ id, offeringId: 'o1', submittedAt: '2026-01-01T00:00:00Z', birthDate: '2015-01-01', status: 'APPROVED', needsReview: false, identityResolved: true, preferredWindows: ['w1','w2'], ...props });
const base = (): FormationInput => ({ campaign: { cutoffDate: '2026-03-01', offeredWindows: [w1,w2], seatPolicy: 'RESERVE', allowWaitlist: true }, offerings: [{ id: 'o1', stageId: 's1', minAge: 10, maxAge: 11, plannedSeats: null, audience: 'BOTH' }], applications: [], rooms: [{ id: 'r1', capacity: 15, active: true, communityId: 'c1', availability: emptyAvailability() }], catechists: [{ userId: 't1', role: 'LEAD', availability: availability(w1,w2) }], existingClasses: [], policy: { balanceOccupancy: true, siblingsSameClass: true } });
const result = (input: FormationInput) => { const out = generateFormationPlan(input); expect(validatePlan(input,out)).toEqual([]); return out; };
describe('formation engine', () => {
  it('is deterministic under permutations, but preserves preference order in the hash', () => {
    const x = base(); x.applications = [app('b'),app('a')]; x.rooms.push({ ...x.rooms[0], id: 'r2' }); x.catechists.push({ ...x.catechists[0], userId: 't2' });
    const y = structuredClone(x); y.applications.reverse(); y.rooms.reverse(); y.catechists.reverse(); y.campaign.offeredWindows.reverse();
    expect(result(x)).toEqual(result(y)); expect(computeInputHash(x)).toBe(computeInputHash(y)); expect(canonicalizeInput(x)).toBe(canonicalizeInput(y));
    y.applications[0].preferredWindows.reverse(); expect(computeInputHash(x)).not.toBe(computeInputHash(y));
    const snapshot = JSON.stringify(buildInputSnapshot(x)); expect(snapshot).not.toContain('2015-01-01'); expect(snapshot).not.toContain('Saturday');
  });
  it('allocates in submission order with id tie break and orders the waitlist', () => {
    const x = base(); x.rooms[0].capacity = 1; x.limits = { maxPlannedClasses: 1 }; x.applications = [app('z'),app('b'),app('a'),app('older',{submittedAt:'2025-01-01T00:00:00Z'})];
    const out = result(x); expect(out.placements.find(p => p.applicationId === 'older')?.status).toBe('ALLOCATED'); expect(out.placements.filter(p => p.status === 'WAITLISTED').map(p => [p.applicationId,p.waitlistOrder])).toEqual([['a',1],['b',2],['z',3]]);
  });
  it('uses the smaller capacity and does not count catechists', () => {
    const x = base(); x.limits = { maxPlannedClasses: 1 }; x.catechists.push({ ...x.catechists[0], userId: 't2' }); x.applications = Array.from({length:16},(_,i) => app(String(i).padStart(2,'0')));
    const initial = result(x); expect(initial.summary.allocated).toBe(15);
    x.preservedClasses = [{ ...initial.plannedClasses[0], catechistIds: ['t1','t2'] }]; expect(result(x).summary.allocated).toBe(15);
    x.preservedClasses = []; x.policy.classCapacityDefault = 10; expect(result(x).summary.allocated).toBe(10);
  });
  it('uses civil cutoff dates, inclusive ages and leap day', () => {
    const x = base(); x.offerings[0].minAge = 10; x.offerings[0].maxAge = 10; x.applications = [app('leap',{birthDate:'2016-02-29'}),app('bad',{birthDate:'2016-02-30'})]; x.campaign.cutoffDate = '2026-02-28';
    let out = result(x); expect(out.placements.find(p => p.applicationId === 'leap')?.status).toBe('ALLOCATED'); expect(out.placements.find(p => p.applicationId === 'bad')?.reasonCodes).toEqual(['INVALID_BIRTH_DATE']);
    x.campaign.cutoffDate = '2026-02-27'; out = result(x); expect(out.placements.find(p => p.applicationId === 'leap')?.reasonCodes).toEqual(['AGE_OUT_OF_RANGE']);
  });
  it('honors community and ranked windows and reviews unmatched choices', () => {
    const x = base(); x.rooms.push({ ...x.rooms[0], id: 'r2', communityId:'c2' }); x.catechists.push({ ...x.catechists[0], userId:'t2' }); x.applications = [app('a',{communityId:'c2',preferredWindows:['w2','w1']}),app('b',{preferredWindows:['missing']})];
    const out = result(x), a = out.placements.find(p => p.applicationId === 'a')!; expect(out.plannedClasses.find(c => c.candidateKey === a.plannedClassKey)?.communityId).toBe('c2'); expect(a.score.windowRank).toBe(1); expect(out.placements.find(p => p.applicationId === 'b')?.reasonCodes).toEqual(['NO_CHOSEN_WINDOW_FITS']);
    x.rooms[1].availability = availability(w1); expect(result(x).placements.find(p => p.applicationId === 'a')?.score.windowRank).toBe(2);
  });
  it('keeps siblings in the same class where possible and checks person conflicts', () => {
    const x = base(); x.applications = [app('a',{householdKey:'h',personId:'p'}),app('b',{householdKey:'h',personId:'q'}),app('c',{personId:'p'})];
    const out = result(x); const [a,b,c] = ['a','b','c'].map(id => out.placements.find(p => p.applicationId === id)!); expect(a.plannedClassKey).toBe(b.plannedClassKey); expect(b.explanation.code).toBe('SIBLING_SAME_SLOT'); expect(c.plannedClassKey).not.toBe(a.plannedClassKey);
  });
  it('requires catechist windows, treats empty room windows as free, and warns about closures', () => {
    const x = base(); x.applications = [app('a')]; x.catechists[0].availability = emptyAvailability(); expect(result(x).placements[0].reasonCodes).toEqual(['NO_CATECHIST_AVAILABLE']);
    x.catechists[0].availability = availability(w1); x.rooms[0].availability.closures = [{from:'2026-10-31',to:'2026-10-31'}]; expect(result(x).warnings[0].code).toBe('ROOM_CLOSURE');
    x.rooms[0].active = false; expect(result(x).placements[0].reasonCodes).toEqual(['NO_ROOM_AVAILABLE']);
  });
  it('preserves manual overcapacity, counts it and prevents automatic additions', () => {
    const x = base(); x.rooms[0].capacity = 1; x.limits = {maxPlannedClasses:1}; x.applications = [app('a'),app('b'),app('c')]; const first = result(x); const c = first.plannedClasses[0];
    x.preservedClasses = [c]; x.preservedPlacements = ['a','b'].map(id => ({ ...first.placements.find(p => p.applicationId === id)!, status: 'ALLOCATED', plannedClassKey:c.candidateKey, manual:true, locked:true }));
    const out = result(x); expect(out.placements.filter(p => p.overCapacity).length).toBe(2); expect(out.placements.find(p => p.applicationId === 'c')?.status).toBe('WAITLISTED');
  });
  it('checks existing resources and same-person conflicts', () => {
    const x = base(); x.applications = [app('a',{personId:'p'})]; x.existingClasses = [{id:'existing', roomId:'elsewhere',schedule:w1,catechistIds:[],personIds:['p']}]; const out = result(x); expect(out.placements[0].score.windowRank).toBe(2);
    x.existingClasses[0].roomId='r1'; x.existingClasses[0].catechistIds=['t1']; expect(result(x).plannedClasses.every(c => c.windowId !== 'w1')).toBe(true);
  });
  it('uses the second chosen window when the first is full', () => {
    const x = base(); x.rooms[0].capacity = 1; x.applications = [app('a',{preferredWindows:['w1']}),app('b',{preferredWindows:['w1','w2']})];
    expect(result(x).placements.find(p => p.applicationId === 'b')?.score.windowRank).toBe(2);
  });
  it('prefers the same slot for siblings in different offerings', () => {
    const x = base(); x.offerings.push({ ...x.offerings[0], id:'o2', stageId:'s2' }); x.rooms.push({ ...x.rooms[0], id:'r2' }); x.catechists.push({ ...x.catechists[0], userId:'t2' });
    x.applications = [app('a',{householdKey:'h'}), app('b',{householdKey:'h',offeringId:'o2'})];
    const out = result(x); const a = out.placements.find(p => p.applicationId === 'a')!, b = out.placements.find(p => p.applicationId === 'b')!;
    expect(b.status).toBe('ALLOCATED'); expect(out.plannedClasses.find(c => c.candidateKey === a.plannedClassKey)?.windowId).toBe(out.plannedClasses.find(c => c.candidateKey === b.plannedClassKey)?.windowId); expect(a.plannedClassKey).not.toBe(b.plannedClassKey);
  });
  it('detects tampered capacity, duplicate placements and resource conflicts', () => {
    const x = base(); x.applications = [app('a')]; const out = result(x); out.placements.push(structuredClone(out.placements[0])); out.plannedClasses[0].capacity = 100;
    expect(validatePlan(x,out)).toEqual(expect.arrayContaining(['DUPLICATE_APPLICATION','INVALID_CLASS']));
  });
  it('satisfies invariants and idempotence over 200 seeded scenarios', () => {
    let seed = 72931; const random = () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);
    for (let n=0;n<200;n++) { const x=base(); x.rooms[0].capacity=1+Math.floor(random()*8); x.policy.classCapacityDefault=1+Math.floor(random()*8); x.limits={maxPlannedClasses:1+Math.floor(random()*2)}; x.campaign.allowWaitlist=random()>.3; x.applications=Array.from({length:Math.floor(random()*18)},(_,i)=>app(String(i).padStart(2,'0'),{birthDate: random()<.1?'invalid':'2015-01-01', preferredWindows: random()<.2?['missing']:random()<.5?['w1']:['w2','w1']})); const a=result(x), b=result(x); expect(a).toEqual(b); expect(computeInputHash(x)).toBe(computeInputHash(structuredClone(x))); }
  });
});
