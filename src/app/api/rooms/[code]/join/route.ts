import { addPlayer } from '@/game/engine';
import { findByToken } from '@/game/view';
import { handle, json, normCode, readBody } from '@/lib/http';
import { mutate } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/** 加入房間。若帶著有效的金鑰（重新整理或斷線重連）則直接回到原本的座位 */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = normCode((await ctx.params).code);
    const body = await readBody(req);
    const { result } = await mutate(code, (s) => {
      const existing = findByToken(s, body.token as string);
      const me =
        existing ??
        addPlayer(s, { name: body.name as string, avatar: body.avatar as string, color: body.color as string });
      return { token: me.token, id: me.id };
    });
    return json({ code, ...result });
  });
}
