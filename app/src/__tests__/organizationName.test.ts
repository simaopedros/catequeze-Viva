import { describe, expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class HttpError extends Error { constructor(public statusCode: number, message?: string) { super(message); } } }));

import { createDiocese } from '../server/operations/dioceseOperations';
import { createParish, getOrCreateParishByOsmId } from '../server/operations/parishOperations';

describe('institutional organization names', () => {
  it('rejects an empty diocese name before writing', async () => {
    const create = vi.fn();
    const context = { user: { id: 'u', isAdmin: true }, entities: { Diocese: { create } } };
    await expect(createDiocese({ name: '  ', country: 'BR' }, context)).rejects.toMatchObject({ statusCode: 400 });
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects an empty parish name before writing', async () => {
    const context = { user: { id: 'u', isAdmin: true }, entities: {} };
    await expect(createParish({ name: '  ' }, context)).rejects.toMatchObject({ statusCode: 400 });
    await expect(getOrCreateParishByOsmId({ osmId: '1', name: ' ' }, context)).rejects.toMatchObject({ statusCode: 400 });
  });
});
