/* 任務共用：建立任務、出發前採購、出發 */
function newMission(o) {
  S.M = Object.assign({spent: 0, svc: {}, bought: {}, stock: {}, advance: 0, escrow: 0, danger: false, rationRate: 5}, o);
}
function departFees() {
  const M = S.M, f = [[t('fee.ration'), M.rationDays * M.rationRate, t('fee.days', {n: M.rationDays})]];
  S.members.filter(m => m.hp === 2).forEach(m => f.push([t('fee.maint', {name: nm(m)}), 20, t('fee.maintSub')]));
  if (M.danger) {
    const h = mem('heal'), g = mem('mage'), k = mem('tracker');
    if (S.flags.healFee && h && h.hp < 2) f.push([t('fee.heal'), S.flags.healFee, t('fee.danger')]);
    if (S.flags.mageFee && g && g.hp < 2) f.push([t('fee.mage'), S.flags.mageFee, t('fee.danger')]);
    if (k && k.hp < 2) f.push([t('fee.tracker'), 60, '']);
  }
  if (M.capture) f.push([t('fee.cage'), 300, t('fee.cageSub')]);
  return f;
}
function market() {
  const M = S.M;
  const row = k => {
    const it = ITEMS[k], name = t(`item.${k}.name`), desc = t(`item.${k}.desc`);
    if (it.svc) {
      const on = !!M.svc[k];
      return `<div class="item ${on ? 'on' : ''}"><span class="nm">${name}</span><span class="ds">${desc}</span><div class="ctl"><span class="pr">${silver(it.price)}</span>${B(on ? t('mk.drop') : t('mk.hire'), () => {
        if (on) { S.chest += it.price; M.spent -= it.price; M.svc[k] = false; }
        else { if (S.chest < it.price) return toast(t('toast.noMoney')); spend(it.price); M.svc[k] = true; }
        market();
      }, {cls: 'sq'})}</div></div>`;
    }
    const b = M.bought[k] || 0, lim = M.stock[k] ?? 99, left = lim - b;
    return `<div class="item ${S.inv[k] ? 'on' : ''}"><span class="nm">${name}${M.stock[k] != null ? ` <span class="muted" style="font-size:12px">${t('mk.left', {n: left})}</span>` : ''}</span><span class="ds">${desc}</span><div class="ctl"><span class="pr">${silver(it.price)}</span>${B('−', () => {
      S.chest += it.price; M.spent -= it.price; S.inv[k]--; M.bought[k]--; market();
    }, {cls: 'sq', dis: !b})}<span class="qty">${S.inv[k]}</span>${B('＋', () => {
      if (S.chest < it.price) return toast(t('toast.noMoney'));
      spend(it.price); S.inv[k]++; M.bought[k] = b + 1; market();
    }, {cls: 'sq', dis: left <= 0})}</div></div>`;
  };
  screen(() => {
    const fees = departFees(), ft = fees.reduce((a, f) => a + f[1], 0);
    const hints = M.hints();
    return `
    <div><h2>${t('mk.title')}</h2><p class="lede">${t('mk.lede', {name: t(M.nameKey)})}</p></div>
    <div class="split">
      <div class="shop">${M.market.map(row).join('')}</div>
      <div style="display:grid;gap:14px">
        <div class="panel"><h4>${t('mk.check')}</h4><ul class="checks">${hints.map(h => `<li class="${h[0] ? 'ok' : ''}">${t(h[1])}</li>`).join('')}</ul></div>
        <div class="panel"><h4>${t('mk.pay')}</h4><div class="fees num">${fees.map(f => `<div><span>${f[0]} <span class="muted">${f[2] || ''}</span></span><span>${silver(f[1])}</span></div>`).join('')}
          <div class="tot"><span>${t('mk.spent')}</span><span>${silver(M.spent)}</span></div>
          <div><span>${t('mk.after')}</span><span style="color:${S.chest - ft < 0 ? 'var(--bad)' : 'var(--brass)'}">${silver(S.chest - ft)}</span></div></div>
          ${B(t('mk.go'), depart, {cls: 'pri', dis: S.chest < ft, sub: S.chest < ft ? t('mk.goSubNo') : t('mk.goSub')})}
          ${M.back ? B(t('mk.back'), M.back) : ''}
        </div>
      </div>
    </div>`;
  });
}
function depart() {
  const M = S.M, fees = departFees(), ft = fees.reduce((a, f) => a + f[1], 0);
  if (S.chest < ft) return toast(t('toast.noMoney'));
  spend(ft);
  S.members.forEach(m => { if (m.hp === 1) m.hp = 0; m.sitting = m.hp === 2; });
  M.go();
}
