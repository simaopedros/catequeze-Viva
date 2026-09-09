import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const writeAuditLog = vi.fn().mockResolvedValue(undefined);

vi.mock("../server/auth/helpers", () => ({
  requirePlatformAdmin: (user: any) => {
    if (!user?.isAdmin) {
      const error: any = new Error("Admin only");
      error.statusCode = 403;
      throw error;
    }
  },
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
}));

import {
  archiveBlogPost,
  createBlogPost,
  getPublishedBlogPost,
  listBlogPostsAdmin,
  listPublishedBlogPosts,
  publishBlogPost,
} from "../server/operations/blogOperations";

function context(user: any, entities: any) {
  return { user, entities };
}

function blogEntities(overrides: Record<string, unknown> = {}) {
  const store: any[] = [];
  return {
    BlogPost: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.slug)
          return store.find((row) => row.slug === where.slug) || null;
        if (where.id) return store.find((row) => row.id === where.id) || null;
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        store.filter((row) => {
          if (where?.status && row.status !== where.status) return false;
          if (where?.publishedAt?.lte) {
            if (!row.publishedAt || row.publishedAt > where.publishedAt.lte) {
              return false;
            }
          }
          return true;
        }),
      ),
      count: vi.fn(async ({ where }: any) => {
        return store.filter(
          (row) => !where?.status || row.status === where.status,
        ).length;
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: "11111111-1111-4111-8111-111111111111",
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          status: "DRAFT",
          tags: [],
          locale: "pt-BR",
          author: { id: "admin-1", firstName: "Ana", lastName: "Silva" },
          ...data,
        };
        store.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = store.find((item) => item.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      }),
    },
    store,
    ...overrides,
  };
}

describe("blogOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admins on admin list", async () => {
    await expect(
      listBlogPostsAdmin(undefined, context({ isAdmin: false }, {})),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("creates a draft with a unique slug", async () => {
    const entities = blogEntities();
    const post = await createBlogPost(
      { title: "Como fazer a chamada no celular" },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    expect(post.status).toBe("DRAFT");
    expect(post.slug).toBe("como-fazer-a-chamada-no-celular");
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it("hides drafts from the public list and permalink", async () => {
    const entities = blogEntities();
    await createBlogPost(
      {
        title: "Rascunho interno",
        excerpt: "Não publicar ainda",
        bodyHtml: "<p>Segredo</p>",
      },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    const listed = await listPublishedBlogPosts({}, context(null, entities));
    expect(listed.items).toHaveLength(0);
    await expect(
      getPublishedBlogPost(
        { slug: "rascunho-interno" },
        context(null, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("publishes only when title and body are present", async () => {
    const entities = blogEntities();
    const created = await createBlogPost(
      { title: "Sem título" },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    await expect(
      publishBlogPost(
        { id: created.id },
        context({ id: "admin-1", isAdmin: true }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    entities.BlogPost.update({
      where: { id: created.id },
      data: {
        title: "Dicas para o encontro da semana",
        excerpt: "Um roteiro curto.",
        bodyHtml: "<p>Comece pela oração.</p>",
      },
    });
    const published = await publishBlogPost(
      { id: created.id },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toBeTruthy();

    const listed = await listPublishedBlogPosts({}, context(null, entities));
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0].slug).toBe("sem-titulo");
  });

  it("archives a post so it leaves the public list", async () => {
    const entities = blogEntities();
    const created = await createBlogPost(
      {
        title: "Gestão da turma",
        excerpt: "Organize a lista.",
        bodyHtml: "<p>Use a chamada no celular.</p>",
      },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    await publishBlogPost(
      { id: created.id },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    await archiveBlogPost(
      { id: created.id },
      context({ id: "admin-1", isAdmin: true }, entities),
    );
    const listed = await listPublishedBlogPosts({}, context(null, entities));
    expect(listed.items).toHaveLength(0);
  });
});
