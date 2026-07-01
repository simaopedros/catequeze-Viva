import { describe, expect, it } from 'vitest';
import { buildLegacyContentDocument, createEmptyContentDocument, parseContentDocument } from '../shared/contentDocument';

describe('contentDocument', () => {
  it('builds a document from legacy fields in the expected order', () => {
    const document = buildLegacyContentDocument({
      theme: 'Os sacramentos',
      pastoralObjective: 'Ajudar a turma a compreender os sinais da graça.',
      openingPrayer: 'Senhor, abre nosso coração.',
      mainContent: 'Texto principal do encontro.',
      dynamic: 'Dinâmica em grupo.',
      materials: 'Bíblia e cartolina.',
      activity: 'Responder perguntas.',
      familyTask: 'Conversar em casa sobre o batismo.',
      closingPrayer: 'Obrigado, Senhor.',
      estimatedTime: 75,
      tags: 'sacramentos, batismo',
      biblicalRef: 'Jo 3,5',
      catechismRef: 'CIC §1213',
    });

    const labels = document.content
      .filter((node) => node.type === 'heading')
      .map((node) => node.content?.[0]?.text);

    expect(labels).toEqual([
      'Resumo do encontro',
      'Oração inicial',
      'Conteúdo principal',
      'Dinâmica',
      'Atividade',
      'Materiais',
      'Compromisso com a família',
      'Oração final',
      'Referências',
    ]);
  });

  it('parses stored content documents safely', () => {
    const empty = createEmptyContentDocument();
    expect(parseContentDocument(JSON.stringify(empty))).toEqual(empty);
    expect(parseContentDocument('{invalid')).toBeNull();
    expect(parseContentDocument(null)).toBeNull();
  });
});
