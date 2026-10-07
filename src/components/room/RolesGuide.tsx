'use client';

import { useState } from 'react';
import { L, type LText } from '@/game/i18n';
import { ROLES, ROLE_GROUPS } from '@/game/roles';
import type { RoleId } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import { Modal, cls } from '../ui';
import { campTone } from './common';

const FLOW: [LText, LText][] = [
  [
    L('🌙 黑夜', '🌙 Night'),
    L(
      '所有人閉眼，法官依序喚醒各個角色行動：狼人襲擊、女巫用藥、預言家查驗……',
      'Everyone closes their eyes while the moderator wakes each role in turn: the werewolves attack, the Witch uses her potions, the Seer checks a player…',
    ),
  ],
  [
    L('⭐ 警長競選', '⭐ Sheriff Election'),
    L(
      '第一天天亮後舉行。警長在放逐投票時擁有 1.5 票，並決定發言順序；出局時可以移交警徽。',
      'Held after the first dawn. The sheriff has 1.5 votes in exile votes and decides the speaking order; when eliminated, the sheriff may pass on the badge.',
    ),
  ],
  [
    L('☀️ 天亮', '☀️ Dawn'),
    L(
      '公布昨夜出局的玩家。出局者依規則留下遺言，獵人等角色可以發動技能。',
      'The players eliminated during the night are announced. They leave last words according to the rules, and roles such as the Hunter may use their ability.',
    ),
  ],
  [
    L('💬 發言', '💬 Speeches'),
    L(
      '存活的玩家依序發言。狼人可以隨時自爆，直接進入黑夜。',
      'Living players speak in turn. A werewolf may self-destruct at any time, which brings on the night immediately.',
    ),
  ],
  [
    L('🗳️ 放逐投票', '🗳️ Exile Vote'),
    L(
      '得票最高者被放逐。平票時進入 PK 發言再投一次，再平票則無人出局。',
      'The player with the most votes is exiled. On a tie, the tied players give runoff speeches and everyone votes again; a second tie means nobody is exiled.',
    ),
  ],
  [
    L('🏆 勝負', '🏆 Winning'),
    L(
      '好人：放逐所有狼人。狼人：殺光所有神職或所有平民（屠邊），或殺光所有好人（屠城）。',
      'Good side: exile every werewolf. Werewolves: eliminate all special roles or all villagers ("kill a side"), or all good players ("kill everyone").',
    ),
  ],
];

/** 角色圖鑑與規則說明 */
export function RolesGuide({ open, onClose, deck }: { open: boolean; onClose: () => void; deck?: RoleId[] }) {
  const { lang, t } = useLang();
  const [onlyDeck, setOnlyDeck] = useState(false);
  const inDeck = new Set(deck ?? []);
  return (
    <Modal open={open} onClose={onClose} title={t('📖 角色圖鑑與規則', '📖 Role Guide & Rules')} wide>
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {FLOW.map(([title, text]) => (
          <div key={title.zh} className="rounded-xl bg-white/5 p-3">
            <div className="mb-1 text-sm font-black text-gold-soft">{title[lang]}</div>
            <div className="text-xs leading-relaxed text-white/70">{text[lang]}</div>
          </div>
        ))}
      </div>

      {deck && deck.length > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={onlyDeck} onChange={(e) => setOnlyDeck(e.target.checked)} className="h-4 w-4 accent-gold" />
          {t('只顯示本局使用的角色', 'Only show the roles used in this game')}
        </label>
      )}

      {ROLE_GROUPS.map((g) => {
        const ids = g.ids.filter((id) => !onlyDeck || inDeck.has(id));
        if (!ids.length) return null;
        return (
          <section key={g.camp} className="mb-5">
            <h3 className="mb-2 font-display text-base font-black text-white">{g.title[lang]}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {ids.map((id) => {
                const r = ROLES[id];
                const tone = campTone(id);
                return (
                  <div key={id} className={cls('flex gap-3 rounded-xl p-3 ring-1', tone.bg, tone.ring)}>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/30 text-3xl">{r.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cls('font-display text-base font-black', tone.text)}>{r.name[lang]}</span>
                        {inDeck.has(id) && (
                          <span className="rounded-full bg-gold/90 px-1.5 text-[10px] font-black text-ink-950">{t('本局', 'In play')}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/75">{r.desc[lang]}</p>
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
