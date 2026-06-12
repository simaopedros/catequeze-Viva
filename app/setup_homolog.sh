#!/bin/bash
# ================================================================
# setup_homolog.sh — Setup completo para homologação
# ================================================================
# Este script prepara a base de dados com todos os seeds:
#   - Bíblia (73 livros, ~35k versículos em pt-BR, en, es)
#   - Catecismo (1994 parágrafos em pt-BR, en, es)
#   - Diretório para a Catequese (428 parágrafos em pt-BR, en, es)
#
# Pré-requisitos:
#   1. PostgreSQL a correr (wasp start db ou próprio)
#   2. DATABASE_URL configurada
#   3. Migration aplicada (wasp db migrate-dev)
#
# Uso:
#   chmod +x setup_homolog.sh
#   DATABASE_URL="postgresql://..." ./setup_homolog.sh
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Setup Homologação — Catequese Viva"
echo "========================================="
echo ""

# ─── Verificar DATABASE_URL ──────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não definida."
  echo "   Exporte a variável: export DATABASE_URL=\"postgresql://...\""
  exit 1
fi
echo "✅ DATABASE_URL configurada."

# ─── Verificar node_modules ──────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências..."
  npm install
fi
echo "✅ Dependências instaladas."

# ─── Verificar ficheiros de dados ────────────────────────────────
echo ""
echo "📂 Verificando ficheiros de dados..."
for locale in pt-BR en es; do
  bible_count=$(ls src/server/scripts/data/bible/$locale/*.json 2>/dev/null | wc -l)
  if [ "$bible_count" -lt 73 ]; then
    echo "⚠️  Bible $locale: $bible_count ficheiros (esperado: 73)"
  fi
done
echo "✅ Ficheiros de dados verificados."

# ─── Executar seed ───────────────────────────────────────────────
echo ""
echo "🌱 A executar seed..."
node src/server/scripts/runSeed.mjs

# ─── Verificar resultados ────────────────────────────────────────
echo ""
echo "📊 Verificando base de dados..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const books = await prisma.bibleBook.groupBy({ by: ['locale'], _count: { id: true } });
  const verses = await prisma.bibleVerse.groupBy({ by: ['locale'], _count: { id: true } });
  const cat = await prisma.catechismEntry.groupBy({ by: ['locale'], _count: { id: true } });
  const dir = await prisma.directoryEntry.groupBy({ by: ['locale'], _count: { id: true } });
  
  console.log('📖 Bible Books:', books.map(b => b.locale + ':' + b._count.id).join(' | '));
  console.log('📝 Bible Verses:', verses.map(v => v.locale + ':' + v._count.id.toLocaleString()).join(' | '));
  console.log('📚 Catechism:', cat.map(c => c.locale + ':' + c._count.id).join(' | '));
  console.log('📋 Directory:', dir.map(d => d.locale + ':' + d._count.id).join(' | '));
  
  // Validação
  const errors = [];
  for (const locale of ['pt-BR', 'en', 'es']) {
    const bookCount = books.find(b => b.locale === locale)?._count.id || 0;
    const verseCount = verses.find(v => v.locale === locale)?._count.id || 0;
    const catCount = cat.find(c => c.locale === locale)?._count.id || 0;
    const dirCount = dir.find(d => d.locale === locale)?._count.id || 0;
    
    if (bookCount < 73) errors.push(locale + ' Bible books: ' + bookCount + ' (expected 73)');
    if (verseCount < 30000) errors.push(locale + ' Bible verses: ' + verseCount + ' (expected >30k)');
    if (catCount < 1000) errors.push(locale + ' Catechism: ' + catCount + ' (expected ~1994)');
    if (dirCount < 100) errors.push(locale + ' Directory: ' + dirCount + ' (expected 428)');
  }
  
  if (errors.length > 0) {
    console.log('\n⚠️  Avisos:');
    errors.forEach(e => console.log('  - ' + e));
  } else {
    console.log('\n✅ Todos os dados verificados com sucesso!');
  }
  
  await prisma.\$disconnect();
  process.exit(errors.length > 0 ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
"

echo ""
echo "✅ Setup concluído!"
