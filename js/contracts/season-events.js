/* 季度事件：換季時有機會抽到一件，每件各帶一個經濟學想法
   festival 聲望是投資｜audit 合規成本與風險｜cartel 卡特爾的誘惑｜quarrel 規則比調解便宜｜patron 融資不是禮物｜exam 投資人力資本 */
const SE = {
  festival: () => true,
  audit:    () => S.chest >= 100,
  cartel:   () => S.progress >= 1 && !((S.flags.cartel || -1) > S.seasonIdx),
  quarrel:  () => S.members.filter(m => m.key !== 'cap').length >= 2,
  patron:   () => !(S.flags.patronLeft > 0) && S.chest < 700,
  exam:     () => S.chest >= 150,
};
function queueSeasonEvent() {
  if (S.seasonIdx < 2 || rnd() > 0.5) return;
  const ids = Object.keys(SE).filter(id => id !== S.flags.lastEv && SE[id]());
  if (!ids.length) return;
  const id = pick(ids); S.flags.lastEv = id; S.pending.push('se_' + id);
}
const seCost = n => Math.round(n * inflation() / 10) * 10;
const seBack = () => ({label: t('btn.backHall'), cls: 'pri', fn: goHall});
function seDone(id, lines) { screen(() => `<h2>${t('se.' + id + '.t')}</h2>${res(lines)}<div class="row">${B(t('btn.backHall'), goHall, {cls: 'pri'})}</div>`); }
function seScreen(id, choices, extra = '') {
  screen(() => `<h2>${t('se.' + id + '.t')}</h2><p class="lede">${t('se.' + id + '.b', extra)}</p><div class="choices">${choices()}</div>`);
}

registerEvent('se_festival', () => {
  const c = seCost(40), pay = seCost(60);
  seScreen('festival', () =>
    B(t('se.festival.a', {n: fmt(c)}), () => {
      if (S.chest < c) return toast(t('toast.noMoney'));
      S.chest -= c; S.rep += 6; S.members.forEach(m => addLoy(m, 2)); seDone('festival', [['g', t('se.festival.aR')]]);
    }, {cls: 'pri', sub: t('se.festival.aSub')})
    + B(t('se.festival.b', {n: fmt(pay)}), () => { S.chest += pay; seDone('festival', [t('se.festival.bR')]); }, {sub: t('se.festival.bSub')})
    + B(t('se.skip'), goHall), {c: fmt(c)});
});

registerEvent('se_audit', () => {
  const amt = Math.max(25, Math.round(S.chest * 0.08 / 5) * 5), bribe = seCost(40), fine = amt * 2 + seCost(60);
  seScreen('audit', () =>
    B(t('se.audit.a', {n: fmt(amt)}), () => { S.chest -= amt; S.rep += 2; seDone('audit', [t('se.audit.aR')]); }, {cls: 'pri', sub: t('se.audit.aSub')})
    + B(t('se.audit.b', {n: fmt(bribe)}), () => {
      if (S.chest < bribe) return toast(t('toast.noMoney'));
      S.chest -= bribe;
      if (rnd() < 0.35) { S.chest -= fine; S.rep -= 10; seDone('audit', [['b', t('se.audit.bBad', {n: fmt(fine)})]]); }
      else seDone('audit', [['w', t('se.audit.bOk')]]);
    }, {sub: t('se.audit.bSub')}), {n: fmt(amt)});
});

registerEvent('se_cartel', () => {
  seScreen('cartel', () =>
    B(t('se.cartel.a'), () => {
      if (rnd() < 0.3) { S.rep -= 15; seDone('cartel', [['b', t('se.cartel.aBad')]]); }
      else { S.flags.cartel = S.seasonIdx + 3; seDone('cartel', [['w', t('se.cartel.aOk')]]); }
    }, {sub: t('se.cartel.aSub')})
    + B(t('se.cartel.b'), () => { S.rep += 2; seDone('cartel', [t('se.cartel.bR')]); }, {cls: 'pri', sub: t('se.cartel.bSub')}));
});

registerEvent('se_quarrel', () => {
  const ps = S.members.filter(m => m.key !== 'cap').sort(() => rnd() - 0.5), a = ps[0], b = ps[1];
  if (!a || !b) { goHall(); return; }
  const pay = seCost(30), both = fn => { fn(a); fn(b); };
  seScreen('quarrel', () =>
    B(t('se.quarrel.a'), () => { S.day += 1; both(m => addLoy(m, 3)); seDone('quarrel', [['g', t('se.quarrel.aR')]]); }, {cls: 'pri', sub: t('se.quarrel.aSub')})
    + B(t('se.quarrel.b', {n: fmt(pay * 2)}), () => {
      if (S.chest < pay * 2) return toast(t('toast.noMoney'));
      S.chest -= pay * 2; both(m => addLoy(m, 5)); seDone('quarrel', [t('se.quarrel.bR')]);
    }, {sub: t('se.quarrel.bSub')})
    + B(t('se.quarrel.c'), () => { both(m => addLoyT(m, -8)); seDone('quarrel', [['w', t('se.quarrel.cR')]]); }, {sub: t('se.quarrel.cSub')}),
    {a: nm(a), b: nm(b)});
});

registerEvent('se_patron', () => {
  const amt = seCost(200);
  seScreen('patron', () =>
    B(t('se.patron.a', {n: fmt(amt)}), () => { S.chest += amt; S.flags.patronLeft = 3; seDone('patron', [['g', t('se.patron.aR', {n: fmt(amt)})]]); }, {sub: t('se.patron.aSub')})
    + B(t('se.patron.b'), () => seDone('patron', [t('se.patron.bR')]), {cls: 'pri', sub: t('se.patron.bSub')}), {n: fmt(amt)});
});

registerEvent('se_exam', () => {
  const cost = seCost(80), cands = S.members.filter(m => lvOf(m) < LV_MAX);
  if (!cands.length) { goHall(); return; }
  seScreen('exam', () =>
    cands.map(m => B(t('se.exam.btn', {name: nm(m)}), () => {
      if (S.chest < cost) return toast(t('toast.noMoney'));
      S.chest -= cost; const before = lvOf(m); m.xp += 70; m.lv = lvFromXP(m.xp);
      seDone('exam', [['g', t('se.exam.res', {name: nm(m)})], ...(m.lv > before ? [['g', t('se.exam.up', {name: nm(m), lv: m.lv})]] : [])]);
    }, {sub: `${roleOf(m)}・Lv${lvOf(m)}`})).join('') + B(t('se.skip'), goHall), {n: fmt(cost)});
});
