import { tick, wakeAt } from '@/game/runtime';
import type { GameState } from '@/game/types';
import { type Meta, type Row, getStore } from './store';

export class NotFoundError extends Error {
  constructor() {
    super('找不到這個房間');
    this.name = 'NotFoundError';
  }
}

export class BusyError extends Error {
  constructor() {
    super('房間忙碌中，請再試一次');
    this.name = 'BusyError';
  }
}

interface Hub {
  waiters: Map<string, Set<() => void>>;
  cache: Map<string, { at: number; meta: Meta | null; pending?: Promise<Meta | null> }>;
}

function hub(): Hub {
  const g = globalThis as unknown as { __wwHub?: Hub };
  return (g.__wwHub ??= { waiters: new Map(), cache: new Map() });
}

const META_TTL = 350;

/** 同一個執行個體內，狀態一更新就立刻喚醒等待中的長輪詢 */
function notify(code: string, meta: Meta) {
  const h = hub();
  h.cache.set(code, { at: Date.now(), meta: { version: meta.version, wakeAt: meta.wakeAt } });
  const set = h.waiters.get(code);
  if (set) for (const fn of [...set]) fn();
}

/** 等待房間有變化，或最多 ms 毫秒 */
export function waitForChange(code: string, ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const h = hub();
    let set = h.waiters.get(code);
    if (!set) h.waiters.set(code, (set = new Set()));
    const done = () => {
      clearTimeout(timer);
      set.delete(done);
      if (!set.size) h.waiters.delete(code);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    set.add(done);
    signal?.addEventListener('abort', done, { once: true });
  });
}

/** 讀取房間版本號。短暫快取並合併同時發出的查詢，降低資料庫負擔 */
export async function peek(code: string): Promise<Meta | null> {
  const h = hub();
  const c = h.cache.get(code);
  const now = Date.now();
  if (c && now - c.at < META_TTL) return c.meta;
  if (c?.pending) return c.pending;
  const pending = getStore()
    .meta(code)
    .then((meta) => {
      h.cache.set(code, { at: Date.now(), meta });
      return meta;
    })
    .catch((e) => {
      h.cache.delete(code);
      throw e;
    });
  h.cache.set(code, { at: c?.at ?? 0, meta: c?.meta ?? null, pending });
  return pending;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 讀取 → 修改 → 以樂觀鎖寫回；衝突時重試 */
export async function mutate<T>(code: string, fn: (s: GameState, now: number) => T): Promise<{ row: Row; result: T }> {
  const store = getStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await store.get(code);
    if (!row) throw new NotFoundError();
    const now = Date.now();
    const s = row.state;
    tick(s, now);
    const result = fn(s, now);
    tick(s, now);
    const wake = wakeAt(s);
    if (await store.update(code, row.version, s, wake)) {
      const next: Row = { version: row.version + 1, wakeAt: wake, state: s };
      notify(code, next);
      return { row: next, result };
    }
    await sleep(10 + Math.random() * 30 * (attempt + 1));
  }
  throw new BusyError();
}

/** 處理到期的計時器與電腦玩家行動；沒有變化時不寫入 */
export async function advance(code: string): Promise<Row | null> {
  const store = getStore();
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await store.get(code);
    if (!row) return null;
    const s = row.state;
    const changed = tick(s, Date.now());
    const wake = wakeAt(s);
    if (!changed && wake === row.wakeAt) {
      notify(code, row);
      return row;
    }
    if (await store.update(code, row.version, s, wake)) {
      const next: Row = { version: row.version + 1, wakeAt: wake, state: s };
      notify(code, next);
      return next;
    }
  }
  // 其他請求已經處理了，讀最新的即可
  return store.get(code);
}

export async function createRoom(code: string, state: GameState): Promise<boolean> {
  const ok = await getStore().create(code, state, null);
  if (ok) notify(code, { version: 1, wakeAt: null });
  return ok;
}
