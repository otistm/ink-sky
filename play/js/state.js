/* =====================================================================
   The journey in progress (G), the saved progress (save), and the
   systems and planets rebuilt from the journey's seed.
   ===================================================================== */
"use strict";
// Saved progress. Never rename these keys or remove a field, or players lose their trophies.
const SAVE_KEY = 'inksky-save', RUN_KEY = 'inksky-run';
function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
let save = loadJSON(SAVE_KEY) || {};
save.trophies = save.trophies || [];
while (save.trophies.length < JOURNEYS.length) save.trophies.push(false);
save.species = save.species || 0; save.planets = save.planets || 0; save.tips = save.tips || {};
const writeSave = () => writeJSON(SAVE_KEY, save);

// The journey in progress. Everything in it is plain data, so it saves as-is; worlds are rebuilt from `seed`.
let G = null;
function newRun(j) {
  G = {
    v: 1, j, seed: String((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0),
    sys: 0, at: 0, where: 'surface', crash: true,
    inv: { carbon: 0, sodium: 0, ferrite: 0, shard: 0 }, fuel: 0, cells: 0, life: 100, shield: 100,
    up: {}, dep: {}, scanned: {}, seen: {}, px: null, py: null, trade: {}, dock: false,
    stats: { species: 0, planets: 0, mined: 0, drones: 0 },
  };
}
// Snapshots have v:1. If the shape of G changes, bump v and convert older ones here.
// Fields added after 0.1.0 get their defaults here.
function loadRun() { const r = loadJSON(RUN_KEY); if (!(r && r.v === 1 && JOURNEYS[r.j])) return null; r.trade = r.trade || {}; r.dock = !!r.dock; return r; }
function saveRun() { if (G) writeJSON(RUN_KEY, G); }
function clearRun() { G = null; try { localStorage.removeItem(RUN_KEY); } catch (e) {} }

const SYS = {};
function sysOf(i) { const k = G.seed + ':' + i; return SYS[k] || (SYS[k] = makeSystem(G.seed, i, JOURNEYS[G.j])); }
const curSys = () => sysOf(G.sys);
const curPlanet = () => curSys().planets[G.at];
const J = () => JOURNEYS[G.j];

const upL = id => (G && G.up[id]) || 0;
const lifeMax = () => 100 + 25 * upL('suit');
const takeoffCost = () => TAKEOFF - 8 * upL('thrust');
const scanRange = () => 7 + 1.8 * upL('scanner');
const scanTime = () => 2.2 / (1 + .4 * upL('scanner'));
const namedOn = pl => (G.scanned[pl.key] || []).length;

// one-time tips, the same bubble every time; each shows once per player
// (a tip waits its turn if another hint is still showing)
function tipOnce(id, text, ms) { if (save.tips[id] || document.getElementById('hint').classList.contains('on')) return false; save.tips[id] = 1; writeSave(); hint(text, ms || 7000); return true; }
