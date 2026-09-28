/* =====================================================================
   Ink drawings. Canvas drawings take a context and a line width in the
   drawing's own units (metres on a planet), with the ground at y = 0 and
   up as negative y. Creatures and plants are drawn from their generated
   shapes, so every species looks different. SVG icons for the HUD are at
   the bottom.
   ===================================================================== */
"use strict";
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
// The shared ink look: a hard black shadow down and to the right, then the paper fill, then a clean outline.
function inked(g, lw, path, fill, off) {
  off = off === undefined ? lw * 1.5 : off;
  if (off) { g.save(); g.translate(off, off * 1.15); path(); g.fillStyle = '#000'; g.fill(); g.restore(); }
  path(); g.fillStyle = fill || '#fff'; g.fill(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
}

/* ---------- the explorer ---------- */
// o: face (1 right, -1 left), walk (distance walked), moving, aim (arm angle, already mirrored) or null, t, hurt
function drawExplorer(g, lw, o) {
  g.save(); g.scale(o.face, 1); g.lineCap = 'round'; g.lineJoin = 'round';
  const sw = o.air ? .35 : o.moving ? Math.sin(o.walk * 2.4) : 0;
  const bob = o.moving ? Math.abs(Math.cos(o.walk * 2.4)) * .07 : Math.sin(o.t * 2.2) * .015;
  g.strokeStyle = '#000'; g.lineWidth = .2;
  g.beginPath(); g.moveTo(-.12, -.62); g.lineTo(-.12 - sw * .22, -.08); g.moveTo(.12, -.62); g.lineTo(.12 + sw * .22, -.08); g.stroke();
  g.fillStyle = '#000';
  [-.12 - sw * .22, .12 + sw * .22].forEach(x => { rrect(g, x - .12, -.13, .3, .13, .05); g.fill(); });
  g.translate(0, -bob);
  if (o.jet) { const f = .45 + Math.random() * .35; poly(g, [[-.5, -.74], [-.44, -.74 + f * .6], [-.37, -.74 + f], [-.3, -.74 + f * .6], [-.24, -.74]]); g.fillStyle = '#000'; g.fill(); poly(g, [[-.44, -.74], [-.37, -.74 + f * .55], [-.3, -.74]]); g.fillStyle = '#fff'; g.fill(); }
  inked(g, lw, () => rrect(g, -.52, -1.34, .3, .62, .08));
  inked(g, lw, () => rrect(g, -.3, -1.38, .6, .86, .22), o.hurt > 0 ? '#000' : '#fff');
  g.beginPath(); g.moveTo(-.3, -.82); g.lineTo(.3, -.82); g.lineWidth = lw; g.strokeStyle = o.hurt > 0 ? '#fff' : '#000'; g.stroke();
  inked(g, lw, () => { g.beginPath(); g.arc(.03, -1.66, .38, 0, TAU); });
  g.beginPath(); g.ellipse(.17, -1.66, .21, .16, 0, 0, TAU); g.fillStyle = '#000'; g.fill();
  g.beginPath(); g.moveTo(.09, -1.73); g.lineTo(.22, -1.75); g.strokeStyle = '#fff'; g.lineWidth = lw * .9; g.stroke();
  g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(-.18, -1.98); g.lineTo(-.27, -2.24); g.stroke();
  g.beginPath(); g.arc(-.27, -2.28, .07, 0, TAU); g.fillStyle = '#000'; g.fill();
  const a = o.aim == null ? Math.PI / 2 - .25 + sw * .35 : o.aim;
  g.save(); g.translate(.05, -1.12); g.rotate(a);
  g.lineWidth = .16; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(0, 0); g.lineTo(.38, 0); g.stroke();
  if (o.aim != null) { inked(g, lw, () => rrect(g, .3, -.1, .4, .2, .05), '#fff', 0); g.fillStyle = '#000'; g.fillRect(.64, -.06, .12, .12); }
  g.restore();
  g.restore();
}

/* ---------- the ship (side view, nose to the right) ---------- */
// o: legs (0 folded to 1 down), flame (0 to 1), smoke
function drawShip(g, lw, o) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const L = o.legs;
  if (L > 0) {
    g.strokeStyle = '#000'; g.lineWidth = .14;
    g.beginPath(); g.moveTo(-1.1, -.95); g.lineTo(-1.1 - .35 * L, -.95 + .9 * L); g.moveTo(1.1, -.95); g.lineTo(1.1 + .35 * L, -.95 + .9 * L); g.stroke();
    g.fillStyle = '#000'; [-1, 1].forEach(s => { rrect(g, s * (1.1 + .35 * L) - .24, -.95 + .9 * L - .1, .48, .12, .05); g.fill(); });
  }
  if (o.flame > 0) for (const s of [-.75, .75]) {
    const f = (.7 + Math.random() * .5) * o.flame;
    poly(g, [[s - .28, -.9], [s - .1, -.9 + f * .9], [s, -.9 + f * 1.6], [s + .1, -.9 + f * .9], [s + .28, -.9]]); g.fillStyle = '#000'; g.fill();
    poly(g, [[s - .1, -.9], [s, -.9 + f * .7], [s + .1, -.9]]); g.fillStyle = '#fff'; g.fill();
  }
  inked(g, lw, () => poly(g, [[-1.5, -2.2], [-2.25, -3.15], [-2.55, -3.1], [-2.15, -2]]));
  inked(g, lw, () => {
    g.beginPath(); g.moveTo(-2.5, -1.3); g.quadraticCurveTo(-2.6, -2.3, -1.4, -2.35); g.lineTo(1.1, -2.25);
    g.quadraticCurveTo(2.9, -2, 2.6, -1.35); g.quadraticCurveTo(2.2, -.85, .9, -.85); g.lineTo(-1.8, -.85); g.quadraticCurveTo(-2.5, -.9, -2.5, -1.3); g.closePath();
  });
  g.beginPath(); g.moveTo(-2.3, -1.55); g.lineTo(2.1, -1.55); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  g.setLineDash([.12, .18]); g.beginPath(); g.moveTo(-2.1, -1.2); g.lineTo(1.6, -1.2); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(.25, -2.25); g.quadraticCurveTo(.95, -3.05, 1.85, -2.12); g.closePath(); g.fillStyle = '#000'; g.fill();
  g.beginPath(); g.moveTo(.75, -2.5); g.quadraticCurveTo(1.05, -2.68, 1.3, -2.52); g.strokeStyle = '#fff'; g.lineWidth = lw * .9; g.stroke();
  inked(g, lw, () => rrect(g, -2.9, -1.78, .42, .62, .08), '#000', 0);
  g.restore();
}

/* ---------- things to mine ---------- */
const _pts = {};
function rockPts(sd) {
  if (_pts[sd]) return _pts[sd];
  const r = RNG(sd), n = ri(r, 6, 8), p = [];
  for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, d = .75 + r() * .4; p.push([Math.cos(a) * d * .9, Math.min(0, Math.sin(a) * d * .8)]); }
  return (_pts[sd] = p);
}
function drawRock(g, lw, s, sd) {
  const p = rockPts(sd).map(([x, y]) => [x * s, y * s]);
  inked(g, lw, () => poly(g, p));
  g.strokeStyle = '#000'; g.lineWidth = lw * .8; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i < 3; i++) { const x = s * (.25 + i * .16), y = -s * (.12 + i * .08); g.moveTo(x, y); g.lineTo(x + s * .12, y - s * .2); }
  g.moveTo(-s * .3, -s * .45); g.lineTo(-s * .1, -s * .3); g.lineTo(-s * .15, -s * .15); g.stroke();
}
function drawSodium(g, lw, s, t, sd) {
  g.save(); g.scale(s, s); const l = lw / s, sway = Math.sin(t * 1.6 + sd % 7) * .03;
  g.lineCap = 'round'; g.strokeStyle = '#000'; g.lineWidth = l * 1.3;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-.05, -.3, sway, -.45); g.stroke();
  g.beginPath(); g.moveTo(0, -.12); g.quadraticCurveTo(-.25, -.2, -.3, -.05); g.moveTo(0, -.18); g.quadraticCurveTo(.25, -.28, .3, -.12); g.stroke();
  g.translate(sway, -.72);
  g.lineWidth = l; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.moveTo(Math.cos(a) * .3, Math.sin(a) * .3); g.lineTo(Math.cos(a) * .47, Math.sin(a) * .47); }
  g.stroke();
  inked(g, l, () => { g.beginPath(); g.arc(0, 0, .3, 0, TAU); });
  g.beginPath(); g.arc(0, 0, .11, 0, TAU); g.fillStyle = '#000'; g.fill();
  g.restore();
}
// Warp shards are rare, so they're the one thing drawn in solid ink.
function drawShard(g, lw, s, t, sd) {
  g.save(); g.scale(s, s); const l = lw / s;
  inked(g, l, () => poly(g, [[.3, 0], [.55, -.95], [.82, -.82], [.78, 0]]), '#000');
  inked(g, l, () => poly(g, [[-.62, 0], [-.78, -.7], [-.55, -.6], [-.4, 0]]), '#000');
  inked(g, l, () => poly(g, [[-.38, 0], [-.48, -1.5], [0, -2.7], [.48, -1.6], [.34, 0]]), '#000');
  g.strokeStyle = '#fff'; g.lineWidth = l; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-.02, -2.45); g.lineTo(.04, -.3); g.moveTo(-.25, -1.5); g.lineTo(-.18, -.6); g.stroke();
  const gl = Math.sin(t * 1.7 + (sd % 13));
  if (gl > .75) { const k = (gl - .75) * 4 * .35; g.strokeStyle = '#000'; g.lineWidth = l * 1.2; g.beginPath(); g.moveTo(.35 - k, -2.5); g.lineTo(.35 + k, -2.5); g.moveTo(.35, -2.5 - k); g.lineTo(.35, -2.5 + k); g.stroke(); }
  g.restore();
}
function drawPlant(g, lw, f, s, t, sd) {
  const h = f.h * s, sway = Math.sin(t * 1.3 + (sd % 17)) * .05 * h, lean = f.lean * h;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000';
  if (f.kind === 'bulb') {
    const tx = lean + sway, ty = -h * .78;
    g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * .2, -h * .45, tx, ty); g.stroke();
    g.lineWidth = lw; g.beginPath(); g.moveTo(0, -h * .2); g.quadraticCurveTo(-h * .2, -h * .3, -h * .22, -h * .12); g.stroke();
    inked(g, lw, () => { g.beginPath(); g.ellipse(tx, ty - h * .12, h * .2, h * .24, 0, 0, TAU); });
    g.fillStyle = '#000'; [[-.06, -.18], [.06, -.08], [-.02, -.02]].forEach(([dx, dy]) => { g.beginPath(); g.arc(tx + dx * h, ty + dy * h, h * .035, 0, TAU); g.fill(); });
  } else if (f.kind === 'fern') {
    g.lineWidth = lw * 1.2;
    for (let i = 0; i < f.n; i++) {
      const a = -Math.PI / 2 + (i / (f.n - 1) - .5) * 1.9 + f.lean * .5, len = h * (.75 + .25 * Math.sin(i * 2.1));
      const ex = Math.cos(a) * len + sway, ey = Math.sin(a) * len * .95, cx = Math.cos(a) * len * .4, cy = Math.sin(a) * len * .8 - h * .15;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
      g.lineWidth = lw * .8; g.beginPath();
      for (let k = 1; k < 5; k++) { const u = k / 5, px = 2 * (1 - u) * u * cx + u * u * ex, py = 2 * (1 - u) * u * cy + u * u * ey; g.moveTo(px, py); g.lineTo(px + h * .07, py - h * .07); g.moveTo(px, py); g.lineTo(px - h * .07, py - h * .05); }
      g.stroke(); g.lineWidth = lw * 1.2;
    }
  } else if (f.kind === 'cactus') {
    const w = h * .3;
    inked(g, lw, () => rrect(g, w * .45, -h * .62, w * .6, h * .3, w * .3));
    if (f.n > 4) inked(g, lw, () => rrect(g, -w * 1.05, -h * .5, w * .6, h * .26, w * .3));
    inked(g, lw, () => rrect(g, -w / 2, -h, w, h, w / 2));
    g.lineWidth = lw * .8; g.beginPath(); g.moveTo(0, -h * .9); g.lineTo(0, -h * .05); g.stroke();
    g.fillStyle = '#000'; g.beginPath(); g.arc(0, -h - w * .1, w * .16, 0, TAU); g.fill();
  } else if (f.kind === 'shroom') {
    const w = h * .7, top = -h * .75 + sway * .3;
    inked(g, lw, () => rrect(g, -h * .08, top, h * .16, -top, h * .06));
    inked(g, lw, () => { g.beginPath(); g.moveTo(-w / 2 + sway, top + h * .04); g.quadraticCurveTo(sway, top - h * .5, w / 2 + sway, top + h * .04); g.closePath(); });
    g.fillStyle = '#000'; [[-.15, -.12], [.1, -.18], [.22, -.06]].forEach(([dx, dy]) => { g.beginPath(); g.arc(sway + dx * h, top + dy * h, h * .045, 0, TAU); g.fill(); });
  } else {
    g.lineWidth = lw * 1.3;
    const br = (x, y, a, len, d) => {
      const ex = x + Math.cos(a) * len + sway * (1 - d / 4), ey = y + Math.sin(a) * len;
      g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      if (d < 2) { br(ex, ey, a - .5, len * .7, d + 1); br(ex, ey, a + .45, len * .65, d + 1); }
      else { inked(g, lw * .8, () => { g.beginPath(); g.arc(ex, ey, h * .07, 0, TAU); }, '#fff', 0); }
    };
    br(0, 0, -Math.PI / 2 + f.lean * .4, h * .45, 0);
  }
  g.restore();
}

/* ---------- creatures ---------- */
// o: face, ph (distance walked, for the leg swing), moving, t
function drawCreature(g, lw, sp, o) {
  g.save(); g.scale(o.face, 1); g.lineCap = 'round'; g.lineJoin = 'round';
  const hov = sp.hover ? .5 + Math.sin(o.t * 3 + o.ph) * .1 : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.ph * 3)) * .05 * sp.bh : Math.sin(o.t * 2 + o.ph) * .015;
  const by = -(sp.legLen + sp.bh / 2) - hov - bob, bw = sp.bw, bh = sp.bh, solid = sp.pat === 'solid';
  const legW = Math.max(lw * 1.3, bw * .07);
  if (sp.legs) {
    g.strokeStyle = '#000'; g.lineWidth = legW;
    for (let i = 0; i < sp.legs; i++) {
      const pair = Math.floor(i / 2), pairs = sp.legs / 2, x = pairs > 1 ? lerp(-bw * .32, bw * .32, pair / (pairs - 1)) : 0;
      const side = i % 2, sw = o.moving ? Math.sin(o.ph * 3 + pair * 1.7 + side * Math.PI) : 0;
      const hipY = by + bh * .25, foot = x + (side ? .06 : -.06) * bw + sw * sp.legLen * .35;
      g.globalAlpha = side ? .55 : 1;
      g.beginPath(); g.moveTo(x, hipY); g.lineTo((x + foot) / 2 + sp.legLen * .12, hipY + (-hipY) * .55); g.lineTo(foot, -bob * .2); g.stroke();
    }
    g.globalAlpha = 1;
  } else if (!sp.hover) {
    g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(-bw * .5, 0); g.lineTo(bw * .5, 0); g.stroke();
  }
  if (sp.tail) {
    const wag = Math.sin(o.t * (o.moving ? 8 : 3) + o.ph) * bh * .15;
    g.strokeStyle = '#000'; g.lineWidth = legW * (sp.tail === 2 ? 1.6 : 1);
    g.beginPath(); g.moveTo(-bw * .42, by - bh * .1);
    g.quadraticCurveTo(-bw * .75, by - bh * .1 + wag, -bw * .8, by - bh * (sp.tail === 2 ? .7 : -.2) + wag); g.stroke();
    if (sp.tail === 2) { g.fillStyle = '#000'; g.beginPath(); g.arc(-bw * .8, by - bh * .7 + wag, legW * 1.2, 0, TAU); g.fill(); }
  }
  const body = () => { g.beginPath(); g.ellipse(0, by, bw / 2, bh / 2, 0, 0, TAU); };
  inked(g, lw, body, solid ? '#000' : '#fff');
  if (sp.pat === 'spots' || sp.pat === 'stripes' || sp.pat === 'belly') {
    g.save(); body(); g.clip(); g.fillStyle = '#000';
    if (sp.pat === 'spots') [[-.2, -.15, .09], [.08, -.28, .07], [.2, .02, .06], [-.05, .05, .05]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * bw, by + y * bh, r * bw, 0, TAU); g.fill(); });
    else if (sp.pat === 'stripes') for (let i = -2; i <= 2; i++) g.fillRect(i * bw * .18 - bw * .035, by - bh, bw * .07, bh * 2);
    else { g.lineWidth = lw * .7; g.strokeStyle = '#000'; g.beginPath(); for (let x = -bw / 2; x < bw / 2; x += bw * .09) { g.moveTo(x, by + bh * .5); g.lineTo(x + bh * .3, by + bh * .1); } g.stroke(); }
    g.restore(); body(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  }
  const hr = sp.head, hx = bw * .45 + sp.neck * .35, hy = by - bh * .3 - sp.neck * .6;
  if (sp.neck > .05) {
    g.lineWidth = hr * .9 + lw * 2; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(bw * .25, by - bh * .1); g.lineTo(hx, hy); g.stroke();
    g.lineWidth = hr * .9; g.strokeStyle = solid ? '#000' : '#fff'; g.stroke();
  }
  g.strokeStyle = '#000'; g.lineWidth = lw;
  if (sp.horn === 1) { g.beginPath(); g.moveTo(hx - hr * .3, hy - hr * .8); g.quadraticCurveTo(hx - hr * .9, hy - hr * 1.8, hx - hr * .2, hy - hr * 2); g.moveTo(hx + hr * .2, hy - hr * .9); g.quadraticCurveTo(hx - hr * .2, hy - hr * 1.9, hx + hr * .5, hy - hr * 2.1); g.stroke(); }
  if (sp.horn === 2) { g.beginPath(); g.moveTo(hx, hy - hr); g.lineTo(hx - hr * .3, hy - hr * 2); g.moveTo(hx + hr * .3, hy - hr * .95); g.lineTo(hx + hr * .5, hy - hr * 1.9); g.stroke(); g.fillStyle = '#000'; [[hx - hr * .3, hy - hr * 2], [hx + hr * .5, hy - hr * 1.9]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, hr * .18, 0, TAU); g.fill(); }); }
  if (sp.horn === 3) inked(g, lw, () => poly(g, [[hx + hr * .5, hy - hr * .6], [hx + hr * 1.5, hy - hr * 1.1], [hx + hr * .8, hy - hr * .2]]), '#000', 0);
  inked(g, lw, () => { g.beginPath(); g.arc(hx, hy, hr, 0, TAU); }, solid ? '#000' : '#fff');
  const blink = (o.t + o.ph) % 4 < .12;
  for (let i = 0; i < sp.eyes; i++) {
    const ex = hx + hr * (.35 - (sp.eyes - 1) * .2 + i * .4), ey = hy - hr * .15 - (i % 2) * hr * .12, er = hr * (sp.eyes === 1 ? .42 : .28);
    if (blink) { g.beginPath(); g.moveTo(ex - er, ey); g.lineTo(ex + er, ey); g.strokeStyle = solid ? '#fff' : '#000'; g.lineWidth = lw; g.stroke(); continue; }
    g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = lw * .8; g.strokeStyle = '#000'; g.stroke();
    g.beginPath(); g.arc(ex + er * .3, ey, er * .5, 0, TAU); g.fillStyle = '#000'; g.fill();
  }
  g.beginPath(); g.moveTo(hx + hr * .25, hy + hr * .5); g.quadraticCurveTo(hx + hr * .6, hy + hr * .7, hx + hr * .85, hy + hr * .4);
  g.strokeStyle = solid ? '#fff' : '#000'; g.lineWidth = lw * .8; g.stroke();
  g.restore();
}

/* ---------- watchers: floating drones that punish greedy mining ---------- */
// o: look (angle to the explorer), charge (0 to 1 before a zap)
function drawDrone(g, lw, o) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  inked(g, lw, () => poly(g, [[-.4, -.1], [-.85, -.35], [-.75, .15]]));
  inked(g, lw, () => poly(g, [[.4, -.1], [.85, -.35], [.75, .15]]));
  g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(0, -.45); g.lineTo(0, -.75); g.stroke();
  g.beginPath(); g.arc(0, -.8, .08, 0, TAU); g.fillStyle = '#000'; g.fill();
  inked(g, lw, () => { g.beginPath(); g.arc(0, 0, .46, 0, TAU); });
  g.beginPath(); g.arc(0, 0, .46, .15 * Math.PI, .85 * Math.PI); g.lineWidth = lw; g.stroke();
  const lx = Math.cos(o.look) * .07, ly = Math.sin(o.look) * .05;
  if (o.charge > 0 && Math.floor(o.charge * 12) % 2) {
    g.beginPath(); g.arc(lx, ly - .02, .24, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = lw * 1.8; g.stroke();
    g.beginPath(); g.arc(lx, ly - .02, .08, 0, TAU); g.fillStyle = '#000'; g.fill();
  } else {
    g.beginPath(); g.arc(lx, ly - .02, .24, 0, TAU); g.fillStyle = '#000'; g.fill();
    g.beginPath(); g.arc(lx * 2.2, ly * 2.2 - .04, .07, 0, TAU); g.fillStyle = '#fff'; g.fill();
  }
  g.restore();
}

/* ---------- planets seen from space (screen pixels) ---------- */
function drawPlanet(g, pl, R, t, lw) {
  lw = lw || 2.2;
  const look = pl.look, ring = rp => {
    g.save(); g.rotate(look.tilt); g.beginPath();
    g.ellipse(0, 0, R * 1.75, R * .42, 0, rp ? Math.PI : 0, rp ? TAU : Math.PI);
    g.lineWidth = lw * 2.4; g.strokeStyle = '#000'; g.stroke(); g.lineWidth = lw * .9; g.strokeStyle = '#fff'; g.stroke(); g.restore();
  };
  if (look.ring) ring(true);
  g.fillStyle = '#000'; g.beginPath(); g.arc(lw * 1.6, lw * 1.9, R, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineWidth = lw * .7; g.lineCap = 'round';
  const r = RNG(pl.seed, 'face'), spin = t * 4 % (R * 2);
  if (pl.wx === 'calm') { for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-R, i * R * .32); g.quadraticCurveTo(0, i * R * .32 + R * .12, R, i * R * .32); g.stroke(); } }
  else if (pl.wx === 'scorched') { for (let i = 0; i < 26; i++) { const x = (r() * R * 2 + spin) % (R * 2) - R, y = (r() * 2 - 1) * R; g.beginPath(); g.arc(x, y, lw * .45, 0, TAU); g.fill(); } }
  else if (pl.wx === 'frozen') { g.beginPath(); g.ellipse(0, -R, R * .8, R * .38, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, R, R * .7, R * .3, 0, 0, TAU); g.stroke(); }
  else if (pl.wx === 'airless') { for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((r() * 2 - 1) * R * .7, (r() * 2 - 1) * R * .7, R * (.1 + r() * .15), 0, TAU); g.stroke(); } }
  else if (pl.wx === 'toxic') { for (let i = 0; i < 8; i++) { g.beginPath(); g.arc((r() * 2 - 1) * R * .8, (r() * 2 - 1) * R * .8, R * (.08 + r() * .1), 0, TAU); g.stroke(); } }
  else { for (let i = 0; i < 3; i++) { const x = (r() * 2 - 1) * R * .6, y = (r() * 2 - 1) * R * .6; g.beginPath(); for (let a = 0; a < 9; a += .3) { const d = a * R * .03; g.lineTo(x + Math.cos(a + t * .3) * d, y + Math.sin(a + t * .3) * d * .7); } g.stroke(); } }
  // the night side, hatched
  g.beginPath(); g.rect(-R * 2, -R * 2, R * 4, R * 4); g.arc(-R * .32, -R * .3, R * 1.08, 0, TAU, true); g.clip();
  g.lineWidth = lw * .6; g.beginPath(); for (let x = -R * 2; x < R * 2; x += lw * 2.2) { g.moveTo(x, R); g.lineTo(x + R * 2, -R); } g.stroke();
  g.restore();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  if (look.ring) ring(false);
}

/* ---------- the lie of the land: things you walk round ---------- */
// diagonal shading over the box x0..x1, y0..y1 (the shadow side of a thing)
function hatchClip(g, lw, x0, y0, x1, y1, gap) {
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.lineWidth = lw * .7; g.strokeStyle = '#000'; g.beginPath();
  for (let x = x0 - (y1 - y0); x < x1; x += gap) { g.moveTo(x, y1); g.lineTo(x + (y1 - y0), y0); }
  g.stroke(); g.restore();
}
function drawBoulder(g, lw, b) {
  const p = rockPts(b.sd).map(([x, y]) => [x * b.s * 1.1, y * b.s * 1.25]), path = () => poly(g, p);
  inked(g, lw, path);
  g.save(); path(); g.clip(); hatchClip(g, lw, b.s * .25, -b.s * 1.2, b.s * 1.2, 0, .16); g.restore();
  path(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  g.beginPath(); g.moveTo(-b.s * .45, -b.s * .7); g.lineTo(-b.s * .15, -b.s * .45); g.lineTo(-b.s * .25, -b.s * .2); g.lineWidth = lw * .8; g.stroke();
}
// a flat-topped cliff: a ragged rim seen a little from above, and a striped, shaded rock face
function drawMesa(g, lw, b) {
  const w = b.w, h = b.h, r = RNG(b.sd, 'rim'), n = 22;
  if (!b.rim) b.rim = Array.from({ length: n }, () => .9 + r() * .16);
  const rim = i => { const a = i / n * TAU, k = b.rim[((i % n) + n) % n]; return [Math.cos(a) * w * .95 * k, -h + Math.sin(a) * w * .42 * k]; };
  const face = () => {
    g.beginPath(); g.moveTo(-w, 0); const l = rim(n / 2); g.lineTo(l[0], l[1]);
    for (let i = n / 2; i >= 0; i--) { const q = rim(i); g.lineTo(q[0], q[1]); }
    g.lineTo(w, 0); g.ellipse(0, 0, w, w * .5, 0, 0, Math.PI); g.closePath();
  };
  inked(g, lw, face);
  g.save(); face(); g.clip();
  hatchClip(g, lw, w * .4, -h - w, w, w * .5, .2);
  g.lineWidth = lw * .8; g.strokeStyle = '#000'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { let x = -w * .9 + r() * w * 1.4, y = -h + w * .3 + r() * h * .3; g.beginPath(); g.moveTo(x, y); for (let k = 0, m = 2 + (r() * 3 | 0); k < m; k++) { x += (r() - .5) * .5; y += .3 + r() * h * .2; g.lineTo(x, y); } g.stroke(); }
  g.lineWidth = lw; g.setLineDash([.5, .3]); [.35, .68].forEach(f => { g.beginPath(); g.ellipse(0, -h * f, w * (1 - .05 * f), w * (.5 - .08 * f), 0, 0, Math.PI); g.stroke(); }); g.setLineDash([]);
  g.restore();
  g.beginPath(); for (let i = 0; i < n; i++) { const q = rim(i); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.closePath();
  g.fillStyle = '#fff'; g.fill(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  g.fillStyle = '#000';
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc((r() - .5) * w * 1.2, -h + (r() - .5) * w * .4, .06, 0, TAU); g.fill(); }
  g.lineWidth = lw * .8; g.beginPath(); g.moveTo(-w * .3, -h + .1); g.quadraticCurveTo(-w * .1, -h - .2, w * .15, -h + .05); g.stroke();
}
// a big tree, drawn to suit the weather
function drawTree(g, lw, b, wx, t) {
  const s = b.s, sway = Math.sin(t * .9 + (b.sd % 11)) * .06 * s;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000';
  if (wx === 'frozen') {
    inked(g, lw, () => rrect(g, -.18 * s, -1 * s, .36 * s, 1 * s, .08 * s));
    [[-2.9, 1.1], [-2.1, 1.5], [-1.3, 1.9]].reverse().forEach(([y, hw], i) => inked(g, lw, () => poly(g, [[-hw * s, (y + 1.2) * s], [sway, (y - .9) * s], [hw * s, (y + 1.2) * s]])));
    g.fillStyle = '#000'; poly(g, [[sway - .25 * s, -3.4 * s], [sway, -3.8 * s], [sway + .25 * s, -3.4 * s]]); g.fill();
  } else if (wx === 'scorched') {
    g.lineWidth = .3 * s; const br = (x, y, a, len, d) => { const ex = x + Math.cos(a) * len + sway * d * .3, ey = y + Math.sin(a) * len; g.lineWidth = Math.max(lw * 1.2, .3 * s * (1 - d * .28)); g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); if (d < 3) { br(ex, ey, a - .55, len * .68, d + 1); br(ex, ey, a + .5, len * .62, d + 1); } };
    br(0, 0, -Math.PI / 2, 1.6 * s, 0);
  } else if (wx === 'toxic') {
    inked(g, lw, () => rrect(g, -.28 * s, -2.6 * s, .56 * s, 2.6 * s, .2 * s));
    const cap = () => { g.beginPath(); g.moveTo(-1.7 * s + sway, -2.4 * s); g.quadraticCurveTo(sway, -4.4 * s, 1.7 * s + sway, -2.4 * s); g.quadraticCurveTo(sway, -2.8 * s, -1.7 * s + sway, -2.4 * s); };
    inked(g, lw, cap);
    g.fillStyle = '#000'; [[-.8, -3], [.1, -3.5], [.9, -2.9], [-.2, -2.85]].forEach(([x, y]) => { g.beginPath(); g.arc(x * s + sway, y * s, .15 * s, 0, TAU); g.fill(); });
    g.lineWidth = lw; [-1.2, .4, 1.3].forEach(x => { g.beginPath(); g.moveTo(x * s + sway, -2.45 * s); g.lineTo(x * s + sway, -2.1 * s); g.stroke(); g.beginPath(); g.arc(x * s + sway, -2.02 * s, .07 * s, 0, TAU); g.fill(); });
  } else if (wx === 'stormy') {
    g.lineWidth = .32 * s + lw * 2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(.5 * s, -1.8 * s, sway + .2 * s, -3.4 * s); g.stroke();
    g.lineWidth = .32 * s; g.strokeStyle = '#fff'; g.stroke(); g.strokeStyle = '#000';
    g.lineWidth = lw * .8; for (let y = .4; y < 3.2; y += .45) { g.beginPath(); g.moveTo(-.05 * s + y * .08 * s, -y * s); g.lineTo(.3 * s + y * .08 * s, -y * s - .05 * s); g.stroke(); }
    g.lineWidth = lw * 1.4; const tx = sway + .2 * s, ty = -3.4 * s;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 5 - .5) * 3.2, l = 1.5 * s; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - .5 * s, tx + Math.cos(a) * l, ty + Math.sin(a) * l * .5 + .6 * s); g.stroke(); }
  } else {
    inked(g, lw, () => { g.beginPath(); g.moveTo(-.25 * s, 0); g.lineTo(-.15 * s, -2.2 * s); g.lineTo(.15 * s, -2.2 * s); g.lineTo(.25 * s, 0); g.closePath(); });
    const blobs = [[0, -3.3, 1], [-.85, -2.8, .8], [.85, -2.8, .8], [0, -2.5, .8], [-.4, -3.8, .6], [.5, -3.7, .6]];
    g.fillStyle = '#000'; g.beginPath(); blobs.forEach(([x, y, r]) => { const cx = x * s + sway + lw * 1.6, cy = y * s + lw * 1.8; g.moveTo(cx + r * s, cy); g.arc(cx, cy, r * s + lw, 0, TAU); }); g.fill();
    g.beginPath(); blobs.forEach(([x, y, r]) => { g.moveTo(x * s + sway + r * s + lw, y * s); g.arc(x * s + sway, y * s, r * s + lw, 0, TAU); }); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); blobs.forEach(([x, y, r]) => { g.moveTo(x * s + sway + r * s, y * s); g.arc(x * s + sway, y * s, r * s, 0, TAU); }); g.fill();
    g.lineWidth = lw * .8; const r = RNG(b.sd, 'leaf'); g.beginPath();
    for (let i = 0; i < 9; i++) { const x = (r() - .5) * 2.2 * s + sway, y = (-2.5 - r() * 1.4) * s; g.moveTo(x, y); g.quadraticCurveTo(x + .12 * s, y - .12 * s, x + .24 * s, y); }
    g.stroke();
  }
  g.restore();
}
// pools lie flat on the ground: water, acid, tar, or ice you can walk on
const _blob = {};
function blobPath(g, b) {
  if (!_blob[b.sd]) { const r = RNG(b.sd, 'pool'), n = 12; _blob[b.sd] = Array.from({ length: n }, (_, i) => { const a = i / n * TAU, k = .82 + r() * .3; return [Math.cos(a) * b.rx * k, Math.sin(a) * b.ry * k]; }); }
  const P = _blob[b.sd], n = P.length, mid = i => [(P[i][0] + P[(i + 1) % n][0]) / 2, (P[i][1] + P[(i + 1) % n][1]) / 2];
  g.beginPath(); let m = mid(n - 1); g.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { m = mid(i); g.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
  g.closePath();
}
function drawPool(g, lw, b, t) {
  g.save(); g.translate(b.x, b.y);
  const tar = b.kind === 'tar';
  blobPath(g, b); g.fillStyle = tar ? '#000' : '#fff'; g.fill(); g.lineWidth = lw * 1.3; g.strokeStyle = '#000'; g.stroke();
  g.save(); blobPath(g, b); g.clip();
  const r = RNG(b.sd, 'marks');
  if (b.kind === 'water') {
    g.lineWidth = lw * .8; g.strokeStyle = '#000'; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const x = (r() - .5) * b.rx * 1.6 + Math.sin(t * .8 + i) * .15, y = (r() - .5) * b.ry * 1.6; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + .2, y - .15, x + .4, y + .15, x + .6, y); g.stroke(); }
    g.setLineDash([.3, .3]); g.save(); g.scale(.8, .8); blobPath(g, b); g.restore(); g.stroke(); g.setLineDash([]);
  } else if (b.kind === 'acid') {
    g.lineWidth = lw * .8; g.strokeStyle = '#000';
    for (let i = 0; i < 9; i++) { const k = (t * .4 + r()) % 1, x = (r() - .5) * b.rx * 1.5, y = (r() - .5) * b.ry * 1.5 - k * .3; g.globalAlpha = 1 - k; g.beginPath(); g.arc(x, y, .12 + r() * .2, 0, TAU); g.stroke(); }
    g.globalAlpha = 1; g.setLineDash([.15, .25]); g.save(); g.scale(.75, .75); blobPath(g, b); g.restore(); g.stroke(); g.setLineDash([]);
  } else if (tar) {
    g.lineWidth = lw * .9; g.strokeStyle = '#fff';
    for (let i = 0; i < 7; i++) { const k = (t * .3 + r()) % 1, x = (r() - .5) * b.rx * 1.4, y = (r() - .5) * b.ry * 1.4; g.globalAlpha = 1 - k; g.beginPath(); g.arc(x, y, .1 + k * .3, 0, TAU); g.stroke(); }
    g.globalAlpha = 1; g.beginPath(); g.moveTo(-b.rx * .4, -b.ry * .45); g.quadraticCurveTo(0, -b.ry * .6, b.rx * .3, -b.ry * .5); g.stroke();
  } else {
    g.lineWidth = lw * .8; g.strokeStyle = '#000';
    for (let i = 0; i < 5; i++) { let x = (r() - .5) * b.rx, y = (r() - .5) * b.ry; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (r() - .5) * 1.4; y += (r() - .5) * .6; g.lineTo(x, y); } g.stroke(); }
    g.beginPath(); g.moveTo(-b.rx * .5, -b.ry * .3); g.lineTo(-b.rx * .2, -b.ry * .5); g.moveTo(-b.rx * .45, -b.ry * .1); g.lineTo(-b.rx * .3, -b.ry * .2); g.stroke();
  }
  g.restore(); g.restore();
}

/* ---------- places to find ---------- */
// o: t, used (already looted or read)
function drawWreck(g, lw, o) {
  const r = RNG(o.sd, 'wreck');
  g.save(); g.translate(.9, .9); g.rotate(.3); // the broken end is buried nose-down in the dirt
  g.save(); g.beginPath(); g.moveTo(-4, -5); g.lineTo(.5, -5); g.lineTo(.2, -3); g.lineTo(.8, -2); g.lineTo(.3, -1); g.lineTo(.7, 1); g.lineTo(-4, 1); g.closePath(); g.clip();
  drawShip(g, lw, { legs: 0, flame: 0 }); g.restore();
  g.beginPath(); g.moveTo(.5, -2.3); g.lineTo(.2, -2); g.lineTo(.8, -1.7); g.lineTo(.3, -1.2); g.lineTo(.6, -.9); g.lineWidth = lw * 1.3; g.strokeStyle = '#000'; g.stroke();
  g.restore();
  for (let i = 0; i < 4; i++) { const x = 1.2 + r() * 2.2, s = .2 + r() * .3, a = r() * 3; inked(g, lw, () => { g.save(); g.translate(x, -s * .3); g.rotate(a); poly(g, [[-s, 0], [0, -s * .7], [s, -s * .2], [s * .4, s * .4]]); g.restore(); }); }
  if (!o.used) { const k = (Math.sin(o.t * 4) + 1) / 2; g.beginPath(); g.arc(-1.3, -2.9, .12 + k * .06, 0, TAU); g.fillStyle = '#000'; g.fill(); g.lineWidth = lw * .8; g.globalAlpha = 1 - k; g.beginPath(); g.arc(-1.3, -2.9, .25 + k * .35, 0, TAU); g.stroke(); g.globalAlpha = 1; }
}
function drawPod(g, lw, o) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(.3, -1.5); g.lineTo(.5, -2.1); g.stroke();
  if (!o.used && Math.sin(o.t * 5) > 0) { g.beginPath(); g.arc(.5, -2.15, .09, 0, TAU); g.fillStyle = '#000'; g.fill(); }
  inked(g, lw, () => rrect(g, -.6, -1.4, 1.2, 1.4, .25));
  g.beginPath(); g.moveTo(-.6, -.55); g.lineTo(.6, -.55); g.moveTo(-.6, -.4); g.lineTo(.6, -.4); g.lineWidth = lw * .8; g.stroke();
  if (o.used) inked(g, lw, () => { g.save(); g.translate(-.9, -.1); g.rotate(-1.2); rrect(g, -.6, -.2, 1.2, .3, .12); g.restore(); });
  else { inked(g, lw, () => { g.beginPath(); g.moveTo(-.65, -1.35); g.quadraticCurveTo(0, -1.95, .65, -1.35); g.closePath(); }); g.fillStyle = '#000'; g.fillRect(-.12, -1.1, .24, .3); }
  g.restore();
}
function drawMonolith(g, lw, o) {
  const slab = () => poly(g, [[-.55, 0], [-.42, -3.7], [.38, -3.9], [.55, 0]]);
  inked(g, lw, slab);
  g.save(); slab(); g.clip(); hatchClip(g, lw, .15, -4, .6, 0, .14); g.restore(); slab(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  const r = RNG(o.sd, 'glyph'); g.lineWidth = lw * .9; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const y = -3.3 + i * .6, x = -.2; g.beginPath(); if (r() < .5) g.arc(x, y, .12, 0, TAU); else { g.moveTo(x - .15, y - .1); g.lineTo(x + .1, y + .12); g.moveTo(x + .1, y - .12); g.lineTo(x - .12, y + .1); } g.stroke(); }
  if (!o.used) { g.save(); g.translate(0, -4.6 + Math.sin(o.t * 1.5) * .12); g.rotate(Math.sin(o.t * .7) * .2); g.beginPath(); g.ellipse(0, 0, .7, .2, 0, 0, TAU); g.lineWidth = lw * 1.3; g.setLineDash([.2, .15]); g.lineDashOffset = -o.t; g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(0, 0, .09, 0, TAU); g.fillStyle = '#000'; g.fill(); g.restore(); }
}
function drawCave(g, lw, o) {
  const hump = () => { g.beginPath(); g.moveTo(-2.6, 0); g.quadraticCurveTo(-2.7, -1.8, -1.2, -2.3); g.quadraticCurveTo(0, -2.9, 1.3, -2.2); g.quadraticCurveTo(2.8, -1.7, 2.6, 0); g.closePath(); };
  inked(g, lw, hump);
  g.save(); hump(); g.clip(); hatchClip(g, lw, .8, -3, 3, 0, .18); g.restore(); hump(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
  g.beginPath(); g.moveTo(-1.1, 0); g.quadraticCurveTo(-1.2, -1.5, 0, -1.55); g.quadraticCurveTo(1.2, -1.5, 1.1, 0); g.closePath(); g.fillStyle = '#000'; g.fill();
  g.fillStyle = '#fff'; [[-.6, -1.3, .25], [-.1, -1.45, .35], [.45, -1.32, .22]].forEach(([x, y, l]) => { g.beginPath(); g.moveTo(x - .09, y); g.lineTo(x, y + l); g.lineTo(x + .09, y); g.fill(); });
}

function drawChart(g, lw, o) {
  g.save(); g.rotate(-.35);
  inked(g, lw, () => rrect(g, -.28, -.95, .56, 1.05, .2));
  g.beginPath(); g.moveTo(-.28, -.72); g.lineTo(.28, -.72); g.lineWidth = lw * .8; g.strokeStyle = '#000'; g.stroke();
  const star = (x, y, s) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .45 : s; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fillStyle = '#000'; g.fill(); };
  star(0, -.38, .17);
  g.restore();
  // a glint every couple of seconds, for sharp eyes
  const k = (o.t * .6 + (o.sd % 7) / 7) % 1;
  if (!o.used && k < .15) { const s = Math.sin(k / .15 * Math.PI) * .35; g.lineWidth = lw * 1.2; g.strokeStyle = '#000'; g.lineCap = 'round'; g.beginPath(); g.moveTo(.2 - s, -1.1); g.lineTo(.2 + s, -1.1); g.moveTo(.2, -1.1 - s); g.lineTo(.2, -1.1 + s); g.stroke(); }
  g.beginPath(); g.ellipse(0, 0, .55, .14, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = lw; g.strokeStyle = '#000'; g.stroke();
}

/* ---------- ground details (flat) ---------- */
function drawStamp(g, lw, d) {
  const r = RNG(d.sd, 'stamp'), s = d.s; g.save(); g.translate(d.x, d.y); g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round'; g.lineWidth = lw * .8;
  const k = d.k;
  if (k === 'flowers') for (let i = 0; i < 4; i++) {
    const x = (r() - .5) * s, y = (r() - .5) * s * .5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - .25); g.stroke();
    for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * .09, y - .32 + Math.sin(a) * .09, .06, 0, TAU); g.stroke(); }
    g.beginPath(); g.arc(x, y - .32, .035, 0, TAU); g.fill();
  } else if (k === 'grass') for (let i = 0; i < 7; i++) { const x = (r() - .5) * s * .8, h = .25 + r() * .3, lean = (r() - .5) * .3; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + lean * .3, -h * .6, x + lean, -h); g.stroke(); }
  else if (k === 'pebbles') for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((r() - .5) * s, (r() - .5) * s * .5, .06 + r() * .1, .04 + r() * .06, 0, 0, TAU); r() < .5 ? g.fill() : g.stroke(); }
  else if (k === 'dune') for (let i = 0; i < 3; i++) { const y = i * .35 - .35; g.beginPath(); g.moveTo(-s * .8, y); g.quadraticCurveTo(0, y - .35, s * .8, y + .05); g.stroke(); }
  else if (k === 'bones') { g.lineWidth = lw; g.beginPath(); g.moveTo(-.8, 0); g.lineTo(.6, -.05); for (let i = 0; i < 4; i++) { const x = -.5 + i * .3; g.moveTo(x, -.03); g.quadraticCurveTo(x + .1, -.4, x + .25, -.35); g.moveTo(x, 0); g.quadraticCurveTo(x + .1, .3, x + .25, .25); } g.stroke(); g.beginPath(); g.ellipse(.8, -.05, .22, .16, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(.85, -.08, .05, 0, TAU); g.fill(); }
  else if (k === 'drift') { g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(-s * .3, -.5, s * .2, -.2); g.quadraticCurveTo(s * .6, -.05, s, 0); g.stroke(); for (let x = -s * .5; x < s * .5; x += .25) { g.beginPath(); g.moveTo(x, -.05); g.lineTo(x + .12, .1); g.stroke(); } }
  else if (k === 'ice') { g.beginPath(); g.ellipse(0, 0, s * .7, s * .3, 0, 0, TAU); g.stroke(); let x = -s * .4, y = 0; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 4; i++) { x += s * .2; y += (r() - .5) * .3; g.lineTo(x, y); } g.stroke(); }
  else if (k === 'goo') { g.lineWidth = lw; g.beginPath(); g.ellipse(0, 0, s * .45, s * .2, 0, 0, TAU); g.stroke(); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((r() - .5) * s * .5, (r() - .5) * s * .15, .06 + r() * .06, 0, TAU); g.stroke(); } }
  else if (k === 'spores') for (let i = 0; i < 4; i++) { g.setLineDash([.06, .08]); g.beginPath(); g.arc((r() - .5) * s, (r() - .5) * s * .5, .12 + r() * .15, 0, TAU); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc((r() - .5) * s, (r() - .5) * s * .5, .04, 0, TAU); g.fill(); }
  else if (k === 'puddle') { g.lineWidth = lw; g.beginPath(); g.ellipse(0, 0, s * .5, s * .22, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-s * .2, -.02); g.bezierCurveTo(-s * .12, -.08, -s * .05, .04, s * .05, -.02); g.stroke(); }
  g.restore();
}

/* ---------- birds, seen from below ---------- */
function drawBird(g, lw, flap, s) {
  g.beginPath(); g.moveTo(-s, -flap * s); g.quadraticCurveTo(-s * .4, -s * .3, 0, 0); g.quadraticCurveTo(s * .4, -s * .3, s, -flap * s);
  g.lineWidth = lw * 1.3; g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}

/* ---------- the trading station (screen pixels) ---------- */
function drawStation(g, R, t, lw) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const panel = s => { g.save(); g.translate(s * R * 1.55, 0); inked(g, lw, () => rrect(g, -R * .5, -R * .28, R, R * .56, 2)); g.lineWidth = lw * .6; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(-R * .5 + i * R * .25, -R * .28); g.lineTo(-R * .5 + i * R * .25, R * .28); } g.moveTo(-R * .5, 0); g.lineTo(R * .5, 0); g.stroke(); g.restore(); };
  g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(-R * 1.05, 0); g.lineTo(R * 1.05, 0); g.stroke();
  panel(-1); panel(1);
  g.save(); g.rotate(t * .25); g.beginPath(); g.ellipse(0, 0, R * .95, R * .95, 0, 0, TAU); g.lineWidth = lw * 2.6; g.stroke(); g.lineWidth = lw; g.strokeStyle = '#fff'; g.setLineDash([3, 4]); g.stroke(); g.setLineDash([]); g.restore();
  inked(g, lw, () => { g.beginPath(); g.arc(0, 0, R * .45, 0, TAU); });
  g.beginPath(); g.arc(0, 0, R * .16, 0, TAU); g.fillStyle = '#000'; g.fill();
  if (Math.sin(t * 3) > 0) { g.beginPath(); g.arc(0, -R * 1.2, 1.8, 0, TAU); g.fill(); }
  g.strokeStyle = '#000'; g.lineWidth = lw; g.beginPath(); g.moveTo(0, -R * .45); g.lineTo(0, -R * 1.1); g.stroke();
  g.restore();
}

/* ---------- small pictures as images, for sheets ---------- */
const _thumbs = {};
function creatureThumb(sp, key) {
  const id = key + ':' + sp.idx; if (_thumbs[id]) return _thumbs[id];
  const c = document.createElement('canvas'), S = 2, w = 120, h = 96; c.width = w * S; c.height = h * S;
  // frame the whole animal, from the tip of its tail to the front of its head
  const left = -sp.bw * .85, right = sp.bw * .45 + sp.neck * .35 + sp.head * 1.6;
  const g = c.getContext('2d'), tall = speciesHeight(sp) + sp.head + .3, z = Math.min((h - 12) / tall, (w - 14) / (right - left));
  g.setTransform(S * z, 0, 0, S * z, S * (w / 2 - (left + right) / 2 * z), S * (h - 6));
  drawCreature(g, 2.2 / z, sp, { face: 1, ph: 0, moving: false, t: 1 });
  return (_thumbs[id] = c.toDataURL());
}
function planetThumb(pl) {
  const id = 'p' + pl.seed; if (_thumbs[id]) return _thumbs[id];
  const c = document.createElement('canvas'), S = 2, w = 64; c.width = c.height = w * S;
  const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, S * w / 2, S * w / 2);
  drawPlanet(g, pl, pl.look.ring ? 15 : 22, 0, 2);
  return (_thumbs[id] = c.toDataURL());
}

/* ---------- SVG icons (40 × 40) ---------- */
const SV = (inner, vb) => `<svg viewBox="${vb || '0 0 40 40'}" aria-hidden="true"><g fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const ICON = {
  carbon: SV('<path d="M20 35V19"/><path d="M20 22c-8 0-12-6-11-14 8 0 12 5 11 14z" fill="#fff"/><path d="M20 26c6 0 10-5 10-11-7 0-10 4-10 11z" fill="#fff"/>'),
  sodium: SV('<path d="M20 36V25"/><g>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = i / 10 * TAU; return `<path d="M${(20 + Math.cos(a) * 8).toFixed(1)} ${(16 + Math.sin(a) * 8).toFixed(1)}L${(20 + Math.cos(a) * 12.5).toFixed(1)} ${(16 + Math.sin(a) * 12.5).toFixed(1)}"/>`; }).join('') + '</g><circle cx="20" cy="16" r="8" fill="#fff"/><circle cx="20" cy="16" r="3" fill="#000" stroke="none"/>'),
  ferrite: SV('<path d="M5 33 9 19l8-7 10 2 8 9v10z" fill="#fff"/><path d="M24 22l4-4M27 27l4-4M13 20l3 3-1 4"/>'),
  shard: SV('<path d="M15 35 13 17 20 4l7 13-2 18z" fill="#000"/><path d="M27 35l2-10 4 1-1 9z" fill="#000"/><path d="M20 9v22" stroke="#fff" stroke-width="1.8"/>'),
  fuel: SV('<path d="M20 5c7 9 11 14 11 20a11 11 0 0 1-22 0c0-6 4-11 11-20z" fill="#000"/><path d="M15 25a5 5 0 0 0 5 5" stroke="#fff"/>'),
  cell: SV('<path d="M13 9h14v26H13z" fill="#fff"/><path d="M17 5h6v4h-6z" fill="#000"/><path d="M21 13l-5 9h7l-4 9" stroke-width="2.2"/>'),
  scan: SV('<circle cx="20" cy="20" r="4" fill="#000"/><path d="M11 11a13 13 0 0 1 18 0M29 29a13 13 0 0 1-18 0M6 6a20 20 0 0 1 28 0M34 34a20 20 0 0 1-28 0"/>'),
  eye: SV('<path d="M3 20c5-8 11-12 17-12s12 4 17 12c-5 8-11 12-17 12S8 28 3 20z" fill="#fff"/><circle cx="20" cy="20" r="6" fill="#000"/>'),
  calm: SV('<path d="M6 26c4-4 8-4 12 0s8 4 12 0 5-3 6-2"/><path d="M6 16c4-4 8-4 12 0s8 4 12 0 5-3 6-2"/>'),
  scorched: SV('<circle cx="20" cy="20" r="7" fill="#000"/><path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M8.7 31.3l3.5-3.5M27.8 12.2l3.5-3.5"/>'),
  frozen: SV('<path d="M20 4v32M6 12l28 16M6 28l28-16"/><path d="M16 7l4 4 4-4M16 33l4-4 4 4M5 17l6-1-2-5M35 23l-6 1 2 5M5 23l6 1-2 5M35 17l-6-1 2-5"/>'),
  toxic: SV('<path d="M20 5c6 8 10 13 10 19a10 10 0 0 1-20 0c0-6 4-11 10-19z" fill="#fff"/><circle cx="16" cy="25" r="2.5" fill="#000" stroke="none"/><circle cx="23" cy="21" r="1.8" fill="#000" stroke="none"/><circle cx="23" cy="29" r="1.5" fill="#000" stroke="none"/>'),
  stormy: SV('<path d="M11 25a7 7 0 0 1 1-14 9 9 0 0 1 17 2 6 6 0 0 1 0 12z" fill="#fff"/><path d="M21 22l-4 8h6l-3 7" stroke-width="2.6"/>'),
  ship: SV('<path d="M4 25c0-6 3-9 9-9h12c7 0 11 3 11 8-1 2-3 3-7 3H8c-3 0-4-1-4-2z" fill="#fff"/><path d="M21 16c2-5 7-5 10 2z" fill="#000"/><path d="M10 27l-3 7M28 27l3 7"/>'),
  species: SV('<ellipse cx="18" cy="24" rx="12" ry="7" fill="#fff"/><circle cx="31" cy="15" r="5.5" fill="#fff"/><circle cx="32.5" cy="14.5" r="2" fill="#000" stroke="none"/><path d="M12 30v6M24 30v6"/>'),
  wreck: SV('<path d="M4 30l6-10h14l-3 5 4 2-2 3z" fill="#fff"/><path d="M26 22l5-3 3 5-4 3" fill="#fff"/><path d="M30 12v-4M27 10h6"/>'),
  pod: SV('<rect x="11" y="13" width="18" height="22" rx="5" fill="#fff"/><path d="M11 26h18M22 13l3-7"/><circle cx="25" cy="6" r="2" fill="#000" stroke="none"/>'),
  monolith: SV('<path d="M14 36l2-30 9-1 2 31z" fill="#fff"/><path d="M20 12v3M19 19l3 3M22 19l-3 3M20 28v2"/>'),
  cave: SV('<path d="M4 34c0-14 7-22 16-22s16 8 16 22z" fill="#fff"/><path d="M13 34c0-8 3-12 7-12s7 4 7 12z" fill="#000"/>'),
  station: SV('<circle cx="20" cy="20" r="12" stroke-width="3.5"/><circle cx="20" cy="20" r="5.5" fill="#fff"/><circle cx="20" cy="20" r="2" fill="#000" stroke="none"/><path d="M2 20h7M31 20h7"/>'),
  moon: SV('<circle cx="20" cy="20" r="13" fill="#fff"/><circle cx="15" cy="16" r="3"/><circle cx="24" cy="25" r="4"/><circle cx="25" cy="13" r="1.5"/>'),
  airless: SV('<circle cx="20" cy="20" r="13" fill="#fff"/><circle cx="15" cy="16" r="3"/><circle cx="24" cy="25" r="4"/><circle cx="25" cy="13" r="1.5"/>'),
  chart: SV('<path d="M20 5l4 9 10 1-7.5 6.5 2.5 10L20 26l-9 5.5 2.5-10L6 15l10-1z" fill="#000"/>'),
  lock: SV('<rect x="9" y="18" width="22" height="17" rx="4" fill="#fff"/><path d="M14 18v-5a6 6 0 0 1 12 0v5"/>'),
};
const PAUSE_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="8" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="18" y="8" width="5" height="16" rx="1.5" fill="currentColor"/></svg>';
// The trophy from Ink Nine and Ink Rally: solid once won, drawn in outline until then.
const TROPHY = (won) => `<svg viewBox="0 0 40 44" aria-hidden="true"><g stroke="#000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M10 7H5c0 6 3 9 6.5 9.5M30 7h5c0 6-3 9-6.5 9.5" fill="none"/><path d="M10 4h20v9c0 7-4.5 11-10 11S10 20 10 13z" fill="${won ? '#000' : '#fff'}"/><path d="M17 24h6v6h-6z" fill="#fff"/><path d="M11 31h18v6H11z" fill="${won ? '#000' : '#fff'}"/></g></svg>`;
