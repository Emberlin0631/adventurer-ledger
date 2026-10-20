/* 主線一：灰石橋的收費巨魔 — 機會成本
   一個羊毛商同時想雇兩名成員去護送。全隊打巨魔比較穩；分兵能多賺護送費，但巨魔那邊少了人。
   畫面即時算出兩種方案的成功率與期望收入：選項真正的成本，是你為它放棄的另一個選項。 */
const M1_BOUNTY = 700, M1_ESCORT = 220, M1_CUT = 0.25;
registerContract({id: 'm1', progress: 0, minDay: 1, notice: () => mlNotice('m1', m1Intel)});

/* 估算某種分兵方案下打巨魔的成功率（假設該買的都會買） */
function m1Prob(away) {
  const ps = S.members.filter(m => !away.includes(m.nk) && m.hp < 2);
  const hasK = (...ks) => ps.some(m => ks.includes(m.key));
  let p = 0.92;
  if (!hasK('mage')) p -= 0.25;                                                   // 巨魔的傷口會再生，要靠火
  if (!hasK('tank', 'trainee') && !ps.some(m => m.key === 'cap' && tierOf(m) >= 1)) p -= 0.12;
  if (!hasK('heal', 'appr')) p -= 0.06;
  p -= Math.max(0, 5 - ps.length) * 0.05;
  p += Math.min(0.12, ps.reduce((a, m) => a + (lvOf(m) - 1) * 0.01 + tierOf(m) * 0.01, 0));
  return clampP(p);
}

function m1Intel() {
  if (!S.M || S.M.id !== 'm1') newMission({
    id: 'm1', D: 1, nameKey: 'm1.name', bounty: M1_BOUNTY, rationDays: 5, away: [],
    market: ['crystal', 'repair', 'healmat', 'horses'], stock: {},
    hints: () => [[has('mage') && (S.inv.crystal >= 1 || perk('mage')), 'm1.h1'], [S.M.svc.repair, 'm1.h2'], [mlHealer(), 'm1.h3']],
    go: m1Go, back: m1Intel, cancel: true,
  });
  const M = S.M;
  const pF = m1Prob([]), pS = m1Prob(M.away);
  const evF = Math.round(M1_BOUNTY * pF), evS = Math.round(M1_BOUNTY * pS + M1_ESCORT);
  const pick2 = m => () => {
    const i = M.away.indexOf(m.nk);
    if (i >= 0) M.away.splice(i, 1); else if (M.away.length < 2) M.away.push(m.nk);
    m1Intel();
  };
  const cands = S.members.filter(m => m.key !== 'cap' && m.hp < 2);
  const split = M.away.length === 2;
  screen(() => `<div><h2>${t('m1.name')}</h2><p class="lede">${t('m1.lede')}</p></div>
    <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
      <li>${t('m1.i1')}</li><li>${t('m1.i2')}</li><li>${t('m1.i3')}</li></ul>
      <h4>${t('m1.offerT')}</h4><p>${t('m1.offer', {n: M1_ESCORT})}</p>
      <div class="row">${cands.map(m => B(`${M.away.includes(m.nk) ? '■' : '□'} ${nm(m)}`, pick2(m), {cls: 'sq', sub: roleOf(m)})).join('')}</div></div>
    <div class="panel"><h4>${t('m1.compare')}</h4><div class="fees num">
      <div><span>${t('m1.full')}</span><span>${pct(pF)}%</span></div>
      <div><span class="muted">${t('m1.ev')}</span><span>${t('unit', {n: fmt(evF)})}</span></div>
      <div class="tot"><span>${split ? t('m1.splitPlan', {a: nm(S.members.find(x => x.nk === M.away[0])), b: nm(S.members.find(x => x.nk === M.away[1]))}) : t('m1.splitNone')}</span><span>${split ? pct(pS) + '%' : '—'}</span></div>
      ${split ? `<div><span class="muted">${t('m1.evSplit', {n: M1_ESCORT})}</span><span>${t('unit', {n: fmt(evS)})}</span></div>` : ''}</div>
      <p class="muted">${t('m1.note')}</p>
      <div class="choices">
        ${B(split ? t('m1.goSplit') : t('m1.goFull'), () => { M.escrow = M1_BOUNTY; M.plan = {pF, pS, evF, evS, split}; market(); }, {cls: 'pri', dis: M.away.length === 1, sub: M.away.length === 1 ? t('m1.needTwo') : ''})}
        ${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}

function m1Go() {
  const M = S.M;
  // 分兵的人這趟不跟（不算受傷、也不分巨魔的賞金）
  S.members.forEach(m => { if (M.away.includes(m.nk)) { m.sitting = true; m.restNext = true; } });
  expedition({biome: 'road', monster: 'troll', days: M.rationDays, events: {
    2: X => card(t('m1.ev2.t'), t('m1.ev2.b'), [{label: t('btn.onward'), fn: X.resume}]),
  }, onArrive: X => card(t('m1.arrT'), t('m1.arrB'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m1Fight(X))}])});
}

function m1Fight(X) {
  const M = S.M;
  const r = mlResolve([
    {ok: mlFire(1), w: 0.25, okText: t('m1.f.fire'), badText: t('m1.f.noFire'), credit: ['mage']},
    {ok: mlFront(), w: 0.12, okText: t('m1.f.front'), badText: t('m1.f.noFront'), credit: ['tank', 'trainee']},
    {ok: !!M.svc.repair, w: 0.04, badText: t('m1.f.noRepair')},
    {ok: mlHealer(), w: 0.06, badText: t('m1.f.noHeal')},
    {ok: participants().length >= 5, w: Math.max(0, 5 - participants().length) * 0.05, badText: t('m1.f.few')},
  ], 0.92, 1);
  const L = r.L, loot = [];
  // 分兵：護送費 75% 進兩人的錢包，25% 歸小隊
  if (M.away.length === 2) {
    const each = Math.round(M1_ESCORT * (1 - M1_CUT) / 2);
    M.away.forEach(nk => { const m = S.members.find(x => x.nk === nk); if (m) { m.purse = (m.purse || 0) + each; m.xp = (m.xp || 0) + 6; } });
    loot.push([t('m1.cut'), Math.round(M1_ESCORT * M1_CUT)]);
    L.push(t('m1.escortDone', {n: each}));
  }
  const P = M.plan, lessonP = {chosen: t(P.split ? 'm1.chSplit' : 'm1.chFull'), full: fmt(P.evF), split: fmt(P.evS), pf: pct(P.pF), ps: pct(P.pS), b: M1_BOUNTY, e: M1_ESCORT};
  if (r.win) {
    L.push(['g', t('m1.f.win')]);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      S.day += 1; S.progress = 1;
      settle({titleKey: 'm1.s.title', bounty: M1_BOUNTY, loot, introKey: 'm1.s.intro', lesson: 'opp', lessonP});
    }}]);
  } else {
    L.push(['b', t('m1.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.day += 1; S.rep -= 5; S.progress = 1;
      settle({titleKey: 'm1.s.fail', bounty: 0, resultKey: 'res.fail', loot, introKey: 'm1.s.failIntro', lesson: 'opp', lessonP});
    }}]);
  }
}
