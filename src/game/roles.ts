import type { Config, NightStep, RoleDef, RoleId } from './types';

export const ROLES: Record<RoleId, RoleDef> = {
  // ───────── 好人陣營 ─────────
  villager: {
    id: 'villager',
    name: '平民',
    camp: 'good',
    kind: 'villager',
    icon: '🧑‍🌾',
    short: '沒有特殊技能，靠發言與投票找出狼人。',
    desc: '沒有任何夜間技能。白天透過聆聽發言、分析票型，把狼人投出去。平民全部出局時（屠邊規則）狼人獲勝，所以活著就是貢獻。',
  },
  seer: {
    id: 'seer',
    name: '預言家',
    camp: 'good',
    kind: 'god',
    icon: '🔮',
    short: '每晚查驗一名玩家是好人還是狼人。',
    desc: '每晚可以查驗一名玩家的陣營，得知他是「好人」或「狼人」。隱狼會被驗成好人。查驗到惡靈騎士會遭到反傷而在天亮後死亡。',
  },
  witch: {
    id: 'witch',
    name: '女巫',
    camp: 'good',
    kind: 'god',
    icon: '🧪',
    short: '擁有一瓶解藥與一瓶毒藥，同一晚只能用一瓶。',
    desc: '解藥可以救活當晚被狼人襲擊的玩家，毒藥可以毒死一名玩家，兩瓶各只能用一次，且同一晚只能使用其中一瓶。解藥用掉後就不會再得知夜晚的死訊。被毒死的獵人、狼王無法開槍。',
  },
  hunter: {
    id: 'hunter',
    name: '獵人',
    camp: 'good',
    kind: 'god',
    icon: '🏹',
    short: '出局時可以開槍帶走一名玩家（被毒死除外）。',
    desc: '被狼人殺害或被放逐出局時，可以翻牌開槍帶走一名玩家。若是被女巫毒死、殉情，則無法開槍。',
  },
  guard: {
    id: 'guard',
    name: '守衛',
    camp: 'good',
    kind: 'god',
    icon: '🛡️',
    short: '每晚守護一名玩家免受狼人襲擊，不能連續兩晚守同一人。',
    desc: '每晚可以守護一名玩家（可以是自己），被守護者當晚不會被狼人殺死，但擋不住女巫的毒藥。不能連續兩晚守護同一人。若同一晚被守衛守護又被女巫解藥救，該玩家仍會死亡（同守同救）。',
  },
  idiot: {
    id: 'idiot',
    name: '白痴',
    camp: 'good',
    kind: 'god',
    icon: '🤪',
    short: '被投票放逐時可翻牌免死，但之後失去投票權。',
    desc: '被投票放逐時翻開身分牌免於出局，之後仍可發言，但失去投票權。若是夜晚被殺或被槍殺，則正常死亡。',
  },
  knight: {
    id: 'knight',
    name: '騎士',
    camp: 'good',
    kind: 'god',
    icon: '⚔️',
    short: '白天可翻牌決鬥一名玩家：對方是狼則狼死，否則自己死。',
    desc: '白天發言階段可以翻牌，指定一名玩家決鬥（整局限一次）。若對方是狼人，對方立即出局並直接進入黑夜；若對方是好人，騎士以死謝罪，白天繼續。',
  },
  gravekeeper: {
    id: 'gravekeeper',
    name: '守墓人',
    camp: 'good',
    kind: 'god',
    icon: '⚰️',
    short: '每晚得知前一天被放逐的玩家是好人還是狼人。',
    desc: '每個夜晚會得知前一個白天被放逐出局的玩家是好人或狼人。沒有人被放逐時不會得到任何資訊。',
  },
  silencer: {
    id: 'silencer',
    name: '禁言長老',
    camp: 'good',
    kind: 'god',
    icon: '🤐',
    short: '每晚禁言一名玩家，使他隔天無法發言。',
    desc: '每晚可以選擇一名玩家，該玩家在隔天白天無法發言（仍可投票）。不能連續兩晚禁言同一人。',
  },
  magician: {
    id: 'magician',
    name: '魔術師',
    camp: 'good',
    kind: 'god',
    icon: '🎩',
    short: '每晚可交換兩名玩家的號碼牌，當晚針對他們的技能會互換。',
    desc: '每晚可以交換兩名玩家的號碼牌，當晚所有以這兩人為目標的技能效果會互換（狼刀、查驗、毒藥、守護…）。每位玩家整局只能被交換一次。',
  },
  dreamer: {
    id: 'dreamer',
    name: '攝夢人',
    camp: 'good',
    kind: 'god',
    icon: '💤',
    short: '每晚讓一名玩家夢遊，夢遊者免疫夜間傷害；連續兩晚則死亡。',
    desc: '每晚選擇一名其他玩家成為夢遊者，夢遊者當晚免疫狼刀與毒藥。若攝夢人在夜晚死亡，夢遊者會一起出局。連續兩晚讓同一人夢遊，該玩家會死亡。',
  },
  witcher: {
    id: 'witcher',
    name: '獵魔人',
    camp: 'good',
    kind: 'god',
    icon: '🗡️',
    short: '第二晚起可狩獵一名玩家：是狼則狼死，是好人則自己死。',
    desc: '從第二個夜晚開始，每晚可以選擇一名玩家狩獵。若對方是狼人，對方隔天出局；若對方是好人，獵魔人自己出局。女巫的毒藥對獵魔人無效。',
  },
  bear: {
    id: 'bear',
    name: '熊',
    camp: 'good',
    kind: 'god',
    icon: '🐻',
    short: '天亮時若相鄰的存活玩家中有狼人，熊會咆哮。',
    desc: '每天天亮時，如果熊還活著，且左右兩側最近的存活玩家中有狼人，法官會宣布「熊咆哮了」。',
  },
  fox: {
    id: 'fox',
    name: '狐狸',
    camp: 'good',
    kind: 'god',
    icon: '🦊',
    short: '每晚查驗相鄰三人中是否有狼；若沒有則失去技能。',
    desc: '每晚選擇一名玩家，得知該玩家與其左右兩位存活玩家這三人中是否有狼人。如果三人中沒有狼人，狐狸將永久失去技能。',
  },
  elder: {
    id: 'elder',
    name: '長老',
    camp: 'good',
    kind: 'god',
    icon: '👴',
    short: '可以抵擋一次狼人襲擊；若被好人害死，所有神職失去技能。',
    desc: '第一次被狼人襲擊時不會死亡。若長老被投票放逐、被獵人槍殺或被女巫毒死，所有好人陣營的神職將永久失去技能。',
  },
  crow: {
    id: 'crow',
    name: '烏鴉',
    camp: 'good',
    kind: 'god',
    icon: '🪶',
    short: '每晚詛咒一名玩家，他隔天放逐投票時額外多一票。',
    desc: '每晚可以詛咒一名玩家，該玩家在隔天的放逐投票中會額外被計入一票。',
  },
  psychic: {
    id: 'psychic',
    name: '通靈師',
    camp: 'good',
    kind: 'god',
    icon: '👁️',
    short: '每晚查驗一名玩家的具體身分。',
    desc: '每晚可以查驗一名玩家，直接得知該玩家的具體身分牌。',
  },

  // ───────── 狼人陣營 ─────────
  werewolf: {
    id: 'werewolf',
    name: '狼人',
    camp: 'wolf',
    kind: 'wolf',
    icon: '🐺',
    short: '每晚與狼隊友共同襲擊一名玩家，白天可以自爆。',
    desc: '每晚與狼隊友一起睜眼，共同決定襲擊一名玩家（也可以空刀或自刀）。白天發言階段可以自爆：亮出身分出局，並立即進入黑夜。',
  },
  wolfKing: {
    id: 'wolfKing',
    name: '狼王',
    camp: 'wolf',
    kind: 'wolf',
    icon: '👑',
    short: '出局時可以開槍帶走一名玩家（被毒死或自爆除外）。',
    desc: '擁有狼人的所有能力。被放逐或被槍殺出局時，可以開槍帶走一名玩家。若被女巫毒死或自爆，則無法發動技能。',
  },
  whiteWolfKing: {
    id: 'whiteWolfKing',
    name: '白狼王',
    camp: 'wolf',
    kind: 'wolf',
    icon: '🐾',
    short: '白天自爆時可以帶走一名玩家。',
    desc: '擁有狼人的所有能力。白天發言階段自爆時，可以同時帶走一名玩家。若是被放逐或夜晚死亡，則無法發動技能。',
  },
  wolfBeauty: {
    id: 'wolfBeauty',
    name: '狼美人',
    camp: 'wolf',
    kind: 'wolf',
    icon: '💋',
    short: '每晚魅惑一名玩家；狼美人出局時，被魅惑者殉情。',
    desc: '每晚襲擊後可以魅惑一名玩家，不能連續兩晚魅惑同一人。狼美人出局時，最近一次被魅惑的玩家會跟著殉情出局，且無法發動技能。狼美人不能自爆。',
  },
  hiddenWolf: {
    id: 'hiddenWolf',
    name: '隱狼',
    camp: 'wolf',
    kind: 'wolf',
    icon: '🎭',
    short: '預言家查驗為好人。知道狼隊友，但不參與襲擊。',
    desc: '被預言家查驗時顯示為好人。知道誰是狼隊友，但狼隊友不知道隱狼是誰，也不參與夜晚襲擊。當其他狼人全部出局後，隱狼獲得襲擊能力。隱狼不能自爆。',
  },
  evilKnight: {
    id: 'evilKnight',
    name: '惡靈騎士',
    camp: 'wolf',
    kind: 'wolf',
    icon: '💀',
    short: '免疫夜間傷害；被查驗或被毒時，對方反而死亡。',
    desc: '夜晚不會死亡。若被預言家查驗，預言家隔天死亡；若被女巫下毒，女巫隔天死亡。惡靈騎士不能自爆，只能被放逐、槍殺或決鬥出局。',
  },
  nightmare: {
    id: 'nightmare',
    name: '夢魘',
    camp: 'wolf',
    kind: 'wolf',
    icon: '😱',
    short: '每晚最先行動，恐懼一名玩家使其當晚無法使用技能。',
    desc: '每晚在所有人之前行動，恐懼一名玩家，使其當晚無法使用技能。不能連續兩晚恐懼同一人。如果恐懼到狼隊友，當晚狼人無法襲擊。',
  },
  gargoyle: {
    id: 'gargoyle',
    name: '石像鬼',
    camp: 'wolf',
    kind: 'wolf',
    icon: '🗿',
    short: '每晚查驗一名玩家的具體身分。不與狼隊友見面。',
    desc: '每晚可以查驗一名玩家的具體身分。石像鬼與其他狼人互不相識，也不參與襲擊。當其他狼人全部出局後，石像鬼獲得襲擊能力。石像鬼不能自爆。',
  },
  bloodMoon: {
    id: 'bloodMoon',
    name: '血月使徒',
    camp: 'wolf',
    kind: 'wolf',
    icon: '🩸',
    short: '自爆後，下一個夜晚所有神職技能被封印。',
    desc: '擁有狼人的所有能力。自爆後的下一個夜晚，所有好人神職的技能都會被封印。若血月使徒是最後一個被放逐的狼人，可以多活一個夜晚，於隔天天亮後才出局。',
  },

  // ───────── 第三方 ─────────
  cupid: {
    id: 'cupid',
    name: '丘比特',
    camp: 'third',
    kind: 'third',
    icon: '💘',
    short: '第一晚指定兩名玩家成為情侶，一方死亡另一方殉情。',
    desc: '第一晚指定兩名玩家成為情侶（可以包含自己）。情侶其中一人死亡，另一人立刻殉情。若情侶同陣營，丘比特與他們同陣營；若情侶是一人一狼，則情侶與丘比特成為第三方，需要活到最後只剩他們才能獲勝。',
  },
  wildChild: {
    id: 'wildChild',
    name: '野孩子',
    camp: 'third',
    kind: 'third',
    icon: '🧒',
    short: '第一晚選擇一名榜樣；榜樣死亡後，野孩子變成狼人。',
    desc: '第一晚選擇一名玩家作為榜樣。只要榜樣還活著，野孩子就屬於好人陣營（算作平民）。一旦榜樣死亡，野孩子立刻變成狼人並加入狼隊。',
  },
  thief: {
    id: 'thief',
    name: '盜賊',
    camp: 'third',
    kind: 'third',
    icon: '🦹',
    short: '第一晚從兩張底牌中挑選一張作為自己的身分。',
    desc: '牌堆會比玩家多兩張。第一晚盜賊最先睜眼，從剩下的兩張底牌中選擇一張作為自己的身分。若底牌中恰好有一張狼人牌，必須選擇狼人牌。',
  },
  piper: {
    id: 'piper',
    name: '吹笛者',
    camp: 'third',
    kind: 'third',
    icon: '🎶',
    short: '每晚魅惑最多兩名玩家；所有存活者都被魅惑時獨自獲勝。',
    desc: '獨立的第三方。每晚可以魅惑最多兩名玩家，被魅惑的玩家會知道彼此，但不知道吹笛者是誰。當其他所有存活玩家都被魅惑時，吹笛者獨自獲勝。預言家查驗為好人。',
  },
  halfBlood: {
    id: 'halfBlood',
    name: '混血兒',
    camp: 'third',
    kind: 'third',
    icon: '🧬',
    short: '第一晚選擇一名玩家認親，陣營與對方相同。',
    desc: '第一晚選擇一名玩家認親，之後混血兒的陣營就與該玩家相同，但不會知道對方的身分。預言家查驗永遠為好人。',
  },
};

export const ROLE_GROUPS: { title: string; camp: 'wolf' | 'god' | 'villager' | 'third'; ids: RoleId[] }[] = [
  {
    title: '狼人陣營',
    camp: 'wolf',
    ids: ['werewolf', 'wolfKing', 'whiteWolfKing', 'wolfBeauty', 'hiddenWolf', 'evilKnight', 'nightmare', 'gargoyle', 'bloodMoon'],
  },
  {
    title: '神職',
    camp: 'god',
    ids: [
      'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', 'gravekeeper', 'silencer',
      'magician', 'dreamer', 'witcher', 'bear', 'fox', 'elder', 'crow', 'psychic',
    ],
  },
  { title: '平民', camp: 'villager', ids: ['villager'] },
  { title: '第三方', camp: 'third', ids: ['cupid', 'wildChild', 'thief', 'piper', 'halfBlood'] },
];

/** 夜晚行動順序 */
export const NIGHT_ORDER: NightStep[] = [
  'thief', 'cupid', 'halfBlood', 'wildChild',
  'nightmare', 'magician', 'dreamer', 'guard',
  'wolves', 'wolfBeauty', 'gargoyle',
  'witch', 'seer', 'psychic', 'fox', 'witcher',
  'silencer', 'crow', 'piper',
];

export const FIRST_NIGHT_ONLY: NightStep[] = ['thief', 'cupid', 'halfBlood', 'wildChild'];

export const STEP_NAME: Record<NightStep, string> = {
  thief: '盜賊',
  cupid: '丘比特',
  halfBlood: '混血兒',
  wildChild: '野孩子',
  nightmare: '夢魘',
  magician: '魔術師',
  dreamer: '攝夢人',
  guard: '守衛',
  wolves: '狼人',
  wolfBeauty: '狼美人',
  gargoyle: '石像鬼',
  witch: '女巫',
  seer: '預言家',
  psychic: '通靈師',
  fox: '狐狸',
  witcher: '獵魔人',
  silencer: '禁言長老',
  crow: '烏鴉',
  piper: '吹笛者',
};

const rep = (id: RoleId, n: number): RoleId[] => Array.from({ length: n }, () => id);

/** 依人數的預設牌堆 */
export function defaultRoles(n: number): RoleId[] {
  const table: Record<number, RoleId[]> = {
    4: ['werewolf', 'seer', ...rep('villager', 2)],
    5: ['werewolf', 'seer', 'witch', ...rep('villager', 2)],
    6: [...rep('werewolf', 2), 'seer', 'witch', ...rep('villager', 2)],
    7: [...rep('werewolf', 2), 'seer', 'witch', 'hunter', ...rep('villager', 2)],
    8: [...rep('werewolf', 2), 'seer', 'witch', 'hunter', ...rep('villager', 3)],
    9: [...rep('werewolf', 3), 'seer', 'witch', 'hunter', ...rep('villager', 3)],
    10: [...rep('werewolf', 3), 'seer', 'witch', 'hunter', 'guard', ...rep('villager', 3)],
    11: [...rep('werewolf', 3), 'seer', 'witch', 'hunter', 'idiot', ...rep('villager', 4)],
    12: [...rep('werewolf', 4), 'seer', 'witch', 'hunter', 'idiot', ...rep('villager', 4)],
    13: [...rep('werewolf', 4), 'seer', 'witch', 'hunter', 'guard', 'idiot', ...rep('villager', 4)],
    14: [...rep('werewolf', 4), 'wolfKing', 'seer', 'witch', 'hunter', 'guard', 'idiot', ...rep('villager', 4)],
    15: [...rep('werewolf', 4), 'wolfKing', 'seer', 'witch', 'hunter', 'guard', 'idiot', ...rep('villager', 5)],
    16: [...rep('werewolf', 4), 'wolfKing', 'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', ...rep('villager', 5)],
    17: [...rep('werewolf', 4), 'wolfKing', 'whiteWolfKing', 'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', ...rep('villager', 5)],
    18: [...rep('werewolf', 4), 'wolfKing', 'whiteWolfKing', 'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', ...rep('villager', 6)],
  };
  const k = Math.max(4, Math.min(18, n));
  return [...table[k]];
}

export interface Preset {
  id: string;
  name: string;
  /** 玩家數（含盜賊的板子牌數會多 2） */
  players: number;
  roles: RoleId[];
  note: string;
}

const board = (wolves: RoleId[], gods: RoleId[], villagers: number, extra: RoleId[] = []): RoleId[] => [
  ...wolves,
  ...gods,
  ...rep('villager', villagers),
  ...extra,
];

export const PRESETS: Preset[] = [
  { id: 'std9', name: '9 人標準局', players: 9, roles: defaultRoles(9), note: '預言家、女巫、獵人 + 3 狼 3 民' },
  { id: 'std12', name: '預女獵白', players: 12, roles: defaultRoles(12), note: '最經典的 12 人標準板' },
  {
    id: 'guard12',
    name: '預女獵守',
    players: 12,
    roles: board(rep('werewolf', 4), ['seer', 'witch', 'hunter', 'guard'], 4),
    note: '守衛登場，注意同守同救',
  },
  {
    id: 'wolfking12',
    name: '狼王守衛',
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfKing'], ['seer', 'witch', 'hunter', 'guard'], 4),
    note: '狼王出局可以開槍',
  },
  {
    id: 'whitewolf12',
    name: '白狼王騎士',
    players: 12,
    roles: board([...rep('werewolf', 3), 'whiteWolfKing'], ['seer', 'witch', 'knight', 'guard'], 4),
    note: '白狼王自爆帶人 vs 騎士決鬥',
  },
  {
    id: 'beauty12',
    name: '狼美人騎士',
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfBeauty'], ['seer', 'witch', 'knight', 'hunter'], 4),
    note: '狼美人魅惑殉情',
  },
  {
    id: 'nightmare12',
    name: '夢魘守衛',
    players: 12,
    roles: board([...rep('werewolf', 3), 'nightmare'], ['seer', 'witch', 'hunter', 'guard'], 4),
    note: '夢魘恐懼封鎖技能',
  },
  {
    id: 'gargoyle12',
    name: '石像鬼守墓人',
    players: 12,
    roles: board([...rep('werewolf', 3), 'gargoyle'], ['seer', 'witch', 'hunter', 'gravekeeper'], 4),
    note: '石像鬼獨自查驗身分',
  },
  {
    id: 'bloodmoon12',
    name: '血月獵魔',
    players: 12,
    roles: board([...rep('werewolf', 3), 'bloodMoon'], ['seer', 'witch', 'idiot', 'witcher'], 4),
    note: '血月使徒封印 vs 獵魔人狩獵',
  },
  {
    id: 'magician12',
    name: '狼王魔術師',
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfKing'], ['seer', 'witch', 'hunter', 'magician'], 4),
    note: '魔術師交換號碼牌',
  },
  {
    id: 'evil12',
    name: '惡靈騎士攝夢人',
    players: 12,
    roles: board([...rep('werewolf', 3), 'evilKnight'], ['seer', 'witch', 'hunter', 'dreamer'], 4),
    note: '惡靈騎士反傷 vs 攝夢人',
  },
  {
    id: 'hidden12',
    name: '隱狼禁言',
    players: 12,
    roles: board([...rep('werewolf', 3), 'hiddenWolf'], ['seer', 'witch', 'hunter', 'silencer'], 4),
    note: '隱狼驗出來是好人',
  },
  {
    id: 'classic12',
    name: '丘比特盜賊',
    players: 12,
    roles: board(rep('werewolf', 4), ['seer', 'witch', 'hunter', 'guard'], 4, ['cupid', 'thief']),
    note: '經典版：情侶與盜賊（14 張牌）',
  },
  {
    id: 'village10',
    name: '熊狐烏鴉',
    players: 10,
    roles: board(rep('werewolf', 3), ['seer', 'witch', 'bear', 'fox', 'crow'], 2),
    note: '歐式村莊角色',
  },
  {
    id: 'chaos15',
    name: '亂鬥 15 人',
    players: 15,
    roles: board(
      ['werewolf', 'werewolf', 'wolfKing', 'wolfBeauty', 'nightmare'],
      ['seer', 'witch', 'hunter', 'guard', 'idiot', 'knight'],
      3,
      ['wildChild'],
    ),
    note: '多種特殊狼 + 野孩子',
  },
];

export const DEFAULT_CONFIG: Config = {
  roles: defaultRoles(6),
  auto: true,
  sheriff: true,
  winMode: 'edge',
  witchSelfSave: 'first',
  lastWords: 'first',
  guardSaveClash: true,
  speechSec: 90,
  actionSec: 30,
  voteSec: 30,
  strictChat: false,
  deadSeeAll: false,
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 18;

export function roleName(id: RoleId | null | undefined): string {
  return id ? ROLES[id].name : '未知';
}
