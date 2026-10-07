'use client';

import { AVATARS, COLORS } from '@/game/cosmetics';
import type { Profile } from '@/game/types';
import { textOn } from '@/lib/client/color';
import { cls } from './ui';

interface Props {
  value: Profile;
  onChange: (p: Profile) => void;
  /** 已被其他玩家使用的顏色 */
  takenColors?: string[];
  takenAvatars?: string[];
}

/** 設定暱稱、頭像與代表色——其他玩家就是靠這三樣加上座位號碼來認人 */
export function ProfileForm({ value, onChange, takenColors = [], takenAvatars = [] }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl shadow-lg"
          style={{ background: value.color, boxShadow: `0 0 0 3px ${value.color}55, 0 8px 24px ${value.color}55` }}
        >
          {value.avatar}
        </div>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-white/60">暱稱</span>
          <input
            value={value.name}
            maxLength={12}
            placeholder="輸入你的暱稱"
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-base font-bold text-white outline-none placeholder:font-normal placeholder:text-white/30 focus:border-gold"
          />
        </label>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-bold text-white/60">頭像</div>
        <div className="grid max-h-[132px] grid-cols-9 gap-1 overflow-y-auto rounded-xl bg-black/25 p-1.5">
          {AVATARS.map((a) => {
            const taken = takenAvatars.includes(a) && a !== value.avatar;
            return (
              <button
                key={a}
                type="button"
                title={taken ? '已有人使用' : undefined}
                onClick={() => onChange({ ...value, avatar: a })}
                className={cls(
                  'grid aspect-square place-items-center rounded-lg text-xl transition hover:bg-white/15',
                  a === value.avatar && 'bg-white/20 ring-2 ring-gold',
                  taken && 'opacity-30',
                )}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-bold text-white/60">代表色（房間內不重複）</div>
        <div className="grid grid-cols-10 gap-1.5">
          {COLORS.map((c) => {
            const taken = takenColors.includes(c) && c !== value.color;
            return (
              <button
                key={c}
                type="button"
                disabled={taken}
                title={taken ? '已有人使用' : undefined}
                onClick={() => onChange({ ...value, color: c })}
                className={cls(
                  'grid aspect-square place-items-center rounded-full text-xs font-black transition',
                  c === value.color ? 'scale-110 ring-2 ring-white' : 'hover:scale-110',
                  taken && 'opacity-20',
                )}
                style={{ background: c, color: textOn(c) }}
              >
                {c === value.color ? '✓' : taken ? '✕' : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
