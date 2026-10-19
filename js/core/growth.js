/* 成長系統：經驗值與等級、個人錢包與私人裝備
   - 每趟委託給參與者經驗值；Lv1–5，Lv3 解鎖職業專長
   - 分紅進成員自己的錢包；成員依個性自行升級私人裝備（屬於本人，死亡歸繼承人，解約帶走） */
const XP_LEVELS = [0, 60, 180, 400, 800];          // 到達 Lv1..Lv5 所需累計經驗
const LV_MAX = 5;
const GEAR_COST = [100, 300, 700];                 // 升到第 1/2/3 階的價格（再乘物價）
const GEAR_MAX = 3;
const LIVING_COST = 20;                           // 每季從個人錢包扣的生活費
const BUY_MARGIN = {greedy: 1.6, frugal: 1.3, reckless: 1.0};   // 存到價格的幾倍才肯買

const lvOf = m => m.lv || 1;
const tierOf = m => m.tier || 0;
function lvFromXP(xp) { let lv = 1; XP_LEVELS.forEach((need, i) => { if (xp >= need) lv = i + 1; }); return Math.min(LV_MAX, lv); }
const nextXP = m => lvOf(m) >= LV_MAX ? null : XP_LEVELS[lvOf(m)];
const gearCost = m => tierOf(m) >= GEAR_MAX ? null : Math.round(GEAR_COST[tierOf(m)] * inflation());
const perk = (key, minLv = 3) => participants().some(m => m.key === key && m.hp < 2 && lvOf(m) >= minLv);

/* 對整隊的影響 */
function growthBonus() {
  const b = participants().reduce((a, m) => a + (lvOf(m) - 1) * 0.01 + tierOf(m) * 0.01, 0);
  return Math.min(0.12, b);
}
/* 對個人的影響：等級與裝備都讓人比較不容易被打中 */
const growthInjuryFactor = m => Math.pow(0.9, lvOf(m) - 1) * (1 - 0.15 * tierOf(m));
/* 重傷時，好裝備有機會擋下致命一擊（變成輕傷） */
const gearSaves = m => tierOf(m) > 0 && rnd() < 0.2 * tierOf(m);

function migrateMember(m) {
  if (m.lv == null) m.lv = (traitOf(m) === 'veteran') ? 2 : 1;
  if (m.xp == null) m.xp = XP_LEVELS[m.lv - 1];
  if (m.tier == null) m.tier = 0;
  if (m.purse == null) m.purse = 0;
  return m;
}

/* 任務結束：經驗值、錢包、出師、自行購買裝備。回傳成長紀錄 */
function applyGrowth(M, ps, amounts, success) {
  const log = [], D = M.D || 1;
  const base = 6 + 3 * D, mult = success ? 1.5 : 0.6;
  ps.forEach(m => {
    if (m.dead) return;
    migrateMember(m);
    const amt = amounts.get(m) || 0;
    m.purse += amt;
    let gain = Math.round(base * mult * (traitOf(m) === 'veteran' ? 1.2 : 1));
    if ((M.serious || []).includes(m)) gain += 5;        // 撐過重傷也是經驗
    const before = lvOf(m);
    m.xp += gain; m.lv = lvFromXP(m.xp);
    const entry = {m, gain, lvUp: m.lv > before ? m.lv : 0, bought: null, grad: null, purse: m.purse};
    // 出師：見習生 Lv3 成為正式戰士；學徒治療者 Lv3 成為正式治療者
    if (m.lv >= 3 && m.key === 'trainee') { m.key = 'tank'; m.share = Math.max(m.share, 1); entry.grad = 'trainee'; }
    if (m.lv >= 3 && m.key === 'appr') { m.key = 'heal'; m.share = Math.max(m.share, 1.25); entry.grad = 'appr'; }
    // 自行升級私人裝備
    const c = gearCost(m), margin = BUY_MARGIN[traitOf(m)] || 1.15;
    if (c != null && m.purse >= c * margin) { m.purse -= c; m.tier++; entry.bought = m.tier; addLoy(m, 3); }
    entry.purse = m.purse;
    log.push(entry);
  });
  return log;
}
function seasonLiving() { S.members.forEach(m => { migrateMember(m); m.purse = Math.max(0, m.purse - LIVING_COST); }); }

/* 成長報告（結算後） */
function growthReport(log, next) {
  screen(() => `<div><h2>${t('gr.title')}</h2><p class="lede">${t('gr.lede')}</p></div>
    <div class="growth">${log.map(e => {
      const m = e.m, pct = nextXP(m) == null ? 100 : Math.round((m.xp - XP_LEVELS[lvOf(m) - 1]) / (nextXP(m) - XP_LEVELS[lvOf(m) - 1]) * 100);
      const lines = [];
      if (e.lvUp) lines.push(['g', t('gr.lvUp', {lv: e.lvUp})]);
      if (e.lvUp === 3 && !e.grad) lines.push(['g', t('gr.perk', {perk: t('perk.' + m.key)})]);
      if (e.grad) lines.push(['g', t('gr.grad.' + e.grad, {name: nm(m)})]);
      if (e.bought) lines.push(['g', t('gr.bought', {name: nm(m), gear: gearName(m, e.bought)})]);
      return `<div class="gcard">${portrait(m)}<div class="gbody"><div class="row" style="gap:8px;justify-content:space-between"><b>${nm(m)}</b><span class="muted">${roleOf(m)}・Lv${lvOf(m)}</span></div>
        <div class="xpbar"><i style="width:${pct}%"></i></div>
        <div class="muted" style="font-size:12px">${t('gr.xp', {n: e.gain})}・${t('gr.purse', {n: fmt(e.purse)})}</div>${lines.length ? res(lines) : ''}</div></div>`;
    }).join('')}</div>
    <div class="row">${B(t('btn.continue'), next, {cls: 'pri'})}</div>`);
}
const gearName = (m, tier = tierOf(m)) => tier ? t(`gear.${m.key}.${tier}`) : t('gear.basic');

/* 成員詳情頁 */
function membersScreen() {
  screen(() => `<div class="row" style="justify-content:space-between"><h2>${t('ms.title')}</h2>${B(t('btn.backHall'), goHall)}</div>
    <p class="lede">${t('ms.lede')}</p>
    <div class="growth">${S.members.map(m => {
      migrateMember(m);
      const nx = nextXP(m), c = gearCost(m);
      const pct = nx == null ? 100 : Math.round((m.xp - XP_LEVELS[lvOf(m) - 1]) / (nx - XP_LEVELS[lvOf(m) - 1]) * 100);
      return `<div class="gcard">${portrait(m)}<div class="gbody">
        <div class="row" style="gap:8px;justify-content:space-between"><b>${nm(m)}</b><span class="muted">${roleOf(m)}${traitOf(m) ? '・' + t('tr.' + traitOf(m)) : ''}</span></div>
        <div class="kv num"><span>${t('ms.level')}</span><span>Lv${lvOf(m)}${nx == null ? ` ${t('ms.max')}` : `（${m.xp} / ${nx}）`}</span></div>
        <div class="xpbar"><i style="width:${pct}%"></i></div>
        <div class="kv num"><span>${t('ms.gear')}</span><span>${gearName(m)}${m.gear ? `＋${t('mem.gear')}` : ''}</span></div>
        <div class="kv num"><span>${t('ms.purse')}</span><span>${silver(m.purse)}${c != null ? ` <span class="muted">${t('ms.next', {n: fmt(c)})}</span>` : ''}</span></div>
        <div class="kv num"><span>${t('ms.share')}</span><span>${m.share}・${t('ms.earned', {n: fmt(m.earned)})}</span></div>
        <div class="kv"><span>${t('ms.perk')}</span><span class="${lvOf(m) >= 3 ? '' : 'muted'}">${t('perk.' + m.key)}${lvOf(m) >= 3 ? '' : ` ${t('ms.perkLock')}`}</span></div>
      </div></div>`;
    }).join('')}</div>`);
}
