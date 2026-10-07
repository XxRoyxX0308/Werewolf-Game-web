'use client';

import { useEffect, useState } from 'react';
import { ROLES } from '@/game/roles';
import type { RoleId } from '@/game/types';
import { Button, cls } from '../ui';
import { campTone } from './common';

function CardFace({ role, big }: { role: RoleId; big?: boolean }) {
  const r = ROLES[role];
  const t = campTone(role);
  return (
    <div
      className={cls('flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 bg-ink-900 p-4 text-center', big ? 'gap-3' : 'gap-1')}
      style={{ borderColor: t.glow, boxShadow: `0 0 40px ${t.glow}66, inset 0 0 60px ${t.glow}22` }}
    >
      <div className={cls('rounded-full px-3 py-0.5 text-xs font-black', t.bg, t.text)}>{t.label}</div>
      <div className={big ? 'text-8xl' : 'text-5xl'}>{r.icon}</div>
      <div className={cls('font-display font-black', t.text, big ? 'text-4xl' : 'text-2xl')}>{r.name}</div>
      <p className={cls('leading-relaxed text-white/75', big ? 'text-sm' : 'text-xs')}>{r.short}</p>
    </div>
  );
}

function CardBack({ hint }: { hint?: string }) {
  return (
    <div className="card-back-pattern grid h-full w-full place-items-center rounded-2xl border-2 border-gold/60 text-center">
      <div>
        <div className="text-5xl">🐺</div>
        {hint && <div className="mt-2 text-xs font-bold text-gold-soft/80">{hint}</div>}
      </div>
    </div>
  );
}

/** 常駐在角落的身分牌：點一下可以蓋牌，避免旁人偷看 */
export function RoleCard({ role, notes, compact }: { role: RoleId; notes: string[]; compact?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const r = ROLES[role];
  const t = campTone(role);
  if (compact) {
    // 手機版：只佔一列，把畫面留給場景
    return (
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="panel flex w-full items-center gap-2.5 px-3 py-2 text-left"
        title={hidden ? '點擊查看身分' : '點擊蓋牌'}
      >
        <span
          className={cls('grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 text-2xl', hidden && 'card-back-pattern')}
          style={{ borderColor: hidden ? '#e9b94999' : t.glow }}
        >
          {hidden ? '🐺' : r.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cls('font-display text-base font-black', hidden ? 'text-white/40' : t.text)}>{hidden ? '身分已蓋牌' : r.name}</span>
          {!hidden && (
            <span className="block truncate text-[11px] font-bold text-white/60">{notes.length ? notes.join('　') : r.short}</span>
          )}
        </span>
        <span className="shrink-0 text-[10px] text-white/40">{hidden ? '點擊查看' : '點擊蓋牌'}</span>
      </button>
    );
  }
  return (
    <div className="panel p-3">
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="flex w-full items-center gap-3 text-left"
        title={hidden ? '點擊查看身分' : '點擊蓋牌'}
      >
        <div
          className={cls('grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 text-3xl', hidden && 'card-back-pattern')}
          style={{ borderColor: hidden ? '#e9b94999' : t.glow, boxShadow: hidden ? undefined : `0 0 18px ${t.glow}77` }}
        >
          {hidden ? '🐺' : r.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-white/50">我的身分{hidden ? '（已蓋牌）' : ''}</div>
          <div className={cls('font-display text-xl font-black', hidden ? 'text-white/40' : t.text)}>{hidden ? '？？？' : r.name}</div>
          {!hidden && <div className={cls('text-[11px] font-bold', t.text)}>{t.label}</div>}
        </div>
      </button>
      {!hidden && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-white/70">{r.short}</p>
          {notes.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-white/10 pt-2">
              {notes.map((n, i) => (
                <li key={i} className="text-xs font-bold text-gold-soft/90">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** 發牌時的翻牌動畫 */
export function DealOverlay({ role, onClose }: { role: RoleId; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFlipped(true), 500);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="animate-pop flex flex-col items-center gap-5">
        <div className="font-display text-2xl font-black text-gold-soft title-glow">你的身分是…</div>
        <div className={cls('flip h-[380px] w-[270px]', flipped && 'is-flipped')}>
          <div className="flip-inner h-full w-full">
            <div className="flip-face">
              <CardBack />
            </div>
            <div className="flip-face flip-back">
              <CardFace role={role} big />
            </div>
          </div>
        </div>
        <p className="max-w-xs text-center text-xs leading-relaxed text-white/60">{flipped ? ROLES[role].desc : '　'}</p>
        <Button tone="primary" size="lg" onClick={onClose}>
          記住了，開始遊戲
        </Button>
      </div>
    </div>
  );
}
