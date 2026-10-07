'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLORS } from '@/game/cosmetics';
import type { ClientAction, ClientView, PlayerView, Profile } from '@/game/types';
import { sfx, speak, stopSpeaking } from '@/lib/client/audio';
import { useLang } from '@/lib/client/lang';
import { loadMarks, loadPref, loadProfile, saveMarks, savePref, saveProfile } from '@/lib/client/storage';
import { useRoom } from '@/lib/client/useRoom';
import { LangSwitch } from '../LangSwitch';
import { ProfileForm } from '../ProfileForm';
import type { SceneLink } from '../scene/Scene';
import { Button, Modal, PlayerTag, SeatText, cls, useCountdown, useMedia } from '../ui';
import { ActionPanel } from './ActionPanel';
import { MARKS, chipsFor } from './common';
import { GameOver } from './GameOver';
import { LobbyPanel } from './LobbyPanel';
import { DealOverlay, RoleCard } from './RoleCard';
import { RolesGuide } from './RolesGuide';
import { Roster } from './Roster';
import { SidePanel } from './SidePanel';

function SceneLoading() {
  const { t } = useLang();
  return <div className="grid h-full place-items-center text-sm text-white/40">{t('載入 3D 場景中…', 'Loading the 3D scene…')}</div>;
}

const Scene = dynamic(() => import('../scene/Scene'), { ssr: false, loading: () => <SceneLoading /> });

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'warn' | 'error';
}
let toastSeq = 0;

const TOAST_TONE: Record<Toast['tone'], string> = {
  info: 'border-violet-400/60 bg-violet-950/90',
  good: 'border-emerald-400/70 bg-emerald-950/90',
  bad: 'border-blood bg-[#3a0d0a]/95',
  warn: 'border-gold/70 bg-[#3a2c05]/95',
  error: 'border-blood bg-[#3a0d0a]/95',
};

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-ink-950 p-6 text-center">{children}</main>;
}

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { t } = useLang();
  const room = useRoom(code);
  if (room.status === 'notfound') {
    return (
      <Centered>
        <div className="panel max-w-sm p-8">
          <div className="text-5xl">🏚️</div>
          <h1 className="mt-3 font-display text-2xl font-black text-gold-soft">{t(`找不到房間 ${code}`, `Room ${code} not found`)}</h1>
          <p className="mt-2 text-sm text-white/60">
            {t('房間可能已經關閉，或是代碼輸入錯誤。', 'The room may have closed, or the code may be wrong.')}
          </p>
          <Button tone="primary" className="mt-5" onClick={() => router.push('/')}>
            {t('回到首頁', 'Back to home')}
          </Button>
        </div>
      </Centered>
    );
  }
  if (!room.view) {
    return (
      <Centered>
        <div className="animate-pulse font-display text-xl font-black text-gold-soft">{t('🐺 正在進入村莊…', '🐺 Entering the village…')}</div>
      </Centered>
    );
  }
  return <RoomView {...room} view={room.view} />;
}

function Banner({ view, serverNow }: { view: ClientView; serverNow: () => number }) {
  const st = view.stage;
  const left = useCountdown(view.phase === 'playing' ? st.deadline : null, serverNow);
  const urgent = left !== null && left <= 5;
  const icon =
    st.t === 'lobby' ? '🏕️' : st.t === 'ended' ? '🏆' : st.t === 'vote' || st.t === 'voteResult' ? '🗳️' : st.night ? '🌙' : '☀️';
  return (
    <div className="panel pointer-events-auto flex max-w-full items-center gap-3 px-4 py-2">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 text-center">
        <div className="font-display text-lg font-black leading-tight text-gold-soft">{st.title}</div>
        {st.sub && (
          <div className="truncate text-sm text-white/80">
            <SeatText text={st.sub} players={view.players} />
          </div>
        )}
      </div>
      {left !== null && (
        <div
          className={cls(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-base font-black tabular-nums',
            urgent ? 'animate-pulse border-blood text-blood-soft' : 'border-gold/70 text-gold-soft',
          )}
        >
          {left}
        </div>
      )}
    </div>
  );
}

type RoomApi = ReturnType<typeof useRoom>;

function RoomView({ view, online, send, join, forget, serverNow }: RoomApi & { view: ClientView }) {
  const router = useRouter();
  const { lang, t } = useLang();
  const [selected, setSelected] = useState<string[]>([]);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [markFor, setMarkFor] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [drawer, setDrawer] = useState<'roster' | 'side' | null>(null);
  const [voice, setVoice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dealDone, setDealDone] = useState(-1);
  const [overClosed, setOverClosed] = useState(-1);
  const [profileOpen, setProfileOpen] = useState(false);
  // 寬螢幕時左右各有一欄面板（17rem + 22rem），場景要避開它們
  const wide = useMedia('(min-width: 1024px)');

  const me = view.players.find((p) => p.isMe) ?? null;
  const isHost = !!view.meId && view.meId === view.hostId;
  const lobby = view.phase === 'lobby';
  const playing = view.phase === 'playing';
  const st = view.stage;

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500);
  }, []);

  const run = useCallback(
    async (a: ClientAction) => {
      try {
        await send(a);
        return true;
      } catch (e) {
        toast((e as Error).message, 'error');
        return false;
      }
    },
    [send, toast],
  );

  // ── 個人偏好與私人標記 ──
  useEffect(() => setVoice(loadPref('voice', true)), []);
  useEffect(() => setMarks(loadMarks(view.code, view.gameNo)), [view.code, view.gameNo]);
  const setMark = (id: string, text: string) => {
    setMarks((m) => {
      const next = { ...m };
      if (text) next[id] = text.slice(0, 8);
      else delete next[id];
      saveMarks(view.code, view.gameNo, next);
      return next;
    });
    setMarkFor(null);
  };
  const toggleVoice = () => {
    setVoice((v) => {
      savePref('voice', !v);
      if (v) stopSpeaking();
      return !v;
    });
  };

  // ── 新的私人情報以通知跳出 ──
  const lastPriv = useRef<number | null>(null);
  useEffect(() => {
    const maxId = view.priv.reduce((m, p) => Math.max(m, p.id), 0);
    if (lastPriv.current !== null) {
      for (const p of view.priv) {
        if (p.id > lastPriv.current && !p.quiet) toast(p.text, p.kind);
      }
    }
    lastPriv.current = maxId;
  }, [view.priv, toast]);

  // ── 法官語音與音效 ──
  const lastSeq = useRef<number | null>(null);
  useEffect(() => {
    if (lastSeq.current === st.seq) return;
    const first = lastSeq.current === null;
    lastSeq.current = st.seq;
    if (first || !voice) return;
    if (st.t === 'night' && st.nightfall) sfx('night');
    else if (st.t === 'announce' || st.t === 'signup') sfx('day');
    else if (st.t === 'vote') sfx('vote');
    else if (st.t === 'ended') sfx('end');
    speak(st.narration, view.lang);
  }, [st, voice, view.lang]);

  // ── 目前可操作的提示 ──
  const mainPrompt = view.prompt && !view.prompt.done && !view.prompt.blocked ? view.prompt : null;
  const skill = skillId ? (view.skills.find((s) => s.id === skillId) ?? null) : null;
  const active = skill ?? mainPrompt;
  const selectable = useMemo(
    () => (active && active.options.some((o) => o.needsTargets) ? active.targets : []),
    [active],
  );

  // 輪到自己行動或發言時響一聲提示
  const myTurn = playing && (!!mainPrompt || view.skills.some((s) => s.id === 'endSpeech'));
  const turnKey = myTurn ? `${st.seq}:${mainPrompt?.id ?? 'speech'}` : '';
  useEffect(() => {
    if (voice && turnKey) sfx('turn');
  }, [turnKey, voice]);

  useEffect(() => {
    setSelected([]);
    setSkillId(null);
  }, [st.seq, view.prompt?.id]);

  const pick = useCallback(
    (id: string) => {
      if (active && selectable.includes(id)) {
        setSelected((cur) =>
          cur.includes(id) ? cur.filter((x) => x !== id) : active.max === 1 ? [id] : cur.length >= active.max ? [...cur.slice(1), id] : [...cur, id],
        );
      } else if (view.meId && !lobby) {
        setMarkFor(id);
      }
    },
    [active, selectable, view.meId, lobby],
  );

  const submit = async (option: string) => {
    if (!active || busy) return;
    setBusy(true);
    const ok = await run({ type: 'act', prompt: active.id, option, targets: selected });
    setBusy(false);
    if (ok) {
      setSelected([]);
      setSkillId(null);
    }
  };
  const direct = async (prompt: string, option: string) => {
    if (busy) return;
    setBusy(true);
    await run({ type: 'act', prompt, option, targets: [] });
    setBusy(false);
  };

  // ── 3D 場景所需的資料 ──
  const chipMap = useMemo(
    () => Object.fromEntries(view.players.map((p) => [p.id, chipsFor(p, view, marks, lang)])),
    [view, marks, lang],
  );
  const scenePlayers = useMemo(
    () =>
      view.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        seat: p.seat,
        alive: p.alive,
        isMe: p.isMe,
        sheriff: p.sheriff,
        chips: chipMap[p.id],
      })),
    [view.players, chipMap],
  );
  const awake = useMemo(() => {
    if (!playing) return view.players.map((p) => p.id);
    const ids: string[] = [];
    if (view.prompt && view.meId) {
      ids.push(view.meId);
      if (view.prompt.id === 'night:wolves') ids.push(...view.players.filter((p) => p.wolfmate && p.alive).map((p) => p.id));
    }
    return ids;
  }, [playing, view.players, view.prompt, view.meId]);
  const links = useMemo(() => {
    const out: SceneLink[] = [];
    const color = (id: string) => view.players.find((p) => p.id === id)?.color ?? '#ffffff';
    if (st.t === 'voteResult' && st.votes) {
      for (const [from, to] of Object.entries(st.votes)) if (to) out.push({ from, to, color: color(from) });
    }
    const picks = view.prompt?.picks;
    if (picks) for (const [from, to] of Object.entries(picks)) if (to) out.push({ from, to, color: '#ff5a4d', dashed: true });
    return out;
  }, [st, view.players, view.prompt]);

  const veil = playing && st.t === 'night' && !active;
  const showDeal = st.t === 'deal' && !!view.myRole && dealDone !== view.gameNo;
  const showOver = view.phase === 'ended' && overClosed !== view.gameNo;
  const marked = markFor ? view.players.find((p) => p.id === markFor) : null;

  const leave = async () => {
    if (lobby && view.meId) await run({ type: 'leave' });
    forget();
    router.push('/');
  };
  const copyLink = async () => {
    const url = `${location.origin}/room/${view.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('已複製邀請連結', 'Invite link copied'), 'good');
    } catch {
      window.prompt(t('複製這個連結傳給朋友', 'Copy this link and send it to your friends'), url);
    }
  };

  const rosterEl = (
    <Roster
      view={view}
      chips={chipMap}
      selectable={selectable}
      selected={selected}
      hovered={hovered}
      onPick={(id) => {
        pick(id);
        if (selectable.includes(id)) setDrawer(null);
      }}
      onHover={setHovered}
      send={run}
    />
  );
  const sideEl = (
    <SidePanel
      view={view}
      send={send}
      settings={lobby ? <LobbyPanel view={view} send={run} onCopied={() => toast(t('已複製邀請連結', 'Invite link copied'), 'good')} /> : undefined}
    />
  );
  const roleEl = view.myRole && !lobby ? <RoleCard role={view.myRole} notes={view.myNotes} /> : null;

  const tools = (
    <>
      <Button size="sm" onClick={() => setGuide(true)} title={t('角色圖鑑與規則', 'Role guide & rules')}>
        {t('📖 角色', '📖 Roles')}
      </Button>
      <Button size="sm" onClick={toggleVoice} title={t('法官語音與音效', 'Narrator voice & sound effects')}>
        {voice ? t('🔊 語音', '🔊 Voice') : t('🔇 靜音', '🔇 Muted')}
      </Button>
      {isHost && playing && (
        <>
          <Button
            size="sm"
            onClick={() => run({ type: 'hostSkip' })}
            title={t('立即結束目前的階段（例如有人掛機）', 'End the current stage right away (e.g. when someone is away)')}
          >
            {t('⏭ 跳過', '⏭ Skip')}
          </Button>
          <Button
            size="sm"
            onClick={() => window.confirm(t('確定要中止這一局、回到大廳嗎？', 'Abort this game and return to the lobby?')) && run({ type: 'restart' })}
            title={t('中止本局並回到大廳', 'Abort this game and return to the lobby')}
          >
            {t('🏳 中止', '🏳 Abort')}
          </Button>
        </>
      )}
      {(lobby || !view.meId) && (
        <Button size="sm" onClick={leave}>
          {t('🚪 離開', '🚪 Leave')}
        </Button>
      )}
      <LangSwitch />
    </>
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink-950">
      <div className="absolute inset-0">
        <Scene
          players={scenePlayers}
          night={st.night}
          speaker={st.speaker ?? st.actor ?? null}
          awake={awake}
          selectable={selectable}
          selected={selected}
          hovered={hovered}
          links={links}
          padX={wide ? 672 : 0}
          shiftX={wide ? -40 : 0}
          onPick={pick}
          onHover={setHovered}
        />
      </div>
      <div className={cls('night-veil pointer-events-none absolute inset-0 transition-opacity duration-700', veil ? 'opacity-100' : 'opacity-0')} />

      <div className="pointer-events-none absolute inset-0 grid grid-cols-1 gap-3 p-2 sm:p-3 lg:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        {/* 左欄：房間資訊、玩家名單、我的身分 */}
        <aside className="pointer-events-auto hidden min-h-0 flex-col gap-3 lg:flex">
          <div className="panel p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xl font-black text-gold-soft title-glow">{t('🐺 狼人殺', '🐺 Werewolf')}</span>
              <button onClick={copyLink} title={t('複製邀請連結', 'Copy invite link')} className="rounded-lg bg-white/10 px-2 py-1 font-mono text-sm font-black tracking-widest text-white hover:bg-white/20">
                {view.code} ⧉
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">{tools}</div>
          </div>
          {rosterEl}
          {roleEl}
        </aside>

        {/* 中央：階段橫幅與行動面板 */}
        <section className="flex min-h-0 min-w-0 flex-col items-center justify-between gap-2">
          <div className="flex w-full flex-col items-center gap-2">
            <div className="pointer-events-auto flex w-full items-center justify-between gap-1.5 lg:hidden">
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => setDrawer('roster')}>
                  {t('👥 名單', '👥 Players')}
                </Button>
                <button onClick={copyLink} title={t('複製邀請連結', 'Copy invite link')} className="rounded-xl border border-white/15 bg-ink-800/75 px-2 font-mono text-xs font-black tracking-widest text-white backdrop-blur-sm">
                  {view.code} ⧉
                </button>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {tools}
                <Button size="sm" onClick={() => setDrawer('side')}>
                  {lobby ? t('⚙️ 設定', '⚙️ Settings') : t('📜 紀錄', '📜 Log')}
                </Button>
              </div>
            </div>
            <Banner view={view} serverNow={serverNow} />
            {!online && (
              <div className="rounded-full bg-blood px-3 py-1 text-xs font-black text-white">
                {t('連線中斷，正在重新連線…', 'Connection lost — reconnecting…')}
              </div>
            )}
            {!view.meId && !lobby && (
              <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                {t('👀 遊戲進行中，你正在觀戰', '👀 Game in progress — you are spectating')}
              </div>
            )}
            <div className="flex w-full max-w-md flex-col items-center gap-1.5">
              {toasts.map((t) => (
                <div key={t.id} className={cls('animate-rise pointer-events-auto w-full rounded-xl border px-3 py-2 text-sm font-bold text-white shadow-2xl', TOAST_TONE[t.tone])}>
                  <SeatText text={t.text} players={view.players} />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto flex w-full flex-col items-center gap-2">
            {lobby ? (
              view.meId ? (
                <div className="panel flex w-full max-w-xl flex-col items-center gap-2 px-4 py-3">
                  {isHost ? (
                    <>
                      <Button tone="primary" size="lg" className="w-full" disabled={!!view.startError} onClick={() => run({ type: 'start' })}>
                        {t(`🌙 開始遊戲（${view.players.length} 人）`, `🌙 Start Game (${view.players.length} players)`)}
                      </Button>
                      {view.startError && <div className="text-xs font-bold text-blood-soft">{view.startError}</div>}
                    </>
                  ) : (
                    <div className="text-sm font-bold text-white/80">{t('⏳ 等待房主開始遊戲…', '⏳ Waiting for the host to start the game…')}</div>
                  )}
                  <button onClick={() => setProfileOpen(true)} className="text-xs font-bold text-white/60 underline-offset-2 hover:text-white hover:underline">
                    {t('✏️ 修改我的暱稱、頭像與顏色', '✏️ Edit my nickname, avatar and color')}
                  </button>
                </div>
              ) : null
            ) : (
              <ActionPanel
                view={view}
                active={active}
                isSkill={!!skill}
                selected={selected}
                busy={busy}
                onSubmit={submit}
                onDirect={direct}
                onOpenSkill={(id) => {
                  setSelected([]);
                  setSkillId(id);
                }}
                onCancelSkill={() => {
                  setSelected([]);
                  setSkillId(null);
                }}
                onClear={() => setSelected([])}
              />
            )}
            {view.myRole && !lobby && (
              <div className="w-full max-w-xl lg:hidden">
                <RoleCard role={view.myRole} notes={view.myNotes} compact />
              </div>
            )}
          </div>
        </section>

        {/* 右欄：紀錄 / 聊天 / 大廳設定 */}
        <aside className="pointer-events-auto hidden min-h-0 lg:flex">{sideEl}</aside>
      </div>

      {/* 手機版的抽屜 */}
      {drawer && (
        <div className="fixed inset-0 z-[60] flex bg-ink-950/85 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(null)}>
          <div
            className={cls('flex h-full w-[88%] max-w-sm flex-col gap-2 p-2', drawer === 'side' && 'ml-auto')}
            onClick={(e) => e.stopPropagation()}
          >
            {drawer === 'roster' ? rosterEl : sideEl}
            <Button onClick={() => setDrawer(null)}>{t('關閉', 'Close')}</Button>
          </div>
        </div>
      )}

      <RolesGuide open={guide} onClose={() => setGuide(false)} deck={view.config.roles} />
      {showDeal && view.myRole && <DealOverlay role={view.myRole} onClose={() => setDealDone(view.gameNo)} />}
      {showOver && <GameOver view={view} onRestart={() => run({ type: 'restart' })} onClose={() => setOverClosed(view.gameNo)} />}
      {view.phase === 'ended' && !showOver && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <Button tone="primary" onClick={() => setOverClosed(-1)}>
            {t('🏆 查看結算', '🏆 View results')}
          </Button>
        </div>
      )}

      <MarkModal player={marked ?? null} current={markFor ? (marks[markFor] ?? '') : ''} onSet={(t) => markFor && setMark(markFor, t)} onClose={() => setMarkFor(null)} />
      {lobby && !view.meId && <JoinModal view={view} join={join} onError={(m) => toast(m, 'error')} onHome={() => router.push('/')} />}
      {profileOpen && me && (
        <EditProfileModal
          me={me}
          view={view}
          onClose={() => setProfileOpen(false)}
          onSave={async (p) => {
            if (await run({ type: 'profile', ...p })) {
              saveProfile(p);
              setProfileOpen(false);
            }
          }}
        />
      )}
    </main>
  );
}

function MarkModal({ player, current, onSet, onClose }: { player: PlayerView | null; current: string; onSet: (t: string) => void; onClose: () => void }) {
  const { lang, t } = useLang();
  const [custom, setCustom] = useState('');
  useEffect(() => setCustom(''), [player?.id]);
  if (!player) return null;
  return (
    <Modal open onClose={onClose} title={t('📝 標記玩家', '📝 Mark a player')}>
      <div className="mb-3 text-base">
        <PlayerTag p={player} />
      </div>
      <p className="mb-3 text-xs text-white/55">
        {t(
          '標記只有你自己看得到，會顯示在他的名牌和名單上，幫助你記住每個人的身分推測。',
          "Marks are visible only to you. They show on the player's name tag and in the list to help you keep track of your guesses.",
        )}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MARKS[lang].map((m) => (
          <button
            key={m}
            onClick={() => onSet(m)}
            className={cls('rounded-lg px-1 py-2 text-sm font-bold transition', current === m ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/85 hover:bg-white/20')}
          >
            {m}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) onSet(custom.trim());
        }}
      >
        <input
          value={custom}
          maxLength={8}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={t('自訂標記（最多 8 字）', 'Custom mark (max 8 characters)')}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-gold"
        />
        <Button tone="primary" type="submit" disabled={!custom.trim()}>
          {t('標記', 'Mark')}
        </Button>
      </form>
      {current && (
        <Button className="mt-3 w-full" onClick={() => onSet('')}>
          {t(`清除標記「${current}」`, `Clear mark "${current}"`)}
        </Button>
      )}
    </Modal>
  );
}

function JoinModal({ view, join, onError, onHome }: { view: ClientView; join: (p: Profile) => Promise<void>; onError: (m: string) => void; onHome: () => void }) {
  const { t } = useLang();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const takenColors = view.players.map((p) => p.color);
  const count = view.players.length;
  useEffect(() => {
    const p = loadProfile();
    // 慣用的顏色若已被別人選走，先換成第一個空的
    const color = takenColors.includes(p.color) ? (COLORS.find((c) => !takenColors.includes(c)) ?? p.color) : p.color;
    setProfile({ ...p, color });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!profile) return null;
  const submit = async () => {
    if (!profile.name.trim()) return onError(t('請先輸入暱稱', 'Please enter a nickname first'));
    setBusy(true);
    try {
      saveProfile(profile);
      await join(profile);
    } catch (e) {
      onError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <Modal open title={t(`加入房間 ${view.code}`, `Join room ${view.code}`)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm text-white/60">
          {t(
            `房間裡已有 ${count} 位玩家。設定你的外觀後加入：`,
            `${count === 1 ? 'There is 1 player' : `There are ${count} players`} in the room. Set up your look and join:`,
          )}
        </p>
        {/* 這個視窗會蓋住工具列，所以這裡也要能選語言 */}
        <LangSwitch />
      </div>
      <ProfileForm value={profile} onChange={setProfile} takenColors={takenColors} takenAvatars={view.players.map((p) => p.avatar)} />
      <div className="mt-5 flex gap-2">
        <Button onClick={onHome}>{t('回首頁', 'Home')}</Button>
        <Button tone="primary" className="flex-1" disabled={busy} onClick={submit}>
          {t('加入遊戲', 'Join the game')}
        </Button>
      </div>
    </Modal>
  );
}

function EditProfileModal({ me, view, onClose, onSave }: { me: PlayerView; view: ClientView; onClose: () => void; onSave: (p: Profile) => void }) {
  const { t } = useLang();
  const [profile, setProfile] = useState<Profile>({ name: me.name, avatar: me.avatar, color: me.color });
  const others = view.players.filter((p) => !p.isMe);
  return (
    <Modal open onClose={onClose} title={t('✏️ 修改外觀', '✏️ Edit appearance')}>
      <ProfileForm value={profile} onChange={setProfile} takenColors={others.map((p) => p.color)} takenAvatars={others.map((p) => p.avatar)} />
      <Button tone="primary" className="mt-5 w-full" disabled={!profile.name.trim()} onClick={() => onSave(profile)}>
        {t('儲存', 'Save')}
      </Button>
    </Modal>
  );
}
