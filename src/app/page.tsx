'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LangSwitch } from '@/components/LangSwitch';
import { ProfileForm } from '@/components/ProfileForm';
import type { ScenePlayer } from '@/components/scene/Figure';
import { Button, useMedia } from '@/components/ui';
import { AVATARS, BOT_NAMES, COLORS } from '@/game/cosmetics';
import { L, type LText, type Lang } from '@/game/i18n';
import type { Profile } from '@/game/types';
import { useLang } from '@/lib/client/lang';
import { loadProfile, saveProfile } from '@/lib/client/storage';
import { createRoom } from '@/lib/client/useRoom';

const Scene = dynamic(() => import('@/components/scene/Scene'), { ssr: false });

/** 首頁背景用的示範玩家 */
const demo = (names: string[]): ScenePlayer[] =>
  names.map((name, i) => ({
    id: `demo${i}`,
    name,
    avatar: AVATARS[(i * 5 + 2) % AVATARS.length],
    color: COLORS[i],
    seat: i + 1,
    alive: i !== 6,
    isMe: false,
    sheriff: i === 2,
    chips: [],
  }));
const DEMO: Record<Lang, ScenePlayer[]> = {
  zh: demo(['阿狗', '小美', '大雄', '靜香', '胖虎', '小夫', '春嬌', '志明', '花媽']),
  en: demo(BOT_NAMES.en.slice(0, 9)),
};

const FEATURES: [string, LText, LText][] = [
  ['🎭', L('31 種角色', '31 Roles'), L('預言家、女巫、狼王、白狼王、丘比特…', 'Seer, Witch, Wolf King, White Wolf King, Cupid…')],
  ['⚖️', L('自動法官', 'Auto Moderator'), L('語音主持、自動結算，不需要有人當上帝', 'Voice narration and automatic resolution — nobody has to sit out')],
  ['🌐', L('遠端連線', 'Play Remotely'), L('分享連結即可加入，手機電腦都能玩', 'Join with a shared link, on phone or desktop')],
  ['🏕️', L('3D 村莊', '3D Village'), L('圍著營火而坐，日夜交替身歷其境', 'Sit around the campfire as day turns to night')],
];

export default function Home() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const wide = useMedia('(min-width: 1024px)');

  useEffect(() => setProfile(loadProfile()), []);

  const ready = () => {
    if (!profile?.name.trim()) {
      setError(t('請先輸入暱稱', 'Please enter a nickname first'));
      return false;
    }
    saveProfile(profile);
    setError('');
    return true;
  };

  const create = async () => {
    if (!profile || !ready()) return;
    setBusy(true);
    try {
      router.push(`/room/${await createRoom(profile, lang)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const join = () => {
    const c = code.trim().toUpperCase();
    if (!c) return setError(t('請輸入房間代碼', 'Please enter a room code'));
    if (!ready()) return;
    router.push(`/room/${c}`);
  };

  return (
    <main className="relative min-h-dvh bg-ink-950">
      <div className="fixed inset-0">
        <Scene players={DEMO[lang]} night autoRotate awake={[]} padX={wide ? 520 : 0} shiftX={wide ? 250 : 0} />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/35 to-transparent max-lg:bg-ink-950/55 max-lg:bg-none" />
      <div className="fixed right-5 top-5 z-20 max-lg:hidden">
        <LangSwitch />
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-dvh items-center p-4 sm:p-8 lg:p-14">
        <div className="pointer-events-auto mx-auto w-full max-w-md lg:mx-0">
          {/* 窄螢幕沒有空的角落可放，改排在標題上方 */}
          <div className="mb-3 flex justify-end lg:hidden">
            <LangSwitch />
          </div>
          <div className="mb-5">
            <div className="text-sm font-black tracking-[0.4em] text-gold/80">WEREWOLF ONLINE</div>
            <h1 className="font-display text-6xl font-black leading-tight text-gold-soft title-glow sm:text-7xl">{t('狼人殺', 'Werewolf')}</h1>
            <p className="mt-2 text-base text-white/75">
              {t('天黑請閉眼。今晚，誰是藏在村莊裡的狼人？', 'Night falls — close your eyes. Who is the werewolf hiding in the village tonight?')}
            </p>
          </div>

          <div className="panel p-5">
            {profile ? <ProfileForm value={profile} onChange={setProfile} /> : <div className="h-64 animate-pulse rounded-xl bg-white/5" />}
            {error && <div className="mt-3 rounded-lg bg-blood/25 px-3 py-2 text-sm font-bold text-blood-soft">{error}</div>}
            <Button tone="primary" size="lg" className="mt-4 w-full" disabled={busy || !profile} onClick={create}>
              {busy ? t('建立中…', 'Creating…') : t('🏕️ 建立房間', '🏕️ Create Room')}
            </Button>
            <div className="my-3 flex items-center gap-3 text-xs font-bold text-white/40">
              <span className="h-px flex-1 bg-white/15" />
              {t('或加入朋友的房間', "or join a friend's room")}
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              <input
                value={code}
                maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={t('房間代碼', 'Room code')}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-center font-mono text-lg font-black tracking-[0.3em] text-white outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-white/30 focus:border-gold"
              />
              <Button type="submit" size="lg" disabled={!profile}>
                {t('加入', 'Join')}
              </Button>
            </form>
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-2">
            {FEATURES.map(([icon, title, text]) => (
              <li key={icon} className="rounded-xl bg-ink-900/70 p-3 ring-1 ring-white/10 backdrop-blur">
                <div className="text-sm font-black text-white">
                  {icon} {title[lang]}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/55">{text[lang]}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
