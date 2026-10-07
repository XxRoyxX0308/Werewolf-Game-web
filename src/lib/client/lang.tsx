'use client';

import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, type Lang, toLang, tr } from '@/game/i18n';
import { loadPref, savePref } from './storage';

interface LangApi {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** 依目前的語言二選一：t('中文', 'English') */
  t: (zh: string, en: string) => string;
}

const LangContext = createContext<LangApi>({ lang: DEFAULT_LANG, setLang: () => {}, t: (zh) => zh });

const HTML_LANG: Record<Lang, string> = { zh: 'zh-Hant', en: 'en' };

/** 介面語言。選擇會記在瀏覽器裡，下次進來沿用 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  useEffect(() => setLang(toLang(loadPref<unknown>('lang', DEFAULT_LANG))), []);
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  const api = useMemo<LangApi>(
    () => ({
      lang,
      setLang: (next) => {
        setLang(next);
        savePref('lang', next);
      },
      t: (zh, en) => tr(lang, zh, en),
    }),
    [lang],
  );
  return <LangContext.Provider value={api}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
