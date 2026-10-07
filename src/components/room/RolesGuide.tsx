'use client';

import { useState } from 'react';
import { ROLES, ROLE_GROUPS } from '@/game/roles';
import type { RoleId } from '@/game/types';
import { Modal, cls } from '../ui';
import { campTone } from './common';

const FLOW = [
  ['🌙 黑夜', '所有人閉眼，法官依序喚醒各個角色行動：狼人襲擊、女巫用藥、預言家查驗……'],
  ['⭐ 警長競選', '第一天天亮後舉行。警長在放逐投票時擁有 1.5 票，並決定發言順序；出局時可以移交警徽。'],
  ['☀️ 天亮', '公布昨夜出局的玩家。出局者依規則留下遺言，獵人等角色可以發動技能。'],
  ['💬 發言', '存活的玩家依序發言。狼人可以隨時自爆，直接進入黑夜。'],
  ['🗳️ 放逐投票', '得票最高者被放逐。平票時進入 PK 發言再投一次，再平票則無人出局。'],
  ['🏆 勝負', '好人：放逐所有狼人。狼人：殺光所有神職或所有平民（屠邊），或殺光所有好人（屠城）。'],
];

/** 角色圖鑑與規則說明 */
export function RolesGuide({ open, onClose, deck }: { open: boolean; onClose: () => void; deck?: RoleId[] }) {
  const [onlyDeck, setOnlyDeck] = useState(false);
  const inDeck = new Set(deck ?? []);
  return (
    <Modal open={open} onClose={onClose} title="📖 角色圖鑑與規則" wide>
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {FLOW.map(([title, text]) => (
          <div key={title} className="rounded-xl bg-white/5 p-3">
            <div className="mb-1 text-sm font-black text-gold-soft">{title}</div>
            <div className="text-xs leading-relaxed text-white/70">{text}</div>
          </div>
        ))}
      </div>

      {deck && deck.length > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={onlyDeck} onChange={(e) => setOnlyDeck(e.target.checked)} className="h-4 w-4 accent-gold" />
          只顯示本局使用的角色
        </label>
      )}

      {ROLE_GROUPS.map((g) => {
        const ids = g.ids.filter((id) => !onlyDeck || inDeck.has(id));
        if (!ids.length) return null;
        return (
          <section key={g.title} className="mb-5">
            <h3 className="mb-2 font-display text-base font-black text-white">{g.title}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {ids.map((id) => {
                const r = ROLES[id];
                const t = campTone(id);
                return (
                  <div key={id} className={cls('flex gap-3 rounded-xl p-3 ring-1', t.bg, t.ring)}>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/30 text-3xl">{r.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cls('font-display text-base font-black', t.text)}>{r.name}</span>
                        {inDeck.has(id) && <span className="rounded-full bg-gold/90 px-1.5 text-[10px] font-black text-ink-950">本局</span>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/75">{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </Modal>
  );
}
