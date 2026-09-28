/* =====================================================================
   Screens and cards: home, the journey intro, arriving at a star, pause,
   the catalog, your ship, upgrades, a failed suit, and the core.
   ===================================================================== */
"use strict";
const CORE_PIP = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="10" cy="10" r="5" fill="#000"/></svg>';
function pipsInner() {
  const n = J().stars; let h = '';
  for (let i = 0; i < n; i++) h += `<i class="${i < G.sys ? 'done' : i === G.sys ? 'now' : ''}${G.charts.includes(i) ? ' star' : ''}"></i>`;
  return h + `<i class="gap"></i><i class="core${G.sys >= n ? ' now' : ''}">${CORE_PIP}</i>`;
}
const pipsHTML = () => `<div class="prog">${pipsInner()}</div>`;
// one star per star chart: solid once found
const chartPips = () => `<div class="charts">${Array.from({ length: J().stars }, (_, i) => `<i class="${G.charts.includes(i) ? 'on' : ''}">${ICON.chart}</i>`).join('')}</div>`;

/* ---------- home ---------- */
function renderTitle() {
  S.mode = 'title'; hudShow(null); show('title'); closeSheet(); hint(null);
  const run = loadRun(), box = $('jlist'); box.innerHTML = '';
  // show every journey you've opened, plus the next locked one
  let reach = save.trophies.indexOf(false); if (reach < 0) reach = JOURNEYS.length;
  JOURNEYS.forEach((jr, j) => {
    if (j > reach + 1) return;
    const locked = j > 0 && !save.trophies[j - 1], won = save.trophies[j];
    const b = document.createElement('button'); b.className = 'event' + (locked ? ' locked' : ''); b.style.animationDelay = (j * 90) + 'ms';
    const saved = run && run.j === j ? `<span class="saved"><strong>Saved at star ${run.sys + 1} of ${runJ(run).stars}${run.gal ? ' in ' + runJ(run).name : ''}.</strong> Tap to carry on.</span>` : '';
    b.innerHTML = `<div class="tw-wrap">${locked ? ICON.lock : TROPHY(won)}<small>${ROMAN[j]}</small></div>
      <div class="ev"><i>Journey ${ROMAN[j]} · ${jr.stars} stars</i><b>${jr.name}</b><span>${locked ? `Reach the core on ${JOURNEYS[j - 1].name} to open it.` : jr.blurb}</span>${saved}</div>`;
    if (locked) b.setAttribute('aria-disabled', 'true'); else b.onclick = () => pickJourney(j, run);
    box.appendChild(b);
  });
  $('lifetime').textContent = save.species ? `${plural(save.species, 'species', 'species')} named on ${plural(save.planets, 'planet')} so far.${save.galaxies ? ` ${plural(save.galaxies, 'new galaxy', 'new galaxies')} reached.` : ''}` : '';
}
function pickJourney(j, run) {
  const jr = JOURNEYS[j];
  if (run && run.j === j) { resumeRun(run); return; }
  if (run) {
    sheet(`<p class="evn">You're partway through ${JOURNEYS[run.j].name}</p><h2>Start ${jr.name}?</h2><p>Your other journey will be lost.</p>
      <button class="btn" id="fresh">Start ${jr.name}</button><button class="btn ghost" id="keep">Keep my journey</button>`);
    $('fresh').onclick = () => { closeSheet(); startJourney(j); };
    $('keep').onclick = closeSheet;
    return;
  }
  startJourney(j);
}
function startJourney(j) { newRun(j); landOn(0, false); introSheet(); }
function resumeRun(r) {
  G = r;
  try { if (G.where === 'surface' && G.at >= 0) landOn(G.at, false); else enterSpace(); }
  catch (e) { console.error(e); clearRun(); return false; }
  callout('Welcome back', G.where === 'surface' ? curPlanet().name : curSys().name);
  return true;
}
function introSheet() {
  const jr = J(), pl = curPlanet();
  sheet(`<p class="evn">Journey ${ROMAN[G.j]}</p><h2>${jr.name}</h2>${pipsHTML()}<p class="story">${jr.intro}</p>
    <div class="how"><p><b>Mine ferrite</b> from rocks to fuel your ship.</p><p><b>Build a warp cell</b> from ${WARP_COST} warp shards to jump to the next star.</p><p><b>Name creatures</b> as you go. Reach the core for the trophy.</p><p><b>Every star hides a star chart.</b> Find them all to travel on to a new galaxy.</p></div>
    <button class="btn" id="goBtn">Step out onto ${pl.name}</button>`, false);
  $('goBtn').onclick = () => { closeSheet(); SF.p.hop = .45; landedHello(); setTimeout(() => tipOnce('walk', 'Drag anywhere to walk. Tap something to go to it.'), 1200); };
}
function starSheet() {
  const sy = curSys();
  const fresh = G.gal && G.sys === 0;
  sheet(`<p class="evn">${G.gal ? J().name + ' · ' : ''}Star ${G.sys + 1} of ${J().stars}</p><h2>${sy.name}</h2>${pipsHTML()}<p class="story">${fresh ? 'A new galaxy. The stars are packed closer here, with more worlds round each one, and none of them on any map but yours.' : sy.lore}</p>
    <p>${plural(sy.planets.filter(q => q.moonOf == null).length, 'planet')}${sy.planets.some(q => q.moonOf != null) ? ' and ' + plural(sy.planets.filter(q => q.moonOf != null).length, 'moon') : ''} circle this star. Nobody has named anything here.</p><button class="btn" id="goBtn">Look around</button>`, false);
  $('goBtn').onclick = closeSheet;
}
function howTo() {
  sheet(`<h2>How to play</h2><p>Explore planets, name what lives there, and warp star to star until you reach the core.</p>
    <div class="how">
      <p><b>Press and hold</b> anywhere to fire your jetpack, and drag while you hold to fly over things. It refills on the ground.</p>
      <p><b>Walk</b> by dragging anywhere. Walk up to rocks, plants and crystals and you mine them; walk near creatures and you scan them. <b>Tap</b> something to walk to it.</p>
      <p><b>Ferrite</b> from rocks fuels your ship. <b>Carbon</b> from plants refills your life. <b>Sodium</b> from spiky bulbs recharges your shield. Tap them at the bottom to use them.</p>
      <p><b>Warp shards</b> come from black spires, new species and watchers. ${WARP_COST} build a warp cell, and a warp cell jumps you to the next star.</p>
      <p><b>Wrecks and supply pods</b> hold supplies, <b>monoliths</b> have things to tell you, and <b>caves</b> shelter you from bad weather.</p>
      <p><b>Stations</b> circle every star. Dock to trade spare carbon, sodium and ferrite for warp shards.</p>
      <p><b>Star charts</b>: every star hides one on one of its worlds. Scan to pick up its faint signal, then search. Find them all on a journey and the core opens the way to a new galaxy, with more planets to explore.</p>
      <p><b>Watchers</b> float in when you mine too greedily. Tap them to shoot them down, or run for your ship.</p>
      <p><b>Goals:</b> every planet has a few things to do, shown under your meters. Finish them all to chart the planet and pick a suit upgrade.</p>
    </div><button class="btn" id="okBtn">Got it</button>`);
  $('okBtn').onclick = closeSheet;
}

/* ---------- pause and the catalog ---------- */
function showPause() {
  if (!G || sheetOpen() || S.wipe || (S.mode !== 'surface' && S.mode !== 'space')) return;
  if (S.mode === 'surface') { if (SF.ship.phase === 'up') return; if (!SF.p.hidden) { G.px = SF.p.x; G.py = SF.p.y; } }
  saveRun();
  const where = S.mode === 'surface' ? `On ${curPlanet().name}` : `Orbiting ${curSys().name}`;
  sheet(`<p class="evn">${J().name}, star ${G.sys + 1} of ${J().stars}</p><h2>Paused</h2><p>${where}. Your journey is saved. Pick it up from the home screen whenever you like.</p>
    <button class="btn" id="resume">Keep exploring</button><button class="btn ghost" id="catBtn">Catalog</button><button class="btn ghost" id="toHome">Save and go to the home screen</button>`);
  $('resume').onclick = closeSheet;
  $('catBtn').onclick = catalog;
  $('toHome').onclick = () => { closeSheet(); renderTitle(); };
}
function catalog() {
  const rows = [];
  for (let si = 0; si < Math.min(G.sys + 1, J().stars); si++) sysOf(si).planets.forEach(pl => {
    if (!G.seen[pl.key] || !pl.fauna.length) return;
    const named = G.scanned[pl.key] || [];
    rows.push(`<div class="catp"><div class="cath"><img src="${planetThumb(pl)}" alt=""><div><b>${pl.name}</b><small>${WEATHER[pl.wx].name} · ${named.length} of ${pl.fauna.length} named</small></div></div>
      <div class="catg">${pl.fauna.map(sp => named.includes(sp.idx)
        ? `<figure><img src="${creatureThumb(sp, pl.key)}" alt=""><figcaption>${sp.name}</figcaption></figure>`
        : `<figure class="unk"><div>?</div><figcaption>Not yet named</figcaption></figure>`).join('')}</div></div>`);
  });
  sheet(`<h2>Catalog</h2><p>${plural(G.stats.species, 'species', 'species')} named on this journey.</p>${rows.reverse().join('')}<button class="btn" id="catBack">Back</button>`);
  $('catBack').onclick = () => { closeSheet(); showPause(); };
}

/* ---------- your ship ---------- */
function refuel() { const n = Math.min(Math.ceil((FUEL_MAX - G.fuel) / FUEL_PER_FERRITE), G.inv.ferrite); G.inv.ferrite -= n; G.fuel = Math.min(FUEL_MAX, G.fuel + n * FUEL_PER_FERRITE); return n; }
function openShip() {
  if (!G) return;
  const surf = S.mode === 'surface';
  if (surf && (SF.ship.phase !== 'rest' || SF.p.hidden)) return;
  if (!surf && S.mode !== 'space') return;
  const cost = takeoffCost(), fe = G.inv.ferrite, canGo = G.fuel + fe * FUEL_PER_FERRITE >= cost, need = Math.max(0, cost - G.fuel);
  const canFuel = fe > 0 && G.fuel < FUEL_MAX, canCell = G.inv.shard >= WARP_COST;
  const offNote = !need ? `Uses ${cost} fuel` : canGo ? `Refuels with ferrite first, then uses ${cost}` : `Needs ${Math.ceil((need - fe * FUEL_PER_FERRITE) / FUEL_PER_FERRITE)} more ferrite. Mine rocks`;
  sheet(`<p class="evn">${surf ? (G.crash ? 'Crashed on ' : 'Landed on ') + curPlanet().name : 'In orbit around ' + curSys().name}</p><h2>Your ship</h2>
    <div class="board">
      <div class="row"><div class="nm">Launch fuel<small>Taking off uses ${cost}</small><div class="bar fuelbar"><i style="width:${G.fuel}%"></i></div></div><b>${Math.round(G.fuel)}</b></div>
      <div class="row"><div class="nm">Ferrite<small>${FUEL_PER_FERRITE} fuel each</small></div><b>${fe}</b></div>
      <div class="row"><div class="nm">Warp shards<small>${WARP_COST} build a warp cell</small></div><b>${G.inv.shard}</b></div>
      <div class="row${G.cells ? ' me' : ''}"><div class="nm">Warp cells<small>Each one jumps you to the next star</small></div><b>${G.cells}</b></div>
    </div>
    <div class="twobtn"><button class="btn ghost" id="fuelBtn"${canFuel ? '' : ' disabled'}>Refuel</button><button class="btn ghost" id="cellBtn"${canCell ? '' : ' disabled'}>Build a warp cell</button></div>
    ${surf ? `<button class="btn" id="offBtn"${canGo ? '' : ' disabled'}>Take off<small>${offNote}</small></button>` : ''}
    <button class="btn ghost" id="shipClose">${surf ? 'Keep exploring' : 'Close'}</button>`);
  $('fuelBtn').onclick = () => { const n = refuel(); if (surf) updRes(); else hudSpace(); openShip(); callout('+' + n * FUEL_PER_FERRITE + ' fuel'); };
  $('cellBtn').onclick = () => { G.inv.shard -= WARP_COST; G.cells++; if (surf) updRes(); else hudSpace(); saveRun(); openShip(); callout('Warp cell built', surf ? 'Take off, then warp' : 'Tap Warp when you are ready'); };
  if (surf) $('offBtn').onclick = () => { if (G.fuel < cost) refuel(); updRes(); takeOff(); };
  $('shipClose').onclick = closeSheet;
}

/* ---------- upgrades ---------- */
const UP_ICON = { lining: 'sodium', suit: 'carbon', beam: 'ferrite', cutter: 'shard', scanner: 'scan', boots: 'species', thrust: 'fuel', hush: 'eye' };
const dots = (n, max) => `<span class="rar">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
// every goal on a planet done: it's charted, and you pick an upgrade (or take shards once they're all maxed)
function planetCharted() {
  const pool = UPGRADES.filter(u => upL(u.id) < u.max);
  if (!pool.length) {
    G.inv.shard += 20; updRes('shard'); saveRun();
    sheet(`<p class="evn">Every goal on ${SF.pl.name} is done</p><h2>Planet charted</h2><p>Your suit is as good as it gets, so the charts pay 20 warp shards instead.</p><button class="btn" id="okBtn">Walk on</button>`);
    $('okBtn').onclick = closeSheet; return;
  }
  const picks = []; while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  sheet(`<p class="evn">Every goal on ${SF.pl.name} is done</p><h2>Planet charted</h2><p>Pick an upgrade. It lasts for the rest of this journey.</p>
    <div class="shoplist">${picks.map((u, i) => `<button class="srow up" data-i="${i}" style="animation-delay:${i * 80}ms"><div class="sid">${ICON[UP_ICON[u.id]]}</div><div class="sinfo"><b>${u.name}</b><small>${u.desc}</small></div>${dots(upL(u.id), u.max)}</button>`).join('')}</div>`, false);
  $('sheet').querySelectorAll('.srow.up').forEach(b => b.onclick = () => {
    const u = picks[+b.dataset.i]; G.up[u.id] = upL(u.id) + 1; closeSheet(); callout(u.name, 'Level ' + G.up[u.id]); updMeters(true); saveRun();
  });
}

/* ---------- a planet's goals ---------- */
const goalRows = (pl, goals) => goals.map(g => { const have = Math.min(goalHave(pl, g), g.need), done = (G.goals[pl.key] || { done: [] }).done.includes(g.id);
  return `<div class="row goal${done ? ' done' : ''}"><span class="tick">${done ? '✓' : ''}</span><div class="nm">${g.text}${g.note && !done ? `<small>${g.note}</small>` : ''}</div><b>${g.need > 1 ? have + '/' + g.need : ''}</b></div>`; }).join('');
function goalsSheet(pl, goals) {
  const done = (G.goals[pl.key] || { done: [] }).done.length;
  sheet(`<p class="evn">${pl.name}</p><h2>${G.charted[pl.key] ? 'Charted' : 'Goals'}</h2><p>${done} of ${goals.length} done. Finish them all to chart the planet and pick a suit upgrade.</p>
    <div class="board">${goalRows(pl, goals)}</div><button class="btn" id="okBtn">Keep exploring</button>`);
  $('okBtn').onclick = closeSheet;
}

/* ---------- the trading station ---------- */
const amount = o => Object.entries(o).map(([k, n]) => `${n} ${k === 'fuel' ? 'fuel' : RES[k].name.toLowerCase()}`).join(' + ');
function stationSheet() {
  const st = curSys().station, key = G.sys + ':', left = i => TRADE_STOCK - (G.trade[key + i] || 0);
  const can = tr => Object.entries(tr.give).every(([k, n]) => G.inv[k] >= n);
  const up = UPGRADES.find(u => u.id === st.up), upSold = !!G.trade[key + 'up'], upShow = up && upL(up.id) < up.max;
  sheet(`<p class="evn">Docked at ${st.name}</p><h2>Trading post</h2><p>Swap what you don't need. Each deal can be made ${TRADE_STOCK} times.</p>
    <div class="shoplist">${st.trades.map((tr, i) => { const g = Object.keys(tr.get)[0];
      return `<button class="srow deal${left(i) && can(tr) ? '' : ' off'}" data-i="${i}" style="animation-delay:${i * 70}ms"><div class="sid">${ICON[g]}</div><div class="sinfo"><b>Get ${amount(tr.get)}</b><small>for ${amount(tr.give)}</small></div>${dots(left(i), TRADE_STOCK)}</button>`; }).join('')}
    ${upShow ? `<button class="srow deal${upSold || G.inv.shard < STATION_UP_COST ? ' off' : ''}" id="buyUp" style="animation-delay:210ms"><div class="sid">${ICON[UP_ICON[up.id]]}</div><div class="sinfo"><b>${up.name}</b><small>${up.desc} ${upSold ? 'Sold out.' : STATION_UP_COST + ' warp shards.'}</small></div>${dots(upL(up.id), up.max)}</button>` : ''}</div>
    <p class="sub" style="margin:12px 0">You have ${G.inv.carbon} carbon, ${G.inv.sodium} sodium, ${G.inv.ferrite} ferrite, ${G.inv.shard} warp shards and ${Math.round(G.fuel)} fuel.</p>
    <button class="btn" id="undock">Undock</button>`);
  $('sheet').querySelectorAll('.srow.deal[data-i]').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, tr = st.trades[i];
    if (!left(i) || !can(tr)) { nope(b); return; }
    Object.entries(tr.give).forEach(([k, n]) => { G.inv[k] -= n; });
    Object.entries(tr.get).forEach(([k, n]) => { if (k === 'fuel') G.fuel = Math.min(FUEL_MAX, G.fuel + n); else G.inv[k] += n; });
    G.trade[key + i] = (G.trade[key + i] || 0) + 1; saveRun(); hudSpace(); stationSheet(); callout('Deal', 'Got ' + amount(tr.get));
  });
  if (upShow) $('buyUp').onclick = () => {
    if (upSold || G.inv.shard < STATION_UP_COST) { nope($('buyUp')); return; }
    G.inv.shard -= STATION_UP_COST; G.up[up.id] = upL(up.id) + 1; G.trade[key + 'up'] = 1; saveRun(); hudSpace(); stationSheet(); callout(up.name, 'Level ' + G.up[up.id]);
  };
  $('undock').onclick = closeSheet;
}

/* ---------- a failed suit ---------- */
function suitFailed() {
  const lost = {}; RES_KEYS.forEach(k => { lost[k] = Math.ceil(G.inv[k] / 2); G.inv[k] -= lost[k]; });
  G.life = lifeMax(); G.shield = 100;
  Object.assign(SF.p, { x: 2.6, y: .9, hop: .45, alt: 0, vz: 0 }); SF.drones = []; SF.alert = .3; setTarget(null); cam.x = SF.p.x; cam.y = SF.p.y - 1;
  updRes(); updMeters(true); saveRun();
  const rows = RES_KEYS.filter(k => lost[k]).map(k => `<div class="row"><div class="nm">${RES[k].name}</div><b>−${lost[k]}</b></div>`).join('');
  sheet(`<p class="evn">${SF.pl.name}</p><h2>Your suit gave out</h2><p>You come round by your ship. Half of what you carried is gone.</p>
    ${rows ? `<div class="board">${rows}</div>` : ''}<button class="btn" id="upBtn">Get up</button>`, false);
  $('upBtn').onclick = closeSheet;
}

/* ---------- the core ---------- */
function reachCore() {
  const j = G.j, jr = J(), st = G.stats, first = !save.trophies[j], next = JOURNEYS[j + 1], run = G;
  const charts = G.charts.length, allCharts = charts >= jr.stars;
  save.trophies[j] = true; writeSave(); clearRun();
  S.mode = 'core'; SPC.core = 0; hudShow(null);
  setTimeout(() => {
    sheet(`<div class="award"><div class="troph">${TROPHY(true)}</div><p>You reached the core</p></div>
      <p>${jr.name} is charted.${first && next && !run.gal ? ` ${next.name} is open.` : ''}</p>
      ${chartPipsFor(run, jr)}<p>${allCharts ? 'You found every star chart. Together they show the way to a galaxy nobody has seen.' : `You found ${charts} of ${jr.stars} star charts. Find them all on a journey to open the way to a new galaxy.`}</p>
      <div class="board">
        ${run.gal ? `<div class="row"><div class="nm">Galaxies crossed</div><b>${run.gal + 1}</b></div>` : ''}<div class="row"><div class="nm">Stars crossed</div><b>${jr.stars}</b></div>
        <div class="row"><div class="nm">Planets walked</div><b>${st.planets}</b></div>
        <div class="row"><div class="nm">Species named</div><b>${st.species}</b></div>
        <div class="row"><div class="nm">Planets charted</div><b>${st.charted || 0}</b></div>
        <div class="row"><div class="nm">Places found</div><b>${st.finds || 0}</b></div>
        <div class="row"><div class="nm">Watchers downed</div><b>${st.drones}</b></div>
      </div>${allCharts ? `<button class="btn" id="galBtn">Travel to a new galaxy<small>Your ship, suit and cargo come with you</small></button><button class="btn ghost" id="homeBtn">Back to the home screen</button>` : '<button class="btn" id="homeBtn">Back to the home screen</button>'}`, false);
    $('homeBtn').onclick = renderTitle;
    if (allCharts) $('galBtn').onclick = () => travelGalaxy(run);
  }, RM ? 50 : 2600);
}

/* ---------- a new species ---------- */
let discTO = 0;
function discToast(sp) {
  const el = $('disc');
  el.innerHTML = `<img src="${creatureThumb(sp, SF.pl.key)}" alt=""><div><i>New species · +${SPECIES_PAY} warp shards</i><b>${sp.name}</b><small>${TEMPER[sp.temper]}</small></div>`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(discTO); discTO = setTimeout(() => el.classList.remove('on'), 4200);
}

/* ---------- buttons ---------- */
$('pause').innerHTML = PAUSE_SVG; $('pause2').innerHTML = PAUSE_SVG;
$('pause').onclick = showPause; $('pause2').onclick = showPause;
$('boardBtn').onclick = openShip; $('goalBar').onclick = () => goalsSheet(SF.pl, SF.goals); $('scanBtn').onclick = doScan;
$('shipBtn').onclick = openShip; $('warpBtn').onclick = warpNow; $('howBtn').onclick = howTo;
$('scanBtn').insertAdjacentHTML('afterbegin', ICON.scan);
RES_KEYS.forEach(k => { const c = $('chip-' + k); c.querySelector('.ci').innerHTML = ICON[k]; c.onclick = () => useRes(k); });
[['icFuel', 'fuel'], ['icCells', 'cell'], ['icShards', 'shard']].forEach(([id, k]) => { $(id).innerHTML = ICON[k]; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { showPause(); saveRun(); } });

const chartPipsFor = (run, jr) => `<div class="charts">${Array.from({ length: jr.stars }, (_, i) => `<i class="${run.charts.includes(i) ? 'on' : ''}">${ICON.chart}</i>`).join('')}</div>`;
// on to a new galaxy: same ship, suit and cargo; new stars, planets and charts
function travelGalaxy(run) {
  G = run; G.gal = (G.gal || 0) + 1; G.seed = String(hash(G.seed + ':galaxy:' + G.gal));
  Object.assign(G, { sys: 0, at: -1, where: 'space', dock: false, charts: [], dep: {}, scanned: {}, seen: {}, goals: {}, charted: {}, trade: {}, px: null, py: null });
  save.galaxies = Math.max(save.galaxies || 0, G.gal); writeSave(); saveRun();
  closeSheet(); S.mode = 'warp'; SPC.warp = { t: 0, done: false, galaxy: true }; hudShow(null);
  callout('Leaving the galaxy', 'For ' + J().name);
}
