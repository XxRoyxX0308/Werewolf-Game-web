'use client';

import { useLang } from '@/lib/client/lang';

/** 畫面發生未預期的錯誤時顯示原因，而不是整頁空白 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 p-6 text-center">
      <div className="panel max-w-md p-8">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-3 font-display text-2xl font-black text-gold-soft">{t('畫面發生錯誤', 'Something went wrong')}</h1>
        <p className="mt-2 text-sm text-white/60">
          {t('重新載入後會回到原本的座位，遊戲進度不會遺失。', 'Reloading takes you back to your seat — the game progress is not lost.')}
        </p>
        <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-left text-xs text-blood-soft">
          {error.message || String(error)}
        </pre>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={reset} className="rounded-xl bg-gold px-4 py-2 text-sm font-black text-ink-950">
            {t('重試', 'Retry')}
          </button>
          <button onClick={() => location.reload()} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white">
            {t('重新載入', 'Reload')}
          </button>
        </div>
      </div>
    </main>
  );
}
