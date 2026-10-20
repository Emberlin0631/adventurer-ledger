/* 主線六：港口的海妖 — 聲望是資產（重複賽局）
   走私商私下塞 800 銀，要你戰鬥時放他的船先出港、事後在驗收報告上晚報三天。
   拒絕的話，港口商會給你長約：之後每季一張穩定的委託。一次性的錢，對上一直延續的生意。 */
const M6_BOUNTY = 1100, M6_BRIBE = 800, M6_FINE = 400, CHARTER_BASE = 380;
registerContract({id: 'm6', progress: 5, minDay: 105, notice: () => mlNotice('m6', m6Intel)});

const charterBounty = () => Math.round(CHARTER_BASE * (1 + 0.3 * (S.year - 1)) / 10) * 10;
function m6Intel() {
  if (!S.M || S.M.id !== 'm6') newMission({
    id: 'm6', D: 3, nameKey: 'm6.name', bounty: M6_BOUNTY, rationDays: 3,
    market: ['repair', 'crystal', 'healmat', 'antidote'], stock: {},
    hints: () => [[S.M.svc.repair || perk('tank'), 'm6.h1'], [has('mage') && S.inv.crystal >= Math.max(0, 2 - (perk('mage') ? 1 : 0)), 'm6.h2'], [has('scout'), 'm6.h3'], [mlHealer(), 'm6.h4']],
    go: m6Go, back: m6Intel, cancel: true,
  });
  const M = S.M;
  screen(() => `<div><h2>${t('m6.name')}</h2><p class="lede">${t('m6.lede')}</p></div>
    <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
      <li>${t('m6.i1')}</li><li>${t('m6.i2')}</li><li>${t('m6.i3', {n: fmt(charterBounty())})}</li></ul></div>
    <div class="panel"><h4>${t('contract')}</h4><p>${t('m6.terms')}</p><div class="choices">
      ${B(t('m6.accept'), () => { M.escrow = M6_BOUNTY; market(); }, {cls: 'pri'})}${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}
function m6Go() {
  expedition({biome: 'harbor', monster: 'serpent', days: S.M.rationDays, events: {}, onArrive: X => m6Offer(X)});
}
function m6Offer(X) {
  const M = S.M;
  card(t('m6.offer.t'), `<p>${t('m6.offer.b', {n: fmt(M6_BRIBE)})}</p>`, [
    {label: t('m6.offer.a', {n: fmt(M6_BRIBE)}), sub: t('m6.offer.aSub'), fn: () => { M.bribe = true; S.chest += M6_BRIBE; renderHUD(); card(t('m6.offer.t'), res([['w', t('m6.offer.aR')]]), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m6Fight(X))}]); }},
    {label: t('m6.offer.b2'), sub: t('m6.offer.b2Sub'), cls: 'pri', fn: () => { M.bribe = false; card(t('m6.offer.t'), res([t('m6.offer.bR')]), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m6Fight(X))}]); }},
  ]);
}
function m6Fight(X) {
  const M = S.M;
  const r = mlResolve([
    {ok: !!M.svc.repair || perk('tank') || mlFront(), w: 0.12, okText: t('m6.f.front'), badText: t('m6.f.noFront'), credit: ['tank', 'trainee']},
    {ok: mlFire(2), w: 0.15, okText: t('m6.f.fire'), badText: t('m6.f.noFire'), credit: ['mage']},
    {ok: has('scout'), w: 0.08, okText: t('m6.f.scout'), badText: t('m6.f.noScout'), credit: ['scout']},
    {ok: mlHealer(), w: 0.05, badText: t('m6.f.noHeal')},
  ], 0.93, 3);
  const L = r.L, lessonP = {bribe: fmt(M6_BRIBE), charter: fmt(charterBounty() * 4)};
  const after = () => m6Aftermath(r.win, M.bribe);
  if (r.win) {
    L.push(['g', t('m6.f.win')]);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => { S.day += 1; S.progress = 6; settle({titleKey: 'm6.s.title', bounty: M6_BOUNTY, introKey: 'm6.s.intro', lesson: 'rep', lessonP, after}); }}]);
  } else {
    L.push(['b', t('m6.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => { S.day += 1; S.rep -= 5; S.progress = 6; settle({titleKey: 'm6.s.fail', bounty: 0, resultKey: 'res.fail', introKey: 'm6.s.failIntro', lesson: 'rep', lessonP, after}); }}]);
  }
}
/* 結局：收了錢的有一半機率被查到；誠實完成的拿到長約 */
function m6Aftermath(win, bribe) {
  let titleKey, bodyKey, cls = '';
  if (bribe && rnd() < 0.5) {
    S.rep -= 30; S.chest -= M6_FINE; S.flags.charter = false;
    titleKey = 'm6.end.caughtT'; bodyKey = 'm6.end.caught'; cls = 'b';
  } else if (bribe) {
    S.flags.charter = win; titleKey = 'm6.end.luckyT'; bodyKey = win ? 'm6.end.lucky' : 'm6.end.luckyFail';
  } else if (win) {
    S.flags.charter = true; S.rep += 5; titleKey = 'm6.end.honestT'; bodyKey = 'm6.end.honest';
  } else {
    S.flags.charter = false; titleKey = 'm6.end.failT'; bodyKey = 'm6.end.fail';
  }
  screen(() => `<h2>${t(titleKey)}</h2><p class="lede ${cls}">${t(bodyKey, {n: fmt(M6_FINE), c: fmt(charterBounty())})}</p><div class="row">${B(t('btn.backHall'), goHall, {cls: 'pri'})}</div>`);
}
