/* 公會大廳、主線註冊表、換季開銷、年終結帳、破產 */
const CONTRACTS = {};   // 主線委託：{id, progress, notice()}
const EVENTS = {};      // 排進 S.pending 的事件，以 id 儲存才能存檔
function registerContract(def) { CONTRACTS[def.id] = def; }
function registerEvent(id, fn) { EVENTS[id] = fn; }

const seasonDues = () => Math.round((40 + 4 * S.members.length) * DIFFS[S.diff || 'std'].dues);
const CORE_ROLES = ['scout', 'tank', 'mage', 'heal'];

let newGameArmed = false;
function goHall() {
  const leaver = S.members.find(m => m.key !== 'cap' && m.loy < 25);
  if (leaver) {
    S.members = S.members.filter(m => m !== leaver);
    const name = nm(leaver), v = recoverPartyGear(leaver);
    screen(() => `<h2>${t('hall.leave.title', {name})}</h2><p class="lede">${t('hall.leave.body', {name})}${v ? ' ' + t('pc.recover', {n: fmt(v)}) : ''}</p><div class="row">${B(t('btn.backHall'), goHall, {cls: 'pri'})}</div>`);
    return;
  }
  if (!S.formed) { formScreen(); return; }
  if (S.pending.length) { const id = S.pending.shift(); (EVENTS[id] || goHall)(); return; }
  // 年底：先結這一年的帳，再進下一年
  if (Math.floor((S.day - 1) / YEAR_DAYS) + 1 > S.year) { yearEnd(S.year); return; }
  // 換季：扣公會會費與倉儲，公告板換新
  const sIdx = Math.floor((S.day - 1) / SEASON_DAYS);
  if (!S.mkt) rollMarket();
  if (S.seasonIdx < sIdx) { rollMarket(); S.cands = null; }
  while (S.seasonIdx < sIdx) { S.seasonIdx++; const d = seasonDues(); S.chest -= d; S.duesNote += d; S.board = []; S.members.forEach(m => addLoy(m, (traitOf(m) === 'loyal' ? 4 : 2) + (capSkill('lead') && m.key !== 'cap' ? 2 : 0))); seasonLiving(); maybePoach(); herbSeason(); queueSeasonEvent(); }
  fillBoard();
  saveGame();
  // 破產：錢箱連最便宜的一趟口糧都付不起
  const cheapest = Math.min(...S.board.map(c => c.days * 5), mainlineAvailable().length ? 15 : Infinity);
  if (S.chest < Math.min(cheapest, 40)) { bankrupt(); return; }
  newGameArmed = false;
  const showIntro = !S.started, dues = S.duesNote;
  S.started = true; S.duesNote = 0;
  screen(() => {
    const notices = mainlineAvailable().map(c => c.notice()).concat(S.board.map(rcNotice));
    const sick = S.members.filter(m => m.hp === 2);
    return `
    ${coach('hall')}
    ${showIntro ? `<div class="panel"><h4>${t('hall.intro.title')}</h4><p>${t('hall.intro.body')}</p></div>` : ''}
    ${dues ? `<div class="panel"><h4>${t('dues.title')}</h4><p>${t('dues.body', {n: fmt(dues), m: S.members.length})}</p></div>` : ''}
    <div class="row" style="justify-content:space-between"><h2>${t('hall.board')}</h2><div class="row"><span class="muted">${t('hall.inv', {x: invText() || t('hall.none')})}</span>${B(t('ms.open'), membersScreen, {cls: 'ghost'})}</div></div>
    <div class="board">${notices.join('')}</div>
    <div class="row">${B(t('hall.rest'), restDay, {cls: 'ghost', sub: t('hall.restSub', {n: restCost()}), dis: S.chest < restCost()})}</div>
    <p class="muted">${t('hall.next', {d: SEASON_DAYS - (S.day - 1) % SEASON_DAYS, n: fmt(seasonDues())})}</p>
    ${mainlinePanel()}
    ${sick.length ? `<div class="panel"><h4>${t('hall.sick.title')}</h4><p class="muted">${t('hall.sick.body')}</p><div class="row">${sick.map(m => B(t('hall.sick.btn', {name: nm(m)}), () => {
      if (S.chest < 80) return toast(t('hall.sick.toast')); S.chest -= 80; m.hp = 0; goHall();
    }, {sub: t('hall.sick.cost')})).join('')}</div></div>` : ''}
    ${marketPanel()}
    ${herbPanel()}
    ${peoplePanel()}
    <div class="hallfoot"><span class="muted">${t('hall.diff', {d: t('diff.' + (S.diff || 'std'))})}・${t('hall.autosave')}</span>${B(S.noTips ? t('coach.on') : t('coach.off'), () => { S.noTips = !S.noTips; rerender(); }, {cls: 'ghost'})}${B(newGameArmed ? t('hall.newGameConfirm') : t('hall.newGame'), () => {
      if (!newGameArmed) { newGameArmed = true; rerender(); return; }
      clearSave(); startScreen();
    }, {cls: 'ghost' + (newGameArmed ? ' danger' : '')})}</div>`;
  });
}
/* 休息一日：輕傷痊癒，公告板換一批新委託；付住宿費，日子照過（離換季的帳單又近一天） */
const restCost = () => 3 * S.members.length;
function restDay() {
  const c = restCost();
  if (S.chest < c) return toast(t('toast.noMoney'));
  S.chest -= c; S.day += 1;
  S.members.forEach(m => { if (m.hp === 1) m.hp = 0; });
  S.board = [];
  goHall();
}
function invText() {
  const parts = INVKEYS.filter(k => S.inv[k]).map(k => `${t('inv.' + k)}×${S.inv[k]}`);
  if (S.bones) parts.push(t('inv.bones', {n: S.bones}));
  return parts.join(t('list.sep'));
}
const recordName = r => t(r.nameKey, r.place != null ? {place: t('place.' + r.place)} : undefined);

function yearEnd(y) {
  const recs = S.records.filter(r => r.y === y);
  const invV = S.inv.antidote * 35 + S.inv.antipetri * 60 + S.inv.mirror * 40 + S.inv.crystal * 25 + S.inv.healmat * 50;
  const fails = recs.filter(r => r.resultKey !== 'res.ok').length;
  const verdict = S.chest >= 600 && fails <= 1 ? 'ye.good' : S.chest >= 300 ? 'ye.mid' : 'ye.bad';
  const income = recs.reduce((a, r) => a + r.bounty, 0), shared = recs.reduce((a, r) => a + r.dist, 0);
  screen(() => `<div><h2>${t('ye.title', {y})}</h2><p class="lede">${t(verdict)}</p></div>
    <div class="row muted">${t('ye.summary', {n: recs.length, ok: recs.length - fails, b: fmt(income), d: fmt(shared)})}</div>
    ${(S.fallen || []).some(f => f.y === y) ? `<p class="muted">${t('ye.fallen', {list: S.fallen.filter(f => f.y === y).map(f => t(f.nk)).join(t('list.sep'))})}</p>` : ''}
    <div class="tbl-wrap"><table class="rec"><thead><tr><th>${t('ye.hName')}</th><th>${t('ye.hRes')}</th><th class="n">${t('ye.hBounty')}</th><th class="n">${t('ye.hSpent')}</th><th class="n">${t('ye.hDist')}</th><th class="n">${t('ye.hChest')}</th></tr></thead>
    <tbody>${recs.map(r => `<tr><td>${recordName(r)}</td><td>${t(r.resultKey)}</td><td class="n">${fmt(r.bounty)}</td><td class="n">${fmt(r.spent)}</td><td class="n">${fmt(r.dist)}</td><td class="n">${fmt(r.chest)}</td></tr>`).join('')}</tbody></table></div>
    <div class="split"><div class="panel"><h4>${t('ye.assets')}</h4><div class="fees num">
      <div><span>${t('ye.cash')}</span><span>${silver(S.chest)}</span></div>
      <div><span>${t('ye.inv')}</span><span>${silver(invV)}</span></div>
      ${S.bones ? `<div><span>${t('ye.bones')}</span><span>${silver(S.bones)}</span></div>` : ''}
      <div class="tot"><span>${t('ye.yours')}</span><span>${silver(S.yoursY)}</span></div></div></div>
    <div class="panel"><h4>${t('ye.members')}</h4><div class="fees num">${S.members.map(m => `<div><span>${nm(m)}・${roleOf(m)}</span><span>${silver(m.earnedY || 0)}</span></div>`).join('')}</div></div></div>
    <p class="quote">${t('ye.quote')}</p>
    <div class="row">${B(t('ye.continue', {y: y + 1}), () => {
      S.year = y + 1; S.yoursY = 0; S.members.forEach(m => { m.earnedY = 0; }); S.board = [];
      goHall();
    }, {cls: 'pri', sub: t('ye.continueSub')})}</div>`);
}
function bankrupt() {
  clearSave();
  screen(() => `<h2>${t('bk.title')}</h2><p class="lede">${t('bk.body')}</p><p class="muted">${t('bk.stats', {y: S.year, n: S.records.length, d: fmt(S.yours)})}</p><div class="row">${B(t('bk.restart'), startScreen, {cls: 'pri'})}</div>`);
}

/* 開新局：選難度 */
function startScreen() {
  newGame();
  screen(() => `<div><h2>${t('diff.title')}</h2><p class="lede">${t('diff.lede')}</p></div>
    <div class="choices" style="max-width:560px">
      ${['easy', 'std', 'hard'].map(d => B(t('diff.' + d), () => { clearSave(); newGame(d); goHall(); }, {cls: d === 'std' ? 'pri' : '', sub: t('diff.' + d + 'Sub')})).join('')}
    </div><p class="muted">${t('diff.note')}</p>`);
}

/* 後事：照契約辦，或另付撫卹金 */
registerEvent('funeral', () => {
  const dead = S.deadPending || []; if (!dead.length) { goHall(); return; }
  const names = dead.map(d => t(d.nk)).join(t('list.sep'));
  const pension = Math.round(dead.reduce((a, d) => a + 60 * d.share, 0) / 10) * 10;
  const gear = dead.some(d => d.key === 'trainee');
  const done = () => { S.deadPending = []; goHall(); };
  screen(() => `<h2>${t('fn.title', {names})}</h2><p class="lede">${t('fn.body')}</p>${gear ? `<p class="muted">${t('fn.gear')}</p>` : ''}
    <p class="quote">${t('fn.quote')}</p>
    <div class="choices">
      ${B(t('fn.a'), () => { S.members.forEach(m => { if (m.key !== 'cap') addLoy(m, -3); }); done(); }, {sub: t('fn.aSub')})}
      ${B(t('fn.b', {n: fmt(pension)}), () => { if (S.chest < pension) return toast(t('toast.noMoney')); S.chest -= pension; S.rep += 3; S.members.forEach(m => { if (m.key !== 'cap') addLoy(m, 4); }); done(); }, {cls: 'pri', sub: t('fn.bSub')})}
    </div>`);
});

function captainDied() {
  clearSave();
  screen(() => `<h2>${t('dth.capT')}</h2><p class="lede">${t('dth.capB')}</p><p class="muted">${t('bk.stats', {y: S.year, n: S.records.length, d: fmt(S.yours)})}</p><div class="row">${B(t('bk.restart'), startScreen, {cls: 'pri'})}</div>`);
}
