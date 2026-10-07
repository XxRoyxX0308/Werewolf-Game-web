import assert from 'node:assert/strict';
import test from 'node:test';
import { act, getPrompt, getSkills } from '../src/game/engine';
import type { Stage } from '../src/game/types';
import { withLang } from '../src/game/i18n';
import { viewFor } from '../src/game/view';
import { type NightStage, adv, alive, hasLog, hasPriv, id, mk, nact, night, now, seat, skill, stageT, until, vote, wk } from './helpers';

test('狼人襲擊、預言家查驗、放逐狼人後好人獲勝', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager']);
  night(s, { wolves: wk(3), seer: (s) => nact(s, 2, 'check', 1) });
  assert.equal(stageT(s), 'announce');
  assert.equal(seat(s, 3).alive, false);
  assert.ok(hasPriv(s, 2, '1號 是狼人'));
  until(s, 'vote');
  vote(s, { 2: 1, 4: 1, 5: 1 });
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner?.camp, 'good');
});

test('屠邊：神職全滅狼人獲勝；屠城模式則繼續', () => {
  const a = mk(['werewolf', 'seer', 'villager', 'villager', 'villager']);
  night(a, { wolves: wk(2) });
  adv(a);
  assert.equal(a.winner?.camp, 'wolf');

  const b = mk(['werewolf', 'seer', 'villager', 'villager', 'villager'], { winMode: 'all' });
  night(b, { wolves: wk(2) });
  adv(b);
  assert.equal(b.phase, 'playing');
});

test('女巫：解藥救人、用過解藥後不知死訊、毒藥殺人', () => {
  const s = mk(['werewolf', 'witch', 'villager', 'villager', 'villager']);
  night(s, { wolves: wk(3), witch: (s) => nact(s, 2, 'save') });
  assert.deepEqual(alive(s), [1, 2, 3, 4, 5]);
  assert.ok(hasLog(s, '平安夜'));
  until(s, 'night');
  night(s, {
    wolves: wk(4),
    witch: (s) => {
      const pr = getPrompt(s, id(s, 2))!;
      assert.ok(!pr.options.some((o) => o.id === 'save'));
      assert.match(pr.desc ?? '', /無法得知/);
      nact(s, 2, 'poison', 1);
    },
  });
  assert.deepEqual(alive(s), [2, 3, 5]);
  adv(s);
  assert.equal(s.winner?.camp, 'good');
});

test('女巫自救規則', () => {
  const never = mk(['werewolf', 'witch', 'villager', 'villager', 'villager'], { witchSelfSave: 'never' });
  night(never, {
    wolves: wk(2),
    witch: (s) => assert.ok(!getPrompt(s, id(s, 2))!.options.some((o) => o.id === 'save')),
  });
  const first = mk(['werewolf', 'witch', 'villager', 'villager', 'villager'], { witchSelfSave: 'first' });
  night(first, { wolves: wk(2), witch: (s) => nact(s, 2, 'save') });
  assert.equal(seat(first, 2).alive, true);
});

test('守衛：守護成功、不能連守、同守同救死亡', () => {
  const s = mk(['werewolf', 'guard', 'witch', 'villager', 'villager', 'villager']);
  night(s, { guard: (s) => nact(s, 2, 'guard', 4), wolves: wk(4) });
  assert.equal(seat(s, 4).alive, true);
  until(s, 'night');
  night(s, {
    guard: (s) => {
      assert.ok(!getPrompt(s, id(s, 2))!.targets.includes(id(s, 4)));
      nact(s, 2, 'guard', 2);
    },
    wolves: wk(4),
    witch: (s) => nact(s, 3, 'save'),
  });
  assert.equal(seat(s, 4).alive, true);

  const c = mk(['werewolf', 'guard', 'witch', 'villager', 'villager', 'villager']);
  night(c, { guard: (s) => nact(s, 2, 'guard', 4), wolves: wk(4), witch: (s) => nact(s, 3, 'save') });
  assert.equal(seat(c, 4).alive, false);
});

test('獵人：被刀可開槍，被毒不能開槍', () => {
  const s = mk(['werewolf', 'hunter', 'witch', 'villager', 'villager', 'villager']);
  night(s, { wolves: wk(2) });
  adv(s);
  assert.equal(stageT(s), 'trigger');
  act(s, id(s, 2), 'shoot', 'shoot', [id(s, 1)], now());
  assert.equal(s.winner?.camp, 'good');

  const p = mk(['werewolf', 'hunter', 'witch', 'villager', 'villager', 'villager']);
  night(p, { wolves: wk(4), witch: (s) => nact(s, 3, 'poison', 2) });
  adv(p);
  assert.equal(stageT(p), 'lastWords');
  assert.deepEqual(alive(p), [1, 3, 5, 6]);
});

test('白痴：被放逐翻牌免死並失去投票權', () => {
  const s = mk(['werewolf', 'idiot', 'villager', 'villager', 'villager', 'seer']);
  night(s);
  until(s, 'vote');
  vote(s, { 1: 2, 3: 2, 4: 2 });
  assert.equal(seat(s, 2).alive, true);
  assert.equal(seat(s, 2).revealed, 'idiot');
  assert.equal(seat(s, 2).canVote, false);
  assert.equal(stageT(s), 'night');
  until(s, 'vote');
  const st = s.stage as Extract<Stage, { t: 'vote' }>;
  assert.ok(!st.voters.includes(id(s, 2)));
  assert.ok(!st.candidates.includes(id(s, 2)));
});

test('警長：唯一候選人當選、1.5 票、決定發言順序、移交警徽', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager'], { sheriff: true, winMode: 'all' });
  night(s);
  assert.equal(stageT(s), 'signup');
  act(s, id(s, 2), 'signup', 'run', [], now());
  for (const n of [1, 3, 4, 5]) act(s, id(s, n), 'signup', 'pass', [], now());
  assert.equal(s.sheriff, id(s, 2));
  adv(s);
  assert.equal(stageT(s), 'order');
  act(s, id(s, 2), 'order', 'asc', [], now());
  const sp = s.stage as Extract<Stage, { t: 'speech' }>;
  assert.deepEqual(sp.order.map((x) => s.players.find((p) => p.id === x)!.seat), [3, 4, 5, 1, 2]);
  until(s, 'vote');
  vote(s, { 2: 3, 1: 4 });
  assert.equal(seat(s, 3).alive, false, '警長 1.5 票應勝過 1 票');
  until(s, 'night');
  night(s, { wolves: wk(2) });
  adv(s);
  assert.equal(stageT(s), 'trigger');
  act(s, id(s, 2), 'badge', 'pass', [id(s, 5)], now());
  assert.equal(s.sheriff, id(s, 5));
});

test('警長競選平票 → PK → 再平票則警徽流失', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager', 'villager'], { sheriff: true });
  night(s);
  for (const n of [1, 2, 3, 4, 5, 6]) act(s, id(s, n), 'signup', n === 2 || n === 3 ? 'run' : 'pass', [], now());
  assert.equal((s.stage as Extract<Stage, { t: 'speech' }>).kind, 'sheriff');
  until(s, 'vote');
  vote(s, { 1: 2, 4: 3 });
  assert.equal((s.stage as Extract<Stage, { t: 'speech' }>).kind, 'sheriffPk');
  until(s, 'vote');
  vote(s, { 1: 2, 4: 3 });
  assert.equal(s.sheriffState, 'lost');
  assert.equal(s.sheriff, null);
});

test('競選期間狼人自爆：警長競選延後，隔天再自爆則警徽流失', () => {
  const s = mk(['werewolf', 'werewolf', 'seer', 'villager', 'villager', 'villager', 'villager'], { sheriff: true });
  night(s, { wolves: wk(4) });
  for (const n of [1, 2, 3, 4, 5, 6, 7]) act(s, id(s, n), 'signup', n === 1 || n === 3 ? 'run' : 'pass', [], now());
  skill(s, 1, 'boom');
  assert.equal(s.sheriffState, 'postponed');
  assert.equal(stageT(s), 'announce');
  assert.deepEqual(alive(s), [2, 3, 5, 6, 7]);
  until(s, 'night');
  assert.equal(s.day, 2);
  night(s);
  assert.equal(stageT(s), 'signup');
  for (const n of alive(s)) act(s, id(s, n), 'signup', n === 2 || n === 3 ? 'run' : 'pass', [], now());
  skill(s, 2, 'boom');
  assert.equal(s.sheriffState, 'lost');
});

test('狼王：被放逐可開槍，被毒不能開槍', () => {
  const s = mk(['wolfKing', 'werewolf', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(s);
  until(s, 'vote');
  vote(s, { 3: 1, 4: 1, 5: 1 });
  assert.equal(stageT(s), 'trigger');
  act(s, id(s, 1), 'shoot', 'shoot', [id(s, 3)], now());
  assert.equal(seat(s, 3).alive, false);
  assert.equal(stageT(s), 'lastWords');

  const p = mk(['wolfKing', 'werewolf', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(p, { witch: (s) => nact(s, 4, 'poison', 1) });
  adv(p);
  assert.equal(stageT(p), 'lastWords');
});

test('白狼王自爆帶人並直接進入黑夜', () => {
  const s = mk(['whiteWolfKing', 'werewolf', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(s);
  until(s, 'speech');
  skill(s, 1, 'boom', 3);
  assert.deepEqual(alive(s), [2, 4, 5, 6, 7]);
  assert.equal(stageT(s), 'night');
  assert.equal(s.day, 2);
});

test('騎士決鬥：對方是狼則狼死進黑夜；是好人則騎士死', () => {
  const s = mk(['werewolf', 'werewolf', 'knight', 'seer', 'villager', 'villager', 'villager']);
  night(s);
  until(s, 'speech');
  skill(s, 3, 'duel', 1);
  assert.equal(seat(s, 1).alive, false);
  assert.equal(stageT(s), 'night');
  assert.ok(!getSkills(s, id(s, 3)).some((k) => k.id === 'duel'));

  const f = mk(['werewolf', 'werewolf', 'knight', 'seer', 'villager', 'villager', 'villager']);
  night(f);
  until(f, 'speech');
  skill(f, 3, 'duel', 5);
  assert.equal(seat(f, 3).alive, false);
  assert.equal(seat(f, 5).alive, true);
  assert.equal(stageT(f), 'speech');
});

test('隱狼驗為好人；惡靈騎士反傷預言家與女巫', () => {
  const s = mk(['werewolf', 'hiddenWolf', 'evilKnight', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(s, { seer: (s) => nact(s, 4, 'check', 2) });
  assert.ok(hasPriv(s, 4, '2號 是好人'));
  until(s, 'night');
  night(s, { seer: (s) => nact(s, 4, 'check', 3), witch: (s) => nact(s, 5, 'poison', 3) });
  assert.ok(hasPriv(s, 4, '3號 是狼人'));
  assert.equal(seat(s, 3).alive, true);
  assert.equal(seat(s, 4).alive, false);
  assert.equal(seat(s, 5).alive, false);
});

test('魔術師交換號碼牌會轉移狼刀與查驗', () => {
  const s = mk(['werewolf', 'magician', 'seer', 'villager', 'villager', 'villager']);
  night(s, { magician: (s) => nact(s, 2, 'swap', 4, 5), wolves: wk(4) });
  assert.equal(seat(s, 4).alive, true);
  assert.equal(seat(s, 5).alive, false);
  until(s, 'night');
  night(s, {
    magician: (s) => {
      assert.ok(!getPrompt(s, id(s, 2))!.targets.includes(id(s, 4)));
      nact(s, 2, 'swap', 1, 6);
    },
    seer: (s) => nact(s, 3, 'check', 6),
  });
  assert.ok(hasPriv(s, 3, '6號 是狼人'));
});

test('攝夢人：夢遊者免疫、連續兩晚死亡、攝夢人夜死帶走夢遊者', () => {
  const s = mk(['werewolf', 'dreamer', 'witch', 'villager', 'villager', 'villager']);
  night(s, { dreamer: (s) => nact(s, 2, 'dream', 4), wolves: wk(4) });
  assert.equal(seat(s, 4).alive, true);
  until(s, 'night');
  night(s, { dreamer: (s) => nact(s, 2, 'dream', 4) });
  assert.equal(seat(s, 4).alive, false);

  const d = mk(['werewolf', 'dreamer', 'witch', 'villager', 'villager', 'villager']);
  night(d, { dreamer: (s) => nact(s, 2, 'dream', 4), wolves: wk(2) });
  assert.deepEqual(alive(d), [1, 3, 5, 6]);
});

test('獵魔人：第二晚起狩獵，狼死或自己死，且免疫毒藥', () => {
  const s = mk(['werewolf', 'werewolf', 'witcher', 'witch', 'villager', 'villager', 'villager']);
  assert.ok(!s.night!.steps.includes('witcher'));
  night(s);
  until(s, 'night');
  night(s, { witcher: (s) => nact(s, 3, 'hunt', 1), witch: (s) => nact(s, 4, 'poison', 3) });
  assert.equal(seat(s, 1).alive, false);
  assert.equal(seat(s, 3).alive, true, '獵魔人免疫毒藥');
  until(s, 'night');
  night(s, { witcher: (s) => nact(s, 3, 'hunt', 5) });
  assert.equal(seat(s, 3).alive, false);
  assert.equal(seat(s, 5).alive, true);
});

test('長老：擋下第一刀；被放逐則神職全部失去技能', () => {
  const s = mk(['werewolf', 'elder', 'seer', 'villager', 'villager', 'villager']);
  night(s, { wolves: wk(2) });
  assert.equal(seat(s, 2).alive, true);
  until(s, 'vote');
  vote(s, { 1: 2, 4: 2, 5: 2 });
  assert.equal(seat(s, 2).alive, false);
  assert.equal(s.rs.goodSealed, true);
  until(s, 'night');
  night(s, { seer: (s) => assert.ok(getPrompt(s, id(s, 3))!.blocked) });

  const k = mk(['werewolf', 'elder', 'seer', 'villager', 'villager', 'villager']);
  night(k, { wolves: wk(2) });
  until(k, 'night');
  night(k, { wolves: wk(2) });
  assert.equal(seat(k, 2).alive, false);
  assert.equal(k.rs.goodSealed, false);
});

test('丘比特：情侶殉情；人狼戀成為第三方並獲勝', () => {
  const s = mk(['werewolf', 'cupid', 'seer', 'villager', 'villager', 'villager']);
  night(s, { cupid: (s) => nact(s, 2, 'link', 3, 4), wolves: wk(3) });
  assert.deepEqual(alive(s), [1, 2, 5, 6]);
  assert.equal(s.rs.loversMixed, false);

  const m = mk(['werewolf', 'cupid', 'villager', 'villager']);
  night(m, { cupid: (s) => nact(s, 2, 'link', 1, 4), wolves: wk(3) });
  assert.equal(m.rs.loversMixed, true);
  adv(m);
  assert.equal(m.winner?.camp, 'lovers');
  assert.deepEqual([...m.winner!.ids].sort(), [id(m, 1), id(m, 2), id(m, 4)].sort());
});

test('野孩子：榜樣死亡後變成狼人並加入狼隊', () => {
  const s = mk(['werewolf', 'wildChild', 'seer', 'villager', 'villager', 'villager', 'villager']);
  night(s, { wildChild: (s) => nact(s, 2, 'pick', 4), wolves: wk(4) });
  assert.equal(s.rs.wildTurned, true);
  until(s, 'night');
  assert.equal((s.stage as NightStage).step, 'wolves');
  assert.ok((s.stage as NightStage).actors.includes(id(s, 2)));
});

test('盜賊：選擇底牌；底牌恰有一張狼牌時必須選狼', () => {
  const s = mk(['thief', 'werewolf', 'seer', 'villager', 'villager', 'villager', 'witch', 'villager']);
  assert.equal((s.stage as NightStage).step, 'thief');
  assert.equal(getPrompt(s, id(s, 1))!.options.length, 2);
  nact(s, 1, 'card0');
  assert.equal(seat(s, 1).role, 'witch');
  adv(s);
  until(s, 'announce');

  const f = mk(['thief', 'werewolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'wolfKing']);
  const pr = getPrompt(f, id(f, 1))!;
  assert.deepEqual(pr.options.map((o) => o.id), ['card1']);
  adv(f); // 逾時由系統代選
  assert.equal(seat(f, 1).role, 'wolfKing');
});

test('吹笛者：魅惑所有存活玩家後獨自獲勝', () => {
  const s = mk(['werewolf', 'piper', 'seer', 'villager', 'villager'], { winMode: 'all' });
  night(s, { piper: (s) => nact(s, 2, 'enchant', 1, 3) });
  adv(s);
  assert.equal(s.phase, 'playing');
  until(s, 'night');
  night(s, { piper: (s) => nact(s, 2, 'enchant', 4, 5) });
  adv(s);
  assert.equal(s.winner?.camp, 'piper');
});

test('夢魘：恐懼使技能失效；恐懼狼隊友則無法襲擊', () => {
  const s = mk(['nightmare', 'werewolf', 'seer', 'guard', 'villager', 'villager', 'villager']);
  night(s, {
    nightmare: (s) => nact(s, 1, 'fear', 3),
    seer: (s) => assert.ok(getPrompt(s, id(s, 3))!.blocked),
    wolves: wk(5),
  });
  assert.equal(seat(s, 5).alive, false);
  until(s, 'night');
  night(s, {
    nightmare: (s) => nact(s, 1, 'fear', 2),
    wolves: (s) => assert.ok(getPrompt(s, id(s, 1))!.blocked),
  });
  assert.ok(hasLog(s, '平安夜'));
});

test('狼美人：出局時被魅惑者殉情', () => {
  const s = mk(['wolfBeauty', 'werewolf', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(s, { wolfBeauty: (s) => nact(s, 1, 'charm', 5) });
  until(s, 'vote');
  vote(s, { 3: 1, 4: 1, 6: 1 });
  assert.equal(seat(s, 1).alive, false);
  assert.equal(seat(s, 5).alive, false);
  assert.equal(seat(s, 5).cause, 'charm');
});

test('血月使徒：自爆封印當晚神職；最後一狼被放逐多活一夜', () => {
  const s = mk(['bloodMoon', 'werewolf', 'seer', 'witch', 'villager', 'villager', 'villager']);
  night(s);
  until(s, 'speech');
  skill(s, 1, 'boom');
  assert.equal(stageT(s), 'night');
  night(s, { seer: (s) => assert.ok(getPrompt(s, id(s, 3))!.blocked) });
  until(s, 'night');
  night(s, { seer: (s) => assert.ok(!getPrompt(s, id(s, 3))!.blocked) });

  const d = mk(['bloodMoon', 'seer', 'witch', 'villager', 'villager']);
  night(d);
  until(d, 'vote');
  vote(d, { 2: 1, 3: 1, 4: 1 });
  assert.equal(seat(d, 1).alive, true);
  assert.equal(stageT(d), 'night');
  night(d, { wolves: wk(4) });
  assert.deepEqual(alive(d), [2, 3, 5]);
  adv(d);
  assert.equal(d.winner?.camp, 'good');
});

test('熊咆哮與狐狸失去技能', () => {
  const s = mk(['werewolf', 'bear', 'fox', 'villager', 'villager', 'villager']);
  night(s, { fox: (s) => nact(s, 3, 'check', 5) });
  assert.ok(hasLog(s, '熊咆哮了'));
  assert.equal(s.rs.foxLost, true);
  assert.ok(hasPriv(s, 3, '沒有狼人'));
});

test('烏鴉詛咒多一票；禁言長老使玩家跳過發言', () => {
  const s = mk(['werewolf', 'crow', 'silencer', 'villager', 'villager', 'villager']);
  night(s, { silencer: (s) => nact(s, 3, 'silence', 4), crow: (s) => nact(s, 2, 'curse', 5) });
  until(s, 'vote');
  assert.ok(hasLog(s, '4號 被禁言，跳過發言'));
  vote(s, {});
  assert.equal(seat(s, 5).alive, false);
});

test('石像鬼：狼隊全滅後獲得襲擊能力', () => {
  const s = mk(['werewolf', 'gargoyle', 'seer', 'witch', 'villager', 'villager', 'villager', 'villager']);
  night(s, {
    wolves: (s) => assert.deepEqual((s.stage as NightStage).actors, [id(s, 1)]),
    gargoyle: (s) => nact(s, 2, 'check', 3),
  });
  assert.ok(hasPriv(s, 2, '3號 的身分是【預言家】'));
  until(s, 'vote');
  vote(s, { 3: 1, 4: 1, 5: 1 });
  until(s, 'night');
  assert.deepEqual((s.stage as NightStage).actors, [id(s, 2)]);
});

test('放逐平票 → PK → 再平票無人出局', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager', 'villager']);
  night(s);
  until(s, 'vote');
  vote(s, { 1: 3, 2: 4 });
  assert.equal((s.stage as Extract<Stage, { t: 'speech' }>).kind, 'pk');
  until(s, 'vote');
  const st = s.stage as Extract<Stage, { t: 'vote' }>;
  assert.equal(st.round, 2);
  assert.ok(!st.voters.includes(id(s, 3)) && !st.voters.includes(id(s, 4)));
  vote(s, { 1: 3, 2: 4 });
  assert.equal(stageT(s), 'night');
  assert.deepEqual(alive(s), [1, 2, 3, 4, 5, 6]);
});

test('玩家畫面不會洩漏他人的身分或金鑰', () => {
  const s = mk(['werewolf', 'werewolf', 'seer', 'villager', 'villager', 'villager', 'villager']);
  const v = viewFor(s, seat(s, 5).token, 1, now());
  assert.equal(v.meId, id(s, 5));
  assert.deepEqual(v.players.filter((p) => p.role).map((p) => p.seat), [5]);
  const json = JSON.stringify(v);
  for (const p of s.players) assert.ok(!json.includes(p.token), '畫面不應包含任何金鑰');

  const w = viewFor(s, seat(s, 1).token, 1, now());
  assert.deepEqual(w.players.filter((p) => p.role).map((p) => p.seat), [1, 2]);
  assert.equal(w.players[1].wolfmate, true);

  const anon = viewFor(s, 'nope', 1, now());
  assert.equal(anon.meId, null);
  assert.equal(anon.players.filter((p) => p.role).length, 0);
  assert.equal(viewFor(s, '', 1, now()).meId, null, '空金鑰不能冒充電腦玩家');
});

test('同一場遊戲，每位玩家看到的是自己選的語言', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager']);
  night(s, { wolves: wk(3), seer: (g) => nact(g, 2, 'check', 1) });
  const token = seat(s, 2).token;
  const zh = viewFor(s, token, 1, now(), 'zh');
  const en = viewFor(s, token, 1, now(), 'en');
  assert.equal(zh.lang, 'zh');
  assert.equal(en.lang, 'en');
  assert.ok(zh.priv.some((p) => p.text.includes('1號 是狼人')));
  assert.ok(en.priv.some((p) => p.text.includes('#1 is a werewolf')));
  assert.ok(zh.log.some((l) => l.text.includes('第 1 夜')));
  assert.ok(en.log.some((l) => l.text.includes('Night 1')));
  assert.notEqual(zh.stage.title, en.stage.title);
  // 錯誤訊息使用發出操作的人的語言
  assert.throws(() => withLang('en', () => act(s, id(s, 2), 'night:seer', 'check', [id(s, 1)], now())), /cannot do that/);
});

test('夜晚行動的輸入驗證', () => {
  const s = mk(['werewolf', 'seer', 'villager', 'villager', 'villager']);
  assert.equal((s.stage as NightStage).step, 'wolves');
  assert.throws(() => act(s, id(s, 3), 'night:wolves', 'kill', [id(s, 2)], now()), /無法/);
  assert.throws(() => act(s, id(s, 1), 'night:wolves', 'kill', ['bogus'], now()), /無效/);
  assert.throws(() => act(s, id(s, 1), 'night:wolves', 'kill', [], now()), /請選擇/);
  assert.throws(() => act(s, id(s, 2), 'night:seer', 'check', [id(s, 1)], now()), /無法/);
});
