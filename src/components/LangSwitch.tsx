'use client';

import { LANGS } from '@/game/i18n';
import { useLang } from '@/lib/client/lang';
import { cls } from './ui';

/** 語言選擇：中文 / English */
export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="語言 / Language"
      className={cls('inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-white/15 bg-ink-800/75 p-0.5 backdrop-blur-sm', className)}
    >
      <span className="px-1 text-xs" aria-hidden>
        🌐
      </span>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={l.id === lang}
          onClick={() => setLang(l.id)}
          className={cls(
            'rounded-lg px-2 py-0.5 text-xs font-bold transition',
            l.id === lang ? 'bg-gold text-ink-950' : 'text-moon/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
