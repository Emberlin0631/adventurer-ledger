/* 長期目標：據點升級、聲望里程碑、成功率色條、當季提醒
   據點有季度維護費（固定成本），換來持續的好處；里程碑是對「撐下去」的獎勵 */
const FACILITIES = {
  stable:    {cost: [200, 400, 700]},
  infirmary: {cost: [250, 450, 800]},
  warehouse: {cost: [150, 300, 500]},
  intel:     {cost: [200, 400, 650]},
  training:  {cost: [300, 550, 900]},
};
const FAC_UPKEEP = 6;   // 每級每季的維護費
const baseLv = k => (S.base && S.base[k]) || 0;
const hasMs = id => !!(S.ms && S.ms[id]);
const baseUpkeep = () => Object.keys(FACILITIES).reduce((a, k) => a + baseLv(k), 0) * FAC_UPKEEP;
const facMax = () => hasMs('chest1000') ? 3 : 2;
const facCost = k => { const lv = baseLv(k); return lv >= 3 ? null : Math.round(FACILITIES[k].cost[lv] * inflation() / 10) * 10; };
const sickCost = () => [80, 60, 40, 25][baseLv('infirmary')];
const boardSize = () => 5 + (baseLv('intel') >= 1 ? 1 : 0) + (baseLv('intel') >= 3 ? 1 : 0);

/* ---------- 據點 ---------- */
function upgradeFac(k) {
  const c = facCost(k);
  if (c == null || baseLv(k) >= facMax()) return;
  if (S.chest < c) return toast(t('toast.noMoney'));
  S.chest -= c; S.base = S.base || {}; S.base[k] = baseLv(k) + 1;
  toast(t('fac.done', {name: t('fac.' + k + '.n'), lv: S.base[k]}));
  goHall();
}
function basePanel() {
  const keys = Object.keys(FACILITIES), up = baseUpkeep();
  return `<details class="panel basepanel"><summary><b>${t('fac.title')}</b> <span class="muted">${t('fac.sum', {n: keys.reduce((a, k) => a + baseLv(k), 0), u: up})}</span></summary>
    <p class="muted">${t('fac.body', {u: FAC_UPKEEP})}</p>
    <div class="facgrid">${keys.map(k => {
      const lv = baseLv(k), c = facCost(k), locked = lv >= facMax() && lv < 3;
      return `<div class="fac"><b>${t('fac.' + k + '.n')}</b> <span class="pips">${'◆'.repeat(lv)}${'◇'.repeat(3 - lv)}</span>
        <span class="muted">${lv ? t('fac.' + k + '.e' + lv) : t('fac.none')}</span>
        ${lv >= 3 ? `<span class="muted">${t('fac.max')}</span>` : `<span class="muted">${t('fac.next', {e: t('fac.' + k + '.e' + (lv + 1))})}</span>
        ${B(locked ? t('fac.locked') : t('fac.up', {n: fmt(c)}), () => upgradeFac(k), {cls: 'ghost', dis: locked || S.chest < c})}`}</div>`;
    }).join('')}</div></details>`;
}

/* ---------- 里程碑 ---------- */
const succCount = () => S.records.filter(r => r.resultKey === 'res.ok').length;
const MILESTONES = [
  {id: 'rep60',     ok: () => S.rep >= 60,        prog: () => `${S.rep} / 60`},
  {id: 'succ10',    ok: () => succCount() >= 10,  prog: () => `${succCount()} / 10`, apply: () => S.members.forEach(m => { m.xp += 40; m.lv = lvFromXP(m.xp); })},
  {id: 'chest1000', ok: () => S.chest >= 1000,    prog: () => `${Math.round(S.chest)} / 1000`},
  {id: 'rep80',     ok: () => S.rep >= 80,        prog: () => `${S.rep} / 80`},
  {id: 'succ30',    ok: () => succCount() >= 30,  prog: () => `${succCount()} / 30`},
  {id: 'year3',     ok: () => S.year >= 3,        prog: () => `${S.year} / 3`},
  {id: 'main',      ok: () => S.progress >= 6,    prog: () => `${S.progress} / 6`, apply: () => { S.rep += 10; }},
];
function checkMilestones() {
  if (!S.ms) S.ms = {};
  const fresh = MILESTONES.filter(m => !S.ms[m.id] && m.ok());
  if (!fresh.length) return;
  fresh.forEach(m => { S.ms[m.id] = 1; if (m.apply) m.apply(); });
  S.msNew = fresh.map(m => m.id);
  S.pending.push('milestone');
}
registerEvent('milestone', () => {
  const ids = S.msNew || []; S.msNew = [];
  if (!ids.length) { goHall(); return; }
  screen(() => `<h2>${t('mst.title')}</h2><div class="stack">${ids.map(id => `<div class="panel"><h4>${t('mst.' + id + '.n')}</h4><p>${t('mst.' + id + '.d')}</p></div>`).join('')}</div>
    <div class="row">${B(t('btn.backHall'), goHall, {cls: 'pri'})}</div>`);
});
function milestonePanel() {
  const done = MILESTONES.filter(m => hasMs(m.id)).length;
  return `<details class="panel"><summary><b>${t('mst.panel')}</b> <span class="muted">${done} / ${MILESTONES.length}</span></summary>
    <ul class="mslist">${MILESTONES.map(m => `<li class="${hasMs(m.id) ? 'ok' : ''}"><b>${hasMs(m.id) ? '✔' : '○'} ${t('mst.' + m.id + '.n')}</b>・<span class="muted">${t('mst.' + m.id + '.d')}${hasMs(m.id) ? '' : `（${m.prog()}）`}</span></li>`).join('')}</ul></details>`;
}

/* ---------- 成功率色條 ---------- */
function riskBar(p) {
  const pc = Math.round(p * 100), cls = pc >= 80 ? 'good' : pc >= 60 ? 'mid' : 'bad';
  return `<span class="rbar ${cls}" title="${t('rbar.t')}"><span class="trk"><i style="width:${pc}%"></i></span><b>${pc}%</b></span>`;
}

/* ---------- 當季提醒 ---------- */
function remindersPanel() {
  const L = [], dleft = SEASON_DAYS - (S.day - 1) % SEASON_DAYS, due = seasonDues();
  if (S.chest < due + 100) L.push(['bad', t('rem.low', {n: fmt(due)})]);
  else if (dleft <= 10) L.push(['warn', t('rem.dues', {d: dleft, n: fmt(due)})]);
  const sick = S.members.filter(m => m.hp === 2), light = S.members.filter(m => m.hp === 1);
  if (sick.length) L.push(['bad', t('rem.sick', {names: sick.map(nm).join(t('list.sep'))})]);
  if (light.length) L.push(['warn', t('rem.light', {names: light.map(nm).join(t('list.sep'))})]);
  const shaky = S.members.filter(m => m.key !== 'cap' && m.loy < 40);
  if (shaky.length) L.push(['warn', t('rem.loy', {names: shaky.map(nm).join(t('list.sep'))})]);
  if (S.members.length < MAINLINE_MIN) L.push(['info', t('rem.small', {n: MAINLINE_MIN - S.members.length})]);
  const miss = CORE_ROLES.filter(r => !S.members.some(m => m.key === r || (r === 'heal' && m.key === 'appr')));
  if (miss.length && S.members.length >= 3) L.push(['info', t('rem.role', {roles: miss.map(r => t('r.' + r)).join(t('list.sep'))})]);
  if (mainlineAvailable().length) L.push(['good', t('rem.main')]);
  const cheap = Math.min(...Object.keys(FACILITIES).filter(k => baseLv(k) < facMax()).map(k => facCost(k)), Infinity);
  if (cheap < Infinity && S.chest >= cheap + due + 150) L.push(['info', t('rem.base', {n: fmt(cheap)})]);
  if (!L.length) L.push(['good', t('rem.ok')]);
  const order = {bad: 0, warn: 1, good: 2, info: 3};
  L.sort((a, b) => order[a[0]] - order[b[0]]);
  return `<div class="panel remind"><h4>${t('rem.title')}</h4><ul>${L.slice(0, 5).map(l => `<li class="${l[0]}">${l[1]}</li>`).join('')}</ul></div>`;
}
