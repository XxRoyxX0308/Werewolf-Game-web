/**
 * 檢查 Neon 資料庫連線是否正常：建立一個測試房間、讀取、更新、驗證樂觀鎖，最後刪除。
 * 用法：在 .env.local 設定 DATABASE_URL 後執行 `npm run db:check`
 */
import { neon } from '@neondatabase/serverless';
import { addPlayer, createState } from '../src/game/engine';
import { getStore, usingDatabase } from '../src/lib/store';

async function main() {
  if (!usingDatabase()) {
    console.error('✗ 找不到 DATABASE_URL。請在 .env.local 填入 Neon 的連線字串。');
    process.exit(1);
  }
  const store = getStore();
  const code = `T${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const state = createState(code, Date.now());
  addPlayer(state, { name: '連線測試' });

  const step = async (label: string, fn: () => Promise<boolean>) => {
    const ok = await fn();
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (!ok) throw new Error(`${label} 失敗`);
  };

  try {
    await step('建立資料表並新增房間', () => store.create(code, state, null));
    await step('重複的房間代碼會被拒絕', async () => !(await store.create(code, state, null)));
    await step('讀取房間狀態', async () => {
      const row = await store.get(code);
      return row?.version === 1 && row.state.players[0]?.name === '連線測試' && row.wakeAt === null;
    });
    const wake = Date.now() + 30_000;
    await step('更新房間（版本 1 → 2）', () => store.update(code, 1, state, wake));
    await step('過期的版本無法寫入（樂觀鎖）', async () => !(await store.update(code, 1, state, null)));
    await step('讀取版本與計時器', async () => {
      const meta = await store.meta(code);
      return meta?.version === 2 && meta.wakeAt === wake;
    });
    console.log('\n資料庫連線正常，可以部署了。');
  } finally {
    const sql = neon((process.env.DATABASE_URL || process.env.POSTGRES_URL)!);
    await sql`delete from ww_rooms where code = ${code}`;
  }
}

main().catch((e) => {
  console.error('\n資料庫檢查失敗：', e instanceof Error ? e.message : e);
  process.exit(1);
});
