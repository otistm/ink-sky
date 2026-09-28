/* =====================================================================
   In orbit: the star system chart, flying to a planet, warping to the
   next star, the core, and the drifting sky behind the home screen.
   Everything here is drawn in screen pixels.
   ===================================================================== */
"use strict";
const SPC = { fly: null, warp: null, core: 0 };
const spaceScale = () => clamp(Math.min(W, H * .7) / 390, .85, 1.5);
const sysCentre = () => [W / 2, H * .47];
// Where everything is on the chart right now. Planets and the station each have their own orbit round the star;
// moons circle their planet. Indexed like curSys().planets, with the station as .station.
function spaceLayout(t) {
  const sy = curSys(), st = sy.station, mains = sy.planets.filter(p => p.moonOf == null), rings = mains.length + 1;
  const [cx, cy] = sysCentre(), sc = spaceScale(), base = 50 * sc, maxR = Math.min(W * .4, H * .33), flat = H > W * 1.4 ? .95 : .55;
  const ring = i => { const rx = base + (i + 1) * (maxR - base) / rings; return [rx, rx * flat]; };
  const L = [];
  mains.forEach(pl => {
    const [rx, ry] = ring(pl.k < st.ring ? pl.k : pl.k + 1), a = pl.look.a0 + t * .05 / (pl.k + 1);
    L[pl.k] = { pl, k: pl.k, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, rx, ry, R: (7 + pl.look.size * 8) * sc };
  });
  sy.planets.forEach(pl => {
    if (pl.moonOf == null) return;
    const par = L[pl.moonOf], d = par.R * (par.pl.look.ring ? 1.9 : 1.3) + 10 * sc, b = pl.look.a0 + t * .3;
    L[pl.k] = { pl, k: pl.k, moon: true, par, orbit: d, x: par.x + Math.cos(b) * d, y: par.y + Math.sin(b) * d * .8, R: 5 * sc };
  });
  const [rx, ry] = ring(st.ring), a = sy.planets[0].look.a0 + 1.2 + t * .03;
  L.station = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, rx, ry, R: 10 * sc };
  return L;
}
function enterSpace() {
  S.mode = 'space'; SPC.fly = null; hudShow('space'); hudSpace(); saveRun();
  setTimeout(() => {
    if (S.mode !== 'space' || sheetOpen()) return;
    if (!tipOnce('space', 'Tap a planet to fly there and land. Landing is free; taking off uses fuel.')) tipOnce('station', 'The ringed station trades your spare carbon, sodium and ferrite for warp shards.');
  }, 900);
}
function hudSpace() {
  const sy = curSys(), last = G.sys + 1 >= J().stars, moons = sy.planets.filter(p => p.moonOf != null).length;
  $('sname').textContent = sy.name;
  $('ssub').textContent = `Star ${G.sys + 1} of ${J().stars} · ${plural(sy.planets.length - moons, 'planet')}${moons ? ', ' + plural(moons, 'moon') : ''}`;
  $('spips').innerHTML = pipsInner();
  $('sFuel').textContent = Math.round(G.fuel); $('sCells').textContent = G.cells; $('sShards').textContent = G.inv.shard;
  $('warpBtn').classList.toggle('dim', G.cells < 1);
  $('warpSub').textContent = G.cells ? (last ? 'To the core' : 'To the next star') : 'Needs a warp cell';
}
const dockSpot = L => [L.station.x + L.station.R * 2.2, L.station.y + L.station.R * .4];
function shipSpot(L) {
  if (G.dock) return dockSpot(L);
  if (G.at >= 0 && L[G.at]) { const p = L[G.at]; return [p.x + p.R + 16, p.y - p.R - 6]; }
  const [cx, cy] = sysCentre(); return [Math.max(34, cx - Math.min(W * .4, H * .33) - 8), cy + 40];
}
function spaceTap(x, y) {
  if (S.mode !== 'space' || SPC.fly) return;
  const L = spaceLayout(S.t);
  let best = -1, bd = 1e9;
  L.forEach(p => { const d = Math.hypot(p.x - x, p.y - y) - (p.moon ? 6 : 0); if (d < Math.max(p.R, 12) + 20 && d < bd) { bd = d; best = p.k; } });
  const ds = Math.hypot(L.station.x - x, L.station.y - y);
  if (ds < L.station.R * 2 + 12 && ds < bd) { if (G.dock) stationSheet(); else flyTo('station'); return; }
  if (best >= 0) planetSheet(best);
}
function planetSheet(k) {
  const sy = curSys(), pl = sy.planets[k], w = WEATHER[pl.wx], seen = G.seen[pl.key], moon = pl.moonOf != null;
  const watchDesc = ['They leave you alone.', 'A few, and slow to notice.', 'They notice greedy mining.', 'They come in numbers. Mine carefully.'][pl.watch];
  // what the ship's scanner can make out from orbit
  const L = planetLayout(pl), dep = G.dep[pl.key] || [], count = {};
  L.pois.forEach(o => { count[o.k] = (count[o.k] || 0) + 1; });
  const finds = ['wreck', 'pod', 'monolith', 'cave'].filter(k => count[k]).map(k => count[k] === 1 ? 'a ' + POI_NAME[k].toLowerCase() : count[k] + ' ' + POI_NAME[k].toLowerCase() + 's').join(', ');
  const looked = L.pois.filter(o => o.k !== 'cave' && dep.includes(o.id)).length, lookable = L.pois.filter(o => o.k !== 'cave').length;
  const lifeRow = !pl.fauna.length ? `<div class="nm">No life<small>Rock, dust and warp shards. Nothing to name.</small></div>`
    : `<div class="nm">${seen ? `${namedOn(pl)} of ${pl.fauna.length} species named` : `${plural(pl.fauna.length, 'species', 'species')} to find`}<small>${seen ? 'Name them all for an upgrade.' : 'Nobody has walked here yet.'}</small></div>`;
  sheet(`<div class="relicHead"><img class="sid pimg" src="${planetThumb(pl)}" alt=""><div><p class="evn">${moon ? 'A moon of ' + sy.planets[pl.moonOf].name : `Planet ${k + 1} of ${sy.planets.filter(p => p.moonOf == null).length}`}${k === G.at ? ' · you were here' : ''}</p><h2>${pl.name}</h2></div></div>
    <div class="board">
      <div class="row"><div class="nm">${w.name}<small>${w.desc}</small></div><span class="ic">${ICON[pl.wx]}</span></div>
      <div class="row"><div class="nm">Watchers: ${WATCH[pl.watch].toLowerCase()}<small>${watchDesc}</small></div><span class="ic">${ICON.eye}</span></div>
      <div class="row">${lifeRow}<span class="ic">${ICON.species}</span></div>
      <div class="row"><div class="nm">Places to find<small>${finds ? finds[0].toUpperCase() + finds.slice(1) : 'Nothing much'}${seen && lookable ? ` · ${looked} of ${lookable} looked at` : ''}</small></div><span class="ic">${ICON.wreck}</span></div>
      <div class="row"><div class="nm">Warp shards<small>${pl.spires >= 5 ? 'Plenty of black spires' : pl.spires >= 3 ? 'A few black spires' : 'Hardly any spires'}</small></div><span class="ic">${ICON.shard}</span></div>
    </div>
    <button class="btn" id="landBtn">${k === G.at && !G.dock ? 'Land again' : 'Fly there and land'}</button><button class="btn ghost" id="stayBtn">Stay in orbit</button>`);
  $('landBtn').onclick = () => { closeSheet(); flyTo(k); };
  $('stayBtn').onclick = closeSheet;
}
function flyTo(k) {
  const L = spaceLayout(S.t), [x, y] = shipSpot(L);
  SPC.fly = { k, t: 0, x, y, dur: k === G.at && !G.dock ? .35 : 1.1 };
}
function warpNow() {
  if (S.mode !== 'space' || SPC.fly || sheetOpen()) return;
  if (G.cells < 1) { nope($('warpBtn')); hint(`You need a warp cell. Build one on your ship from ${WARP_COST} warp shards.`); return; }
  G.cells--; S.mode = 'warp'; SPC.warp = { t: 0, done: false }; hudShow(null); hint(null);
  callout('Warping', G.sys + 1 >= J().stars ? 'To the core' : 'To the next star');
}
function arrive() {
  G.sys++; G.at = -1; G.stats.warps = (G.stats.warps || 0) + 1;
  if (G.sys >= J().stars) { reachCore(); return; }
  enterSpace(); starSheet();
}
function spaceStep(dt) {
  if (SPC.fly) {
    const f = SPC.fly; f.t += dt / f.dur;
    if (f.t >= 1 && f.k === 'station') { SPC.fly = null; G.dock = true; saveRun(); stationSheet(); }
    else if (f.t >= 1 && !S.wipe) { const p = spaceLayout(S.t)[f.k]; G.at = f.k; G.dock = false; f.t = 1; wipe(p.x, p.y, () => { SPC.fly = null; landOn(f.k, true); }); }
  }
  if (S.mode === 'warp' && SPC.warp) { SPC.warp.t += dt; if (SPC.warp.t > 2.2 && !SPC.warp.done) { SPC.warp.done = true; arrive(); } }
  if (S.mode === 'core') SPC.core += dt;
}

/* ---------- drawing ---------- */
function starfield(t, seed) {
  const r = RNG(seed, 'stars');
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
  for (let i = 0; i < 80; i++) { const x = r() * W, y = r() * H, s = .6 + r() * 1.1; ctx.globalAlpha = .35 + r() * .4; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, k = (3 + r() * 3) * (RM ? 1 : .6 + .4 * Math.sin(t * (1 + r()) + i)); ctx.beginPath(); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.moveTo(x, y - k); ctx.lineTo(x, y + k); ctx.stroke(); }
}
function drawSun(x, y, R, t) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
  ctx.save(); ctx.rotate(t * .08); ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, l = i % 2 ? 1.5 : 1.8; ctx.moveTo(Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25); ctx.lineTo(Math.cos(a) * R * l, Math.sin(a) * R * l); }
  ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(3.5, 4, R, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R * .62, 0, TAU); ctx.setLineDash([3, 4]); ctx.lineDashOffset = -t * 4; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * .22, 0, TAU); ctx.fill();
  ctx.restore();
}
function spaceShip(x, y, face, sc, flame) {
  ctx.save(); ctx.translate(x, y + 7 * sc); const z = 5.2 * sc; ctx.scale(z * face, z); drawShip(ctx, 2.2 / z, { legs: 0, flame: flame || 0 }); ctx.restore();
}
function spaceDraw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  if (S.mode === 'warp') { warpDraw(t); return; }
  starfield(t, G ? G.seed + ':' + G.sys : 'core');
  if (S.mode === 'core') { coreDraw(t); return; }
  const L = spaceLayout(t), [cx, cy] = sysCentre(), sc = spaceScale(), sy = curSys();
  ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
  L.forEach(p => { if (!p.moon) { ctx.beginPath(); ctx.ellipse(cx, cy, p.rx, p.ry, 0, 0, TAU); ctx.stroke(); } });
  ctx.setLineDash([1, 5]); ctx.beginPath(); ctx.ellipse(cx, cy, L.station.rx, L.station.ry, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.setLineDash([1.5, 4]); L.forEach(p => { if (p.moon) { ctx.beginPath(); ctx.ellipse(p.par.x, p.par.y, p.orbit, p.orbit * .8, 0, 0, TAU); ctx.stroke(); } });
  ctx.restore();
  const back = L.filter(p => p.y < cy).sort((a, b) => a.y - b.y), front = L.filter(p => p.y >= cy).sort((a, b) => a.y - b.y);
  const planet = p => {
    ctx.save(); ctx.translate(p.x, p.y); drawPlanet(ctx, p.pl, p.R, t, 2.2); ctx.restore();
    const seen = G.seen[p.pl.key], all = seen && p.pl.fauna.length && namedOn(p.pl) === p.pl.fauna.length;
    if (p.moon) return; // moons go unlabelled: their planet's label counts them
    const moons = L.filter(m => m && m.moon && m.par === p).length;
    const name = p.pl.name + (all ? ' ✓' : ''), note = WEATHER[p.pl.wx].name + (seen ? ` · ${namedOn(p.pl)}/${p.pl.fauna.length}` : '') + (moons ? ` · ${plural(moons, 'moon')}` : '');
    const f1 = `italic 900 ${Math.round(14 * sc)}px Fraunces, Georgia, serif`, f2 = `700 ${Math.round(11 * sc)}px Figtree, system-ui, sans-serif`;
    ctx.font = f1; const half = ctx.measureText(name).width / 2 + 6, lx = clamp(p.x, half, W - half); // labels stay on screen
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#000'; ctx.fillText(name, lx, p.y + p.R + 7);
    ctx.font = f2; ctx.fillStyle = '#5c5c5c'; ctx.fillText(note, lx, p.y + p.R + 7 + 16 * sc);
  };
  // the trading station
  const stn = L.station; ctx.save(); ctx.translate(stn.x, stn.y); drawStation(ctx, stn.R, t, 2); ctx.restore();
  ctx.font = `italic 900 ${Math.round(12 * sc)}px Fraunces, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#000';
  { const nm = sy.station.name, half = ctx.measureText(nm).width / 2 + 6; ctx.fillText(nm, clamp(stn.x, half, W - half), stn.y + stn.R + 8); }
  back.forEach(planet);
  drawSun(cx, cy, 20 * sc, t);
  if (sy.twin) { const a = t * .4; drawSun(cx + Math.cos(a) * 34 * sc, cy + Math.sin(a) * 18 * sc, 8 * sc, t); }
  front.forEach(planet);
  // your ship
  let [x, y] = shipSpot(L), face = 1, flame = 0;
  if (SPC.fly) {
    const f = SPC.fly, dock = f.k === 'station', to = dock ? dockSpot(L) : [L[f.k].x, L[f.k].y], u = clamp(f.t, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const k = dock ? 1 : 1 - e * .9; x = lerp(f.x, to[0], e); y = lerp(f.y, to[1], e) - Math.sin(u * Math.PI) * 30;
    face = to[0] >= f.x ? 1 : -1; flame = 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); spaceShip(0, 0, face, sc, flame); ctx.restore();
  } else spaceShip(x, y + Math.sin(t * 2) * 2, 1, sc, 0);
}
function warpDraw(t) {
  const u = clamp(SPC.warp.t / 2.2, 0, 1), cx = W / 2, cy = H / 2, r = RNG('warp'), maxD = Math.hypot(W, H) * .6;
  ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const a = r() * TAU, sp = .5 + r(), d0 = r() * maxD, d = (d0 + u * u * 1600 * sp) % maxD, len = 3 + u * u * 240 * sp;
    ctx.lineWidth = 1 + sp * 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.lineTo(cx + Math.cos(a) * (d + len), cy + Math.sin(a) * (d + len)); ctx.stroke();
  }
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 4 + u * 10, 0, TAU); ctx.fill();
  spaceShip(cx, cy + 40 - u * 30, 1, spaceScale() * (1 - u * .5), 1);
  if (u > .82) { ctx.fillStyle = '#fff'; ctx.globalAlpha = (u - .82) / .18; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
// the core of the galaxy: a solid black heart with the stars spiralling in
function coreDraw(t) {
  const cx = W / 2, cy = H * (sheetOpen() ? .14 : .4), sc = spaceScale(), R = (sheetOpen() ? 30 : 42) * sc;
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) { ctx.save(); ctx.rotate(t * (.1 + k * .04) * (k % 2 ? -1 : 1)); ctx.setLineDash([4 + k * 3, 6 + k * 2]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, R * (1.5 + k * .55), R * (1.5 + k * .55) * .42, .2, 0, TAU); ctx.stroke(); ctx.restore(); }
  ctx.setLineDash([]); ctx.fillStyle = '#000';
  for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 26; i++) { const u = ((i / 26) + t * .05) % 1, a = arm / 3 * TAU + u * 7 + t * .2, d = R * (4.2 - u * 3); ctx.globalAlpha = u; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * .5, 1 + u * 1.5, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(0, 0, R * 1.18, 0, TAU); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.restore();
}
// the home screen's sky: a ringed planet turning slowly, a moon, and now and then a ship going by
const TITLE_PL = { seed: 'title', wx: 'calm', look: { ring: true, size: 1, tilt: -.28 } };
const TITLE_MOON = { seed: 'moon', wx: 'scorched', look: { ring: false, size: .5, tilt: 0 } };
function titleDraw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  starfield(t, 'title');
  const land = W > H, cx = land ? W * .28 : W / 2, cy = land ? H / 2 : H * .2, R = Math.min(land ? H * .2 : W * .2, 110);
  const ma = t * .35, mx = cx + Math.cos(ma) * R * 2.1, my = cy + Math.sin(ma) * R * .7;
  const moon = () => { ctx.save(); ctx.translate(mx, my); drawPlanet(ctx, TITLE_MOON, R * .2, t, 2); ctx.restore(); };
  if (Math.sin(ma) < 0) moon();
  ctx.save(); ctx.translate(cx, cy + (RM ? 0 : Math.sin(t * .8) * 4)); drawPlanet(ctx, TITLE_PL, R, t * 3, 2.4); ctx.restore();
  if (Math.sin(ma) >= 0) moon();
  const u = (t % 14) / 14; if (!RM && u < .5) spaceShip(lerp(-60, W + 60, u * 2), cy + R * 1.2 - u * 40, 1, .8, 1);
}
