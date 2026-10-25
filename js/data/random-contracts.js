/* 隨機委託模板。
   tags   = 公告上寫明的威脅；hidden = 可能沒寫出來的威脅（鑑定師查得到）
   count  = 委託人說的目標數量範圍；實際數量可能多出 50% 或一倍
   danger = 基礎危險度，逐年上升；base = 第一年的基礎賞金
   文字鍵：rc.<id>.title（含 {place}）/ who / body / target（含 {n}） */
const RC = {
  wolves:   {monster: 'wolf',      biome: 'forest', base: 260,  days: 3, danger: 1, count: [4, 7], tags: ['ambush'],               hidden: ['far']},
  geese:    {monster: 'goose',     biome: 'grave',  base: 220,  days: 3, danger: 1, count: [5, 8], tags: ['fire'],                 hidden: ['curse']},
  escort:   {monster: 'bandit',    biome: 'road',   base: 200,  days: 2, danger: 1, count: [3, 5], tags: ['armor'],                hidden: ['ambush']},
  toads:    {monster: 'toad',      biome: 'swamp',  base: 300,  days: 4, danger: 1, count: [4, 6], tags: ['poison', 'flood'],      hidden: ['far']},
  crypt:    {monster: 'ghoul',     biome: 'cellar', base: 420,  days: 4, danger: 2, count: [3, 5], tags: ['rot', 'under'],         hidden: ['curse'], req: {role: 'heal', lv: 2}},
  bandits:  {monster: 'bandit',    biome: 'road',   base: 380,  days: 4, danger: 2, count: [5, 8], tags: ['ambush', 'armor'],      hidden: ['far'], req: {role: 'scout', lv: 3}},
  harpies:  {monster: 'goose',     biome: 'road',   base: 520,  days: 5, danger: 2, count: [4, 6], tags: ['fire', 'far'],          hidden: ['curse'], req: {role: 'mage', lv: 3}},
  mine:     {monster: 'lizard',    biome: 'mine',   base: 650,  days: 3, danger: 3, count: [1, 2], tags: ['petrify', 'under'],     hidden: ['armor'], req: {front: 2}},
  charter:  {monster: 'bandit',    biome: 'harbor', base: 380,  days: 2, danger: 1, count: [3, 5], tags: ['ambush'],               hidden: [], special: true},
  bridge:   {monster: 'troll',     biome: 'road',   base: 340,  days: 2, danger: 2, count: [1, 2], tags: ['armor', 'ambush'],      hidden: ['far']},
  sinkhole: {monster: 'worm',      biome: 'mine',   base: 480,  days: 3, danger: 2, count: [2, 3], tags: ['under', 'poison'],      hidden: ['curse']},
  orchard:  {monster: 'treant',    biome: 'forest', base: 400,  days: 3, danger: 2, count: [2, 3], tags: ['fire', 'far'],          hidden: ['curse']},
  wyvern:   {monster: 'manticore', biome: 'road',   base: 1100, days: 6, danger: 4, count: [1, 1], tags: ['poison', 'fire', 'loot'], hidden: ['armor'], minYear: 1, req: {front: 3}},
};
const PLACE_COUNT = 12;

/* 威脅標籤：ready = 準備是否到位（不消耗）；resolve = 戰鬥時結算並消耗物資 */
const TAGS = {
  rot:     {items: ['antidote']},
  poison:  {items: ['antidote']},
  petrify: {items: ['antipetri', 'mirror']},
  fire:    {items: ['crystal']},
  flood:   {items: ['guide']},
  far:     {items: ['horses']},
  under:   {items: ['mapper']},
  ambush:  {items: []},
  armor:   {items: ['repair']},
  curse:   {items: ['healmat']},
  loot:    {items: ['processor', 'porters']},
};
function tagNeed(tag, D) {
  switch (tag) {
    case 'rot': case 'poison': return D >= 3 ? 2 : 1;
    case 'petrify': return (S.inv.mirror >= 1 ? 1 : 2) * (D >= 4 ? 2 : 1);
    case 'fire': return Math.max(0, (D >= 3 ? 2 : 1) - (perk('mage') ? 1 : 0));
    default: return 1;
  }
}
function tagReady(tag, D) {
  const M = S.M, n = tagNeed(tag, D);
  switch (tag) {
    case 'rot': case 'poison': return S.inv.antidote >= n;
    case 'petrify': return S.inv.antipetri >= n;
    case 'fire': return has('mage') && S.inv.crystal >= n;
    case 'flood': return !!M.svc.guide;
    case 'far': return !!M.svc.horses;
    case 'under': return !!M.svc.mapper;
    case 'armor': return !!M.svc.repair || perk('tank');
    case 'ambush': return has('scout') || has('tracker');
    case 'curse': return (has('heal')) && S.inv.healmat >= 1;
    case 'loot': return !!(M.svc.processor || M.svc.porters);
  }
  return false;
}
/* 回傳 {ok, used:[[invKey, n]]} 並扣庫存 */
function tagResolve(tag, D) {
  const n = tagNeed(tag, D);
  if (!tagReady(tag, D)) return {ok: false, used: []};
  const use = k => { S.inv[k] -= n; return {ok: true, used: [[k, n]]}; };
  switch (tag) {
    case 'rot': case 'poison': return use('antidote');
    case 'petrify': return use('antipetri');
    case 'fire': return use('crystal');
    case 'curse': S.inv.healmat -= 1; return {ok: true, used: [['healmat', 1]]};
  }
  return {ok: true, used: []};
}

/* 能力要求：特定職業等級，或前排（隊長、戰士）有人裝備達到某階 */
const FRONT = ['cap', 'tank', 'trainee'];
function reqMet(req) {
  if (!req) return true;
  const ps = participants().filter(m => m.hp < 2);
  if (req.role) return ps.some(m => m.key === req.role && lvOf(m) >= req.lv);
  if (req.front) return ps.some(m => FRONT.includes(m.key) && tierOf(m) >= req.front);
  return true;
}
const reqText = req => req.role ? t('req.role', {role: t('r.' + req.role), lv: req.lv}) : t('req.front', {tier: req.front});
const GEAR_REWARD_TPL = ['escort', 'bandits', 'mine', 'crypt'];
function genContract() {
  const year = S.year;
  const ids = Object.keys(RC).filter(id => !RC[id].special && ((RC[id].minYear || 0) < year || RC[id].danger <= 3));
  // 小隊還沒滿 5 人的第一年：只出危險度 1 的委託，讓新手有機會站穩腳步
  const early = year === 1 && S.members.length < MAINLINE_MIN;
  const id = pick(early ? ids.filter(k => RC[k].danger <= 1) : ids), T = RC[id];
  const D = T.danger + Math.floor((year - 1) * 0.6);
  const scale = 1 + 0.3 * (year - 1);
  const r10 = n => Math.round(n / 10) * 10;
  const bounty = r10(T.base * scale * (0.9 + rnd() * 0.25) * ((S.flags.cartel || -1) > S.seasonIdx ? 1.1 : 1));   // 價格同盟期間報酬 +10%
  const stated = T.count[0] + Math.floor(rnd() * (T.count[1] - T.count[0] + 1));
  const trueN = Math.max(stated, Math.round(stated * pick([1, 1, 1, 1.5, 2])));
  const hidden = T.hidden.length && rnd() < 0.45 ? pick(T.hidden) : null;
  const gearReward = GEAR_REWARD_TPL.includes(id) && rnd() < 0.25;   // 用一次裝備升級抵部分賞金
  return {uid: S.uidSeq++, id, place: Math.floor(rnd() * PLACE_COUNT), bounty: gearReward ? r10(bounty * 0.75) : bounty, stated, trueN, gearReward,
    hidden: hidden && !T.tags.includes(hidden) ? hidden : null, days: T.days, D, competitor: r10(bounty * 0.8)};
}
