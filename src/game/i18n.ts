export type Lang = 'zh' | 'en';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
];
export const DEFAULT_LANG: Lang = 'zh';
export const toLang = (v: unknown): Lang => (v === 'en' || v === 'zh' ? v : DEFAULT_LANG);
/** 瀏覽器用這個標頭告訴伺服器玩家選的語言，回傳的畫面與錯誤訊息都會使用它 */
export const LANG_HEADER = 'x-ww-lang';

/** 同一段文字的各語言版本 */
export type LText = Record<Lang, string>;
export const L = (zh: string, en: string): LText => ({ zh, en });

export const tr = (lang: Lang, zh: string, en: string) => (lang === 'en' ? en : zh);
/** 座位標籤。介面會把文字裡的這種寫法換成該玩家顏色的標籤（見 SeatText） */
export const seatTag = (lang: Lang, seat: number) => (lang === 'en' ? `#${seat}` : `${seat}號`);

// ───────────── 規則引擎用的「目前語言」 ─────────────
// 引擎產生文字的地方很多也很深，逐層傳遞語言參數太累贅，所以改用 withLang 圈出一段同步執行的範圍。
// 範圍內不可以有 await，否則會和同時處理中的其他請求互相干擾。
// 畫面元件不要用這一組，請改用 useLang()。

let cur: Lang = DEFAULT_LANG;

export const curLang = () => cur;

export function withLang<T>(lang: Lang, fn: () => T): T {
  const prev = cur;
  cur = lang;
  try {
    return fn();
  } finally {
    cur = prev;
  }
}

export const t = (zh: string, en: string) => tr(cur, zh, en);
/** 列舉時的分隔符號 */
export const sep = () => t('、', ', ');
/** 取出目前語言的版本。改版前存下的房間仍是單一字串，直接沿用 */
export const loc = (text: LText | string) => (typeof text === 'string' ? text : text[cur]);
/** 把同一段文字用每種語言各產生一次，用於要保存下來給不同語言玩家看的內容 */
export const allLangs = (fn: () => string): LText => ({ zh: withLang('zh', fn), en: withLang('en', fn) });
