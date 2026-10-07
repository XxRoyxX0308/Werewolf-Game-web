import assert from 'node:assert/strict';
import test from 'node:test';
import {
  P,
  act,
  addBot,
  addPlayer,
  createState,
  getPrompt,
  getSkills,
  pickOne,
  random,
  setConfig,
  setRandom,
  shuffle,
  startError,
  startGame,
} from '../src/game/engine';
import { type Lang, withLang } from '../src/game/i18n';
import { PRESETS } from '../src/game/roles';
import { tick, wakeAt } from '../src/game/runtime';
import type { ClientView, GameState, Prompt, RoleId } from '../src/game/types';
import { viewFor } from '../src/game/view';

/** 中日韓文字與全形標點 */
const CJK = /[　-ヿ一-鿿＀-￯]/;

/** 英文畫面裡不應該殘留任何中文（代表有文字漏翻） */
function assertTranslated(v: ClientView) {
  if (v.lang !== 'en') return;
  const json = JSON.stringify(v);
  const m = CJK.exec(json);
  assert.ok(!m, `英文畫面出現未翻譯的文字：${json.slice(Math.max(0, (m?.index ?? 0) - 60), (m?.index ?? 0) + 60)}`);
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECIAL_WOLVES: RoleId[] = ['wolfKing', 'whiteWolfKing', 'wolfBeauty', 'hiddenWolf', 'evilKnight', 'nightmare', 'gargoyle', 'bloodMoon'];
const GODS: RoleId[] = [
  'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', 'gravekeeper', 'silencer',
  'magician', 'dreamer', 'witcher', 'bear', 'fox', 'elder', 'crow', 'psychic',
];
const THIRDS: RoleId[] = ['cupid', 'wildChild', 'piper', 'halfBlood'];

function randomDeck(n: number): RoleId[] {
  const wolfCount = Math.max(1, Math.min(Math.floor((n - 1) / 2), Math.round(n / 3.5)));
  const pool = shuffle(SPECIAL_WOLVES);
  const deck: RoleId[] = [];
  for (let i = 0; i < wolfCount; i++) deck.push(random() < 0.55 && pool.length ? pool.pop()! : 'werewolf');
  const total = n + (random() < 0.25 ? 2 : 0);
  if (total > n) deck.push('thief');
  const slots = total - deck.length;
  const gods = shuffle(GODS).slice(0, Math.max(1, Math.round(slots * (0.3 + random() * 0.5))));
  deck.push(...gods);
  for (const t of shuffle(THIRDS)) if (random() < 0.25 && deck.length < total - 1) deck.push(t);
  while (deck.length < total) deck.push('villager');
  return deck.slice(0, total);
}

function randomAct(s: GameState, pid: string, pr: Prompt, clock: number) {
  const usable = pr.options.filter((o) => !o.needsTargets || pr.targets.length >= pr.min);
  if (!usable.length) return;
  const opt = pickOne(usable);
  let targets: string[] = [];
  if (opt.needsTargets) {
    const k = pr.min + Math.floor(random() * (Math.min(pr.max, pr.targets.length) - pr.min + 1));
    targets = shuffle(pr.targets).slice(0, k);
  }
  act(s, pid, pr.id, opt.id, targets, clock);
}

function play(seed: number, preset?: RoleId[]) {
  const rnd = mulberry32(seed);
  setRandom(rnd);
  let clock = 1e9;
  let s = createState('FUZZ', clock);
  const n = preset ? preset.length - (preset.includes('thief') ? 2 : 0) : 4 + Math.floor(rnd() * 15);
  const humans = 1 + Math.floor(rnd() * n);
  const lang: Lang = seed % 2 ? 'zh' : 'en';
  for (let i = 0; i < n; i++) {
    if (i < humans) addPlayer(s, { name: `H${i}` });
    else withLang(lang, () => addBot(s));
  }
  setConfig(s, {
    roles: preset ?? randomDeck(n),
    sheriff: rnd() < 0.7,
    winMode: rnd() < 0.7 ? 'edge' : 'all',
    witchSelfSave: pickOne(['never', 'first', 'always'] as const),
    lastWords: pickOne(['first', 'always', 'none'] as const),
    guardSaveClash: rnd() < 0.8,
    deadSeeAll: rnd() < 0.3,
    strictChat: rnd() < 0.3,
    speechSec: 15,
    actionSec: 10,
    voteSec: 10,
  });
  if (startError(s)) setConfig(s, { auto: true });
  startGame(s, clock);

  for (let step = 0; s.phase === 'playing'; step++) {
    if (step > 8000) throw new Error(`第 ${s.day} 天仍未結束，階段 ${s.stage?.t}`);
    for (const p of s.players) {
      if (p.isBot || s.phase !== 'playing' || rnd() < 0.4) continue;
      const pr = getPrompt(s, p.id);
      if (pr && !pr.done && !pr.blocked && pr.options.length) {
        randomAct(s, p.id, pr, clock);
      } else if (rnd() < 0.12) {
        const sk = getSkills(s, p.id);
        if (sk.length) randomAct(s, p.id, pickOne(sk), clock);
      }
    }
    if (s.phase !== 'playing') break;

    // 不變量
    const st = s.stage!;
    assert.ok(st, '進行中必須有階段');
    assert.ok(s.deadline !== null, '進行中必須有期限');
    if (st.t === 'night') for (const a of st.actors) assert.ok(P(s, a).alive, '死者不應在夜晚行動');
    if (st.t === 'speech') assert.ok(P(s, st.order[st.idx]).alive, '死者不應發言');
    if (st.t === 'vote') for (const v of st.voters) assert.ok(P(s, v).alive && P(s, v).canVote, '無投票權者不應投票');
    assert.ok(wakeAt(s) !== null);
    if (step % 5 === 0) for (const p of s.players) assertTranslated(viewFor(s, p.token || null, step, clock, lang));

    s = JSON.parse(JSON.stringify(s)) as GameState; // 模擬資料庫存取
    clock += 1500 + Math.floor(rnd() * 5000);
    tick(s, clock);
  }
  assert.ok(s.winner, '遊戲結束必須有勝利者');
  assert.ok(s.day < 80, '遊戲天數異常');
  for (const p of s.players) assertTranslated(viewFor(s, p.token || null, 0, clock, lang));
  return s;
}

test('隨機對局：各種牌組都能正常跑到結束', () => {
  const camps: Record<string, number> = {};
  for (let seed = 1; seed <= 600; seed++) {
    try {
      const s = play(seed);
      camps[s.winner!.camp] = (camps[s.winner!.camp] ?? 0) + 1;
    } catch (e) {
      throw new Error(`seed ${seed} 失敗：${(e as Error).stack}`);
    }
  }
  console.log('勝利陣營分布', camps);
  assert.ok(camps.good > 0 && camps.wolf > 0);
});

test('隨機對局：所有預設板子', () => {
  for (const preset of PRESETS) {
    for (let seed = 1; seed <= 25; seed++) {
      try {
        play(seed * 7919, preset.roles);
      } catch (e) {
        throw new Error(`板子 ${preset.name.zh} seed ${seed} 失敗：${(e as Error).stack}`);
      }
    }
  }
});
