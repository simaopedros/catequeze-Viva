const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOOKS = [
  { name: 'Gênesis', abbreviation: 'Gn', testament: 'OT', position: 1 },
  { name: 'Êxodo', abbreviation: 'Ex', testament: 'OT', position: 2 },
  { name: 'Levítico', abbreviation: 'Lv', testament: 'OT', position: 3 },
  { name: 'Números', abbreviation: 'Nm', testament: 'OT', position: 4 },
  { name: 'Deuteronômio', abbreviation: 'Dt', testament: 'OT', position: 5 },
  { name: 'Josué', abbreviation: 'Js', testament: 'OT', position: 6 },
  { name: 'Juízes', abbreviation: 'Jz', testament: 'OT', position: 7 },
  { name: 'Rute', abbreviation: 'Rt', testament: 'OT', position: 8 },
  { name: 'I Samuel', abbreviation: '1Sm', testament: 'OT', position: 9 },
  { name: 'II Samuel', abbreviation: '2Sm', testament: 'OT', position: 10 },
  { name: 'I Reis', abbreviation: '1Rs', testament: 'OT', position: 11 },
  { name: 'II Reis', abbreviation: '2Rs', testament: 'OT', position: 12 },
  { name: 'I Crônicas', abbreviation: '1Cr', testament: 'OT', position: 13 },
  { name: 'II Crônicas', abbreviation: '2Cr', testament: 'OT', position: 14 },
  { name: 'Esdras', abbreviation: 'Ed', testament: 'OT', position: 15 },
  { name: 'Neemias', abbreviation: 'Ne', testament: 'OT', position: 16 },
  { name: 'Tobias', abbreviation: 'Tb', testament: 'OT', position: 17 },
  { name: 'Judite', abbreviation: 'Jt', testament: 'OT', position: 18 },
  { name: 'Ester', abbreviation: 'Et', testament: 'OT', position: 19 },
  { name: 'Jó', abbreviation: 'Jó', testament: 'OT', position: 20 },
  { name: 'Salmos', abbreviation: 'Sl', testament: 'OT', position: 21 },
  { name: 'Provérbios', abbreviation: 'Pr', testament: 'OT', position: 22 },
  { name: 'Eclesiastes', abbreviation: 'Ec', testament: 'OT', position: 23 },
  { name: 'Cântico dos Cânticos', abbreviation: 'Ct', testament: 'OT', position: 24 },
  { name: 'Sabedoria', abbreviation: 'Sb', testament: 'OT', position: 25 },
  { name: 'Eclesiástico', abbreviation: 'Eclo', testament: 'OT', position: 26 },
  { name: 'Isaías', abbreviation: 'Is', testament: 'OT', position: 27 },
  { name: 'Jeremias', abbreviation: 'Jr', testament: 'OT', position: 28 },
  { name: 'Lamentações', abbreviation: 'Lm', testament: 'OT', position: 29 },
  { name: 'Baruc', abbreviation: 'Br', testament: 'OT', position: 30 },
  { name: 'Ezequiel', abbreviation: 'Ez', testament: 'OT', position: 31 },
  { name: 'Daniel', abbreviation: 'Dn', testament: 'OT', position: 32 },
  { name: 'Oseias', abbreviation: 'Os', testament: 'OT', position: 33 },
  { name: 'Joel', abbreviation: 'Jl', testament: 'OT', position: 34 },
  { name: 'Amós', abbreviation: 'Am', testament: 'OT', position: 35 },
  { name: 'Abdias', abbreviation: 'Ab', testament: 'OT', position: 36 },
  { name: 'Jonas', abbreviation: 'Jn', testament: 'OT', position: 37 },
  { name: 'Miqueias', abbreviation: 'Mq', testament: 'OT', position: 38 },
  { name: 'Naum', abbreviation: 'Na', testament: 'OT', position: 39 },
  { name: 'Habacuc', abbreviation: 'Hb', testament: 'OT', position: 40 },
  { name: 'Sofonias', abbreviation: 'Sf', testament: 'OT', position: 41 },
  { name: 'Ageu', abbreviation: 'Ag', testament: 'OT', position: 42 },
  { name: 'Zacarias', abbreviation: 'Zc', testament: 'OT', position: 43 },
  { name: 'Malaquias', abbreviation: 'Ml', testament: 'OT', position: 44 },
  { name: 'I Macabeus', abbreviation: '1Mc', testament: 'OT', position: 45 },
  { name: 'II Macabeus', abbreviation: '2Mc', testament: 'OT', position: 46 },
  { name: 'São Mateus', abbreviation: 'Mt', testament: 'NT', position: 47 },
  { name: 'São Marcos', abbreviation: 'Mc', testament: 'NT', position: 48 },
  { name: 'São Lucas', abbreviation: 'Lc', testament: 'NT', position: 49 },
  { name: 'São João', abbreviation: 'Jo', testament: 'NT', position: 50 },
  { name: 'Atos dos Apóstolos', abbreviation: 'At', testament: 'NT', position: 51 },
  { name: 'Romanos', abbreviation: 'Rm', testament: 'NT', position: 52 },
  { name: 'I Coríntios', abbreviation: '1Cor', testament: 'NT', position: 53 },
  { name: 'II Coríntios', abbreviation: '2Cor', testament: 'NT', position: 54 },
  { name: 'Gálatas', abbreviation: 'Gl', testament: 'NT', position: 55 },
  { name: 'Efésios', abbreviation: 'Ef', testament: 'NT', position: 56 },
  { name: 'Filipenses', abbreviation: 'Fl', testament: 'NT', position: 57 },
  { name: 'Colossenses', abbreviation: 'Cl', testament: 'NT', position: 58 },
  { name: 'I Tessalonicenses', abbreviation: '1Ts', testament: 'NT', position: 59 },
  { name: 'II Tessalonicenses', abbreviation: '2Ts', testament: 'NT', position: 60 },
  { name: 'I Timóteo', abbreviation: '1Tm', testament: 'NT', position: 61 },
  { name: 'II Timóteo', abbreviation: '2Tm', testament: 'NT', position: 62 },
  { name: 'Tito', abbreviation: 'Tt', testament: 'NT', position: 63 },
  { name: 'Filemon', abbreviation: 'Fm', testament: 'NT', position: 64 },
  { name: 'Hebreus', abbreviation: 'Hb', testament: 'NT', position: 65 },
  { name: 'São Tiago', abbreviation: 'Tg', testament: 'NT', position: 66 },
  { name: 'I São Pedro', abbreviation: '1Pd', testament: 'NT', position: 67 },
  { name: 'II São Pedro', abbreviation: '2Pd', testament: 'NT', position: 68 },
  { name: 'I São João', abbreviation: '1Jo', testament: 'NT', position: 69 },
  { name: 'II São João', abbreviation: '2Jo', testament: 'NT', position: 70 },
  { name: 'III São João', abbreviation: '3Jo', testament: 'NT', position: 71 },
  { name: 'São Judas', abbreviation: 'Jd', testament: 'NT', position: 72 },
  { name: 'Apocalipse', abbreviation: 'Ap', testament: 'NT', position: 73 },
];

const GENESIS = [
  'No princípio criou Deus o céu e a terra.',
  'A terra, porém, estava informe e vazia, e as trevas cobriam a face do abismo, e o Espírito de Deus era levado sobre as águas.',
  'E disse Deus: Exista a luz. E a luz existiu.',
  'E viu Deus que a luz era boa; e separou a luz das trevas.',
  'E chamou à luz Dia, e às trevas Noite. E da tarde e da manhã se fez o dia primeiro.',
  'Disse também Deus: Faça-se o firmamento no meio das águas, e separe umas águas das outras.',
  'E fez Deus o firmamento, e separou as águas que estavam debaixo do firmamento daquelas que estavam sobre o firmamento. E assim se fez.',
  'E chamou ao firmamento Céu. E da tarde e da manhã se fez o dia segundo.',
  'Disse também Deus: Ajuntem-se as águas que estão debaixo do céu num só lugar, e apareça o elemento árido. E assim se fez.',
  'E chamou ao elemento árido Terra, e ao ajuntamento das águas Mares. E viu Deus que isto era bom.',
  'E disse: Produza a terra erva verde, que dê semente, e árvores frutíferas que deem fruto segundo a sua espécie, cuja semente esteja em si mesma sobre a terra. E assim se fez.',
  'A terra, pois, produziu erva verde, que dá semente segundo a sua espécie, e árvores frutíferas, que encerram em si mesmas a sua semente segundo a sua espécie. E viu Deus que isto era bom.',
  'E da tarde e da manhã se fez o dia terceiro.',
  'Disse também Deus: Haja luzeiros no firmamento do céu, que separem o dia da noite, e sirvam de sinais, e de tempos, e de dias, e de anos;',
  'e resplandeçam no firmamento do céu, e alumiem a terra. E assim se fez.',
  'E fez Deus dois grandes luzeiros: o luzeiro maior, que presidisse ao dia, e o luzeiro menor, que presidisse à noite, e as estrelas.',
  'E colocou-os no firmamento do céu, para que alumiem a terra,',
  'e presidam ao dia e à noite, e separem a luz das trevas. E viu Deus que isto era bom.',
  'E da tarde e da manhã se fez o dia quarto.',
  'Disse também Deus: Produzam as águas répteis de alma vivente, e aves que voem sobre a terra, debaixo do firmamento do céu.',
  'E criou Deus as grandes baleias, e todos os viventes que se movem, os quais as águas produziram segundo as suas espécies, e todas as aves segundo o seu gênero. E viu Deus que isto era bom.',
  'E os abençoou, dizendo: Crescei e multiplicai-vos, e enchei as águas do mar; e as aves se multipliquem sobre a terra.',
  'E da tarde e da manhã se fez o dia quinto.',
  'Disse também Deus: Produza a terra alma vivente segundo a sua espécie, animais domésticos, e répteis, e bestas da terra segundo as suas espécies. E assim se fez.',
  'E fez Deus as bestas da terra segundo as suas espécies, e os animais domésticos, e todos os répteis da terra segundo o seu gênero. E viu Deus que isto era bom.',
  'Então disse Deus: Façamos o homem à nossa imagem e semelhança, o qual presida aos peixes do mar, e às aves do céu, e às bestas, e a toda a terra, e a todos os répteis que se movem sobre a terra.',
  'E criou Deus o homem à sua imagem; à imagem de Deus o criou; macho e fêmea os criou.',
  'E os abençoou, e lhes disse: Crescei e multiplicai-vos, e enchei a terra, e sujeitai-a, e dominai sobre os peixes do mar, e sobre as aves do céu, e sobre todos os animais que se movem sobre a terra.',
  'E disse Deus: Eis aí vos tenho dado todas as ervas que dão semente sobre a terra, e todas as árvores que encerram em si mesmas semente de sua espécie, para que vos sirvam de sustento,',
  'e a todos os animais da terra, e a todas as aves do céu, e a tudo o que se move sobre a terra e tem alma vivente, para que tenham que comer. E assim se fez.',
  'E viu Deus todas as coisas que tinha feito, e eram muito boas. E da tarde e da manhã se fez o dia sexto.',
];

const CATECHISM = [
  { number: 1, category: 'creed', question: 'Que é a Doutrina Cristã?', answer: 'A Doutrina Cristã é a doutrina que Jesus Cristo Nosso Senhor nos ensinou para nos mostrar o caminho da salvação.' },
  { number: 2, category: 'creed', question: 'Que é o Sinal da Cruz?', answer: 'O Sinal da Cruz é um ato religioso com que os cristãos começam as suas principais ações, pedindo a Deus que as abençoe.' },
  { number: 3, category: 'creed', question: 'Quantos são os principais mistérios da fé?', answer: 'Os principais mistérios da fé são três: Unidade e Trindade de Deus, Encarnação, Paixão, Morte e Ressurreição de Nosso Senhor Jesus Cristo.' },
  { number: 4, category: 'creed', question: 'Que é Deus?', answer: 'Deus é um espírito puríssimo, eterno, imenso, onipotente, Criador e Senhor de todas as coisas.' },
  { number: 5, category: 'creed', question: 'Em que consiste o mistério da Santíssima Trindade?', answer: 'Consiste em que Deus, sendo um só em natureza, existe em três Pessoas realmente distintas: Pai, Filho e Espírito Santo.' },
  { number: 50, category: 'sacraments', question: 'Que é um sacramento?', answer: 'O sacramento é um sinal sensível, instituído por Nosso Senhor Jesus Cristo, para significar e produzir a graça santificante em nossas almas.' },
  { number: 51, category: 'sacraments', question: 'Quantos são os sacramentos?', answer: 'Os sacramentos são sete: Batismo, Confirmação (Crisma), Eucaristia, Penitência (Confissão), Unção dos Enfermos, Ordem e Matrimônio.' },
  { number: 52, category: 'sacraments', question: 'Que é o Batismo?', answer: 'O Batismo é o sacramento que nos faz cristãos, apaga o pecado original, nos infunde a graça santificante e nos torna filhos de Deus e membros da Igreja.' },
  { number: 53, category: 'sacraments', question: 'Que é a Crisma ou Confirmação?', answer: 'A Crisma é o sacramento que nos faz soldados de Cristo, nos dá o Espírito Santo com a plenitude dos seus dons e nos confirma na fé.' },
  { number: 100, category: 'commandments', question: 'Quantos são os Mandamentos da Lei de Deus?', answer: 'Os Mandamentos da Lei de Deus são dez. Os três primeiros pertencem à honra de Deus, e os outros sete ao proveito do próximo.' },
  { number: 101, category: 'commandments', question: 'Qual é o primeiro Mandamento?', answer: 'Amar a Deus sobre todas as coisas.' },
  { number: 150, category: 'prayer', question: 'Que é a oração?', answer: 'A oração é uma elevação da alma a Deus, para adorá-Lo, agradecer-Lhe, pedir-Lhe o que necessitamos e pedir perdão pelos pecados.' },
  { number: 151, category: 'prayer', question: 'Qual é a oração mais excelente?', answer: 'A oração mais excelente é o Pai Nosso, que Nosso Senhor Jesus Cristo nos ensinou.' },
];

async function seed() {
  const { v4: uuid } = require('uuid');
  
  const existing = await prisma.bibleBook.count();
  if (existing > 0) { console.log('Already seeded.'); return; }

  for (const b of BOOKS) {
    await prisma.bibleBook.create({ data: { id: uuid(), ...b } });
  }
  console.log(`Seeded ${BOOKS.length} Bible books.`);

  const genesis = await prisma.bibleBook.findFirst({ where: { name: 'Gênesis' } });
  if (genesis) {
    const ch = await prisma.bibleChapter.create({ data: { id: uuid(), bookId: genesis.id, number: 1 } });
    for (let i = 0; i < GENESIS.length; i++) {
      await prisma.bibleVerse.create({ data: { id: uuid(), chapterId: ch.id, number: i + 1, text: GENESIS[i] } });
    }
    console.log(`Seeded Genesis 1 (${GENESIS.length} verses).`);
  }

  for (const e of CATECHISM) {
    await prisma.catechismEntry.create({ data: { id: uuid(), ...e } });
  }
  console.log(`Seeded ${CATECHISM.length} Catechism entries.`);
}

seed().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
