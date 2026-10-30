// Rescue Mission: endless 3-lane runner through 4 themed worlds.
import * as THREE from 'three';
import { engine, wait } from '../engine.js';
import {
  toon, mesh, makeSky, setSkyColors, Particles, palmTree, pineTree, roundTree, rock, bush, flower, damp, makeCloud,
} from '../gfx.js';
import { buildDino, buildEgg } from '../dino.js';
import { SPECIES_BY_ID, WORLDS } from '../data.js';
import { save, persist, clamp } from '../save.js';
import { clearUI, h, on, uiRoot, modal, centerMsg, resourcePills, bump } from '../ui.js';
import { sfx } from '../audio.js';
import { showRewarded, rewardedAvailable, maybeShowInterstitial } from '../ads.js';

const LANES = [-2.4, 0, 2.4];
const TILE = 26;
const N_TILES = 7;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
const particles = new Particles(scene);
let sky, hemi, sun;
let built = false;
let tiles = [];
let world = WORLDS[0];
let dino = null, data = null;
let lane = 1, x = 0, y = 0, vy = 0;
let speed = 0, dist = 0, coins = 0, eggs = 0, hearts = 3;
let invuln = 0, shake = 0, time = 0;
let state = 'ready'; // ready | run | paused | over
let continued = false;
let hud = {};
let spawnZ = 0;
let lastEggAt = 0;
let swipe = null;
const templates = {};

// ---------- shared item models ----------
const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20);
coinGeo.rotateX(Math.PI / 2);
const coinMat = toon(0xffd43b, { emissive: 0xffa500, emissiveIntensity: 0.25 });
const coinRim = new THREE.TorusGeometry(0.42, 0.06, 6, 20);

function makeCoin() {
  const g = new THREE.Group();
  const c = mesh(coinGeo, coinMat, { cast: false, line: 0 });
  g.add(c);
  const r = mesh(coinRim, toon(0xf08c00), { cast: false });
  g.add(r);
  const star = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 5), toon(0xfff3bf), { cast: false });
  star.rotation.x = Math.PI / 2;
  g.add(star);
  g.userData.kind = 'coin';
  return g;
}

function makeHeart() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.6);
  s.bezierCurveTo(-1.2, 0.2, -0.6, 1.1, 0, 0.5);
  s.bezierCurveTo(0.6, 1.1, 1.2, 0.2, 0, -0.6);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  geo.center();
  const m = mesh(geo, toon(0xff4d6d, { emissive: 0xff0040, emissiveIntensity: 0.2 }), { line: 0.04 });
  m.scale.setScalar(0.6);
  const g = new THREE.Group();
  g.add(m);
  g.userData.kind = 'heart';
  return g;
}

function makeRescueEgg() {
  const g = new THREE.Group();
  const e = buildEgg(0xfff4e0, [0xff8fab, 0x74c0fc, 0x69db7c][Math.floor(Math.random() * 3)]);
  e.scale.setScalar(0.75);
  e.position.y = 0.2;
  g.add(e);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff3bf, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.6;
  g.add(ring);
  g.userData.kind = 'egg';
  return g;
}

// ---------- obstacles per world ----------
function obstacle(type) {
  const g = new THREE.Group();
  const th = world.id;
  if (type === 'log') {
    const col = th === 'candy' ? 0x8b4513 : th === 'ice' ? 0xbfe3f7 : 0x9c6b3c;
    const log = mesh(new THREE.CylinderGeometry(0.45, 0.45, 7.8, 14), toon(col), { line: 0.03 });
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.45;
    g.add(log);
    if (th === 'candy') {
      for (let i = 0; i < 7; i++) {
        const s = mesh(new THREE.TorusGeometry(0.46, 0.06, 6, 14), toon(0xffffff), { cast: false });
        s.rotation.y = Math.PI / 2;
        s.position.set(-3.3 + i * 1.1, 0.45, 0);
        g.add(s);
      }
    } else {
      for (const x2 of [-3.9, 3.9]) {
        const end = mesh(new THREE.CircleGeometry(0.42, 14), toon(th === 'ice' ? 0xffffff : 0xe8c48a), { cast: false });
        end.rotation.y = x2 > 0 ? Math.PI / 2 : -Math.PI / 2;
        end.position.set(x2 + (x2 > 0 ? 0.01 : -0.01), 0.45, 0);
        g.add(end);
      }
    }
    g.userData = { kind: 'obs', h: 0.95, wide: true };
    return g;
  }
  // single lane block
  let m;
  if (th === 'jungle') {
    if (Math.random() < 0.5) { m = rock(0.85, 0x9aa5b1); m.position.y = 0.45; }
    else { m = bush(0x2f9e44, 0.75); }
  } else if (th === 'volcano') {
    m = new THREE.Group();
    const r = rock(0.85, 0x495057);
    r.position.y = 0.45;
    m.add(r);
    const glow = mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6b1a }), { cast: false });
    glow.position.set(0, 0.85, 0.3);
    glow.scale.y = 0.4;
    m.add(glow);
  } else if (th === 'ice') {
    if (Math.random() < 0.5) {
      m = mesh(new THREE.BoxGeometry(1.5, 1.1, 1.2), toon(0xa5d8ff, { transparent: true, opacity: 0.85 }), { line: 0.03 });
      m.position.y = 0.55;
      m.rotation.y = 0.3;
    } else {
      m = new THREE.Group();
      const b1 = mesh(new THREE.SphereGeometry(0.6, 14, 10), toon(0xffffff), { line: 0.03 });
      b1.position.y = 0.55;
      const b2 = mesh(new THREE.SphereGeometry(0.42, 14, 10), toon(0xffffff), { line: 0.03 });
      b2.position.y = 1.3;
      const nose = mesh(new THREE.ConeGeometry(0.08, 0.35, 6), toon(0xff922b));
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.32, 0.45);
      const hat = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 10), toon(0xff6b6b));
      hat.position.y = 1.75;
      m.add(b1, b2, nose, hat);
      for (const ex of [-0.13, 0.13]) {
        const e = mesh(new THREE.SphereGeometry(0.05, 6, 5), toon(0x2b2340), { cast: false });
        e.position.set(ex, 1.42, 0.38);
        m.add(e);
      }
    }
  } else {
    m = new THREE.Group();
    const gd = mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon([0xff6b6b, 0x51cf66, 0xcc5de8, 0xffd43b][Math.floor(Math.random() * 4)]), { line: 0.03 });
    gd.scale.y = 1.2;
    m.add(gd);
    for (let i = 0; i < 6; i++) {
      const s = mesh(new THREE.SphereGeometry(0.06, 5, 4), toon(0xffffff), { cast: false });
      const a = Math.random() * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.5, 0.6 + Math.random() * 0.2, Math.sin(a) * 0.5);
      m.add(s);
    }
  }
  g.add(m);
  g.userData = { kind: 'obs', h: 1.05, wide: false };
  return g;
}

// ---------- side scenery per world ----------
function sideProp() {
  const th = world.id;
  const r = Math.random();
  if (th === 'jungle') {
    if (r < 0.4) return palmTree(4 + Math.random() * 3);
    if (r < 0.7) return roundTree([0x51cf66, 0x40c057, 0x94d82d][Math.floor(Math.random() * 3)], 2 + Math.random() * 2);
    if (r < 0.9) return bush(0x37b24d, 1 + Math.random() * 0.6);
    return rock(1 + Math.random(), 0xadb5bd);
  }
  if (th === 'volcano') {
    if (r < 0.35) {
      const g = new THREE.Group();
      const c = mesh(new THREE.ConeGeometry(3 + Math.random() * 2, 5 + Math.random() * 3, 9), toon(0x6d4c41));
      c.position.y = 3;
      g.add(c);
      const l = mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.3, 9), new THREE.MeshBasicMaterial({ color: 0xff6b1a }), { cast: false });
      l.position.y = 3 + c.geometry.parameters.height / 2 - 0.4;
      g.add(l);
      return g;
    }
    if (r < 0.65) return rock(1 + Math.random() * 1.2, 0x5c5f66);
    if (r < 0.85) {
      const p = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 14), new THREE.MeshBasicMaterial({ color: 0xff8c1a }), { cast: false });
      p.position.y = 0.05;
      return p;
    }
    return pineTree(0x5c4033, 3);
  }
  if (th === 'ice') {
    if (r < 0.55) return pineTree(0x2f9e44, 3.5 + Math.random() * 2, true);
    if (r < 0.8) {
      const c = mesh(new THREE.OctahedronGeometry(0.8 + Math.random() * 0.6), toon(0x99e9f2, { transparent: true, opacity: 0.85 }), { line: 0.03 });
      c.scale.y = 1.8;
      c.position.y = 1.2;
      return c;
    }
    return rock(1.2, 0xf1f3f5);
  }
  // candy
  if (r < 0.4) {
    const g = new THREE.Group();
    const st = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), toon(0xffffff));
    st.position.y = 1.5;
    g.add(st);
    const disc = mesh(new THREE.CylinderGeometry(1, 1, 0.25, 20), toon([0xff6b6b, 0xcc5de8, 0x51cf66, 0x4dabf7][Math.floor(Math.random() * 4)]), { line: 0.03 });
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 3.6;
    g.add(disc);
    const sw = mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 20), toon(0xffffff), { cast: false });
    sw.position.set(0, 3.6, 0.14);
    g.add(sw);
    return g;
  }
  if (r < 0.7) {
    const g = new THREE.Group();
    const cane = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 0), new THREE.Vector3(0.5, 3.6, 0), new THREE.Vector3(1, 3, 0)]);
    g.add(mesh(new THREE.TubeGeometry(cane, 20, 0.2, 8), toon(0xff4d4d)));
    return g;
  }
  const gd = mesh(new THREE.SphereGeometry(1 + Math.random() * 0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon([0xffd43b, 0xff8fab, 0x69db7c][Math.floor(Math.random() * 3)]), { line: 0.03 });
  gd.scale.y = 1.3;
  return gd;
}

// ---------- tiles ----------
function makeTile() {
  const g = new THREE.Group();
  const ground = mesh(new THREE.PlaneGeometry(80, TILE), toon(world.ground), { receive: true, cast: false });
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const path = mesh(new THREE.PlaneGeometry(8.2, TILE), toon(world.path), { receive: true, cast: false });
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.02;
  g.add(path);
  for (const xx of [-4.25, 4.25]) {
    const edge = mesh(new THREE.BoxGeometry(0.5, 0.25, TILE), toon(world.id === 'candy' ? 0xffffff : 0xd9b779), { receive: true, cast: false });
    edge.position.set(xx, 0.1, 0);
    g.add(edge);
  }
  // lane dashes
  for (const xx of [-1.2, 1.2]) {
    for (let i = 0; i < 4; i++) {
      const d = mesh(new THREE.PlaneGeometry(0.12, 2.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }), { cast: false });
      d.rotation.x = -Math.PI / 2;
      d.position.set(xx, 0.03, -TILE / 2 + 3 + i * (TILE / 4));
      g.add(d);
    }
  }
  g.userData.items = [];
  g.userData.deco = new THREE.Group();
  g.add(g.userData.deco);
  return g;
}

function fillTile(tile, empty = false) {
  // clear old
  for (const it of tile.userData.items) tile.remove(it);
  tile.userData.items = [];
  tile.remove(tile.userData.deco);
  const deco = new THREE.Group();
  tile.userData.deco = deco;
  tile.add(deco);
  for (let i = 0; i < 8; i++) {
    const p = sideProp();
    const side = i % 2 ? 1 : -1;
    p.position.set(side * (6.5 + Math.random() * 14), 0, -TILE / 2 + Math.random() * TILE);
    p.rotation.y = Math.random() * Math.PI * 2;
    deco.add(p);
  }
  if (world.id === 'jungle' || world.id === 'candy') {
    const fc = world.id === 'candy' ? [0xffffff, 0xff8fab, 0xffd43b] : [0xff6b6b, 0xffd43b, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const f = flower(fc[i % 3]);
      const side = i % 2 ? 1 : -1;
      f.position.set(side * (4.8 + Math.random() * 4), 0, -TILE / 2 + Math.random() * TILE);
      deco.add(f);
    }
  }
  if (empty) return;

  // Gameplay rows: every ~8.5 units
  const difficulty = Math.min(1, dist / 1500);
  for (let row = 0; row < 3; row++) {
    const z = -TILE / 2 + 4 + row * 8.5;
    const r = Math.random();
    if (r < 0.12 + difficulty * 0.12) {
      // full-width log: must jump, with coin arc above
      const o = obstacle('log');
      o.position.set(0, 0, z);
      add(tile, o);
      const l = Math.floor(Math.random() * 3);
      for (let k = -2; k <= 2; k++) {
        const c = makeCoin();
        c.position.set(LANES[l], 1.1 + Math.cos((k / 2.5) * Math.PI / 2) * 1.6, z + k * 1.1);
        add(tile, c);
      }
    } else if (r < 0.55 + difficulty * 0.2) {
      // 1–2 blocked lanes
      const blocked = [Math.floor(Math.random() * 3)];
      if (Math.random() < 0.25 + difficulty * 0.4) blocked.push((blocked[0] + 1 + Math.floor(Math.random() * 2)) % 3);
      for (const l of blocked) {
        const o = obstacle('block');
        o.position.set(LANES[l], 0, z);
        add(tile, o);
      }
      const free = [0, 1, 2].filter((l) => !blocked.includes(l));
      const l = free[Math.floor(Math.random() * free.length)];
      for (let k = 0; k < 4; k++) {
        const c = makeCoin();
        c.position.set(LANES[l], 1, z - 2 + k * 1.4);
        add(tile, c);
      }
    } else {
      // coin line + chance of special pickup
      const l = Math.floor(Math.random() * 3);
      for (let k = 0; k < 5; k++) {
        const c = makeCoin();
        c.position.set(LANES[l], 1, z - 3 + k * 1.5);
        add(tile, c);
      }
      const other = (l + 1 + Math.floor(Math.random() * 2)) % 3;
      if (dist - lastEggAt > 220 && Math.random() < 0.5) {
        lastEggAt = dist;
        const e = makeRescueEgg();
        e.position.set(LANES[other], 1.2, z);
        add(tile, e);
      } else if (hearts < 3 && Math.random() < 0.12) {
        const hh = makeHeart();
        hh.position.set(LANES[other], 1.2, z);
        add(tile, hh);
      }
    }
  }
}
function add(tile, o) {
  tile.add(o);
  tile.userData.items.push(o);
}

function buildTrack() {
  for (const t of tiles) scene.remove(t);
  tiles = [];
  for (let i = 0; i < N_TILES; i++) {
    const t = makeTile();
    t.position.z = -i * TILE + TILE;
    fillTile(t, i < 2);
    scene.add(t);
    tiles.push(t);
  }
}

function buildWorld() {
  sky = makeSky(0x8fd3ff, 0xe6f7ff);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xcfeeff, 40, 150);
  hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.5);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
  sun.position.set(6, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 20; sc.bottom = -20; sc.far = 60;
  scene.add(sun);
  scene.add(sun.target);
  for (let i = 0; i < 8; i++) {
    const c = makeCloud(2.5 + Math.random() * 2);
    c.position.set(-80 + i * 22, 30 + Math.random() * 15, -160);
    scene.add(c);
  }
}

// ---------- HUD ----------
function buildHUD() {
  clearUI();
  const top = h(`<div class="run-hud"><button class="btn white round pause">⏸</button>
    <div class="pill"><span class="ico">🪙</span><span class="c">0</span></div>
    <div class="pill"><span class="ico">🥚</span><span class="e">0</span></div><div class="spacer"></div>
    <div class="hearts">❤️❤️❤️</div></div>`);
  on(top, '.pause', () => pause());
  uiRoot.appendChild(top);
  const d = h('<div class="run-dist pass">0 m</div>');
  uiRoot.appendChild(d);
  hud = { c: top.querySelector('.c'), e: top.querySelector('.e'), hearts: top.querySelector('.hearts'), d };
}
function updateHUD() {
  if (!hud.c) return;
  if (+hud.c.textContent !== coins) { hud.c.textContent = coins; bump(hud.c.parentElement); }
  if (+hud.e.textContent !== eggs) { hud.e.textContent = eggs; bump(hud.e.parentElement); }
  hud.hearts.textContent = '❤️'.repeat(hearts) + '🤍'.repeat(Math.max(0, 3 - hearts));
  hud.d.textContent = Math.floor(dist) + ' m';
}

async function countdown() {
  state = 'ready';
  const help = h('<div class="swipe-help pass"><span>👈 👉 Swipe to move</span><span>👆 Tap or swipe up to jump</span></div>');
  uiRoot.appendChild(help);
  for (const n of ['3', '2', '1']) {
    centerMsg(n, '', 700);
    sfx.tap();
    await wait(700);
    if (engine.mode !== RunnerMode) return;
  }
  centerMsg('GO! 🚀', world.name, 900);
  sfx.roar();
  state = 'run';
  setTimeout(() => help.remove(), 2500);
}

function pause() {
  if (state !== 'run') return;
  state = 'paused';
  const m = modal({
    title: '⏸ Paused', color: 'var(--blue)', closable: false,
    body: '<div class="reveal"><div style="font-size:60px">🦕💤</div><div class="kind">Take a little rest!</div></div>',
    foot: '<button class="btn white quit">🏝️ Park</button><button class="btn green go">▶ Keep going</button>',
  });
  on(m, '.go', () => { m.close(); state = 'run'; });
  on(m, '.quit', () => { m.close(); finish(); });
}

function jump() {
  if (state !== 'run' || y > 0.05) return;
  vy = 11.5;
  sfx.jump();
}
function move(dir) {
  if (state !== 'run') return;
  const n = clamp(lane + dir, 0, 2);
  if (n !== lane) { lane = n; sfx.whoosh(); }
}

function hit(obj) {
  if (invuln > 0) return;
  hearts--;
  invuln = 1.6;
  shake = 0.5;
  sfx.boing();
  dino.squish();
  particles.burst(dino.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), { count: 12, shape: 'star', colors: [0xffd43b, 0xffffff], size: 0.2, speed: 4, up: 4 });
  obj.userData.knocked = 1;
  updateHUD();
  if (hearts <= 0) gameOver();
  else centerMsg('Oops! 🙈', '', 800);
}

async function gameOver() {
  state = 'over';
  sfx.boing();
  await wait(600);
  if (!continued && rewardedAvailable()) {
    const m = modal({
      title: '💫 Keep running?', color: 'var(--purple)', closable: false,
      body: `<div class="reveal"><div style="font-size:60px">🦖💨</div><div class="kind">You ran ${Math.floor(dist)} m! Want 2 more hearts?</div></div>`,
      foot: '<button class="btn white no">No thanks</button><button class="btn blue yes">🎬 Continue <span class="ad-tag">AD</span></button>',
    });
    on(m, '.no', () => { m.close(); finish(); });
    on(m, '.yes', async () => {
      const ok = await showRewarded();
      m.close();
      if (ok) {
        continued = true;
        hearts = 2;
        invuln = 2.5;
        updateHUD();
        centerMsg('Go go go! 🚀', '', 900);
        state = 'run';
      } else finish();
    });
  } else finish();
}

function finish() {
  state = 'over';
  const d = Math.floor(dist);
  const best = d > save.bestDistance;
  if (best) save.bestDistance = d;
  save.coins += coins;
  save.eggs += eggs;
  save.runs++;
  if (data) data.energy = clamp(data.energy - 8);
  persist();
  const stars = d >= 600 ? 3 : d >= 300 ? 2 : d >= 100 ? 1 : 0;
  const body = h(`<div class="results">
    <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    ${best && d > 0 ? '<div class="rarity legendary">New best!</div>' : ''}
    <div class="row"><div class="box">📏<b>${d} m</b>Distance</div><div class="box">🪙<b class="cv">${coins}</b>Coins</div><div class="box">🥚<b>${eggs}</b>Eggs</div></div>
    ${eggs ? '<div class="fact">You rescued eggs! Hatch them in the park 🎉</div>' : ''}</div>`);
  const m = modal({
    title: stars >= 2 ? '🏆 Amazing!' : '🎉 Well done!', color: 'var(--green)', body, closable: false,
    foot: `${coins > 0 ? '<button class="btn blue dbl">🎬 x2 Coins <span class="ad-tag">AD</span></button>' : ''}
      <button class="btn orange again">🔁 Again</button><button class="btn green park">🏝️ Park</button>`,
  });
  sfx.cheer();
  on(m, '.dbl', async (e) => {
    const btn = e.currentTarget || m.querySelector('.dbl');
    if (await showRewarded()) {
      save.coins += coins;
      persist();
      body.querySelector('.cv').textContent = coins * 2;
      sfx.coin();
      m.querySelector('.dbl')?.remove();
    }
    void btn;
  });
  const leave = async (to) => {
    m.close();
    await maybeShowInterstitial();
    if (to === 'again') engine.go('runner', { uid: data.uid, world: world.id });
    else engine.go('park');
  };
  on(m, '.again', () => leave('again'));
  on(m, '.park', () => leave('park'));
}

export const RunnerMode = {
  enter({ uid, world: wid }) {
    if (!built) { buildWorld(); built = true; }
    world = WORLDS.find((w) => w.id === wid) || WORLDS[0];
    setSkyColors(sky, world.sky[0], world.sky[1]);
    scene.fog.color.set(world.fog);
    hemi.groundColor.set(world.ground);
    data = save.dinos.find((d) => d.uid === uid) || save.dinos[0];
    if (dino) scene.remove(dino.root);
    dino = buildDino(SPECIES_BY_ID[data.species]);
    dino.root.rotation.y = Math.PI;
    dino.setScale(0.85);
    scene.add(dino.root);
    lane = 1; x = 0; y = 0; vy = 0;
    speed = 13; dist = 0; coins = 0; eggs = 0; hearts = 3;
    invuln = 0; shake = 0; continued = false; lastEggAt = 60;
    buildTrack();
    buildHUD();
    updateHUD();
    countdown();
  },
  exit() {
    particles.clear();
    clearUI();
    state = 'over';
  },
  onHide() { if (state === 'run') pause(); },
  resize(w, h2) {
    camera.aspect = w / h2;
    camera.fov = w < h2 ? 68 : 52;
    camera.updateProjectionMatrix();
  },
  update(dt) {
    time += dt;
    const running = state === 'run';
    if (running) {
      speed = Math.min(30, speed + dt * 0.28);
      dist += speed * dt * 0.5;
    }
    const mv = running ? speed * dt : 0;

    // tiles move toward camera
    for (const t of tiles) t.position.z += mv;
    let minZ = Math.min(...tiles.map((t) => t.position.z));
    for (const t of tiles) {
      if (t.position.z > TILE * 1.6) {
        t.position.z = minZ - TILE;
        minZ = t.position.z;
        fillTile(t);
      }
    }

    // dino movement
    x = damp(x, LANES[lane], 14, dt);
    if (running || y > 0) {
      vy -= 32 * dt;
      y = Math.max(0, y + vy * dt);
      if (y === 0) vy = 0;
    }
    dino.root.position.x = x;
    dino.setJump(y);
    dino.root.rotation.z = (LANES[lane] - x) * -0.12;
    dino.update(dt, running ? (y > 0 ? 0.2 : 1) : 0);
    invuln = Math.max(0, invuln - dt);
    dino.root.visible = invuln > 0 ? Math.floor(time * 14) % 2 === 0 : true;

    // items
    for (const t of tiles) {
      for (const it of t.userData.items) {
        if (!it.visible) continue;
        const wz = t.position.z + it.position.z;
        const k = it.userData.kind;
        if (k === 'coin' || k === 'heart' || k === 'egg') it.rotation.y += dt * 3;
        if (k === 'egg') it.position.y = 1.2 + Math.sin(time * 4) * 0.15;
        if (it.userData.knocked) {
          it.userData.knocked += dt;
          it.position.y += dt * 8;
          it.rotation.x += dt * 8;
          if (it.userData.knocked > 1.2) it.visible = false;
          continue;
        }
        if (state !== 'run' || Math.abs(wz) > 0.9) continue;
        const sameLane = k === 'obs' && it.userData.wide ? true : Math.abs(it.position.x - x) < 1.2;
        if (!sameLane) continue;
        if (k === 'coin') {
          if (Math.abs(it.position.y - (y + 1)) < 1.4) {
            it.visible = false;
            coins++;
            sfx.coin();
            particles.burst(new THREE.Vector3(it.position.x, it.position.y, 0), { count: 4, colors: [0xffd43b, 0xfff3bf], size: 0.1, speed: 2, up: 2, life: 0.5 });
          }
        } else if (k === 'heart') {
          it.visible = false;
          hearts = Math.min(3, hearts + 1);
          sfx.levelUp();
          centerMsg('+1 ❤️', '', 700);
        } else if (k === 'egg') {
          it.visible = false;
          eggs++;
          sfx.cheer();
          centerMsg('Egg rescued! 🥚', '', 1100);
          particles.burst(new THREE.Vector3(it.position.x, 1.2, 0), { count: 30, speed: 5, up: 6, size: 0.15 });
        } else if (k === 'obs' && y < it.userData.h) {
          hit(it);
        }
      }
    }

    // camera
    shake = Math.max(0, shake - dt);
    const sx = (Math.random() - 0.5) * shake * 0.6, sy = (Math.random() - 0.5) * shake * 0.6;
    const portrait = engine.w < engine.h;
    camera.position.set(x * 0.55 + sx, (portrait ? 5.2 : 4.4) + y * 0.3 + sy, portrait ? 8.6 : 7.6);
    camera.lookAt(x * 0.7, 1.3, -7);
    sun.position.set(x + 6, 16, 8);
    sun.target.position.set(x, 0, -4);
    sky.position.copy(camera.position);
    particles.update(dt);
    if (running) updateHUD();
  },
  render(r) { r.render(scene, camera); },
  pointer(type, p) {
    if (type === 'down') swipe = { x: p.x, y: p.y, done: false };
    else if (type === 'move' && swipe && !swipe.done) {
      const dx = p.x - swipe.x, dy = p.y - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
        swipe.done = true;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
        else if (dy < 0) jump();
      }
    } else if (type === 'up' && swipe) {
      if (!swipe.done) jump();
      swipe = null;
    }
  },
  key(k) {
    if (k === 'ArrowLeft' || k === 'a') move(-1);
    if (k === 'ArrowRight' || k === 'd') move(1);
    if (k === 'ArrowUp' || k === ' ' || k === 'w') jump();
  },
};

void roundTree;
