/* 主線委託一：河谷磨坊的沼澤食屍鬼（教：托管、前期支出、報銷規矩） */
registerContract({
  id: 'c1', progress: 0,
  notice: () => notice({title: t('c1.n.title'), meta: [t('c1.n.client'), t('c1.n.days')], bounty: t('c1.n.bounty'), body: t('c1.n.body'), btn: B(t('btn.view'), c1Intel)}),
});

function c1Intel() {
  if (!S.M || S.M.id !== 'c1') newMission({
    id: 'c1', nameKey: 'c1.name', bounty: 900, rationDays: 8, market: ['repair', 'horses', 'guide', 'antidote', 'crystal', 'healmat'], stock: {antidote: 4},
    hints: () => {
      const M = S.M, h = [[M.svc.guide, 'c1.h.guide'], [M.svc.horses, 'c1.h.horses'], [S.inv.antidote >= 2, 'c1.h.antidote'], [M.svc.repair, 'c1.h.repair'], [has('heal') || has('appr'), 'c1.h.healer']];
      if (M.scouted) h.push([S.inv.crystal >= 1, 'c1.h.crystal']);
      return h;
    },
    go: c1Go, back: c1Intel,
  });
  const M = S.M;
  screen(() => `<div><h2>${t('c1.name')}</h2><p class="lede">${t('c1.lede')}</p></div>
   <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
     <li>${t('c1.i1')}</li><li>${t('c1.i2')}</li><li>${t('c1.i3')}</li><li>${t('c1.i4')}</li>
     ${M.scouted ? `<li class="new">${t('c1.iScout')}</li>` : ''}</ul></div>
   <div class="panel"><h4>${t('contract')}</h4><p>${t('c1.terms')}</p>
     <div class="choices">${M.scouted ? '' : B(t('btn.scout'), () => { if (S.chest < 15) return toast(t('toast.noMoney')); spend(15); M.scouted = true; c1Intel(); }, {sub: t('btn.scoutSub')})}
     ${B(t('c1.accept'), () => { M.escrow = 900; market(); }, {cls: 'pri', sub: t('c1.acceptSub')})}${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}

function c1Go() {
  const M = S.M;
  const onward = X => ({label: t('btn.onward'), fn: X.resume});
  expedition({
    biome: 'swamp', monster: 'ghoul', days: M.svc.horses ? 8 : 10,
    events: {
      2: X => {
        if (M.svc.guide) { card(t('c1.flood.title'), t('c1.flood.guide'), [onward(X)]); return; }
        card(t('c1.flood.title'), t('c1.flood.body'), [
          {label: t('c1.flood.wade'), sub: t('c1.flood.wadeSub'), fn: () => {
            const m = rnd() < 0.6 ? injure(1, ['scout', 'tank', 'cap']) : null;
            card(t('c1.flood.wadeT'), res([m ? ['w', t('c1.flood.hurt', {name: nm(m)})] : ['g', t('c1.flood.ok')]]), [onward(X)]);
          }},
          {label: t('c1.flood.detour'), sub: t('c1.flood.detourSub'), fn: () => {
            spend(10); X.days += 2;
            card(t('c1.flood.detour'), res([t('c1.flood.detourRes')]), [onward(X)]);
          }},
        ]);
      },
      5: X => card(t('c1.wine.title'), t('c1.wine.body'), [
        {label: t('c1.wine.a'), sub: t('c1.wine.aSub'), fn: () => { addLoy(mem('tank'), -5); card(t('c1.wine.aT'), res([t('c1.wine.aRes')]), [onward(X)]); }},
        {label: t('c1.wine.b'), sub: t('c1.wine.bSub'), fn: () => {
          S.yours -= 10; S.members.forEach(m => { if (m.key !== 'cap') addLoy(m, 3); });
          card(t('c1.wine.bT'), res([t('c1.wine.bRes')]), [onward(X)]);
        }},
        {label: t('c1.wine.c'), sub: t('c1.wine.cSub'), fn: () => {
          spend(10); S.members.forEach(m => { if (!['cap', 'tank'].includes(m.key)) addLoy(m, -3); });
          card(t('c1.wine.cT'), res([['w', t('c1.wine.cRes')]]), [onward(X)]);
        }},
      ]),
    },
    onArrive: X => card(t('c1.arrive.title'), t('c1.arrive.body'), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => c1Fight(X))}]),
  });
}

function c1Fight(X) {
  const M = S.M, L = []; let inf = 2;
  if (M.scouted && has('mage') && S.inv.crystal > 0) { S.inv.crystal--; inf = 1; L.push(['g', t('c1.f.spores')]); }
  else if (has('mage') && S.inv.crystal > 0) { S.inv.crystal--; L.push(t('c1.f.seal')); }
  let used = 0;
  for (let i = 0; i < inf; i++) {
    const v = pick(participants().filter(m => m.hp < 2)); if (!v) break;
    const name = nm(v);
    if (S.inv.antidote > 0) { S.inv.antidote--; used++; L.push(t('c1.f.antidote', {name})); }
    else if (has('heal') && S.inv.healmat > 0) { S.inv.healmat--; v.hp = Math.max(v.hp, 1); L.push(['w', t('c1.f.healmat', {name})]); }
    else if (has('heal') || has('appr')) { v.hp = 2; L.push(['b', t('c1.f.necro', {name})]); }
    else { v.hp = 2; L.push(['b', t('c1.f.rot', {name})]); }
  }
  if (!M.svc.repair && rnd() < 0.7) { const m = injure(1, ['tank', 'cap']); if (m) L.push(['w', t('c1.f.armor', {name: nm(m)})]); }
  L.push(['g', t('c1.f.win')]);
  if (S.inv.antidote > 0) L.push(t('c1.f.left', {u: used, n: S.inv.antidote}));
  card(t('fight.over'), res(L) + t('c1.f.after'), [{label: t('btn.verify'), cls: 'pri', fn: () => {
    S.day += 2; S.progress = 1;
    settle({titleKey: 'c1.s.title', bounty: 900, introKey: 'c1.s.intro', noteKey: 'c1.s.note'});
  }}]);
}
