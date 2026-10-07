import { addPlayer } from '@/game/engine';
import { withLang } from '@/game/i18n';
import { findByToken } from '@/game/view';
import { handle, json, normCode, readBody } from '@/lib/http';
import { mutate } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/** 加入房間。若帶著有效的金鑰（重新整理或斷線重連）則直接回到原本的座位 */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(req, async (lang) => {
    const code = normCode((await ctx.params).code);
    const body = await readBody(req);
    const { result } = await mutate(code, (s) =>
      withLang(lang, () => {
        const existing = findByToken(s, body.token as string);
        const me =
          existing ??
          addPlayer(s, { name: body.name as string, avatar: body.avatar as string, color: body.color as string });
        return { token: me.token, id: me.id };
      }),
    );
    return json({ code, ...result });
  });
}
