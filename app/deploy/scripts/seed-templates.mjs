#!/usr/bin/env node
// Copied to the VPS under /opt/catechis/scripts/. Prisma lives in the
// server image, so this wrapper only points to the in-container seeder.
console.log('Seed journey templates inside the server container:');
console.log(
  '  docker compose exec -T server node /app/src/server/scripts/seedJourneyTemplates.mjs',
);
console.log(
  'Homolog: docker compose -f docker-compose.homolog.yml exec -T server node /app/src/server/scripts/seedJourneyTemplates.mjs',
);
