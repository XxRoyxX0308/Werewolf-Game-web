import { GameError } from '@/game/engine';
import { dispatch } from '@/game/runtime';
import type { ClientAction } from '@/game/types';
import { findByToken, viewFor } from '@/game/view';
import { handle, json, normCode, readBody } from '@/lib/http';
import { mutate } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/** 玩家的所有操作都走這裡，由伺服器端的規則引擎驗證後才生效 */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = normCode((await ctx.params).code);
    const body = await readBody(req);
    const token = typeof body.token === 'string' ? body.token : '';
    const action = body.action as ClientAction | undefined;
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
      throw new GameError('無效的操作');
    }
    const { row } = await mutate(code, (s, now) => {
      const me = findByToken(s, token);
      if (!me) throw new GameError('你不在這個房間裡，請重新加入');
      dispatch(s, me.id, action, now);
    });
    return json({ ok: true, view: viewFor(row.state, token, row.version, Date.now()) });
  });
}
