/* 結算帳：工會費 → 預支 → 戰利品與扣項 → 返還支出 → 提撥儲備 → 依份額分紅
   o: {titleKey|title, bounty, loot:[[label, amt]], ded:[[label, amt]], introKey, noteKey|note, resultKey, after} */
function settle(o) {
  const M = S.M; screen('');
  const fee = Math.round((o.bounty || 0) * 0.05);
  const adv = M.advance || 0;
  const loot = (o.loot || []).reduce((a, l) => a + l[1], 0), ded = (o.ded || []).reduce((a, l) => a + l[1], 0);
  const pool = (o.bounty || 0) - adv - fee + loot - ded;
  const owed = Math.max(0, M.spent - adv);
  const reimb = Math.max(0, Math.min(owed, pool));
  const rest = pool - reimb;
  const ps = participants();
  const tot = ps.reduce((a, m) => a + m.share, 0);
  let rate = rest > 0 ? 0.15 : 0;
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
      <div class="slider"><label for="rate">${t('st.rate')} <b class="num">${Math.round(rate * 100)}%</b></label><input id="rate" type="range" min="0" max="40" step="5" value="${Math.round(rate * 100)}"></div>
      <div class="shares num"><span class="h">${t('st.hMember')}</span><span class="h">${t('st.hRole')}</span><span class="h">${t('st.hShare')}</span><span class="h">${t('st.hAmt')}</span>
        ${ps.map(m => `<span>${nm(m)}</span><span>${roleOf(m)}</span><span>${m.share}</span><span>${fmt(dist * m.share / tot)}</span>`).join('')}</div>`
      : `<div class="ln note" ${st()}><span>${loss > 0 ? t('st.loss', {n: fmt(loss)}) : t('st.even')}</span><span></span></div>`;
    $('#main').innerHTML = `<div><h2>${title}</h2>${intro ? `<p class="lede">${intro}</p>` : ''}</div>
      <div class="ledger"><h3>${t('st.ledger')}</h3>${lh}${tail}${note ? `<div class="ln note" ${st()}><span>${note}</span><span></span></div>` : ''}</div>
      <div class="row" id="sbtn"></div>`;
    clearReg();
    $('#sbtn').innerHTML = B(rest > 0 ? t('st.confirm') : t('st.close'), () => apply(reserve, dist), {cls: 'pri'});
    const r = $('#rate');
    if (r) r.addEventListener('input', () => { rate = r.value / 100; render(false); $('#rate').focus(); });
  }
  function apply(reserve, dist) {
    S.chest += reimb + reserve;
    const per = tot ? dist / tot : 0;
    ps.forEach(m => {
      const amt = tot ? dist * m.share / tot : 0; m.earned += amt;
      if (m.key === 'cap') S.yours += amt;
      else { addLoy(m, per >= 60 ? 5 : per >= 30 ? 2 : -6); if (m.hp === 2) addLoy(m, -4); }
    });
    S.members.forEach(m => { if (m.sitting) { m.sitting = false; m.hp = 1; } });
    S.records.push({nameKey: M.nameKey, resultKey: o.resultKey || 'res.ok', bounty: o.bounty || 0, spent: M.spent, dist, chest: S.chest});
    S.M = null;
    (o.after || goHall)();
  }
  render(true);
}
