/* 遠征畫面：橫向捲動的場景、隊伍、怪物進場與戰鬥閃光 */
const BIOME = {
  swamp:  {sky: ['#3b4a4a', '#6d7a66'], hill: '#2f3a2e', ground: '#3e4a2c', ground2: '#2c3620'},
  cellar: {sky: ['#1b1714', '#2c2420'], hill: '#3a302a', ground: '#463a30', ground2: '#2f2620'},
  road:   {sky: ['#4b5f78', '#c59a6a'], hill: '#4a4f3a', ground: '#7a6a48', ground2: '#5b4e34'},
  grave:  {sky: ['#20263a', '#4e4d62'], hill: '#2a2d36', ground: '#3a3d35', ground2: '#2a2c26'},
};
function expedition(o) {
  screen(`<div class="exp"><canvas id="cv"></canvas><div class="exp-day" id="expday">${t('exp.depart')}</div></div><div id="evbox" class="evbox"><div class="card"><h4>${t(S.M.nameKey)}</h4><p class="muted">${t('exp.leave')}</p></div></div>`);
  const cv = $('#cv'), g = cv.getContext('2d');
  const X = {days: o.days, day: 0, paused: false, walking: true, off: 0, monster: 0, flash: 0, stop: false, extras: o.extras || 0, o};
  EXP = X;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function size() { cv.width = cv.clientWidth * dpr; cv.height = 210 * dpr; }
  size(); window.addEventListener('resize', size);
  const DAYMS = RM ? 350 : 750; let acc = 0, last = performance.now();
  X.resume = () => { X.paused = false; if (X.day >= X.days) X.walking = false; };
  function tick(now) {
    if (X.stop) { window.removeEventListener('resize', size); return; }
    const dt = Math.min(60, now - last); last = now;
    if (X.walking && !X.paused) {
      X.off += dt * 0.06; acc += dt;
      if (acc > DAYMS) {
        acc = 0; X.day++; S.day++; renderHUD(); $('#expday').textContent = t('exp.day', {n: X.day});
        const ev = o.events && o.events[X.day];
        if (ev) { X.paused = true; ev(X); }
        else if (X.day >= X.days) X.walking = false;
      }
    }
    if (!X.walking && o.monster && X.monster < 1) {
      X.monster = Math.min(1, X.monster + dt / 700);
      if (X.monster >= 1 && !X.arrived) { X.arrived = true; o.onArrive(X); }
    } else if (!X.walking && !o.monster && !X.arrived) { X.arrived = true; o.onArrive(X); }
    draw(g, cv, X, o, now, dpr);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return X;
}
function battle(X, then) { X.flash = performance.now(); setTimeout(then, RM ? 200 : 1300); }

function draw(g, cv, X, o, now, dpr) {
  const W = cv.width / dpr, H = 210, b = BIOME[o.biome];
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let shake = 0; const fl = now - X.flash;
  if (X.flash && fl < 1200 && !RM) shake = Math.sin(fl / 30) * 3 * (1 - fl / 1200);
  g.save(); g.translate(shake, 0);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, b.sky[0]); sky.addColorStop(1, b.sky[1]);
  g.fillStyle = sky; g.fillRect(-5, 0, W + 10, H);
  g.fillStyle = b.hill; g.beginPath(); g.moveTo(-5, H);
  for (let x = -5; x <= W + 5; x += 8) { const y = 110 + Math.sin((x + X.off * 0.25) / 70) * 14 + Math.sin((x + X.off * 0.25) / 23) * 5; g.lineTo(x, y); }
  g.lineTo(W + 5, H); g.fill();
  if (o.biome === 'cellar') {
    g.fillStyle = '#2a221d';
    for (let i = -1; i < W / 120 + 2; i++) { const x = i * 120 - (X.off * 0.5 % 120); g.fillRect(x, 40, 18, 110); g.beginPath(); g.arc(x + 69, 90, 51, Math.PI, 0); g.lineWidth = 10; g.strokeStyle = '#2a221d'; g.stroke(); }
    g.fillStyle = '#5a3f26';
    for (let i = -1; i < W / 90 + 2; i++) { const x = i * 90 - (X.off % 90) + 30; g.beginPath(); g.ellipse(x, 146, 14, 18, 0, 0, 7); g.fill(); g.strokeStyle = '#2b1d12'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 14, 140); g.lineTo(x + 14, 140); g.stroke(); }
  }
  if (o.biome === 'road' && X.days - X.day <= 1) {
    g.fillStyle = '#3a3530'; const tx = W * 0.82; g.fillRect(tx, 48, 34, 110); g.fillRect(tx - 6, 40, 46, 12);
    for (let i = 0; i < 4; i++) g.fillRect(tx - 6 + i * 13, 32, 8, 10);
  }
  if (o.biome === 'grave') {
    g.fillStyle = '#5b5e66';
    for (let i = -1; i < W / 70 + 2; i++) { const x = i * 70 - (X.off * 0.8 % 70) + 10; g.beginPath(); g.moveTo(x, 160); g.lineTo(x, 138); g.arc(x + 9, 138, 9, Math.PI, 0); g.lineTo(x + 18, 160); g.fill(); }
  }
  g.fillStyle = b.ground; g.fillRect(-5, 158, W + 10, H - 158);
  g.fillStyle = b.ground2; for (let i = -1; i < W / 40 + 2; i++) { const x = i * 40 - (X.off % 40); g.fillRect(x, 170 + (i % 3) * 9, 18, 3); }
  if (o.biome === 'swamp') {
    g.strokeStyle = '#5d6b3a'; g.lineWidth = 1.5;
    for (let i = -1; i < W / 26 + 2; i++) { const x = i * 26 - (X.off * 1.2 % 26); g.beginPath(); g.moveTo(x, 162); g.quadraticCurveTo(x + 3, 140, x + (i % 2 ? 6 : -2), 128 + (i % 4) * 4); g.stroke(); }
    g.fillStyle = 'rgba(120,150,150,.25)';
    for (let i = -1; i < W / 150 + 2; i++) { const x = i * 150 - (X.off % 150); g.beginPath(); g.ellipse(x + 60, 185, 40, 5, 0, 0, 7); g.fill(); }
  }
  const base = W * 0.34, walk = X.walking && !X.paused;
  const all = participants().map(m => ({c: m.color, hurt: m.hp})).concat(Array.from({length: X.extras}, () => ({c: '#77736a', hurt: 0, extra: 1})));
  all.forEach((m, i) => {
    const x = base - i * 17, bob = walk && !RM ? Math.abs(Math.sin(now / 140 + i)) * 3 : 0, y = 160 - bob;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, 162, 7, 2, 0, 0, 7); g.fill();
    g.fillStyle = m.c; g.fillRect(x - 5, y - 20, 10, 15);
    const leg = walk && !RM ? Math.sin(now / 140 + i) * 3 : 0; g.fillRect(x - 4 + leg, y - 6, 3, 6); g.fillRect(x + 1 - leg, y - 6, 3, 6);
    g.fillStyle = '#d9b48f'; g.beginPath(); g.arc(x, y - 25, 5, 0, 7); g.fill();
    if (m.extra) { g.fillStyle = '#8a6a3c'; g.fillRect(x - 9, y - 22, 5, 10); }
    if (m.hurt) { g.fillStyle = m.hurt === 2 ? '#d4574b' : '#e0a84a'; g.fillRect(x - 2, y - 36, 4, 4); }
  });
  if (o.monster && X.monster > 0) drawMonster(g, o.monster, W * 0.68 + (1 - X.monster) * W * 0.4, 160, now);
  if (X.flash && fl < 1200 && !RM) { g.fillStyle = `rgba(255,220,160,${0.35 * (1 - fl / 1200) * (Math.sin(fl / 60) > 0 ? 1 : .3)})`; g.fillRect(-5, 0, W + 10, H); }
  g.restore();
}
function drawMonster(g, type, x, y, now) {
  const br = Math.sin(now / 300) * 1.5;
  if (type === 'ghoul') {
    for (let i = 0; i < 3; i++) { const ox = x + i * 26; g.fillStyle = '#6d756a'; g.beginPath(); g.ellipse(ox, y - 16 + br, 10, 14, -.4, 0, 7); g.fill(); g.beginPath(); g.arc(ox - 8, y - 30 + br, 6, 0, 7); g.fill(); g.fillStyle = '#e4e06a'; g.fillRect(ox - 11, y - 32 + br, 2, 2); g.strokeStyle = '#6d756a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ox - 6, y - 12); g.lineTo(ox - 14, y); g.moveTo(ox + 4, y - 6); g.lineTo(ox + 6, y); g.stroke(); }
  } else if (type === 'lizard') {
    for (let i = 0; i < 3; i++) { const ox = x + i * 34, s = i === 2 ? .7 : 1; g.fillStyle = i === 1 ? '#8c9a86' : '#6a7a63'; g.beginPath(); g.ellipse(ox, y - 7 * s, 20 * s, 7 * s, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(ox + 18 * s, y - 7 * s); g.lineTo(ox + 38 * s, y - 3 * s); g.lineTo(ox + 18 * s, y - 3 * s); g.fill(); g.beginPath(); g.ellipse(ox - 20 * s, y - 10 * s, 8 * s, 5 * s, 0, 0, 7); g.fill(); g.fillStyle = `rgba(190,255,200,${.6 + .4 * Math.sin(now / 200 + i)})`; g.fillRect(ox - 25 * s, y - 12 * s, 3, 2); }
  } else if (type === 'manticore') {
    g.fillStyle = '#8a5a3a'; g.beginPath(); g.ellipse(x + 30, y - 26 + br, 34, 18, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x, y - 38 + br, 14, 0, 7); g.fill();
    g.beginPath(); g.arc(x, y - 38 + br, 18, Math.PI * .6, Math.PI * 1.9); g.lineWidth = 6; g.strokeStyle = '#5e3a24'; g.stroke();
    g.fillStyle = '#8a5a3a'; for (const lx of [10, 22, 44, 56]) g.fillRect(x + lx - 3, y - 14, 6, 14);
    g.strokeStyle = '#6a4630'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 60, y - 30); g.quadraticCurveTo(x + 90, y - 40, x + 80, y - 70 + br); g.stroke();
    g.fillStyle = '#c9c06a'; g.beginPath(); g.moveTo(x + 80, y - 78 + br); g.lineTo(x + 74, y - 66); g.lineTo(x + 86, y - 66); g.fill();
    g.fillStyle = 'rgba(120,90,70,.75)'; g.beginPath(); g.moveTo(x + 20, y - 40); g.lineTo(x + 50, y - 80 + br * 2); g.lineTo(x + 62, y - 38); g.fill();
    g.fillStyle = '#f0d070'; g.fillRect(x - 7, y - 41 + br, 3, 2);
  } else if (type === 'goose') {
    for (let i = 0; i < 4; i++) { const ox = x + i * 24, oy = y - 30 - Math.sin(now / 250 + i) * 6; g.fillStyle = 'rgba(200,210,235,.6)'; g.beginPath(); g.ellipse(ox, oy, 9, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(ox - 6, oy - 2); g.quadraticCurveTo(ox - 12, oy - 14, ox - 16, oy - 12); g.lineWidth = 3; g.strokeStyle = 'rgba(200,210,235,.6)'; g.stroke(); }
  }
}
