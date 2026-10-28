/* Lv3 專長三選一：每個職業在 Lv3 時從三種專長挑一種，之後可付學費改選。
   原本的單一專長是每個職業的第一個選項（perk() 仍指向它，舊的判斷不用改） */
const SPECS = {
  scout:   ['eye', 'trail', 'mark'],
  tank:    ['repair', 'guard', 'awe'],
  mage:    ['save', 'burst', 'craft'],
  heal:    ['aid', 'herb', 'field'],
  tracker: ['route', 'hunt', 'camp'],
};
const spec = id => participants().some(m => m.hp < 2 && lvOf(m) >= 3 && m.spec === id);
const perk = (key, minLv = 3) => key === 'cap'
  ? participants().some(m => m.key === 'cap' && m.hp < 2 && lvOf(m) >= minLv)
  : !!SPECS[key] && spec(SPECS[key][0]);
const specCost = () => Math.round(60 * inflation() / 10) * 10;

function queueSpec(m) {
  S.specQ = S.specQ || [];
  if (!S.specQ.includes(m.nk)) S.specQ.push(m.nk);
  if (!S.pending.includes('spec')) S.pending.push('spec');
}
/* 成員面板上的專長欄 */
function perkLine(m) {
  if (m.key === 'cap') return `<span class="${lvOf(m) >= 3 ? '' : 'muted'}">${t('perk.cap')}${lvOf(m) >= 3 ? '' : ` ${t('ms.perkLock')}`}</span>`;
  if (!SPECS[m.key]) return `<span class="muted">${t('perk.' + m.key)}</span>`;
  if (lvOf(m) < 3) return `<span class="muted">${t('spec.locked')}</span>`;
  return m.spec ? `${t('spec.' + m.spec + '.n')}：${t('spec.' + m.spec + '.d')}` : t('spec.pending');
}
registerEvent('spec', () => {
  S.specQ = (S.specQ || []).filter(nk => S.members.some(m => m.nk === nk && !m.spec));
  const nk = S.specQ[0], m = nk && S.members.find(x => x.nk === nk);
  if (!m) { goHall(); return; }
  const done = () => { S.specQ = S.specQ.filter(x => x !== nk); if (S.specQ.length) S.pending.unshift('spec'); goHall(); };
  screen(() => `<h2>${t('spec.title', {name: nm(m)})}</h2><p class="lede">${t('spec.lede', {name: nm(m), role: roleOf(m)})}</p>
    <div class="choices">${SPECS[m.key].map(id => B(t('spec.' + id + '.n'), () => { m.spec = id; addLoy(m, 3); done(); }, {sub: t('spec.' + id + '.d')})).join('')}</div>`);
});
/* 角色資訊頁的專長面板 */
function specPanel(m, again) {
  if (!SPECS[m.key] || lvOf(m) < 3) return '';
  const cost = specCost();
  return `<div class="panel"><h4>${t('spec.panel')}</h4><p class="muted">${t('spec.panelBody', {n: fmt(cost)})}</p>
    <div class="skills">${SPECS[m.key].map(id => `<div class="skill ${m.spec === id ? 'on' : ''}"><b>${t('spec.' + id + '.n')}</b><span class="muted">${t('spec.' + id + '.d')}</span>${m.spec === id ? `<span class="pill ok">${t('spec.current')}</span>` : B(m.spec ? t('spec.change', {n: fmt(cost)}) : t('spec.pick'), () => {
      if (m.spec) { if (S.chest < cost) return toast(t('toast.noMoney')); S.chest -= cost; }
      m.spec = id; S.specQ = (S.specQ || []).filter(x => x !== m.nk); again(m);
    }, {cls: 'sq', dis: !!m.spec && S.chest < cost})}</div>`).join('')}</div></div>`;
}
