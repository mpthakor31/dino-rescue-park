// Tap the egg until it cracks open and a new dino pops out!
import * as THREE from 'three';
import { engine, pick } from '../engine.js';
import { toon, mesh, makeSky, Particles, easeOutBack, flower, bush, palmTree, damp } from '../gfx.js';
import { buildDino, buildEgg } from '../dino.js';
import { rollSpecies } from '../data.js';
import { save, addDino, persist } from '../save.js';
import { clearUI, h, on, uiRoot, modal, thumb, resourcePills } from '../ui.js';
import { sfx } from '../audio.js';
import { showRewarded } from '../ads.js';
import { openShop } from '../menus.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
const particles = new Particles(scene);
let built = false;
let egg = null;
let dino = null;
let cracks = [];
let taps = 0;
const TAPS = 9;
let state = 'idle'; // idle | hatched
let wobble = 0;
let popT = 0;
let golden = false;
let time = 0;
let progressEl = null;
let spotlight;

function buildWorld() {
  scene.add(makeSky(0xffb88c, 0xfff1d6));
  scene.fog = new THREE.Fog(0xffe2c4, 30, 90);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9a85b, 1.5));
  const sun = new THREE.DirectionalLight(0xffe8cc, 2.3);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  spotlight = new THREE.PointLight(0xfff3bf, 0, 12);
  spotlight.position.set(0, 3, 2);
  scene.add(spotlight);

  const ground = mesh(new THREE.CylinderGeometry(9, 10, 1, 40), toon(0x8ce06a), { receive: true, cast: false });
  ground.position.y = -0.5;
  scene.add(ground);
  const far = mesh(new THREE.PlaneGeometry(300, 300), toon(0x7bd65a), { receive: false, cast: false });
  far.rotation.x = -Math.PI / 2;
  far.position.y = -1;
  scene.add(far);

  // Nest
  const straw = toon(0xd9a85b);
  const straw2 = toon(0xc08a3e);
  for (let i = 0; i < 3; i++) {
    const r = mesh(new THREE.TorusGeometry(1.25 + i * 0.12, 0.38 - i * 0.05, 10, 28), i % 2 ? straw2 : straw, { line: i === 0 ? 0.02 : 0 });
    r.rotation.x = Math.PI / 2;
    r.position.y = 0.25 + i * 0.15;
    scene.add(r);
  }
  for (let i = 0; i < 30; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), straw2, { cast: false });
    const a = Math.random() * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.4, 0.5, Math.sin(a) * 1.4);
    s.rotation.set(Math.random() * 1.5, a, Math.random());
    scene.add(s);
  }
  const fcols = [0xff6b6b, 0xffd43b, 0xffffff, 0xcc5de8];
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 5.5;
    const f = flower(fcols[i % 4]);
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    f.scale.setScalar(1.3);
    scene.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    const b = i % 2 ? bush(0x51cf66, 1.2) : palmTree(5 + i % 3);
    b.position.set(Math.cos(a) * 8, 0, Math.sin(a) * 8 - 2);
    scene.add(b);
  }
}

function setupEgg() {
  if (egg) scene.remove(egg);
  if (dino) { scene.remove(dino.root); dino = null; }
  golden = save.rareEggs > 0;
  const spots = [0x74c0fc, 0xff8fab, 0x69db7c, 0xb197fc][Math.floor(Math.random() * 4)];
  egg = buildEgg(0xfff4e0, spots, golden);
  egg.position.y = 1.05;
  scene.add(egg);
  cracks = [];
  taps = 0;
  state = 'idle';
  popT = 0;
}

function addCrack() {
  const shell = egg.userData.shell;
  const m = new THREE.MeshBasicMaterial({ color: 0x2b2340 });
  const a = Math.random() * Math.PI * 2;
  const y = -0.2 + Math.random() * 0.9;
  const g = new THREE.Group();
  let px = 0, py = 0;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), m);
    const ang = (i % 2 ? 0.7 : -0.7) + (Math.random() - 0.5) * 0.4;
    seg.position.set(px, py, 0);
    seg.rotation.z = ang;
    px += Math.sin(-ang) * 0.2;
    py += Math.cos(ang) * 0.2;
    g.add(seg);
  }
  const r = 0.72 / (y > 0 ? 1 + (y / 1.25) * 0.35 : 1);
  g.position.set(Math.sin(a) * r * 0.98, y - 0.1, Math.cos(a) * r * 0.98);
  g.lookAt(Math.sin(a) * 5, y - 0.1, Math.cos(a) * 5);
  shell.parent.add(g);
  cracks.push(g);
}

function hatch() {
  state = 'hatched';
  const sp = rollSpecies(golden);
  if (golden) save.rareEggs--; else save.eggs--;
  const isNew = !save.seen.includes(sp.id);
  const d = addDino(sp);
  const shellCol = golden ? [0xffd700, 0xfff3bf] : [0xfff4e0, 0xffffff];
  particles.burst(egg.position.clone(), { count: 26, colors: shellCol, speed: 6, up: 7, size: 0.3 });
  particles.burst(egg.position.clone().add(new THREE.Vector3(0, 1, 0)), { count: 60, speed: 6, up: 10, size: 0.16 });
  if (sp.rarity !== 'common') particles.burst(egg.position.clone().add(new THREE.Vector3(0, 1.5, 0)), { count: 30, shape: 'star', colors: [0xffd43b, 0xfff3bf], size: 0.25, speed: 5, up: 8 });
  scene.remove(egg);
  egg = null;
  dino = buildDino(sp, { baby: true });
  dino.root.position.set(0, 0.4, 0);
  dino.root.scale.setScalar(0.01);
  dino.setMode('happy');
  scene.add(dino.root);
  spotlight.intensity = sp.rarity === 'legendary' ? 40 : 15;
  sfx.crack();
  setTimeout(() => sfx.roar(), 250);
  setTimeout(() => sfx.cheer(), 600);
  setTimeout(() => showReveal(sp, d, isNew), 1300);
}

function showReveal(sp, d, isNew) {
  progressEl?.remove();
  const body = h(`<div class="reveal"><span class="rarity ${sp.rarity}">${sp.rarity}</span>
    <div class="big-pic">${thumb(sp.id)}</div>
    <h2>${isNew ? 'NEW! ' : ''}${sp.kind}</h2><div class="kind">It's a baby ${sp.kind.toLowerCase()}!</div>
    <input class="name-input" maxlength="12" value="${d.name}" aria-label="Name your dino">
    <div class="fact">💡 ${sp.fact}</div></div>`);
  const more = save.eggs + save.rareEggs > 0;
  const m = modal({
    title: '🎉 Hooray!', color: 'var(--green)', body, closable: false,
    foot: `${more ? '<button class="btn blue again">🥚 Next egg</button>' : ''}<button class="btn green yay">Yay! 🏝️</button>`,
  });
  const input = body.querySelector('input');
  const saveName = () => { d.name = (input.value || sp.name).trim().slice(0, 12) || sp.name; persist(); };
  on(m, '.yay', () => { saveName(); m.close(); engine.go('park'); }, 'pop');
  on(m, '.again', () => { saveName(); m.close(); setupEgg(); buildUI(); }, 'pop');
}

function noEggs() {
  const body = h(`<div class="reveal"><div class="big-pic">${thumb('egg')}</div>
    <h2>No eggs left!</h2><div class="kind">Get a new egg to hatch a new friend</div></div>`);
  const m = modal({
    title: '🥚 Hatchery', color: 'var(--blue)', body, closable: false,
    foot: '<button class="btn blue vid">🎬 Free egg <span class="ad-tag">AD</span></button><button class="btn orange shop">🛍️ Shop</button><button class="btn white back">⬅ Park</button>',
  });
  const FREE = 5 * 60 * 1000;
  const vid = m.querySelector('.vid');
  if (Date.now() - (save.freeEggAt || 0) < FREE) vid.disabled = true;
  on(m, '.vid', async () => {
    if (await showRewarded()) {
      save.freeEggAt = Date.now();
      save.eggs++;
      persist();
      m.close();
      setupEgg();
      buildUI();
    }
  });
  on(m, '.shop', () => { m.close(); openShop({ onChange: () => { if (save.eggs + save.rareEggs) { setupEgg(); buildUI(); } else engine.go('park'); } }); });
  on(m, '.back', () => engine.go('park'));
}

function buildUI() {
  clearUI();
  const top = h(`<div class="hud-top"><button class="btn white round back">⬅</button><div class="res"></div></div>`);
  top.querySelector('.res').appendChild(resourcePills());
  on(top, '.back', () => engine.go('park'));
  uiRoot.appendChild(top);
  if (!egg) { noEggs(); return; }
  uiRoot.appendChild(h(`<div class="center-msg pass" style="top:16%">Tap the egg! 👆<small>${golden ? '✨ Golden Egg ✨' : 'Something is moving inside…'}</small></div>`));
  progressEl = h('<div class="hatch-progress pass"><i style="width:0%"></i></div>');
  uiRoot.appendChild(progressEl);
}

export const HatchMode = {
  enter() {
    if (!built) { buildWorld(); built = true; }
    if (save.eggs + save.rareEggs > 0) setupEgg();
    else { if (egg) scene.remove(egg); egg = null; if (dino) { scene.remove(dino.root); dino = null; } }
    spotlight.intensity = 0;
    buildUI();
  },
  exit() { particles.clear(); clearUI(); },
  resize(w, h2) {
    camera.aspect = w / h2;
    camera.fov = w < h2 ? 52 : 38;
    camera.updateProjectionMatrix();
  },
  update(dt) {
    time += dt;
    camera.position.set(Math.sin(time * 0.15) * 1.2, 3.4, 8);
    camera.lookAt(0, 1.2, 0);
    if (egg) {
      wobble = Math.max(0, wobble - dt * 3);
      const idle = Math.sin(time * 3) * 0.04 * (1 + taps * 0.15);
      egg.rotation.z = idle + Math.sin(wobble * 30) * wobble * 0.35;
      egg.rotation.x = Math.sin(time * 2.3) * 0.03 * (1 + taps * 0.1);
      const s = 1 + Math.sin(wobble * 20) * wobble * 0.08;
      egg.scale.set(s, 2 - s, s);
      if (golden && Math.random() < dt * 6) particles.burst(egg.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, 0.5)), { count: 1, shape: 'star', colors: [0xffd43b], size: 0.12, speed: 0.3, up: 1, gravity: 0, life: 1 });
    }
    if (dino) {
      popT = Math.min(1, popT + dt * 1.6);
      dino.root.scale.setScalar(Math.max(0.01, easeOutBack(popT)) * 0.9);
      dino.root.rotation.y = damp(dino.root.rotation.y, Math.sin(time * 0.8) * 0.4, 3, dt);
      dino.setJump(Math.abs(Math.sin(time * 4)) * 0.25);
      dino.update(dt, 0);
      if (Math.random() < dt * 3) particles.burst(new THREE.Vector3(0, 2.5, 0), { count: 2, shape: 'heart', colors: [0xff6b9a], size: 0.2, speed: 1.5, up: 3, gravity: 1 });
    }
    particles.update(dt);
  },
  render(r) { r.render(scene, camera); },
  pointer(type, p) {
    if (type !== 'down' || !egg || state !== 'idle') return;
    const hits = pick(camera, p, [egg]);
    if (!hits.length && Math.abs(p.nx) > 0.5) return;
    taps++;
    wobble = 1;
    sfx.crack();
    particles.burst(egg.position.clone().add(new THREE.Vector3(0, 0.5, 0.6)), { count: 6, colors: [0xfff4e0, 0xffd43b], size: 0.12, speed: 2, up: 3 });
    if (taps % 1 === 0 && cracks.length < 8) addCrack();
    progressEl && (progressEl.querySelector('i').style.width = Math.min(100, (taps / TAPS) * 100) + '%');
    if (taps >= TAPS) hatch();
  },
};
