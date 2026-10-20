import {describe, expect, it} from 'vitest';
import {createDb} from './harness';

describe('migraciones', () => {
  it('se aplican y el seed carga datos de demostración', async () => {
    const db = await createDb();
    const r = await db.query<{n: number}>(`select count(*)::int as n from events where is_demo`);
    expect(r.rows[0].n).toBe(3);
  });
});
