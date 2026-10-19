/* 結算帳：工會費 → 預支 → 戰利品與扣項 → 返還支出 → 提撥儲備 → 依份額分紅
   o: {titleKey|title, bounty, loot:[[label, amt]], ded:[[label, amt]], introKey, noteKey|note, resultKey, after} */
/* 重傷致死判定：治療者帶高階材料能在 12 小時內處理，大幅降低機率 */
function deathChecks(M) {
  const out = [], dead = [], cfg = DIFFS[S.diff || 'std'];
  [...new Set(M.serious || [])].forEach(m => {
    if (m.key === 'cap' && !cfg.capDies) return;
    let p = cfg.death + 0.02 * ((M.D || 1) - 1), saved = false;
    if (has('heal') && m.key !== 'heal' && S.inv.healmat > 0) { S.inv.healmat--; p *= 0.4; saved = true; }
    else if (has('appr') && m.key !== 'appr') p *= 0.8;
    if (rnd() < p) { m.dead = true; dead.push(m); out.push(['b', t('dth.line', {name: nm(m)})]); }
    else if (saved) out.push(['g', t('dth.saved', {name: nm(m), healer: nm(mem('heal'))})]);
  });
  return {out, dead};
}
function settle(o) {
  const M = S.M; screen('');
  const deaths = deathChecks(M);
  const fee = Math.round((o.bounty || 0) * 0.05);
  const adv = M.advance || 0;
  const loot = (o.loot || []).reduce((a, l) => a + l[1], 0), ded = (o.ded || []).reduce((a, l) => a + l[1], 0);
  const pool = (o.bounty || 0) - adv - fee + loot - ded;
  const owed = Math.max(0, M.spent - adv);
  const reimb = Math.max(0, Math.min(owed, pool));
  const rest = pool - reimb;
  const ps = participants();
  const tot = ps.reduce((a, m) => a + m.share, 0);
  let rate = rest > 0 ? 0.2 : 0;
  const days = Math.max(1, S.day - (M.startDay || S.day));
  const title = o.title || t(o.titleKey), intro = o.introKey ? t(o.introKey) : '', note = o.note || (o.noteKey ? t(o.noteKey) : '');

  function lines() {
    const L = [];
    if (o.bounty) L.push(['pos', t('st.bounty'), '+' + fmt(o.bounty)]); else L.push(['', t('st.noBounty'), '0']);
    if (adv) L.push(['neg', t('st.adv'), '−' + fmt(adv)]);
    if (fee) L.push(['neg', t('st.fee'), '−' + fmt(fee)]);
    (o.loot || []).forEach(l => L.push(['pos', l[0], '+' + fmt(l[1])]));
    (o.ded || []).forEach(l => L.push(['neg', l[0], '−' + fmt(l[1])]));
    L.push(['sum', t('st.pool'), fmt(pool)]);
    L.push(['neg', t('st.reimb') + (reimb < owed ? t('st.reimbPart', {a: fmt(reimb), b: fmt(owed)}) : ''), '−' + fmt(reimb)]);
    return L;
  }
  function render(animate) {
    const reserve = Math.max(0, Math.round(rest * rate)), dist = Math.max(0, rest - reserve);
    let d = 0;
    const st = () => animate ? `style="animation-delay:${(d++) * 0.12}s"` : 'style="animation:none;opacity:1;transform:none"';
    const lh = lines().map(l => `<div class="ln ${l[0]}" ${st()}><span>${l[1]}</span><span>${l[2]}</span></div>`).join('');
    const loss = owed - reimb;
    const tail = rest > 0 ? `
      <div class="ln neg" ${st()}><span>${t('st.reserve')}</span><span>−${fmt(reserve)}</span></div>
      <div class="ln sum" ${st()}><span>${t('st.dist')}</span><span>${fmt(dist)}</span></div>
      ${S.chest + reimb + reserve < seasonDues() + 150 ? `<div class="ln note" ${st()}><span>${t('st.lowChest', {n: fmt(S.chest + reimb + reserve)})}</span><span></span></div>` : ''}
      <div class="slider"><label for="rate">${t('st.rate')} <b class="num">${Math.round(rate * 100)}%</b></label><input id="rate" type="range" min="0" max="40" step="5" value="${Math.round(rate * 100)}"></div>
      <div class="shares num"><span class="h">${t('st.hMember')}</span><span class="h">${t('st.hRole')}</span><span class="h">${t('st.hShare')}</span><span class="h">${t('st.hAmt')}</span>
        ${ps.map(m => { const amt = dist * m.share / tot, d = Math.min(m.debt || 0, amt);
          return `<span>${nm(m)}${m.dead ? ` <span class="muted">${t('dth.heir')}</span>` : ''}</span><span>${roleOf(m)}</span><span>${m.share}</span><span>${fmt(amt)}${d ? ` <span class="muted">${t('st.debt', {n: fmt(d)})}</span>` : ''}</span>`; }).join('')}</div>`
      : `${pool < 0 ? `<div class="ln neg" ${st()}><span>${t('st.repay')}</span><span>−${fmt(-pool)}</span></div>` : ''}<div class="ln note" ${st()}><span>${loss > 0 ? t('st.loss', {n: fmt(loss)}) : t('st.even')}</span><span></span></div>`;
    $('#main').innerHTML = `<div><h2>${title}</h2>${intro ? `<p class="lede">${intro}</p>` : ''}</div>
      ${deaths.out.length ? `<div class="card" style="border-left-color:${deaths.dead.length ? 'var(--wax)' : 'var(--good)'}"><h4>${t(deaths.dead.length ? 'dth.title' : 'dth.titleSaved')}</h4>${res(deaths.out)}</div>` : ''}
      <div class="ledger"><h3>${t('st.ledger')}</h3>${lh}${tail}${note ? `<div class="ln note" ${st()}><span>${note}</span><span></span></div>` : ''}</div>
      <div class="row" id="sbtn"></div>`;
    clearReg();
    $('#sbtn').innerHTML = B(rest > 0 ? t('st.confirm') : t('st.close'), () => apply(reserve, dist), {cls: 'pri'});
    const r = $('#rate');
    if (r) r.addEventListener('input', () => { rate = r.value / 100; render(false); $('#rate').focus(); });
  }
  function apply(reserve, dist) {
    S.chest += reimb + reserve;
    if (pool < 0) S.chest += pool;   // 沒拿到賞金卻已預支：從錢箱償還
    const perDay = tot ? dist / tot / days : 0;   // 每份額每天拿到多少
    ps.forEach(m => {
      const amt = tot ? dist * m.share / tot : 0; m.earned += amt; m.earnedY = (m.earnedY || 0) + amt;
      if (m.debt) { const d = Math.min(m.debt, Math.floor(amt)); m.debt -= d; S.chest += d; }   // 先前預支，從分紅扣回錢箱
      if (m.key === 'cap') { S.yours += amt; S.yoursY += amt; }
      else { addLoyT(m, perDay >= 8 ? 4 : perDay >= 4 ? 2 : perDay >= 2 ? 0 : -4); if (m.hp === 2) addLoyT(m, -4); }
    });
    S.members.forEach(m => { if (m.sitting) { m.sitting = false; if (m.restNext) m.restNext = false; else m.hp = 1; } });
    if (deaths.dead.length) {
      deaths.dead.forEach(m => S.fallen.push({nk: m.nk, key: m.key, y: S.year, day: S.day, earned: Math.round(m.earned)}));
      S.members = S.members.filter(m => !m.dead);
      if (deaths.dead.some(m => m.key === 'cap')) { S.records.push({y: S.year, place: M.place, nameKey: M.nameKey, resultKey: o.resultKey || 'res.ok', bounty: o.bounty || 0, spent: M.spent, dist, chest: S.chest}); S.M = null; captainDied(); return; }
      S.deadPending = deaths.dead.map(m => ({nk: m.nk, key: m.key, share: m.share}));
      S.pending.unshift('funeral');
    }
    S.records.push({y: S.year, place: M.place, nameKey: M.nameKey, resultKey: o.resultKey || 'res.ok', bounty: o.bounty || 0, spent: M.spent, dist, chest: S.chest});
    S.M = null;
    maybeQueueRequest();
    (o.after || goHall)();
  }
  render(true);
}
