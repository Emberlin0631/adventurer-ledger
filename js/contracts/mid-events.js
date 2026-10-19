/* 季中事件：治療者被挖角、火術師要求同等待遇、招募 */
function queueMidEvents() {
  if (S.flags.mid) return; S.flags.mid = 1;
  S.pending.push('healer', 'recruit');
}
function addMember(key) { S.members.push(makeMember(key)); }
function msgScreen(titleKey, bodyKey) {
  screen(() => `<h2>${t(titleKey)}</h2><p class="lede">${t(bodyKey)}</p><div class="row">${B(t('btn.backHall'), goHall, {cls: 'pri'})}</div>`);
}

registerEvent('healer', () => {
  const h = mem('heal'); if (!h) { goHall(); return; }
  const replace = () => { S.members = S.members.filter(m => m !== h); addMember('appr'); };
  screen(() => `<h2>${t('ev.heal.title')}</h2><p class="lede">${t('ev.heal.lede')}</p>
   <p class="quote">${t('ev.heal.quote')}</p>
   <div class="choices">
    ${B(t('ev.heal.a'), () => { h.share = 1.75; h.loy = 88; S.flags.healFee = 40; EVENTS.mage(); }, {cls: 'pri', sub: t('ev.heal.aSub')})}
    ${B(t('ev.heal.b'), () => { replace(); goHall(); }, {sub: t('ev.heal.bSub')})}
    ${B(t('ev.heal.c'), () => {
      if (rnd() < 0.3) { addLoy(h, -15); msgScreen('ev.heal.stayT', 'ev.heal.stayB'); }
      else { replace(); msgScreen('ev.heal.goneT', 'ev.heal.goneB'); }
    }, {sub: t('ev.heal.cSub')})}
   </div>`);
});

registerEvent('mage', () => {
  const m = mem('mage'); if (!m) { goHall(); return; }
  screen(() => `<h2>${t('ev.mage.title')}</h2><p class="lede">${t('ev.mage.lede')}</p>
   <div class="choices">${B(t('ev.mage.a'), () => { addLoy(m, -8); goHall(); }, {cls: 'pri', sub: t('ev.mage.aSub')})}
   ${B(t('ev.mage.b'), () => { S.flags.mageFee = 40; addLoy(m, 10); goHall(); }, {sub: t('ev.mage.bSub')})}</div>`);
});

registerEvent('recruit', () => {
  screen(() => `<h2>${t('ev.rec.title')}</h2><p class="lede">${t('ev.rec.lede')}</p>
   <div class="split"><div class="panel"><h4>${t('ev.rec.tT')}</h4><p>${t('ev.rec.tB')}</p>
     ${B(t('ev.rec.tBtn'), () => { if (S.chest < 50) return toast(t('ev.rec.tToast')); S.chest -= 50; addMember('trainee'); goHall(); }, {cls: 'pri', sub: t('ev.rec.tSub')})}</div>
   <div class="panel"><h4>${t('ev.rec.kT')}</h4><p>${t('ev.rec.kB')}</p>
     ${B(t('ev.rec.kBtn'), () => { addMember('tracker'); goHall(); }, {sub: t('ev.rec.kSub')})}</div></div>
   <div class="row">${B(t('ev.rec.none'), goHall)}</div>`);
});
