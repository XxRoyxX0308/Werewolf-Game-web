'use client';

import { L, type LText, type Lang, tr } from '@/game/i18n';
import { ROLES } from '@/game/roles';
import type { ClientView, PlayerView, RoleId } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import type { Chip } from '../scene/Figure';
import { cls } from '../ui';

export function campTone(role: RoleId) {
  const r = ROLES[role];
  if (r.camp === 'wolf') return { label: L('狼人陣營', 'Werewolves'), text: 'text-blood-soft', bg: 'bg-blood/20', ring: 'ring-blood/60', glow: '#c8372d' };
  if (r.camp === 'third') return { label: L('第三方', 'Third Party'), text: 'text-third', bg: 'bg-third/15', ring: 'ring-third/50', glow: '#a070ff' };
  if (r.kind === 'god') return { label: L('好人・神職', 'Good · Special Role'), text: 'text-good', bg: 'bg-good/15', ring: 'ring-good/50', glow: '#4a9fff' };
  return { label: L('好人・平民', 'Good · Villager'), text: 'text-emerald-300', bg: 'bg-emerald-400/15', ring: 'ring-emerald-400/50', glow: '#34d399' };
}

export function RoleChip({ role, className }: { role: RoleId; className?: string }) {
  const { lang } = useLang();
  const t = campTone(role);
  return (
    <span className={cls('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ring-1', t.bg, t.text, t.ring, className)}>
      <span>{ROLES[role].icon}</span>
      {ROLES[role].name[lang]}
    </span>
  );
}

/** 私人標記的快速選項（只存在自己的瀏覽器） */
export const MARKS: Record<Lang, string[]> = {
  zh: ['好人', '狼人', '可疑', '金水', '查殺', '預言家', '女巫', '獵人', '守衛', '白痴', '平民', '神職'],
  en: ['Good', 'Wolf', 'Sus', 'Cleared', 'Caught', 'Seer', 'Witch', 'Hunter', 'Guard', 'Idiot', 'Villager', 'Special'],
};

export const CAUSE_TEXT: Record<string, LText> = {
  wolf: L('被狼人襲擊', 'Killed by werewolves'),
  poison: L('被女巫毒殺', 'Poisoned by the Witch'),
  exile: L('被投票放逐', 'Voted out'),
  shot: L('被開槍帶走', 'Shot'),
  boom: L('自爆', 'Self-destructed'),
  taken: L('被白狼王帶走', 'Taken by the White Wolf King'),
  duel: L('被騎士決鬥', 'Dueled by the Knight'),
  duelFail: L('決鬥失敗', 'Lost the duel'),
  lover: L('殉情', 'Died of heartbreak'),
  charm: L('被魅惑殉情', 'Charmed to death'),
  dream: L('死於夢中', 'Died in a dream'),
  hunt: L('被獵魔人狩獵', 'Hunted by the Witcher'),
  backfire: L('狩獵失敗', 'Failed hunt'),
  reflect: L('遭惡靈騎士反傷', 'Evil Knight backfire'),
};

/** 名牌與名單上顯示的狀態標籤——3D 場景與側邊名單共用，確保兩邊資訊一致 */
export function chipsFor(p: PlayerView, view: ClientView, marks: Record<string, string>, lang: Lang): Chip[] {
  const t = (zh: string, en: string) => tr(lang, zh, en);
  const out: Chip[] = [];
  const st = view.stage;
  if (p.isMe) out.push({ text: t('你', 'You'), tone: 'dim' });
  if (view.phase === 'lobby') {
    if (p.isHost) out.push({ text: t('👑 房主', '👑 Host'), tone: 'gold' });
    if (p.isBot) out.push({ text: t('🤖 電腦', '🤖 Bot'), tone: 'dim' });
    return out;
  }
  const shown = p.isMe ? p.revealed : (p.role ?? p.revealed);
  if (shown) {
    const r = ROLES[shown];
    out.push({ text: `${r.icon} ${r.name[lang]}`, tone: r.camp === 'wolf' ? 'wolf' : 'good' });
  }
  if (p.lover) out.push({ text: t('💘 情侶', '💘 Lover'), tone: 'pink' });
  if (p.enchanted) out.push({ text: t('🎶 被魅惑', '🎶 Enchanted'), tone: 'mark' });

  if ((st.t === 'speech' || st.t === 'lastWords') && st.speaker === p.id) {
    out.push({ text: st.t === 'lastWords' ? t('遺言中', 'Last words') : t('發言中', 'Speaking'), tone: 'gold' });
  }
  const electing = (st.t === 'speech' && (st.kind === 'sheriff' || st.kind === 'sheriffPk')) || (st.t === 'vote' && st.kind === 'sheriff');
  if (electing && view.election) {
    if (view.election.candidates.includes(p.id)) out.push({ text: t('🙋 上警', '🙋 Running'), tone: 'gold' });
    else if (view.election.withdrawn.includes(p.id)) out.push({ text: t('退水', 'Withdrew'), tone: 'dim' });
  }
  if (st.t === 'signup' && st.signed?.includes(p.id)) out.push({ text: t('已決定', 'Decided'), tone: 'dim' });
  if (st.t === 'vote') {
    if (st.kind === 'exile' && st.candidates && st.candidates.length < view.players.filter((x) => x.alive).length && st.candidates.includes(p.id)) {
      out.push({ text: t('PK', 'Runoff'), tone: 'wolf' });
    }
    if (st.voted?.includes(p.id)) out.push({ text: t('✓ 已投票', '✓ Voted'), tone: 'dim' });
  }
  if (st.t === 'voteResult' && st.tally?.[p.id]) {
    const n = st.tally[p.id];
    out.push({ text: t(`${n} 票`, `${n} ${n === 1 ? 'vote' : 'votes'}`), tone: 'gold' });
  }
  if (st.t === 'announce' && st.deaths?.includes(p.id)) out.push({ text: t('昨夜出局', 'Died last night'), tone: 'wolf' });
  if ((st.t === 'trigger' || st.t === 'order') && st.actor === p.id) out.push({ text: t('行動中', 'Acting'), tone: 'gold' });
  if (view.silenced === p.id && p.alive) out.push({ text: t('🤐 禁言', '🤐 Silenced'), tone: 'dim' });
  if (p.alive && !p.canVote) out.push({ text: t('無投票權', 'No vote'), tone: 'dim' });

  const picks = view.prompt?.picks;
  if (picks) {
    const n = Object.values(picks).filter((target) => target === p.id).length;
    if (n) out.push({ text: t(`🐾 襲擊 ×${n}`, `🐾 Attack ×${n}`), tone: 'wolf' });
  }
  const mark = marks[p.id];
  if (mark) out.push({ text: `📝 ${mark}`, tone: 'mark' });
  return out;
}
