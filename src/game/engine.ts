import { BOT_NAMES, AVATARS, COLORS } from './cosmetics';
import {
  DEFAULT_CONFIG,
  FIRST_NIGHT_ONLY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_ORDER,
  PRESETS,
  ROLES,
  STEP_NAME,
  defaultRoles,
  roleName,
} from './roles';
import type {
  ChannelView,
  ChatChannel,
  Config,
  DeathCause,
  GameState,
  LogEntry,
  NightData,
  NightStep,
  Player,
  PrivEntry,
  Profile,
  Prompt,
  RoleId,
  RoleState,
  SpeechKind,
  Stage,
  VoteKind,
  Winner,
} from './types';

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

function fail(message: string): never {
  throw new GameError(message);
}

// ───────────── 亂數（測試時可替換） ─────────────

let rnd: () => number = Math.random;
export function setRandom(fn: () => number) {
  rnd = fn;
}
export const random = () => rnd();
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pickOne = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

export function rid(len = 6): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += abc[buf[i] % abc.length];
  return out;
}

export function roomCode(len = 5): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += abc[buf[i] % abc.length];
  return out;
}

/** 各階段固定時長（毫秒） */
export const T = {
  deal: 9000,
  announce: 7000,
  voteResult: 8000,
  signup: 15000,
  order: 15000,
  minStep: 2500,
  fakeMin: 4000,
  fakeMax: 8000,
};

// ───────────── 基本查詢 ─────────────

export function P(s: GameState, id: string): Player {
  const p = s.players.find((x) => x.id === id);
  if (!p) fail('找不到玩家');
  return p;
}
export const living = (s: GameState) => s.players.filter((p) => p.alive);
export const tag = (s: GameState, id: string) => `${P(s, id).seat}號`;
const tags = (s: GameState, ids: string[]) =>
  ids
    .map((i) => P(s, i))
    .sort((a, b) => a.seat - b.seat)
    .map((p) => `${p.seat}號`)
    .join('、');
const bySeat = (s: GameState, ids: string[]) => [...ids].sort((a, b) => P(s, a).seat - P(s, b).seat);

function log(s: GameState, kind: LogEntry['kind'], text: string) {
  s.log.push({ id: ++s.seq, day: s.day, kind, text });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
function priv(s: GameState, id: string, text: string, kind: PrivEntry['kind'] = 'info') {
  (s.priv[id] ??= []).push({ id: ++s.seq, day: s.day, text, kind });
}

export function isWolf(s: GameState, p: Player): boolean {
  if (!p.role) return false;
  return ROLES[p.role].camp === 'wolf' || (p.role === 'wildChild' && s.rs.wildTurned);
}
/** 預言家看到的結果：隱狼顯示為好人 */
export const seerWolf = (s: GameState, p: Player) => isWolf(s, p) && p.role !== 'hiddenWolf';

const PACK: RoleId[] = ['werewolf', 'wolfKing', 'whiteWolfKing', 'wolfBeauty', 'evilKnight', 'nightmare', 'bloodMoon'];
/** 夜晚會一起睜眼的狼隊成員 */
export function inPack(s: GameState, p: Player): boolean {
  if (!p.role) return false;
  return PACK.includes(p.role) || (p.role === 'wildChild' && s.rs.wildTurned);
}
/** 今晚負責襲擊的狼人：狼隊全滅後由隱狼、石像鬼接手 */
export function wolfPack(s: GameState): Player[] {
  const pack = living(s).filter((p) => inPack(s, p));
  if (pack.length) return pack;
  return living(s).filter((p) => p.role === 'hiddenWolf' || p.role === 'gargoyle');
}

export type Side = 'good' | 'wolf' | 'lovers' | 'piper' | 'none';
export function sideOf(s: GameState, p: Player): Side {
  if (!p.role) return 'none';
  const lv = s.rs.lovers;
  if (s.rs.loversMixed && lv && (lv.includes(p.id) || s.rs.cupid === p.id)) return 'lovers';
  if (p.role === 'piper') return 'piper';
  if (p.role === 'thief') return 'none';
  if (p.role === 'cupid' && lv) return isWolf(s, P(s, lv[0])) ? 'wolf' : 'good';
  if (p.role === 'halfBlood') {
    const m = s.rs.halfModel ? P(s, s.rs.halfModel) : null;
    return m && isWolf(s, m) ? 'wolf' : 'good';
  }
  return isWolf(s, p) ? 'wolf' : 'good';
}

/** 屠邊計算用的分類 */
function kindOf(s: GameState, p: Player): 'wolf' | 'god' | 'villager' | 'none' {
  if (!p.role) return 'none';
  if (isWolf(s, p)) return 'wolf';
  if (sideOf(s, p) !== 'good') return 'none';
  if (p.role === 'wildChild' || p.role === 'halfBlood') return 'villager';
  if (p.role === 'cupid') return 'god';
  const k = ROLES[p.role].kind;
  return k === 'god' ? 'god' : k === 'villager' ? 'villager' : 'none';
}

const isGod = (p: Player) => !!p.role && ROLES[p.role].kind === 'god';
/** 神職技能是否被封印（長老之死為永久；血月只封印當晚） */
function sealedNow(s: GameState, p: Player, night: boolean): boolean {
  return isGod(p) && (s.rs.goodSealed || (night && s.rs.sealNight === s.day));
}

/** 左右兩側最近的存活玩家 */
export function neighbors(s: GameState, id: string): Player[] {
  const ring = [...s.players].sort((a, b) => a.seat - b.seat);
  const n = ring.length;
  const i = ring.findIndex((p) => p.id === id);
  const res: Player[] = [];
  for (const dir of [1, -1]) {
    for (let k = 1; k < n; k++) {
      const q = ring[(((i + dir * k) % n) + n) % n];
      if (q.alive && q.id !== id) {
        if (!res.includes(q)) res.push(q);
        break;
      }
    }
  }
  return res;
}

/** 魔術師交換號碼牌後，技能實際作用的對象 */
function redirect(s: GameState, id: string): string {
  const sw = s.night?.swap;
  if (!sw) return id;
  if (id === sw[0]) return sw[1];
  if (id === sw[1]) return sw[0];
  return id;
}

// ───────────── 房間與大廳 ─────────────

export function freshRoleState(): RoleState {
  return {
    antidote: true,
    poison: true,
    guardLast: null,
    nightmareLast: null,
    silencerLast: null,
    dreamerLast: null,
    beautyLast: null,
    charmed: null,
    magicianUsed: [],
    knightUsed: false,
    foxLost: false,
    elderLives: 1,
    lovers: null,
    cupid: null,
    loversMixed: false,
    wildModel: null,
    wildTurned: false,
    halfModel: null,
    enchanted: [],
    thiefCards: [],
    goodSealed: false,
    sealNight: null,
    lastExiled: null,
    silenced: null,
    cursed: null,
    doomed: null,
  };
}

export function createState(code: string, now: number): GameState {
  return {
    code,
    createdAt: now,
    phase: 'lobby',
    hostId: '',
    players: [],
    config: { ...DEFAULT_CONFIG, roles: [...DEFAULT_CONFIG.roles] },
    gameNo: 0,
    day: 0,
    isNight: false,
    stage: null,
    stageSeq: 0,
    stageStart: now,
    deadline: null,
    flow: [],
    night: null,
    rs: freshRoleState(),
    sheriff: null,
    sheriffState: 'off',
    election: null,
    pendingDeaths: [],
    triggers: [],
    lastWords: [],
    deathCtx: 'night',
    fresh: [],
    speechPlan: null,
    botDone: [],
    log: [],
    priv: {},
    chat: [],
    winner: null,
    seq: 0,
  };
}

function cleanName(raw: unknown): string {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 12);
  return name || '無名氏';
}

function freeColor(s: GameState, want: string | undefined, selfId?: string): string {
  const used = new Set(s.players.filter((p) => p.id !== selfId).map((p) => p.color));
  if (want && COLORS.includes(want) && !used.has(want)) return want;
  return COLORS.find((c) => !used.has(c)) ?? COLORS[0];
}

function freeAvatar(s: GameState, want: string | undefined, selfId?: string): string {
  const used = new Set(s.players.filter((p) => p.id !== selfId).map((p) => p.avatar));
  if (want && AVATARS.includes(want) && !used.has(want)) return want;
  const free = AVATARS.filter((a) => !used.has(a));
  return free.length ? pickOne(free) : pickOne(AVATARS);
}

function uniqueName(s: GameState, name: string, selfId?: string): string {
  const used = new Set(s.players.filter((p) => p.id !== selfId).map((p) => p.name));
  if (!used.has(name)) return name;
  for (let i = 2; i < 99; i++) {
    const n = `${name.slice(0, 10)}${i}`;
    if (!used.has(n)) return n;
  }
  return name;
}

function syncAutoRoles(s: GameState) {
  if (s.config.auto) s.config.roles = defaultRoles(s.players.length);
}

export function addPlayer(s: GameState, profile: Partial<Profile>, isBot = false): Player {
  if (s.phase !== 'lobby') fail('遊戲已經開始，無法加入');
  if (s.players.length >= MAX_PLAYERS) fail(`房間已滿（最多 ${MAX_PLAYERS} 人）`);
  const p: Player = {
    id: rid(6),
    token: isBot ? '' : `${rid(12)}${rid(12)}`,
    name: uniqueName(s, cleanName(profile.name)),
    avatar: freeAvatar(s, profile.avatar),
    color: freeColor(s, profile.color),
    seat: s.players.length + 1,
    isBot,
    role: null,
    alive: true,
    canVote: true,
    revealed: null,
    cause: null,
    deathDay: null,
  };
  s.players.push(p);
  if (!s.hostId && !isBot) s.hostId = p.id;
  syncAutoRoles(s);
  return p;
}

function removePlayer(s: GameState, id: string) {
  s.players = s.players.filter((p) => p.id !== id);
  s.players.forEach((p, i) => (p.seat = i + 1));
  if (s.hostId === id) s.hostId = s.players.find((p) => !p.isBot)?.id ?? '';
  syncAutoRoles(s);
}

const UNIQUE_EXEMPT: RoleId[] = ['werewolf', 'villager'];

function sanitizeRoles(roles: unknown): RoleId[] {
  if (!Array.isArray(roles)) fail('無效的牌堆');
  const out: RoleId[] = [];
  for (const r of roles) {
    if (typeof r !== 'string' || !(r in ROLES)) continue;
    const id = r as RoleId;
    if (!UNIQUE_EXEMPT.includes(id) && out.includes(id)) continue;
    out.push(id);
  }
  return out.slice(0, MAX_PLAYERS + 2);
}

export function setConfig(s: GameState, patch: Partial<Config>) {
  const c = s.config;
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d;
  };
  if (patch.roles !== undefined) {
    c.roles = sanitizeRoles(patch.roles);
    c.auto = false;
  }
  if (patch.auto !== undefined) {
    c.auto = !!patch.auto;
    syncAutoRoles(s);
  }
  if (patch.sheriff !== undefined) c.sheriff = !!patch.sheriff;
  if (patch.winMode === 'edge' || patch.winMode === 'all') c.winMode = patch.winMode;
  if (patch.witchSelfSave && ['never', 'first', 'always'].includes(patch.witchSelfSave)) c.witchSelfSave = patch.witchSelfSave;
  if (patch.lastWords && ['first', 'always', 'none'].includes(patch.lastWords)) c.lastWords = patch.lastWords;
  if (patch.guardSaveClash !== undefined) c.guardSaveClash = !!patch.guardSaveClash;
  if (patch.speechSec !== undefined) c.speechSec = num(patch.speechSec, 15, 300, c.speechSec);
  if (patch.actionSec !== undefined) c.actionSec = num(patch.actionSec, 10, 120, c.actionSec);
  if (patch.voteSec !== undefined) c.voteSec = num(patch.voteSec, 10, 120, c.voteSec);
  if (patch.strictChat !== undefined) c.strictChat = !!patch.strictChat;
  if (patch.deadSeeAll !== undefined) c.deadSeeAll = !!patch.deadSeeAll;
}

export function startError(s: GameState): string | null {
  const n = s.players.length;
  const roles = s.config.roles;
  if (n < MIN_PLAYERS) return `至少需要 ${MIN_PLAYERS} 名玩家（目前 ${n} 人）`;
  const need = n + (roles.includes('thief') ? 2 : 0);
  if (roles.length !== need) {
    return roles.includes('thief')
      ? `含盜賊時牌堆需要 ${need} 張（玩家數 + 2），目前 ${roles.length} 張`
      : `牌堆需要 ${need} 張，目前 ${roles.length} 張`;
  }
  const wolves = roles.filter((r) => ROLES[r].camp === 'wolf').length;
  if (wolves < 1) return '至少需要 1 張狼人陣營的牌';
  if (wolves * 2 >= n) return '狼人數量必須少於玩家人數的一半';
  return null;
}

function toLobby(s: GameState) {
  s.phase = 'lobby';
  s.stage = null;
  s.deadline = null;
  s.flow = [];
  s.night = null;
  s.isNight = false;
  s.day = 0;
  s.winner = null;
  s.sheriff = null;
  s.election = null;
  s.pendingDeaths = [];
  s.triggers = [];
  s.lastWords = [];
  s.log = [];
  s.priv = {};
  s.chat = [];
  s.rs = freshRoleState();
  for (const p of s.players) {
    p.role = null;
    p.alive = true;
    p.canVote = true;
    p.revealed = null;
    p.cause = null;
    p.deathDay = null;
  }
  syncAutoRoles(s);
}

// ───────────── 階段機 ─────────────

function setStage(s: GameState, stage: Stage, now: number, dur: number) {
  s.stage = stage;
  s.stageSeq++;
  s.stageStart = now;
  s.deadline = now + dur;
  s.botDone = [];
}

/** 所有人都完成後，至少讓階段停留一小段時間再結束 */
function finishSoon(s: GameState, now: number, min = T.minStep) {
  s.deadline = Math.max(now, s.stageStart + min);
}

export function startGame(s: GameState, now: number) {
  if (s.phase !== 'lobby') fail('遊戲已經開始');
  const err = startError(s);
  if (err) fail(err);
  const n = s.players.length;
  let deck = shuffle(s.config.roles);
  let extra: RoleId[] = [];
  if (deck.includes('thief')) {
    // 盜賊牌一定要發到玩家手上，底牌才有意義
    const ti = deck.indexOf('thief');
    if (ti >= n) {
      const j = randInt(0, n - 1);
      [deck[ti], deck[j]] = [deck[j], deck[ti]];
    }
    extra = deck.slice(n);
    deck = deck.slice(0, n);
    // 至少要有一張狼人牌在玩家手上
    if (!deck.some((r) => ROLES[r].camp === 'wolf')) {
      const wi = extra.findIndex((r) => ROLES[r].camp === 'wolf');
      const di = pickOne(deck.map((r, i) => (r === 'thief' ? -1 : i)).filter((i) => i >= 0));
      [deck[di], extra[wi]] = [extra[wi], deck[di]];
    }
  }
  toLobby(s);
  s.config.roles = [...deck, ...extra].sort();
  s.players.forEach((p, i) => {
    p.seat = i + 1;
    p.role = deck[i];
  });
  s.gameNo++;
  s.phase = 'playing';
  s.isNight = true;
  s.flow = [{ t: 'night' }];
  s.rs.thiefCards = extra;
  s.sheriffState = s.config.sheriff ? 'pending' : 'off';
  s.deathCtx = 'night';
  s.fresh = [];
  s.speechPlan = null;
  log(s, 'sys', '遊戲開始，請確認自己的身分');
  for (const p of s.players) priv(s, p.id, `你的身分是【${roleName(p.role)}】`);
  setStage(s, { t: 'deal' }, now, T.deal);
}

export function computeWinner(s: GameState): Winner | null {
  const alive = living(s);
  const ids = (side: Side) => s.players.filter((p) => sideOf(s, p) === side).map((p) => p.id);

  const piper = alive.find((p) => p.role === 'piper');
  if (piper && alive.every((p) => p.id === piper.id || s.rs.enchanted.includes(p.id))) {
    return { camp: 'piper', reason: '所有存活的玩家都被吹笛者魅惑了', ids: [piper.id] };
  }

  const lv = s.rs.lovers;
  if (lv && s.rs.loversMixed && P(s, lv[0]).alive && P(s, lv[1]).alive) {
    const team = new Set<string>([lv[0], lv[1]]);
    if (s.rs.cupid) team.add(s.rs.cupid);
    if (alive.every((p) => team.has(p.id))) {
      return { camp: 'lovers', reason: '人狼戀的情侶活到了最後', ids: [...team] };
    }
    return null; // 情侶還活著時，其他陣營無法獲勝
  }

  const gods = alive.filter((p) => kindOf(s, p) === 'god').length;
  const vils = alive.filter((p) => kindOf(s, p) === 'villager').length;
  const hadGods = s.players.some((p) => kindOf(s, p) === 'god');
  const hadVils = s.players.some((p) => kindOf(s, p) === 'villager');
  const wolfWin = (reason: string): Winner => ({ camp: 'wolf', reason, ids: ids('wolf') });
  const wolves = alive.filter((p) => isWolf(s, p)).length;

  // 夜晚狼刀先於其他技能結算，因此同時達成時以狼人勝利為準
  if (s.config.winMode === 'edge') {
    if (hadGods && gods === 0) return wolfWin('所有神職都已出局（屠邊）');
    if (hadVils && vils === 0) return wolfWin('所有平民都已出局（屠邊）');
  } else if (gods + vils === 0) {
    return wolfWin('所有好人都已出局（屠城）');
  }
  if (wolves === 0) return { camp: 'good', reason: '所有狼人都已出局', ids: ids('good') };
  return null;
}

function endIfWon(s: GameState): boolean {
  if (s.phase !== 'playing') return true;
  const w = computeWinner(s);
  if (!w) return false;
  s.winner = w;
  s.phase = 'ended';
  s.stage = null;
  s.stageSeq++;
  s.deadline = null;
  s.flow = [];
  s.isNight = false;
  const name = { good: '好人陣營', wolf: '狼人陣營', lovers: '情侶陣營', piper: '吹笛者' }[w.camp];
  log(s, 'end', `遊戲結束，${name}獲勝！${w.reason}`);
  return true;
}

function next(s: GameState, now: number): void {
  if (endIfWon(s)) return;
  const item = s.flow.shift();
  if (!item) {
    s.flow = [{ t: 'night' }];
    return next(s, now);
  }
  switch (item.t) {
    case 'night':
      return beginNight(s, now);
    case 'sheriff':
      return beginSignup(s, now);
    case 'announce':
      return beginAnnounce(s, now, !!item.silent);
    case 'triggers':
      return beginTrigger(s, now);
    case 'lastWords':
      return beginLastWords(s, now);
    case 'order':
      return beginOrder(s, now);
    case 'speech':
      return beginSpeech(s, now, item.kind, item.ids);
    case 'vote':
      return beginVote(s, now, item.kind, item.round, item.candidates);
    case 'sheriffTally':
      return sheriffAfterSpeech(s, now);
    case 'resume': {
      const st = item.stage;
      if (st.t === 'speech') {
        if (!P(s, st.order[st.idx]).alive) return enterSpeaker(s, now, st.kind, st.order, st.idx + 1);
      }
      return setStage(s, st, now, item.remain);
    }
  }
}

/** 白天中途有人死亡且需要結算技能時，暫停目前階段 */
function interrupt(s: GameState, now: number) {
  const st = s.stage;
  if (!st) return next(s, now);
  const remain = Math.max(8000, (s.deadline ?? now) - now);
  s.flow.unshift({ t: 'triggers' }, { t: 'resume', stage: st, remain });
  next(s, now);
}

// ───────────── 死亡處理 ─────────────

function hasLastWords(s: GameState): boolean {
  switch (s.deathCtx) {
    case 'day':
      return true;
    case 'night':
      return s.config.lastWords === 'always' || (s.config.lastWords === 'first' && s.day === 1);
    default:
      return false;
  }
}

function kill(s: GameState, id: string, cause: DeathCause, by?: string) {
  const p = P(s, id);
  if (!p.alive) return;
  p.alive = false;
  p.cause = cause;
  p.deathDay = s.day;
  s.fresh.push(id);
  const night = s.deathCtx === 'night' || s.deathCtx === 'nightSilent';
  const feared = night && s.night?.fear === id;
  const passive: DeathCause[] = ['poison', 'lover', 'charm', 'dream'];

  if (p.role === 'hunter' && !passive.includes(cause) && !sealedNow(s, p, night) && !feared) {
    s.triggers.push({ t: 'shoot', id });
  }
  if (p.role === 'wolfKing' && !passive.includes(cause) && cause !== 'boom' && !feared) {
    s.triggers.push({ t: 'shoot', id });
  }
  if (s.sheriff === id) s.triggers.push({ t: 'badge', id });
  if (hasLastWords(s)) s.lastWords.push(id);

  if (p.role === 'elder' && !s.rs.goodSealed) {
    const byGood = cause === 'exile' || cause === 'poison' || (cause === 'shot' && !!by && P(s, by).role === 'hunter');
    if (byGood) {
      s.rs.goodSealed = true;
      log(s, 'skill', '長老死於好人之手，所有神職從此失去技能');
    }
  }

  const lv = s.rs.lovers;
  if (lv && lv.includes(id)) {
    const other = lv[0] === id ? lv[1] : lv[0];
    if (P(s, other).alive) kill(s, other, 'lover');
  }
  if (p.role === 'wolfBeauty' && s.rs.charmed && P(s, s.rs.charmed).alive) {
    kill(s, s.rs.charmed, 'charm');
  }
  if (p.role === 'dreamer' && night && s.night?.dream && P(s, s.night.dream).alive) {
    kill(s, s.night.dream, 'dream');
  }
  if (s.rs.wildModel === id && !s.rs.wildTurned) {
    const wc = s.players.find((q) => q.role === 'wildChild' && q.alive);
    if (wc) {
      s.rs.wildTurned = true;
      priv(s, wc.id, '你的榜樣死了！你變成了狼人，從現在起屬於狼人陣營', 'bad');
    }
  }
}

// ───────────── 夜晚 ─────────────

type NightStage = Extract<Stage, { t: 'night' }>;

function nightSteps(s: GameState): NightStep[] {
  const deck = new Set<string>(s.config.roles);
  return NIGHT_ORDER.filter((step) => {
    if (FIRST_NIGHT_ONLY.includes(step) && s.day !== 1) return false;
    if (step === 'witcher' && s.day < 2) return false;
    if (step === 'wolves') return true;
    return deck.has(step);
  });
}

function beginNight(s: GameState, now: number) {
  s.day += 1;
  s.isNight = true;
  s.rs.silenced = null;
  s.rs.cursed = null;
  s.speechPlan = null;
  s.fresh = [];
  s.lastWords = [];
  s.triggers = [];
  const rs = s.rs;
  const night: NightData = {
    steps: nightSteps(s),
    idx: -1,
    prev: {
      guard: rs.guardLast,
      nightmare: rs.nightmareLast,
      silencer: rs.silencerLast,
      beauty: rs.beautyLast,
      dreamer: rs.dreamerLast,
    },
    fear: null,
    swap: null,
    dream: null,
    guard: null,
    wolfPicks: {},
    wolfVictim: null,
    wolfBlocked: false,
    save: false,
    poison: null,
    witchId: null,
    seerReflect: null,
    hunt: null,
    witcherId: null,
    silence: null,
    curse: null,
  };
  rs.guardLast = rs.nightmareLast = rs.silencerLast = rs.beautyLast = rs.dreamerLast = null;
  s.night = night;
  log(s, 'night', `第 ${s.day} 夜，天黑請閉眼`);

  if (s.day > 1) {
    for (const g of living(s).filter((p) => p.role === 'gravekeeper')) {
      if (sealedNow(s, g, true)) {
        priv(s, g.id, '你的技能被封印，今晚無法得知放逐者的陣營', 'warn');
      } else if (rs.lastExiled) {
        const bad = isWolf(s, P(s, rs.lastExiled));
        priv(s, g.id, `⚰️ 昨天被放逐的 ${tag(s, rs.lastExiled)} 是${bad ? '狼人' : '好人'}`, bad ? 'bad' : 'good');
      } else {
        priv(s, g.id, '⚰️ 昨天沒有人被放逐');
      }
    }
  }
  rs.lastExiled = null;
  nextNightStep(s, now);
}

function stepActors(s: GameState, step: NightStep): Player[] {
  if (step === 'wolves') return wolfPack(s);
  return living(s).filter((p) => p.role === step);
}

function blockReason(s: GameState, p: Player, step: NightStep): string | null {
  const n = s.night;
  if (!n) return null;
  if (step === 'wolves') return n.wolfBlocked ? '有狼人被夢魘恐懼，今晚無法襲擊' : null;
  if (n.fear === p.id) return '你被夢魘恐懼了，今晚無法使用技能';
  if (sealedNow(s, p, true)) {
    return s.rs.goodSealed ? '長老死於好人之手，你已永久失去技能' : '血月降臨，你今晚的技能被封印';
  }
  if (step === 'witch' && !s.rs.antidote && !s.rs.poison) return '你的兩瓶藥都已經用完了';
  if (step === 'fox' && s.rs.foxLost) return '你已經失去了技能';
  if (step === 'magician' && living(s).filter((q) => !s.rs.magicianUsed.includes(q.id)).length < 2) {
    return '已經沒有可以交換的玩家了';
  }
  if (step === 'piper' && !living(s).some((q) => q.id !== p.id && !s.rs.enchanted.includes(q.id))) {
    return '所有人都已經被魅惑了';
  }
  return null;
}

function nextNightStep(s: GameState, now: number) {
  const n = s.night!;
  n.idx++;
  if (n.idx >= n.steps.length) return endNight(s, now);
  const step = n.steps[n.idx];
  const actors = stepActors(s, step);
  if (step === 'wolves') n.wolfBlocked = !!n.fear && isWolf(s, P(s, n.fear));
  const capable = actors.filter((a) => !blockReason(s, a, step));
  const dur = capable.length ? s.config.actionSec * 1000 : randInt(T.fakeMin, T.fakeMax);
  setStage(s, { t: 'night', step, actors: actors.map((a) => a.id), done: [] }, now, dur);
}

function thiefOptions(s: GameState): number[] {
  const cards = s.rs.thiefCards;
  const wolfIdx = cards.map((c, i) => (ROLES[c].camp === 'wolf' ? i : -1)).filter((i) => i >= 0);
  // 底牌恰有一張狼人牌時必須選狼
  if (wolfIdx.length === 1) return wolfIdx;
  return cards.map((_, i) => i);
}

function nightPrompt(s: GameState, me: Player, st: NightStage): Prompt | null {
  if (!st.actors.includes(me.id)) return null;
  const n = s.night!;
  const step = st.step;
  const id = `night:${step}`;
  const name = STEP_NAME[step];
  const block = blockReason(s, me, step);
  if (block) return { id, title: `${name}請睜眼`, desc: block, targets: [], min: 0, max: 0, options: [], blocked: true };
  if (step !== 'wolves' && st.done.includes(me.id)) {
    return { id, title: `${name}請睜眼`, desc: '已完成行動，請等待…', targets: [], min: 0, max: 0, options: [], done: true };
  }
  const all = living(s).map((p) => p.id);
  const others = all.filter((x) => x !== me.id);
  const skip = { id: 'skip', label: '不使用', style: 'ghost' as const };
  const one = (
    title: string,
    desc: string,
    targets: string[],
    action: { id: string; label: string; style?: 'primary' | 'danger' },
    canSkip = true,
  ): Prompt => ({
    id,
    title,
    desc,
    targets,
    min: 1,
    max: 1,
    options: [{ style: 'primary', ...action, needsTargets: true }, ...(canSkip ? [skip] : [])],
  });

  switch (step) {
    case 'thief': {
      const cards = s.rs.thiefCards;
      const allowed = thiefOptions(s);
      const forced = allowed.length === 1 && cards.length > 1;
      return {
        id,
        title: '盜賊請選擇身分',
        desc: `底牌：${cards.map((c) => roleName(c)).join('、')}${forced ? '。底牌有狼人牌，你必須選擇它' : ''}`,
        targets: [],
        min: 0,
        max: 0,
        options: allowed.map((i) => ({ id: `card${i}`, label: `成為${roleName(cards[i])}`, style: 'primary' as const })),
      };
    }
    case 'cupid':
      return {
        id,
        title: '丘比特請選擇情侶',
        desc: '選擇兩名玩家成為情侶（可以包含自己）',
        targets: all,
        min: 2,
        max: 2,
        options: [{ id: 'link', label: '連結為情侶', style: 'primary', needsTargets: true }],
      };
    case 'halfBlood':
      return one('混血兒請認親', '你的陣營將與他相同', others, { id: 'pick', label: '認親' }, false);
    case 'wildChild':
      return one('野孩子請選擇榜樣', '榜樣死亡後你會變成狼人', others, { id: 'pick', label: '選為榜樣' }, false);
    case 'nightmare':
      return one(
        '夢魘請選擇恐懼的對象',
        '被恐懼的玩家今晚無法使用技能；恐懼狼隊友會導致今晚無法襲擊',
        others.filter((x) => x !== n.prev.nightmare),
        { id: 'fear', label: '恐懼', style: 'danger' },
      );
    case 'magician':
      return {
        id,
        title: '魔術師請選擇交換的對象',
        desc: '選擇兩名玩家交換號碼牌，每人整局只能被交換一次',
        targets: all.filter((x) => !s.rs.magicianUsed.includes(x)),
        min: 2,
        max: 2,
        options: [{ id: 'swap', label: '交換', style: 'primary', needsTargets: true }, skip],
      };
    case 'dreamer':
      return one(
        '攝夢人請選擇夢遊者',
        n.prev.dreamer ? `昨晚的夢遊者是 ${tag(s, n.prev.dreamer)}，連續兩晚會使他死亡` : '夢遊者今晚免疫夜間傷害',
        others,
        { id: 'dream', label: '攝夢' },
        false,
      );
    case 'guard':
      return one(
        '守衛請選擇守護的對象',
        n.prev.guard ? `昨晚守護了 ${tag(s, n.prev.guard)}，不能連續守護同一人` : '可以守護自己',
        all.filter((x) => x !== n.prev.guard),
        { id: 'guard', label: '守護' },
      );
    case 'wolves':
      return {
        id,
        title: '狼人請選擇襲擊的對象',
        desc: '與狼隊友達成一致即可提前結束；時間到則以多數決定',
        targets: all,
        min: 1,
        max: 1,
        options: [
          { id: 'kill', label: '襲擊', style: 'danger', needsTargets: true },
          { id: 'none', label: '空刀', style: 'ghost' },
        ],
        picks: { ...n.wolfPicks },
      };
    case 'wolfBeauty':
      return one(
        '狼美人請選擇魅惑的對象',
        '你出局時，被魅惑的玩家會跟著殉情',
        others.filter((x) => x !== n.prev.beauty),
        { id: 'charm', label: '魅惑', style: 'danger' },
      );
    case 'gargoyle':
      return one('石像鬼請選擇查驗的對象', '你會得知他的具體身分', others, { id: 'check', label: '查驗' });
    case 'witch': {
      const rs = s.rs;
      const v = n.wolfVictim;
      let desc: string;
      const options: Prompt['options'] = [];
      if (rs.antidote) {
        if (v) {
          desc = `今晚 ${tag(s, v)} 被襲擊了`;
          const self = v === me.id;
          const allowSelf =
            s.config.witchSelfSave === 'always' || (s.config.witchSelfSave === 'first' && s.day === 1);
          if (!self || allowSelf) options.push({ id: 'save', label: `用解藥救 ${tag(s, v)}`, style: 'primary' });
          else desc += '（依規則你無法自救）';
        } else {
          desc = '今晚沒有人被襲擊';
        }
      } else {
        desc = '解藥已經用掉了，無法得知今晚的死訊';
      }
      if (rs.poison) options.push({ id: 'poison', label: '使用毒藥', style: 'danger', needsTargets: true });
      options.push(skip);
      return { id, title: '女巫請行動', desc, targets: rs.poison ? others : [], min: 1, max: 1, options };
    }
    case 'seer':
      return one('預言家請選擇查驗的對象', '你會得知他是好人還是狼人', others, { id: 'check', label: '查驗' });
    case 'psychic':
      return one('通靈師請選擇查驗的對象', '你會得知他的具體身分', others, { id: 'check', label: '查驗' });
    case 'fox':
      return one('狐狸請選擇查驗的對象', '你會得知他與左右兩人之中是否有狼人', all, { id: 'check', label: '查驗三人' });
    case 'witcher':
      return one(
        '獵魔人請選擇狩獵的對象',
        '對方是狼人則他出局；是好人則你出局',
        others,
        { id: 'hunt', label: '狩獵', style: 'danger' },
      );
    case 'silencer':
      return one(
        '禁言長老請選擇禁言的對象',
        '他明天將無法發言',
        others.filter((x) => x !== n.prev.silencer),
        { id: 'silence', label: '禁言' },
      );
    case 'crow':
      return one('烏鴉請選擇詛咒的對象', '他明天的放逐投票會額外多一票', others, { id: 'curse', label: '詛咒' });
    case 'piper':
      return {
        id,
        title: '吹笛者請選擇魅惑的對象',
        desc: '最多選擇兩名尚未被魅惑的玩家',
        targets: others.filter((x) => !s.rs.enchanted.includes(x)),
        min: 1,
        max: 2,
        options: [{ id: 'enchant', label: '魅惑', style: 'primary', needsTargets: true }, skip],
      };
  }
}

function linkLovers(s: GameState, cupid: Player, a: string, b: string) {
  s.rs.lovers = [a, b];
  s.rs.cupid = cupid.id;
  const wa = isWolf(s, P(s, a));
  const wb = isWolf(s, P(s, b));
  s.rs.loversMixed = wa !== wb;
  const note = s.rs.loversMixed
    ? '你們是人狼戀，與丘比特組成第三方，必須活到只剩你們才能獲勝'
    : wa
      ? '你們同屬狼人陣營'
      : '你們同屬好人陣營';
  priv(s, a, `💘 你和 ${tag(s, b)} 成為情侶，一方死亡另一方會殉情。${note}`, 'warn');
  if (b !== a) priv(s, b, `💘 你和 ${tag(s, a)} 成為情侶，一方死亡另一方會殉情。${note}`, 'warn');
  if (cupid.id !== a && cupid.id !== b) {
    const mine = s.rs.loversMixed ? '他們是人狼戀，你與他們同為第三方' : wa ? '你屬於狼人陣營' : '你屬於好人陣營';
    priv(s, cupid.id, `💘 你讓 ${tag(s, a)} 和 ${tag(s, b)} 成為情侶。${mine}`);
  }
}

function applyNight(s: GameState, me: Player, st: NightStage, option: string, targets: string[]) {
  const n = s.night!;
  const rs = s.rs;
  const t0 = targets[0];
  switch (st.step) {
    case 'thief': {
      const i = Number(option.replace('card', ''));
      const card = rs.thiefCards[i];
      if (!card) fail('無效的選擇');
      me.role = card;
      rs.thiefCards = rs.thiefCards.filter((_, k) => k !== i);
      priv(s, me.id, `🦹 你選擇成為【${roleName(card)}】`);
      break;
    }
    case 'cupid':
      linkLovers(s, me, targets[0], targets[1]);
      break;
    case 'halfBlood':
      rs.halfModel = t0;
      priv(s, me.id, `🧬 你向 ${tag(s, t0)} 認親，你的陣營與他相同`);
      break;
    case 'wildChild':
      rs.wildModel = t0;
      priv(s, me.id, `🧒 你選擇 ${tag(s, t0)} 作為榜樣`);
      break;
    case 'nightmare':
      if (option === 'fear') {
        n.fear = t0;
        rs.nightmareLast = t0;
        priv(s, me.id, `😱 你恐懼了 ${tag(s, t0)}`);
      }
      break;
    case 'magician':
      if (option === 'swap') {
        n.swap = [targets[0], targets[1]];
        rs.magicianUsed.push(targets[0], targets[1]);
        priv(s, me.id, `🎩 你交換了 ${tag(s, targets[0])} 和 ${tag(s, targets[1])} 的號碼牌`);
      }
      break;
    case 'dreamer':
      n.dream = redirect(s, t0);
      rs.dreamerLast = n.dream;
      priv(s, me.id, `💤 你讓 ${tag(s, t0)} 成為夢遊者`);
      break;
    case 'guard':
      if (option === 'guard') {
        n.guard = redirect(s, t0);
        rs.guardLast = t0;
        priv(s, me.id, `🛡️ 你守護了 ${tag(s, t0)}`);
      }
      break;
    case 'wolves':
      n.wolfPicks[me.id] = option === 'kill' ? t0 : null;
      break;
    case 'wolfBeauty':
      if (option === 'charm') {
        rs.charmed = redirect(s, t0);
        rs.beautyLast = t0;
        priv(s, me.id, `💋 你魅惑了 ${tag(s, t0)}`);
      }
      break;
    case 'gargoyle':
    case 'psychic':
      if (option === 'check') {
        const tgt = P(s, redirect(s, t0));
        priv(s, me.id, `${ROLES[me.role!].icon} ${tag(s, t0)} 的身分是【${roleName(tgt.role)}】`, isWolf(s, tgt) ? 'bad' : 'good');
      }
      break;
    case 'witch':
      n.witchId = me.id;
      if (option === 'save') {
        if (!rs.antidote || !n.wolfVictim) fail('無法使用解藥');
        n.save = true;
        rs.antidote = false;
        priv(s, me.id, `🧪 你對 ${tag(s, n.wolfVictim)} 使用了解藥`, 'good');
      } else if (option === 'poison') {
        if (!rs.poison) fail('毒藥已經用掉了');
        n.poison = redirect(s, t0);
        rs.poison = false;
        priv(s, me.id, `☠️ 你對 ${tag(s, t0)} 使用了毒藥`, 'bad');
      }
      break;
    case 'seer':
      if (option === 'check') {
        const tgt = P(s, redirect(s, t0));
        const bad = seerWolf(s, tgt);
        priv(s, me.id, `🔮 ${tag(s, t0)} 是${bad ? '狼人' : '好人'}`, bad ? 'bad' : 'good');
        if (tgt.role === 'evilKnight') n.seerReflect = me.id;
      }
      break;
    case 'fox':
      if (option === 'check') {
        const tgt = P(s, redirect(s, t0));
        const group = [tgt, ...neighbors(s, tgt.id)];
        const has = group.some((q) => isWolf(s, q));
        if (!has) rs.foxLost = true;
        priv(
          s,
          me.id,
          `🦊 ${tag(s, t0)} 與左右兩人之中${has ? '有狼人' : '沒有狼人，你失去了技能'}`,
          has ? 'bad' : 'good',
        );
      }
      break;
    case 'witcher':
      if (option === 'hunt') {
        n.hunt = redirect(s, t0);
        n.witcherId = me.id;
        priv(s, me.id, `🗡️ 你狩獵了 ${tag(s, t0)}`);
      }
      break;
    case 'silencer':
      if (option === 'silence') {
        n.silence = redirect(s, t0);
        rs.silencerLast = t0;
        priv(s, me.id, `🤐 你禁言了 ${tag(s, t0)}`);
      }
      break;
    case 'crow':
      if (option === 'curse') {
        n.curse = redirect(s, t0);
        priv(s, me.id, `🪶 你詛咒了 ${tag(s, t0)}`);
      }
      break;
    case 'piper':
      if (option === 'enchant') {
        for (const t of targets) {
          const r = redirect(s, t);
          if (r === me.id || rs.enchanted.includes(r)) continue;
          rs.enchanted.push(r);
          priv(s, r, '🎶 你被吹笛者魅惑了', 'warn');
        }
        priv(s, me.id, `🎶 你魅惑了 ${tags(s, targets)}`);
      }
      break;
  }
}

function actNight(s: GameState, me: Player, st: NightStage, option: string, targets: string[], now: number) {
  applyNight(s, me, st, option, targets);
  if (!st.done.includes(me.id)) st.done.push(me.id);
  if (st.step === 'wolves') {
    const picks = s.night!.wolfPicks;
    const all = st.actors.every((a) => a in picks);
    if (all && new Set(st.actors.map((a) => picks[a])).size === 1) finishSoon(s, now);
    return;
  }
  const capable = st.actors.filter((a) => !blockReason(s, P(s, a), st.step));
  if (capable.every((a) => st.done.includes(a))) finishSoon(s, now);
}

function endNightStep(s: GameState, now: number) {
  const st = s.stage as NightStage;
  const n = s.night!;
  const pending = st.actors
    .filter((a) => !st.done.includes(a))
    .map((a) => P(s, a))
    .filter((p) => !blockReason(s, p, st.step));
  // 第一晚的必要選擇若逾時，由系統隨機決定
  for (const p of pending) {
    const others = living(s).filter((q) => q.id !== p.id).map((q) => q.id);
    if (st.step === 'thief') applyNight(s, p, st, `card${pickOne(thiefOptions(s))}`, []);
    else if (st.step === 'cupid') applyNight(s, p, st, 'link', shuffle(living(s).map((q) => q.id)).slice(0, 2));
    else if (st.step === 'halfBlood' || st.step === 'wildChild') applyNight(s, p, st, 'pick', [pickOne(others)]);
  }
  if (st.step === 'wolves') {
    n.wolfVictim = null;
    if (!n.wolfBlocked) {
      const count = new Map<string, number>();
      for (const w of st.actors) {
        const t = n.wolfPicks[w];
        if (t) count.set(t, (count.get(t) ?? 0) + 1);
      }
      if (count.size) {
        const max = Math.max(...count.values());
        const tops = [...count].filter(([, c]) => c === max).map(([t]) => t);
        n.wolfVictim = redirect(s, pickOne(tops));
      }
    }
  }
  nextNightStep(s, now);
}

function resolveNight(s: GameState): { id: string; cause: DeathCause }[] {
  const n = s.night!;
  const out = new Map<string, DeathCause>();
  const role = (id: string) => P(s, id).role;
  const immune = (id: string) => n.dream === id || role(id) === 'evilKnight';

  const v = n.wolfVictim;
  if (v && P(s, v).alive && !immune(v)) {
    const guarded = n.guard === v;
    if (guarded && n.save) {
      if (s.config.guardSaveClash) out.set(v, 'wolf');
    } else if (guarded || n.save) {
      // 被救下
    } else if (role(v) === 'elder' && s.rs.elderLives > 0) {
      s.rs.elderLives--;
    } else {
      out.set(v, 'wolf');
    }
  }
  if (n.poison && P(s, n.poison).alive) {
    const t = n.poison;
    if (role(t) === 'evilKnight') {
      if (n.witchId && !immune(n.witchId)) out.set(n.witchId, 'reflect');
    } else if (!immune(t) && role(t) !== 'witcher') {
      out.set(t, 'poison');
    }
  }
  if (n.hunt && n.witcherId && P(s, n.hunt).alive) {
    if (isWolf(s, P(s, n.hunt))) {
      if (!immune(n.hunt)) out.set(n.hunt, 'hunt');
    } else if (!immune(n.witcherId)) {
      out.set(n.witcherId, 'backfire');
    }
  }
  if (n.seerReflect && !immune(n.seerReflect) && !out.has(n.seerReflect)) out.set(n.seerReflect, 'reflect');
  if (n.dream && n.prev.dreamer === n.dream && P(s, n.dream).alive) out.set(n.dream, 'dream');
  if (s.rs.doomed) {
    if (P(s, s.rs.doomed).alive) out.set(s.rs.doomed, 'exile');
    s.rs.doomed = null;
  }
  return bySeat(s, [...out.keys()]).map((id) => ({ id, cause: out.get(id)! }));
}

function endNight(s: GameState, now: number) {
  s.pendingDeaths = resolveNight(s);
  s.isNight = false;
  log(s, 'day', `第 ${s.day} 天，天亮了`);
  s.flow = [];
  if (s.sheriffState === 'pending' || s.sheriffState === 'postponed') s.flow.push({ t: 'sheriff' });
  s.flow.push(
    { t: 'announce' },
    { t: 'order' },
    { t: 'speech', kind: 'day' },
    { t: 'vote', kind: 'exile', round: 1 },
    { t: 'night' },
  );
  next(s, now);
}

// ───────────── 白天：公布死訊、技能、遺言 ─────────────

function beginAnnounce(s: GameState, now: number, silent: boolean) {
  s.deathCtx = silent ? 'nightSilent' : 'night';
  const before = s.fresh.length && silent ? [...s.fresh] : [];
  s.fresh = [];
  const pend = s.pendingDeaths;
  s.pendingDeaths = [];
  for (const d of pend) kill(s, d.id, d.cause);
  const deaths = bySeat(s, [...s.fresh]);
  s.fresh = [...before, ...deaths];
  log(s, 'death', deaths.length ? `昨夜出局的玩家：${tags(s, deaths)}` : '昨夜是平安夜，沒有人出局');

  let bear: boolean | null = null;
  if (s.config.roles.includes('bear')) {
    const b = living(s).find((p) => p.role === 'bear');
    bear = !!b && !s.rs.goodSealed && neighbors(s, b.id).some((q) => isWolf(s, q));
    log(s, 'day', bear ? '🐻 熊咆哮了！' : '🐻 熊沒有咆哮');
  }
  // 禁言與詛咒在公布死訊時才生效，避免提前洩漏
  s.rs.silenced = s.night?.silence ?? null;
  s.rs.cursed = s.night?.curse ?? null;
  if (!silent) {
    if (s.rs.silenced && P(s, s.rs.silenced).alive) log(s, 'day', `🤐 ${tag(s, s.rs.silenced)} 被禁言，今天無法發言`);
    if (s.rs.cursed && P(s, s.rs.cursed).alive) log(s, 'day', `🪶 ${tag(s, s.rs.cursed)} 被烏鴉詛咒，放逐投票時額外多一票`);
  }
  s.flow.unshift({ t: 'triggers' }, { t: 'lastWords' });
  setStage(s, { t: 'announce', deaths, bear }, now, T.announce);
}

function beginTrigger(s: GameState, now: number) {
  while (s.triggers.length) {
    const trig = s.triggers.shift()!;
    const p = P(s, trig.id);
    if (!living(s).length) continue;
    if (trig.t === 'shoot') {
      if (p.role === 'hunter' && s.rs.goodSealed) continue;
    } else if (s.sheriff !== trig.id) {
      continue;
    }
    setStage(s, { t: 'trigger', trig }, now, s.config.actionSec * 1000);
    return;
  }
  next(s, now);
}

function beginLastWords(s: GameState, now: number) {
  const id = s.lastWords.shift();
  if (!id) return next(s, now);
  s.flow.unshift({ t: 'lastWords' });
  setStage(s, { t: 'lastWords', id }, now, s.config.speechSec * 1000);
}

// ───────────── 白天：發言 ─────────────

function sheriffOrder(s: GameState, asc: boolean): string[] {
  const ring = living(s).sort((a, b) => a.seat - b.seat);
  const i = ring.findIndex((p) => p.id === s.sheriff);
  if (i < 0) return ring.map((p) => p.id);
  const n = ring.length;
  const out: string[] = [];
  for (let k = 1; k <= n; k++) out.push(ring[(((i + (asc ? k : -k)) % n) + n) % n].id);
  return out; // 警長最後發言
}

function autoOrder(s: GameState): string[] {
  const ring = living(s).sort((a, b) => a.seat - b.seat);
  if (!ring.length) return [];
  let start: number;
  if (s.fresh.length) {
    // 從死者的下一位開始
    const anchor = Math.min(...s.fresh.map((id) => P(s, id).seat));
    start = ring.findIndex((p) => p.seat > anchor);
    if (start < 0) start = 0;
  } else {
    start = randInt(0, ring.length - 1);
  }
  return [...ring.slice(start), ...ring.slice(0, start)].map((p) => p.id);
}

function beginOrder(s: GameState, now: number) {
  if (s.sheriff && P(s, s.sheriff).alive) {
    setStage(s, { t: 'order' }, now, T.order);
    return;
  }
  s.speechPlan = autoOrder(s);
  next(s, now);
}

function beginSpeech(s: GameState, now: number, kind: SpeechKind, ids?: string[]) {
  const order = kind === 'day' ? (s.speechPlan ?? autoOrder(s)) : (ids ?? []);
  enterSpeaker(s, now, kind, order, 0);
}

function enterSpeaker(s: GameState, now: number, kind: SpeechKind, order: string[], idx: number) {
  const election = kind === 'sheriff' || kind === 'sheriffPk';
  while (idx < order.length) {
    const id = order[idx];
    const p = P(s, id);
    if (!p.alive) idx++;
    else if (election && !s.election?.candidates.includes(id)) idx++;
    else if (!election && s.rs.silenced === id) {
      log(s, 'day', `🤐 ${tag(s, id)} 被禁言，跳過發言`);
      idx++;
    } else break;
  }
  if (idx >= order.length) return next(s, now);
  setStage(s, { t: 'speech', kind, order, idx }, now, s.config.speechSec * 1000);
}

// ───────────── 警長競選 ─────────────

function beginSignup(s: GameState, now: number) {
  s.election = { ran: [], candidates: [], withdrawn: [] };
  log(s, 'sheriff', '警長競選開始，請決定是否上警');
  setStage(s, { t: 'signup', choice: {} }, now, T.signup);
}

function elect(s: GameState, id: string) {
  s.sheriff = id;
  s.sheriffState = 'done';
  log(s, 'sheriff', `⭐ ${tag(s, id)} 當選警長（放逐投票計 1.5 票）`);
}

function badgeLost(s: GameState, reason: string) {
  s.sheriff = null;
  s.sheriffState = 'lost';
  log(s, 'sheriff', `${reason}，警徽流失`);
}

function endSignup(s: GameState, now: number) {
  const st = s.stage as Extract<Stage, { t: 'signup' }>;
  const ran = bySeat(s, living(s).filter((p) => st.choice[p.id]).map((p) => p.id));
  s.election = { ran, candidates: [...ran], withdrawn: [] };
  if (!ran.length) {
    s.sheriffState = 'done';
    log(s, 'sheriff', '沒有人上警，本局沒有警長');
    return next(s, now);
  }
  log(s, 'sheriff', `上警的玩家：${tags(s, ran)}`);
  if (ran.length === 1) {
    elect(s, ran[0]);
    return next(s, now);
  }
  const k = randInt(0, ran.length - 1);
  const order = [...ran.slice(k), ...ran.slice(0, k)];
  s.flow.unshift({ t: 'speech', kind: 'sheriff', ids: order }, { t: 'sheriffTally' });
  next(s, now);
}

function sheriffAfterSpeech(s: GameState, now: number) {
  const c = s.election?.candidates ?? [];
  if (c.length === 0) badgeLost(s, '所有候選人都退水了');
  else if (c.length === 1) elect(s, c[0]);
  else s.flow.unshift({ t: 'vote', kind: 'sheriff', round: 1, candidates: [...c] });
  next(s, now);
}

// ───────────── 投票 ─────────────

function beginVote(s: GameState, now: number, kind: VoteKind, round: 1 | 2, cands?: string[]) {
  let candidates: string[];
  let voters: string[];
  if (kind === 'exile') {
    candidates = (cands ?? living(s).map((p) => p.id)).filter((id) => {
      const p = P(s, id);
      return p.alive && p.revealed !== 'idiot' && s.rs.doomed !== id;
    });
    voters = living(s)
      .filter((p) => p.canVote && (round === 1 || !candidates.includes(p.id)))
      .map((p) => p.id);
    if (!candidates.length || !voters.length) {
      log(s, 'vote', '沒有可以投票的玩家，今天沒有人被放逐');
      return next(s, now);
    }
  } else {
    const e = s.election!;
    candidates = (cands ?? e.candidates).filter((id) => e.candidates.includes(id) && P(s, id).alive);
    if (candidates.length === 0) {
      badgeLost(s, '所有候選人都退水了');
      return next(s, now);
    }
    if (candidates.length === 1) {
      elect(s, candidates[0]);
      return next(s, now);
    }
    voters = living(s)
      .filter((p) => (round === 1 ? !e.ran.includes(p.id) : !candidates.includes(p.id) && !e.withdrawn.includes(p.id)))
      .map((p) => p.id);
    if (!voters.length) {
      badgeLost(s, '沒有可以投票的玩家');
      return next(s, now);
    }
  }
  setStage(s, { t: 'vote', kind, round, candidates, voters, votes: {} }, now, s.config.voteSec * 1000);
}

function endVote(s: GameState, now: number) {
  const st = s.stage as Extract<Stage, { t: 'vote' }>;
  const votes: Record<string, string | null> = {};
  for (const v of st.voters) votes[v] = st.votes[v] ?? null;
  const tally: Record<string, number> = {};
  for (const [v, t] of Object.entries(votes)) {
    if (t) tally[t] = (tally[t] ?? 0) + (st.kind === 'exile' && s.sheriff === v ? 1.5 : 1);
  }
  const cursed = s.rs.cursed;
  if (st.kind === 'exile' && cursed && st.candidates.includes(cursed)) tally[cursed] = (tally[cursed] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(tally));
  const top = max > 0 ? bySeat(s, Object.keys(tally).filter((k) => tally[k] === max)) : [];

  const lines: string[] = [st.kind === 'sheriff' ? '警長投票結果：' : st.round === 2 ? 'PK 投票結果：' : '放逐投票結果：'];
  for (const c of bySeat(s, Object.keys(tally)).sort((a, b) => tally[b] - tally[a])) {
    const from = bySeat(s, st.voters.filter((v) => votes[v] === c));
    const extra = st.kind === 'exile' && cursed === c ? '＋烏鴉詛咒' : '';
    lines.push(`${tag(s, c)}（${tally[c]} 票）← ${from.length ? tags(s, from) : '—'}${extra}`);
  }
  const abstain = st.voters.filter((v) => !votes[v]);
  if (abstain.length) lines.push(`棄票：${tags(s, abstain)}`);
  log(s, 'vote', lines.join('\n'));
  setStage(s, { t: 'voteResult', kind: st.kind, round: st.round, votes, tally, top }, now, T.voteResult);
}

function exile(s: GameState, id: string) {
  const p = P(s, id);
  if (p.role === 'idiot' && !p.revealed && !s.rs.goodSealed) {
    p.revealed = 'idiot';
    p.canVote = false;
    log(s, 'skill', `🤪 ${tag(s, id)} 被投票放逐，翻牌為【白痴】免於出局，但從此失去投票權`);
    return;
  }
  s.rs.lastExiled = id;
  if (p.role === 'bloodMoon' && living(s).filter((q) => isWolf(s, q)).length === 1) {
    s.rs.doomed = id;
    p.revealed = 'bloodMoon';
    log(s, 'skill', `🩸 ${tag(s, id)} 被放逐，翻牌為【血月使徒】。身為最後一隻狼，將在下個天亮後才出局`);
    return;
  }
  log(s, 'death', `${tag(s, id)} 被放逐出局`);
  s.deathCtx = 'day';
  s.fresh = [];
  kill(s, id, 'exile');
  s.flow.unshift({ t: 'triggers' }, { t: 'lastWords' });
}

function endVoteResult(s: GameState, now: number) {
  const st = s.stage as Extract<Stage, { t: 'voteResult' }>;
  const { top } = st;
  if (st.kind === 'sheriff') {
    if (top.length === 1) elect(s, top[0]);
    else if (top.length === 0) badgeLost(s, '沒有人投票');
    else if (st.round === 1) {
      log(s, 'sheriff', `${tags(s, top)} 平票，進入 PK 發言`);
      s.flow.unshift({ t: 'speech', kind: 'sheriffPk', ids: top }, { t: 'vote', kind: 'sheriff', round: 2, candidates: top });
    } else badgeLost(s, '再次平票');
    return next(s, now);
  }
  if (top.length === 1) exile(s, top[0]);
  else if (top.length === 0) log(s, 'vote', '沒有人投票，今天沒有人被放逐');
  else if (st.round === 1) {
    log(s, 'vote', `${tags(s, top)} 平票，進入 PK 發言`);
    s.flow.unshift({ t: 'speech', kind: 'pk', ids: top }, { t: 'vote', kind: 'exile', round: 2, candidates: top });
  } else log(s, 'vote', '再次平票，今天沒有人被放逐');
  next(s, now);
}

// ───────────── 逾時 ─────────────

export function onTimeout(s: GameState, now: number) {
  const st = s.stage;
  if (s.phase !== 'playing' || !st) return;
  switch (st.t) {
    case 'deal':
    case 'announce':
    case 'lastWords':
      return next(s, now);
    case 'night':
      return endNightStep(s, now);
    case 'signup':
      return endSignup(s, now);
    case 'speech':
      return enterSpeaker(s, now, st.kind, st.order, st.idx + 1);
    case 'vote':
      return endVote(s, now);
    case 'voteResult':
      return endVoteResult(s, now);
    case 'trigger':
      if (st.trig.t === 'badge' && s.sheriff === st.trig.id) {
        s.sheriff = null;
        log(s, 'sheriff', '警徽沒有被移交，警徽流失');
      }
      if (endIfWon(s)) return;
      return beginTrigger(s, now);
    case 'order':
      s.speechPlan = sheriffOrder(s, rnd() < 0.5);
      return next(s, now);
  }
}

// ───────────── 提示與操作 ─────────────

const CAN_BOOM: RoleId[] = ['werewolf', 'wolfKing', 'whiteWolfKing', 'nightmare', 'bloodMoon'];

export function getPrompt(s: GameState, pid: string): Prompt | null {
  const st = s.stage;
  if (s.phase !== 'playing' || !st) return null;
  const me = P(s, pid);
  const alive = living(s).map((p) => p.id);
  switch (st.t) {
    case 'night':
      return nightPrompt(s, me, st);
    case 'signup':
      if (!me.alive) return null;
      if (pid in st.choice) {
        return { id: 'signup', title: '警長競選', desc: st.choice[pid] ? '你選擇上警，等待其他玩家…' : '你選擇不上警，等待其他玩家…', targets: [], min: 0, max: 0, options: [], done: true };
      }
      return {
        id: 'signup',
        title: '警長競選',
        desc: '警長在放逐投票時擁有 1.5 票，並決定發言順序。要參選嗎？',
        targets: [],
        min: 0,
        max: 0,
        options: [
          { id: 'run', label: '我要上警', style: 'primary' },
          { id: 'pass', label: '不上警', style: 'ghost' },
        ],
      };
    case 'vote': {
      if (!st.voters.includes(pid)) return null;
      const title = st.kind === 'sheriff' ? '請投票選出警長' : st.round === 2 ? 'PK 投票：請選擇放逐的對象' : '請投票放逐一名玩家';
      if (pid in st.votes) {
        const v = st.votes[pid];
        return { id: 'vote', title, desc: v ? `你投給了 ${tag(s, v)}，等待其他玩家…` : '你選擇棄票，等待其他玩家…', targets: [], min: 0, max: 0, options: [], done: true };
      }
      return {
        id: 'vote',
        title,
        desc: st.kind === 'exile' && s.sheriff === pid ? '你是警長，這一票計 1.5 票' : '投票後無法更改',
        targets: st.candidates.filter((c) => c !== pid),
        min: 1,
        max: 1,
        options: [
          { id: 'vote', label: '投票', style: 'primary', needsTargets: true },
          { id: 'abstain', label: '棄票', style: 'ghost' },
        ],
      };
    }
    case 'trigger':
      if (st.trig.id !== pid) return null;
      if (st.trig.t === 'shoot') {
        return {
          id: 'shoot',
          title: '你出局了，要發動技能嗎？',
          desc: '可以開槍帶走一名玩家',
          targets: alive,
          min: 1,
          max: 1,
          options: [
            { id: 'shoot', label: '開槍', style: 'danger', needsTargets: true },
            { id: 'skip', label: '不開槍', style: 'ghost' },
          ],
        };
      }
      return {
        id: 'badge',
        title: '請移交警徽',
        desc: '選擇一名玩家繼任警長，或撕毀警徽',
        targets: alive,
        min: 1,
        max: 1,
        options: [
          { id: 'pass', label: '移交警徽', style: 'primary', needsTargets: true },
          { id: 'destroy', label: '撕毀警徽', style: 'ghost' },
        ],
      };
    case 'order':
      if (s.sheriff !== pid) return null;
      return {
        id: 'order',
        title: '警長請決定發言順序',
        desc: '警長最後發言',
        targets: [],
        min: 0,
        max: 0,
        options: [
          { id: 'asc', label: '從我的下一號開始（順序）', style: 'primary' },
          { id: 'desc', label: '從我的上一號開始（逆序）', style: 'primary' },
        ],
      };
    default:
      return null;
  }
}

/** 不需等待輪次、隨時可發動的操作（結束發言、退水、自爆、決鬥） */
export function getSkills(s: GameState, pid: string): Prompt[] {
  const st = s.stage;
  if (s.phase !== 'playing' || !st) return [];
  const me = P(s, pid);
  const out: Prompt[] = [];
  const simple = (id: string, label: string, style: 'primary' | 'danger' | 'ghost' = 'primary'): Prompt => ({
    id,
    title: label,
    targets: [],
    min: 0,
    max: 0,
    options: [{ id, label, style }],
  });
  if (st.t === 'lastWords' && st.id === pid) out.push(simple('endSpeech', '結束遺言'));
  if (st.t !== 'speech') return out;

  const election = st.kind === 'sheriff' || st.kind === 'sheriffPk';
  if (st.order[st.idx] === pid) out.push(simple('endSpeech', '結束發言'));
  if (election && s.election?.candidates.includes(pid)) out.push(simple('withdraw', '退水', 'ghost'));
  if (!me.alive || !me.role) return out;
  const others = living(s).filter((p) => p.id !== pid).map((p) => p.id);

  const canBoom = (CAN_BOOM.includes(me.role) || (me.role === 'wildChild' && s.rs.wildTurned)) && s.rs.doomed !== pid;
  if (canBoom) {
    if (me.role === 'whiteWolfKing') {
      out.push({
        id: 'boom',
        title: '白狼王自爆',
        desc: '選擇一名玩家一起帶走，並立即進入黑夜',
        targets: others,
        min: 1,
        max: 1,
        options: [{ id: 'boom', label: '自爆並帶走', style: 'danger', needsTargets: true }],
      });
    } else {
      out.push({
        id: 'boom',
        title: '自爆',
        desc: '亮出狼人身分出局，並立即進入黑夜',
        targets: [],
        min: 0,
        max: 0,
        options: [{ id: 'boom', label: '自爆', style: 'danger' }],
      });
    }
  }
  if (!election && me.role === 'knight' && !s.rs.knightUsed && !s.rs.goodSealed) {
    out.push({
      id: 'duel',
      title: '騎士決鬥',
      desc: '對方是狼人則他出局並進入黑夜；是好人則你出局',
      targets: others,
      min: 1,
      max: 1,
      options: [{ id: 'duel', label: '發起決鬥', style: 'danger', needsTargets: true }],
    });
  }
  return out;
}

function actBoom(s: GameState, me: Player, targets: string[], now: number) {
  const st = s.stage as Extract<Stage, { t: 'speech' }>;
  const election = st.kind === 'sheriff' || st.kind === 'sheriffPk';
  me.revealed = me.role === 'wildChild' ? 'werewolf' : me.role;
  log(s, 'skill', `💥 ${tag(s, me.id)} 自爆了！身分是【${roleName(me.revealed)}】`);
  if (election) {
    if (s.sheriffState === 'pending') {
      s.sheriffState = 'postponed';
      log(s, 'sheriff', '警長競選中斷，延到明天重新舉行');
    } else {
      badgeLost(s, '競選期間再次有狼人自爆');
    }
    s.election = null;
  }
  s.lastWords = [];
  s.triggers = [];
  s.deathCtx = 'daySilent';
  s.fresh = [];
  kill(s, me.id, 'boom');
  if (me.role === 'whiteWolfKing' && targets[0]) {
    log(s, 'skill', `🐾 白狼王帶走了 ${tag(s, targets[0])}`);
    kill(s, targets[0], 'taken');
  }
  if (me.role === 'bloodMoon') {
    s.rs.sealNight = s.day + 1;
    log(s, 'skill', '🩸 血月降臨，今晚所有神職的技能都被封印');
  }
  // 競選期間自爆時昨夜的死訊尚未公布
  s.flow = election ? [{ t: 'announce', silent: true }, { t: 'night' }] : [{ t: 'triggers' }, { t: 'night' }];
  next(s, now);
}

function actDuel(s: GameState, me: Player, target: string, now: number) {
  const st = s.stage as Extract<Stage, { t: 'speech' }>;
  const tgt = P(s, target);
  s.rs.knightUsed = true;
  me.revealed = 'knight';
  log(s, 'skill', `⚔️ ${tag(s, me.id)} 翻牌為【騎士】，向 ${tag(s, target)} 發起決鬥`);
  s.deathCtx = 'daySilent';
  if (isWolf(s, tgt)) {
    log(s, 'skill', `${tag(s, target)} 是狼人，決鬥出局！立即進入黑夜`);
    s.lastWords = [];
    s.fresh = [];
    kill(s, target, 'duel');
    s.flow = [{ t: 'triggers' }, { t: 'night' }];
    return next(s, now);
  }
  log(s, 'skill', `${tag(s, target)} 是好人，騎士以死謝罪`);
  kill(s, me.id, 'duelFail');
  if (endIfWon(s)) return;
  if (s.triggers.length) return interrupt(s, now);
  if (st.order[st.idx] === me.id) enterSpeaker(s, now, st.kind, st.order, st.idx + 1);
}

export function act(s: GameState, pid: string, promptId: string, option: string, targets: string[], now: number) {
  const st = s.stage;
  if (s.phase !== 'playing' || !st) fail('遊戲尚未開始');
  const me = P(s, pid);
  const main = getPrompt(s, pid);
  const pr = main && main.id === promptId ? main : getSkills(s, pid).find((k) => k.id === promptId);
  if (!pr || pr.done || pr.blocked) fail('現在無法進行這個操作');
  const opt = pr.options.find((o) => o.id === option);
  if (!opt) fail('無效的選項');
  let ts: string[] = [];
  if (opt.needsTargets) {
    ts = [...new Set(Array.isArray(targets) ? targets.filter((t) => typeof t === 'string') : [])];
    if (ts.length < pr.min || ts.length > pr.max) fail(pr.min === pr.max ? `請選擇 ${pr.min} 名玩家` : `請選擇 ${pr.min}–${pr.max} 名玩家`);
    if (ts.some((t) => !pr.targets.includes(t))) fail('無效的目標');
  }

  switch (pr.id) {
    case 'endSpeech':
      if (st.t === 'speech') return enterSpeaker(s, now, st.kind, st.order, st.idx + 1);
      return next(s, now);
    case 'withdraw': {
      if (st.t !== 'speech') return;
      const e = s.election!;
      e.candidates = e.candidates.filter((x) => x !== pid);
      e.withdrawn.push(pid);
      log(s, 'sheriff', `${tag(s, pid)} 退水，放棄競選警長`);
      if (st.order[st.idx] === pid) enterSpeaker(s, now, st.kind, st.order, st.idx + 1);
      return;
    }
    case 'boom':
      return actBoom(s, me, ts, now);
    case 'duel':
      return actDuel(s, me, ts[0], now);
    case 'signup':
      if (st.t !== 'signup') return;
      st.choice[pid] = option === 'run';
      if (living(s).every((p) => p.id in st.choice)) endSignup(s, now);
      return;
    case 'vote':
      if (st.t !== 'vote') return;
      st.votes[pid] = option === 'vote' ? ts[0] : null;
      if (st.voters.every((v) => v in st.votes)) endVote(s, now);
      return;
    case 'shoot':
      if (option === 'shoot') {
        log(s, 'skill', `🔫 ${tag(s, pid)} 發動技能開槍，帶走了 ${tag(s, ts[0])}`);
        kill(s, ts[0], 'shot', pid);
      }
      if (endIfWon(s)) return;
      return beginTrigger(s, now);
    case 'badge':
      if (option === 'pass') {
        s.sheriff = ts[0];
        log(s, 'sheriff', `⭐ ${tag(s, pid)} 將警徽移交給 ${tag(s, ts[0])}`);
      } else {
        s.sheriff = null;
        log(s, 'sheriff', `${tag(s, pid)} 撕毀了警徽，從此沒有警長`);
      }
      return beginTrigger(s, now);
    case 'order':
      s.speechPlan = sheriffOrder(s, option === 'asc');
      log(s, 'sheriff', `警長決定由 ${tag(s, s.speechPlan[0])} 開始發言`);
      return next(s, now);
    default:
      if (st.t === 'night' && pr.id === `night:${st.step}`) return actNight(s, me, st, option, ts, now);
      fail('現在無法進行這個操作');
  }
}

// ───────────── 聊天 ─────────────

export function channelsFor(s: GameState, pid: string): ChannelView[] {
  const me = P(s, pid);
  if (s.phase !== 'playing') return [{ id: 'public', label: '公開', canSend: true, hint: '' }];
  const st = s.stage;
  const out: ChannelView[] = [];
  let can = false;
  let hint = '';
  const speaking =
    (st?.t === 'speech' && st.order[st.idx] === pid) || (st?.t === 'lastWords' && st.id === pid);
  if (st?.t === 'lastWords' && st.id === pid) can = true;
  else if (!me.alive) hint = '你已出局，無法在公開頻道發言';
  else if (s.isNight) hint = '夜晚無法公開發言';
  else if (s.rs.silenced === pid) hint = '你被禁言了，今天無法發言';
  else if (s.config.strictChat && !speaking) hint = '輪到你發言時才能打字';
  else can = true;
  out.push({ id: 'public', label: '公開', canSend: can, hint });
  if (inPack(s, me)) {
    const ok = me.alive && s.isNight;
    out.push({ id: 'wolf', label: '狼隊', canSend: ok, hint: ok ? '只有狼隊友看得到' : me.alive ? '狼隊頻道只在夜晚開放' : '你已出局' });
  }
  if (!me.alive) out.push({ id: 'dead', label: '亡者', canSend: true, hint: '只有出局的玩家看得到' });
  return out;
}

export function sendChat(s: GameState, pid: string, ch: ChatChannel, raw: string, now: number) {
  const text = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 200);
  if (!text) return;
  const c = channelsFor(s, pid).find((x) => x.id === ch);
  if (!c) fail('無法使用這個頻道');
  if (!c.canSend) fail(c.hint || '現在無法發言');
  s.chat.push({ id: ++s.seq, ch, from: pid, text, day: s.day, ts: now });
  if (s.chat.length > 300) s.chat.splice(0, s.chat.length - 300);
}

// ───────────── 大廳操作 ─────────────

export function updateProfile(s: GameState, pid: string, patch: Partial<Profile>) {
  if (s.phase === 'playing') fail('遊戲進行中無法修改');
  const me = P(s, pid);
  if (patch.name !== undefined) me.name = uniqueName(s, cleanName(patch.name), pid);
  if (patch.avatar !== undefined && AVATARS.includes(patch.avatar)) me.avatar = patch.avatar;
  if (patch.color !== undefined) {
    if (!COLORS.includes(patch.color)) fail('無效的顏色');
    if (s.players.some((p) => p.id !== pid && p.color === patch.color)) fail('這個顏色已經有人使用了');
    me.color = patch.color;
  }
}

export function addBot(s: GameState) {
  const used = new Set(s.players.map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) ?? `電腦${s.players.length + 1}`;
  return addPlayer(s, { name }, true);
}

export function kick(s: GameState, id: string) {
  if (s.phase !== 'lobby') fail('遊戲進行中無法移除玩家');
  if (id === s.hostId) fail('無法移除房主');
  P(s, id);
  removePlayer(s, id);
}

export function leave(s: GameState, pid: string) {
  if (s.phase !== 'lobby') return;
  removePlayer(s, pid);
}

export function shuffleSeats(s: GameState) {
  if (s.phase !== 'lobby') fail('遊戲進行中無法更換座位');
  s.players = shuffle(s.players);
  s.players.forEach((p, i) => (p.seat = i + 1));
}

export function applyPreset(s: GameState, id: string) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) fail('找不到這個板子');
  s.config.roles = [...preset.roles];
  s.config.auto = false;
}

export function backToLobby(s: GameState) {
  toLobby(s);
  s.stageSeq++;
}

export { MIN_PLAYERS, MAX_PLAYERS };
