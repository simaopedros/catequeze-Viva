import { HttpError } from 'wasp/server';
import { evaluateCapacity, evaluateCapacityOverride } from '../../shared/scheduling';
import { assertRegistrationPermission } from '../auth/registrationPermissions';

type OverrideArgs = { parishId: string; communityId?: string | null; classId: string; roomId?: string | null; occupied: number; adding: number; reason?: string | null };
export async function assertCapacityOverride(context: any, args: OverrideArgs) {
  const cls = await context.entities.CatechesisClass.findFirst({ where: { id: args.classId, parishId: args.parishId }, select: { maxCapacity: true, roomId: true, communityId: true, room: { select: { capacity: true } } } });
  if (!cls || cls.communityId !== (args.communityId ?? null) || (args.roomId !== undefined && cls.roomId !== args.roomId)) throw new HttpError(404);
  const input = { classMax: cls.maxCapacity, roomCapacity: cls.room?.capacity, occupied: args.occupied, adding: args.adding, reason: args.reason };
  const result = evaluateCapacityOverride(input);
  if (result.overBy) {
    await assertRegistrationPermission(context, { parishId: args.parishId, communityId: cls.communityId ?? undefined, action: 'OVERRIDE_CAPACITY' });
    if (!result.allowed) throw new HttpError(400, 'Motivo inválido.', { reasonError: result.reasonError });
  }
  return { overBy: result.overBy, effective: evaluateCapacity(input).effective, reason: result.overBy ? args.reason!.trim() : null };
}
export function capacityOverrideAuditMetadata(args: OverrideArgs, result: { overBy: number; effective: number | null; reason: string | null }) {
  return { parishId: args.parishId, communityId: args.communityId ?? null, classId: args.classId, roomId: args.roomId ?? null, occupied: args.occupied, adding: args.adding, ...result };
}
