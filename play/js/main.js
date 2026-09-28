/* =====================================================================
   The paper wipe between scenes, the main loop, and startup. Always last.
   ===================================================================== */
"use strict";
// A circle of paper grows from a point to cover the screen, the scene changes underneath, then a hole opens to show it.
function wipe(x, y, cb) { S.wipe = { x, y, t: 0, cb, done: false }; }
function wipeStep(dt) {
  const w = S.wipe; if (!w) return;
  w.t += dt / (RM ? .25 : .5);
  if (w.t >= 1 && !w.done) { w.done = true; w.cb(); }
  if (w.t >= 2) S.wipe = null;
}
function wipeDraw() {
  const w = S.wipe; if (!w) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  if (w.t < 1) {
    const far = Math.max(Math.hypot(w.x, w.y), Math.hypot(W - w.x, w.y), Math.hypot(w.x, H - w.y), Math.hypot(W - w.x, H - w.y)) + 10, u = w.t * w.t;
    ctx.beginPath(); ctx.arc(w.x, w.y, far * u, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  } else {
    const u = 1 - Math.pow(1 - Math.min(1, w.t - 1), 2), r = Math.hypot(W, H) * .55 * u;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H * .5, r, 0, TAU, true); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2, H * .5, r, 0, TAU); ctx.stroke();
  }
}

let lastT = performance.now();
function tick(now) {
  const dt = Math.max(0, Math.min(.05, (now - lastT) / 1000)); lastT = now; S.t += dt;
  const run = !sheetOpen();
  if (S.mode === 'surface') { if (run) surfaceStep(dt); surfaceDraw(S.t); }
  else if (S.mode === 'space' || S.mode === 'warp' || S.mode === 'core') { if (run || S.mode === 'core') spaceStep(dt); spaceDraw(S.t); }
  else titleDraw(S.t);
  if (run) wipeStep(dt);
  wipeDraw();
}
// an unexpected error must never freeze the game: the next frame is always scheduled
function frame(now) { requestAnimationFrame(frame); try { tick(now); } catch (e) { console.error(e); } }

// Pick up a saved journey after a refresh, the way Ink Nine does. Otherwise start on the home screen.
{ const RUN = loadRun(); if (!(RUN && resumeRun(RUN))) renderTitle(); }
$('ver').textContent = 'Version ' + VERSION;
requestAnimationFrame(frame);
// Handy for testing in the browser console: __ink.G is the journey in progress.
window.__ink = { get G() { return G; }, SF, S };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
