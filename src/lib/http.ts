import { GameError } from '@/game/engine';
import { NotFoundError } from './rooms';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** 將遊戲規則錯誤轉成 400、找不到房間轉成 404，其餘視為伺服器錯誤 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, 400);
    if (e instanceof NotFoundError) return json({ error: e.message }, 404);
    console.error('[werewolf]', e);
    const message = e instanceof Error && /DATABASE_URL|忙碌/.test(e.message) ? e.message : '伺服器發生錯誤，請稍後再試';
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
