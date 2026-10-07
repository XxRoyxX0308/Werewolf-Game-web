import { GameError } from '@/game/engine';
import { LANG_HEADER, type Lang, toLang, tr } from '@/game/i18n';
import { BusyError, NotFoundError } from './rooms';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * 將遊戲規則錯誤轉成 400、找不到房間轉成 404，其餘視為伺服器錯誤。
 * 錯誤訊息與畫面文字都使用發出請求的玩家所選的語言。
 */
export async function handle(req: Request, fn: (lang: Lang) => Promise<Response>): Promise<Response> {
  const lang = toLang(req.headers.get(LANG_HEADER));
  try {
    return await fn(lang);
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, 400);
    if (e instanceof NotFoundError) return json({ error: tr(lang, '找不到這個房間', 'Room not found') }, 404);
    console.error('[werewolf]', e);
    const message =
      e instanceof BusyError
        ? tr(lang, '房間忙碌中，請再試一次', 'The room is busy — please try again')
        : e instanceof Error && /DATABASE_URL/.test(e.message)
          ? e.message
          : tr(lang, '伺服器發生錯誤，請稍後再試', 'Something went wrong on the server — please try again later');
    return json({ error: message }, 500);
  }
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const normCode = (raw: string) => raw.trim().toUpperCase().slice(0, 8);
