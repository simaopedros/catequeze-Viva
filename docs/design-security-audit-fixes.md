# Security audit fixes — critical tenant isolation and billing

## Problem

A security audit of Catequese Viva found correctness bugs that leak minor PII across tenants, escalate roles across parishes, and refill paid AI credits when the balance hits zero.

Primary access control already exists in `resolveWorkspaceAccess` / `assertCanAccessCatechumenProfile`. Several older paths still merge roles across memberships or skip plan enforcement.

## Goals

- Paid AI credits must not refill except on a real monthly reset or subscription grant.
- Staff actions (meetings, attendance, document download) must use the role in the resource's workspace only.
- Catechumen listings must not return profiles that belong to no parish.
- CSV import must respect the same enrollment limits as manual enrollment.

## Non-goals

- Redis-backed rate limiting
- Completing diocese per-parish AI credit pools (schema change)
- Deleting local Lighthouse Chrome profiles / homolog `.env` (ops, not this stack)
- Rewriting all remaining `findFirst` membership lookups outside the files listed below

## Decisions

- Heal stale trial credits only when the stored balance looks like an un-granted trial row *and* `lastReset` is older than a subscription grant would be — simplest correct fix: delete the `creditsLeft <= FREE_TRIAL_CREDITS` refill. `FREE_TRIAL_CREDITS` is 0, so that condition is "empty wallet → refill". Monthly reset via `shouldReset` stays.
- Deduct credits with a conditional update (`creditsLeft >= cost`) so two parallel requests cannot both succeed.
- Meeting / attendance / document auth must call `resolveWorkspaceAccess` (or `assertCanAccessClass` / `assertCanAccessCatechumenProfile`) with the resource parish — never `getUserRole()` without a parishId.
- `joinParish` must not allow self-assignment of `SUPER_ADMIN` or `DIOCESE_ADMIN` even for personal workspace owners.
- Remove the `{ parishId: null, householdId: null }` OR branch from coordinator `listCatechumens`.
- `importCatechumensCSV` must call `assertCanEnrollCatechumen` (or equivalent remaining-capacity check) before `createMany`.

## PR Plan

### PR 1: Stop infinite AI credit refill

- **Description:** Remove `healStaleFreeTrialCredits` behavior that refills when `creditsLeft <= FREE_TRIAL_CREDITS` (currently 0). Keep monthly calendar reset and `grantSubscriptionAiCredits`. Deduct with an atomic conditional decrement so parallel requests cannot overspend. Add unit tests covering exhausted paid credits (must 402, must not refill) and monthly reset still working. Do not change plan tables or daily limits.
- **Files/components affected:** app/src/server/ai/credits.ts, app/src/__tests__/aiCredits.test.ts, app/src/__tests__/ (new credit-deduction test if mocking entities is cleaner than extending the constants file)
- **Dependencies:** None

### PR 2: Scope staff auth to the resource workspace

- **Description:** Fix privilege mixing across parishes. In `meetingOperations.ts`, stop using `getUserRole(context)` without parish for `createMeeting`, `saveAttendance`, and `saveAttendanceBatch`. Resolve the meeting/class parish first, then authorize with that workspace's local role (coordinator / assigned catechist only for writes — guardians must not write attendance even if they are coordinators elsewhere). In `serveDocument`, authorize via the catechumen/uploader parish using `resolveWorkspaceAccess` or `assertCanAccessCatechumenProfile` — do not treat "coordinator in any membership" as coordinator everywhere. In `joinParish`, drop `SUPER_ADMIN` and `DIOCESE_ADMIN` from self-assignable privileged roles; personal owners stay `PERSONAL_OWNER`. Escape `Content-Disposition` filename. Add focused tests for: coordinator-in-A + guardian-in-B cannot save attendance in B; document serve denies the same shape.
- **Files/components affected:** app/src/server/operations/meetingOperations.ts, app/src/server/api/documents.ts, app/src/server/operations/joinParish.ts, app/src/__tests__/
- **Dependencies:** None

### PR 3: Stop listing orphan catechumens across tenants

- **Description:** Remove the coordinator list branch that includes `{ parishId: null, householdId: null }` so a parish coordinator no longer sees every unscoped catechumen in the database. Listing must be limited to profiles tied to that workspace via `parishId`, household parish, or class enrollment. Platform admin listing without workspaceId is unchanged. Add a unit/integration test that a coordinator query does not return a foreign orphan profile.
- **Files/components affected:** app/src/server/operations/catechumenOperations.ts, app/src/__tests__/
- **Dependencies:** None

### PR 4: Enforce plan limits on CSV import

- **Description:** Call `assertCanEnrollCatechumen` (or a remaining-capacity helper) so CSV import cannot exceed plan max catechumens. Reject the whole import (or stop before createMany) when the new rows would exceed the limit. Keep existing CSV size/row caps. Validate birth dates; skip or error rows that parse to Invalid Date instead of writing them. Do not expand the CSV parser to a full RFC library unless already present.
- **Files/components affected:** app/src/server/operations/importOperations.ts, app/src/server/operations/billingEnforcement.ts, app/src/__tests__/
- **Dependencies:** None
