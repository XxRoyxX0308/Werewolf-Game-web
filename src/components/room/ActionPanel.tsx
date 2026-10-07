'use client';

import { seatTag } from '@/game/i18n';
import type { ClientView, Prompt } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import { Button, PlayerTag, SeatText, cls } from '../ui';

interface Props {
  view: ClientView;
  /** 目前正在操作的提示（主要行動，或玩家點開的技能） */
  active: Prompt | null;
  isSkill: boolean;
  selected: string[];
  busy: boolean;
  onSubmit: (option: string) => void;
  /** 不需選目標、也沒有危險性的技能（結束發言、退水）直接送出 */
  onDirect: (promptId: string, option: string) => void;
  onOpenSkill: (id: string) => void;
  onCancelSkill: () => void;
  onClear: () => void;
}

function waitingText(view: ClientView, t: (zh: string, en: string) => string): string {
  const st = view.stage;
  const me = view.players.find((p) => p.isMe);
  if (!view.meId) return t('觀戰中', 'Spectating');
  switch (st.t) {
    case 'deal':
      return t('請確認你的身分，天黑後遊戲開始', 'Check your role — the game starts at nightfall');
    case 'night':
      return me?.alive
        ? t('🌙 天黑請閉眼，等待其他玩家行動…', '🌙 Night has fallen. Waiting for other players to act…')
        : t('你已出局，靜靜觀看這個夜晚', 'You are out — quietly watch the night unfold');
    case 'signup':
      return t('等待其他玩家決定是否上警…', 'Waiting for the others to decide whether to run…');
    case 'speech':
      return st.speaker === view.meId ? t('輪到你發言了', 'It is your turn to speak') : t('請聆聽發言', 'Listen to the speech');
    case 'lastWords':
      return st.speaker === view.meId ? t('請留下你的遺言', 'Leave your last words') : t('請聆聽遺言', 'Listen to the last words');
    case 'vote':
      return t('等待投票結果…', 'Waiting for the vote…');
    case 'voteResult':
      return t('公布票型中…', 'Revealing the votes…');
    case 'announce':
      return t('法官公布昨夜的情況', 'The moderator announces what happened last night');
    case 'trigger':
      return t('等待出局玩家行動…', 'Waiting for the eliminated player to act…');
    case 'order':
      return t('等待警長決定發言順序…', 'Waiting for the sheriff to decide the speaking order…');
    default:
      return '';
  }
}

/** 畫面下方的行動面板：顯示輪到自己時可以做的事 */
export function ActionPanel({ view, active, isSkill, selected, busy, onSubmit, onDirect, onOpenSkill, onCancelSkill, onClear }: Props) {
  const { lang, t } = useLang();
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const prompt = view.prompt;
  const needs = !!active?.options.some((o) => o.needsTargets);
  const countOk = !!active && selected.length >= active.min && selected.length <= active.max;
  const picks = active?.picks ?? prompt?.picks;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-2">
      {/* 隨時可用的技能：結束發言、退水、自爆、決鬥 */}
      {!isSkill && view.skills.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {view.skills.map((s) => {
            const opt = s.options[0];
            const direct = !opt.needsTargets && opt.style !== 'danger';
            return (
              <Button
                key={s.id}
                tone={opt.style ?? 'ghost'}
                disabled={busy}
                className="shadow-xl"
                onClick={() => (direct ? onDirect(s.id, opt.id) : onOpenSkill(s.id))}
              >
                {s.id === 'boom' ? '💥 ' : s.id === 'duel' ? '⚔️ ' : s.id === 'endSpeech' ? '✅ ' : ''}
                {opt.label}
              </Button>
            );
          })}
        </div>
      )}

      <div
        className={cls(
          'panel w-full px-4 py-3 transition',
          active ? 'animate-rise border-gold/60 shadow-[0_0_40px_rgb(233_185_73/0.25)]' : 'opacity-90',
        )}
      >
        {active ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-lg font-black text-gold-soft">{active.title}</div>
                {active.desc && (
                  <div className="mt-0.5 text-sm leading-relaxed text-white/80">
                    <SeatText text={active.desc} players={view.players} />
                  </div>
                )}
              </div>
              {isSkill && (
                <button onClick={onCancelSkill} className="shrink-0 rounded-lg px-2 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white">
                  {t('取消', 'Cancel')}
                </button>
              )}
            </div>

            {picks && Object.keys(picks).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-blood/15 px-2.5 py-1.5 text-xs text-white/85">
                <span className="font-black text-blood-soft">{t('狼隊選擇', "Wolves' picks")}</span>
                {Object.entries(picks).map(([w, target]) => {
                  const wolf = byId.get(w);
                  const tgt = target ? byId.get(target) : null;
                  return (
                    <span key={w}>
                      <SeatText text={wolf ? seatTag(lang, wolf.seat) : '?'} players={view.players} />→
                      {tgt ? <SeatText text={seatTag(lang, tgt.seat)} players={view.players} /> : t(' 空刀', ' no kill')}
                    </span>
                  );
                })}
              </div>
            )}

            {needs && (
              <div className="mt-2 flex min-h-9 flex-wrap items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-sm">
                {selected.length ? (
                  <>
                    {selected.map((id) => {
                      const p = byId.get(id);
                      return p ? (
                        <span key={id} className="rounded-full bg-white/10 py-0.5 pl-0.5 pr-2.5 ring-1 ring-gold/70">
                          <PlayerTag p={p} />
                        </span>
                      ) : null;
                    })}
                    <button onClick={onClear} className="text-xs text-white/50 hover:text-white">
                      {t('清除', 'Clear')}
                    </button>
                  </>
                ) : (
                  <span className="text-white/50">
                    {active.min === active.max
                      ? t(`👆 點選場景中的玩家或左側名單（選 ${active.min} 人）`, `👆 Pick a player in the scene or from the list (choose ${active.min})`)
                      : t(
                          `👆 點選場景中的玩家或左側名單（選 ${active.min}–${active.max} 人）`,
                          `👆 Pick players in the scene or from the list (choose ${active.min}–${active.max})`,
                        )}
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {active.options.map((o) => (
                <Button
                  key={o.id}
                  tone={o.style ?? 'ghost'}
                  disabled={busy || (o.needsTargets && !countOk)}
                  onClick={() => onSubmit(o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </>
        ) : prompt && (prompt.done || prompt.blocked) ? (
          <div className="text-center">
            <div className="font-display text-base font-black text-gold-soft">{prompt.title}</div>
            <div className={cls('mt-1 text-sm', prompt.blocked ? 'font-bold text-blood-soft' : 'text-white/70')}>
              {prompt.blocked ? '🚫 ' : '⏳ '}
              <SeatText text={prompt.desc ?? ''} players={view.players} />
            </div>
          </div>
        ) : (
          <div className="text-center text-sm font-bold text-white/75">{waitingText(view, t)}</div>
        )}
      </div>
    </div>
  );
}
