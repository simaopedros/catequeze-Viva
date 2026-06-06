import { HttpError } from 'wasp/server';

export const importCatechumensCSV = async (
  args: { csvData: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  // Verify user has permission and resolve parishId
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });

  if (!membership || !['PARISH_COORDINATOR', 'LEAD_CATECHIST', 'SUPER_ADMIN', 'DIOCESE_ADMIN', 'COMMUNITY_COORDINATOR'].includes(membership.role)) {
    throw new HttpError(403, 'Sem permissão para realizar importações nesta paróquia.');
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
