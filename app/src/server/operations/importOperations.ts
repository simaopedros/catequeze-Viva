import { HttpError } from 'wasp/server';
import { COORDINATOR_ROLES, getDioceseParishIds } from '../auth/helpers';
import {
  MAX_CSV_IMPORT_CHARS,
  MAX_CSV_IMPORT_ROWS,
} from '../security/csvSafety';
import { assertCanEnrollCatechumens } from './billingEnforcement';

const IMPORT_ROLES = [...COORDINATOR_ROLES, 'LEAD_CATECHIST'];

async function resolveImportParish(context: any, args: { csvData: string; parishId?: string }): Promise<string> {
  if (context.user?.isAdmin) {
    if (!args.parishId) throw new HttpError(400, 'Especifique parishId.');
    return args.parishId;
  }

  // Collect all parishes where user has import permission
  const importMemberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: 'ACTIVE',
      role: { in: IMPORT_ROLES },
    },
    select: { parishId: true },
    orderBy: { createdAt: 'asc' },
  });

  // Check personal workspace ownership for candidates
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });

  const allowedParishIds = new Set(importMemberships.map((m: any) => m.parishId));
  if (personalWorkspace) allowedParishIds.add(personalWorkspace.id);

  // DIOCESE_ADMIN: include all parishes in the diocese
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

  // Explicit parishId: validate it's in the allowed set
  if (args.parishId) {
    if (!allowedParishIds.has(args.parishId)) {
      throw new HttpError(403, 'Sem permissão para importar catequizandos nesta paróquia.');
    }
    return args.parishId;
  }

  // No parishId: pick automatically if unique, otherwise require explicit
  if (allowedParishIds.size === 1) {
    return Array.from(allowedParishIds)[0] as string;
  }

  throw new HttpError(400, 'Especifique parishId — você pertence a mais de uma paróquia ou comunidade com permissão de importação.');
}

/** YYYY-MM-DD → UTC noon, or invalid if the cell cannot produce a real Date. */
function parseImportBirthDate(raw: string): Date | null | 'invalid' {
  if (!raw) return null;
  const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return 'invalid';
  return date;
}

export const importCatechumensCSV = async (
  args: { csvData: string; parishId?: string },
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

  const lines = args.csvData.trim().split('\n');
  if (lines.length < 1) throw new HttpError(400, 'CSV vazio.');
  if (lines.length - 1 > MAX_CSV_IMPORT_ROWS) {
    throw new HttpError(
      400,
      `CSV com demasiadas linhas (máx. ${MAX_CSV_IMPORT_ROWS}).`,
    );
  }

  const header = lines[0].toLowerCase().replace(/\s/g, '');
  const dataLines = lines.slice(1);
  const results = { created: 0, errors: 0, details: [] as string[] };

  const toCreate: { firstName: string; lastName: string; birthDate: Date | null; parishId: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());
    const row: Record<string, string> = {};
    header.split(',').forEach((h, idx) => { row[h] = cols[idx] || ''; });

    const firstName = row['nome'] || row['firstname'] || row['firstName'] || cols[0] || '';
    const lastName = row['sobrenome'] || row['lastname'] || row['lastName'] || cols[1] || '';
    const birthDate = row['nascimento'] || row['birthdate'] || row['birthDate'] || row['datanascimento'] || cols[2] || '';

    if (!firstName) {
      results.errors++;
      results.details.push(`Linha ${i + 2}: nome vazio`);
      continue;
    }

    const parsedBirthDate = parseImportBirthDate(birthDate);
    if (parsedBirthDate === 'invalid') {
      results.errors++;
      results.details.push(`Linha ${i + 2}: data de nascimento inválida`);
      continue;
    }

    toCreate.push({
      firstName,
      lastName,
      birthDate: parsedBirthDate,
      parishId,
    });
  }

  await assertCanEnrollCatechumens(context, parishId, toCreate.length);

  // Bulk insert for performance
  try {
    if (toCreate.length > 0) {
      await context.entities.CatechumenProfile.createMany({ data: toCreate });
      results.created = toCreate.length;
    }
  } catch (e: any) {
    results.errors += toCreate.length;
    results.details.push(`Erro ao criar ${toCreate.length} catequizandos: ${e.message}`);
  }

  return results;
};
