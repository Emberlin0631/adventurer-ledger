/* 主線二：鹽井屯的地底蠕蟲 — 沉沒成本
   錢已經花掉一大半，蠕蟲卻退進淹水的舊坑道。三個選項都拿不回已經花的錢，
   畫面只列「從現在起」的成本、成功率與期望值；有人會喊「都花這麼多了！」，那正是陷阱。 */
const M2_BOUNTY = 900, M2_REPORT = 150;
registerContract({id: 'm2', progress: 1, minDay: 15, notice: () => mlNotice('m2', m2Intel)});

function m2Intel() {
  if (!S.M || S.M.id !== 'm2') newMission({
    id: 'm2', D: 2, nameKey: 'm2.name', bounty: M2_BOUNTY, rationDays: 4,
    market: ['mapper', 'antidote', 'repair', 'healmat', 'crystal'], stock: {},
    hints: () => [[S.M.svc.mapper, 'm2.h1'], [S.inv.antidote >= 1, 'm2.h2'], [S.M.svc.repair, 'm2.h3'], [mlHealer(), 'm2.h4']],
    go: m2Go, back: m2Intel, cancel: true,
  });
  const M = S.M;
  screen(() => `<div><h2>${t('m2.name')}</h2><p class="lede">${t('m2.lede')}</p></div>
    <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
      <li>${t('m2.i1')}</li><li>${t('m2.i2')}</li><li>${t('m2.i3')}</li></ul></div>
    <div class="panel"><h4>${t('contract')}</h4><p>${t('m2.terms')}</p><div class="choices">
      ${B(t('m2.accept'), () => { M.escrow = M2_BOUNTY; market(); }, {cls: 'pri'})}${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}
function m2Go() {
  expedition({biome: 'mine', monster: 'worm', days: S.M.rationDays, events: {}, onArrive: X => m2Fork(X)});
}
function m2Fork(X) {
  const M = S.M, spent = M.spent, g = growthBonus() + veteranBonus();
  const pA0 = 0.5 + (M.svc.mapper ? 0.15 : 0) + (perk('scout') ? 0.1 : 0), pB0 = 0.72;
  const pA = clampP(pA0 + g), pB = clampP(pB0 + g);
  const cA = 120 + 3 * M.rationRate, cB = 40 + 5 * M.rationRate;
  const evA = Math.round(M2_BOUNTY * pA - cA), evB = Math.round(M2_BOUNTY * pB - cB);
  const lessonP = {spent: fmt(spent), a: fmt(evA), b: fmt(evB), c: fmt(M2_REPORT)};
  const greedy = S.members.find(m => traitOf(m) === 'greedy' && !m.sitting);
  card(t('m2.fork.t'), `<p>${t('m2.fork.b', {spent: fmt(spent)})}</p>${greedy ? `<p class="quote">${t('m2.fork.q', {name: nm(greedy), spent: fmt(spent)})}</p>` : ''}`, [
    {label: t('m2.a'), sub: t('m2.aSub', {c: cA, p: pct(pA), ev: fmt(evA)}), fn: () => {
      if (S.chest < cA) return toast(t('toast.noMoney'));
      spend(cA); S.day += 3; battle(X, () => m2Fight(X, pA0, lessonP));
    }},
    {label: t('m2.b'), sub: t('m2.bSub', {c: cB, p: pct(pB), ev: fmt(evB)}), fn: () => {
      if (S.chest < cB) return toast(t('toast.noMoney'));
      spend(cB); S.day += 5; battle(X, () => m2Fight(X, pB0, lessonP));
    }},
    {label: t('m2.c'), sub: t('m2.cSub', {ev: fmt(M2_REPORT)}), fn: () => {
      S.progress = 2;
      settle({titleKey: 'm2.s.withdraw', bounty: 0, resultKey: 'res.withdraw', loot: [[t('m2.report'), M2_REPORT]], introKey: 'm2.s.withdrawIntro', lesson: 'sunk', lessonP});
    }},
  ]);
}
function m2Fight(X, base, lessonP) {
  const r = mlResolve([
    {ok: S.inv.antidote > 0 && !!(S.inv.antidote--, true), w: 0.1, okText: t('m2.f.acid'), badText: t('m2.f.noAcid')},
    {ok: !!S.M.svc.repair || perk('tank'), w: 0.05, badText: t('m2.f.noRepair'), credit: ['tank']},
    {ok: mlHealer(), w: 0.05, badText: t('m2.f.noHeal')},
  ], base, 2);
  const L = r.L;
  if (r.win) {
    L.push(['g', t('m2.f.win')]);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      S.day += 1; S.progress = 2;
      settle({titleKey: 'm2.s.title', bounty: M2_BOUNTY, introKey: 'm2.s.intro', lesson: 'sunk', lessonP});
    }}]);
  } else {
    L.push(['b', t('m2.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.day += 1; S.rep -= 5; S.progress = 2;
      settle({titleKey: 'm2.s.fail', bounty: 0, resultKey: 'res.fail', introKey: 'm2.s.failIntro', lesson: 'sunk', lessonP});
    }}]);
  }
}
