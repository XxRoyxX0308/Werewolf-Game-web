import { P, channelsFor, getPrompt, getSkills, inPack, startError, tag, wolfPack } from './engine';
import { ROLES, STEP_NAME } from './roles';
import type { ClientView, GameState, NightStep, Player, PlayerView, StageView } from './types';

const NARRATION: Record<NightStep, string> = {
  thief: '盜賊請睜眼，請從底牌中選擇你的身分。',
  cupid: '丘比特請睜眼，請選擇兩名玩家成為情侶。',
  halfBlood: '混血兒請睜眼，請選擇你的認親對象。',
  wildChild: '野孩子請睜眼，請選擇你的榜樣。',
  nightmare: '夢魘請睜眼，請選擇要恐懼的玩家。',
  magician: '魔術師請睜眼，請選擇要交換的兩名玩家。',
  dreamer: '攝夢人請睜眼，請選擇今晚的夢遊者。',
  guard: '守衛請睜眼，請選擇要守護的玩家。',
  wolves: '狼人請睜眼，請選擇要襲擊的玩家。',
  wolfBeauty: '狼美人請睜眼，請選擇要魅惑的玩家。',
  gargoyle: '石像鬼請睜眼，請選擇要查驗的玩家。',
  witch: '女巫請睜眼，你有一瓶解藥和一瓶毒藥，請問要使用嗎。',
  seer: '預言家請睜眼，請選擇要查驗的玩家。',
  psychic: '通靈師請睜眼，請選擇要查驗的玩家。',
  fox: '狐狸請睜眼，請選擇要查驗的玩家。',
  witcher: '獵魔人請睜眼，請問要狩獵嗎。',
  silencer: '禁言長老請睜眼，請選擇要禁言的玩家。',
  crow: '烏鴉請睜眼，請選擇要詛咒的玩家。',
  piper: '吹笛者請睜眼，請選擇要魅惑的玩家。',
};

const CAMP_NAME = { good: '好人陣營', wolf: '狼人陣營', lovers: '情侶陣營', piper: '吹笛者' } as const;

const seats = (s: GameState, ids: string[]) =>
  ids
    .map((i) => P(s, i).seat)
    .sort((a, b) => a - b)
    .map((n) => `${n}號`)
    .join('、');

function notesFor(s: GameState, me: Player): string[] {
  const rs = s.rs;
  const out: string[] = [];
  if (!me.role || s.phase === 'lobby') return out;
  switch (me.role) {
    case 'witch':
      out.push(`解藥：${rs.antidote ? '可用' : '已使用'}`, `毒藥：${rs.poison ? '可用' : '已使用'}`);
      break;
    case 'guard': {
      const last = rs.guardLast ?? s.night?.prev.guard;
      if (last) out.push(`最近守護：${tag(s, last)}`);
      break;
    }
    case 'knight':
      out.push(rs.knightUsed ? '決鬥：已使用' : '決鬥：白天發言階段可發動');
      break;
    case 'fox':
      out.push(rs.foxLost ? '技能：已失去' : '技能：可用');
      break;
    case 'elder':
      out.push(rs.elderLives > 0 ? '還能抵擋一次狼人襲擊' : '已經無法再抵擋襲擊');
      break;
    case 'magician':
      if (rs.magicianUsed.length) out.push(`已交換過：${seats(s, rs.magicianUsed)}`);
      break;
    case 'wildChild':
      if (rs.wildModel) out.push(`榜樣：${tag(s, rs.wildModel)}`);
      if (rs.wildTurned) out.push('🐺 榜樣已死，你現在是狼人');
      break;
    case 'halfBlood':
      if (rs.halfModel) out.push(`認親對象：${tag(s, rs.halfModel)}`);
      break;
    case 'hunter':
    case 'wolfKing':
      out.push('出局時可以開槍（被毒死則無法）');
      break;
    case 'idiot':
      if (me.revealed) out.push('已翻牌，失去投票權');
      break;
    case 'piper':
      out.push(rs.enchanted.length ? `已魅惑：${seats(s, rs.enchanted)}` : '尚未魅惑任何人');
      break;
    case 'hiddenWolf':
    case 'gargoyle':
      if (me.alive && wolfPack(s).some((p) => p.id === me.id)) out.push('狼隊友已全數出局，你獲得襲擊能力');
      break;
  }
  if (ROLES[me.role].kind === 'god' && rs.goodSealed) out.push('⚠️ 你的技能已被永久封印');
  const lv = rs.lovers;
  if (lv && lv.includes(me.id)) {
    const other = lv[0] === me.id ? lv[1] : lv[0];
    out.push(`💘 情侶：${tag(s, other)}${rs.loversMixed ? '（人狼戀・第三方）' : ''}`);
  } else if (lv && rs.cupid === me.id) {
    out.push(`💘 你牽的情侶：${seats(s, lv)}${rs.loversMixed ? '（人狼戀・第三方）' : ''}`);
  }
  if (rs.enchanted.includes(me.id)) out.push('🎶 你已被吹笛者魅惑');
  if (s.sheriff === me.id) out.push('⭐ 你是警長（放逐投票 1.5 票）');
  if (!s.isNight && rs.silenced === me.id && me.alive) out.push('🤐 你今天被禁言');
  if (rs.doomed === me.id) out.push('🩸 你將在下個天亮後出局');
  return out;
}

function stageView(s: GameState): StageView {
  const base = {
    seq: s.stageSeq,
    start: s.stageStart,
    deadline: s.deadline,
    night: s.isNight,
    title: '',
    sub: '',
    narration: '',
  };
  if (s.phase === 'lobby') {
    return { ...base, t: 'lobby', night: true, deadline: null, title: '等待玩家加入', sub: '房主設定完成後即可開始' };
  }
  const st = s.stage;
  if (s.phase === 'ended' || !st) {
    const camp = s.winner ? CAMP_NAME[s.winner.camp] : '';
    return {
      ...base,
      t: 'ended',
      night: false,
      deadline: null,
      title: s.winner ? `${camp}獲勝` : '遊戲結束',
      sub: s.winner?.reason ?? '',
      narration: s.winner ? `遊戲結束，${camp}獲勝。` : '',
    };
  }
  const who = (id: string) => {
    const p = P(s, id);
    return `${p.seat}號 ${p.name}`;
  };
  const no = (id: string) => P(s, id).seat;

  switch (st.t) {
    case 'deal':
      return { ...base, t: 'deal', title: '發牌', sub: '請確認你的身分', narration: '遊戲開始，請確認你的身分。' };
    case 'night':
      return {
        ...base,
        t: 'night',
        step: st.step,
        title: `第 ${s.day} 夜`,
        sub: `${STEP_NAME[st.step]}請睜眼`,
        narration: `${s.night?.idx === 0 ? '天黑請閉眼。' : ''}${NARRATION[st.step]}`,
      };
    case 'signup':
      return {
        ...base,
        t: 'signup',
        title: '警長競選',
        sub: '請決定是否上警',
        narration: '天亮了。現在開始警長競選，想競選警長的玩家請上警。',
        signed: Object.keys(st.choice),
      };
    case 'speech': {
      const sp = st.order[st.idx];
      const title = {
        day: `第 ${s.day} 天・發言`,
        pk: 'PK 發言',
        sheriff: '警長競選發言',
        sheriffPk: '警長 PK 發言',
      }[st.kind];
      return {
        ...base,
        t: 'speech',
        kind: st.kind,
        speaker: sp,
        order: st.order,
        idx: st.idx,
        title,
        sub: `${who(sp)} 發言中`,
        narration: `請 ${no(sp)} 號玩家發言。`,
      };
    }
    case 'vote': {
      const n = Object.keys(st.votes).length;
      return {
        ...base,
        t: 'vote',
        kind: st.kind,
        candidates: st.candidates,
        voters: st.voters,
        voted: Object.keys(st.votes),
        title: st.kind === 'sheriff' ? (st.round === 2 ? '警長 PK 投票' : '警長投票') : st.round === 2 ? 'PK 投票' : '放逐投票',
        sub: `已投票 ${n} / ${st.voters.length}`,
        narration: st.kind === 'sheriff' ? '請投票選出警長。' : st.round === 2 ? '請再次投票。' : '發言結束，請投票。',
      };
    }
    case 'voteResult': {
      const { top } = st;
      let sub: string;
      if (top.length === 1) sub = st.kind === 'sheriff' ? `${who(top[0])} 當選警長` : `${who(top[0])} 得票最高`;
      else if (top.length === 0) sub = '沒有人得票';
      else sub = `${seats(s, top)} 平票`;
      return {
        ...base,
        t: 'voteResult',
        kind: st.kind,
        votes: st.votes,
        tally: st.tally,
        top,
        title: '投票結果',
        sub,
        narration:
          top.length === 1
            ? st.kind === 'sheriff'
              ? `${no(top[0])} 號玩家當選警長。`
              : `${no(top[0])} 號玩家得票最高。`
            : top.length === 0
              ? '沒有人得票。'
              : '平票。',
      };
    }
    case 'announce': {
      const d = st.deaths;
      return {
        ...base,
        t: 'announce',
        deaths: d,
        title: `第 ${s.day} 天・天亮了`,
        sub: d.length ? `昨夜出局：${seats(s, d)}` : '昨夜是平安夜',
        narration: `天亮了。${d.length ? `昨夜出局的是 ${d.map(no).join('、')} 號玩家。` : '昨夜是平安夜。'}${st.bear ? '熊咆哮了。' : ''}`,
      };
    }
    case 'trigger': {
      const shoot = st.trig.t === 'shoot';
      return {
        ...base,
        t: 'trigger',
        actor: st.trig.id,
        title: shoot ? '技能發動' : '移交警徽',
        sub: `等待 ${who(st.trig.id)} ${shoot ? '決定是否發動技能' : '移交警徽'}`,
        narration: `請 ${no(st.trig.id)} 號玩家${shoot ? '決定是否發動技能。' : '移交警徽。'}`,
      };
    }
    case 'lastWords':
      return {
        ...base,
        t: 'lastWords',
        speaker: st.id,
        title: '遺言',
        sub: `${who(st.id)} 發表遺言`,
        narration: `請 ${no(st.id)} 號玩家發表遺言。`,
      };
    case 'order':
      return {
        ...base,
        t: 'order',
        actor: s.sheriff ?? undefined,
        title: '發言順序',
        sub: '等待警長決定發言順序',
        narration: '請警長決定發言順序。',
      };
  }
}

export function findByToken(s: GameState, token: string | null | undefined): Player | null {
  if (!token) return null;
  return s.players.find((p) => !p.isBot && p.token === token) ?? null;
}

/** 產生單一玩家可見的遊戲畫面，隱藏所有他不該知道的資訊 */
export function viewFor(s: GameState, token: string | null, version: number, now: number): ClientView {
  const me = findByToken(s, token);
  const ended = s.phase === 'ended';
  const playing = s.phase === 'playing';
  const seeAll = ended || (!!me && playing && !me.alive && s.config.deadSeeAll);
  const lv = s.rs.lovers;
  const knowsLovers = !!me && !!lv && (lv.includes(me.id) || s.rs.cupid === me.id);
  const knowsEnchanted = !!me && (s.rs.enchanted.includes(me.id) || me.role === 'piper');
  const seesPack = !!me && (inPack(s, me) || me.role === 'hiddenWolf');
  const hasRoles = s.phase !== 'lobby';

  const players: PlayerView[] = s.players.map((p) => {
    const isMe = me?.id === p.id;
    const mate = hasRoles && !isMe && seesPack && inPack(s, p);
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      seat: p.seat,
      alive: p.alive,
      isBot: p.isBot,
      isHost: p.id === s.hostId,
      isMe,
      sheriff: s.sheriff === p.id,
      role: hasRoles && (seeAll || isMe || mate) ? p.role : null,
      revealed: hasRoles ? p.revealed : null,
      wolfmate: mate,
      lover: hasRoles && !!lv && lv.includes(p.id) && (seeAll || (knowsLovers && !isMe)),
      enchanted: hasRoles && s.rs.enchanted.includes(p.id) && (seeAll || knowsEnchanted),
      canVote: p.canVote,
      cause: seeAll ? p.cause : null,
    };
  });

  const prompt = me && playing ? getPrompt(s, me.id) : null;
  const stage = stageView(s);
  // 夜晚各步驟的時長會洩漏該角色是否還活著（無人行動時是隨機的短暫等待），
  // 所以只有真正在行動的人看得到倒數
  if (stage.t === 'night' && !(prompt && !prompt.blocked && !prompt.done)) stage.deadline = null;

  const chat = s.chat.filter((m) => {
    if (m.ch === 'public') return true;
    if (ended) return true;
    if (!me) return false;
    if (m.ch === 'wolf') return inPack(s, me);
    return !me.alive;
  });

  return {
    code: s.code,
    version,
    now,
    phase: s.phase,
    hostId: s.hostId,
    gameNo: s.gameNo,
    day: s.day,
    config: s.config,
    players,
    meId: me?.id ?? null,
    myRole: hasRoles ? (me?.role ?? null) : null,
    myNotes: me ? notesFor(s, me) : [],
    stage,
    prompt,
    skills: me && playing ? getSkills(s, me.id) : [],
    log: s.log,
    priv: me ? (s.priv[me.id] ?? []) : [],
    chat,
    channels: me ? channelsFor(s, me.id) : [],
    sheriffState: s.sheriffState,
    election: s.election ? { candidates: s.election.candidates, withdrawn: s.election.withdrawn } : null,
    silenced: playing && !s.isNight ? s.rs.silenced : null,
    winner: s.winner,
    startError: s.phase === 'lobby' ? startError(s) : null,
  };
}
