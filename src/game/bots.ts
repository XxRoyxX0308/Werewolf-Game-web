import { P, act, getPrompt, getSkills, isWolf, pickOne, postChat, random, shuffle } from './engine';
import { L, type LText } from './i18n';
import type { GameState, Player, Prompt, Stage } from './types';

type NightStage = Extract<Stage, { t: 'night' }>;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SPEECH_LINES = [
  L('我是好人，這輪先過。', "I'm good. I'll pass this round."),
  L('沒什麼資訊，先聽後面的發言。', "Not much to go on — let's hear the others first."),
  L('我覺得前面有人發言怪怪的…', 'Someone before me sounded a bit off…'),
  L('先過，等等看票型再說。', "Pass. Let's see how the votes fall."),
  L('大家冷靜分析一下，不要亂投。', "Let's think this through and not vote at random."),
  L('有身分的可以出來帶隊嗎？', 'Could someone with a special role take the lead?'),
  L('我這輪先觀察，過。', "I'll just watch this round. Pass."),
];
const SHERIFF_LINES = [
  L('我想當警長帶大家找狼。', "I'd like to be sheriff and lead the hunt for the wolves."),
  L('投我一票，我是好人牌。', "Vote for me — I'm on the good side."),
  L('警徽給我，我會好好歸票。', "Give me the badge and I'll call the votes carefully."),
];
const LAST_LINES = [
  L('我是好人啊…各位加油。', 'I was good… good luck, everyone.'),
  L('記得看票型！', 'Remember to check the voting pattern!'),
  L('好人們撐住。', 'Hang in there, good folks.'),
];

interface Ready {
  at: number;
  prompt: Prompt;
}

/** 電腦玩家目前是否有事要做，以及預計行動的時間 */
function botReady(s: GameState, bot: Player): Ready | null {
  const st = s.stage;
  if (!st) return null;
  const jitter = hash(`${bot.id}:${s.stageSeq}`) % 2500;
  const base = s.stageStart + 1500 + jitter;
  const main = getPrompt(s, bot.id);
  if (main && !main.done && !main.blocked && main.options.length) {
    if (main.id === 'night:wolves' && st.t === 'night') {
      const picks = s.night!.wolfPicks;
      if (bot.id in picks) return null;
      // 有真人狼隊友時先等他們決定
      const humansPending = st.actors.some((a) => !P(s, a).isBot && !(a in picks));
      if (humansPending) return { at: Math.max(base, (s.deadline ?? base) - 4000), prompt: main };
    }
    return { at: base, prompt: main };
  }
  const end = getSkills(s, bot.id).find((k) => k.id === 'endSpeech');
  if (end) return { at: s.stageStart + 2500 + jitter, prompt: end };
  return null;
}

function decide(s: GameState, bot: Player, pr: Prompt): { option: string; targets: string[] } {
  const st = s.stage!;
  const wolf = isWolf(s, bot);
  const foes = (ids: string[]) => {
    const f = ids.filter((id) => !(wolf && isWolf(s, P(s, id))));
    return f.length ? f : ids;
  };
  const has = (id: string) => pr.options.some((o) => o.id === id);
  const skip = () => ({ option: has('skip') ? 'skip' : pr.options[pr.options.length - 1].id, targets: [] as string[] });

  switch (pr.id) {
    case 'endSpeech':
      return { option: 'endSpeech', targets: [] };
    case 'signup':
      return { option: random() < 0.3 ? 'run' : 'pass', targets: [] };
    case 'order':
      return { option: random() < 0.5 ? 'asc' : 'desc', targets: [] };
    case 'vote': {
      const pool = st.t === 'vote' && st.kind === 'exile' ? foes(pr.targets) : pr.targets;
      if (!pool.length || random() < 0.06) return { option: 'abstain', targets: [] };
      return { option: 'vote', targets: [pickOne(pool)] };
    }
    case 'shoot': {
      const pool = foes(pr.targets);
      if (!pool.length || random() < 0.15) return { option: 'skip', targets: [] };
      return { option: 'shoot', targets: [pickOne(pool)] };
    }
    case 'badge': {
      if (!pr.targets.length) return { option: 'destroy', targets: [] };
      const mates = pr.targets.filter((id) => wolf && isWolf(s, P(s, id)));
      return { option: 'pass', targets: [pickOne(mates.length ? mates : pr.targets)] };
    }
    case 'night:wolves': {
      const stg = st as NightStage;
      const picks = s.night!.wolfPicks;
      const human = stg.actors.find((a) => !P(s, a).isBot && picks[a]);
      const any = stg.actors.find((a) => picks[a]);
      const follow = picks[human ?? any ?? ''];
      return { option: 'kill', targets: [follow ?? pickOne(foes(pr.targets))] };
    }
    case 'night:witch':
      if (has('save') && random() < 0.7) return { option: 'save', targets: [] };
      if (has('poison') && s.day >= 2 && pr.targets.length && random() < 0.3) {
        return { option: 'poison', targets: [pickOne(pr.targets)] };
      }
      return skip();
    case 'night:thief':
      return { option: pickOne(pr.options).id, targets: [] };
    case 'night:witcher':
      if (random() < 0.7) return skip();
      break;
    case 'night:magician':
      if (random() < 0.6) return skip();
      break;
  }

  const main = pr.options.find((o) => o.needsTargets);
  if (!main) return { option: pr.options[0].id, targets: [] };
  let pool = wolf ? foes(pr.targets) : pr.targets;
  if (pr.id === 'night:dreamer') {
    const safe = pool.filter((t) => t !== s.night?.prev.dreamer);
    if (safe.length) pool = safe;
  }
  if (pool.length < pr.min) return skip();
  if (has('skip') && random() < 0.1) return skip();
  return { option: main.id, targets: shuffle(pool).slice(0, Math.max(pr.min, Math.min(pr.max, pool.length))) };
}

function chatter(s: GameState, bot: Player, now: number) {
  const st = s.stage;
  if (!st) return;
  let lines: LText[] | null = null;
  if (st.t === 'lastWords') lines = LAST_LINES;
  else if (st.t === 'speech') lines = st.kind === 'sheriff' || st.kind === 'sheriffPk' ? SHERIFF_LINES : SPEECH_LINES;
  if (!lines) return;
  try {
    postChat(s, bot.id, 'public', pickOne(lines), now);
  } catch {
    // 被禁言或無法發言時略過
  }
}

/** 讓一位到時間的電腦玩家行動，回傳是否有人行動 */
export function runBots(s: GameState, now: number): boolean {
  if (s.phase !== 'playing' || !s.stage) return false;
  for (const bot of s.players) {
    if (!bot.isBot || s.botDone.includes(bot.id)) continue;
    const ready = botReady(s, bot);
    if (!ready || now < ready.at) continue;
    const seq = s.stageSeq;
    try {
      const d = decide(s, bot, ready.prompt);
      if (ready.prompt.id === 'endSpeech') chatter(s, bot, now);
      act(s, bot.id, ready.prompt.id, d.option, d.targets, now);
    } catch {
      // 電腦玩家的無效操作直接忽略
    }
    if (s.stageSeq === seq && s.phase === 'playing') s.botDone.push(bot.id);
    return true;
  }
  return false;
}

export function nextBotTime(s: GameState): number | null {
  if (s.phase !== 'playing' || !s.stage) return null;
  let t: number | null = null;
  for (const bot of s.players) {
    if (!bot.isBot || s.botDone.includes(bot.id)) continue;
    const ready = botReady(s, bot);
    if (ready && (t === null || ready.at < t)) t = ready.at;
  }
  return t;
}
