import { nextBotTime, runBots } from './bots';
import {
  GameError,
  P,
  act,
  addBot,
  applyPreset,
  backToLobby,
  kick,
  leave,
  onTimeout,
  sendChat,
  setConfig,
  shuffleSeats,
  startGame,
  updateProfile,
} from './engine';
import type { ClientAction, GameState } from './types';

/** 推進時間：處理電腦玩家行動與逾時。回傳狀態是否有變化 */
export function tick(s: GameState, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 300; guard++) {
    if (s.phase !== 'playing') break;
    if (runBots(s, now)) {
      changed = true;
      continue;
    }
    if (s.deadline !== null && now >= s.deadline) {
      onTimeout(s, now);
      changed = true;
      continue;
    }
    break;
  }
  return changed;
}

/** 下一次需要被喚醒處理的時間點 */
export function wakeAt(s: GameState): number | null {
  if (s.phase !== 'playing') return null;
  let t = s.deadline ?? Infinity;
  const b = nextBotTime(s);
  if (b !== null) t = Math.min(t, b);
  return Number.isFinite(t) ? t : null;
}

export function dispatch(s: GameState, pid: string, a: ClientAction, now: number): void {
  P(s, pid);
  const host = () => {
    if (s.hostId !== pid) throw new GameError('只有房主可以進行這個操作');
  };
  const lobby = () => {
    if (s.phase !== 'lobby') throw new GameError('遊戲進行中無法變更設定');
  };
  switch (a.type) {
    case 'profile':
      return updateProfile(s, pid, a);
    case 'config':
      host();
      lobby();
      return setConfig(s, a.config ?? {});
    case 'preset':
      host();
      lobby();
      return applyPreset(s, String(a.id));
    case 'addBot':
      host();
      lobby();
      addBot(s);
      return;
    case 'kick':
      host();
      return kick(s, String(a.id));
    case 'shuffle':
      host();
      return shuffleSeats(s);
    case 'leave':
      return leave(s, pid);
    case 'start':
      host();
      return startGame(s, now);
    case 'restart':
      host();
      return backToLobby(s);
    case 'hostSkip':
      host();
      return onTimeout(s, now);
    case 'act':
      return act(s, pid, String(a.prompt), String(a.option), a.targets ?? [], now);
    case 'chat':
      return sendChat(s, pid, a.ch, a.text, now);
    default:
      throw new GameError('未知的操作');
  }
}
