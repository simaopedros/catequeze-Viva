export type EmailDb = {
  emailMessage?: any;
  emailSuppression?: any;
  emailPreference?: any;
  user?: any;
  lifecycleEmailLog?: any;
};

type MemoryRow = Record<string, any>;

function memoryDelegate(rows: MemoryRow[], uniqueKeys: string[] = ["id"]) {
  return {
    async create({ data }: { data: MemoryRow }) {
      const row = {
        id: data.id || `mem_${rows.length + 1}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      rows.push(row);
      return row;
    },
    async findUnique({ where }: { where: MemoryRow }) {
      return (
        rows.find((row) =>
          Object.entries(where).every(([key, value]) => row[key] === value),
        ) || null
      );
    },
    async findFirst({
      where,
      orderBy,
    }: {
      where?: MemoryRow;
      orderBy?: MemoryRow;
    }) {
      let matches = rows;
      if (where) {
        matches = rows.filter((row) => matchWhere(row, where));
      }
      if (orderBy) {
        const [key, dir] = Object.entries(orderBy)[0] || [];
        if (key) {
          matches = [...matches].sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            if (av < bv) return dir === "desc" ? 1 : -1;
            if (av > bv) return dir === "desc" ? -1 : 1;
            return 0;
          });
        }
      }
      return matches[0] || null;
    },
    async findMany({
      where,
      take,
    }: {
      where?: MemoryRow;
      take?: number;
    } = {}) {
      let matches = where ? rows.filter((row) => matchWhere(row, where)) : [...rows];
      if (typeof take === "number") matches = matches.slice(0, take);
      return matches;
    },
    async update({ where, data }: { where: MemoryRow; data: MemoryRow }) {
      const row = rows.find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      );
      if (!row) throw new Error("memory row not found");
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    async updateMany({ where, data }: { where?: MemoryRow; data: MemoryRow }) {
      let count = 0;
      for (const row of rows) {
        if (!where || matchWhere(row, where)) {
          Object.assign(row, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    },
    async upsert({
      where,
      create,
      update,
    }: {
      where: MemoryRow;
      create: MemoryRow;
      update: MemoryRow;
    }) {
      const existing = rows.find((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      );
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }
      return this.create({ data: create });
    },
    _rows: rows,
    _uniqueKeys: uniqueKeys,
  };
}

function matchWhere(row: MemoryRow, where: MemoryRow): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(value)) {
      if (!value.some((clause) => matchWhere(row, clause))) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      if (!value.every((clause) => matchWhere(row, clause))) return false;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      if ("lte" in value && row[key] > value.lte) return false;
      if ("gte" in value && row[key] < value.gte) return false;
      if ("lt" in value && row[key] >= value.lt) return false;
      if ("gt" in value && row[key] <= value.gt) return false;
      if ("in" in value && !value.in.includes(row[key])) return false;
      if ("equals" in value && row[key] !== value.equals) return false;
      if ("not" in value) {
        if (value.not === null && row[key] == null) return false;
        if (value.not !== null && row[key] === value.not) return false;
      }
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

const memory = {
  messages: [] as MemoryRow[],
  suppressions: [] as MemoryRow[],
  preferences: [] as MemoryRow[],
};

export function resetEmailMemory(): void {
  memory.messages.length = 0;
  memory.suppressions.length = 0;
  memory.preferences.length = 0;
}

function memoryDb(): EmailDb {
  return {
    emailMessage: memoryDelegate(memory.messages, ["id", "idempotencyKey"]),
    emailSuppression: memoryDelegate(memory.suppressions, ["id"]),
    emailPreference: memoryDelegate(memory.preferences, ["id"]),
  };
}

export function resolveEmailDb(context?: { entities?: any }): EmailDb {
  const entities = context?.entities;
  if (entities?.EmailMessage) {
    return {
      emailMessage: entities.EmailMessage,
      emailSuppression: entities.EmailSuppression,
      emailPreference: entities.EmailPreference,
      user: entities.User,
      lifecycleEmailLog: entities.LifecycleEmailLog,
    };
  }

  if (entities?.emailMessage) {
    return {
      emailMessage: entities.emailMessage,
      emailSuppression: entities.emailSuppression,
      emailPreference: entities.emailPreference,
      user: entities.user,
      lifecycleEmailLog: entities.lifecycleEmailLog,
    };
  }

  return memoryDb();
}
