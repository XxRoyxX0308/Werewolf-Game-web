import { AVATARS, COLORS } from '@/game/cosmetics';
import type { Profile } from '@/game/types';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 無痕模式等情況下可能無法寫入，忽略即可
  }
}

export function loadProfile(): Profile {
  const p = read<Partial<Profile>>('ww:profile', {});
  return {
    name: typeof p.name === 'string' ? p.name : '',
    avatar: p.avatar && AVATARS.includes(p.avatar) ? p.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)],
    color: p.color && COLORS.includes(p.color) ? p.color : COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}
export const saveProfile = (p: Profile) => write('ww:profile', p);

/** 每個房間各自保存一把金鑰，重新整理或斷線後可以回到原本的座位 */
export const getToken = (code: string) => read<string | null>(`ww:token:${code}`, null);
export const setToken = (code: string, token: string) => write(`ww:token:${code}`, token);
export const clearToken = (code: string) => {
  try {
    localStorage.removeItem(`ww:token:${code}`);
  } catch {
    // 忽略
  }
};

export const loadMarks = (code: string, gameNo: number) => read<Record<string, string>>(`ww:marks:${code}:${gameNo}`, {});
export const saveMarks = (code: string, gameNo: number, marks: Record<string, string>) =>
  write(`ww:marks:${code}:${gameNo}`, marks);

export const loadPref = <T,>(key: string, fallback: T) => read<T>(`ww:pref:${key}`, fallback);
export const savePref = (key: string, value: unknown) => write(`ww:pref:${key}`, value);
