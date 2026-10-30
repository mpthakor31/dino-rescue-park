import * as THREE from 'three';
import { sfx } from './audio.js';
import { buildDino, buildEgg } from './dino.js';
import { SPECIES } from './data.js';
import { save } from './save.js';
import { popupOpened, popupClosed, popupReset } from './ads.js';

export const uiRoot = document.getElementById('ui');

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function clearUI() {
  uiRoot.innerHTML = '';
  popupReset();
}

// Attach a click handler with a tap sound
export function on(el, sel, fn, sound = 'tap') {
  const target = typeof sel === 'string' ? el.querySelector(sel) : el;
  const handler = typeof sel === 'string' ? fn : sel;
  if (!target) return;
  target.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sound) sfx[sound]?.();
    handler(e);
  });
}

export function modal({ title, color = 'var(--yellow)', body, foot = '', onClose, closable = true }) {
  const m = h(`<div class="modal-bg"><div class="panel">
    <div class="panel-head" style="--c:${color}">${title}${closable ? '<button class="btn close">✕</button>' : ''}</div>
    <div class="panel-body"></div>${foot ? `<div class="panel-foot">${foot}</div>` : ''}</div></div>`);
  const b = m.querySelector('.panel-body');
  if (typeof body === 'string') b.innerHTML = body;
  else if (body) b.appendChild(body);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    m.remove();
    popupClosed();
    onClose?.();
  };
  if (closable) on(m, '.close', close);
  uiRoot.appendChild(m);
  popupOpened();
  m.close = close;
  return m;
}

export function floatText(text, x, y, color) {
  const el = h(`<div class="float-text">${text}</div>`);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  if (color) el.style.color = color;
  uiRoot.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

export function centerMsg(text, sub = '', ms = 1600) {
  const el = h(`<div class="center-msg pass">${text}${sub ? `<small>${sub}</small>` : ''}</div>`);
  uiRoot.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

export function bump(el) {
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// Shared coin/egg pills
export function resourcePills() {
  const wrap = h(`<div style="display:flex;gap:8px;flex-wrap:wrap">
    <div class="pill" data-r="coins"><span class="ico">🪙</span><span class="v">${save.coins}</span></div>
    <div class="pill" data-r="eggs"><span class="ico">🥚</span><span class="v">${save.eggs + save.rareEggs}</span></div></div>`);
  wrap.refresh = () => {
    const c = wrap.querySelector('[data-r=coins] .v');
    const e = wrap.querySelector('[data-r=eggs] .v');
    if (+c.textContent !== save.coins) { c.textContent = save.coins; bump(c.parentElement); }
    const eg = save.eggs + save.rareEggs;
    if (+e.textContent !== eg) { e.textContent = eg; bump(e.parentElement); }
  };
  return wrap;
}

// ---------- 3D thumbnails of every dino for menus ----------
const thumbs = {};
export function makeThumbnails() {
  const size = 192;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size);
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a0c0, 1.7));
  const d = new THREE.DirectionalLight(0xffffff, 2.0);
  d.position.set(3, 6, 6);
  scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  for (const sp of SPECIES) {
    const dn = buildDino(sp);
    dn.root.rotation.y = 0.7;
    dn.update(0.016, 0);
    scene.add(dn.root);
    const box = new THREE.Box3().setFromObject(dn.root);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3()).length();
    cam.position.set(c.x + sz * 0.35, c.y + sz * 0.3, c.z + sz * 1.55);
    cam.lookAt(c);
    r.render(scene, cam);
    thumbs[sp.id] = r.domElement.toDataURL('image/png');
    scene.remove(dn.root);
  }
  for (const golden of [false, true]) {
    const e = buildEgg(0xfff4e0, 0x74c0fc, golden);
    scene.add(e);
    cam.position.set(0, 0.6, 5.2);
    cam.lookAt(0, 0.1, 0);
    r.render(scene, cam);
    thumbs[golden ? 'goldegg' : 'egg'] = r.domElement.toDataURL('image/png');
    scene.remove(e);
  }
  r.dispose();
  r.forceContextLoss();
}
export function thumb(id) {
  return thumbs[id] ? `<img src="${thumbs[id]}" alt="">` : '🦖';
}
