/* 可重複的小委託。數值寫在資料裡；resolve 決定抵達後發生什麼，回傳結果行。
   文字鍵：job.<id>.name / client / days / bounty / body / h / r1… */
JOBS.grave = {
  bounty: 240, days: 3, biome: 'grave', monster: 'goose',
  market: ['crystal', 'healmat', 'antidote'],
  hints: () => [[S.inv.crystal >= 1 && has('mage'), 'job.grave.h']],
  resolve: () => {
    if (has('mage') && S.inv.crystal > 0) { S.inv.crystal--; return [['g', t('job.grave.r1')]]; }
    if (rnd() < 0.5) return [['w', t('job.grave.r2', {name: nm(injure(1))})]];
    return [['g', t('job.grave.r3')]];
  },
};
JOBS.escort = {
  bounty: 200, days: 2, biome: 'road', monster: null,
  market: ['crystal', 'healmat', 'antidote'],
  hints: () => [[has('tank'), 'job.escort.h']],
  resolve: () => {
    if (rnd() < 0.4) {
      if (has('tank')) return [['g', t('job.escort.r1')]];
      return [['w', t('job.escort.r2', {name: nm(injure(1))})]];
    }
    return [['g', t('job.escort.r3')]];
  },
};

function jobNotice(id) {
  return notice({
    small: true, title: t(`job.${id}.name`), meta: [t(`job.${id}.client`), t(`job.${id}.days`)],
    bounty: t(`job.${id}.bounty`), body: t(`job.${id}.body`), btn: B(t('btn.take'), () => jobStart(id)),
  });
}
function jobStart(id) {
  const J = JOBS[id];
  newMission({
    id: 'job', nameKey: `job.${id}.name`, bounty: J.bounty, escrow: J.bounty, rationDays: J.days, market: J.market,
    hints: J.hints, back: () => { S.M = null; goHall(); },
    go: () => expedition({
      biome: J.biome, monster: J.monster, days: J.days, events: {},
      onArrive: X => {
        const L = J.resolve();
        battle(X, () => card(t('job.done'), res(L), [{label: t('btn.settleBack'), cls: 'pri', fn: () =>
          settle({title: t('job.s.title', {name: t(S.M.nameKey)}), bounty: S.M.bounty, noteKey: 'job.s.note'})}]));
      },
    }),
  });
  market();
}
