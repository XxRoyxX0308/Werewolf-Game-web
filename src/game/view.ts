import { P, channelsFor, getPrompt, getSkills, inPack, startError, tag, wolfPack } from './engine';
import { L, type LText, type Lang, curLang, loc, seatTag, sep, t, withLang } from './i18n';
import { ROLES, WIN_TITLE, stepName } from './roles';
import type { ClientView, GameState, NightStep, Player, PlayerView, StageView } from './types';

const NARRATION: Record<NightStep, LText> = {
  thief: L('盜賊請睜眼，請從底牌中選擇你的身分。', 'Thief, open your eyes. Choose your role from the spare cards.'),
  cupid: L('丘比特請睜眼，請選擇兩名玩家成為情侶。', 'Cupid, open your eyes. Choose two players to become lovers.'),
  halfBlood: L('混血兒請睜眼，請選擇你的認親對象。', 'Half-Blood, open your eyes. Choose your kin.'),
  wildChild: L('野孩子請睜眼，請選擇你的榜樣。', 'Wild Child, open your eyes. Choose your role model.'),
  nightmare: L('夢魘請睜眼，請選擇要恐懼的玩家。', 'Nightmare, open your eyes. Choose a player to terrify.'),
  magician: L('魔術師請睜眼，請選擇要交換的兩名玩家。', 'Magician, open your eyes. Choose two players to swap.'),
  dreamer: L('攝夢人請睜眼，請選擇今晚的夢遊者。', "Dreamweaver, open your eyes. Choose tonight's sleepwalker."),
  guard: L('守衛請睜眼，請選擇要守護的玩家。', 'Guard, open your eyes. Choose a player to protect.'),
  wolves: L('狼人請睜眼，請選擇要襲擊的玩家。', 'Werewolves, open your eyes. Choose a player to attack.'),
  wolfBeauty: L('狼美人請睜眼，請選擇要魅惑的玩家。', 'Wolf Beauty, open your eyes. Choose a player to charm.'),
  gargoyle: L('石像鬼請睜眼，請選擇要查驗的玩家。', 'Gargoyle, open your eyes. Choose a player to check.'),
  witch: L(
    '女巫請睜眼，你有一瓶解藥和一瓶毒藥，請問要使用嗎。',
    'Witch, open your eyes. You have an antidote and a poison. Will you use one?',
  ),
  seer: L('預言家請睜眼，請選擇要查驗的玩家。', 'Seer, open your eyes. Choose a player to check.'),
  psychic: L('通靈師請睜眼，請選擇要查驗的玩家。', 'Psychic, open your eyes. Choose a player to check.'),
  fox: L('狐狸請睜眼，請選擇要查驗的玩家。', 'Fox, open your eyes. Choose a player to check.'),
  witcher: L('獵魔人請睜眼，請問要狩獵嗎。', 'Witcher, open your eyes. Will you hunt tonight?'),
  silencer: L('禁言長老請睜眼，請選擇要禁言的玩家。', 'Silencer, open your eyes. Choose a player to silence.'),
  crow: L('烏鴉請睜眼，請選擇要詛咒的玩家。', 'Crow, open your eyes. Choose a player to curse.'),
  piper: L('吹笛者請睜眼，請選擇要魅惑的玩家。', 'Piper, open your eyes. Choose players to enchant.'),
};

const seats = (s: GameState, ids: string[]) =>
  ids
    .map((i) => P(s, i).seat)
    .sort((a, b) => a - b)
    .map((n) => seatTag(curLang(), n))
    .join(sep());

function notesFor(s: GameState, me: Player): string[] {
  const rs = s.rs;
  const out: string[] = [];
  if (!me.role || s.phase === 'lobby') return out;
  switch (me.role) {
    case 'witch':
      out.push(
        t(`解藥：${rs.antidote ? '可用' : '已使用'}`, `Antidote: ${rs.antidote ? 'available' : 'used'}`),
        t(`毒藥：${rs.poison ? '可用' : '已使用'}`, `Poison: ${rs.poison ? 'available' : 'used'}`),
      );
      break;
    case 'guard': {
      const last = rs.guardLast ?? s.night?.prev.guard;
      if (last) out.push(t(`最近守護：${tag(s, last)}`, `Last protected: ${tag(s, last)}`));
      break;
    }
    case 'knight':
      out.push(rs.knightUsed ? t('決鬥：已使用', 'Duel: used') : t('決鬥：白天發言階段可發動', 'Duel: usable during daytime speeches'));
      break;
    case 'fox':
      out.push(rs.foxLost ? t('技能：已失去', 'Ability: lost') : t('技能：可用', 'Ability: available'));
      break;
    case 'elder':
      out.push(
        rs.elderLives > 0
          ? t('還能抵擋一次狼人襲擊', 'Can still survive one werewolf attack')
          : t('已經無法再抵擋襲擊', 'Can no longer survive an attack'),
      );
      break;
    case 'magician':
      if (rs.magicianUsed.length) out.push(t(`已交換過：${seats(s, rs.magicianUsed)}`, `Already swapped: ${seats(s, rs.magicianUsed)}`));
      break;
    case 'wildChild':
      if (rs.wildModel) out.push(t(`榜樣：${tag(s, rs.wildModel)}`, `Role model: ${tag(s, rs.wildModel)}`));
      if (rs.wildTurned) out.push(t('🐺 榜樣已死，你現在是狼人', '🐺 Your role model is dead — you are now a werewolf'));
      break;
    case 'halfBlood':
      if (rs.halfModel) out.push(t(`認親對象：${tag(s, rs.halfModel)}`, `Kin: ${tag(s, rs.halfModel)}`));
      break;
    case 'hunter':
    case 'wolfKing':
      out.push(t('出局時可以開槍（被毒死則無法）', 'You may shoot when eliminated (not if poisoned)'));
      break;
    case 'idiot':
      if (me.revealed) out.push(t('已翻牌，失去投票權', 'Revealed — you can no longer vote'));
      break;
    case 'piper':
      out.push(
        rs.enchanted.length
          ? t(`已魅惑：${seats(s, rs.enchanted)}`, `Enchanted: ${seats(s, rs.enchanted)}`)
          : t('尚未魅惑任何人', 'Nobody enchanted yet'),
      );
      break;
    case 'hiddenWolf':
    case 'gargoyle':
      if (me.alive && wolfPack(s).some((p) => p.id === me.id)) {
        out.push(t('狼隊友已全數出局，你獲得襲擊能力', 'All your fellow wolves are out — you now make the attack'));
      }
      break;
  }
  if (ROLES[me.role].kind === 'god' && rs.goodSealed) out.push(t('⚠️ 你的技能已被永久封印', '⚠️ Your ability is permanently sealed'));
  const lv = rs.lovers;
  const mixed = rs.loversMixed ? t('（人狼戀・第三方）', ' (human–wolf couple · third party)') : '';
  if (lv && lv.includes(me.id)) {
    const other = lv[0] === me.id ? lv[1] : lv[0];
    out.push(t(`💘 情侶：${tag(s, other)}${mixed}`, `💘 Lover: ${tag(s, other)}${mixed}`));
  } else if (lv && rs.cupid === me.id) {
    out.push(t(`💘 你牽的情侶：${seats(s, lv)}${mixed}`, `💘 Your lovers: ${seats(s, lv)}${mixed}`));
  }
  if (rs.enchanted.includes(me.id)) out.push(t('🎶 你已被吹笛者魅惑', '🎶 You have been enchanted by the Piper'));
  if (s.sheriff === me.id) out.push(t('⭐ 你是警長（放逐投票 1.5 票）', '⭐ You are the sheriff (1.5 votes in exile votes)'));
  if (!s.isNight && rs.silenced === me.id && me.alive) out.push(t('🤐 你今天被禁言', '🤐 You are silenced today'));
  if (rs.doomed === me.id) out.push(t('🩸 你將在下個天亮後出局', '🩸 You will be eliminated after the next dawn'));
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
    return {
      ...base,
      t: 'lobby',
      night: true,
      deadline: null,
      title: t('等待玩家加入', 'Waiting for players'),
      sub: t('房主設定完成後即可開始', 'The game starts once the host is ready'),
    };
  }
  const st = s.stage;
  if (s.phase === 'ended' || !st) {
    const win = s.winner ? loc(WIN_TITLE[s.winner.camp]) : '';
    return {
      ...base,
      t: 'ended',
      night: false,
      deadline: null,
      title: s.winner ? win : t('遊戲結束', 'Game Over'),
      sub: s.winner ? loc(s.winner.reason) : '',
      narration: s.winner ? t(`遊戲結束，${win}。`, `Game over. ${win}.`) : '',
    };
  }
  const who = (id: string) => {
    const p = P(s, id);
    return `${tag(s, id)} ${p.name}`;
  };
  const no = (id: string) => P(s, id).seat;

  switch (st.t) {
    case 'deal':
      return {
        ...base,
        t: 'deal',
        title: t('發牌', 'Dealing'),
        sub: t('請確認你的身分', 'Check your role'),
        narration: t('遊戲開始，請確認你的身分。', 'The game begins. Please check your role.'),
      };
    case 'night': {
      const name = loc(stepName(st.step));
      const nightfall = s.night?.idx === 0;
      return {
        ...base,
        t: 'night',
        step: st.step,
        nightfall,
        title: t(`第 ${s.day} 夜`, `Night ${s.day}`),
        sub: t(`${name}請睜眼`, `${name}, open your eyes`),
        narration: `${nightfall ? t('天黑請閉眼。', 'Night falls. Everyone, close your eyes. ') : ''}${loc(NARRATION[st.step])}`,
      };
    }
    case 'signup':
      return {
        ...base,
        t: 'signup',
        title: t('警長競選', 'Sheriff Election'),
        sub: t('請決定是否上警', 'Decide whether to run'),
        narration: t(
          '天亮了。現在開始警長競選，想競選警長的玩家請上警。',
          'Day breaks. The sheriff election begins. If you want to be sheriff, step forward.',
        ),
        signed: Object.keys(st.choice),
      };
    case 'speech': {
      const sp = st.order[st.idx];
      const title = {
        day: t(`第 ${s.day} 天・發言`, `Day ${s.day} · Speeches`),
        pk: t('PK 發言', 'Runoff Speeches'),
        sheriff: t('警長競選發言', 'Sheriff Campaign Speeches'),
        sheriffPk: t('警長 PK 發言', 'Sheriff Runoff Speeches'),
      }[st.kind];
      return {
        ...base,
        t: 'speech',
        kind: st.kind,
        speaker: sp,
        order: st.order,
        idx: st.idx,
        title,
        sub: t(`${who(sp)} 發言中`, `${who(sp)} is speaking`),
        narration: t(`請 ${no(sp)} 號玩家發言。`, `Player ${no(sp)}, please speak.`),
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
        title:
          st.kind === 'sheriff'
            ? st.round === 2
              ? t('警長 PK 投票', 'Sheriff Runoff Vote')
              : t('警長投票', 'Sheriff Vote')
            : st.round === 2
              ? t('PK 投票', 'Runoff Vote')
              : t('放逐投票', 'Exile Vote'),
        sub: t(`已投票 ${n} / ${st.voters.length}`, `Voted ${n} / ${st.voters.length}`),
        narration:
          st.kind === 'sheriff'
            ? t('請投票選出警長。', 'Please vote for a sheriff.')
            : st.round === 2
              ? t('請再次投票。', 'Please vote again.')
              : t('發言結束，請投票。', 'The speeches are over. Please vote.'),
      };
    }
    case 'voteResult': {
      const { top } = st;
      let sub: string;
      if (top.length === 1) {
        sub =
          st.kind === 'sheriff'
            ? t(`${who(top[0])} 當選警長`, `${who(top[0])} is elected sheriff`)
            : t(`${who(top[0])} 得票最高`, `${who(top[0])} has the most votes`);
      } else if (top.length === 0) sub = t('沒有人得票', 'Nobody received a vote');
      else sub = t(`${seats(s, top)} 平票`, `${seats(s, top)} are tied`);
      return {
        ...base,
        t: 'voteResult',
        kind: st.kind,
        votes: st.votes,
        tally: st.tally,
        top,
        title: t('投票結果', 'Vote Results'),
        sub,
        narration:
          top.length === 1
            ? st.kind === 'sheriff'
              ? t(`${no(top[0])} 號玩家當選警長。`, `Player ${no(top[0])} is elected sheriff.`)
              : t(`${no(top[0])} 號玩家得票最高。`, `Player ${no(top[0])} has the most votes.`)
            : top.length === 0
              ? t('沒有人得票。', 'Nobody received a vote.')
              : t('平票。', 'It is a tie.'),
      };
    }
    case 'announce': {
      const d = st.deaths;
      return {
        ...base,
        t: 'announce',
        deaths: d,
        title: t(`第 ${s.day} 天・天亮了`, `Day ${s.day} · Dawn`),
        sub: d.length ? t(`昨夜出局：${seats(s, d)}`, `Eliminated last night: ${seats(s, d)}`) : t('昨夜是平安夜', 'A peaceful night'),
        narration: t(
          `天亮了。${d.length ? `昨夜出局的是 ${d.map(no).join('、')} 號玩家。` : '昨夜是平安夜。'}${st.bear ? '熊咆哮了。' : ''}`,
          `Day breaks. ${d.length ? `Last night we lost player${d.length > 1 ? 's' : ''} ${d.map(no).join(', ')}.` : 'It was a peaceful night.'}${st.bear ? ' The Bear growled.' : ''}`,
        ),
      };
    }
    case 'trigger': {
      const shoot = st.trig.t === 'shoot';
      return {
        ...base,
        t: 'trigger',
        actor: st.trig.id,
        title: shoot ? t('技能發動', 'Ability') : t('移交警徽', 'Pass the Badge'),
        sub: t(
          `等待 ${who(st.trig.id)} ${shoot ? '決定是否發動技能' : '移交警徽'}`,
          `Waiting for ${who(st.trig.id)} to ${shoot ? 'decide whether to use their ability' : 'pass on the badge'}`,
        ),
        narration: t(
          `請 ${no(st.trig.id)} 號玩家${shoot ? '決定是否發動技能。' : '移交警徽。'}`,
          `Player ${no(st.trig.id)}, please ${shoot ? 'decide whether to use your ability.' : 'pass on the badge.'}`,
        ),
      };
    }
    case 'lastWords':
      return {
        ...base,
        t: 'lastWords',
        speaker: st.id,
        title: t('遺言', 'Last Words'),
        sub: t(`${who(st.id)} 發表遺言`, `${who(st.id)} gives their last words`),
        narration: t(`請 ${no(st.id)} 號玩家發表遺言。`, `Player ${no(st.id)}, please give your last words.`),
      };
    case 'order':
      return {
        ...base,
        t: 'order',
        actor: s.sheriff ?? undefined,
        title: t('發言順序', 'Speaking Order'),
        sub: t('等待警長決定發言順序', 'Waiting for the sheriff to decide the speaking order'),
        narration: t('請警長決定發言順序。', 'Sheriff, please decide the speaking order.'),
      };
  }
}

export function findByToken(s: GameState, token: string | null | undefined): Player | null {
  if (!token) return null;
  return s.players.find((p) => !p.isBot && p.token === token) ?? null;
}

/** 產生單一玩家可見的遊戲畫面，隱藏所有他不該知道的資訊；文字使用該玩家選擇的語言 */
export function viewFor(s: GameState, token: string | null, version: number, now: number, lang: Lang = curLang()): ClientView {
  return withLang(lang, () => buildView(s, token, version, now));
}

function buildView(s: GameState, token: string | null, version: number, now: number): ClientView {
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
    lang: curLang(),
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
    log: s.log.map((l) => ({ ...l, text: loc(l.text) })),
    priv: me ? (s.priv[me.id] ?? []).map((l) => ({ ...l, text: loc(l.text) })) : [],
    chat: chat.map((m) => ({ ...m, text: loc(m.text) })),
    channels: me ? channelsFor(s, me.id) : [],
    sheriffState: s.sheriffState,
    election: s.election ? { candidates: s.election.candidates, withdrawn: s.election.withdrawn } : null,
    silenced: playing && !s.isNight ? s.rs.silenced : null,
    winner: s.winner && { ...s.winner, reason: loc(s.winner.reason) },
    startError: s.phase === 'lobby' ? startError(s) : null,
  };
}
