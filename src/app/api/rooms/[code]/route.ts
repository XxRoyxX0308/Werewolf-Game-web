import { viewFor } from '@/game/view';
import { handle, json, normCode } from '@/lib/http';
import { advance, peek, waitForChange } from '@/lib/rooms';
import { type Row, getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** 長輪詢最多掛住的時間 */
const HOLD_MS = 20_000;
/** 跨執行個體時靠定期查版本號發現變化 */
const POLL_MS = 800;

/**
 * 長輪詢：版本與客戶端相同時掛住連線，有變化立即回傳該玩家可見的畫面。
 * 遊戲沒有常駐伺服器，計時器到期與電腦玩家行動也在這裡順便推進。
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = normCode((await ctx.params).code);
    const url = new URL(req.url);
    // 金鑰放在標頭，避免出現在網址與存取紀錄中
    const token = req.headers.get('x-ww-token');
    const since = Number(url.searchParams.get('v') ?? 0);
    const started = Date.now();

    for (;;) {
      let meta = await peek(code);
      if (!meta) return json({ error: '找不到這個房間' }, 404);
      let row: Row | null = null;
      if (meta.wakeAt !== null && meta.wakeAt <= Date.now()) {
        row = await advance(code);
        if (!row) return json({ error: '找不到這個房間' }, 404);
        meta = row;
      }
      if (meta.version !== since) {
        row ??= await getStore().get(code);
        if (!row) return json({ error: '找不到這個房間' }, 404);
        return json(viewFor(row.state, token, row.version, Date.now()));
      }
      const left = HOLD_MS - (Date.now() - started);
      if (left <= 0 || req.signal.aborted) return new Response(null, { status: 204 });
      const ms = Date.now();
      // 計時器快到期時提早醒來；若已到期卻沒有推進（不應發生），退回一般輪詢間隔避免空轉
      const untilWake = meta.wakeAt === null ? Infinity : meta.wakeAt > ms ? meta.wakeAt - ms + 5 : POLL_MS;
      await waitForChange(code, Math.min(left, POLL_MS, untilWake), req.signal);
    }
  });
}
