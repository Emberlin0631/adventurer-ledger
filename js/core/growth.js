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
    const credited = (M.credit || []).includes(m.nk);
    if (credited) gain = Math.round(gain * 1.5);          // 專業表現：負責的對策做到了
    const before = lvOf(m);
    m.xp += gain; m.lv = lvFromXP(m.xp);
    const entry = {m, gain, lvUp: m.lv > before ? m.lv : 0, bought: null, grad: null, purse: m.purse, credited};
    if (entry.lvUp >= 3 && m.key !== 'cap') m.wantRaise = m.lv;   // 資深了，會想談份額
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
      if (e.credited) lines.push(t('gr.credit'));
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
        <div class="kv num"><span>${t('ms.gear')}</span><span>${gearName(m)}${m.gear ? `＋${t('mem.gear')}` : ''}${m.ptier ? ` <span class="muted">${t('ms.party', {n: m.ptier})}</span>` : ''}</span></div>
        <div class="kv num"><span>${t('ms.purse')}</span><span>${silver(m.purse)}${c != null ? ` <span class="muted">${t('ms.next', {n: fmt(c)})}</span>` : ''}</span></div>
        <div class="kv num"><span>${t('ms.share')}</span><span>${m.share}・${t('ms.earned', {n: fmt(m.earned)})}</span></div>
        <div class="kv"><span>${t('ms.perk')}</span><span class="${lvOf(m) >= 3 ? '' : 'muted'}">${t('perk.' + m.key)}${lvOf(m) >= 3 ? '' : ` ${t('ms.perkLock')}`}</span></div>
        ${c != null ? B(t('ms.fund', {n: fmt(c)}), () => partyFundGear(m), {cls: 'ghost', sub: t('ms.fundSub'), dis: S.chest < c}) : ''}
      </div></div>`;
    }).join('')}</div>`);
}

/* ---------- 小隊出資的裝備：歸小隊所有，成員離隊或陣亡時收回變賣一半 ---------- */
function partyFundGear(m) {
  const c = gearCost(m);
  if (c == null) return;
  if (S.chest < c) return toast(t('toast.noMoney'));
  S.chest -= c; m.tier++; m.ptier = (m.ptier || 0) + 1;
  m.pvalue = (m.pvalue || 0) + c;
  addLoy(m, 4);
  membersScreen();
}
/* 成員離開時：小隊出資的部分收回變賣，回傳收回金額 */
function recoverPartyGear(m) {
  if (!m.ptier) return 0;
  const v = Math.round((m.pvalue || 0) * 0.5);
  S.chest += v; m.tier -= m.ptier; m.ptier = 0; m.pvalue = 0;
  return v;
}

/* ---------- 專業表現：對策由誰完成，誰就多拿經驗 ---------- */
const TAG_CREDIT = {ambush: ['scout', 'tracker'], fire: ['mage'], curse: ['heal', 'appr'], armor: ['tank', 'trainee'], under: ['scout'], flood: ['scout', 'tracker']};
function creditRole(roles) {
  if (!S.M) return;
  const m = participants().find(x => roles.includes(x.key) && x.hp < 2);
  if (m) (S.M.credit = S.M.credit || []).includes(m.nk) || S.M.credit.push(m.nk);
}

/* ---------- 挖角：資深成員（Lv4+）換季時可能被別隊看上 ---------- */
function maybePoach() {
  const pool = S.members.filter(m => m.key !== 'cap' && lvOf(m) >= 4);
  if (!pool.length || rnd() > 0.35) return;
  S.poach = pick(pool).nk;
  S.pending.push('poach');
}
registerEvent('poach', () => {
  const m = S.members.find(x => x.nk === S.poach);
  if (!m) { S.poach = null; goHall(); return; }
  const name = nm(m), done = () => { S.poach = null; goHall(); };
  if (traitOf(m) === 'loyal') {
    addLoy(m, 5);
    screen(() => `<h2>${t('pc.title', {name})}</h2><p class="lede">${t('pc.body', {name, lv: lvOf(m)})}</p><p class="quote">${t('pc.loyal', {name})}</p><div class="row">${B(t('btn.backHall'), done, {cls: 'pri'})}</div>`);
    return;
  }
  const bonus = Math.round(40 * m.share * lvOf(m) / 2 / 10) * 10;
  screen(() => `<h2>${t('pc.title', {name})}</h2><p class="lede">${t('pc.body', {name, lv: lvOf(m)})}</p>
    <div class="choices">
      ${B(t('pc.match'), () => { m.share = Math.round((m.share + 0.25) * 100) / 100; addLoy(m, 10); done(); }, {sub: t('pc.matchSub', {s: m.share + 0.25})})}
      ${B(t('pc.bonus', {n: fmt(bonus)}), () => { if (S.chest < bonus) return toast(t('toast.noMoney')); S.chest -= bonus; m.purse = (m.purse || 0) + bonus; addLoy(m, 15); done(); }, {sub: t('pc.bonusSub')})}
      ${B(t('pc.go'), () => {
        const v = recoverPartyGear(m); S.members = S.members.filter(x => x !== m);
        screen(() => `<h2>${t('pc.leftT', {name})}</h2><p class="lede">${t('pc.left', {name})}${v ? ' ' + t('pc.recover', {n: fmt(v)}) : ''}</p><div class="row">${B(t('btn.backHall'), done, {cls: 'pri'})}</div>`);
      }, {sub: t('pc.goSub', {name})})}
    </div>`);
});

/* ---------- 委託的裝備報酬：選一個人升一階，算小隊財產 ---------- */
registerEvent('gearReward', () => {
  const cands = S.members.filter(m => tierOf(m) < GEAR_MAX);
  const cash = Math.round(120 * inflation() / 10) * 10;
  const done = () => { goHall(); };
  screen(() => `<h2>${t('gw.title')}</h2><p class="lede">${t('gw.body')}</p>
    <div class="choices">${cands.map(m => B(t('gw.btn', {name: nm(m), gear: gearName(m)}), () => {
      m.tier++; m.ptier = (m.ptier || 0) + 1; m.pvalue = (m.pvalue || 0) + Math.round(GEAR_COST[m.tier - 1] * inflation()); addLoy(m, 4); done();
    }, {sub: `${roleOf(m)}・Lv${lvOf(m)}`})).join('')}
    ${B(t('gw.skip', {n: fmt(cash)}), () => { S.chest += cash; done(); }, {sub: t('gw.skipSub')})}</div>`);
});
