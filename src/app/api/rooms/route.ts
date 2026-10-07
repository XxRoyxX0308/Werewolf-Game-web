import { addPlayer, createState, roomCode } from '@/game/engine';
import { withLang } from '@/game/i18n';
import { handle, json, readBody } from '@/lib/http';
import { createRoom } from '@/lib/rooms';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** 建立房間，建立者成為房主 */
export async function POST(req: Request) {
  return handle(req, async (lang) => {
    const body = await readBody(req);
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = roomCode();
      const state = createState(code, Date.now());
      const me = withLang(lang, () =>
        addPlayer(state, {
          name: body.name as string,
          avatar: body.avatar as string,
          color: body.color as string,
        }),
      );
      if (await createRoom(code, state)) {
        if (Math.random() < 0.1) void getStore().cleanup().catch(() => {});
        return json({ code, token: me.token, id: me.id });
      }
    }
    throw new Error('無法建立房間');
  });
}
