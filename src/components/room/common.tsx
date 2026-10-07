'use client';

import { ROLES } from '@/game/roles';
import type { ClientView, PlayerView, RoleId } from '@/game/types';
import type { Chip } from '../scene/Figure';
import { cls } from '../ui';

export function campTone(role: RoleId) {
  const r = ROLES[role];
  if (r.camp === 'wolf') return { label: '狼人陣營', text: 'text-blood-soft', bg: 'bg-blood/20', ring: 'ring-blood/60', glow: '#c8372d' };
  if (r.camp === 'third') return { label: '第三方', text: 'text-third', bg: 'bg-third/15', ring: 'ring-third/50', glow: '#a070ff' };
  if (r.kind === 'god') return { label: '好人・神職', text: 'text-good', bg: 'bg-good/15', ring: 'ring-good/50', glow: '#4a9fff' };
  return { label: '好人・平民', text: 'text-emerald-300', bg: 'bg-emerald-400/15', ring: 'ring-emerald-400/50', glow: '#34d399' };
}

export function RoleChip({ role, className }: { role: RoleId; className?: string }) {
  const t = campTone(role);
  return (
    <span className={cls('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ring-1', t.bg, t.text, t.ring, className)}>
      <span>{ROLES[role].icon}</span>
      {ROLES[role].name}
    </span>
  );
}

/** 私人標記的快速選項（只存在自己的瀏覽器） */
export const MARKS = ['好人', '狼人', '可疑', '金水', '查殺', '預言家', '女巫', '獵人', '守衛', '白痴', '平民', '神職'];

export const CAUSE_TEXT: Record<string, string> = {
  wolf: '被狼人襲擊',
  poison: '被女巫毒殺',
  exile: '被投票放逐',
  shot: '被開槍帶走',
  boom: '自爆',
  taken: '被白狼王帶走',
  duel: '被騎士決鬥',
  duelFail: '決鬥失敗',
  lover: '殉情',
  charm: '被魅惑殉情',
  dream: '死於夢中',
  hunt: '被獵魔人狩獵',
  backfire: '狩獵失敗',
  reflect: '遭惡靈騎士反傷',
};

/** 名牌與名單上顯示的狀態標籤——3D 場景與側邊名單共用，確保兩邊資訊一致 */
export function chipsFor(p: PlayerView, view: ClientView, marks: Record<string, string>): Chip[] {
  const out: Chip[] = [];
  const st = view.stage;
  if (p.isMe) out.push({ text: '你', tone: 'dim' });
  if (view.phase === 'lobby') {
    if (p.isHost) out.push({ text: '👑 房主', tone: 'gold' });
    if (p.isBot) out.push({ text: '🤖 電腦', tone: 'dim' });
    return out;
  }
  const shown = p.isMe ? p.revealed : (p.role ?? p.revealed);
  if (shown) {
    const r = ROLES[shown];
    out.push({ text: `${r.icon} ${r.name}`, tone: r.camp === 'wolf' ? 'wolf' : 'good' });
  }
  if (p.lover) out.push({ text: '💘 情侶', tone: 'pink' });
  if (p.enchanted) out.push({ text: '🎶 被魅惑', tone: 'mark' });

  if ((st.t === 'speech' || st.t === 'lastWords') && st.speaker === p.id) {
    out.push({ text: st.t === 'lastWords' ? '遺言中' : '發言中', tone: 'gold' });
  }
  const electing = (st.t === 'speech' && (st.kind === 'sheriff' || st.kind === 'sheriffPk')) || (st.t === 'vote' && st.kind === 'sheriff');
  if (electing && view.election) {
    if (view.election.candidates.includes(p.id)) out.push({ text: '🙋 上警', tone: 'gold' });
    else if (view.election.withdrawn.includes(p.id)) out.push({ text: '退水', tone: 'dim' });
  }
  if (st.t === 'signup' && st.signed?.includes(p.id)) out.push({ text: '已決定', tone: 'dim' });
  if (st.t === 'vote') {
    if (st.kind === 'exile' && st.candidates && st.candidates.length < view.players.filter((x) => x.alive).length && st.candidates.includes(p.id)) {
      out.push({ text: 'PK', tone: 'wolf' });
    }
    if (st.voted?.includes(p.id)) out.push({ text: '✓ 已投票', tone: 'dim' });
  }
  if (st.t === 'voteResult' && st.tally?.[p.id]) out.push({ text: `${st.tally[p.id]} 票`, tone: 'gold' });
  if (st.t === 'announce' && st.deaths?.includes(p.id)) out.push({ text: '昨夜出局', tone: 'wolf' });
  if ((st.t === 'trigger' || st.t === 'order') && st.actor === p.id) out.push({ text: '行動中', tone: 'gold' });
  if (view.silenced === p.id && p.alive) out.push({ text: '🤐 禁言', tone: 'dim' });
  if (p.alive && !p.canVote) out.push({ text: '無投票權', tone: 'dim' });

  const picks = view.prompt?.picks;
  if (picks) {
    const n = Object.values(picks).filter((t) => t === p.id).length;
    if (n) out.push({ text: `🐾 襲擊 ×${n}`, tone: 'wolf' });
  }
  const mark = marks[p.id];
  if (mark) out.push({ text: `📝 ${mark}`, tone: 'mark' });
  return out;
}
