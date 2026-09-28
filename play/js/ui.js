/* =====================================================================
   Shared page helpers: the canvas, screens and overlay cards (sheet),
   animation helpers, floating numbers, callouts and hints.
   ===================================================================== */
"use strict";
const $ = id => document.getElementById(id);
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const cv = $('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
// S is the scene: which view is showing and the clock. G (the journey in progress) lives in state.js.
const S = { mode: 'title', t: 0, wipe: null };

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function hudShow(which) { $('hud').hidden = which !== 'surface'; $('shud').hidden = which !== 'space'; if (which) show(''); }

function anim(el, frames, dur, ease = 'cubic-bezier(.3,1.5,.5,1)') {
  if (!el || !el.animate) return Promise.resolve();
  return el.animate(frames, { duration: RM ? 1 : dur, easing: ease }).finished.catch(() => {});
}
// Same bump as Ink Nine's score counter: squash, stretch, settle.
const squash = el => anim(el, [
  { transform: 'scale(1)' }, { transform: 'scale(1.3,.78)', offset: .3 }, { transform: 'scale(.9,1.14)', offset: .55 }, { transform: 'scale(1.04,.97)', offset: .78 }, { transform: 'scale(1)' }], 400, 'ease-out');
const nope = el => anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], 300, 'ease-out');

function sheet(html, dismissable = true) {
  const p = $('sheet');
  p.innerHTML = html;
  $('veil').classList.add('on');
  p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
  $('veil').onclick = e => { if (dismissable && e.target === $('veil')) closeSheet(); };
}
const closeSheet = () => $('veil').classList.remove('on');
const sheetOpen = () => $('veil').classList.contains('on');

// numbers that float up from a spot on screen: plain for everyday things, a black pill for special ones
function floatAt(x, y, text, solid) {
  const f = document.createElement('div');
  f.className = 'float' + (solid ? ' m' : ''); f.textContent = text;
  f.style.left = x + 'px'; f.style.top = y + 'px';
  $('fx').appendChild(f);
  anim(f, [
    { transform: 'translate(-50%,6px) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-16px) scale(1.15)', opacity: 1, offset: .3 },
    { transform: 'translate(-50%,-28px) scale(1)', opacity: 1, offset: .75 },
    { transform: 'translate(-50%,-38px) scale(1)', opacity: 0 }], 1100, 'ease-out').then(() => f.remove());
}
function callout(big, small) {
  const el = $('callout'); el.innerHTML = `<b>${big}</b>` + (small ? `<span>${small}</span>` : '');
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
}
let hintTO = 0;
function hint(text, ms = 6500) {
  const el = $('hint'); clearTimeout(hintTO);
  if (!text) { el.classList.remove('on'); return; }
  el.textContent = text; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  hintTO = setTimeout(() => el.classList.remove('on'), ms);
}
const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
addEventListener('resize', resize); resize();
