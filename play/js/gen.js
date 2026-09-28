/* =====================================================================
   The universe, with no drawing: journeys, star systems, planets, weather,
   plants, creatures, upgrades, and where everything sits on a planet.
   All of it comes from the journey's seed, so a planet is the same every
   time you land on it. tools/check.js tests this file in Node.
   ===================================================================== */
"use strict";
const WARP_COST = 40;     // warp shards per warp cell
const TAKEOFF = 25;       // launch fuel to leave a planet
const FUEL_MAX = 100;
const FUEL_PER_FERRITE = 2;
const SPECIES_PAY = 5;    // warp shards for naming a new species
const PLANET_R = 78;      // how far you can walk from your ship, in metres

const RES = {
  carbon:  { name: 'Carbon',      use: 'From plants. Tap it to refill your life.' },
  sodium:  { name: 'Sodium',      use: 'From spiky bulbs. Tap it to recharge your shield.' },
  ferrite: { name: 'Ferrite',     use: 'From rocks. Fuels your ship.' },
  shard:   { name: 'Warp shards', use: 'From black crystal spires. 40 build a warp cell.' },
};
const RES_KEYS = ['carbon', 'sodium', 'ferrite', 'shard'];
const LIFE_PER_CARBON = 4, SHIELD_PER_SODIUM = 6;

// drain: how fast the shield wears down, per second, before the journey's harshness
const WEATHER = {
  calm:     { name: 'Calm',     desc: 'Mild air. Your shield holds.', drain: 0 },
  scorched: { name: 'Scorched', desc: 'Blistering heat wears your shield down.', drain: 1 },
  frozen:   { name: 'Frozen',   desc: 'Bitter cold wears your shield down.', drain: 1 },
  toxic:    { name: 'Toxic',    desc: 'Poison rain eats at your shield.', drain: 1.3 },
  stormy:   { name: 'Stormy',   desc: 'Quiet, then sudden storms that tear at your shield.', drain: .15, storm: true },
  airless:  { name: 'Airless',  desc: 'No air at all. Your shield wears down slowly.', drain: .6 },
};
const GROUND = { calm: 'tufts', scorched: 'cracks', frozen: 'snow', toxic: 'bubbles', stormy: 'waves', airless: 'dust' };
const WATCH = ['None', 'Few', 'Watchful', 'Hostile'];

// A journey is a line of stars to the galaxy's core. Reach the core for its trophy.
const JOURNEYS = [
  { name: 'The Near Arm', stars: 4, harsh: .7, watch: .6, blurb: 'Four stars toward the core. Gentle skies to learn on.',
    intro: 'Your ship came down hard. The launch thrusters are dry, and the core is four stars away.' },
  { name: 'The Long Dark', stars: 6, harsh: 1, watch: 1, blurb: 'Six stars. Harsher worlds and keener watchers.',
    intro: 'Another rough landing, further out. Six stars stand between you and the core.' },
  { name: 'The Core', stars: 8, harsh: 1.3, watch: 1.4, blurb: 'Eight stars through the storms at the heart of it all.',
    intro: 'The signal from the core is loud now. Eight stars to go, and nothing out here is gentle.' },
];

// Suit and ship upgrades, offered when you name every species on a planet. They last for the journey.
const UPGRADES = [
  { id: 'lining',  name: 'Hazard lining',  desc: 'Your shield wears down 25% slower.', max: 3 },
  { id: 'suit',    name: 'Tougher suit',   desc: '25 more life.', max: 3 },
  { id: 'beam',    name: 'Sharper beam',   desc: 'Mine 30% faster.', max: 3 },
  { id: 'cutter',  name: 'Deep cutter',    desc: '30% more from everything you mine.', max: 3 },
  { id: 'scanner', name: 'Wide scanner',   desc: 'Scan creatures from farther away, and faster.', max: 3 },
  { id: 'boots',   name: 'Light boots',    desc: 'Walk 15% faster.', max: 3 },
  { id: 'thrust',  name: 'Lean thrusters', desc: 'Taking off uses 8 less fuel.', max: 2 },
  { id: 'hush',    name: 'Quiet beam',     desc: 'Watchers notice your mining half as much.', max: 2 },
];

const LORE = [
  'A faint signal pulses from the core. It is getting stronger.',
  'Someone was here before you. Their beacon is cold.',
  'The stars bunch closer together out here.',
  'Your scanner hums at a pattern it has no word for.',
  'Old wreckage drifts past the window. Not yours, this time.',
  'Every world out here is a first. Name what you find.',
  'The signal repeats: three short, one long.',
  'Your ship creaks. It has come a long way.',
  'Nobody has charted this star. Now you have.',
  'The core is a smudge of ink at the edge of the chart.',
];
// what the monoliths say, as far as anyone can read them
const MONOLITH = [
  'Carved long ago: a line of stars, ending in a black circle.',
  'The stone is warm. Someone knew you would come.',
  'The glyphs spiral inward. The core, again.',
  'A name is carved here, then scratched out.',
  'It hums: three short, one long.',
  'A map of this planet, with your ship already on it.',
  'The carving shows creatures you have not met yet.',
  'As far as you can read it, it says: keep going.',
];
const TEMPER = { shy: 'Shy. Runs when you get close.', calm: 'Calm. Grazes and wanders.', curious: 'Curious. Follows you about.' };

const SYL = ['ka', 'lo', 'mi', 'ra', 'zu', 'te', 'no', 'vi', 'sha', 'bel', 'qua', 'dro', 'xe', 'ul', 'pho', 'rin', 'gal', 'oth', 'ze', 'ny', 'ae', 'tor', 'lum', 'ves', 'ik', 'ma', 'sil', 'bo'];
function nameGen(r, a, b) {
  let n = ''; const k = ri(r, a, b);
  for (let i = 0; i < k; i++) n += pick(r, SYL);
  return n[0].toUpperCase() + n.slice(1);
}

function makeFlora(r) {
  return { kind: pick(r, ['bulb', 'fern', 'cactus', 'shroom', 'coral']), h: .8 + r() * 1.3, lean: (r() - .5) * .5, n: ri(r, 3, 6) };
}
function makeSpecies(r, idx) {
  const legs = pick(r, [0, 2, 4, 4, 6]);
  const bw = .7 + r() * 1.3, bh = bw * (.45 + r() * .35);
  const hover = legs === 0 && r() < .55;
  return {
    idx, name: nameGen(r, 2, 3) + ' ' + nameGen(r, 1, 2).toLowerCase(),
    legs, hover, bw, bh, legLen: legs ? bh * (.5 + r() * .9) : 0,
    neck: r() < .5 ? r() * .8 : 0, head: .16 + r() * .22 * bw,
    eyes: pick(r, [1, 2, 2, 3]), horn: pick(r, [0, 0, 1, 2, 3]), tail: pick(r, [0, 1, 2]),
    pat: pick(r, ['plain', 'spots', 'stripes', 'solid', 'belly']),
    temper: pick(r, ['shy', 'shy', 'calm', 'curious']), speed: 1.1 + r() * 1.5, count: ri(r, 3, 5),
  };
}
const speciesHeight = sp => sp.legLen + sp.bh + sp.head + (sp.hover ? .5 : 0) + sp.neck * .6;

function makePlanet(seed, si, k, J) {
  const r = RNG(seed, 'pl', si, k), first = si === 0 && k === 0;
  const wx = first ? 'calm' : pick(r, si === 0 ? ['calm', 'calm', 'scorched', 'frozen', 'stormy'] : ['calm', 'scorched', 'frozen', 'toxic', 'stormy', 'toxic']);
  const watch = first ? 1 : Math.min(3, Math.floor(r() * 4 * Math.min(1, J.watch * .8 + si * .08)));
  const nf = first ? 3 : wx === 'calm' ? ri(r, 3, 4) : wx === 'stormy' ? ri(r, 2, 4) : ri(r, 1, 3);
  const fauna = []; for (let i = 0; i < nf; i++) fauna.push(makeSpecies(r, i));
  // with more than one species, the last is rare: a lone animal living far from the landing spot
  if (nf >= 2) Object.assign(fauna[nf - 1], { rare: true, count: 1 });
  const flora = [makeFlora(r)]; if (r() < .6) flora.push(makeFlora(r));
  return {
    key: si + '-' + k, si, k, seed: seed + ':' + si + ':' + k,
    name: nameGen(r, 2, 3) + (r() < .35 ? ' ' + pick(r, ['Prime', 'Minor', 'Major', 'IV', 'VII', 'Beta']) : ''),
    wx, watch, fauna, flora, ground: GROUND[wx],
    rich: .85 + r() * .4, lush: { calm: 1, stormy: .9, toxic: .7, scorched: .55, frozen: .5 }[wx],
    spires: first ? 4 : r() < .15 ? 1 : ri(r, 3, 6),
    look: { ring: r() < .35, size: .6 + r() * .6, a0: r() * TAU, tilt: (r() - .5) * .6 },
  };
}
// Moons: small airless worlds with no life, but plenty of rock and warp shards.
function makeMoon(seed, si, k, parent) {
  const r = RNG(seed, 'moon', si, k);
  return {
    key: si + '-' + k, si, k, seed: seed + ':' + si + ':' + k, moonOf: parent.k,
    name: nameGen(r, 2, 2), wx: 'airless', watch: r() < .6 ? 0 : 1, fauna: [], flora: [makeFlora(r)], ground: GROUND.airless,
    rich: 1.2 + r() * .2, lush: 0, spires: ri(r, 5, 8),
    look: { ring: false, size: .3, a0: r() * TAU, tilt: 0 },
  };
}
// What a station's traders will swap. Each deal can be made 3 times per station.
const TRADES = [
  { give: { carbon: 20 }, get: { shard: 6 } },
  { give: { sodium: 15 }, get: { shard: 6 } },
  { give: { ferrite: 20 }, get: { shard: 7 } },
  { give: { carbon: 12, sodium: 8 }, get: { shard: 8 } },
  { give: { shard: 8 }, get: { fuel: 40 } },
];
const TRADE_STOCK = 3, STATION_UP_COST = 60;
function makeSystem(seed, i, J) {
  const r = RNG(seed, 'sys', i);
  const name = nameGen(r, 2, 3), n = i === 0 && !J.gal ? 3 : ri(r, 3, 4) + (J.gal ? 1 : 0); // new galaxies have more planets
  const planets = []; for (let k = 0; k < n; k++) planets.push(makePlanet(seed, i, k, J));
  // spread the planets round their orbits so they don't start bunched together
  const a0 = r() * TAU; planets.forEach((p, k) => { p.look.a0 = a0 + k * 2.4; });
  // some planets have a moon you can land on (never the one you crash on)
  planets.slice().forEach(p => { if (!(i === 0 && p.k === 0) && r() < .4) planets.push(makeMoon(seed, i, planets.length, p)); });
  // never strand anyone: every star holds enough warp shards for the next warp cell, with room to spare
  const least = () => planets.reduce((s, p) => s + p.spires * MINE_YIELD.shard[0] + p.fauna.length * SPECIES_PAY, 0);
  while (least() < WARP_COST + 12) planets.reduce((a, b) => b.spires < a.spires ? b : a).spires += 2;
  const deals = TRADES.slice(), trades = []; while (trades.length < 3) trades.push(deals.splice(Math.floor(r() * deals.length), 1)[0]);
  const station = { name: nameGen(r, 2, 2) + ' Post', ring: ri(r, 1, n), trades, up: UPGRADES[Math.floor(r() * UPGRADES.length)].id };
  // one world at every star hides a star chart
  const chart = Math.floor(r() * planets.length); planets[chart].hasChart = true;
  return { i, name, planets, station, chart, lore: LORE[(hash(seed) + i * 7) % LORE.length], twin: r() < .25 };
}

// Ground marks for each kind of weather (drawn flat, you walk over them)
const DECO = {
  calm: ['flowers', 'flowers', 'grass', 'pebbles', 'patch'], stormy: ['puddle', 'grass', 'grass', 'pebbles', 'patch'],
  scorched: ['dune', 'dune', 'bones', 'pebbles', 'crater'], frozen: ['drift', 'drift', 'ice', 'pebbles', 'patch'],
  toxic: ['goo', 'spores', 'spores', 'pebbles', 'patch'], airless: ['crater', 'crater', 'pebbles', 'dune'],
};
const POI_NAME = { wreck: 'Wreck', pod: 'Supply pod', monolith: 'Monolith', cave: 'Cave', chart: 'Star chart' };
const CHART_ID = 2000, CHART_SENSE = 25; // the chart's id in G.dep, and how close you must be for the scanner to tag it

// Where everything stands on a planet. The ship lands at 0,0; y grows toward the bottom of the screen.
// blocks are things you walk round (boulders, cliffs, big trees, pools); pois are places to find.
function planetLayout(pl) {
  const r = RNG(pl.seed, 'layout'), R = PLANET_R, objs = [], deco = [], blocks = [], pois = [];
  const moon = pl.wx === 'airless';
  let id = 0;
  // an even spread over the ring between minD and maxD from the ship
  const spot = (minD, maxD) => {
    const a = r() * TAU, d = Math.sqrt(lerp((minD / R) ** 2, (maxD / R) ** 2, r())) * R;
    return [Math.cos(a) * d, Math.sin(a) * d];
  };
  // the lie of the land: groves, rocky fields, water and open ground
  const zones = [], zk = moon ? ['rocky', 'rocky', 'open'] : ['grove', 'grove', 'rocky', 'rocky', 'water', 'open'];
  for (let i = 0, n = ri(r, 5, 8); i < n; i++) { const [x, y] = spot(18, R - 8); zones.push({ k: pick(r, zk), x, y, r: 8 + r() * 10 }); }
  const inZone = k => { const zs = zones.filter(z => z.k === k); if (!zs.length) return null; const z = pick(r, zs), a = r() * TAU, d = Math.sqrt(r()) * z.r; return [z.x + Math.cos(a) * d, z.y + Math.sin(a) * d]; };
  const blocked = (x, y, pad) => blocks.some(b => !b.walk && ((x - b.x) / (b.rx + pad)) ** 2 + ((y - b.y) / (b.ry + pad)) ** 2 < 1);
  const addBlock = (b, where) => {
    for (let t = 0; t < 12; t++) {
      const c = where(); if (!c) return;
      const [x, y] = c, ext = Math.max(b.rx, b.ry);
      if (Math.hypot(x, y) - ext < 12 || Math.hypot(x, y) + ext > R - 1) continue;
      if (blocks.some(o => Math.hypot(o.x - x, o.y - y) < ext + Math.max(o.rx, o.ry) + 1.5)) continue;
      blocks.push(Object.assign(b, { x, y, sd: r() * 1e9 | 0 })); return;
    }
  };
  const water = { calm: 'water', stormy: 'water', toxic: 'acid', scorched: 'tar', frozen: 'ice' }[pl.wx];
  zones.forEach(z => {
    const at = () => { const a = r() * TAU, d = Math.sqrt(r()) * z.r; return [z.x + Math.cos(a) * d, z.y + Math.sin(a) * d]; };
    if (z.k === 'water' && water) for (let i = ri(r, 1, 2); i > 0; i--) { const rx = 3 + r() * 5; addBlock({ k: 'pool', kind: water, rx, ry: rx * .55, walk: water === 'ice' }, at); }
    if (z.k === 'rocky') for (let i = ri(r, 3, 5); i > 0; i--) { const s = 1.4 + r() * 1.4; addBlock({ k: 'boulder', s, rx: s * .95, ry: s * .45 }, at); }
    if (z.k === 'grove') for (let i = ri(r, 3, 6); i > 0; i--) { const s = .9 + r() * .7; addBlock({ k: 'tree', s, rx: .45 * s, ry: .3 * s }, at); }
  });
  for (let i = ri(r, 2, 4); i > 0; i--) { const w = 4 + r() * 4; addBlock({ k: 'mesa', w, h: 2.4 + r() * 2.4, rx: w, ry: w * .5 }, () => spot(20, R - 8)); }
  for (let i = 0; i < 70; i++) { const [x, y] = spot(6, R - 2); deco.push({ k: pick(r, DECO[pl.wx]), x, y, s: 1 + r() * 2.5, sd: r() * 1e9 | 0 }); }
  // mineable things come in little clumps, the way rocks and plants do
  const add = (k, n, centre, clump, minD = 4) => {
    let made = 0;
    for (let tries = 0; made < n && tries < n * 25; tries++) {
      const c = centre(); if (!c) continue;
      const m = Math.min(n - made, ri(r, 1, clump));
      for (let j = 0; j < m; j++) {
        const x = c[0] + (r() - .5) * 5, y = c[1] + (r() - .5) * 5, d = Math.hypot(x, y);
        if (d < minD || d > R - 2 || blocked(x, y, .7)) continue;
        objs.push({ id: id++, k, x, y, s: .8 + r() * .5, sd: r() * 1e9 | 0, fl: ri(r, 0, pl.flora.length - 1) });
        made++;
      }
    }
  };
  const near = (a, b) => () => spot(a, b), zoneOr = (kind, p) => () => r() < p ? (inZone(kind) || spot(5, R - 3)) : spot(5, R - 3);
  // a little of the everyday things within sight of the ship, so nobody lands on a bare patch
  add('rock', 3, near(5, 9), 3, 5); if (pl.lush) add('plant', 3, near(5, 9), 3, 5); add('sodium', 2, near(6, 10), 2, 6);
  add('rock', Math.round(34 * pl.rich), zoneOr('rocky', .5), 4, 5);
  add('plant', Math.round(56 * pl.lush), zoneOr('grove', .6), 6);
  add('sodium', Math.round(22 * pl.rich), near(6, R - 3), 3, 6);
  add('shard', pl.spires, near(20, R - 3), 1, 20);
  // places to find: a monolith, wrecks, supply pods, and caves to shelter in
  const kinds = [];
  if (r() < .7) kinds.push('monolith');
  kinds.push('wreck'); if (r() < .5) kinds.push('wreck');
  kinds.push('pod'); if (!moon && r() < .6) kinds.push('pod');
  for (let i = WEATHER[pl.wx].drain > .5 || WEATHER[pl.wx].storm ? 2 : r() < .5 ? 1 : 0; i > 0; i--) kinds.push('cave');
  kinds.forEach((k, i) => {
    for (let t = 0; t < 30; t++) {
      const [x, y] = spot(18, R - 6);
      if (blocked(x, y, 2) || pois.some(p => Math.hypot(p.x - x, p.y - y) < 12) || objs.some(o => Math.hypot(o.x - x, o.y - y) < 1.5)) continue;
      pois.push({ id: 1000 + i, k, x, y, sd: r() * 1e9 | 0 }); return;
    }
  });
  // the hidden star chart: far out, somewhere clear
  if (pl.hasChart) for (let t = 0; t < 120; t++) {
    const [x, y] = spot(40, R - 5);
    if (t < 100 && (blocked(x, y, 1.5) || pois.some(p => Math.hypot(p.x - x, p.y - y) < 8))) continue;
    if (blocked(x, y, .5)) continue;
    pois.push({ id: CHART_ID, k: 'chart', x, y, sd: r() * 1e9 | 0 }); break;
  }
  const herds = pl.fauna.map((sp, i) => { const a = sp.rare ? 45 : 10; let [x, y] = spot(a, R - 10); for (let t = 0; t < 10 && blocked(x, y, 2); t++) [x, y] = spot(a, R - 10); return { sp: i, x, y }; });
  return { objs, deco, herds, blocks, pois };
}
// how tall each kind of thing stands, in metres, before its own size
const OBJ_H = { rock: .8, sodium: 1, shard: 2.7 };
const MINE_T = { plant: .9, sodium: .8, rock: 1.4, shard: 2.2 };
const MINE_RES = { plant: 'carbon', sodium: 'sodium', rock: 'ferrite', shard: 'shard' };
const MINE_YIELD = { plant: [6, 10], sodium: [5, 8], rock: [6, 10], shard: [6, 10] };
const MINE_ALERT = { plant: .05, sodium: .05, rock: .09, shard: .34 };
const WATCH_F = [0, .6, 1, 1.5];

// Each planet's goals: things to do there, worked out from what's on it. Finish them all to chart the planet.
// need is how many; progress is counted in surface.js (goalHave).
const HARVEST = { calm: 'carbon', stormy: 'carbon', toxic: 'ferrite', scorched: 'sodium', frozen: 'sodium', airless: 'ferrite' };
function planetGoals(pl, L) {
  const r = RNG(pl.seed, 'goals'), goals = [];
  if (pl.fauna.length) goals.push({ id: 'species', need: pl.fauna.length, text: `Name all ${plural(pl.fauna.length, 'species', 'species')}`, note: pl.fauna.some(s => s.rare) ? 'One is rare and lives far from your ship.' : '' });
  const finds = L.pois.filter(o => o.k !== 'cave' && o.k !== 'chart').length;
  if (finds) goals.push({ id: 'finds', need: finds, text: `Search ${finds === 1 ? 'the wreck, pod or monolith' : `all ${finds} wrecks, pods and monoliths`}`, note: 'The scanner tags them.' });
  const spires = L.objs.filter(o => o.k === 'shard').length;
  if (spires) goals.push({ id: 'spire', need: Math.min(3, spires), text: `Mine ${plural(Math.min(3, spires), 'black shard spire')}`, note: '' });
  const extra = [];
  if (L.blocks.some(b => b.k === 'mesa')) extra.push({ id: 'cliff', need: 1, text: 'Jetpack over a cliff', note: 'Press and hold to fly.' });
  if (L.pois.some(o => o.k === 'cave')) extra.push({ id: 'cave', need: 1, text: 'Shelter in a cave', note: '' });
  extra.push({ id: 'far', need: 1, text: 'Reach the edge of the map', note: 'Where the ground turns rough.' });
  const res = HARVEST[pl.wx]; extra.push({ id: 'harvest', res, need: 30, text: `Gather 30 ${RES[res].name.toLowerCase()} here`, note: '' });
  if (pl.watch >= 2) extra.push({ id: 'watcher', need: 1, text: 'Shoot down a watcher', note: 'Mine greedily and they come.' });
  for (let i = pl.fauna.length ? 1 : 2; i > 0 && extra.length; i--) goals.push(extra.splice(Math.floor(r() * extra.length), 1)[0]);
  return goals;
}

// Find every star chart on a journey and the core opens the way to a new galaxy: an extra star, more planets
// per star, and a little harsher. gal 0 is the journey itself.
const GALAXY_KIND = ['Spiral', 'Cloud', 'Wheel', 'Veil', 'Drift'];
const _gal = {};
function galaxyOf(j, gal, seed) {
  const b = JOURNEYS[j]; if (!gal) return b;
  const key = j + ':' + gal + ':' + seed; if (_gal[key]) return _gal[key];
  const r = RNG(seed, 'galaxy');
  return (_gal[key] = Object.assign({}, b, { name: 'The ' + nameGen(r, 2, 2) + ' ' + pick(r, GALAXY_KIND), stars: Math.min(8, b.stars + 1),
    harsh: b.harsh * (1 + .15 * gal), watch: b.watch * (1 + .1 * gal), gal }));
}
