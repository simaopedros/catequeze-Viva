import { isBirthDateAllowed } from "./personFields";

/** Client/server-safe validation for CatechumenProfile updates. */
export class CatechumenUpdateValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "CatechumenUpdateValidationError";
  }
}

/** Simple RFC-ish check aligned with the edit-form client validation. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize optional email; empty clears; invalid non-empty rejects with PT message. */
export function parseEmailOrThrow(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") {
    throw new CatechumenUpdateValidationError("E-mail inválido.");
  }
  const email = raw.trim();
  if (!email) return null;
  if (!EMAIL_PATTERN.test(email)) {
    throw new CatechumenUpdateValidationError("E-mail inválido.");
  }
  return email;
}

/** Parse YYYY-MM-DD birth dates; reject future dates. */
export function parseBirthDateOrThrow(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw !== "string") {
    throw new CatechumenUpdateValidationError("Data de nascimento inválida.");
  }
  if (!isBirthDateAllowed(raw)) {
    throw new CatechumenUpdateValidationError(
      "A data de nascimento não pode ser no futuro.",
    );
  }
  const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) {
    throw new CatechumenUpdateValidationError("Data de nascimento inválida.");
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Whitelist + normalize fields so unknown client keys never hit Prisma. */
export function buildCatechumenUpdateData(args: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  if (typeof args.firstName === "string") {
    const firstName = args.firstName.trim();
    if (!firstName) {
      throw new CatechumenUpdateValidationError("Nome é obrigatório.");
    }
    data.firstName = firstName;
  }
  if (typeof args.lastName === "string") {
    const lastName = args.lastName.trim();
    if (!lastName) {
      throw new CatechumenUpdateValidationError("Sobrenome é obrigatório.");
    }
    data.lastName = lastName;
  }
  if (args.email !== undefined) {
    data.email = parseEmailOrThrow(args.email);
  }
  if (args.photoUrl !== undefined) {
    data.photoUrl =
      typeof args.photoUrl === "string" && args.photoUrl ? args.photoUrl : null;
  }
  if (args.householdId !== undefined) {
    data.householdId =
      typeof args.householdId === "string" && args.householdId
        ? args.householdId
        : null;
  }
  if (args.birthDate !== undefined) {
    data.birthDate = parseBirthDateOrThrow(args.birthDate);
  }

  return data;
}
