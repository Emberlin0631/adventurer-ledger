/* 主線四：紅磨坊的枯萎樹精 — 供給與需求
   樹精讓月光草大片枯死，供給少了，價格才暴漲。清掉樹精後，隊伍可以帶回一批倖存的月光草。
   倉庫裡每賣一束，市場上的供給就多一點，價格就往下掉；每季價格會慢慢回到正常。 */
const M4_BOUNTY = 600, HERB_NORMAL = 30, HERB_PEAK = 90, HERB_DROP = 0.92;
registerContract({id: 'm4', progress: 3, minDay: 61, notice: () => mlNotice('m4', m4Intel)});

function m4Intel() {
  if (!S.M || S.M.id !== 'm4') newMission({
    id: 'm4', D: 2, nameKey: 'm4.name', bounty: M4_BOUNTY, rationDays: 4,
    market: ['crystal', 'healmat', 'porters', 'processor', 'repair'], stock: {},
    hints: () => [[has('mage') && S.inv.crystal >= Math.max(0, 2 - (perk('mage') ? 1 : 0)), 'm4.h1'], [mlHealer() && S.inv.healmat >= 1, 'm4.h2'], [S.M.svc.porters || S.M.svc.processor, 'm4.h3']],
    go: m4Go, back: m4Intel, cancel: true,
  });
  const M = S.M;
  if (S.herbPrice == null) S.herbPrice = HERB_PEAK;
  screen(() => `<div><h2>${t('m4.name')}</h2><p class="lede">${t('m4.lede')}</p></div>
    <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
      <li>${t('m4.i1', {p: Math.round(S.herbPrice), n: HERB_NORMAL})}</li><li>${t('m4.i2')}</li><li>${t('m4.i3')}</li></ul></div>
    <div class="panel"><h4>${t('contract')}</h4><p>${t('m4.terms')}</p><div class="choices">
      ${B(t('m4.accept'), () => { M.escrow = M4_BOUNTY; market(); }, {cls: 'pri'})}${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}
function m4Go() {
  const M = S.M;
  expedition({biome: 'forest', monster: 'treant', days: M.rationDays, extras: (M.svc.porters ? 2 : 0) + (M.svc.processor ? 1 : 0), events: {},
    onArrive: X => card(t('m4.arrT'), t('m4.arrB'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m4Fight(X))}])});
}
function m4Fight(X) {
  const M = S.M;
  const curse = mlHealer() && S.inv.healmat >= 1 ? (S.inv.healmat--, true) : false;
  const r = mlResolve([
    {ok: mlFire(2), w: 0.2, okText: t('m4.f.fire'), badText: t('m4.f.noFire'), credit: ['mage']},
    {ok: curse, w: 0.12, okText: t('m4.f.curse'), badText: t('m4.f.noCurse'), credit: ['heal', 'appr']},
    {ok: !!M.svc.repair || mlFront(), w: 0.05, badText: t('m4.f.noFront')},
  ], 0.9, 2);
  const L = r.L;
  if (r.win) {
    const n = 6 + (M.svc.porters ? 6 : 0) + (M.svc.processor ? 2 : 0);
    S.herbs = (S.herbs || 0) + n;
    L.push(['g', t('m4.f.win')], ['g', t('m4.f.herbs', {n})]);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      S.day += 1; S.progress = 4;
      settle({titleKey: 'm4.s.title', bounty: M4_BOUNTY, introKey: 'm4.s.intro', note: t('m4.s.note', {n}), lesson: 'sup', lessonP: {n, price: Math.round(S.herbPrice), normal: HERB_NORMAL}});
    }}]);
  } else {
    L.push(['b', t('m4.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.day += 1; S.rep -= 5; S.progress = 4;
      settle({titleKey: 'm4.s.fail', bounty: 0, resultKey: 'res.fail', introKey: 'm4.s.failIntro', lesson: 'sup', lessonP: {n: 0, price: Math.round(S.herbPrice), normal: HERB_NORMAL}});
    }}]);
  }
}

/* 倉庫賣月光草：每賣一束，價格 ×0.92；每季往正常價回歸一半 */
function herbSell(count) {
  let total = 0;
  for (let i = 0; i < count && S.herbs > 0; i++) { total += Math.round(S.herbPrice); S.herbs--; S.herbPrice = Math.max(8, S.herbPrice * HERB_DROP); }
  S.chest += total;
  toast(t('herb.sold', {n: fmt(total)}));
  goHall();
}
function herbPreview(count) {
  let p = S.herbPrice, total = 0;
  for (let i = 0; i < Math.min(count, S.herbs); i++) { total += Math.round(p); p = Math.max(8, p * HERB_DROP); }
  return total;
}
function herbSeason() { if (S.herbPrice != null) S.herbPrice = HERB_NORMAL + (S.herbPrice - HERB_NORMAL) * 0.5; }
function herbPanel() {
  if (!S.herbs) return '';
  const all = herbPreview(S.herbs);
  return `<div class="panel"><h4>${t('herb.title')}</h4><p class="muted">${t('herb.body', {n: S.herbs, p: Math.round(S.herbPrice), normal: HERB_NORMAL})}</p>
    <div class="row">${B(t('herb.one', {p: Math.round(S.herbPrice)}), () => herbSell(1))}
    ${S.herbs >= 5 ? B(t('herb.five', {n: fmt(herbPreview(5))}), () => herbSell(5), {sub: t('herb.avg', {a: Math.round(herbPreview(5) / 5)})}) : ''}
    ${B(t('herb.all', {c: S.herbs, n: fmt(all)}), () => herbSell(S.herbs), {sub: t('herb.avg', {a: Math.round(all / S.herbs)})})}</div></div>`;
}
