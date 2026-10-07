'use client';

import type { ClientAction, ClientView } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import type { Chip } from '../scene/Figure';
import { Button, SeatDot, cls } from '../ui';

const CHIP_TONE: Record<NonNullable<Chip['tone']>, string> = {
  wolf: 'bg-blood/80 text-white',
  good: 'bg-good/25 text-good',
  gold: 'bg-gold/90 text-ink-950',
  mark: 'bg-violet-500/80 text-white',
  pink: 'bg-pink-500/80 text-white',
  dim: 'bg-white/10 text-white/70',
};

interface Props {
  view: ClientView;
  chips: Record<string, Chip[]>;
  selectable: string[];
  selected: string[];
  hovered: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  send: (a: ClientAction) => void;
}

/** 玩家名單：號碼、顏色、頭像與 3D 場景完全對應，滑過會互相高亮 */
export function Roster({ view, chips, selectable, selected, hovered, onPick, onHover, send }: Props) {
  const { t } = useLang();
  const lobby = view.phase === 'lobby';
  const isHost = view.meId === view.hostId;
  const players = [...view.players].sort((a, b) => a.seat - b.seat);
  const aliveCount = players.filter((p) => p.alive).length;

  return (
    <div className="panel flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-sm font-black text-white">{t('玩家名單', 'Players')}</span>
        <span className="text-xs font-bold text-white/50">
          {lobby
            ? t(`${players.length} 人`, `${players.length} ${players.length === 1 ? 'player' : 'players'}`)
            : t(`存活 ${aliveCount} / ${players.length}`, `Alive ${aliveCount} / ${players.length}`)}
        </span>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {players.map((p) => {
          const can = selectable.includes(p.id);
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onPick(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && onPick(p.id)}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
                className={cls(
                  'flex cursor-pointer items-start gap-2 rounded-xl border px-2 py-1.5 transition',
                  on
                    ? 'border-gold bg-gold/20'
                    : can
                      ? 'border-white/30 bg-white/10 hover:bg-white/20'
                      : hovered === p.id
                        ? 'border-white/25 bg-white/10'
                        : 'border-transparent hover:bg-white/5',
                  !p.alive && 'opacity-55',
                )}
                style={{ boxShadow: `inset 3px 0 0 ${p.color}` }}
              >
                <SeatDot p={p} size={28} />
                <span className="pt-0.5 text-xl leading-none">{p.alive ? p.avatar : '💀'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={cls('truncate text-sm font-bold text-white', !p.alive && 'line-through')}>{p.name}</span>
                    {p.sheriff && <span title={t('警長', 'Sheriff')}>⭐</span>}
                  </div>
                  {(chips[p.id]?.length ?? 0) > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {chips[p.id].map((c, i) => (
                        <span key={i} className={cls('rounded-full px-1.5 text-[10px] font-bold leading-4', CHIP_TONE[c.tone ?? 'dim'])}>
                          {c.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {lobby && isHost && !p.isMe && (
                  <button
                    type="button"
                    title={t('移出房間', 'Remove from the room')}
                    onClick={(e) => {
                      e.stopPropagation();
                      send({ type: 'kick', id: p.id });
                    }}
                    className="rounded-md px-1.5 text-xs text-white/40 hover:bg-blood/60 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {lobby && isHost && (
        <div className="flex gap-2 border-t border-white/10 p-2">
          <Button size="sm" className="flex-1" onClick={() => send({ type: 'addBot' })} disabled={players.length >= 18}>
            {t('🤖 加入電腦', '🤖 Add bot')}
          </Button>
          <Button size="sm" className="flex-1" onClick={() => send({ type: 'shuffle' })}>
            {t('🔀 隨機座位', '🔀 Shuffle seats')}
          </Button>
        </div>
      )}
      {!lobby && view.meId && (
        <div className="border-t border-white/10 px-3 py-1.5 text-[11px] text-white/45">
          {t('點擊玩家可以加上只有你看得到的標記', 'Click a player to add a mark only you can see')}
        </div>
      )}
    </div>
  );
}
