/* 主線委託三：王道收費塔的蠍獅（教：產權、完成條件、出資人、戰利品變現） */
registerContract({
  id: 'c3', progress: 2,
  notice: () => notice({title: t('c3.n.title'), meta: [t('c3.n.client'), t('c3.n.days')], bounty: t('c3.n.bounty'), body: t('c3.n.body'), btn: B(t('btn.view'), c3Intel)}),
});

function c3Intel() {
  if (!S.M || S.M.id !== 'c3') newMission({
    id: 'c3', D: 3, nameKey: 'c3.name', bounty: 3000, rationDays: 6, rationRate: 7, danger: true,
    market: ['processor', 'saltbox', 'porters', 'repair', 'antidote', 'crystal', 'healmat'], stock: {antidote: 3},
    prop: false, cond: false, capture: false, investor: false,
    hints: () => { const M = S.M; return [[M.svc.processor, 'c3.h1'], [M.svc.saltbox, 'c3.h2'], [M.svc.porters, 'c3.h3'], [S.inv.antidote >= 1, 'c3.h4'], [S.inv.crystal >= 2, 'c3.h5'], [has('heal') && S.inv.healmat >= 1, 'c3.h6']]; },
    go: c3Go, back: c3Intel, cancel: true, onCancel: () => { if (S.M.investor) S.chest -= 200; },
  });
  const M = S.M;
  if (mem('tracker')) M.rationDays = 4;
  const ck = (k, lk, sk) => B(`${M[k] ? '■' : '□'} ${t(lk)}`, () => {
    if (k === 'investor') {
      if (M.investor) { if (S.chest < 200) return toast(t('c3.noRefund')); S.chest -= 200; }
      else S.chest += 200;
    }
    M[k] = !M[k]; c3Intel();
  }, {sub: t(sk)});
  screen(() => `<div><h2>${t('c3.name')}</h2><p class="lede">${t('c3.lede')}</p></div>
   <div class="split"><div class="panel"><h4>${t('c3.lootT')}</h4><ul class="intel">
     <li>${t('c3.l1')}</li><li>${t('c3.l2')}</li><li>${t('c3.l3')}</li><li>${t('c3.l4')}</li></ul>
     <p class="muted">${t('c3.land')}</p></div>
   <div class="panel"><h4>${t('c3.terms')}</h4><div class="choices">
     ${ck('prop', 'c3.prop', 'c3.propSub')}
     ${ck('cond', 'c3.cond', 'c3.condSub')}
     ${ck('capture', 'c3.cap', 'c3.capSub')}
     ${ck('investor', 'c3.inv', 'c3.invSub')}
     ${B(t('c3.sign'), () => { M.escrow = 3000; market(); }, {cls: 'pri'})}
     ${B(t('btn.toBoard'), goHall, {dis: M.investor, sub: M.investor ? t('c3.lockBack') : ''})}</div></div></div>`);
}

function c3Go() {
  const M = S.M, extras = (M.svc.porters ? 2 : 0) + (M.svc.processor ? 1 : 0);
  const cont = X => ({label: t('btn.continue'), fn: X.resume});
  expedition({
    biome: 'road', monster: 'manticore', days: M.rationDays, extras,
    events: {
      2: X => {
        if (has('tracker')) { card(t('c3.track'), t('c3.trackK'), [cont(X)]); return; }
        if (has('trainee') && rnd() < 0.5) { spend(14); X.days += 2; card(t('c3.track'), res([['w', t('c3.trackT1')], t('c3.trackT2')]), [cont(X)]); return; }
        card(t('c3.track'), t('c3.trackS'), [cont(X)]);
      },
    },
    onArrive: X => card(t('c3.arrT'), t('c3.arrB'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => c3Fight(X))}]),
  });
}

function c3Fight(X) {
  const M = S.M, L = [];
  const v = pick(participants().filter(m => m.hp < 2)) || mem('cap');
  if (S.inv.antidote > 0) { S.inv.antidote--; L.push(t('c3.f.sting', {name: nm(v)})); }
  else { hurt(v, 2); L.push(['b', t('c3.f.stingBad', {name: nm(v)})]); }
  if (has('mage')) {
    if (S.inv.crystal >= 2) { S.inv.crystal -= 2; L.push(t('c3.f.crystal')); }
    else { S.inv.crystal = 0; L.push(['w', t('c3.f.crystalShort', {name: nm(injure(1))})]); }
    if (has('trainee')) L.push(['g', t('c3.f.guard')]);
    else {
      const mg = mem('mage');
      if (has('heal') && S.inv.healmat > 0) { S.inv.healmat--; mg.hp = Math.max(mg.hp, 1); L.push(['w', t('c3.f.burnOk')]); }
      else { hurt(mg, 2); L.push(['b', t('c3.f.burnBad')]); }
    }
  }
  if (!M.cond) {
    L.push(['w', t('c3.fled')]);
    card(t('c3.fledT'), res(L) + t('c3.fledQ'), [
      {label: t('c3.chase'), sub: t('c3.chaseSub'), cls: 'pri', fn: () => { spend(21); S.day += 3; c3Kill(X, L.concat([t('c3.chaseLine')])); }},
      {label: t('c3.report'), sub: t('c3.reportSub'), fn: () => {
        S.rep -= 10; S.progress = 3;
        settle({titleKey: 'c3.drv.title', bounty: 1800, resultKey: 'res.drive', ded: M.investor ? [[t('c3.d.invCap'), 200]] : [], introKey: 'c3.drv.intro', noteKey: 'c3.drv.note'});
      }},
    ]);
    return;
  }
  c3Kill(X, L);
}

function c3Kill(X, L) {
  const M = S.M;
  if (M.capture) {
    if (M.svc.porters && rnd() < 0.6) {
      L.push(['g', t('c3.capOk')]);
      card(t('c3.capOkT'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
        S.progress = 3;
        settle({titleKey: 'c3.s.title', bounty: 3800, ded: M.investor ? [[t('c3.d.invCap'), 200]] : [], introKey: 'c3.capIntro'});
      }}]);
      return;
    }
    L.push(['w', t('c3.capFail')]);
  }
  L.push(['g', t('c3.down')]);
  card(t('fight.over'), res(L) + t('c3.after'), [{label: t('btn.butcher'), cls: 'pri', fn: () => c3Loot(X)}]);
}

function c3Loot(X) {
  const M = S.M, loot = [], notes = [];
  if (!M.prop) {
    notes.push(['b', t('c3.lord')]);
    return card(t('c3.whoT'), res(notes), [{label: t('btn.verify'), cls: 'pri', fn: () => c3Settle([], [])}]);
  }
  if (M.svc.processor) { loot.push([t('c3.tail'), 520]); loot.push([t('c3.wing'), 450]); notes.push(t('c3.procLine')); }
  else { loot.push([t('c3.wingBad'), 120]); notes.push(['w', t('c3.tailRot')]); }
  const heart = next => {
    if (!M.svc.saltbox) { notes.push(['b', t('c3.noSalt')]); return next(); }
    card(t('c3.heartT'), res(notes) + t('c3.heartB'), [
      {label: t('c3.fast'), sub: t('c3.fastSub'), cls: 'pri', fn: () => { loot.push([t('c3.heartFast'), 1400]); M.heartTrans = 150; M.heartIdx = loot.length - 1; next(); }},
      {label: t('c3.slow'), sub: t('c3.slowSub'), fn: () => { loot.push([t('c3.heartSlow'), 350]); M.heartIdx = loot.length - 1; next(); }},
    ]);
  };
  const bones = () => {
    if (!M.svc.processor && !M.svc.porters) { notes.push(['w', t('c3.noBones')]); return c3Settle(loot, notes); }
    card(t('c3.bonesT'), t('c3.bonesB'), [
      {label: t('c3.sell'), sub: t('c3.sellSub'), cls: 'pri', fn: () => { loot.push([t('c3.bonesSold'), 220]); c3Settle(loot, notes); }},
      {label: t('c3.keep'), sub: t('c3.keepSub'), fn: () => { S.bones = 400; c3Settle(loot, notes); }},
    ]);
  };
  heart(bones);
}

function c3Settle(loot) {
  const M = S.M, ded = [];
  const sold = loot.reduce((a, l) => a + l[1], 0);
  if (M.heartTrans) ded.push([t('c3.d.trans'), M.heartTrans]);
  if (M.svc.processor && sold) ded.push([t('c3.d.proc'), Math.round(sold * 0.1)]);
  if (M.heartIdx != null && loot[M.heartIdx]) ded.push([t('c3.d.lord'), Math.round(loot[M.heartIdx][1] * 0.2)]);
  if (M.investor) {
    const net = sold - ded.reduce((a, d) => a + d[1], 0);
    ded.push([t('c3.d.invCap'), 200]);
    if (net > 0) ded.push([t('c3.d.invCut'), Math.round(net * 0.2)]);
  }
  S.progress = 3;
  settle({titleKey: 'c3.s.title', bounty: 3000, loot, ded, introKey: 'c3.s.intro', note: S.bones ? t('c3.s.noteBones') : ''});
}
