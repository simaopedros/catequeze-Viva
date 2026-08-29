import { HttpError, prisma } from 'wasp/server';
import { EnrollmentStatus } from '@prisma/client';
import { COORDINATOR_ROLES, getDioceseParishIds } from '../auth/helpers';
import {
  MAX_CSV_IMPORT_CHARS,
  MAX_CSV_IMPORT_ROWS,
} from '../security/csvSafety';
import {
  parseBirthDateUtc,
  parseCatechumenCsv,
} from '../../shared/csvCatechumenImport';
import { assertCanEnrollCatechumen } from './billingEnforcement';
import { ensureSacramentalJourneyForCatechumen } from '../sacramentHelpers';
import { logger } from '../logger';

const IMPORT_ROLES = [...COORDINATOR_ROLES, 'LEAD_CATECHIST'];

async function resolveImportParish(context: any, args: { csvData: string; parishId?: string }): Promise<string> {
  if (context.user?.isAdmin) {
    if (!args.parishId) throw new HttpError(400, 'Especifique parishId.');
    return args.parishId;
  }

  const importMemberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: 'ACTIVE',
      role: { in: IMPORT_ROLES },
    },
    select: { parishId: true },
    orderBy: { createdAt: 'asc' },
  });

  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });

  const allowedParishIds = new Set(importMemberships.map((m: any) => m.parishId));
  if (personalWorkspace) allowedParishIds.add(personalWorkspace.id);

  if (importMemberships.some((m: any) => m.parishId)) {
    const membershipForRole = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE', role: 'DIOCESE_ADMIN' },
      select: { id: true },
    });
    if (membershipForRole) {
      const dioceseParishIds = await getDioceseParishIds(context);
      for (const id of dioceseParishIds) allowedParishIds.add(id);
    }
  }

  if (allowedParishIds.size === 0) {
    throw new HttpError(403, 'Sem permissão para realizar importações.');
  }

  if (args.parishId) {
    if (!allowedParishIds.has(args.parishId)) {
      throw new HttpError(403, 'Sem permissão para importar catequizandos nesta paróquia.');
    }
    return args.parishId;
  }

  if (allowedParishIds.size === 1) {
    return Array.from(allowedParishIds)[0] as string;
  }

  throw new HttpError(400, 'Especifique parishId — você pertence a mais de uma paróquia ou comunidade com permissão de importação.');
}

function normalizeClassKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveClassForImport(
  context: any,
  parishId: string,
  classId?: string,
  className?: string,
): Promise<{ id: string; sacramentId: string | null; maxCapacity: number | null } | null> {
  if (classId) {
    const cls = await context.entities.CatechesisClass.findFirst({
      where: { id: classId, parishId },
      select: { id: true, sacramentId: true, maxCapacity: true },
    });
    return cls;
  }
  if (!className) return null;
  const classes = await context.entities.CatechesisClass.findMany({
    where: { parishId, status: { not: 'ARCHIVED' } },
    select: { id: true, name: true, sacramentId: true, maxCapacity: true },
  });
  const key = normalizeClassKey(className);
  const match = classes.find(
    (cls: any) =>
      normalizeClassKey(cls.name) === key ||
      cls.id === className,
  );
  return match
    ? { id: match.id, sacramentId: match.sacramentId, maxCapacity: match.maxCapacity }
    : null;
}

export const importCatechumensCSV = async (
  args: { csvData: string; parishId?: string; classId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const parishId = await resolveImportParish(context, args);

  if (args.csvData.length > MAX_CSV_IMPORT_CHARS) {
    throw new HttpError(
      400,
      `CSV demasiado grande (máx. ${MAX_CSV_IMPORT_CHARS} caracteres).`,
    );
  }

  const parsed = parseCatechumenCsv(args.csvData);
  if (parsed.length === 0) throw new HttpError(400, 'CSV vazio.');
  if (parsed.length > MAX_CSV_IMPORT_ROWS) {
    throw new HttpError(
      400,
      `CSV com demasiadas linhas (máx. ${MAX_CSV_IMPORT_ROWS}).`,
    );
  }

  const results = {
    created: 0,
    enrolled: 0,
    errors: 0,
    details: [] as string[],
  };

  const toCreate: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    parishId: string;
    className: string;
    lineNumber: number;
  }[] = [];

  for (const row of parsed) {
    if (!row.firstName) {
      results.errors++;
      results.details.push(`Linha ${row.lineNumber}: nome vazio`);
      continue;
    }
    toCreate.push({
      firstName: row.firstName,
      lastName: row.lastName,
      birthDate: parseBirthDateUtc(row.birthDate),
      parishId,
      className: row.className,
      lineNumber: row.lineNumber,
    });
  }

  if (toCreate.length === 0) return results;

  let createdProfiles: { id: string; className: string; lineNumber: number }[] = [];
  try {
    const created = await prisma.catechumenProfile.createManyAndReturn({
      data: toCreate.map(({ firstName, lastName, birthDate, parishId: pid }) => ({
        firstName,
        lastName,
        birthDate,
        parishId: pid,
      })),
    });
    createdProfiles = created.map((profile, idx) => ({
      id: profile.id,
      className: toCreate[idx].className,
      lineNumber: toCreate[idx].lineNumber,
    }));
    results.created = created.length;
  } catch (e: any) {
    results.errors += toCreate.length;
    results.details.push(`Erro ao criar ${toCreate.length} catequizandos: ${e.message}`);
    return results;
  }

  const scopedClass = args.classId
    ? await resolveClassForImport(context, parishId, args.classId)
    : null;
  if (args.classId && !scopedClass) {
    results.details.push('Turma alvo não encontrada neste espaço — catequizandos ficaram sem matrícula.');
  }

  const classCache = new Map<string, Awaited<ReturnType<typeof resolveClassForImport>>>();
  if (scopedClass) classCache.set('__scoped__', scopedClass);

  for (const profile of createdProfiles) {
    const target =
      scopedClass ||
      (profile.className
        ? classCache.get(profile.className) ??
          (await (async () => {
            const resolved = await resolveClassForImport(
              context,
              parishId,
              undefined,
              profile.className,
            );
            classCache.set(profile.className, resolved);
            return resolved;
          })())
        : null);

    if (!target) {
      if (profile.className) {
        results.details.push(
          `Linha ${profile.lineNumber}: turma "${profile.className}" não encontrada — catequizando criado sem matrícula.`,
        );
      }
      continue;
    }

    try {
      if (!context.user.isAdmin) {
        await assertCanEnrollCatechumen(context, parishId);
      }
      const enrolledCount = await context.entities.ClassEnrollment.count({
        where: { classId: target.id, status: EnrollmentStatus.ENROLLED },
      });
      if (target.maxCapacity && enrolledCount >= target.maxCapacity) {
        results.details.push(
          `Linha ${profile.lineNumber}: turma lotada — catequizando criado sem matrícula.`,
        );
        continue;
      }
      await context.entities.ClassEnrollment.create({
        data: {
          classId: target.id,
          catechumenProfileId: profile.id,
          status: EnrollmentStatus.ENROLLED,
        },
      });
      results.enrolled++;
      if (target.sacramentId) {
        try {
          await ensureSacramentalJourneyForCatechumen(
            profile.id,
            target.sacramentId,
            parishId,
            context,
          );
        } catch (e: any) {
          logger.warn('Failed to auto-create sacramental journey on CSV import', {
            catechumenProfileId: profile.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    } catch (e: any) {
      results.details.push(
        `Linha ${profile.lineNumber}: não foi possível matricular — ${e.message || e}`,
      );
    }
  }

  return results;
};
