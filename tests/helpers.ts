import assert from 'node:assert/strict';
import { P, act, addPlayer, createState, setConfig, startGame } from '../src/game/engine';
import { tick } from '../src/game/runtime';
import type { Config, GameState, NightStep, RoleId, Stage } from '../src/game/types';

export type NightStage = Extract<Stage, { t: 'night' }>;

let clock = 1_000_000;
export const now = () => clock;

/** 讓時間前進一大步，觸發目前階段的逾時 */
export function adv(s: GameState) {
  clock += 1_000_000;
  tick(s, clock);
}

/** 建立一場身分固定的遊戲：roles[i] 就是 i+1 號的身分（含盜賊時最後兩張為底牌） */
export function mk(roles: RoleId[], cfg: Partial<Config> = {}): GameState {
  const s = createState('TEST', clock);
  const n = roles.includes('thief') ? roles.length - 2 : roles.length;
  for (let i = 0; i < n; i++) addPlayer(s, { name: `P${i + 1}` });
  setConfig(s, { sheriff: false, ...cfg });
  startGame(s, clock);
  s.config.roles = [...roles];
  s.players.forEach((p, i) => (p.role = roles[i]));
  s.rs.thiefCards = roles.slice(n);
  s.priv = {};
  adv(s); // 發牌 → 第一夜
  return s;
}

export const id = (s: GameState, seat: number) => s.players[seat - 1].id;
export const seat = (s: GameState, n: number) => P(s, id(s, n));
export const ids = (s: GameState, seats: number[]) => seats.map((n) => id(s, n));

/** 夜晚行動（由目前階段的角色執行） */
export function nact(s: GameState, actor: number, option: string, ...targets: number[]) {
  const st = s.stage as NightStage;
  assert.equal(st.t, 'night');
  act(s, id(s, actor), `night:${st.step}`, option, ids(s, targets), clock);
}

/** 所有狼人一致襲擊同一個目標 */
export const wk = (target: number) => (s: GameState) => {
  const st = s.stage as NightStage;
  for (const a of st.actors) act(s, a, 'night:wolves', 'kill', [id(s, target)], clock);
};

export type NightActs = Partial<Record<NightStep, (s: GameState) => void>>;

/** 跑完整個夜晚，未指定的角色視為逾時不行動 */
export function night(s: GameState, acts: NightActs = {}) {
  assert.equal(s.stage?.t, 'night', `預期在夜晚，實際為 ${s.stage?.t}`);
  for (let guard = 0; s.phase === 'playing' && s.stage?.t === 'night'; guard++) {
    if (guard > 100) throw new Error('夜晚卡住了');
    const seq = s.stageSeq;
    acts[(s.stage as NightStage).step]?.(s);
    if (s.stageSeq === seq) adv(s);
  }
}

/** 持續逾時直到進入指定階段 */
export function until(s: GameState, t: Stage['t'], kind?: string) {
  for (let guard = 0; guard < 200; guard++) {
    const st = s.stage;
    if (s.phase !== 'playing') throw new Error(`遊戲已結束，未能進入 ${t}`);
    if (st?.t === t && (!kind || (st as { kind?: string }).kind === kind)) return;
    adv(s);
  }
  throw new Error(`無法進入階段 ${t}`);
}

/** 投票：map 為 投票者座位 → 目標座位（null 為棄票），其餘的人棄票 */
export function vote(s: GameState, map: Record<number, number | null>) {
  const st = s.stage as Extract<Stage, { t: 'vote' }>;
  assert.equal(st.t, 'vote');
  for (const voter of [...st.voters]) {
    const n = P(s, voter).seat;
    const target = map[n] ?? null;
    act(s, voter, 'vote', target ? 'vote' : 'abstain', target ? [id(s, target)] : [], clock);
  }
  assert.equal(s.stage?.t, 'voteResult');
  adv(s);
}

export function skill(s: GameState, actor: number, promptId: string, ...targets: number[]) {
  act(s, id(s, actor), promptId, promptId, ids(s, targets), clock);
}

export const hasLog = (s: GameState, text: string) => s.log.some((l) => l.text.includes(text));
export const hasPriv = (s: GameState, n: number, text: string) =>
  (s.priv[id(s, n)] ?? []).some((l) => l.text.includes(text));
export const alive = (s: GameState) => s.players.filter((p) => p.alive).map((p) => p.seat);

/** 目前階段的種類（回傳一般字串，避免 TypeScript 把階段型別收窄） */
export const stageT = (s: GameState): string | undefined => (s.stage as Stage | null)?.t;
