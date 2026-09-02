-- Vice-coordination scope: allow a COMMUNITY_COORDINATOR to be explicitly
-- linked to a set of classes via ClassCatechist.role = COORDINATOR.
--
-- Compatibility: additive enum value only. Existing LEAD / ASSISTANT rows and
-- all other tables are untouched.

ALTER TYPE "CatechistAssignmentRole" ADD VALUE 'COORDINATOR';
