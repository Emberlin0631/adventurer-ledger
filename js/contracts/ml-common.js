/* 主線委託共用工具
   主線一年六張，每張教一個經濟學概念；結算時在帳本旁附上「筆記」，用這一局的實際數字說明。
   每張委託以 registerContract({id, progress, minDay, notice}) 註冊；progress 依序 0–5，minDay 是最早出現的日子。 */
const ML_TOTAL = 6;
const clampP = p => Math.max(0.1, Math.min(0.97, p));
const pct = p => Math.round(p * 100);

function mlNotice(id, fn) {
  return notice({title: t(id + '.n.title'), meta: [t(id + '.n.client'), t(id + '.n.days')], bounty: t(id + '.n.bounty'), body: t(id + '.n.body'), btn: B(t('btn.view'), fn)});
}
/* 判定：checks = [{ok, w, okText, badText, credit}]；沒做到的項目扣成功率，並可能有人受傷 */
function mlResolve(checks, base, D) {
  const L = []; let p = base;
  checks.forEach(c => {
    if (c.ok) { if (c.okText) L.push(['g', c.okText]); if (c.credit) creditRole(c.credit); }
    else {
      p -= c.w; if (c.badText) L.push(['w', c.badText]);
      if (c.w > 0 && rnd() < 0.55) {
        const lvl = rnd() < 0.1 * D ? 2 : 1, m = injure(lvl);
        if (m) L.push(['b', t(lvl === 2 ? 'rc.f.hurt2' : 'rc.f.hurt', {name: nm(m)})]);
      }
    }
  });
  p = clampP(p + growthBonus() + veteranBonus());
  return {win: rnd() < p, p, L};
}
/* 常用對策 */
const mlFire = n => {   // 火術：需要火術師，Lv3 少用一份魔晶粉
  if (!has('mage')) return false;
  const need = Math.max(0, n - (perk('mage') ? 1 : 0));
  if (S.inv.crystal < need) return false;
  S.inv.crystal -= need; return true;
};
const mlFront = () => has('tank') || has('trainee') || participants().some(m => m.key === 'cap' && tierOf(m) >= 1);
const mlHealer = () => has('heal') || has('appr');
const mlScout = () => has('scout') || has('tracker');

/* 大廳：主線進度與下一張預告 */
function mainlinePanel() {
  if (S.progress >= ML_TOTAL) return `<p class="muted">${t('ml.done')}</p>`;
  const next = Object.values(CONTRACTS).find(c => c.progress === S.progress);
  if (S.members.length < MAINLINE_MIN) return `<p class="muted">${t('ml.progress', {n: S.progress, total: ML_TOTAL})}・${t('ml.need', {n: MAINLINE_MIN})}</p>`;
  if (!next || S.day >= next.minDay) return `<p class="muted">${t('ml.progress', {n: S.progress, total: ML_TOTAL})}</p>`;
  const d = next.minDay - 1, y = Math.floor(d / YEAR_DAYS) + 1;
  return `<p class="muted">${t('ml.progress', {n: S.progress, total: ML_TOTAL})}・${t('ml.next', {y, s: t('season.' + (Math.floor(d / SEASON_DAYS) % 4)), d: next.minDay - S.day})}</p>`;
}
const mainlineAvailable = () => S.members.length < MAINLINE_MIN ? [] : Object.values(CONTRACTS).filter(c => c.progress === S.progress && S.day >= (c.minDay || 1));
