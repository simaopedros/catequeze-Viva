import { describe, expect, it } from 'vitest';
import {
  humanizeAdminCode,
  resolveAdminCodeLabel,
  resolveAdminPlanLabel,
} from '../shared/adminLabels';

describe('humanizeAdminCode', () => {
  it('splits snake, kebab and camel case', () => {
    expect(humanizeAdminCode('MEMBER_INVITE')).toBe('Member Invite');
    expect(humanizeAdminCode('PendingInvitation')).toBe('Pending Invitation');
    expect(humanizeAdminCode('catechist-free')).toBe('Catechist Free');
  });

  it('returns empty for blank input', () => {
    expect(humanizeAdminCode(null)).toBe('');
    expect(humanizeAdminCode('  ')).toBe('');
  });
});

describe('resolveAdminPlanLabel', () => {
  it('maps catalog slugs and aliases to display names', () => {
    expect(resolveAdminPlanLabel('single')).toBe('Plano Catequista');
    expect(resolveAdminPlanLabel('SINGLE')).toBe('Plano Catequista');
    expect(resolveAdminPlanLabel('catechist_free')).toBe('Sem assinatura');
    expect(resolveAdminPlanLabel('unlimited')).toBe('Plano Paróquia');
    expect(resolveAdminPlanLabel('UNLIMITED')).toBe('Plano Paróquia');
  });

  it('prefers live nameBySlug overrides', () => {
    expect(
      resolveAdminPlanLabel('single', {
        nameBySlug: { single: 'Catequista Custom' },
      }),
    ).toBe('Catequista Custom');
  });

  it('humanizes unknown plan codes instead of inventing free plan', () => {
    expect(resolveAdminPlanLabel('mystery_sku')).toBe('Mystery Sku');
  });
});

describe('resolveAdminCodeLabel', () => {
  const tAdmin = (key: string) => {
    const map: Record<string, string> = {
      'labels.audit_actions.CREATE': 'Criou',
      'labels.audit_actions.UPDATE': 'Editou',
      'labels.audit_actions.DELETE': 'Excluiu',
      'labels.audit_operations.MEMBER_INVITE': 'Convite de membro',
      'labels.entity_types.PendingInvitation': 'Convite pendente',
      'pages.licenses.status_active': 'Ativo',
      'pages.parishes.type_PERSONAL': 'Espaço pessoal',
    };
    return map[key] ?? key;
  };
  const tCommon = (key: string) => {
    const map: Record<string, string> = {
      'roles.PERSONAL_OWNER': 'Proprietário',
      'roles.ASSISTANT_CATECHIST': 'Catequista auxiliar',
      'membership_status.ACTIVE': 'Ativo',
    };
    return map[key] ?? key;
  };

  it('maps audit actions, operations and entity types', () => {
    expect(resolveAdminCodeLabel('auditAction', 'CREATE', tAdmin)).toBe('Criou');
    expect(resolveAdminCodeLabel('auditAction', 'UPDATE', tAdmin)).toBe('Editou');
    expect(resolveAdminCodeLabel('auditAction', 'DELETE', tAdmin)).toBe('Excluiu');
    expect(
      resolveAdminCodeLabel('auditOperation', 'MEMBER_INVITE', tAdmin),
    ).toBe('Convite de membro');
    expect(
      resolveAdminCodeLabel('entityType', 'PendingInvitation', tAdmin),
    ).toBe('Convite pendente');
  });

  it('maps roles, statuses and parish types', () => {
    expect(
      resolveAdminCodeLabel('role', 'PERSONAL_OWNER', tAdmin, tCommon),
    ).toBe('Proprietário');
    expect(
      resolveAdminCodeLabel('role', 'ASSISTANT_CATECHIST', tAdmin, tCommon),
    ).toBe('Catequista auxiliar');
    expect(resolveAdminCodeLabel('status', 'active', tAdmin)).toBe('Ativo');
    expect(resolveAdminCodeLabel('parishType', 'PERSONAL', tAdmin)).toBe(
      'Espaço pessoal',
    );
  });

  it('falls back to humanize when translation is missing', () => {
    expect(
      resolveAdminCodeLabel('auditOperation', 'SOME_NEW_OP', tAdmin),
    ).toBe('Some New Op');
    expect(resolveAdminCodeLabel('entityType', 'WeirdEntity', tAdmin)).toBe(
      'Weird Entity',
    );
  });
});
