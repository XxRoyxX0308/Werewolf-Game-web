'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatChannel, ClientAction, ClientView, LogEntry, PrivEntry } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import { PlayerTag, SeatText, cls } from '../ui';

type Entry = { id: number; day: number; text: string } & ({ priv: true; kind: PrivEntry['kind'] } | { priv: false; kind: LogEntry['kind'] });

const LOG_TONE: Record<LogEntry['kind'], string> = {
  sys: 'text-white/60',
  night: 'text-indigo-200',
  day: 'text-amber-100',
  death: 'text-blood-soft font-bold',
  vote: 'text-white/85',
  skill: 'text-gold-soft font-bold',
  sheriff: 'text-gold-soft',
  end: 'text-gold font-black text-base',
};
const PRIV_TONE: Record<PrivEntry['kind'], string> = {
  info: 'border-violet-400/40 bg-violet-500/15',
  good: 'border-emerald-400/50 bg-emerald-500/15',
  bad: 'border-blood/60 bg-blood/20',
  warn: 'border-gold/50 bg-gold/15',
};

/** 讓清單在有新內容時自動捲到底（使用者往上翻閱時不打擾） */
function useStickBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
  const onScroll = () => {
    const el = ref.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };
  return { ref, onScroll };
}

function LogList({ view }: { view: ClientView }) {
  const { t } = useLang();
  const entries = useMemo<Entry[]>(() => {
    const pub: Entry[] = view.log.map((l) => ({ ...l, priv: false as const }));
    const mine: Entry[] = view.priv.map((l) => ({ ...l, priv: true as const }));
    return [...pub, ...mine].sort((a, b) => a.id - b.id);
  }, [view.log, view.priv]);
  const { ref, onScroll } = useStickBottom(entries.length);

  if (!entries.length) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-sm text-white/40">
        {t('遊戲開始後，這裡會顯示法官的公告與你的私人情報', "Once the game starts, the moderator's announcements and your private information appear here")}
      </div>
    );
  }
  return (
    <div ref={ref} onScroll={onScroll} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
      {entries.map((e) =>
        e.priv ? (
          <div key={e.id} className={cls('rounded-lg border px-2.5 py-1.5 text-sm leading-relaxed text-white', PRIV_TONE[e.kind])}>
            <span className="mr-1 text-[10px] font-black text-white/50">{t('🔒 私人', '🔒 Private')}</span>
            <SeatText text={e.text} players={view.players} />
          </div>
        ) : e.kind === 'night' || e.kind === 'day' ? (
          <div key={e.id} className={cls('flex items-center gap-2 pt-2 text-xs font-black', LOG_TONE[e.kind])}>
            <span className="h-px flex-1 bg-white/15" />
            <span>
              {e.kind === 'night' ? '🌙' : '☀️'} <SeatText text={e.text} players={view.players} />
            </span>
            <span className="h-px flex-1 bg-white/15" />
          </div>
        ) : (
          <div key={e.id} className={cls('whitespace-pre-line text-sm leading-relaxed', LOG_TONE[e.kind])}>
            <SeatText text={e.text} players={view.players} />
          </div>
        ),
      )}
    </div>
  );
}

function ChatList({ view, send }: { view: ClientView; send: (a: ClientAction) => Promise<void> }) {
  const { t } = useLang();
  const [ch, setCh] = useState<ChatChannel>('public');
  const [text, setText] = useState('');
  const channels = view.channels.length
    ? view.channels
    : [{ id: 'public' as const, label: t('公開', 'Public'), canSend: false, hint: t('加入房間後才能發言', 'Join the room to chat') }];
  const cur = channels.find((c) => c.id === ch) ?? channels[0];
  const msgs = view.chat.filter((m) => m.ch === cur.id);
  const { ref, onScroll } = useStickBottom(`${cur.id}:${msgs.length}`);
  const byId = useMemo(() => new Map(view.players.map((p) => [p.id, p])), [view.players]);

  const submit = async () => {
    const msg = text.trim();
    if (!msg || !cur.canSend) return;
    setText('');
    try {
      await send({ type: 'chat', ch: cur.id, text: msg });
    } catch {
      setText(msg);
    }
  };

  return (
    <>
      {channels.length > 1 && (
        <div className="flex gap-1 border-b border-white/10 px-3 py-1.5">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setCh(c.id)}
              className={cls(
                'rounded-full px-3 py-0.5 text-xs font-bold transition',
                c.id === cur.id
                  ? c.id === 'wolf'
                    ? 'bg-blood text-white'
                    : c.id === 'dead'
                      ? 'bg-slate-500 text-white'
                      : 'bg-gold text-ink-950'
                  : 'bg-white/10 text-white/70 hover:bg-white/20',
              )}
            >
              {c.id === 'wolf' ? '🐺 ' : c.id === 'dead' ? '👻 ' : ''}
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div ref={ref} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {!msgs.length && <div className="pt-6 text-center text-sm text-white/35">{t('還沒有訊息', 'No messages yet')}</div>}
        {msgs.map((m) => {
          const p = byId.get(m.from);
          return (
            <div key={m.id} className="text-sm leading-snug">
              <div className="text-xs">{p ? <PlayerTag p={p} /> : <span className="text-white/40">{t('已離開的玩家', 'A player who left')}</span>}</div>
              <div
                className="mt-0.5 w-fit max-w-full break-words rounded-xl rounded-tl-sm px-2.5 py-1.5 text-white"
                style={{ background: p ? `${p.color}2e` : 'rgb(255 255 255 / 0.08)', boxShadow: p ? `inset 0 0 0 1px ${p.color}55` : undefined }}
              >
                <SeatText text={m.text} players={view.players} />
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          value={text}
          maxLength={200}
          disabled={!cur.canSend}
          onChange={(e) => setText(e.target.value)}
          placeholder={cur.canSend ? cur.hint || t('輸入訊息…', 'Type a message…') : cur.hint || t('現在無法發言', 'You cannot speak right now')}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold disabled:opacity-50"
        />
        <button type="submit" disabled={!cur.canSend || !text.trim()} className="rounded-xl bg-gold px-3 text-sm font-black text-ink-950 disabled:opacity-40">
          {t('送出', 'Send')}
        </button>
      </form>
    </>
  );
}

interface Props {
  view: ClientView;
  send: (a: ClientAction) => Promise<void>;
  /** 大廳時顯示的設定頁籤 */
  settings?: ReactNode;
}

/** 右側面板：遊戲紀錄（含私人情報）與文字聊天 */
export function SidePanel({ view, send, settings }: Props) {
  const { t } = useLang();
  const [tab, setTab] = useState<'main' | 'chat'>('main');
  const chatCount = view.chat.length;
  const logCount = view.log.length + view.priv.length;
  const [seenChat, setSeenChat] = useState(chatCount);
  const [seenLog, setSeenLog] = useState(logCount);
  useEffect(() => {
    if (tab === 'chat') setSeenChat(chatCount);
    else setSeenLog(logCount);
  }, [tab, chatCount, logCount]);
  const unreadChat = tab !== 'chat' && chatCount > seenChat;
  const unreadLog = tab !== 'main' && !settings && logCount > seenLog;

  const tabs: { id: 'main' | 'chat'; label: string; dot: boolean }[] = [
    { id: 'main', label: settings ? t('⚙️ 房間設定', '⚙️ Room Settings') : t('📜 遊戲紀錄', '📜 Game Log'), dot: unreadLog },
    { id: 'chat', label: t('💬 聊天', '💬 Chat'), dot: unreadChat },
  ];
  return (
    <div className="panel flex min-h-0 w-full flex-1 flex-col">
      <div className="flex border-b border-white/10">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={cls(
              'relative flex-1 px-3 py-2.5 text-sm font-black transition',
              tab === x.id ? 'text-gold-soft shadow-[inset_0_-2px_0_var(--color-gold)]' : 'text-white/50 hover:text-white',
            )}
          >
            {x.label}
            {x.dot && <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-blood" />}
          </button>
        ))}
      </div>
      {tab === 'chat' ? <ChatList view={view} send={send} /> : settings ? <div className="min-h-0 flex-1 overflow-y-auto">{settings}</div> : <LogList view={view} />}
    </div>
  );
}
