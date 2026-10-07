'use client';

import type { ClientView } from '@/game/types';
import { Button, PlayerTag, cls } from '../ui';
import { CAUSE_TEXT, RoleChip } from './common';

const CAMP = {
  good: { name: '好人陣營', icon: '🛡️', color: '#6fb6ff' },
  wolf: { name: '狼人陣營', icon: '🐺', color: '#ff6b5e' },
  lovers: { name: '情侶陣營', icon: '💘', color: '#ff7ac0' },
  piper: { name: '吹笛者', icon: '🎶', color: '#c79bff' },
} as const;

/** 遊戲結束：公布勝利陣營與所有人的身分 */
export function GameOver({ view, onRestart, onClose }: { view: ClientView; onRestart: () => void; onClose: () => void }) {
  const w = view.winner;
  if (!w) return null;
  const camp = CAMP[w.camp];
  const isHost = view.meId === view.hostId;
  const won = !!view.meId && w.ids.includes(view.meId);
  const players = [...view.players].sort((a, b) => a.seat - b.seat);

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="panel animate-pop flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden">
        <div
          className="px-6 py-6 text-center"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${camp.color}55, transparent 70%)` }}
        >
          <div className="text-6xl">{camp.icon}</div>
          <div className="mt-2 font-display text-4xl font-black title-glow" style={{ color: camp.color }}>
            {camp.name}獲勝
          </div>
          <div className="mt-1 text-sm text-white/70">{w.reason}</div>
          {view.meId && (
            <div className={cls('mx-auto mt-3 w-fit rounded-full px-4 py-1 text-sm font-black', won ? 'bg-gold text-ink-950' : 'bg-white/10 text-white/70')}>
              {won ? '🏆 你贏了！' : '你輸了，下次再接再厲'}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <ul className="space-y-1">
            {players.map((p) => (
              <li
                key={p.id}
                className={cls('flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm', w.ids.includes(p.id) ? 'bg-gold/15 ring-1 ring-gold/40' : 'bg-white/5')}
              >
                <span className="min-w-0 flex-1">
                  <PlayerTag p={p} />
                </span>
                {w.ids.includes(p.id) && <span title="勝利">🏆</span>}
                {p.lover && <span title="情侶">💘</span>}
                {p.role && <RoleChip role={p.role} />}
                <span className={cls('w-28 shrink-0 text-right text-xs', p.alive ? 'font-bold text-emerald-300' : 'text-white/50')}>
                  {p.alive ? '存活' : (CAUSE_TEXT[p.cause ?? ''] ?? '出局')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-3">
          <Button onClick={onClose}>查看紀錄</Button>
          {isHost ? (
            <Button tone="primary" onClick={onRestart}>
              🔁 回到大廳再來一局
            </Button>
          ) : (
            <span className="px-2 text-xs text-white/50">等待房主開啟下一局…</span>
          )}
        </div>
      </div>
    </div>
  );
}
