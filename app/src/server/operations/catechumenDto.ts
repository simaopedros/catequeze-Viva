/** Public profile scalars shared by queries and mutations. */
export const catechumenPublicSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  firstName: true,
  lastName: true,
  email: true,
  birthDate: true,
  photoUrl: true,
  userId: true,
  householdId: true,
  parishId: true,
} as const;
