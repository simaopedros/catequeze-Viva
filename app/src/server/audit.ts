/**
 * Audit logging helper — records CREATE, UPDATE, DELETE, APPROVE, etc. actions
 * for LGPD compliance and security monitoring.
 */
import type { AuditAction } from '@prisma/client';

interface AuditParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  userId?: string | null;
  parishId?: string | null;
}

export async function logAudit(entities: any, params: AuditParams): Promise<void> {
  try {
    await entities.AuditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        userId: params.userId || null,
        parishId: params.parishId || null,
      },
    });
  } catch (err) {
    // Audit logging should never break the main operation
    console.error('[AuditLog] Failed to log:', err);
  }
}

/**
 * Audit helper for CRUD operations — logs create/update/delete with before/after snapshots.
 */
export async function auditCrud(
  entities: any,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  userId?: string | null,
  data?: Record<string, any>,
  previousData?: Record<string, any>,
): Promise<void> {
  await logAudit(entities, {
    action: action as AuditAction,
    entityType,
    entityId,
    userId,
    metadata: data || previousData
      ? { changes: data, previous: previousData }
      : undefined,
  });
}
