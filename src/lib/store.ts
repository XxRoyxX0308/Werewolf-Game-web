import { neon } from '@neondatabase/serverless';
import type { GameState } from '@/game/types';

export interface Meta {
  version: number;
  wakeAt: number | null;
}
export interface Row extends Meta {
  state: GameState;
}

/** 房間狀態的儲存介面。以 version 做樂觀鎖，避免同時操作互相覆蓋 */
export interface Store {
  meta(code: string): Promise<Meta | null>;
  get(code: string): Promise<Row | null>;
  create(code: string, state: GameState, wakeAt: number | null): Promise<boolean>;
  update(code: string, version: number, state: GameState, wakeAt: number | null): Promise<boolean>;
  cleanup(): Promise<void>;
}

const toNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function neonStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<void> | null = null;
  const init = () =>
    (ready ??= (async () => {
      await sql`
        create table if not exists ww_rooms (
          code text primary key,
          version integer not null default 1,
          wake_at bigint,
          state jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`;
    })().catch((e) => {
      ready = null;
      throw e;
    }));

  return {
    async meta(code) {
      await init();
      const rows = await sql`select version, wake_at from ww_rooms where code = ${code}`;
      if (!rows.length) return null;
      return { version: Number(rows[0].version), wakeAt: toNum(rows[0].wake_at) };
    },
    async get(code) {
      await init();
      const rows = await sql`select version, wake_at, state from ww_rooms where code = ${code}`;
      if (!rows.length) return null;
      const r = rows[0];
      const state = (typeof r.state === 'string' ? JSON.parse(r.state) : r.state) as GameState;
      return { version: Number(r.version), wakeAt: toNum(r.wake_at), state };
    },
    async create(code, state, wakeAt) {
      await init();
      const rows = await sql`
        insert into ww_rooms (code, version, wake_at, state)
        values (${code}, 1, ${wakeAt}, ${JSON.stringify(state)}::jsonb)
        on conflict (code) do nothing
        returning code`;
      return rows.length > 0;
    },
    async update(code, version, state, wakeAt) {
      await init();
      const rows = await sql`
        update ww_rooms
        set state = ${JSON.stringify(state)}::jsonb,
            version = version + 1,
            wake_at = ${wakeAt},
            updated_at = now()
        where code = ${code} and version = ${version}
        returning version`;
      return rows.length > 0;
    },
    async cleanup() {
      await init();
      await sql`delete from ww_rooms where updated_at < now() - interval '2 days'`;
    },
  };
}

interface MemRow extends Row {
  touched: number;
}

/** 本機開發用：沒有設定資料庫時把房間放在記憶體 */
function memoryStore(): Store {
  const g = globalThis as unknown as { __wwRooms?: Map<string, MemRow> };
  const rooms = (g.__wwRooms ??= new Map());
  return {
    async meta(code) {
      const r = rooms.get(code);
      return r ? { version: r.version, wakeAt: r.wakeAt } : null;
    },
    async get(code) {
      const r = rooms.get(code);
      return r ? { version: r.version, wakeAt: r.wakeAt, state: structuredClone(r.state) } : null;
    },
    async create(code, state, wakeAt) {
      if (rooms.has(code)) return false;
      rooms.set(code, { version: 1, wakeAt, state: structuredClone(state), touched: Date.now() });
      return true;
    },
    async update(code, version, state, wakeAt) {
      const r = rooms.get(code);
      if (!r || r.version !== version) return false;
      rooms.set(code, { version: version + 1, wakeAt, state: structuredClone(state), touched: Date.now() });
      return true;
    },
    async cleanup() {
      const limit = Date.now() - 2 * 24 * 3600 * 1000;
      for (const [k, r] of rooms) if (r.touched < limit) rooms.delete(k);
    },
  };
}

export function usingDatabase(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function getStore(): Store {
  const g = globalThis as unknown as { __wwStore?: Store };
  if (g.__wwStore) return g.__wwStore;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) return (g.__wwStore = neonStore(url));
  if (process.env.VERCEL) {
    throw new Error('尚未設定 DATABASE_URL：請在 Vercel 專案中連接 Neon 資料庫後重新部署');
  }
  console.warn('[werewolf] 未設定 DATABASE_URL，改用記憶體儲存（僅適合本機開發）');
  return (g.__wwStore = memoryStore());
}
