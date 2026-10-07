'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientAction, ClientView, Profile } from '@/game/types';
import { clearToken, getToken, setToken } from './storage';

export type RoomStatus = 'loading' | 'ready' | 'notfound';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? '連線發生問題，請再試一次');
  return data;
}

export async function createRoom(profile: Profile): Promise<string> {
  const data = await post<{ code: string; token: string }>('/api/rooms', profile);
  setToken(data.code, data.token);
  return data.code;
}

/** 與伺服器同步房間狀態：長輪詢取得畫面，並提供送出操作的方法 */
export function useRoom(code: string) {
  const [view, setView] = useState<ClientView | null>(null);
  const [status, setStatus] = useState<RoomStatus>('loading');
  const [token, setTok] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const version = useRef(0);
  const offset = useRef(0);

  const accept = useCallback((v: ClientView) => {
    if (v.version < version.current) return;
    version.current = v.version;
    offset.current = v.now - Date.now();
    setView(v);
    setStatus('ready');
  }, []);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTok(getToken(code));
    setLoaded(true);
  }, [code]);

  useEffect(() => {
    if (!loaded) return;
    let stop = false;
    const ctrl = new AbortController();
    version.current = 0;
    (async () => {
      let fails = 0;
      while (!stop) {
        try {
          const res = await fetch(`/api/rooms/${code}?v=${version.current}`, {
            signal: ctrl.signal,
            cache: 'no-store',
            headers: token ? { 'x-ww-token': token } : undefined,
          });
          if (stop) return;
          if (res.status === 404) {
            setStatus('notfound');
            return;
          }
          if (res.status === 200) accept((await res.json()) as ClientView);
          else if (res.status !== 204) throw new Error(String(res.status));
          fails = 0;
          setOnline(true);
        } catch {
          if (stop) return;
          fails++;
          if (fails >= 2) setOnline(false);
          await sleep(Math.min(5000, 400 * fails));
        }
      }
    })();
    return () => {
      stop = true;
      ctrl.abort();
    };
  }, [code, token, loaded, accept]);

  const send = useCallback(
    async (action: ClientAction) => {
      const data = await post<{ view: ClientView }>(`/api/rooms/${code}/action`, { token, action });
      accept(data.view);
    },
    [code, token, accept],
  );

  const join = useCallback(
    async (profile: Profile) => {
      const data = await post<{ token: string }>(`/api/rooms/${code}/join`, { ...profile, token });
      setToken(code, data.token);
      setTok(data.token);
    },
    [code, token],
  );

  const forget = useCallback(() => {
    clearToken(code);
    setTok(null);
  }, [code]);

  /** 以伺服器時間為準的現在時刻，用於倒數計時 */
  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return { view, status, token, online, send, join, forget, serverNow };
}
