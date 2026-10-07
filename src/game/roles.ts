import { L, type LText, loc, t } from './i18n';
import type { Config, NightStep, RoleDef, RoleId, WinCamp } from './types';

export const ROLES: Record<RoleId, RoleDef> = {
  // ───────── 好人陣營 ─────────
  villager: {
    id: 'villager',
    name: L('平民', 'Villager'),
    camp: 'good',
    kind: 'villager',
    icon: '🧑‍🌾',
    short: L('沒有特殊技能，靠發言與投票找出狼人。', 'No special ability. Find the werewolves through speeches and votes.'),
    desc: L('沒有任何夜間技能。白天透過聆聽發言、分析票型，把狼人投出去。平民全部出局時（屠邊規則）狼人獲勝，所以活著就是貢獻。', 'Has no night ability. During the day, listen to the speeches, read the voting patterns and vote the werewolves out. Under the "kill a side" rule the werewolves win once every villager is out, so simply staying alive helps your team.'),
  },
  seer: {
    id: 'seer',
    name: L('預言家', 'Seer'),
    camp: 'good',
    kind: 'god',
    icon: '🔮',
    short: L('每晚查驗一名玩家是好人還是狼人。', 'Each night, check whether one player is good or a werewolf.'),
    desc: L('每晚可以查驗一名玩家的陣營，得知他是「好人」或「狼人」。隱狼會被驗成好人。查驗到惡靈騎士會遭到反傷而在天亮後死亡。', 'Each night you may check one player and learn whether they are "good" or a "werewolf". The Hidden Wolf shows up as good. Checking the Evil Knight backfires: you die at dawn.'),
  },
  witch: {
    id: 'witch',
    name: L('女巫', 'Witch'),
    camp: 'good',
    kind: 'god',
    icon: '🧪',
    short: L('擁有一瓶解藥與一瓶毒藥，同一晚只能用一瓶。', 'Has one antidote and one poison; only one may be used per night.'),
    desc: L('解藥可以救活當晚被狼人襲擊的玩家，毒藥可以毒死一名玩家，兩瓶各只能用一次，且同一晚只能使用其中一瓶。解藥用掉後就不會再得知夜晚的死訊。被毒死的獵人、狼王無法開槍。', 'The antidote saves the player attacked by the werewolves that night; the poison kills a player of your choice. Each can be used once, and only one of them on the same night. Once the antidote is gone you no longer learn who was attacked. A poisoned Hunter or Wolf King cannot shoot.'),
  },
  hunter: {
    id: 'hunter',
    name: L('獵人', 'Hunter'),
    camp: 'good',
    kind: 'god',
    icon: '🏹',
    short: L('出局時可以開槍帶走一名玩家（被毒死除外）。', 'When eliminated, may shoot one player (not if poisoned).'),
    desc: L('被狼人殺害或被放逐出局時，可以翻牌開槍帶走一名玩家。若是被女巫毒死、殉情，則無法開槍。', 'When killed by the werewolves or voted out, you may reveal your card and shoot one player. If you were poisoned by the Witch or died of heartbreak, you cannot shoot.'),
  },
  guard: {
    id: 'guard',
    name: L('守衛', 'Guard'),
    camp: 'good',
    kind: 'god',
    icon: '🛡️',
    short: L('每晚守護一名玩家免受狼人襲擊，不能連續兩晚守同一人。', 'Each night, protect one player from the werewolves; not the same player twice in a row.'),
    desc: L('每晚可以守護一名玩家（可以是自己），被守護者當晚不會被狼人殺死，但擋不住女巫的毒藥。不能連續兩晚守護同一人。若同一晚被守衛守護又被女巫解藥救，該玩家仍會死亡（同守同救）。', "Each night you may protect one player (including yourself). They cannot be killed by the werewolves that night, but the Witch's poison still works. You cannot protect the same player two nights in a row. A player who is both protected by you and saved by the Witch's antidote on the same night still dies (guard-and-save clash)."),
  },
  idiot: {
    id: 'idiot',
    name: L('白痴', 'Idiot'),
    camp: 'good',
    kind: 'god',
    icon: '🤪',
    short: L('被投票放逐時可翻牌免死，但之後失去投票權。', 'When voted out, may reveal to survive, but loses the right to vote.'),
    desc: L('被投票放逐時翻開身分牌免於出局，之後仍可發言，但失去投票權。若是夜晚被殺或被槍殺，則正常死亡。', 'When voted out, you reveal your card and stay in the game. You can still speak but can no longer vote. If you are killed at night or shot, you die as usual.'),
  },
  knight: {
    id: 'knight',
    name: L('騎士', 'Knight'),
    camp: 'good',
    kind: 'god',
    icon: '⚔️',
    short: L('白天可翻牌決鬥一名玩家：對方是狼則狼死，否則自己死。', 'By day, may reveal and duel a player: a wolf dies, otherwise you die.'),
    desc: L('白天發言階段可以翻牌，指定一名玩家決鬥（整局限一次）。若對方是狼人，對方立即出局並直接進入黑夜；若對方是好人，騎士以死謝罪，白天繼續。', 'During the daytime speeches you may reveal your card and duel one player (once per game). If they are a werewolf, they are eliminated at once and night falls immediately; if they are good, you die instead and the day goes on.'),
  },
  gravekeeper: {
    id: 'gravekeeper',
    name: L('守墓人', 'Gravekeeper'),
    camp: 'good',
    kind: 'god',
    icon: '⚰️',
    short: L('每晚得知前一天被放逐的玩家是好人還是狼人。', 'Each night, learn whether the player exiled the day before was good or a werewolf.'),
    desc: L('每個夜晚會得知前一個白天被放逐出局的玩家是好人或狼人。沒有人被放逐時不會得到任何資訊。', 'Every night you learn whether the player exiled during the previous day was good or a werewolf. If nobody was exiled, you learn nothing.'),
  },
  silencer: {
    id: 'silencer',
    name: L('禁言長老', 'Silencer'),
    camp: 'good',
    kind: 'god',
    icon: '🤐',
    short: L('每晚禁言一名玩家，使他隔天無法發言。', 'Each night, silence one player so they cannot speak the next day.'),
    desc: L('每晚可以選擇一名玩家，該玩家在隔天白天無法發言（仍可投票）。不能連續兩晚禁言同一人。', 'Each night you may choose one player who will be unable to speak during the next day (they can still vote). You cannot silence the same player two nights in a row.'),
  },
  magician: {
    id: 'magician',
    name: L('魔術師', 'Magician'),
    camp: 'good',
    kind: 'god',
    icon: '🎩',
    short: L('每晚可交換兩名玩家的號碼牌，當晚針對他們的技能會互換。', "Each night, may swap two players' number tags; abilities aimed at them are swapped."),
    desc: L('每晚可以交換兩名玩家的號碼牌，當晚所有以這兩人為目標的技能效果會互換（狼刀、查驗、毒藥、守護…）。每位玩家整局只能被交換一次。', 'Each night you may swap the number tags of two players. Every ability aimed at either of them that night lands on the other instead (wolf attack, check, poison, protection…). Each player can be swapped only once per game.'),
  },
  dreamer: {
    id: 'dreamer',
    name: L('攝夢人', 'Dreamweaver'),
    camp: 'good',
    kind: 'god',
    icon: '💤',
    short: L('每晚讓一名玩家夢遊，夢遊者免疫夜間傷害；連續兩晚則死亡。', 'Each night, make a player sleepwalk and be immune to night attacks; two nights in a row kills them.'),
    desc: L('每晚選擇一名其他玩家成為夢遊者，夢遊者當晚免疫狼刀與毒藥。若攝夢人在夜晚死亡，夢遊者會一起出局。連續兩晚讓同一人夢遊，該玩家會死亡。', 'Each night you choose another player to be the sleepwalker, who is immune to the wolf attack and the poison that night. If you die at night, the sleepwalker dies with you. Choosing the same player two nights in a row kills them.'),
  },
  witcher: {
    id: 'witcher',
    name: L('獵魔人', 'Witcher'),
    camp: 'good',
    kind: 'god',
    icon: '🗡️',
    short: L('第二晚起可狩獵一名玩家：是狼則狼死，是好人則自己死。', 'From the second night, may hunt a player: a wolf dies, otherwise you die.'),
    desc: L('從第二個夜晚開始，每晚可以選擇一名玩家狩獵。若對方是狼人，對方隔天出局；若對方是好人，獵魔人自己出局。女巫的毒藥對獵魔人無效。', "Starting from the second night, you may hunt one player each night. If they are a werewolf, they are eliminated the next day; if they are good, you are eliminated instead. The Witch's poison has no effect on you."),
  },
  bear: {
    id: 'bear',
    name: L('熊', 'Bear'),
    camp: 'good',
    kind: 'god',
    icon: '🐻',
    short: L('天亮時若相鄰的存活玩家中有狼人，熊會咆哮。', 'At dawn, growls if a werewolf sits next to it among the living.'),
    desc: L('每天天亮時，如果熊還活著，且左右兩側最近的存活玩家中有狼人，法官會宣布「熊咆哮了」。', 'Every dawn, if the Bear is alive and one of the nearest living players on either side is a werewolf, the moderator announces that "the Bear growled".'),
  },
  fox: {
    id: 'fox',
    name: L('狐狸', 'Fox'),
    camp: 'good',
    kind: 'god',
    icon: '🦊',
    short: L('每晚查驗相鄰三人中是否有狼；若沒有則失去技能。', 'Each night, check three neighbors for a werewolf; loses the ability if there is none.'),
    desc: L('每晚選擇一名玩家，得知該玩家與其左右兩位存活玩家這三人中是否有狼人。如果三人中沒有狼人，狐狸將永久失去技能。', 'Each night you choose a player and learn whether there is a werewolf among that player and the living players on their left and right. If there is no werewolf among the three, you lose your ability for good.'),
  },
  elder: {
    id: 'elder',
    name: L('長老', 'Elder'),
    camp: 'good',
    kind: 'god',
    icon: '👴',
    short: L('可以抵擋一次狼人襲擊；若被好人害死，所有神職失去技能。', 'Survives one werewolf attack; if killed by the good side, all special roles lose their abilities.'),
    desc: L('第一次被狼人襲擊時不會死亡。若長老被投票放逐、被獵人槍殺或被女巫毒死，所有好人陣營的神職將永久失去技能。', 'The first werewolf attack does not kill you. If you are voted out, shot by the Hunter or poisoned by the Witch, every special role on the good team permanently loses its ability.'),
  },
  crow: {
    id: 'crow',
    name: L('烏鴉', 'Crow'),
    camp: 'good',
    kind: 'god',
    icon: '🪶',
    short: L('每晚詛咒一名玩家，他隔天放逐投票時額外多一票。', 'Each night, curse a player, who gets one extra vote in the next exile vote.'),
    desc: L('每晚可以詛咒一名玩家，該玩家在隔天的放逐投票中會額外被計入一票。', "Each night you may curse one player. One extra vote is counted against them in the next day's exile vote."),
  },
  psychic: {
    id: 'psychic',
    name: L('通靈師', 'Psychic'),
    camp: 'good',
    kind: 'god',
    icon: '👁️',
    short: L('每晚查驗一名玩家的具體身分。', "Each night, check one player's exact role."),
    desc: L('每晚可以查驗一名玩家，直接得知該玩家的具體身分牌。', 'Each night you may check one player and learn exactly which role card they hold.'),
  },

  // ───────── 狼人陣營 ─────────
  werewolf: {
    id: 'werewolf',
    name: L('狼人', 'Werewolf'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '🐺',
    short: L('每晚與狼隊友共同襲擊一名玩家，白天可以自爆。', 'Each night, attack a player together with the pack; may self-destruct by day.'),
    desc: L('每晚與狼隊友一起睜眼，共同決定襲擊一名玩家（也可以空刀或自刀）。白天發言階段可以自爆：亮出身分出局，並立即進入黑夜。', 'Each night you open your eyes with your fellow wolves and decide together whom to attack (you may also skip the kill or attack one of your own). During the daytime speeches you may self-destruct: you reveal your card and leave the game, and night falls immediately.'),
  },
  wolfKing: {
    id: 'wolfKing',
    name: L('狼王', 'Wolf King'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '👑',
    short: L('出局時可以開槍帶走一名玩家（被毒死或自爆除外）。', 'When eliminated, may shoot one player (not if poisoned or self-destructed).'),
    desc: L('擁有狼人的所有能力。被放逐或被槍殺出局時，可以開槍帶走一名玩家。若被女巫毒死或自爆，則無法發動技能。', 'Has all the abilities of a werewolf. When voted out or shot, you may shoot one player. If you are poisoned by the Witch or self-destruct, you cannot use this ability.'),
  },
  whiteWolfKing: {
    id: 'whiteWolfKing',
    name: L('白狼王', 'White Wolf King'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '🐾',
    short: L('白天自爆時可以帶走一名玩家。', 'May take one player along when self-destructing by day.'),
    desc: L('擁有狼人的所有能力。白天發言階段自爆時，可以同時帶走一名玩家。若是被放逐或夜晚死亡，則無法發動技能。', 'Has all the abilities of a werewolf. When you self-destruct during the daytime speeches, you may take one player with you. If you are voted out or die at night, you cannot use this ability.'),
  },
  wolfBeauty: {
    id: 'wolfBeauty',
    name: L('狼美人', 'Wolf Beauty'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '💋',
    short: L('每晚魅惑一名玩家；狼美人出局時，被魅惑者殉情。', 'Each night, charm a player; when she is eliminated, the charmed player dies too.'),
    desc: L('每晚襲擊後可以魅惑一名玩家，不能連續兩晚魅惑同一人。狼美人出局時，最近一次被魅惑的玩家會跟著殉情出局，且無法發動技能。狼美人不能自爆。', 'After the attack each night you may charm one player, but not the same player two nights in a row. When you are eliminated, the most recently charmed player dies with you and cannot use any ability. The Wolf Beauty cannot self-destruct.'),
  },
  hiddenWolf: {
    id: 'hiddenWolf',
    name: L('隱狼', 'Hidden Wolf'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '🎭',
    short: L('預言家查驗為好人。知道狼隊友，但不參與襲擊。', 'Shows up as good to the Seer. Knows the pack but does not join the attack.'),
    desc: L('被預言家查驗時顯示為好人。知道誰是狼隊友，但狼隊友不知道隱狼是誰，也不參與夜晚襲擊。當其他狼人全部出局後，隱狼獲得襲擊能力。隱狼不能自爆。', 'Shows up as good when checked by the Seer. You know who your fellow wolves are, but they do not know you, and you do not take part in the night attack. Once all the other wolves are out, you gain the ability to attack. The Hidden Wolf cannot self-destruct.'),
  },
  evilKnight: {
    id: 'evilKnight',
    name: L('惡靈騎士', 'Evil Knight'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '💀',
    short: L('免疫夜間傷害；被查驗或被毒時，對方反而死亡。', 'Immune at night; whoever checks or poisons it dies instead.'),
    desc: L('夜晚不會死亡。若被預言家查驗，預言家隔天死亡；若被女巫下毒，女巫隔天死亡。惡靈騎士不能自爆，只能被放逐、槍殺或決鬥出局。', 'Cannot die at night. If the Seer checks you, the Seer dies the next day; if the Witch poisons you, the Witch dies the next day. The Evil Knight cannot self-destruct and can only be removed by exile, a gunshot or a duel.'),
  },
  nightmare: {
    id: 'nightmare',
    name: L('夢魘', 'Nightmare'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '😱',
    short: L('每晚最先行動，恐懼一名玩家使其當晚無法使用技能。', 'Acts first each night and terrifies a player, who cannot use their ability that night.'),
    desc: L('每晚在所有人之前行動，恐懼一名玩家，使其當晚無法使用技能。不能連續兩晚恐懼同一人。如果恐懼到狼隊友，當晚狼人無法襲擊。', 'You act before everyone else each night and terrify one player, who cannot use their ability that night. You cannot terrify the same player two nights in a row. If you terrify a fellow wolf, the pack cannot attack that night.'),
  },
  gargoyle: {
    id: 'gargoyle',
    name: L('石像鬼', 'Gargoyle'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '🗿',
    short: L('每晚查驗一名玩家的具體身分。不與狼隊友見面。', "Each night, check one player's exact role. Does not meet the pack."),
    desc: L('每晚可以查驗一名玩家的具體身分。石像鬼與其他狼人互不相識，也不參與襲擊。當其他狼人全部出局後，石像鬼獲得襲擊能力。石像鬼不能自爆。', "Each night you may check one player's exact role. The Gargoyle and the other wolves do not know each other, and you do not take part in the attack. Once all the other wolves are out, you gain the ability to attack. The Gargoyle cannot self-destruct."),
  },
  bloodMoon: {
    id: 'bloodMoon',
    name: L('血月使徒', 'Blood Moon Apostle'),
    camp: 'wolf',
    kind: 'wolf',
    icon: '🩸',
    short: L('自爆後，下一個夜晚所有神職技能被封印。', 'After self-destructing, all special roles are sealed for the next night.'),
    desc: L('擁有狼人的所有能力。自爆後的下一個夜晚，所有好人神職的技能都會被封印。若血月使徒是最後一個被放逐的狼人，可以多活一個夜晚，於隔天天亮後才出局。', 'Has all the abilities of a werewolf. On the night after you self-destruct, the abilities of every special role on the good team are sealed. If you are the last wolf and get voted out, you survive one more night and only leave after the next dawn.'),
  },

  // ───────── 第三方 ─────────
  cupid: {
    id: 'cupid',
    name: L('丘比特', 'Cupid'),
    camp: 'third',
    kind: 'third',
    icon: '💘',
    short: L('第一晚指定兩名玩家成為情侶，一方死亡另一方殉情。', 'On the first night, link two players as lovers; if one dies, so does the other.'),
    desc: L('第一晚指定兩名玩家成為情侶（可以包含自己）。情侶其中一人死亡，另一人立刻殉情。若情侶同陣營，丘比特與他們同陣營；若情侶是一人一狼，則情侶與丘比特成為第三方，需要活到最後只剩他們才能獲勝。', 'On the first night you choose two players to become lovers (you may include yourself). If one lover dies, the other immediately dies of heartbreak. If both lovers are on the same team, Cupid is on that team too; if they are one good player and one wolf, the lovers and Cupid become a third party that only wins by being the last ones alive.'),
  },
  wildChild: {
    id: 'wildChild',
    name: L('野孩子', 'Wild Child'),
    camp: 'third',
    kind: 'third',
    icon: '🧒',
    short: L('第一晚選擇一名榜樣；榜樣死亡後，野孩子變成狼人。', 'On the first night, pick a role model; when they die, becomes a werewolf.'),
    desc: L('第一晚選擇一名玩家作為榜樣。只要榜樣還活著，野孩子就屬於好人陣營（算作平民）。一旦榜樣死亡，野孩子立刻變成狼人並加入狼隊。', 'On the first night you choose a player as your role model. As long as they are alive you belong to the good team (and count as a villager). The moment your role model dies, you turn into a werewolf and join the pack.'),
  },
  thief: {
    id: 'thief',
    name: L('盜賊', 'Thief'),
    camp: 'third',
    kind: 'third',
    icon: '🦹',
    short: L('第一晚從兩張底牌中挑選一張作為自己的身分。', 'On the first night, pick one of two spare cards as your role.'),
    desc: L('牌堆會比玩家多兩張。第一晚盜賊最先睜眼，從剩下的兩張底牌中選擇一張作為自己的身分。若底牌中恰好有一張狼人牌，必須選擇狼人牌。', 'The deck has two more cards than there are players. On the first night the Thief wakes first and chooses one of the two leftover cards as their role. If exactly one of them is a werewolf card, it must be chosen.'),
  },
  piper: {
    id: 'piper',
    name: L('吹笛者', 'Piper'),
    camp: 'third',
    kind: 'third',
    icon: '🎶',
    short: L('每晚魅惑最多兩名玩家；所有存活者都被魅惑時獨自獲勝。', 'Each night, enchant up to two players; wins alone once every survivor is enchanted.'),
    desc: L('獨立的第三方。每晚可以魅惑最多兩名玩家，被魅惑的玩家會知道彼此，但不知道吹笛者是誰。當其他所有存活玩家都被魅惑時，吹笛者獨自獲勝。預言家查驗為好人。', 'An independent third party. Each night you may enchant up to two players. Enchanted players know one another but not who the Piper is. When every other living player is enchanted, the Piper wins alone. Shows up as good to the Seer.'),
  },
  halfBlood: {
    id: 'halfBlood',
    name: L('混血兒', 'Half-Blood'),
    camp: 'third',
    kind: 'third',
    icon: '🧬',
    short: L('第一晚選擇一名玩家認親，陣營與對方相同。', 'On the first night, choose a player as kin and share their side.'),
    desc: L('第一晚選擇一名玩家認親，之後混血兒的陣營就與該玩家相同，但不會知道對方的身分。預言家查驗永遠為好人。', 'On the first night you choose a player as your kin. From then on you are on the same side as that player, without ever learning their role. Always shows up as good to the Seer.'),
  },
};

export const ROLE_GROUPS: { title: LText; camp: 'wolf' | 'god' | 'villager' | 'third'; ids: RoleId[] }[] = [
  {
    title: L('狼人陣營', 'Werewolves'),
    camp: 'wolf',
    ids: ['werewolf', 'wolfKing', 'whiteWolfKing', 'wolfBeauty', 'hiddenWolf', 'evilKnight', 'nightmare', 'gargoyle', 'bloodMoon'],
  },
  {
    title: L('神職', 'Special Roles'),
    camp: 'god',
    ids: [
      'seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', 'gravekeeper', 'silencer',
      'magician', 'dreamer', 'witcher', 'bear', 'fox', 'elder', 'crow', 'psychic',
    ],
  },
  { title: L('平民', 'Villagers'), camp: 'villager', ids: ['villager'] },
  { title: L('第三方', 'Third Party'), camp: 'third', ids: ['cupid', 'wildChild', 'thief', 'piper', 'halfBlood'] },
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

/** 夜晚各步驟被喚醒的對象：除了狼人是整隊一起，其餘都是單一角色 */
export const stepName = (step: NightStep): LText => (step === 'wolves' ? L('狼人', 'Werewolves') : ROLES[step].name);

export const WIN_TITLE: Record<WinCamp, LText> = {
  good: L('好人陣營獲勝', 'The Village Wins'),
  wolf: L('狼人陣營獲勝', 'The Werewolves Win'),
  lovers: L('情侶陣營獲勝', 'The Lovers Win'),
  piper: L('吹笛者獲勝', 'The Piper Wins'),
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
  name: LText;
  /** 玩家數（含盜賊的板子牌數會多 2） */
  players: number;
  roles: RoleId[];
  note: LText;
}

const board = (wolves: RoleId[], gods: RoleId[], villagers: number, extra: RoleId[] = []): RoleId[] => [
  ...wolves,
  ...gods,
  ...rep('villager', villagers),
  ...extra,
];

export const PRESETS: Preset[] = [
  { id: 'std9', name: L('9 人標準局', '9-Player Standard'), players: 9, roles: defaultRoles(9), note: L('預言家、女巫、獵人 + 3 狼 3 民', 'Seer, Witch, Hunter + 3 wolves, 3 villagers') },
  { id: 'std12', name: L('預女獵白', 'Seer · Witch · Hunter · Idiot'), players: 12, roles: defaultRoles(12), note: L('最經典的 12 人標準板', 'The classic 12-player board') },
  {
    id: 'guard12',
    name: L('預女獵守', 'Seer · Witch · Hunter · Guard'),
    players: 12,
    roles: board(rep('werewolf', 4), ['seer', 'witch', 'hunter', 'guard'], 4),
    note: L('守衛登場，注意同守同救', 'Adds the Guard — mind the guard-and-save clash'),
  },
  {
    id: 'wolfking12',
    name: L('狼王守衛', 'Wolf King & Guard'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfKing'], ['seer', 'witch', 'hunter', 'guard'], 4),
    note: L('狼王出局可以開槍', 'The Wolf King may shoot when eliminated'),
  },
  {
    id: 'whitewolf12',
    name: L('白狼王騎士', 'White Wolf King & Knight'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'whiteWolfKing'], ['seer', 'witch', 'knight', 'guard'], 4),
    note: L('白狼王自爆帶人 vs 騎士決鬥', 'White Wolf King self-destruct vs. Knight duel'),
  },
  {
    id: 'beauty12',
    name: L('狼美人騎士', 'Wolf Beauty & Knight'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfBeauty'], ['seer', 'witch', 'knight', 'hunter'], 4),
    note: L('狼美人魅惑殉情', 'The Wolf Beauty takes her charmed player with her'),
  },
  {
    id: 'nightmare12',
    name: L('夢魘守衛', 'Nightmare & Guard'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'nightmare'], ['seer', 'witch', 'hunter', 'guard'], 4),
    note: L('夢魘恐懼封鎖技能', "The Nightmare's terror blocks abilities"),
  },
  {
    id: 'gargoyle12',
    name: L('石像鬼守墓人', 'Gargoyle & Gravekeeper'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'gargoyle'], ['seer', 'witch', 'hunter', 'gravekeeper'], 4),
    note: L('石像鬼獨自查驗身分', 'The Gargoyle checks roles on its own'),
  },
  {
    id: 'bloodmoon12',
    name: L('血月獵魔', 'Blood Moon & Witcher'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'bloodMoon'], ['seer', 'witch', 'idiot', 'witcher'], 4),
    note: L('血月使徒封印 vs 獵魔人狩獵', 'Blood Moon seal vs. Witcher hunt'),
  },
  {
    id: 'magician12',
    name: L('狼王魔術師', 'Wolf King & Magician'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'wolfKing'], ['seer', 'witch', 'hunter', 'magician'], 4),
    note: L('魔術師交換號碼牌', 'The Magician swaps number tags'),
  },
  {
    id: 'evil12',
    name: L('惡靈騎士攝夢人', 'Evil Knight & Dreamweaver'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'evilKnight'], ['seer', 'witch', 'hunter', 'dreamer'], 4),
    note: L('惡靈騎士反傷 vs 攝夢人', 'Evil Knight backfire vs. Dreamweaver'),
  },
  {
    id: 'hidden12',
    name: L('隱狼禁言', 'Hidden Wolf & Silencer'),
    players: 12,
    roles: board([...rep('werewolf', 3), 'hiddenWolf'], ['seer', 'witch', 'hunter', 'silencer'], 4),
    note: L('隱狼驗出來是好人', 'The Hidden Wolf checks as good'),
  },
  {
    id: 'classic12',
    name: L('丘比特盜賊', 'Cupid & Thief'),
    players: 12,
    roles: board(rep('werewolf', 4), ['seer', 'witch', 'hunter', 'guard'], 4, ['cupid', 'thief']),
    note: L('經典版：情侶與盜賊（14 張牌）', 'Classic edition: lovers and the Thief (14 cards)'),
  },
  {
    id: 'village10',
    name: L('熊狐烏鴉', 'Bear, Fox & Crow'),
    players: 10,
    roles: board(rep('werewolf', 3), ['seer', 'witch', 'bear', 'fox', 'crow'], 2),
    note: L('歐式村莊角色', 'European village roles'),
  },
  {
    id: 'chaos15',
    name: L('亂鬥 15 人', '15-Player Chaos'),
    players: 15,
    roles: board(
      ['werewolf', 'werewolf', 'wolfKing', 'wolfBeauty', 'nightmare'],
      ['seer', 'witch', 'hunter', 'guard', 'idiot', 'knight'],
      3,
      ['wildChild'],
    ),
    note: L('多種特殊狼 + 野孩子', 'Several special wolves + the Wild Child'),
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

/** 目前語言的角色名稱（規則引擎用，見 i18n.ts） */
export function roleName(id: RoleId | null | undefined): string {
  return id ? loc(ROLES[id].name) : t('未知', 'Unknown');
}
