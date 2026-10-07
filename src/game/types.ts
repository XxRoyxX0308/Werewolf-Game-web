import type { LText, Lang } from './i18n';

export type Camp = 'good' | 'wolf' | 'third';
export type RoleKind = 'villager' | 'god' | 'wolf' | 'third';

export type RoleId =
  // 好人陣營
  | 'villager'
  | 'seer'
  | 'witch'
  | 'hunter'
  | 'guard'
  | 'idiot'
  | 'knight'
  | 'gravekeeper'
  | 'silencer'
  | 'magician'
  | 'dreamer'
  | 'witcher'
  | 'bear'
  | 'fox'
  | 'elder'
  | 'crow'
  | 'psychic'
  // 狼人陣營
  | 'werewolf'
  | 'wolfKing'
  | 'whiteWolfKing'
  | 'wolfBeauty'
  | 'hiddenWolf'
  | 'evilKnight'
  | 'nightmare'
  | 'gargoyle'
  | 'bloodMoon'
  // 第三方
  | 'cupid'
  | 'wildChild'
  | 'thief'
  | 'piper'
  | 'halfBlood';

export type NightStep =
  | 'thief'
  | 'cupid'
  | 'halfBlood'
  | 'wildChild'
  | 'nightmare'
  | 'magician'
  | 'dreamer'
  | 'guard'
  | 'wolves'
  | 'wolfBeauty'
  | 'gargoyle'
  | 'witch'
  | 'seer'
  | 'psychic'
  | 'fox'
  | 'witcher'
  | 'silencer'
  | 'crow'
  | 'piper';

export type DeathCause =
  | 'wolf' // 狼人襲擊
  | 'poison' // 女巫毒殺
  | 'exile' // 放逐
  | 'shot' // 獵人 / 狼王開槍
  | 'boom' // 自爆
  | 'taken' // 被白狼王帶走
  | 'duel' // 被騎士決鬥
  | 'duelFail' // 騎士決鬥失敗
  | 'lover' // 殉情
  | 'charm' // 被狼美人魅惑而殉情
  | 'dream' // 攝夢
  | 'hunt' // 被獵魔人狩獵
  | 'backfire' // 獵魔人狩獵失敗
  | 'reflect'; // 惡靈騎士反傷

export interface RoleDef {
  id: RoleId;
  name: LText;
  camp: Camp;
  kind: RoleKind;
  icon: string;
  short: LText;
  desc: LText;
}

export interface Config {
  /** 牌堆。含盜賊時需比玩家數多 2 張 */
  roles: RoleId[];
  /** 是否由系統依人數自動配置牌堆 */
  auto: boolean;
  sheriff: boolean;
  /** edge = 屠邊, all = 屠城 */
  winMode: 'edge' | 'all';
  witchSelfSave: 'never' | 'first' | 'always';
  /** 夜晚死亡者的遺言規則 */
  lastWords: 'first' | 'always' | 'none';
  /** 同守同救是否死亡 */
  guardSaveClash: boolean;
  speechSec: number;
  actionSec: number;
  voteSec: number;
  /** 只有輪到發言的人才能在公開頻道打字 */
  strictChat: boolean;
  /** 死亡玩家可看到所有身分 */
  deadSeeAll: boolean;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: string;
  color: string;
  seat: number;
  isBot: boolean;
  role: RoleId | null;
  alive: boolean;
  canVote: boolean;
  /** 已公開翻牌的身分 */
  revealed: RoleId | null;
  cause: DeathCause | null;
  deathDay: number | null;
}

export interface NightData {
  steps: NightStep[];
  idx: number;
  /** 前一晚的目標，用來判斷「不能連續兩晚選同一人」 */
  prev: {
    guard: string | null;
    nightmare: string | null;
    silencer: string | null;
    beauty: string | null;
    dreamer: string | null;
  };
  fear: string | null;
  swap: [string, string] | null;
  dream: string | null;
  guard: string | null;
  wolfPicks: Record<string, string | null>;
  wolfVictim: string | null;
  wolfBlocked: boolean;
  save: boolean;
  poison: string | null;
  witchId: string | null;
  seerReflect: string | null;
  hunt: string | null;
  witcherId: string | null;
  silence: string | null;
  curse: string | null;
}

export interface RoleState {
  antidote: boolean;
  poison: boolean;
  guardLast: string | null;
  nightmareLast: string | null;
  silencerLast: string | null;
  dreamerLast: string | null;
  beautyLast: string | null;
  charmed: string | null;
  magicianUsed: string[];
  knightUsed: boolean;
  foxLost: boolean;
  elderLives: number;
  lovers: [string, string] | null;
  cupid: string | null;
  loversMixed: boolean;
  wildModel: string | null;
  wildTurned: boolean;
  halfModel: string | null;
  enchanted: string[];
  thiefCards: RoleId[];
  /** 長老被好人害死後，所有神職永久失去技能 */
  goodSealed: boolean;
  /** 血月使徒自爆後，被封印的夜晚編號 */
  sealNight: number | null;
  lastExiled: string | null;
  /** 今天被禁言的玩家 */
  silenced: string | null;
  /** 今天被烏鴉詛咒的玩家 */
  cursed: string | null;
  /** 血月使徒作為最後一狼被放逐，下個天亮才出局 */
  doomed: string | null;
}

export type Trigger = { t: 'shoot'; id: string } | { t: 'badge'; id: string };

export type SpeechKind = 'day' | 'pk' | 'sheriff' | 'sheriffPk';
export type VoteKind = 'exile' | 'sheriff';

export type Stage =
  | { t: 'deal' }
  | { t: 'night'; step: NightStep; actors: string[]; done: string[] }
  | { t: 'signup'; choice: Record<string, boolean> }
  | { t: 'speech'; kind: SpeechKind; order: string[]; idx: number }
  | {
      t: 'vote';
      kind: VoteKind;
      round: 1 | 2;
      candidates: string[];
      voters: string[];
      votes: Record<string, string | null>;
    }
  | {
      t: 'voteResult';
      kind: VoteKind;
      round: 1 | 2;
      votes: Record<string, string | null>;
      tally: Record<string, number>;
      top: string[];
    }
  | { t: 'announce'; deaths: string[]; bear: boolean | null }
  | { t: 'trigger'; trig: Trigger }
  | { t: 'lastWords'; id: string }
  | { t: 'order' };

export type FlowItem =
  | { t: 'night' }
  | { t: 'sheriff' }
  | { t: 'announce'; silent?: boolean }
  | { t: 'triggers' }
  | { t: 'lastWords' }
  | { t: 'order' }
  | { t: 'speech'; kind: SpeechKind; ids?: string[] }
  | { t: 'vote'; kind: VoteKind; round: 1 | 2; candidates?: string[] }
  | { t: 'sheriffTally' }
  | { t: 'resume'; stage: Stage; remain: number };

// 以下幾種內容會保存在房間狀態裡，文字每種語言各存一份（T = LText）；
// 送給玩家的畫面則只帶他所選語言的版本（T = string）

export interface LogEntry<T = LText> {
  id: number;
  day: number;
  kind: 'sys' | 'night' | 'day' | 'death' | 'vote' | 'skill' | 'sheriff' | 'end';
  text: T;
}

export interface PrivEntry<T = LText> {
  id: number;
  day: number;
  text: T;
  kind: 'info' | 'good' | 'bad' | 'warn';
  /** 不另外跳出通知（例如發牌時已經有翻牌動畫） */
  quiet?: boolean;
}

export type ChatChannel = 'public' | 'wolf' | 'dead';

/** 玩家打的字是單一字串；電腦玩家的台詞則每種語言各一份 */
export interface ChatMsg<T = string | LText> {
  id: number;
  ch: ChatChannel;
  from: string;
  text: T;
  day: number;
  ts: number;
}

export type WinCamp = 'good' | 'wolf' | 'lovers' | 'piper';

export interface Winner<T = LText> {
  camp: WinCamp;
  reason: T;
  ids: string[];
}

export type SheriffState = 'off' | 'pending' | 'postponed' | 'done' | 'lost';

export interface Election {
  /** 所有曾經上警的玩家 */
  ran: string[];
  /** 仍在競選中的玩家 */
  candidates: string[];
  withdrawn: string[];
}

export interface GameState {
  code: string;
  createdAt: number;
  phase: 'lobby' | 'playing' | 'ended';
  hostId: string;
  players: Player[];
  config: Config;
  gameNo: number;
  day: number;
  isNight: boolean;
  stage: Stage | null;
  stageSeq: number;
  stageStart: number;
  deadline: number | null;
  flow: FlowItem[];
  night: NightData | null;
  rs: RoleState;
  sheriff: string | null;
  sheriffState: SheriffState;
  election: Election | null;
  pendingDeaths: { id: string; cause: DeathCause }[];
  triggers: Trigger[];
  lastWords: string[];
  /** 目前死亡發生的情境，決定遺言與技能；Silent 代表沒有遺言 */
  deathCtx: 'night' | 'nightSilent' | 'day' | 'daySilent';
  /** 本批次新死亡的玩家 */
  fresh: string[];
  speechPlan: string[] | null;
  botDone: string[];
  log: LogEntry[];
  priv: Record<string, PrivEntry[]>;
  chat: ChatMsg[];
  winner: Winner | null;
  seq: number;
}

// ───────────── 客戶端檢視 ─────────────

export interface PromptOption {
  id: string;
  label: string;
  style?: 'primary' | 'danger' | 'ghost';
  needsTargets?: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  desc?: string;
  targets: string[];
  min: number;
  max: number;
  options: PromptOption[];
  done?: boolean;
  blocked?: boolean;
  /** 狼人夜間的即時選擇：狼人 id -> 目標 id（null = 空刀） */
  picks?: Record<string, string | null>;
}

export interface PlayerView {
  id: string;
  name: string;
  avatar: string;
  color: string;
  seat: number;
  alive: boolean;
  isBot: boolean;
  isHost: boolean;
  isMe: boolean;
  sheriff: boolean;
  /** 觀看者得知的身分 */
  role: RoleId | null;
  /** 已公開翻牌的身分 */
  revealed: RoleId | null;
  wolfmate: boolean;
  lover: boolean;
  enchanted: boolean;
  canVote: boolean;
  cause: DeathCause | null;
}

export interface StageView {
  t: Stage['t'] | 'lobby' | 'ended';
  seq: number;
  start: number;
  deadline: number | null;
  night: boolean;
  title: string;
  sub: string;
  narration: string;
  step?: NightStep;
  /** 這是今晚的第一個步驟（剛天黑） */
  nightfall?: boolean;
  kind?: SpeechKind | VoteKind;
  speaker?: string;
  order?: string[];
  idx?: number;
  candidates?: string[];
  voters?: string[];
  voted?: string[];
  votes?: Record<string, string | null>;
  tally?: Record<string, number>;
  top?: string[];
  deaths?: string[];
  signed?: string[];
  actor?: string;
}

export interface ChannelView {
  id: ChatChannel;
  label: string;
  canSend: boolean;
  hint: string;
}

export interface ClientView {
  code: string;
  version: number;
  now: number;
  /** 這份畫面的文字所使用的語言 */
  lang: Lang;
  phase: GameState['phase'];
  hostId: string;
  gameNo: number;
  day: number;
  config: Config;
  players: PlayerView[];
  meId: string | null;
  myRole: RoleId | null;
  myNotes: string[];
  stage: StageView;
  prompt: Prompt | null;
  skills: Prompt[];
  log: LogEntry<string>[];
  priv: PrivEntry<string>[];
  chat: ChatMsg<string>[];
  channels: ChannelView[];
  sheriffState: SheriffState;
  election: { candidates: string[]; withdrawn: string[] } | null;
  silenced: string | null;
  winner: Winner<string> | null;
  startError: string | null;
}

export type ClientAction =
  | { type: 'profile'; name?: string; avatar?: string; color?: string }
  | { type: 'config'; config: Partial<Config> }
  | { type: 'preset'; id: string }
  | { type: 'addBot' }
  | { type: 'kick'; id: string }
  | { type: 'shuffle' }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'hostSkip' }
  | { type: 'act'; prompt: string; option: string; targets: string[] }
  | { type: 'chat'; ch: ChatChannel; text: string };

export interface Profile {
  name: string;
  avatar: string;
  color: string;
}
