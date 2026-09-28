/* =====================================================================
   On a planet: walking, mining, scanning creatures, watchers, weather,
   your ship landing and taking off, and drawing all of it. The world is
   in metres with your ship at 0,0. Things are drawn standing up and
   sorted back to front, like a picture book seen from above.
   ===================================================================== */
"use strict";
const SF = {};                     // the planet you're standing on
const cam = { x: 0, y: 0, z: 24 }; // z: pixels per metre
const shake = { x: 0, y: 0 }, CAMY = .56; // you stand a little below the middle, clear of the HUD
const PZ = 24; // patterns are drawn at PZ pixels per metre and stay stuck to the ground
let PAT = {}, patFor = '';
// the jetpack: hold still this long to fire it; the tank empties in about 2.5 s of flight and refills on the ground
const JET_HOLD = .28, JET_BURN = 38, JET_FILL = 45, JET_TOP = 3.2;

/* ---------- ink patterns for the ground ---------- */
function tile(w, h, draw) {
  const c = document.createElement('canvas'); c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
  const g = c.getContext('2d'); g.scale(DPR, DPR); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round'; draw(g);
  const p = ctx.createPattern(c, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix([1 / (DPR * PZ), 0, 0, 1 / (DPR * PZ), 0, 0])); return p;
}
const GROUND_ART = {
  tufts: g => { const r = RNG('tufts'); g.lineWidth = 1.2; g.globalAlpha = .45;
    for (let i = 0; i < 16; i++) { const x = 10 + r() * 220, y = 10 + r() * 220, s = 3 + r() * 2; g.beginPath(); g.moveTo(x - s, y + s * .7); g.lineTo(x - s * .2, y - s); g.moveTo(x + s * .2, y - s * .9); g.lineTo(x + s, y + s * .7); g.stroke(); } },
  cracks: g => { const r = RNG('cracks'); g.lineWidth = 1.1; g.globalAlpha = .4;
    for (let i = 0; i < 10; i++) { let x = 10 + r() * 220, y = 10 + r() * 220; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - .3) * 14; y += (r() - .5) * 9; g.lineTo(x, y); } g.stroke(); } },
  snow: g => { const r = RNG('snow'); g.globalAlpha = .35;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(5 + r() * 230, 5 + r() * 230, 1 + r() * .6, 0, TAU); g.fill(); }
    g.lineWidth = 1; for (let i = 0; i < 4; i++) { const x = 20 + r() * 200, y = 20 + r() * 200; g.beginPath(); g.arc(x, y, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } },
  bubbles: g => { const r = RNG('bubbles'); g.lineWidth = 1.1; g.globalAlpha = .4;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(8 + r() * 224, 8 + r() * 224, 1.5 + r() * 3, 0, TAU); g.stroke(); } },
  dust: g => { const r = RNG('dust'); g.globalAlpha = .4;
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(5 + r() * 230, 5 + r() * 230, .8 + r() * .7, 0, TAU); g.fill(); }
    g.lineWidth = 1; g.globalAlpha = .3; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(15 + r() * 210, 15 + r() * 210, 3 + r() * 5, 2 + r() * 2, 0, 0, TAU); g.stroke(); } },
  waves: g => { const r = RNG('waves'); g.lineWidth = 1.2; g.globalAlpha = .4;
    for (let i = 0; i < 12; i++) { const x = 10 + r() * 210, y = 10 + r() * 220; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 3, y - 4, x + 6, y + 4, x + 10, y); g.stroke(); } },
};
function makePatterns(style) {
  const key = style + '@' + DPR; if (patFor === key) return; patFor = key;
  PAT.ground = tile(240, 240, GROUND_ART[style]);
  PAT.hatch = tile(6, 6, g => { g.lineWidth = 1; g.beginPath(); g.moveTo(-1, 7); g.lineTo(7, -1); g.moveTo(-1, 1); g.lineTo(1, -1); g.moveTo(5, 7); g.lineTo(7, 5); g.stroke(); });
  PAT.rough = tile(6, 6, g => { g.lineWidth = 1.1; g.beginPath(); g.moveTo(-1, 7); g.lineTo(7, -1); g.moveTo(-1, -1); g.lineTo(7, 7); g.stroke(); });
  PAT.patch = tile(18, 18, g => { const r = RNG('patch'); g.globalAlpha = .55; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(1 + r() * 16, 1 + r() * 16, .9, 0, TAU); g.fill(); } });
}
addEventListener('resize', () => { if (SF.pl) { patFor = ''; makePatterns(SF.pl.ground); } });

/* ---------- camera ---------- */
function camZoom() { return clamp(Math.min(W, H * .62) / 15.5, 20, 40); }
function worldTransform() { const k = cam.z * DPR; ctx.setTransform(k, 0, 0, k, DPR * (W / 2 + shake.x) - k * cam.x, DPR * (H * CAMY + shake.y) - k * cam.y); }
const toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H * CAMY];
const toWorld = (sx, sy) => [cam.x + (sx - W / 2) / cam.z, cam.y + (sy - H * CAMY) / cam.z];
function camStep(dt) {
  const p = SF.p, sh = SF.ship; cam.z = camZoom();
  let tx = p.x, ty = p.y - 1 - p.alt * .5;
  if (sh.phase !== 'rest') { tx = 0; ty = -1.5 - sh.alt * .55; }
  const k = 1 - Math.exp(-dt * 6); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  SF.shake *= Math.exp(-dt * 9); const s = SF.shake * (RM ? .1 : 1); shake.x = (Math.random() - .5) * s; shake.y = (Math.random() - .5) * s;
}

/* ---------- landing ---------- */
function landOn(k, descend) {
  G.at = k; G.where = 'surface'; G.dock = false;
  const pl = curPlanet();
  const first = !G.seen[pl.key];
  if (first) { G.seen[pl.key] = 1; G.stats.planets++; save.planets++; writeSave(); }
  const L = planetLayout(pl), dep = new Set(G.dep[pl.key] || []);
  SF.pl = pl; SF.objs = L.objs.filter(o => !dep.has(o.id)); SF.deco = L.deco; SF.first = first;
  SF.blocks = L.blocks; SF.pools = L.blocks.filter(b => b.k === 'pool'); SF.stand = L.blocks.filter(b => b.k !== 'pool');
  SF.pois = L.pois.map(o => Object.assign(o, { used: dep.has(o.id) }));
  SF.goals = planetGoals(pl, L);
  SF.flocks = [];
  if (pl.fauna.length) for (let i = ri(RNG(pl.seed, 'birds'), 1, 2); i > 0; i--) SF.flocks.push(newFlock(true));
  SF.cr = [];
  L.herds.forEach(h => {
    const sp = pl.fauna[h.sp], r = RNG(pl.seed, 'herd', h.sp);
    for (let i = 0; i < sp.count; i++) { const x = h.x + (r() - .5) * 9, y = h.y + (r() - .5) * 9; SF.cr.push({ sp, x, y, hx: h.x, hy: h.y, tx: x, ty: y, face: r() < .5 ? 1 : -1, ph: r() * 10, moving: false, wait: r() * 3 }); }
  });
  Object.assign(SF, { drones: [], parts: [], zaps: [], alert: 0, target: null, work: 0, pulse: null, tapFx: null, scanCool: 0, tagUntil: 0,
    saveT: 0, lowT: 4, tipT: 0, near: false, shake: 0, edgeT: 0, wp: [], storm: { t: 35 + Math.random() * 25, on: 0, warned: false } });
  const resume = !descend && G.px != null;
  SF.p = { x: resume ? G.px : 2.6, y: resume ? G.py : .9, face: 1, walk: 0, moving: false, hurt: 0, hidden: !!descend, hop: 0, aim: null, alt: 0, vz: 0, jetting: false };
  SF.jet = 100; SF.jetRest = 0; SF.jetEmpty = false;
  SF.ship = { alt: descend ? 18 : 0, legs: descend ? 0 : 1, sq: 0, sqv: 0, phase: descend ? 'down' : 'rest', t: 0, flame: descend ? 1 : 0 };
  makePatterns(pl.ground);
  cam.z = camZoom(); cam.x = descend ? 0 : SF.p.x; cam.y = descend ? -11 : SF.p.y - 1;
  S.mode = 'surface'; hudShow('surface'); $('boardBtn').hidden = true; hudPlanet(); updRes(); updMeters(true); checkGoals(true);
  saveRun();
}
const lifeText = pl => pl.fauna.length ? plural(pl.fauna.length, 'species', 'species') : 'no life';
function landedHello() {
  const pl = SF.pl;
  callout(pl.name, `${WEATHER[pl.wx].name} · ${lifeText(pl)} · watchers: ${WATCH[pl.watch].toLowerCase()}`);
  if (WEATHER[pl.wx].drain > .5) setTimeout(() => tipOnce('hazard', 'This weather wears your shield down. Tap sodium to recharge it, or stand by your ship.'), 2500);
}

/* ---------- input: drag anywhere to walk, tap something to go to it ---------- */
const IN = { ptr: null, keys: {}, jx: 0, jy: 0 };
cv.addEventListener('pointerdown', e => {
  if (sheetOpen() || S.wipe) return;
  if (S.mode === 'space') { spaceTap(e.clientX, e.clientY); return; }
  if (S.mode !== 'surface') return;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  IN.ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), drag: false };
});
cv.addEventListener('pointermove', e => {
  const p = IN.ptr; if (!p || p.id !== e.pointerId) return; p.x = e.clientX; p.y = e.clientY;
  let dx = p.x - p.sx, dy = p.y - p.sy, m = Math.hypot(dx, dy);
  if (!p.drag && m > 12) { p.drag = true; setTarget(null); }
  if (m > 64) { p.sx = p.x - dx / m * 64; p.sy = p.y - dy / m * 64; dx = p.x - p.sx; dy = p.y - p.sy; m = 64; } // the stick follows your thumb
  if (p.drag) { const k = Math.min(1, m / 46) / Math.max(m, 1); IN.jx = dx * k; IN.jy = dy * k; }
});
function lift(e) {
  const p = IN.ptr; if (!p || p.id !== e.pointerId) return; IN.ptr = null; IN.jx = IN.jy = 0;
  if (!p.drag && !p.jet && e.type === 'pointerup' && S.mode === 'surface') surfaceTap(p.x, p.y);
}
cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p') { if (sheetOpen()) { if ($('resume')) $('resume').click(); } else showPause(); return; }
  if (S.mode === 'surface' && !sheetOpen()) {
    if (e.key === ' ') { e.preventDefault(); doScan(); return; }
    if ((e.key === 'e' || e.key === 'Enter') && SF.near) { openShip(); return; }
  }
  if (e.key === 'Shift' || e.key === 'j') { IN.keys[e.key] = true; return; } // Shift or J holds the jetpack
  if (/^Arrow/.test(e.key) || ['w', 'a', 's', 'd'].includes(e.key)) { IN.keys[e.key] = true; if (S.mode === 'surface') { e.preventDefault(); setTarget(null); } }
});
addEventListener('keyup', e => { delete IN.keys[e.key]; });
addEventListener('blur', () => { IN.keys = {}; });

function setTarget(t) { SF.target = t; SF.work = 0; }
const objHeight = o => (o.k === 'plant' ? SF.pl.flora[o.fl].h : OBJ_H[o.k]) * o.s;
const crMid = c => c.sp.legLen + c.sp.bh * .5 + (c.sp.hover ? .5 : 0);
const POI_H = { wreck: 2, pod: 1.5, monolith: 3.8, cave: 2.2, chart: .9 };
function targetAlive(T) { return T.kind === 'obj' ? !T.o.gone : T.kind === 'drone' ? !T.o.dead : true; }
function targetPos(T) { return T.kind === 'go' ? [T.x, T.y] : T.kind === 'ship' ? [0, 0] : [T.o.x, T.o.y]; }
// the tallest part of each thing you walk round, for tapping its picture
const blockTop = b => b.k === 'mesa' ? b.h + b.w * .45 : b.k === 'tree' ? 4.2 * b.s : b.k === 'boulder' ? 1.3 * b.s : 0;
// where to walk for a tap on the ground: if it's on a boulder, cliff, tree or pool, stop at its near edge instead
function goNear(wx, wy, sx, sy) {
  let hit = SF.blocks.find(b => !b.walk && ((wx - b.x) / b.rx) ** 2 + ((wy - b.y) / b.ry) ** 2 < 1);
  if (!hit) hit = SF.stand.find(b => { const [l, top] = toScreen(b.x - b.rx, b.y - blockTop(b)), [r, bot] = toScreen(b.x + b.rx, b.y + b.ry); return sx > l && sx < r && sy > top && sy < bot; });
  if (!hit) return { kind: 'go', x: wx, y: wy };
  const p = SF.p, ex = p.x - hit.x, ey = p.y - hit.y, pad = .6, k = 1 / (Math.sqrt((ex / (hit.rx + pad)) ** 2 + (ey / (hit.ry + pad)) ** 2) || 1);
  return { kind: 'go', x: hit.x + ex * Math.min(1, k), y: hit.y + ey * Math.min(1, k) };
}
function surfaceTap(sx, sy) {
  if (SF.ship.phase !== 'rest' || SF.p.hidden) return;
  let best = null, bd = 30;
  const consider = (t, wx, wy, rad) => { const [a, b] = toScreen(wx, wy), d = Math.hypot(a - sx, b - sy) - rad * cam.z; if (d < bd) { bd = d; best = t; } };
  SF.drones.forEach(d => consider({ kind: 'drone', o: d }, d.x, d.y - d.alt, .6));
  SF.cr.forEach(c => consider({ kind: 'creature', o: c }, c.x, c.y - crMid(c), Math.max(c.sp.bw, c.sp.bh) * .5));
  const vx = W / cam.z, vy = H / cam.z;
  SF.objs.forEach(o => { if (Math.abs(o.x - cam.x) > vx || Math.abs(o.y - cam.y) > vy) return; const h = objHeight(o); consider({ kind: 'obj', o }, o.x, o.y - h / 2, Math.max(.35, h * .4)); });
  SF.pois.forEach(o => consider({ kind: 'poi', o }, o.x, o.y - POI_H[o.k] / 2, 1.3));
  consider({ kind: 'ship' }, 0, -1.6, 1.8);
  const [wx, wy] = toWorld(sx, sy);
  if (best && best.kind === 'creature' && (G.scanned[SF.pl.key] || []).includes(best.o.sp.idx)) hint(`${best.o.sp.name}. ${TEMPER[best.o.sp.temper]} Already in your catalog.`, 3500);
  setTarget(best || goNear(wx, wy, sx, sy));
  SF.tapFx = { x: wx, y: wy, t: 0 };
}

/* ---------- each frame ---------- */
function surfaceStep(dt) {
  const p = SF.p;
  shipStep(dt);
  p.hurt = Math.max(0, p.hurt - dt); p.hop = Math.max(0, p.hop - dt); SF.scanCool = Math.max(0, SF.scanCool - dt);
  creaturesStep(dt); partsStep(dt); flocksStep(dt);
  if (SF.pulse && (SF.pulse.t += dt) > 1.4) SF.pulse = null;
  if (SF.tapFx && (SF.tapFx.t += dt) > .45) SF.tapFx = null;
  SF.zaps = SF.zaps.filter(z => (z.t -= dt) > 0);
  if (SF.ship.phase === 'rest' && !p.hidden) {
    playerStep(dt); dronesStep(dt); hazardStep(dt);
    if ((SF.saveT += dt) > 4) { SF.saveT = 0; G.px = p.x; G.py = p.y; saveRun(); }
    if ((SF.tipT += dt) > .5) { SF.tipT = 0; surfaceTips(); }
  } else p.aim = null;
  camStep(dt); updMeters();
  const near = SF.ship.phase === 'rest' && !p.hidden && Math.hypot(p.x, p.y) < 4;
  if (near !== SF.near) { SF.near = near; $('boardBtn').hidden = !near; if (near) squash($('boardBtn')); }
}
function playerStep(dt) {
  const p = SF.p, k = IN.keys;
  let mx = 0, my = 0;
  const kx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), ky = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
  if (kx || ky) { const m = Math.hypot(kx, ky); mx = kx / m; my = ky / m; }
  else if (IN.ptr && IN.ptr.drag) { mx = IN.jx; my = IN.jy; }
  let T = SF.target; if (T && !targetAlive(T)) { setTarget(null); T = null; }
  // walk right up to a hidden star chart and you pick it up
  { const c = SF.pois.find(o => o.k === 'chart' && !o.used && Math.hypot(o.x - p.x, o.y - p.y) < 1.8); if (c && p.alt < .3) foundChart(c); }
  // nothing chosen: whatever you walk up to gets mined or scanned by itself
  if (!T && p.alt < .3) { T = autoTarget(); if (T) setTarget(T); }
  let aim = null;
  if (T && T.auto) {
    const [tx, ty] = targetPos(T), d = Math.hypot(tx - p.x, ty - p.y), reach = T.kind === 'creature' ? scanRange() : 2.4;
    if (d > reach * 1.1 || p.alt >= .3) setTarget(null); else aim = work(T, dt);
  } else if (!mx && !my && T) {
    const [tx, ty] = targetPos(T), dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1e-6;
    const reach = T.kind === 'creature' ? scanRange() : T.kind === 'drone' ? 9 : T.kind === 'obj' ? 2.4 : T.kind === 'ship' ? 3.4 : T.kind === 'poi' ? (T.o.k === 'cave' ? 1.6 : 2.8) : .35;
    const stop = T.kind === 'creature' ? scanRange() * .55 : T.kind === 'drone' ? 5 : reach * .85;
    // walking to something that stays put but no longer getting closer (round the back of a big cliff, say): give up rather than go on forever
    if (d > stop && T.kind !== 'creature' && T.kind !== 'drone') {
      if (SF.lastT === T && d > SF.best - .05) { if ((SF.stuck = (SF.stuck || 0) + dt) > 2) { setTarget(null); SF.stuck = 0; } }
      else { SF.stuck = 0; SF.best = SF.lastT === T ? Math.min(SF.best, d) : d; }
      SF.lastT = T;
    }
    if (d > stop) { mx = dx / d; my = dy / d; }
    if (d <= reach) {
      if (T.kind === 'go') setTarget(null);
      else if (T.kind === 'ship') { setTarget(null); mx = my = 0; openShip(); }
      else if (T.kind === 'poi') { setTarget(null); mx = my = 0; usePoi(T.o); }
      else if (p.alt < .3) aim = work(T, dt);
    } else SF.work = Math.max(0, SF.work - dt * .5);
  }
  p.aim = aim;
  jetStep(dt);
  const fly = p.alt > .4, spd = 4.6 * (1 + .15 * upL('boots')) * (p.alt > .2 ? 1.7 : 1), m = Math.hypot(mx, my);
  p.moving = m > .05;
  if (p.moving) {
    const s = Math.min(1, m), x0 = p.x, y0 = p.y, dx = mx / m * s * spd * dt, dy = my / m * s * spd * dt;
    if (fly) { p.x += dx; p.y += dy; } else walkBy(p, .35, dx, dy); // in the air you fly straight over things
    const went = Math.hypot(p.x - x0, p.y - y0); p.walk += went / 1.2; if (Math.abs(p.x - x0) > .2 * went) p.face = p.x > x0 ? 1 : -1;
  }
  if (aim) p.face = aim[0] >= p.x ? 1 : -1;
  const dc = Math.hypot(p.x, p.y);
  if (dc > PLANET_R - 9) goalSet('far');
  if (dc > PLANET_R - 1) { p.x *= (PLANET_R - 1) / dc; p.y *= (PLANET_R - 1) / dc; if (S.t - SF.edgeT > 8) { SF.edgeT = S.t; hint('The ground is too rough to cross. Your ship can take you further.'); } }
}
// mining, scanning or shooting: returns the point the multitool aims at
function work(T, dt) {
  const up = 1 + .3 * upL('beam');
  if (T.kind === 'obj') {
    const o = T.o, h = objHeight(o);
    SF.work += dt * up;
    if (Math.random() < dt * 16) spark(o.x + (Math.random() - .5) * .5, o.y, h * (.3 + Math.random() * .4));
    if (SF.work >= MINE_T[o.k]) mined(o);
    return [o.x, o.y - h * .5];
  }
  if (T.kind === 'creature') {
    const c = T.o;
    if ((G.scanned[SF.pl.key] || []).includes(c.sp.idx)) { setTarget(null); return null; }
    SF.work += dt; if (SF.work >= scanTime()) discover(c.sp);
    return [c.x, c.y - crMid(c)];
  }
  const d = T.o; d.hp -= dt * up; d.hit = .1; if (d.hp <= 0) droneDown(d);
  return [d.x, d.y - d.alt];
}
function workNeed(T) { return T.kind === 'obj' ? MINE_T[T.o.k] / (1 + .3 * upL('beam')) : T.kind === 'creature' ? scanTime() : 0; }
function mined(o) {
  const pl = SF.pl, res = MINE_RES[o.k], [a, b] = MINE_YIELD[o.k], r = RNG(o.sd, 'y');
  const n = Math.max(1, Math.round(ri(r, a, b) * (1 + .3 * upL('cutter')) * (o.k === 'shard' ? 1 : pl.rich)));
  G.inv[res] += n; G.stats.mined++;
  SF.objs.splice(SF.objs.indexOf(o), 1); o.gone = true;
  (G.dep[pl.key] = G.dep[pl.key] || []).push(o.id);
  const [sx, sy] = toScreen(o.x, o.y - objHeight(o)); floatAt(sx, sy, '+' + n + ' ' + RES[res].name.toLowerCase(), res === 'shard');
  burst(o.x, o.y, o.k === 'shard' ? 14 : 8, o.k === 'shard');
  SF.alert += MINE_ALERT[o.k] * WATCH_F[pl.watch] * (1 - .5 * upL('hush'));
  if (o.k === 'shard' && pl.watch > 0 && SF.alert > .5 && !SF.drones.length) tipOnce('alert', 'The eye by your meters is the watchers. Mine too much and they come for you.');
  setTarget(null); updRes(res);
  if (o.k === 'shard') goalBump('spire');
  goalBump('harvest', res === (SF.goals.find(g => g.id === 'harvest') || {}).res ? n : 0);
}
function discover(sp) {
  const key = SF.pl.key; (G.scanned[key] = G.scanned[key] || []).push(sp.idx);
  G.inv.shard += SPECIES_PAY; G.stats.species++; save.species++; writeSave();
  setTarget(null); updRes('shard'); hudPlanet(); discToast(sp); saveRun();
  checkGoals();
}

/* ---------- creatures ---------- */
function creaturesStep(dt) {
  const p = SF.p;
  SF.cr.forEach(c => {
    const sp = c.sp, dx = c.x - p.x, dy = c.y - p.y, dp = Math.hypot(dx, dy) || 1;
    let vx = 0, vy = 0, spd = sp.speed;
    if (!p.hidden && sp.temper === 'shy' && dp < 6) { vx = dx / dp; vy = dy / dp; spd = Math.min(4, sp.speed * 1.8); c.wait = 1 + Math.random(); c.tx = c.x; c.ty = c.y; }
    else if (!p.hidden && sp.temper === 'curious' && dp < 12 && dp > 3) { vx = -dx / dp; vy = -dy / dp; spd *= .8; }
    else {
      const tx = c.tx - c.x, ty = c.ty - c.y, td = Math.hypot(tx, ty);
      if (td > .3) { vx = tx / td; vy = ty / td; spd *= .6; }
      else if ((c.wait -= dt) <= 0) { const a = Math.random() * TAU, d = Math.random() * 9; c.tx = c.hx + Math.cos(a) * d; c.ty = c.hy + Math.sin(a) * d; c.wait = 1.5 + Math.random() * 4; }
    }
    c.moving = !!(vx || vy);
    if (c.moving) { walkBy(c, sp.bw * .4, vx * spd * dt, vy * spd * dt); c.ph += spd * dt / Math.max(.6, sp.bw); if (Math.abs(vx) > .1) c.face = vx > 0 ? 1 : -1; }
    else if (sp.temper === 'curious' && dp < 12) c.face = dx < 0 ? 1 : -1;
    const d = Math.hypot(c.x, c.y); if (d > PLANET_R - 2) { c.x *= (PLANET_R - 2) / d; c.y *= (PLANET_R - 2) / d; }
  });
}

/* ---------- watchers ---------- */
function dronesStep(dt) {
  const p = SF.p, pl = SF.pl;
  if (!SF.drones.length) {
    if (SF.alert < 1 || !pl.watch) SF.alert = Math.max(0, SF.alert - dt * .012);
    else {
      const n = pl.watch + (J().watch > 1.2 ? 1 : 0);
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU; SF.drones.push({ x: p.x + Math.cos(a) * 15, y: p.y + Math.sin(a) * 15, alt: 2.6, hp: 1.3, fire: 2.2 + i * .8 + Math.random(), charge: 0, lost: 0, t: Math.random() * 9, hit: 0, look: 0, orbit: Math.random() < .5 ? 1 : -1 }); }
      callout('Watchers!', 'You mined too much. Fight them, or run for your ship');
      setTimeout(() => tipOnce('fight', 'Tap a watcher to shoot it down. Each one drops warp shards.'), 1500);
    }
    return;
  }
  SF.alert = 1;
  SF.drones.forEach(d => {
    d.t += dt; d.hit = Math.max(0, d.hit - dt);
    const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy) || 1;
    let vx, vy;
    if (dist > 6) { vx = dx / dist * 3.9; vy = dy / dist * 3.9; }
    else { const push = (6 - dist) * .8; vx = -dy / dist * 2 * d.orbit - dx / dist * push; vy = dx / dist * 2 * d.orbit - dy / dist * push; }
    d.x += vx * dt; d.y += vy * dt; d.alt = 2.6 + Math.sin(d.t * 2.3) * .25; d.look = Math.atan2(dy, dx);
    d.fire -= dt; d.charge = d.fire < .6 ? 1 - d.fire / .6 : 0;
    if (d.fire <= 0) { d.fire = 2.3 + Math.random() * .8; if (dist < 12) { SF.zaps.push({ x0: d.x, y0: d.y - d.alt, x1: p.x, y1: p.y - 1.1, t: .18 }); hurt(7); } }
    d.lost = dist > 26 ? d.lost + dt : 0;
  });
  const lost = SF.drones.some(d => d.lost >= 5);
  SF.drones = SF.drones.filter(d => !d.dead && d.lost < 5);
  if (!SF.drones.length) { SF.alert = .45; if (lost) callout('You lost them'); }
}
function hurt(n) {
  const s = Math.min(G.shield, n); G.shield -= s; G.life -= n - s;
  SF.p.hurt = .25; SF.shake = 7;
  const [x, y] = toScreen(SF.p.x, SF.p.y - 2.3); floatAt(x, y, '−' + n, true); nope($('meters'));
}
function droneDown(d) {
  d.dead = true; G.stats.drones++; burst(d.x, d.y, 16, true, d.alt); SF.shake = 5;
  const n = 6; G.inv.shard += n; updRes('shard');
  const [x, y] = toScreen(d.x, d.y - d.alt); floatAt(x, y, '+' + n + ' warp shards', true);
  setTarget(null);
  if (SF.drones.every(o => o.dead)) callout('Watchers down');
  goalBump('watcher');
}

/* ---------- weather and your suit ---------- */
function hazardStep(dt) {
  const w = WEATHER[SF.pl.wx], p = SF.p, st = SF.storm, harsh = J().harsh;
  let drain = w.drain * harsh;
  if (w.storm) {
    if (st.on > 0) { st.on -= dt; drain += 5 * harsh; if (st.on <= 0) { st.t = 50 + Math.random() * 30; st.warned = false; callout('The storm passes'); } }
    else { st.t -= dt; if (st.t < 6 && !st.warned) { st.warned = true; callout('Storm coming', SF.pois.some(o => o.k === 'cave') ? 'Find a cave, or get back to your ship' : 'Shelter by your ship'); } if (st.t <= 0) st.on = 16 + Math.random() * 6; }
  }
  drain *= 1.1 * (1 - .25 * upL('lining'));
  const cave = SF.pois.find(o => o.k === 'cave' && Math.hypot(p.x - o.x, p.y - (o.y + .6)) < 2.6);
  const shelter = Math.hypot(p.x, p.y) < 4.5 || !!cave;
  SF.shelter = shelter; SF.shelterAt = cave || null;
  if (shelter) { G.shield = Math.min(100, G.shield + 12 * dt); G.life = Math.min(lifeMax(), G.life + 4 * dt); }
  else if (drain > 0) { G.shield -= drain * dt; if (G.shield < 0) { G.shield = 0; G.life -= 2.6 * dt; } }
  if (G.life <= 0) { G.life = 0; suitFailed(); return; }
  if ((SF.lowT -= dt) <= 0 && !shelter && G.shield < 30 && drain > 0) {
    SF.lowT = 18;
    hint(G.inv.sodium > 0 ? 'Your shield is low. Tap sodium to recharge it.' : 'Your shield is low. Mine sodium, the spiky bulbs, or shelter in a cave or by your ship.');
  }
  if (cave) goalSet('cave');
  if (SF.owed && !sheetOpen()) { SF.owed = false; planetCharted(); }
}
function surfaceTips() {
  const p = SF.p, cost = takeoffCost();
  if (save.tips.walk && G.crash && G.fuel < cost && G.fuel + G.inv.ferrite * FUEL_PER_FERRITE < cost && S.t > 6) tipOnce('mine', 'Walk up to a rock and you mine it. Your ship needs ferrite to take off.');
  if (G.crash && G.fuel + G.inv.ferrite * FUEL_PER_FERRITE >= cost && Math.hypot(p.x, p.y) > 6) tipOnce('board', "That's enough ferrite. Head back to your ship: the tag at the edge points the way.");
  const vis = (x, y) => { const [a, b] = toScreen(x, y); return a > 20 && a < W - 20 && b > 120 && b < H - 140; };
  if (save.tips.mine && SF.blocks.some(b => !b.walk && vis(b.x, b.y))) tipOnce('jet', 'Press and hold anywhere to fire your jetpack. Drag while you hold to fly over boulders, pools and trees.');
  if (SF.cr.some(c => !(G.scanned[SF.pl.key] || []).includes(c.sp.idx) && vis(c.x, c.y))) tipOnce('scan', 'Walk near a creature and you scan it. Each new species pays 5 warp shards.');
  if (SF.pois.some(o => !o.used && o.k !== 'cave' && vis(o.x, o.y))) tipOnce('poi', 'Wrecks and supply pods hold supplies, and monoliths have things to tell you. Tap one to go and look.');
  if (SF.pois.some(o => o.k === 'cave' && vis(o.x, o.y)) && WEATHER[SF.pl.wx].drain > 0) tipOnce('cave', 'Caves shelter you like your ship does. Stand in the mouth and your shield recharges.');
  if (SF.objs.some(o => o.k === 'shard' && vis(o.x, o.y))) tipOnce('spire', `Black spires hold warp shards. ${WARP_COST} build a warp cell, which jumps you to the next star.`);
  if (G.cells > 0 && G.crash === false) tipOnce('cell', 'You have a warp cell. Take off, then tap Warp.');
  if (S.t > 30 && !save.tips.scanBtn) tipOnce('scanBtn', 'The scanner at the bottom right finds shard spires and species nearby.');
}

/* ---------- the ship ---------- */
function shipStep(dt) {
  const sh = SF.ship, p = SF.p; sh.t += dt;
  sh.sqv += (-150 * sh.sq - 9 * sh.sqv) * dt; sh.sq += sh.sqv * dt;
  if (sh.phase === 'down') {
    const u = Math.min(1, sh.t / 1.5); sh.alt = 18 * Math.pow(1 - u, 2.2); sh.flame = 1 - u * .5; sh.legs = clamp((u - .6) / .4, 0, 1);
    if (Math.random() < dt * 30 * u) dust((Math.random() - .5) * 5, .3, 1, 3, true);
    if (u >= 1) { sh.phase = 'rest'; sh.alt = 0; sh.flame = 0; sh.sqv = 4; dust(0, 0, 10, 6, true); SF.shake = 5; p.hidden = false; p.hop = .45; landedHello(); saveRun(); }
  } else if (sh.phase === 'up') {
    if (sh.t < .4) { sh.sq = sh.t / .4 * .16; sh.sqv = 0; sh.flame = sh.t / .4 * .6; } // anticipation: it crouches before the jump
    else { const u = sh.t - .4; sh.alt = 7 * u * u + 3 * u; sh.legs = Math.max(0, 1 - u * 3); sh.flame = 1; if (sh.t < .45) sh.sqv = -3; if (sh.alt < 5 && Math.random() < dt * 30) dust((Math.random() - .5) * 5, .3, 1, 3, true); }
    if (sh.t > 1.9 && !S.wipe) leaveSurface();
  } else if (G.crash && Math.random() < dt * 2.2) SF.parts.push({ k: 'dust', x: -2.7 + Math.random() * .3, y: .1, t: 0, life: 1.8, r: .22, g: .8, rise: 1 });
}
function takeOff() {
  const cost = takeoffCost();
  if (G.fuel < cost) return;
  G.fuel -= cost; G.crash = false; G.shield = 100; closeSheet(); hint(null); // the ship recharges your shield once you are aboard
  Object.assign(SF.ship, { phase: 'up', t: 0 }); SF.p.hidden = true; setTarget(null); SF.drones = []; $('boardBtn').hidden = true; SF.near = false;
  dust(SF.p.x, SF.p.y, 3);
}
function leaveSurface() {
  const [x, y] = toScreen(0, -SF.ship.alt - 1.5);
  wipe(x, y, () => { G.px = G.py = null; G.where = 'space'; enterSpace(); });
}

/* ---------- particles ---------- */
function burst(x, y, n, big, alt) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 1.5 + Math.random() * 3; SF.parts.push({ k: 'chip', x, y, z: (alt || .4) + Math.random() * .6, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5, vz: 3 + Math.random() * 4, t: 0, life: .7 + Math.random() * .4, r: big ? .16 : .1, rot: Math.random() * 6 }); }
  if (!alt) dust(x, y, big ? 4 : 2);
}
function dust(x, y, n, spread, big) {
  spread = spread || 1.2; const k = big ? 1 : .45;
  for (let i = 0; i < n; i++) SF.parts.push({ k: 'dust', x: x + (Math.random() - .5) * spread, y: y + (Math.random() - .5) * spread * .5, t: 0, life: .6 + Math.random() * .5, r: (.25 + Math.random() * .3) * k, g: (.5 + Math.random() * .6) * k });
}
function spark(x, y, z) { SF.parts.push({ k: 'chip', x, y, z, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 1.5, vz: 2 + Math.random() * 3, t: 0, life: .45, r: .07, rot: 0 }); }
function partsStep(dt) {
  SF.parts = SF.parts.filter(q => {
    q.t += dt;
    if (q.k === 'chip') { q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= 14 * dt; if (q.z < 0) { q.z = 0; q.vz *= -.3; q.vx *= .6; q.vy *= .6; } q.rot += dt * 9; }
    return q.t < q.life;
  });
}

/* ---------- the scanner ---------- */
function doScan() {
  if (S.mode !== 'surface' || SF.scanCool > 0 || SF.p.hidden || sheetOpen()) { nope($('scanBtn')); return; }
  SF.scanCool = 6; SF.pulse = { t: 0, x: SF.p.x, y: SF.p.y }; SF.tagUntil = S.t + 8; squash($('scanBtn'));
  const spires = SF.objs.filter(o => o.k === 'shard' && Math.hypot(o.x - SF.p.x, o.y - SF.p.y) < 60).length;
  const left = SF.pl.fauna.length - namedOn(SF.pl), finds = SF.pois.filter(o => !o.used && o.k !== 'cave' && o.k !== 'chart' && Math.hypot(o.x - SF.p.x, o.y - SF.p.y) < 70).length;
  const chart = SF.pois.find(o => o.k === 'chart' && !o.used), cd = chart ? Math.hypot(chart.x - SF.p.x, chart.y - SF.p.y) : 0;
  hint(`${spires ? plural(spires, 'shard spire') + ' nearby' : 'No shard spires nearby'}${finds ? ', and ' + plural(finds, 'place') + ' to look at' : ''}. ${!SF.pl.fauna.length ? 'Nothing lives here.' : left ? plural(left, 'species', 'species') + ' left to name here.' : 'Every species here is named.'}${chart ? (cd < CHART_SENSE ? ' A star chart is close by!' : ` A faint signal: a star chart is hidden on this world, ${cd < 45 ? 'not far off' : 'a long way out'}.`) : ''}`, chart ? 7000 : 5000);
}

/* ---------- HUD ---------- */
const namedText = pl => `${WEATHER[pl.wx].name} · ${pl.fauna.length ? `${namedOn(pl)} of ${pl.fauna.length} species named` : 'no life'}`;
function hudPlanet() {
  const pl = SF.pl;
  $('pname').textContent = pl.name; $('wxic').innerHTML = ICON[pl.wx];
  $('psub').textContent = namedText(pl);
  $('alert').hidden = pl.watch === 0;
}
let lastM = '';
function updMeters(force) {
  if (!G || !SF.pl) return;
  const lm = lifeMax(), storm = SF.storm && SF.storm.on > 0;
  const key = [Math.round(G.shield), Math.round(G.life), lm, Math.floor(Math.min(1, SF.alert) * 3), SF.drones.length, Math.ceil(SF.scanCool * 4), storm, G.inv.carbon > 0, G.inv.sodium > 0].join('|');
  if (key === lastM && !force) return; lastM = key;
  $('shieldBar').style.width = clamp(G.shield, 0, 100) + '%'; $('lifeBar').style.width = clamp(G.life / lm * 100, 0, 100) + '%';
  $('shieldN').textContent = Math.round(G.shield); $('lifeN').textContent = Math.round(G.life);
  const lvl = SF.drones.length ? 3 : Math.floor(Math.min(1, SF.alert) * 3);
  $('alert').innerHTML = ICON.eye + [0, 1, 2].map(i => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
  $('alert').classList.toggle('hot', SF.drones.length > 0);
  $('chip-sodium').classList.toggle('low', G.shield < 30 && G.inv.sodium > 0);
  $('chip-carbon').classList.toggle('low', G.life < lm * .5 && G.inv.carbon > 0);
  $('scanRing').style.strokeDashoffset = (SF.scanCool / 6 * 151).toFixed(1);
  $('scanBtn').classList.toggle('cool', SF.scanCool > 0);
  $('psub').textContent = storm ? 'Storm! Find shelter' : namedText(SF.pl);
}
function updRes(bumpKey) {
  if (SF.goals) updGoals(false);
  RES_KEYS.forEach(k => { $('n-' + k).textContent = G.inv[k]; });
  if (bumpKey) squash($('chip-' + bumpKey));
}
function useRes(k) {
  const chip = $('chip-' + k);
  if (S.mode !== 'surface') return;
  if (k === 'carbon' || k === 'sodium') {
    const life = k === 'carbon', per = life ? LIFE_PER_CARBON : SHIELD_PER_SODIUM, max = life ? lifeMax() : 100, now = life ? G.life : G.shield;
    const need = Math.ceil((max - now) / per - .01);
    if (need <= 0) { hint(life ? 'Your life is full.' : 'Your shield is full.', 2500); return; }
    if (!G.inv[k]) { nope(chip); hint(life ? 'No carbon. Mine plants to get some.' : 'No sodium. Mine the spiky bulbs to get some.'); return; }
    const n = Math.min(need, G.inv[k]); G.inv[k] -= n;
    if (life) G.life = Math.min(max, G.life + n * per); else G.shield = Math.min(max, G.shield + n * per);
    const r = chip.getBoundingClientRect(); floatAt(r.left + r.width / 2, r.top, '+' + Math.round(n * per) + (life ? ' life' : ' shield'));
    updRes(k); updMeters(true); nope($('meters'));
    return;
  }
  if (k === 'ferrite') hint(`Ferrite fuels your ship: ${FUEL_PER_FERRITE} fuel each. Board your ship to refuel.`, 4000);
  else hint(`${G.inv.shard} of ${WARP_COST} warp shards for a warp cell. Build it on your ship.`, 4000);
  squash(chip);
}

/* ---------- drawing ---------- */
function drawDeco(d, LW) {
  if (d.k === 'patch') {
    if (!d.pts) { const r = RNG(d.sd), n = 10; d.pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = d.s * (.7 + r() * .45); d.pts.push([d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * .55]); } }
    const P = d.pts, n = P.length, mid = i => [(P[i][0] + P[(i + 1) % n][0]) / 2, (P[i][1] + P[(i + 1) % n][1]) / 2];
    ctx.beginPath(); let m = mid(n - 1); ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { m = mid(i); ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
    ctx.fillStyle = PAT.patch; ctx.fill();
  } else if (d.k === 'crater') {
    const rx = d.s * .6, ry = d.s * .3;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, TAU); ctx.fillStyle = PAT.hatch; ctx.fill();
    ctx.beginPath(); ctx.ellipse(d.x, d.y + ry * .22, rx * .92, ry * .8, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = '#000'; ctx.stroke();
  } else drawStamp(ctx, LW, d);
}
function shadowW(it) {
  if (it.k === 'ship') return 2.6 * clamp(1 - SF.ship.alt / 22, .15, 1);
  if (it.k === 'me') return .42 * (1 - SF.p.alt / 7);
  if (it.k === 'cr') return it.o.sp.bw * .5 * (it.o.sp.hover ? .7 : 1);
  if (it.k === 'block') { const b = it.o; return b.k === 'mesa' ? 0 : b.k === 'tree' ? 1.1 * b.s : 1.05 * b.s; }
  if (it.k === 'poi') return { wreck: 2.6, pod: .75, monolith: .8, cave: 0, chart: .45 }[it.o.k];
  const o = it.o; return (o.k === 'rock' ? .85 : o.k === 'shard' ? .65 : o.k === 'sodium' ? .35 : .3) * o.s;
}
function localAim(p) {
  const sx = p.x + p.face * .05, sy = p.y - 1.12 - p.alt, aw = Math.atan2(p.aim[1] - sy, p.aim[0] - sx);
  return p.face > 0 ? aw : Math.PI - aw;
}
function drawThing(it, t, LW) {
  ctx.save();
  if (it.k === 'obj') {
    const o = it.o; ctx.translate(o.x, o.y);
    if (SF.target && SF.target.o === o && SF.work > 0) ctx.translate(Math.sin(t * 70) * .03, 0);
    if (o.k === 'rock') drawRock(ctx, LW, o.s, o.sd);
    else if (o.k === 'sodium') drawSodium(ctx, LW, o.s, t, o.sd);
    else if (o.k === 'shard') drawShard(ctx, LW, o.s, t, o.sd);
    else drawPlant(ctx, LW, SF.pl.flora[o.fl], o.s, t, o.sd);
  } else if (it.k === 'block') {
    const b = it.o; ctx.translate(b.x, b.y);
    if (b.k === 'boulder') drawBoulder(ctx, LW, b); else if (b.k === 'mesa') drawMesa(ctx, LW, b); else drawTree(ctx, LW, b, SF.pl.wx, t);
  } else if (it.k === 'poi') {
    const o = it.o, f = { t, used: o.used, sd: o.sd }; ctx.translate(o.x, o.y);
    if (o.k === 'wreck') drawWreck(ctx, LW, f); else if (o.k === 'pod') drawPod(ctx, LW, f); else if (o.k === 'monolith') drawMonolith(ctx, LW, f); else if (o.k === 'chart') drawChart(ctx, LW, f); else drawCave(ctx, LW, f);
  } else if (it.k === 'cr') {
    const c = it.o; ctx.translate(c.x, c.y); drawCreature(ctx, LW, c.sp, { face: c.face, ph: c.ph, moving: c.moving, t });
  } else if (it.k === 'ship') {
    const sh = SF.ship; ctx.translate(0, -sh.alt); if (G.crash) ctx.rotate(.14);
    ctx.scale(1 + sh.sq * .5, 1 - sh.sq); drawShip(ctx, LW, { legs: sh.legs, flame: sh.flame });
  } else {
    const p = SF.p, hop = p.hop > 0 ? Math.sin(p.hop / .45 * Math.PI) * .7 : 0;
    ctx.translate(p.x, p.y - hop - p.alt);
    drawExplorer(ctx, LW, { face: p.face, walk: p.walk, moving: p.moving, aim: p.aim ? localAim(p) : null, t, hurt: p.hurt, jet: p.jetting ? 1 : 0, air: p.alt > .2 });
  }
  ctx.restore();
}
function surfaceDraw(t) {
  const z = cam.z, LW = 2.2 / z, p = SF.p;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  worldTransform();
  const x0 = cam.x - W / 2 / z - 2, x1 = cam.x + W / 2 / z + 2, y0 = cam.y - H * CAMY / z - 2, y1 = cam.y + H * (1 - CAMY) / z + 4;
  const vis = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  ctx.fillStyle = PAT.ground; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  SF.deco.forEach(d => { if (vis(d.x, d.y, d.s * 1.5)) drawDeco(d, LW); });
  SF.pools.forEach(b => { if (vis(b.x, b.y, b.rx + 1)) drawPool(ctx, LW, b, t); });
  // rough ground past the edge
  if (Math.hypot(cam.x, cam.y) + Math.hypot(x1 - x0, y1 - y0) / 2 > PLANET_R) {
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.arc(0, 0, PLANET_R, 0, TAU, true); ctx.fillStyle = PAT.rough; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, PLANET_R, 0, TAU); ctx.lineWidth = LW * 1.4; ctx.strokeStyle = '#000'; ctx.stroke();
  }
  if (SF.shelter && !p.hidden) { const c = SF.shelterAt, sx = c ? c.x : 0, sy = c ? c.y + .6 : 0, sr = c ? 2.6 : 4.5; ctx.save(); ctx.setLineDash([.35, .35]); ctx.lineDashOffset = -t * .6; ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr * .5, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = '#000'; ctx.globalAlpha = .5; ctx.stroke(); ctx.restore(); }
  if (SF.pulse) { const u = SF.pulse.t / 1.4, r = 1 + u * 40; ctx.save(); ctx.globalAlpha = 1 - u; ctx.setLineDash([.7, .5]); ctx.lineWidth = LW * 1.5; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.ellipse(SF.pulse.x, SF.pulse.y, r, r * .6, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (SF.tapFx) { const u = SF.tapFx.t / .45; ctx.save(); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(SF.tapFx.x, SF.tapFx.y, .2 + u * .6, (.2 + u * .6) * .5, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore(); }
  const list = [];
  SF.objs.forEach(o => { if (vis(o.x, o.y, 4)) list.push({ y: o.y, o, k: 'obj' }); });
  SF.cr.forEach(c => { if (vis(c.x, c.y, 4)) list.push({ y: c.y, o: c, k: 'cr' }); });
  SF.stand.forEach(b => { if (vis(b.x, b.y, (b.w || 3) + 6)) list.push({ y: b.y, o: b, k: 'block' }); });
  SF.pois.forEach(o => { if (vis(o.x, o.y, 6)) list.push({ y: o.y, o, k: 'poi' }); });
  if (vis(0, 0, 8)) list.push({ y: 0, k: 'ship' });
  if (!p.hidden) list.push({ y: p.y, k: 'me' });
  // hatched shadows on the ground first, then everything standing, back to front
  ctx.fillStyle = PAT.hatch;
  list.forEach(it => { const w = shadowW(it); if (!w) return; const x = it.k === 'ship' ? 0 : it.k === 'me' ? p.x : it.o.x, y = it.k === 'ship' ? 0 : it.k === 'me' ? p.y : it.o.y; ctx.beginPath(); ctx.ellipse(x + w * .15, y, w, w * .3, 0, 0, TAU); ctx.fill(); });
  SF.drones.forEach(d => { ctx.beginPath(); ctx.ellipse(d.x, d.y, .5, .16, 0, 0, TAU); ctx.fill(); });
  SF.flocks.forEach(f => f.birds.forEach(b => { const x = f.x + b[0], y = f.y + b[1]; if (vis(x, y, 2)) { ctx.beginPath(); ctx.ellipse(x + 1.5, y, .35, .1, 0, 0, TAU); ctx.fill(); } }));
  list.sort((a, b) => a.y - b.y);
  list.forEach(it => drawThing(it, t, LW));
  drawBeam(t, LW);
  SF.drones.forEach(d => { ctx.save(); ctx.translate(d.x + (d.hit > 0 ? (Math.random() - .5) * .12 : 0), d.y - d.alt); drawDrone(ctx, LW, { look: d.look, charge: d.charge }); ctx.restore(); });
  SF.zaps.forEach(zp => { ctx.save(); ctx.beginPath(); ctx.moveTo(zp.x0, zp.y0); for (let i = 1; i < 7; i++) { const u = i / 7; ctx.lineTo(lerp(zp.x0, zp.x1, u) + (Math.random() - .5) * .5, lerp(zp.y0, zp.y1, u) + (Math.random() - .5) * .5); } ctx.lineTo(zp.x1, zp.y1); ctx.lineWidth = LW * 2; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); });
  drawParts(LW);
  SF.flocks.forEach(f => f.birds.forEach((b, i) => { const x = f.x + b[0], y = f.y + b[1] - f.alt; if (!vis(x, y, 2)) return; ctx.save(); ctx.translate(x, y); drawBird(ctx, LW, .5 + Math.sin(t * 9 + i * 1.3) * .5, .35); ctx.restore(); }));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  weatherDraw(t); tagsDraw(t); workRing(); shipTag(); jetGauge(); stickDraw();
}
function drawBeam(t, LW) {
  const p = SF.p; if (!p.aim || p.hidden) return;
  const sx = p.x + p.face * .05, sy = p.y - 1.12 - p.alt, aw = Math.atan2(p.aim[1] - sy, p.aim[0] - sx);
  const bx = sx + Math.cos(aw) * .8, by = sy + Math.sin(aw) * .8, [tx, ty] = p.aim;
  ctx.save(); ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (SF.target && SF.target.kind === 'creature') {
    const nx = -(ty - by), ny = tx - bx, nl = Math.hypot(nx, ny) || 1, w = .7;
    ctx.setLineDash([.25, .22]); ctx.lineDashOffset = -t * 2; ctx.lineWidth = LW;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx + nx / nl * w, ty + ny / nl * w); ctx.moveTo(bx, by); ctx.lineTo(tx - nx / nl * w, ty - ny / nl * w); ctx.stroke();
    ctx.setLineDash([]); const k = (t * 1.5) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(tx, ty, .4 + k * .6, 0, TAU); ctx.stroke();
  } else {
    const n = 9, nx = -(ty - by), ny = tx - bx, nl = Math.hypot(nx, ny) || 1;
    ctx.beginPath(); ctx.moveTo(bx, by);
    for (let i = 1; i < n; i++) { const u = i / n, j = (Math.random() - .5) * .22; ctx.lineTo(lerp(bx, tx, u) + nx / nl * j, lerp(by, ty, u) + ny / nl * j); }
    ctx.lineTo(tx, ty); ctx.lineWidth = LW * 1.6; ctx.stroke();
    ctx.lineWidth = LW; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 9, r = .15 + Math.random() * .25; ctx.moveTo(tx + Math.cos(a) * .1, ty + Math.sin(a) * .1); ctx.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r); } ctx.stroke();
  }
  ctx.restore();
}
function drawParts(LW) {
  const D = SF.parts.filter(q => q.k === 'dust'), rad = q => { const u = q.t / q.life; return (q.r + q.g * Math.sqrt(u)) * (u > .6 ? Math.max(0, 1 - (u - .6) / .4) : 1); };
  const dy = q => q.rise ? -1.4 - q.t * 1.3 : q.lift ? -q.lift + q.t * .8 : 0;
  // dust clouds merge like Ink Rally's: every outline first, then every fill
  if (D.length) {
    ctx.fillStyle = '#000'; ctx.beginPath(); D.forEach(q => { const r = rad(q) + LW; ctx.moveTo(q.x + r, q.y + dy(q)); ctx.arc(q.x, q.y + dy(q), r, 0, TAU); }); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); D.forEach(q => { const r = rad(q); ctx.moveTo(q.x + r, q.y + dy(q)); ctx.arc(q.x, q.y + dy(q), r, 0, TAU); }); ctx.fill();
  }
  ctx.fillStyle = '#000';
  SF.parts.forEach(q => { if (q.k !== 'chip') return; ctx.save(); ctx.translate(q.x, q.y - q.z); ctx.rotate(q.rot); ctx.fillRect(-q.r / 2, -q.r / 2, q.r, q.r); ctx.restore(); });
}
function weatherDraw(t) {
  const wx = SF.pl.wx, storm = SF.storm.on > 0;
  if (!SF.wp.length) for (let i = 0; i < 90; i++) SF.wp.push({ x: Math.random(), y: Math.random(), s: .5 + Math.random() });
  const n = wx === 'calm' ? 10 : wx === 'stormy' ? (storm ? 90 : 8) : 40;
  ctx.save(); ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const q = SF.wp[i];
    if (wx === 'frozen') { const y = (q.y * H + t * 28 * q.s) % H, x = (q.x * W + Math.sin(t + i) * 12 - cam.x * 4) % W; ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc((x + W) % W, y, 1.3 * q.s, 0, TAU); ctx.fill(); }
    else if (wx === 'toxic') { const y = (q.y * H + t * 70 * q.s) % H, x = ((q.x * W - cam.x * 4) % W + W) % W; ctx.globalAlpha = .35; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6 * q.s); ctx.stroke(); }
    else if (wx === 'scorched') { const y = H - (q.y * H + t * 22 * q.s) % H, x = ((q.x * W - cam.x * 4) % W + W) % W; ctx.globalAlpha = .25; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 4, x, y - 8); ctx.quadraticCurveTo(x - 3, y - 12, x, y - 16); ctx.stroke(); }
    else if (wx === 'stormy' && storm) { const y = (q.y * H + t * 520 * q.s) % H, x = ((q.x * W + t * 160 - cam.x * 4) % W + W) % W; ctx.globalAlpha = .55; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke(); }
    else { const y = (q.y * H + Math.sin(t * .5 + i) * 10) % H, x = ((q.x * W + t * 6 * q.s - cam.x * 4) % W + W) % W; ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function pill(x, y, text, solid) {
  ctx.font = '800 11.5px Figtree, system-ui, sans-serif'; const w = ctx.measureText(text).width + 16, h = 21;
  ctx.fillStyle = '#000'; rrect(ctx, x - w / 2 + 2, y - h + 3, w, h, h / 2); ctx.fill();
  rrect(ctx, x - w / 2, y - h, w, h, h / 2); ctx.fillStyle = solid ? '#000' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.fillStyle = solid ? '#fff' : '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + .5);
}
// the tag at the edge of the screen that points home
function edgeTag(wx, wy, text, solid) {
  const [sx, sy] = toScreen(wx, wy), top = 195, bot = H - 150, cx = W / 2, cy = H * CAMY;
  if (sx > 24 && sx < W - 24 && sy > top - 30 && sy < bot + 30) return false;
  const dx = sx - cx, dy = sy - cy, k = Math.min(Math.abs((W / 2 - 48) / (dx || 1e-6)), Math.abs(((dy < 0 ? cy - top : bot - cy)) / (dy || 1e-6)));
  const x = cx + dx * k, y = cy + dy * k, a = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(x + Math.cos(a) * 20, y + Math.sin(a) * 20 + 10); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -7); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  pill(x, y + 20, text, solid);
  return true;
}
function shipTag() {
  if (SF.p.hidden || SF.ship.phase !== 'rest') return;
  edgeTag(0, -1.5, 'Ship · ' + Math.round(Math.hypot(SF.p.x, SF.p.y)) + ' m', false);
}
function tagsDraw(t) {
  // what a place is, when you're standing near it
  SF.pois.forEach(o => { if (o.used && o.k !== 'cave') return; if (Math.hypot(o.x - SF.p.x, o.y - SF.p.y) > (o.k === 'chart' ? 5 : 9)) return; const [x, y] = toScreen(o.x, o.y - POI_H[o.k] - .6); pill(x, y, POI_NAME[o.k], false); });
  if (S.t > SF.tagUntil) return;
  ctx.save(); ctx.globalAlpha = clamp(SF.tagUntil - S.t, 0, 1);
  const p = SF.p, named = G.scanned[SF.pl.key] || [];
  SF.objs.forEach(o => {
    if (o.k !== 'shard') return; const d = Math.hypot(o.x - p.x, o.y - p.y); if (d > 60) return;
    if (!edgeTag(o.x, o.y - 1.5, 'Shards · ' + Math.round(d) + ' m', true)) { const [x, y] = toScreen(o.x, o.y - objHeight(o) - .3); pill(x, y, 'Warp shards', true); }
  });
  SF.pois.forEach(o => {
    const d = Math.hypot(o.x - p.x, o.y - p.y); if (o.used || d > (o.k === 'chart' ? CHART_SENSE : 70)) return;
    if (!edgeTag(o.x, o.y - 1.5, POI_NAME[o.k] + ' · ' + Math.round(d) + ' m', false)) { const [x, y] = toScreen(o.x, o.y - POI_H[o.k] - .6); pill(x, y, POI_NAME[o.k], false); }
  });
  SF.cr.forEach(c => {
    if (named.includes(c.sp.idx) || Math.hypot(c.x - p.x, c.y - p.y) > 40) return;
    const [x, y] = toScreen(c.x, c.y - speciesHeight(c.sp) - .3); if (x < 0 || x > W || y < 0 || y > H) return;
    ctx.beginPath(); ctx.arc(x + 2, y - 8, 11, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 10, 11, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = 'italic 900 15px Fraunces, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y - 9);
  });
  ctx.restore();
}
function workRing() {
  const T = SF.target; if (!T || !SF.work || (T.kind !== 'obj' && T.kind !== 'creature')) return;
  const u = clamp(SF.work / workNeed(T), 0, 1), top = T.kind === 'obj' ? objHeight(T.o) : speciesHeight(T.o.sp);
  const [x, y] = toScreen(T.o.x, T.o.y - top - .5);
  ctx.beginPath(); ctx.arc(x + 2, y + 2.5, 12, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + u * TAU); ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill();
  if (T.kind === 'creature') pill(x, y - 16, 'Scanning', false);
}
function stickDraw() {
  const q = IN.ptr; if (!q) return;
  // holding still: a ring fills under your thumb until the jetpack fires
  if (!q.drag) { const u = clamp((performance.now() - q.t) / 1000 / JET_HOLD, 0, 1); if (u < .25 && !q.jet) return;
    ctx.beginPath(); ctx.arc(q.sx, q.sy, 26, -Math.PI / 2, -Math.PI / 2 + u * TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
    if (q.jet) { ctx.beginPath(); ctx.arc(q.sx, q.sy, 26 + (S.t * 30) % 10, 0, TAU); ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]); }
    return; }
  ctx.beginPath(); ctx.arc(q.sx, q.sy, 46, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = '#000'; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
  const dx = q.x - q.sx, dy = q.y - q.sy, m = Math.hypot(dx, dy), k = m > 46 ? 46 / m : 1;
  ctx.beginPath(); ctx.arc(q.sx + dx * k + 2, q.sy + dy * k + 3, 17, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
  ctx.beginPath(); ctx.arc(q.sx + dx * k, q.sy + dy * k, 17, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
}

/* ---------- walking round things ---------- */
function blockAt(x, y, rad) { for (const b of SF.blocks) { if (!b.walk && ((x - b.x) / (b.rx + rad)) ** 2 + ((y - b.y) / (b.ry + rad)) ** 2 < 1) return b; } return null; }
// move o by dx,dy; if that runs into something, slide round its edge instead of stopping dead
function walkBy(o, rad, dx, dy) {
  let nx = o.x + dx, ny = o.y + dy, b = blockAt(nx, ny, rad);
  if (b) {
    const rx = b.rx + rad, ry = b.ry + rad, gx = (nx - b.x) / (rx * rx), gy = (ny - b.y) / (ry * ry), gl = Math.hypot(gx, gy) || 1;
    let tx = -gy / gl, ty = gx / gl; const along = tx * dx + ty * dy, m = Math.hypot(dx, dy);
    if (o.slideB !== b || !o.side) { o.slideB = b; o.side = along < 0 ? -1 : 1; } // pick a side on first touch
    else if (Math.abs(along) > m * .5 && Math.sign(along) !== o.side) o.side = -o.side; // a clear push the other way
    tx *= o.side; ty *= o.side;
    nx = o.x + tx * m; ny = o.y + ty * m;
    b = blockAt(nx, ny, rad);
    if (b) { const ex = nx - b.x, ey = ny - b.y, q = (ex / (b.rx + rad)) ** 2 + (ey / (b.ry + rad)) ** 2, k = 1 / Math.sqrt(q || 1); nx = b.x + ex * k * 1.001; ny = b.y + ey * k * 1.001; }
  }
  else o.slideB = null;
  o.x = nx; o.y = ny;
}

/* ---------- places to find ---------- */
function usePoi(o) {
  if (o.k === 'chart') { if (!o.used) foundChart(o); return; }
  if (o.k === 'cave') { hint('You shelter in the cave. Your shield recharges here.', 3500); return; }
  if (o.used) { hint(o.k === 'monolith' ? 'The monolith has nothing more to say.' : 'Nothing left here.', 3000); return; }
  o.used = true; (G.dep[SF.pl.key] = G.dep[SF.pl.key] || []).push(o.id);
  G.stats.finds = (G.stats.finds || 0) + 1;
  const r = RNG(o.sd, 'loot'), got = {};
  if (o.k === 'wreck') { got.ferrite = ri(r, 10, 18); got.shard = ri(r, 5, 10); }
  else if (o.k === 'pod') { got.carbon = ri(r, 8, 14); got.sodium = ri(r, 8, 14); }
  else got.shard = 10;
  const [x, y] = toScreen(o.x, o.y - POI_H[o.k]);
  Object.keys(got).forEach((k, i) => { G.inv[k] += got[k]; setTimeout(() => floatAt(x, y + i * 22, '+' + got[k] + ' ' + RES[k].name.toLowerCase(), k === 'shard'), i * 250); });
  updRes(Object.keys(got)[0]); dust(o.x, o.y, 4, 2); saveRun(); setTimeout(checkGoals, 900);
  if (o.k === 'monolith') {
    sheet(`<p class="evn">${SF.pl.name}</p><h2>A monolith</h2><p class="story">${MONOLITH[o.sd % MONOLITH.length]}</p><p>+10 warp shards</p><button class="btn" id="okBtn">Walk on</button>`);
    $('okBtn').onclick = closeSheet;
  } else callout(o.k === 'wreck' ? 'Salvaged a wreck' : 'Opened a supply pod');
}

/* ---------- birds ---------- */
function newFlock(anywhere) {
  const a = Math.random() * TAU, d = anywhere ? Math.random() * PLANET_R * .7 : PLANET_R + 20, n = 4 + Math.floor(Math.random() * 4);
  const head = anywhere ? Math.random() * TAU : a + Math.PI + (Math.random() - .5) * .8;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, head, alt: 7 + Math.random() * 3, birds: Array.from({ length: n }, (_, i) => [(i % 2 ? 1 : -1) * Math.ceil(i / 2) * .9, Math.ceil(i / 2) * .7]) };
}
function flocksStep(dt) {
  SF.flocks.forEach((f, i) => {
    f.head += Math.sin(S.t * .3 + i) * dt * .15; f.x += Math.cos(f.head) * 5 * dt; f.y += Math.sin(f.head) * 5 * dt;
    if (Math.hypot(f.x, f.y) > PLANET_R + 30) SF.flocks[i] = newFlock(false);
  });
}

/* ---------- the jetpack ---------- */
function jetStep(dt) {
  const p = SF.p, q = IN.ptr, k = IN.keys;
  // a still press held long enough fires it (a quick one is a tap; a drag first is walking)
  if (q && !q.drag && !q.jet && performance.now() - q.t > JET_HOLD * 1000) { q.jet = true; setTarget(null); }
  const want = (q && q.jet) || k.Shift || k.j;
  p.jetting = want && !SF.jetEmpty && SF.jet > 0;
  if (p.alt > .5) { const b = blockAt(p.x, p.y, 0); if (b && b.k === 'mesa') goalSet('cliff'); }
  if (p.jetting) {
    if (p.alt === 0) { dust(p.x, p.y, 3); p.vz = 3; tipOnce('jetDone', 'Your jetpack refills once you land. Watch the gauge beside you.', 5000); }
    SF.jet = Math.max(0, SF.jet - JET_BURN * dt); p.vz += 26 * dt; SF.jetRest = 0;
    if (SF.jet <= 0) SF.jetEmpty = true;
  }
  p.vz -= 14 * dt; p.alt += p.vz * dt;
  if (p.alt > JET_TOP) { p.alt = JET_TOP; p.vz = Math.min(p.vz, 0); }
  if (p.alt <= 0) {
    if (p.vz < -2.5) { dust(p.x, p.y, 4, 1.4); p.hop = .2; SF.shake = 2; }
    p.alt = 0; p.vz = 0;
    // came down on a boulder or in a pool: step off to the nearest edge
    const b = blockAt(p.x, p.y, .35);
    if (b) { const ex = p.x - b.x || .01, ey = p.y - b.y, k2 = 1 / Math.sqrt((ex / (b.rx + .35)) ** 2 + (ey / (b.ry + .35)) ** 2); p.x = b.x + ex * k2 * 1.01; p.y = b.y + ey * k2 * 1.01; }
  }
  if (p.alt === 0 && !p.jetting) { if ((SF.jetRest += dt) > .4) SF.jet = Math.min(100, SF.jet + JET_FILL * dt); if (SF.jet >= 25) SF.jetEmpty = false; }
  if (p.jetting && Math.random() < dt * 25) SF.parts.push({ k: 'dust', x: p.x - p.face * .37 + (Math.random() - .5) * .2, y: p.y + .01, t: 0, life: .5, r: .08, g: .25, lift: p.alt + .7 });
}
// a little upright gauge beside the explorer whenever the jetpack isn't full
function jetGauge() {
  const p = SF.p; if (p.hidden || SF.jet >= 100) return;
  const [x, y] = toScreen(p.x + .75, p.y - 1.5 - p.alt), h = 34, w = 8;
  ctx.fillStyle = '#000'; rrect(ctx, x + 2, y - h / 2 + 3, w, h, 4); ctx.fill();
  rrect(ctx, x, y - h / 2, w, h, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000';
  if (SF.jetEmpty) ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  const f = (h - 4) * SF.jet / 100; ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + h / 2 - 2 - f, w - 4, f);
}

/* ---------- mining and scanning by themselves ---------- */
// an unnamed creature within scanning range comes first (they wander off); otherwise the nearest thing within reach
function autoTarget() {
  const p = SF.p, named = G.scanned[SF.pl.key] || [], sr = scanRange();
  let best = null, bd = 1e9;
  SF.cr.forEach(c => { if (named.includes(c.sp.idx)) return; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < sr && d < bd) { bd = d; best = { kind: 'creature', o: c, auto: true }; } });
  if (best) return best;
  SF.objs.forEach(o => { if (Math.abs(o.x - p.x) > 3 || Math.abs(o.y - p.y) > 3) return; const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < 2.2 && d < bd) { bd = d; best = { kind: 'obj', o, auto: true }; } });
  return best;
}

/* ---------- each planet's goals ---------- */
const goalRec = key => (G.goals[key] = G.goals[key] || { done: [] });
// how far along a goal is, on any planet (the star chart asks too)
function goalHave(pl, g) {
  if (g.id === 'species') return namedOn(pl);
  if (g.id === 'finds') return (G.dep[pl.key] || []).filter(id => id >= 1000 && id < CHART_ID).length;
  return (G.goals[pl.key] || {})[g.id] || 0;
}
function goalBump(id, n = 1) { if (!n || !SF.goals.some(g => g.id === id)) return; const r = goalRec(SF.pl.key); r[id] = (r[id] || 0) + n; checkGoals(); }
function goalSet(id) { const r = goalRec(SF.pl.key); if (r[id] || !SF.goals.some(g => g.id === id)) return; r[id] = 1; checkGoals(); }
function checkGoals(quiet) {
  const pl = SF.pl, rec = goalRec(pl.key); let fresh = null;
  SF.goals.forEach(g => { if (!rec.done.includes(g.id) && goalHave(pl, g) >= g.need) { rec.done.push(g.id); fresh = g; } });
  updGoals(fresh && !quiet);
  if (fresh && !quiet) setTimeout(() => callout('Goal done', fresh.text), 700);
  if (!quiet && rec.done.length === SF.goals.length && !G.charted[pl.key]) {
    G.charted[pl.key] = 1; G.stats.charted = (G.stats.charted || 0) + 1;
    setTimeout(() => { if (S.mode === 'surface' && !sheetOpen()) planetCharted(); else SF.owed = true; }, 2200);
  }
  saveRun();
}
// the goal bar under the meters: the next thing to do, and how many are done
function updGoals(bump) {
  const gs = SF.goals, rec = goalRec(SF.pl.key), next = gs.find(g => !rec.done.includes(g.id)), bar = $('goalBar');
  $('goalN').textContent = `${rec.done.length}/${gs.length}`;
  $('goalT').textContent = next ? next.text + (next.need > 1 ? ` · ${Math.min(goalHave(SF.pl, next), next.need)}/${next.need}` : '') : 'Planet charted ✓';
  bar.classList.toggle('done', !next);
  if (bump) squash(bar);
}

/* ---------- the hidden star charts ---------- */
function foundChart(o) {
  o.used = true; (G.dep[SF.pl.key] = G.dep[SF.pl.key] || []).push(o.id);
  if (!G.charts.includes(G.sys)) G.charts.push(G.sys);
  dust(o.x, o.y, 5, 2); saveRun();
  const n = G.charts.length, all = J().stars, done = n >= all;
  sheet(`<p class="evn">${SF.pl.name}</p><h2>A star chart</h2>${chartPips()}
    <p class="story">${done ? 'That was the last one. The charts fit together into a map of a galaxy nobody has seen.' : 'A scrap of a much bigger map. It shows stars you have never heard of.'}</p>
    <p>${n} of ${all} found.${done ? ' Reach the core and you can travel on to a new galaxy.' : ' Every star hides one.'}</p><button class="btn" id="okBtn">Keep exploring</button>`);
  $('okBtn').onclick = closeSheet;
}
