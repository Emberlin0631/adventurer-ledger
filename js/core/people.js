/* 成員系統：個性特質、訴求事件、招募名單、解約 */
const TRAITS = ['frugal', 'greedy', 'cautious', 'reckless', 'loyal', 'veteran'];
const START_TRAITS = {scout: 'cautious', tank: 'greedy', mage: 'reckless', heal: 'veteran', appr: 'frugal', trainee: 'reckless', tracker: 'veteran'};
const PARTY_MAX = 7;
const NAME_POOL_SIZE = 20;
const traitOf = m => m.trait || START_TRAITS[m.key] || null;

/* 依個性調整忠誠變化 */
function loyDelta(m, d) {
  const tr = traitOf(m);
  if (tr === 'greedy') d *= 2;
  if (tr === 'frugal' && d < 0) d = Math.ceil(d / 2);
  if (tr === 'loyal' && d < 0) d = Math.ceil(d / 2);
  return Math.round(d);
}
function addLoyT(m, d) {
  addLoy(m, loyDelta(m, d));
  if (traitOf(m) === 'loyal' && m.loy < 30) m.loy = 30;   // 忠心的人不會走
}
/* 受傷時誰比較容易中：莽撞 ×2、謹慎 ×0.6、有隊上買的護甲 ×0.5 */
function injuryWeight(m) {
  let w = 1;
  const tr = traitOf(m);
  if (tr === 'reckless') w *= 2;
  if (tr === 'cautious') w *= 0.6;
  if (m.gear) w *= 0.5;
  return w;
}
function weightedPick(pool) {
  const ws = pool.map(injuryWeight), sum = ws.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
/* 冒險的決定：謹慎的人不高興，莽撞的人喜歡 */
function riskyChoice() {
  S.members.forEach(m => {
    if (traitOf(m) === 'cautious') addLoy(m, -3);
    if (traitOf(m) === 'reckless') addLoy(m, 2);
  });
}
const veteranBonus = () => participants().filter(m => traitOf(m) === 'veteran').length * 0.03;

/* ---------- 訴求 ---------- */
function maybeQueueRequest() {
  if (S.pending.length || rnd() > 0.3) return;
  const pool = S.members.filter(m => m.key !== 'cap' && !m.dead);
  if (!pool.length) return;
  const m = pick(pool), opts = [];
  if (!m.debt) opts.push('advance');
  if (m.loy < 55 || traitOf(m) === 'greedy') opts.push('raise', 'raise');
  if (m.hp >= 1) opts.push('rest', 'rest');
  if (!m.gear && ['tank', 'trainee', 'scout'].includes(m.key)) opts.push('gear');
  if (!opts.length) return;
  S.req = {nk: m.nk, type: pick(opts)};
  S.pending.push('request');
}
registerEvent('request', () => {
  const r = S.req, m = r && S.members.find(x => x.nk === r.nk);
  if (!m) { S.req = null; goHall(); return; }
  const name = nm(m), done = () => { S.req = null; goHall(); };
  const head = () => `<h2>${t('rq.' + r.type + '.t', {name})}</h2><p class="lede">${t('rq.' + r.type + '.b', {name, role: roleOf(m), trait: traitOf(m) ? t('tr.' + traitOf(m)) : ''})}</p>`;
  // 按鈕要在 screen() 裡面建立，否則會被清掉
  const build = () => { let choices = '';
  if (r.type === 'raise') {
    const bonus = 30;
    choices = B(t('rq.raise.a'), () => { m.share = Math.round((m.share + 0.25) * 100) / 100; addLoy(m, 15); done(); }, {cls: 'pri', sub: t('rq.raise.aSub', {s: m.share + 0.25})})
      + B(t('rq.raise.bonus', {n: bonus}), () => { S.yours -= bonus; S.yoursY -= bonus; addLoy(m, 8); done(); }, {sub: t('rq.raise.bSub')})
      + B(t('rq.no'), () => { addLoyT(m, -8); done(); }, {sub: t('rq.noSub', {n: 8})});
  } else if (r.type === 'advance') {
    const amt = 40;
    choices = B(t('rq.advance.a', {n: amt}), () => { if (S.chest < amt) return toast(t('toast.noMoney')); S.chest -= amt; m.debt = amt; addLoy(m, 6); done(); }, {cls: 'pri', sub: t('rq.advance.aSub')})
      + B(t('rq.no'), () => { addLoyT(m, -4); done(); }, {sub: t('rq.noSub', {n: 4})});
  } else if (r.type === 'rest') {
    choices = B(t('rq.rest.a'), () => { m.restNext = true; addLoy(m, 10); done(); }, {cls: 'pri', sub: t('rq.rest.aSub')})
      + B(t('rq.no'), () => { addLoyT(m, -6); done(); }, {sub: t('rq.noSub', {n: 6})});
  } else if (r.type === 'gear') {
    const cost = Math.round(80 * inflation());
    choices = B(t('rq.gear.a', {n: cost}), () => { if (S.chest < cost) return toast(t('toast.noMoney')); S.chest -= cost; m.gear = true; addLoy(m, 6); done(); }, {cls: 'pri', sub: t('rq.gear.aSub')})
      + B(t('rq.no'), () => { addLoyT(m, -4); done(); }, {sub: t('rq.noSub', {n: 4})});
  }
  return `${head()}<div class="choices">${choices}</div>`; };
  screen(build);
});

/* ---------- 招募名單（每季換一次）與解約 ---------- */
const RECRUIT_ROLES = ['scout', 'tank', 'mage', 'heal', 'trainee', 'tracker'];
function freeName() {
  const used = new Set(S.members.map(m => m.nk).concat((S.cands || []).map(c => c.nk)).concat((S.fallen || []).map(f => f.nk)));
  const free = [...Array(NAME_POOL_SIZE).keys()].map(i => 'n.' + i).filter(k => !used.has(k));
  return free.length ? pick(free) : 'n.' + Math.floor(rnd() * NAME_POOL_SIZE);
}
function makeCandidate(role, source) {
  const tp = MEMBER_TEMPLATES[role];
  const c = {role, nk: freeName(), source, share: tp.share, trait: pick(TRAITS), fee: 40, loy: 60, hidden: false};
  if (source === 'tavern') { c.fee = 0; c.loy = 50; c.hidden = true; }
  if (source === 'veteran') { c.fee = 20; c.loy = 65; c.trait = 'veteran'; c.share = Math.round((tp.share + 0.25) * 100) / 100; }
  return c;
}
function rollCandidates() {
  const coreMissing = CORE_ROLES.filter(r => !S.members.some(m => m.key === r || (r === 'heal' && m.key === 'appr')));
  const list = coreMissing.map(r => makeCandidate(r, 'guild'));
  while (list.length < 3) {
    const src = pick(['guild', 'tavern', 'tavern', 'veteran']);
    const roles = src === 'veteran' ? ['scout', 'tank', 'mage'] : RECRUIT_ROLES;
    list.push(makeCandidate(pick(roles), src));
  }
  S.cands = list;
}
function hireCandidate(c) {
  if (S.members.length >= PARTY_MAX) return toast(t('hire.full', {n: PARTY_MAX}));
  if (S.chest < c.fee) return toast(t('toast.noMoney'));
  S.chest -= c.fee;
  const m = makeMember(c.role, c.nk); m.trait = c.trait; m.loy = c.loy; m.share = c.share;
  S.members.push(m);
  S.cands = S.cands.filter(x => x !== c);
  if (c.hidden) toast(t('hire.reveal', {name: nm(m), trait: t('tr.' + c.trait)}));
  goHall();
}
let dismissArmed = null;
function peoplePanel() {
  if (S.progress < 1 && S.members.length >= 5) return '';
  if (!S.cands) rollCandidates();
  const full = S.members.length >= PARTY_MAX;
  const cands = S.cands.map(c => B(t('hire.btn', {name: t(c.nk), role: t('r.' + c.role)}), () => hireCandidate(c), {
    dis: full, sub: [t('src.' + c.source), t('hire.share', {s: c.share}), c.hidden ? t('hire.unknown') : t('tr.' + c.trait), c.fee ? silver(c.fee) : t('hire.free')].join('・'),
  })).join('');
  const dismiss = S.members.filter(m => m.key !== 'cap').map(m => {
    const sev = Math.round(30 * m.share), armed = dismissArmed === m.nk;
    return B(armed ? t('fire.confirm', {name: nm(m)}) : t('fire.btn', {name: nm(m)}), () => {
      if (!armed) { dismissArmed = m.nk; rerender(); return; }
      if (S.chest < sev) return toast(t('toast.noMoney'));
      S.chest -= sev; S.members = S.members.filter(x => x !== m);
      S.members.forEach(x => { if (x.key !== 'cap') addLoyT(x, -2); });
      dismissArmed = null; goHall();
    }, {cls: 'ghost' + (armed ? ' danger' : ''), sub: t('fire.sub', {n: sev})});
  }).join('');
  return `<div class="panel"><h4>${t('hire.title')}</h4><p class="muted">${t('hire.body', {n: S.members.length, max: PARTY_MAX})}</p>
    <div class="row">${cands || `<span class="muted">${t('hire.none')}</span>`}</div>
    <details class="fire" ${dismissArmed ? 'open' : ''}><summary>${t('fire.title')}</summary><p class="muted">${t('fire.body')}</p><div class="row">${dismiss}</div></details></div>`;
}
