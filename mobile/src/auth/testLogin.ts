/** Seed account from `app/seed_test_data.js`. Only used in Expo Go / __DEV__. */
export const DEV_TEST_LOGIN = {
  email: 'catequista.lead@catequese.com',
  password: 'Teste@123',
} as const;

export function normalizeLogin(email: string, password: string) {
  return {
    email: email.trim().toLowerCase(),
    password: password.trim(),
  };
}
