/* 遠征畫面：橫向捲動的場景、隊伍、怪物進場與戰鬥閃光 */
const BIOME = {
  swamp:  {sky: ['#3b4a4a', '#6d7a66'], hill: '#2f3a2e', ground: '#3e4a2c', ground2: '#2c3620'},
  cellar: {sky: ['#1b1714', '#2c2420'], hill: '#3a302a', ground: '#463a30', ground2: '#2f2620'},
  road:   {sky: ['#4b5f78', '#c59a6a'], hill: '#4a4f3a', ground: '#7a6a48', ground2: '#5b4e34'},
  grave:  {sky: ['#20263a', '#4e4d62'], hill: '#2a2d36', ground: '#3a3d35', ground2: '#2a2c26'},
  forest: {sky: ['#2f4038', '#77806a'], hill: '#24322a', ground: '#3b4630', ground2: '#2a3322'},
  mine:   {sky: ['#141312', '#26221e'], hill: '#2e2924', ground: '#3d3630', ground2: '#2a2520'},
  snow:   {sky: ['#5b6b80', '#c9d3dc'], hill: '#9fb0bf', ground: '#dfe6ec', ground2: '#c3ced8'},
  harbor: {sky: ['#2b3a55', '#c98a5e'], hill: '#3b4658', ground: '#6b4f36', ground2: '#4f3a28'},
};
function expedition(o) {
  screen(`<div class="exp"><canvas id="cv"></canvas><div class="exp-day" id="expday">${t('exp.depart')}</div></div><div id="evbox" class="evbox"><div class="card"><h4>${missionName(S.M)}</h4><p class="muted">${t('exp.leave')}</p></div></div>`);
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
  if (o.biome === 'forest') {
    for (let i = -1; i < W / 60 + 2; i++) { const x = i * 60 - (X.off * 0.7 % 60) + (i % 3) * 9, h = 70 + (i % 4) * 14;
      g.fillStyle = '#3a2c20'; g.fillRect(x + 8, 160 - h * 0.4, 5, h * 0.4);
      g.fillStyle = i % 2 ? '#2d4a35' : '#35553c'; g.beginPath(); g.moveTo(x - 6, 160 - h * 0.35); g.lineTo(x + 10, 160 - h); g.lineTo(x + 27, 160 - h * 0.35); g.fill(); }
  }
  if (o.biome === 'mine') {
    g.strokeStyle = '#5a4630'; g.lineWidth = 6;
    for (let i = -1; i < W / 140 + 2; i++) { const x = i * 140 - (X.off * 0.6 % 140); g.beginPath(); g.moveTo(x, 160); g.lineTo(x, 50); g.lineTo(x + 90, 50); g.lineTo(x + 90, 160); g.stroke(); }
    g.fillStyle = 'rgba(240,190,90,.55)'; for (let i = -1; i < W / 140 + 2; i++) { const x = i * 140 - (X.off * 0.6 % 140) + 45; g.beginPath(); g.arc(x, 64, 4, 0, 7); g.fill(); }
  }
  if (o.biome === 'snow') {
    for (let i = -1; i < W / 55 + 2; i++) { const x = i * 55 - (X.off * 0.7 % 55) + (i % 3) * 8, h = 60 + (i % 4) * 12;
      g.fillStyle = '#3c4a44'; g.beginPath(); g.moveTo(x - 6, 160 - h * 0.3); g.lineTo(x + 10, 160 - h); g.lineTo(x + 26, 160 - h * 0.3); g.fill();
      g.fillStyle = '#eef3f6'; g.beginPath(); g.moveTo(x + 4, 160 - h * 0.8); g.lineTo(x + 10, 160 - h); g.lineTo(x + 16, 160 - h * 0.8); g.fill(); }
    if (!RM) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) { const sx = (i * 97 + now * 0.02 * (1 + i % 3)) % (W + 10), sy = (i * 53 + now * 0.03 * (1 + i % 2)) % H; g.fillRect(sx, sy, 2, 2); } }
  }
  if (o.biome === 'harbor') {
    g.fillStyle = '#2f4a63'; g.fillRect(-5, 120, W + 10, 40);
    g.strokeStyle = 'rgba(220,235,245,.35)'; g.lineWidth = 1.5;
    for (let r = 0; r < 3; r++) { g.beginPath(); for (let x = -5; x <= W + 5; x += 10) g.lineTo(x, 128 + r * 10 + Math.sin((x + now * 0.05 + r * 40) / 18) * 2); g.stroke(); }
    g.fillStyle = '#3a2c20'; for (let i = -1; i < W / 80 + 2; i++) { const x = i * 80 - (X.off % 80); g.fillRect(x, 146, 6, 18); }
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
  } else if (type === 'wolf' || type === 'frostwolf') {
    const fw = type === 'frostwolf';
    for (let i = 0; i < 4; i++) { const ox = x + i * 28, oy = y - (i % 2) * 2; g.fillStyle = fw ? (i % 2 ? '#e6edf2' : '#c9d6df') : (i % 2 ? '#7d7f84' : '#66686e');
      g.beginPath(); g.ellipse(ox, oy - 12 + br * .5, 13, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(ox - 11, oy - 15); g.lineTo(ox - 22, oy - 13); g.lineTo(ox - 13, oy - 8); g.fill();
      g.beginPath(); g.moveTo(ox - 14, oy - 16); g.lineTo(ox - 12, oy - 22); g.lineTo(ox - 9, oy - 16); g.fill(); g.fillRect(ox - 9, oy - 8, 3, 8); g.fillRect(ox + 7, oy - 8, 3, 8);
      g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.moveTo(ox + 12, oy - 13); g.lineTo(ox + 20, oy - 18); g.stroke(); g.fillStyle = fw ? '#7fd4ff' : '#f0e070'; g.fillRect(ox - 17, oy - 15, 2, 2); }
  } else if (type === 'bandit') {
    for (let i = 0; i < 4; i++) { const ox = x + i * 20, oy = y; g.fillStyle = ['#5a4a3a', '#4a4038', '#6a5040', '#504840'][i];
      g.fillRect(ox - 5, oy - 20, 10, 15); g.fillRect(ox - 4, oy - 6, 3, 6); g.fillRect(ox + 1, oy - 6, 3, 6);
      g.fillStyle = '#c9a07a'; g.beginPath(); g.arc(ox, oy - 25, 5, 0, 7); g.fill(); g.fillStyle = '#2a2420'; g.fillRect(ox - 5, oy - 27, 10, 3);
      g.strokeStyle = '#bfc6cf'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox - 7, oy - 14); g.lineTo(ox - 14, oy - 26 + br); g.stroke(); }
  } else if (type === 'toad') {
    for (let i = 0; i < 4; i++) { const ox = x + i * 26, oy = y - Math.abs(Math.sin(now / 400 + i)) * 4; g.fillStyle = i % 2 ? '#6f7d3a' : '#5b6a30';
      g.beginPath(); g.ellipse(ox, oy - 8, 12, 9, 0, 0, 7); g.fill(); g.fillStyle = '#c9b84a'; g.beginPath(); g.arc(ox - 6, oy - 15, 3, 0, 7); g.arc(ox + 4, oy - 15, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(160,200,90,.5)'; g.beginPath(); g.arc(ox + 8, oy - 4, 2, 0, 7); g.fill(); }
  } else if (type === 'troll') {
    g.fillStyle = '#6f7d5a'; g.beginPath(); g.ellipse(x + 10, y - 34 + br, 20, 28, 0.15, 0, 7); g.fill();
    g.beginPath(); g.arc(x - 6, y - 64 + br, 11, 0, 7); g.fill();
    g.fillRect(x - 2, y - 12, 9, 12); g.fillRect(x + 14, y - 12, 9, 12);
    g.strokeStyle = '#6f7d5a'; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 6, y - 44); g.lineTo(x - 24, y - 22 + br); g.stroke();
    g.strokeStyle = '#5a4026'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 24, y - 22 + br); g.lineTo(x - 34, y - 52 + br); g.stroke();
    g.fillStyle = '#e8d070'; g.fillRect(x - 11, y - 67 + br, 3, 2); g.fillRect(x - 4, y - 67 + br, 3, 2);
  } else if (type === 'worm') {
    for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI, sx = x + 10 + Math.cos(a) * 40, sy = y - Math.sin(a) * (46 + br * 2);
      g.fillStyle = i % 2 ? '#a8836a' : '#94705a'; g.beginPath(); g.arc(sx, sy, 11 - i * 0.4, 0, 7); g.fill(); }
    g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(x + 50, y - 4, 6, 0, 7); g.fill();
    g.fillStyle = '#4a3a30'; g.beginPath(); g.ellipse(x + 10, y + 2, 52, 5, 0, 0, 7); g.fill();
  } else if (type === 'treant') {
    g.fillStyle = '#4a3a2a'; g.fillRect(x, y - 70, 22, 70);
    g.strokeStyle = '#4a3a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 2, y - 50); g.quadraticCurveTo(x - 20, y - 60 + br * 2, x - 26, y - 34); g.moveTo(x + 20, y - 54); g.quadraticCurveTo(x + 44, y - 66 - br * 2, x + 46, y - 40); g.stroke();
    g.fillStyle = 'rgba(110,70,120,.75)'; g.beginPath(); g.arc(x + 11, y - 78, 26, 0, 7); g.fill();
    g.fillStyle = 'rgba(150,90,160,.5)'; g.beginPath(); g.arc(x - 6, y - 70, 14, 0, 7); g.arc(x + 30, y - 72, 14, 0, 7); g.fill();
    g.fillStyle = `rgba(200,255,140,${.6 + .4 * Math.sin(now / 250)})`; g.fillRect(x + 5, y - 58, 3, 3); g.fillRect(x + 14, y - 58, 3, 3);
  } else if (type === 'serpent') {
    for (let i = 0; i < 4; i++) { const cx = x + i * 26, top = 112 - (i === 0 ? 40 : 10) + Math.sin(now / 300 + i) * 3;
      g.strokeStyle = i % 2 ? '#3f7a6a' : '#356a5c'; g.lineWidth = 12; g.beginPath(); g.arc(cx, 128, 128 - top, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#3f7a6a'; g.beginPath(); g.ellipse(x - 14, 80 + br * 2, 14, 9, -0.3, 0, 7); g.fill();
    g.fillStyle = '#f4e27a'; g.fillRect(x - 20, 77 + br * 2, 3, 2);
  } else if (type === 'goose') {
    for (let i = 0; i < 4; i++) { const ox = x + i * 24, oy = y - 30 - Math.sin(now / 250 + i) * 6; g.fillStyle = 'rgba(200,210,235,.6)'; g.beginPath(); g.ellipse(ox, oy, 9, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(ox - 6, oy - 2); g.quadraticCurveTo(ox - 12, oy - 14, ox - 16, oy - 12); g.lineWidth = 3; g.strokeStyle = 'rgba(200,210,235,.6)'; g.stroke(); }
  }
}
