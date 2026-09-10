import { HttpError } from "wasp/server";
import * as z from "zod";
import { requirePlatformAdmin, writeAuditLog } from "../auth/helpers";
import { validateOrThrow } from "../validation";
import {
  BLOG_BODY_MAX,
  BLOG_DEFAULT_PAGE_SIZE,
  BLOG_EXCERPT_MAX,
  BLOG_MAX_PAGE_SIZE,
  BLOG_SEO_DESCRIPTION_MAX,
  BLOG_SEO_TITLE_MAX,
  BLOG_TITLE_MAX,
  isBlogCategory,
  isBlogImageKey,
  normalizeBlogTags,
  slugifyBlogTitle,
  buildBlogAuthorName,
  type BlogCategory,
  type BlogPostStatus,
} from "../../shared/blog";
import { plainTextFromHtml, sanitizeBlogHtml } from "../../shared/blogHtml";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null) return value;
      const trimmed = value.trim();
      return trimmed ? trimmed : "";
    });

const blogCategoryEnum = z.enum([
  "FORMATION",
  "PRACTICAL_TIPS",
  "LITURGY",
  "FAMILY",
  "MANAGEMENT",
  "TESTIMONY",
]);
const blogStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const createBlogPostSchema = z.object({
  title: z.string().min(1).max(BLOG_TITLE_MAX),
  excerpt: optionalString(BLOG_EXCERPT_MAX).optional(),
  bodyHtml: z.string().max(BLOG_BODY_MAX).optional(),
  category: blogCategoryEnum.optional(),
  tags: z.array(z.string()).optional(),
  slug: z.string().max(80).optional(),
  coverImageKey: z.string().max(512).optional().nullable(),
  seoTitle: optionalString(BLOG_SEO_TITLE_MAX).optional(),
  seoDescription: optionalString(BLOG_SEO_DESCRIPTION_MAX).optional(),
  locale: z.string().min(2).max(12).optional(),
});

const updateBlogPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(BLOG_TITLE_MAX).optional(),
  excerpt: optionalString(BLOG_EXCERPT_MAX).optional(),
  bodyHtml: z.string().max(BLOG_BODY_MAX).optional(),
  category: blogCategoryEnum.optional(),
  tags: z.array(z.string()).optional(),
  slug: z.string().max(80).optional(),
  coverImageKey: z.string().max(512).optional().nullable(),
  seoTitle: optionalString(BLOG_SEO_TITLE_MAX).optional(),
  seoDescription: optionalString(BLOG_SEO_DESCRIPTION_MAX).optional(),
  locale: z.string().min(2).max(12).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

const publicListSchema = z.object({
  category: blogCategoryEnum.optional(),
  locale: z.string().min(2).max(12).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(BLOG_MAX_PAGE_SIZE).optional(),
});

const publicGetSchema = z.object({
  slug: z.string().min(1).max(120),
});

const adminListSchema = z.object({
  status: blogStatusEnum.optional(),
  search: z.string().max(120).optional(),
});

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

function publishedWhere(locale?: string, category?: BlogCategory) {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { lte: new Date() },
    ...(locale ? { locale } : {}),
    ...(category ? { category } : {}),
  };
}

function serializePublicPost(post: any) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    coverImageKey: post.coverImageKey,
    category: post.category as BlogCategory,
    tags: post.tags as string[],
    locale: post.locale,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    author: {
      id: post.author?.id,
      name: buildBlogAuthorName(post.author || {}),
    },
  };
}

function serializeAdminPost(post: any) {
  return {
    ...serializePublicPost(post),
    status: post.status as BlogPostStatus,
    createdAt: post.createdAt,
    coverImageKey: post.coverImageKey,
  };
}

async function uniqueSlug(
  entities: any,
  raw: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyBlogTitle(raw);
  for (let n = 0; n < 50; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const existing = await entities.BlogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  throw new HttpError(409, "Não foi possível gerar um slug único.");
}

function isPlaceholderTitle(title: string): boolean {
  const slug = slugifyBlogTitle(title);
  return slug === "sem-titulo" || slug === "untitled" || slug === "sin-titulo";
}

function normalizeCoverKey(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  if (!isBlogImageKey(value)) {
    throw new HttpError(400, "Imagem de capa inválida.");
  }
  return value;
}

export const listPublishedBlogPosts = async (
  rawArgs: unknown,
  context: any,
) => {
  const args = validateOrThrow(publicListSchema, rawArgs ?? {});
  const page = args.page || 1;
  const pageSize = args.pageSize || BLOG_DEFAULT_PAGE_SIZE;
  const where = publishedWhere(args.locale, args.category);

  const [total, rows] = await Promise.all([
    context.entities.BlogPost.count({ where }),
    context.entities.BlogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageKey: true,
        category: true,
        tags: true,
        locale: true,
        publishedAt: true,
        updatedAt: true,
        seoTitle: true,
        seoDescription: true,
        author: { select: AUTHOR_SELECT },
      },
    }),
  ]);

  return {
    items: rows.map((row: any) => {
      const serialized = serializePublicPost({ ...row, bodyHtml: "" });
      const { bodyHtml: _bodyHtml, ...rest } = serialized;
      return rest;
    }),
    total,
    page,
    pageSize,
  };
};

export const getPublishedBlogPost = async (rawArgs: unknown, context: any) => {
  const { slug } = validateOrThrow(publicGetSchema, rawArgs);
  const post = await context.entities.BlogPost.findUnique({
    where: { slug },
    include: { author: { select: AUTHOR_SELECT } },
  });
  if (
    !post ||
    post.status !== "PUBLISHED" ||
    !post.publishedAt ||
    new Date(post.publishedAt) > new Date()
  ) {
    throw new HttpError(404, "Artigo não encontrado.");
  }
  return serializePublicPost(post);
};

export const listBlogPostsAdmin = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const args = validateOrThrow(adminListSchema, rawArgs ?? {});
  const search = args.search?.trim();
  const rows = await context.entities.BlogPost.findMany({
    where: {
      ...(args.status ? { status: args.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { author: { select: AUTHOR_SELECT } },
  });
  return rows.map(serializeAdminPost);
};

export const getBlogPostAdmin = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const { id } = validateOrThrow(idSchema, rawArgs);
  const post = await context.entities.BlogPost.findUnique({
    where: { id },
    include: { author: { select: AUTHOR_SELECT } },
  });
  if (!post) throw new HttpError(404, "Artigo não encontrado.");
  return serializeAdminPost(post);
};

export const createBlogPost = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const args = validateOrThrow(createBlogPostSchema, rawArgs);
  const title = args.title.trim();
  const slug = await uniqueSlug(context.entities, args.slug || title);
  const bodyHtml = sanitizeBlogHtml(args.bodyHtml || "");
  const excerpt =
    (args.excerpt && args.excerpt.trim()) ||
    plainTextFromHtml(bodyHtml, BLOG_EXCERPT_MAX) ||
    "";

  const post = await context.entities.BlogPost.create({
    data: {
      title,
      slug,
      excerpt,
      bodyHtml,
      category:
        args.category && isBlogCategory(args.category)
          ? args.category
          : "FORMATION",
      tags: normalizeBlogTags(args.tags),
      coverImageKey: normalizeCoverKey(args.coverImageKey) ?? null,
      seoTitle: args.seoTitle || null,
      seoDescription: args.seoDescription || null,
      locale: args.locale || "pt-BR",
      authorId: context.user.id,
      status: "DRAFT",
    },
    include: { author: { select: AUTHOR_SELECT } },
  });

  await writeAuditLog(context, "CREATE", "BlogPost", post.id, {
    operation: "BLOG_CREATE",
    slug: post.slug,
  });

  return serializeAdminPost(post);
};

export const updateBlogPost = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const args = validateOrThrow(updateBlogPostSchema, rawArgs);
  const existing = await context.entities.BlogPost.findUnique({
    where: { id: args.id },
    select: { id: true, title: true, slug: true },
  });
  if (!existing) throw new HttpError(404, "Artigo não encontrado.");

  const data: Record<string, unknown> = {};
  if (args.title !== undefined) data.title = args.title.trim();
  if (args.bodyHtml !== undefined)
    data.bodyHtml = sanitizeBlogHtml(args.bodyHtml);
  if (args.excerpt !== undefined) data.excerpt = args.excerpt || "";
  if (args.category !== undefined) data.category = args.category;
  if (args.tags !== undefined) data.tags = normalizeBlogTags(args.tags);
  if (args.coverImageKey !== undefined) {
    data.coverImageKey = normalizeCoverKey(args.coverImageKey) ?? null;
  }
  if (args.seoTitle !== undefined) data.seoTitle = args.seoTitle || null;
  if (args.seoDescription !== undefined) {
    data.seoDescription = args.seoDescription || null;
  }
  if (args.locale !== undefined) data.locale = args.locale;
  if (args.slug !== undefined || args.title !== undefined) {
    data.slug = await uniqueSlug(
      context.entities,
      args.slug || args.title || existing.title,
      existing.id,
    );
  }

  const post = await context.entities.BlogPost.update({
    where: { id: args.id },
    data,
    include: { author: { select: AUTHOR_SELECT } },
  });

  await writeAuditLog(context, "UPDATE", "BlogPost", post.id, {
    operation: "BLOG_UPDATE",
    slug: post.slug,
  });

  return serializeAdminPost(post);
};

export const publishBlogPost = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const { id } = validateOrThrow(idSchema, rawArgs);
  const existing = await context.entities.BlogPost.findUnique({
    where: { id },
  });
  if (!existing) throw new HttpError(404, "Artigo não encontrado.");

  const title = existing.title.trim();
  const bodyHtml = sanitizeBlogHtml(existing.bodyHtml || "");
  const excerpt =
    existing.excerpt.trim() || plainTextFromHtml(bodyHtml, BLOG_EXCERPT_MAX);
  if (!title || isPlaceholderTitle(title)) {
    throw new HttpError(400, "Defina um título antes de publicar.");
  }
  if (!excerpt) {
    throw new HttpError(
      400,
      "Escreva um resumo ou o corpo do artigo antes de publicar.",
    );
  }
  if (!plainTextFromHtml(bodyHtml, 40)) {
    throw new HttpError(
      400,
      "O artigo precisa de conteúdo antes de ser publicado.",
    );
  }

  const post = await context.entities.BlogPost.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: existing.publishedAt || new Date(),
      excerpt,
      bodyHtml,
    },
    include: { author: { select: AUTHOR_SELECT } },
  });

  await writeAuditLog(context, "PUBLISH", "BlogPost", post.id, {
    operation: "BLOG_PUBLISH",
    slug: post.slug,
  });

  return serializeAdminPost(post);
};

export const unpublishBlogPost = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const { id } = validateOrThrow(idSchema, rawArgs);
  const existing = await context.entities.BlogPost.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) throw new HttpError(404, "Artigo não encontrado.");

  const post = await context.entities.BlogPost.update({
    where: { id },
    data: { status: "DRAFT" },
    include: { author: { select: AUTHOR_SELECT } },
  });

  await writeAuditLog(context, "UPDATE", "BlogPost", post.id, {
    operation: "BLOG_UNPUBLISH",
    slug: post.slug,
  });

  return serializeAdminPost(post);
};

export const archiveBlogPost = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const { id } = validateOrThrow(idSchema, rawArgs);
  const existing = await context.entities.BlogPost.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) throw new HttpError(404, "Artigo não encontrado.");

  const post = await context.entities.BlogPost.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: { author: { select: AUTHOR_SELECT } },
  });

  await writeAuditLog(context, "UPDATE", "BlogPost", post.id, {
    operation: "BLOG_ARCHIVE",
    slug: post.slug,
  });

  return serializeAdminPost(post);
};
