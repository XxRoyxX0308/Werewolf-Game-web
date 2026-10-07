'use client';

import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import type { PlayerView } from '@/game/types';
import { textOn } from '@/lib/client/color';
import { useLang } from '@/lib/client/lang';

export const cls = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

type Tone = 'primary' | 'danger' | 'ghost' | 'subtle';

const TONES: Record<Tone, string> = {
  primary:
    'bg-gradient-to-b from-gold-soft to-gold text-ink-950 shadow-[0_4px_18px_rgb(233_185_73/0.35)] hover:brightness-110',
  danger: 'bg-gradient-to-b from-[#e2574c] to-blood text-white shadow-[0_4px_18px_rgb(200_55_45/0.4)] hover:brightness-110',
  // 深色玻璃底：不論疊在面板上還是明亮的白天場景上都看得清楚
  ghost: 'bg-ink-800/75 text-moon border border-white/15 backdrop-blur-sm hover:bg-ink-700/90 hover:text-white',
  subtle: 'text-moon/80 hover:text-white hover:bg-white/10',
};

export function Button({
  tone = 'ghost',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...props}
      className={cls(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 disabled:hover:brightness-100',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
        TONES[tone],
        className,
      )}
    />
  );
}

/** 座位號碼圓章：以玩家專屬顏色為底 */
export function SeatDot({ p, size = 26 }: { p: Pick<PlayerView, 'seat' | 'color'>; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-black tabular-nums"
      style={{ width: size, height: size, background: p.color, color: textOn(p.color), fontSize: size * 0.56 }}
    >
      {p.seat}
    </span>
  );
}

export function PlayerTag({ p, dim }: { p: PlayerView; dim?: boolean }) {
  return (
    <span className={cls('inline-flex min-w-0 items-center gap-1.5', dim && 'opacity-50')}>
      <SeatDot p={p} size={22} />
      <span className="text-base leading-none">{p.alive ? p.avatar : '💀'}</span>
      <span className={cls('truncate font-bold', !p.alive && 'line-through')}>{p.name}</span>
    </span>
  );
}

/** 把文字中的「3號」（英文為「#3」）換成該玩家顏色的標籤，讓紀錄一眼就能對上人 */
export function SeatText({ text, players }: { text: string; players: PlayerView[] }) {
  const parts = text.split(/(\d+號|#\d+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^(?:(\d+)號|#(\d+))$/.exec(part);
        const p = m ? players.find((x) => x.seat === Number(m[1] ?? m[2])) : null;
        if (!p) return <span key={i}>{part}</span>;
        return (
          <span
            key={i}
            title={p.name}
            className="mx-0.5 inline-flex items-center gap-0.5 rounded-md px-1 font-bold"
            style={{ background: `${p.color}33`, color: p.color, boxShadow: `inset 0 0 0 1px ${p.color}66` } as CSSProperties}
          >
            {part}
            <span className="text-[0.85em]">{p.avatar}</span>
          </span>
        );
      })}
    </>
  );
}

/** 距離期限還剩幾秒（以伺服器時間為準） */
export function useCountdown(deadline: number | null, serverNow: () => number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (deadline === null) {
      setLeft(null);
      return;
    }
    const update = () => setLeft(Math.max(0, Math.ceil((deadline - serverNow()) / 1000)));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [deadline, serverNow]);
  return left;
}

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setOn(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, [query]);
  return on;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useLang();
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cls('panel animate-pop flex max-h-[92dvh] w-full flex-col overflow-hidden', wide ? 'max-w-4xl' : 'max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
            <h2 className="font-display text-lg font-black text-gold-soft">{title}</h2>
            {onClose && (
              <button onClick={onClose} className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label={t('關閉', 'Close')}>
                ✕
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cls(
        'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50',
        checked ? 'bg-gold' : 'bg-white/20',
      )}
    >
      <span className={cls('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}
