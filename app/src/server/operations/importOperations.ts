import { HttpError } from 'wasp/server';
import { COORDINATOR_ROLES } from '../auth/helpers';

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

  const allowedParishIds = new Set(importMemberships.map(m => m.parishId));
  if (personalWorkspace) allowedParishIds.add(personalWorkspace.id);

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
    return [...allowedParishIds][0];
  }

  throw new HttpError(400, 'Especifique parishId — você pertence a mais de uma paróquia ou comunidade com permissão de importação.');
}

export const importCatechumensCSV = async (
  args: { csvData: string; parishId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const parishId = await resolveImportParish(context, args);

  const lines = args.csvData.trim().split('\n');
  if (lines.length < 1) throw new HttpError(400, 'CSV vazio.');

  const header = lines[0].toLowerCase().replace(/\s/g, '');
  const dataLines = lines.slice(1);
  const results = { created: 0, errors: 0, details: [] as string[] };

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

    try {
      await context.entities.CatechumenProfile.create({
        data: {
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : null,
          parishId,
        },
      });
      results.created++;
    } catch (e: any) {
      results.errors++;
      results.details.push(`Linha ${i + 2}: ${e.message}`);
    }
  }

  return results;
};
