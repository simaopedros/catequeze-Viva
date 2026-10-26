import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { configureZodLocale } from '../client/zodLocale';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

describe('configureZodLocale', () => {
  afterAll(() => z.config(z.locales.en()));

  it('uses app copy for common string issues', () => {
    configureZodLocale('pt-BR', t);
    const long = z.string().max(3).safeParse('abcd');
    expect(long.success).toBe(false);
    expect(long.error?.issues[0].message).toBe('validation.native_too_long:{"max":3}');
    const email = z.string().email().safeParse('x');
    expect(email.error?.issues[0].message).toBe('validation.native_email');
  });

  it('keeps explicit schema messages', () => {
    configureZodLocale('pt-BR', t);
    const r = z.string().min(3, 'name_min').safeParse('a');
    expect(r.error?.issues[0].message).toBe('name_min');
  });

  it('falls back to the Zod locale for other issues', () => {
    configureZodLocale('pt-BR', t);
    const r = z.number().safeParse('x');
    expect(r.error?.issues[0].message).not.toMatch(/expected number/i);
  });
});
