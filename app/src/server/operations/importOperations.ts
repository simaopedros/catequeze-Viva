import { HttpError } from 'wasp/server';
import { COORDINATOR_ROLES } from '../auth/helpers';

const IMPORT_ROLES = [...COORDINATOR_ROLES, 'LEAD_CATECHIST'];

export const importCatechumensCSV = async (
  args: { csvData: string; parishId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const membershipWhere: any = {
    userId: context.user.id,
    status: 'ACTIVE',
    role: { in: IMPORT_ROLES },
  };
  if (args.parishId) {
    membershipWhere.parishId = args.parishId;
  }

  const membership = await context.entities.Membership.findFirst({
    where: membershipWhere,
    select: { parishId: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!membership) {
    // Allow personal workspace owner
    let allowedByPersonal = false;
    if (args.parishId) {
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: args.parishId, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      allowedByPersonal = !!isPersonalOwner;
    }
    if (!allowedByPersonal) {
      throw new HttpError(
        403,
        args.parishId
          ? 'Sem permissão para importar catequizandos nesta paróquia.'
          : 'Sem permissão para realizar importações.',
      );
    }
  }

  if (!args.parishId) {
    const parishCount = await context.entities.Membership.count({
      where: {
        userId: context.user.id,
        status: 'ACTIVE',
        role: { in: IMPORT_ROLES },
      },
    });
    if (parishCount > 1) {
      throw new HttpError(400, 'Especifique parishId — você pertence a mais de uma paróquia.');
    }
  }

  const parishId = membership.parishId;

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
