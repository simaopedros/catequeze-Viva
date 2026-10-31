import { createHash } from 'node:crypto';
import { ALGORITHM_VERSION, canonicalizeInput, FormationInput, FormationPolicy } from '../../shared/formationEngine';

/** Hash the full input, including sensitive fields, without storing those fields in snapshots. */
export function computeInputHash(input: FormationInput, policy: FormationPolicy = input.policy, version = ALGORITHM_VERSION): string {
  return createHash('sha256').update(JSON.stringify({ version, input: JSON.parse(canonicalizeInput({ ...input, policy })) })).digest('hex');
}
