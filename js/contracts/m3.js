/* 主線三：龍脊隘口的嫁妝車隊 — 保險與道德風險
   公會賣出征保險：付一筆確定的保費，換掉不確定的大損失。
   途中有條穿過飛龍巢的近路；保了險，近路看起來比較便宜，但保險公司會調查，理賠減半。 */
const M3_BOUNTY = 1200, M3_EARLY = 150, M3_FAIL_PAY = 600, M3_WOUND_PAY = 100;
registerContract({id: 'm3', progress: 2, minDay: 35, notice: () => mlNotice('m3', m3Intel)});

const m3Premium = () => Math.round(M3_BOUNTY * (S.rep >= 45 ? 0.08 : 0.12) / 10) * 10;
function m3Intel() {
  if (!S.M || S.M.id !== 'm3') newMission({
    id: 'm3', D: 3, nameKey: 'm3.name', bounty: M3_BOUNTY, rationDays: 6, rationRate: 6, insured: false,
    market: ['horses', 'antidote', 'crystal', 'healmat', 'repair'], stock: {antidote: 4},
    hints: () => { const M = S.M; M.rationDays = M.svc.horses ? 6 : 8;
      return [[M.svc.horses, 'm3.h1'], [S.inv.antidote >= 2, 'm3.h2'], [mlScout(), 'm3.h3'], [has('mage') && (S.inv.crystal >= 1 || perk('mage')), 'm3.h4']]; },
    go: m3Go, back: m3Intel, cancel: true,
    onCancel: () => { if (S.M.premiumPaid) { S.chest += S.M.premiumPaid; S.M.spent -= S.M.premiumPaid; } },
  });
  const M = S.M, prem = m3Premium();
  screen(() => `<div><h2>${t('m3.name')}</h2><p class="lede">${t('m3.lede')}</p></div>
    <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
      <li>${t('m3.i1')}</li><li>${t('m3.i2')}</li><li>${t('m3.i3')}</li><li>${t('m3.i4')}</li></ul></div>
    <div class="panel"><h4>${t('m3.insT')}</h4><p>${t('m3.ins', {p: fmt(prem), f: fmt(M3_FAIL_PAY), w: M3_WOUND_PAY})}</p>
      ${S.rep < 45 ? `<p class="muted">${t('m3.insBad')}</p>` : ''}
      <div class="choices">
        ${B(`${M.insured ? '■' : '□'} ${t('m3.buy', {p: fmt(prem)})}`, () => { M.insured = !M.insured; m3Intel(); }, {sub: t('m3.buySub')})}
        ${B(t('m3.accept'), () => {
          M.escrow = M3_BOUNTY;
          if (M.insured && !M.premiumPaid) { if (S.chest < prem) return toast(t('toast.noMoney')); spend(prem); M.premiumPaid = prem; }
          market();
        }, {cls: 'pri', sub: M.insured ? t('m3.acceptSubIns', {p: fmt(prem)}) : ''})}
        ${B(t('btn.toBoard'), goHall, {dis: !!M.premiumPaid})}</div></div></div>`);
}
function m3Go() {
  const M = S.M;
  expedition({biome: 'road', monster: 'manticore', days: M.rationDays, events: {
    3: X => card(t('m3.cut.t'), `<p>${t('m3.cut.b', {n: M3_EARLY})}</p>${M.insured ? `<p class="quote">${t('m3.cut.ins')}</p>` : ''}`, [
      {label: t('m3.cut.a'), sub: t('m3.cut.aSub'), fn: () => { M.shortcut = true; riskyChoice(); X.days = Math.max(X.day + 1, X.days - 2); X.resume(); }},
      {label: t('m3.cut.b2'), sub: t('m3.cut.b2Sub'), fn: X.resume},
    ]),
  }, onArrive: X => card(t('m3.arrT'), t('m3.arrB'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m3Fight(X))}])});
}
function m3Fight(X) {
  const M = S.M;
  const anti = S.inv.antidote >= 2 ? (S.inv.antidote -= 2, true) : false;
  const r = mlResolve([
    {ok: anti, w: 0.15, okText: t('m3.f.anti'), badText: t('m3.f.noAnti')},
    {ok: mlScout(), w: 0.12, okText: t('m3.f.scout'), badText: t('m3.f.noScout'), credit: ['scout', 'tracker']},
    {ok: !!M.svc.horses, w: 0.06, badText: t('m3.f.noHorse')},
    {ok: mlFire(1), w: 0.12, okText: t('m3.f.fire'), badText: t('m3.f.noFire'), credit: ['mage']},
    {ok: !M.shortcut, w: 0.15, badText: t('m3.f.nest')},
  ], 0.95, 3);
  const L = r.L, wounds = new Set(M.serious || []).size;
  // 保險理賠：失敗賠 600、每位重傷 100；抄近路被認定為自己加大風險，理賠減半
  const claims = [];
  if (M.insured) {
    let pay = (r.win ? 0 : M3_FAIL_PAY) + wounds * M3_WOUND_PAY;
    if (M.shortcut && pay) { pay = Math.round(pay / 2); L.push(['w', t('m3.f.halved')]); }
    if (pay) claims.push([t('m3.claim'), pay]);
    M.payout = pay;
  }
  const lessonP = {ins: t(M.insured ? 'm3.lIns' : 'm3.lNo'), premium: fmt(M.premiumPaid || 0), payout: fmt(M.payout || 0), cut: t(M.shortcut ? 'm3.lCut' : 'm3.lRoad')};
  const after = () => { queueMidEvents(); goHall(); };
  if (r.win) {
    L.push(['g', t('m3.f.win')]);
    const loot = claims.concat(M.shortcut ? [[t('m3.early'), M3_EARLY]] : []);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      S.day += 1; S.progress = 3;
      settle({titleKey: 'm3.s.title', bounty: M3_BOUNTY, loot, introKey: 'm3.s.intro', lesson: 'ins', lessonP, after});
    }}]);
  } else {
    L.push(['b', t('m3.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.day += 1; S.rep -= 8; S.progress = 3;
      settle({titleKey: 'm3.s.fail', bounty: 0, resultKey: 'res.fail', loot: claims, introKey: 'm3.s.failIntro', lesson: 'ins', lessonP, after});
    }}]);
  }
}
