/* Tests the universe without a browser: run `node tools/check.js`.
   Every script must parse, and every generated journey must be finishable:
   enough rocks to take off from any planet, enough warp shards in every
   star system to build the next warp cell, and everything inside the map. */
"use strict";
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'play', 'js');
let fails = 0;
const fail = m => { fails++; if (fails < 20) console.log('  FAIL ' + m); };

// 1. every game script parses
const order = fs.readFileSync(path.join(__dirname, '..', 'play', 'index.html'), 'utf8').match(/js\/[\w.]+\.js/g);
order.forEach(f => { try { new vm.Script(fs.readFileSync(path.join(JS, f.slice(3)), 'utf8'), { filename: f }); } catch (e) { fail(f + ': ' + e.message); } });
const onDisk = fs.readdirSync(JS).filter(f => f.endsWith('.js'));
onDisk.forEach(f => { if (!order.includes('js/' + f)) fail(f + ' is not loaded by play/index.html'); });
console.log(`Scripts: ${order.length} load in order, all parse.`);

// 2. the universe, in Node
const ctx = vm.createContext({ console, Math, JSON });
['config.js', 'core.js', 'gen.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f }));
const U = vm.runInContext('({ JOURNEYS, makeSystem, planetLayout, planetGoals, galaxyOf, WARP_COST, TAKEOFF, FUEL_PER_FERRITE, SPECIES_PAY, PLANET_R, MINE_YIELD, OBJ_H })', ctx);

const RUNS = 150;
U.JOURNEYS.forEach((J, j) => {
  let planets = 0, species = 0, shardSum = 0, minSys = 1e9, wx = {}, watch = [0, 0, 0, 0], blocks = 0, pois = 0, moons = 0, goalSum = 0;
  for (let s = 0; s < RUNS; s++) {
    const seed = 'check' + j + ':' + s;
    for (let i = 0; i < J.stars; i++) {
      const sy = U.makeSystem(seed, i, J); let sysShards = 0;
      if (!sy.name || sy.planets.length < 3 || !sy.station || sy.station.trades.length !== 3) fail(`${seed} star ${i}: bad system`);
      sy.planets.forEach(pl => {
        planets++; species += pl.fauna.length; wx[pl.wx] = (wx[pl.wx] || 0) + 1; watch[pl.watch]++;
        const L = U.planetLayout(pl), rocks = L.objs.filter(o => o.k === 'rock').length, spires = L.objs.filter(o => o.k === 'shard').length;
        if (rocks * U.MINE_YIELD.rock[0] * U.FUEL_PER_FERRITE < U.TAKEOFF * 3) fail(`${pl.key} on ${seed}: only ${rocks} rocks`);
        L.objs.forEach(o => { if (!(Math.hypot(o.x, o.y) <= U.PLANET_R) || isNaN(o.x + o.y)) fail(`${pl.key}: object outside the map`); });
        if (L.objs.some(o => o.k !== 'shard' && Math.hypot(o.x, o.y) < 3.5)) fail(`${pl.key}: something stands on the landing pad`);
        pl.fauna.forEach(sp => { if (!sp.name || !(sp.bw > 0)) fail(`${pl.key}: bad species`); });
        // nothing to mine or find may sit inside a boulder, cliff, tree or pool, and the landing pad stays clear
        const inBlock = (x, y) => L.blocks.some(b => !b.walk && ((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 < 1);
        L.objs.concat(L.pois).forEach(o => { if (inBlock(o.x, o.y)) fail(`${pl.key}: a ${o.k} is stuck inside a ${L.blocks.find(b => ((o.x - b.x) / b.rx) ** 2 + ((o.y - b.y) / b.ry) ** 2 < 1).k}`); });
        L.blocks.forEach(b => { if (Math.hypot(b.x, b.y) - Math.max(b.rx, b.ry) < 10) fail(`${pl.key}: a ${b.k} is on the landing pad`); });
        blocks += L.blocks.length; pois += L.pois.length; if (pl.moonOf != null) moons++;
        // every planet has at least 3 goals, and each one can be done there
        const goals = U.planetGoals(pl, L); goalSum += goals.length;
        if (goals.length < 3) fail(`${pl.key} on ${seed}: only ${goals.length} goals`);
        goals.forEach(g => {
          const count = k => L.objs.filter(o => o.k === k).length, src = { carbon: 'plant', sodium: 'sodium', ferrite: 'rock' };
          if (g.id === 'harvest' && count(src[g.res]) * U.MINE_YIELD[src[g.res]][0] * .85 < g.need) fail(`${pl.key}: not enough ${g.res} to gather ${g.need}`);
          if (g.id === 'spire' && count('shard') < g.need) fail(`${pl.key}: fewer spires than the goal asks for`);
        });
        L.herds.forEach(h => { if (pl.fauna[h.sp].rare && Math.hypot(h.x, h.y) < 40) fail(`${pl.key}: the rare creature lives too close to the ship`); });
        // the least a careful explorer can count on: each spire's smallest yield, plus pay for naming species
        sysShards += spires * U.MINE_YIELD.shard[0] + pl.fauna.length * U.SPECIES_PAY;
      });
      if (sysShards < U.WARP_COST) fail(`${seed} star ${i}: only ${sysShards} warp shards in reach`);
      // exactly one hidden star chart per star, and it really is placed on that world
      const holders = sy.planets.filter(p => p.hasChart);
      if (holders.length !== 1 || !U.planetLayout(holders[0]).pois.some(o => o.k === 'chart')) fail(`${seed} star ${i}: its star chart is missing`);
      shardSum += sysShards; minSys = Math.min(minSys, sysShards);
    }
  }
  const sys = RUNS * J.stars;
  console.log(`${J.name}: ${(planets / sys).toFixed(1)} planets per star, ${(species / planets).toFixed(1)} species per planet, ` +
    `${Math.round(shardSum / sys)} warp shards per star on average (least ${minSys}, a cell costs ${U.WARP_COST}).`);
  console.log(`  ${(moons / sys).toFixed(1)} moons per star; ${(blocks / planets).toFixed(0)} boulders, cliffs, trees and pools and ${(pois / planets).toFixed(1)} places to find per planet; ${(goalSum / planets).toFixed(1)} goals per planet`);
  console.log(`  weather ${Object.entries(wx).map(([k, v]) => k + ' ' + Math.round(v / planets * 100) + '%').join(', ')}; watchers none/few/watchful/hostile ${watch.map(v => Math.round(v / planets * 100) + '%').join(' / ')}`);
});

// 3. new galaxies: an extra star, 4 or 5 planets per star, and a chart at every one
U.JOURNEYS.forEach((b, j) => {
  let planets = 0, sys = 0;
  for (let s = 0; s < 40; s++) {
    const seed = 'galaxy' + j + ':' + s, G2 = U.galaxyOf(j, 1 + (s % 3), seed);
    if (G2.stars !== Math.min(8, b.stars + 1) || !G2.name) fail(`${seed}: bad galaxy`);
    for (let i = 0; i < G2.stars; i++) { const sy = U.makeSystem(seed, i, G2); sys++; planets += sy.planets.filter(p => p.moonOf == null).length;
      if (!U.planetLayout(sy.planets[sy.chart]).pois.some(o => o.k === 'chart')) fail(`${seed} star ${i}: star chart missing`); }
  }
  console.log(`New galaxies after ${b.name}: ${(planets / sys).toFixed(1)} planets per star (the journey itself has about 3.5).`);
});

// 4. the same seed always makes the same planet
const a = JSON.stringify(U.planetLayout(U.makeSystem('same', 1, U.JOURNEYS[0]).planets[0]));
const b = JSON.stringify(U.planetLayout(U.makeSystem('same', 1, U.JOURNEYS[0]).planets[0]));
if (a !== b) fail('the same seed made two different planets');

console.log(fails ? `\n${fails} problem${fails === 1 ? '' : 's'} found.` : '\nAll good.');
process.exit(fails ? 1 : 0);
