/* 主線五：北溪谷的霜狼群 — 公共財與搭便車
   狼群一死，出錢和沒出錢的村莊一樣安全，所以有村莊選擇不出錢。
   你可以照現有承諾出發、等更多錢（狼繼續傷人）、請領主課稅（慢、要抽成），或只保護出錢的村莊（排除不付錢的人）。 */
const M5_NEED = 1000;
registerContract({id: 'm5', progress: 4, minDay: 91, notice: () => mlNotice('m5', m5Intel)});

function m5Intel() {
  if (!S.M || S.M.id !== 'm5') {
    const amts = [320, 280, 150, 0].sort(() => rnd() - 0.5);
    const places = [...Array(PLACE_COUNT).keys()].sort(() => rnd() - 0.5).slice(0, 4);
    newMission({
      id: 'm5', D: 3, nameKey: 'm5.name', bounty: 0, rationDays: 5, rationRate: 6,
      pledges: places.map((p, i) => ({p, amt: amts[i]})), waited: false, mode: null,
      market: ['horses', 'crystal', 'healmat', 'repair'], stock: {},
      hints: () => [[mlScout(), 'm5.h1'], [has('mage') && (S.inv.crystal >= 1 || perk('mage')), 'm5.h2'], [S.M.svc.horses, 'm5.h3'], [mlHealer(), 'm5.h4']],
      go: m5Go, back: m5Intel, cancel: true,
    });
  }
  const M = S.M, total = M.pledges.reduce((a, v) => a + v.amt, 0), free = M.pledges.filter(v => !v.amt).length;
  const start = (mode, bounty, extra) => () => { M.mode = mode; M.bounty = bounty; M.escrow = bounty; if (extra) extra(); market(); };
  screen(() => `<div><h2>${t('m5.name')}</h2><p class="lede">${t('m5.lede', {n: fmt(M5_NEED)})}</p></div>
    <div class="split"><div class="panel"><h4>${t('m5.pledgeT')}</h4>
      <div class="fees num">${M.pledges.map(v => `<div><span>${t('place.' + v.p)}</span><span>${v.amt ? silver(v.amt) : `<span class="muted">${t('m5.zero')}</span>`}</span></div>`).join('')}
      <div class="tot"><span>${t('m5.total')}</span><span>${silver(total)} / ${silver(M5_NEED)}</span></div></div>
      ${M.raidNote ? `<p class="muted">${M.raidNote}</p>` : ''}</div>
    <div class="panel"><h4>${t('m5.optT')}</h4><div class="choices">
      ${B(t('m5.a', {n: fmt(total)}), start('a', total), {cls: 'pri', sub: t('m5.aSub')})}
      ${M.waited ? '' : B(t('m5.b'), () => {
        M.waited = true; S.day += 10;
        M.pledges.forEach(v => { if (v.amt < 300 && rnd() < 0.5) v.amt += 100; });
        const hit = pick(M.pledges); S.rep -= 3;
        M.raidNote = t('m5.raid', {place: t('place.' + hit.p)});
        m5Intel();
      }, {sub: t('m5.bSub')})}
      ${B(t('m5.c', {n: fmt(M5_NEED * 0.9)}), start('c', M5_NEED * 0.9, () => { S.day += 15; S.rep += 5; }), {sub: t('m5.cSub')})}
      ${B(t('m5.d', {n: fmt(total)}), start('d', total), {sub: t('m5.dSub', {free})})}
      ${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}
function m5Go() {
  expedition({biome: 'snow', monster: 'frostwolf', days: S.M.rationDays, events: {},
    onArrive: X => card(t('m5.arrT'), t('m5.arrB'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => m5Fight(X))}])});
}
function m5Fight(X) {
  const M = S.M, free = M.pledges.filter(v => !v.amt).length, total = M.pledges.reduce((a, v) => a + v.amt, 0);
  const r = mlResolve([
    {ok: mlScout(), w: 0.12, okText: t('m5.f.scout'), badText: t('m5.f.noScout'), credit: ['scout', 'tracker']},
    {ok: mlFire(1), w: 0.12, okText: t('m5.f.fire'), badText: t('m5.f.noFire'), credit: ['mage']},
    {ok: !!M.svc.horses, w: 0.06, badText: t('m5.f.noHorse')},
    {ok: mlHealer(), w: 0.08, okText: t('m5.f.cold'), badText: t('m5.f.noCold'), credit: ['heal', 'appr']},
  ], 0.92 + (M.mode === 'd' ? 0.08 : 0), 3);
  const L = r.L;
  const lessonP = {free, total: fmt(total), mode: t('m5.l.' + M.mode)};
  const finish = win => {
    S.day += 1; S.progress = 5;
    if (M.mode === 'd' && win) { S.rep -= 10; }
    settle({titleKey: win ? 'm5.s.title' : 'm5.s.fail', bounty: win ? M.bounty : 0, resultKey: win ? undefined : 'res.fail',
      introKey: win ? (M.mode === 'd' ? 'm5.s.introD' : 'm5.s.intro') : 'm5.s.failIntro', lesson: 'pub', lessonP});
  };
  if (r.win) { L.push(['g', t('m5.f.win')]); if (M.mode === 'd') L.push(['w', t('m5.f.moved')]); card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => finish(true)}]); }
  else { L.push(['b', t('m5.f.lose')]); card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => { S.rep -= 5; finish(false); }}]); }
}
