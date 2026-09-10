import type { PrismaClient } from "@prisma/client";

const SOCIAL_TOPICS = [
  { slug: "liturgia", name: "Liturgia", nameEn: "Liturgy", nameEs: "Liturgia", position: 1 },
  { slug: "catequese", name: "Catequese", nameEn: "Catechesis", nameEs: "Catequesis", position: 2 },
  { slug: "santos", name: "Santos", nameEn: "Saints", nameEs: "Santos", position: 3 },
  { slug: "oracao", name: "Oração", nameEn: "Prayer", nameEs: "Oración", position: 4 },
  { slug: "biblia", name: "Bíblia", nameEn: "Bible", nameEs: "Biblia", position: 5 },
  { slug: "familia", name: "Família", nameEn: "Family", nameEs: "Familia", position: 6 },
  { slug: "juventude", name: "Juventude", nameEn: "Youth", nameEs: "Juventud", position: 7 },
  { slug: "missao", name: "Missão", nameEn: "Mission", nameEs: "Misión", position: 8 },
  { slug: "testemunho", name: "Testemunho", nameEn: "Testimony", nameEs: "Testimonio", position: 9 },
  { slug: "formacao", name: "Formação", nameEn: "Formation", nameEs: "Formación", position: 10 },
] as const;

/** Idempotent seed of curated Comunidade / Rhema topics. */
export async function seedSocialTopics(prismaClient: PrismaClient): Promise<void> {
  for (const topic of SOCIAL_TOPICS) {
    await prismaClient.socialTopic.upsert({
      where: { slug: topic.slug },
      create: { ...topic, active: true },
      update: {
        name: topic.name,
        nameEn: topic.nameEn,
        nameEs: topic.nameEs,
        position: topic.position,
        active: true,
      },
    });
  }
}
