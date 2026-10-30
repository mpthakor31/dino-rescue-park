// The home island: your dinos wander around the park you build.
import * as THREE from 'three';
import { engine, pick, toScreen } from '../engine.js';
import {
  toon, mesh, makeSky, makeWater, makeCloud, palmTree, roundTree, rock, bush, flower, emojiSprite, Particles, easeOutBack, damp,
} from '../gfx.js';
import { buildDino } from '../dino.js';
import { buildDecor } from '../decor.js';
import { SPECIES_BY_ID, DECOR } from '../data.js';
import { save } from '../save.js';
import { clearUI, h, on, uiRoot, resourcePills } from '../ui.js';
import { sfx } from '../audio.js';
import { setBanner } from '../ads.js';
import { openShop, openBook, openParents, openRunSetup } from '../menus.js';

const ISLAND_R = 16;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
const particles = new Particles(scene);
const updaters = [];
let built = false;
let time = 0;

const cam = { yaw: 0.6, pitch: 0.62, dist: 34, targetYaw: 0.6, dragging: false, lastX: 0, moved: 0, autoT: 0 };
let dinoActors = [];
let decorObjs = {};
let titleMode = false;
let pills = null;
let hudRefresh = null;

function buildWorld() {
  scene.add(makeSky(0x6cc4ff, 0xe8f8ff));
  scene.fog = new THREE.Fog(0xcfeeff, 70, 260);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf6a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 5; sc.far = 80;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const water = makeWater(600, 0x5ad1f5);
  water.position.y = -0.6;
  scene.add(water);
  updaters.push(water.userData.update);

  // Island layers: sand ring, grass top, cliff
  const sand = mesh(new THREE.CylinderGeometry(ISLAND_R + 2.2, ISLAND_R + 3.5, 1.2, 48), toon(0xffe8a3), { receive: true, cast: false });
  sand.position.y = -0.8;
  scene.add(sand);
  const grassGeo = new THREE.CylinderGeometry(ISLAND_R, ISLAND_R + 0.6, 1.0, 48, 1);
  const grass = mesh(grassGeo, toon(0x8ce06a), { receive: true, cast: false });
  grass.position.y = -0.5;
  scene.add(grass);
  // little grass hills
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + 0.4, r = 9 + (i % 3) * 2;
    const hill = mesh(new THREE.SphereGeometry(2.5 + (i % 2), 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7bd65a), { receive: true, cast: false });
    hill.scale.y = 0.35;
    hill.position.set(Math.cos(a) * r, -0.02, Math.sin(a) * r);
    scene.add(hill);
  }
  // dirt path ring
  const path = mesh(new THREE.RingGeometry(5.2, 6.6, 48), toon(0xf1d39a), { receive: true, cast: false });
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  // Nest / hatchery in the middle
  const nest = new THREE.Group();
  const straw = toon(0xd9a85b);
  const ring = mesh(new THREE.TorusGeometry(1.4, 0.45, 10, 24), straw, { line: 0.02 });
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  nest.add(ring);
  nest.position.set(0, 0, 3);
  scene.add(nest);

  // Palm trees on the beach edge
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
    const r = ISLAND_R - 1.2 + Math.random() * 1.5;
    const p = palmTree(4 + Math.random() * 2.5);
    p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    p.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p);
    const top = p.userData.top;
    const ph = Math.random() * 6;
    updaters.push((dt, t) => { top.rotation.z = Math.sin(t * 1.2 + ph) * 0.06; });
  }
  // round trees & bushes inland
  const treeCols = [0x51cf66, 0x69db7c, 0x40c057, 0x94d82d];
  [[-11, -3], [-9, 8], [11, 9], [3, -12.5], [-4, -13], [12.5, -5]].forEach(([x, z], i) => {
    const t = roundTree(treeCols[i % 4], 2 + Math.random());
    t.position.set(x, 0, z);
    scene.add(t);
  });
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 6;
    const b = bush(treeCols[i % 4], 0.6 + Math.random() * 0.4);
    b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    scene.add(b);
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 5;
    const rk = rock(0.5 + Math.random() * 0.8, i % 2 ? 0xadb5bd : 0x9aa5b1);
    rk.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    scene.add(rk);
  }
  const fcols = [0xff6b6b, 0xffd43b, 0xffffff, 0xcc5de8, 0xff8fab];
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 12.5;
    const f = flower(fcols[i % fcols.length]);
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    scene.add(f);
  }

  // Wooden dock
  const dock = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const plank = mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), toon(i % 2 ? 0xc68642 : 0xb5763a), { receive: true });
    plank.position.set(0, 0.05, i * 0.75);
    dock.add(plank);
  }
  for (const x of [-1.1, 1.1]) for (const z of [0, 4.5]) {
    const post = mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), toon(0x8b5a2b));
    post.position.set(x, -0.3, z);
    dock.add(post);
  }
  dock.position.set(0, 0, ISLAND_R + 0.5);
  scene.add(dock);
  // Boat
  const boat = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xff6b6b), { line: 0.03 });
  hull.scale.set(0.8, 0.6, 1.7);
  boat.add(hull);
  const mast = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), toon(0x8b5a2b));
  mast.position.y = 1.5;
  boat.add(mast);
  const sailM = mesh(new THREE.ConeGeometry(1, 2.2, 3), toon(0xffffff));
  sailM.scale.z = 0.08;
  sailM.position.set(0, 1.8, 0.4);
  boat.add(sailM);
  boat.position.set(3.4, -0.3, ISLAND_R + 3.5);
  scene.add(boat);
  updaters.push((dt, t) => { boat.position.y = -0.35 + Math.sin(t * 1.4) * 0.12; boat.rotation.z = Math.sin(t * 1.1) * 0.06; });

  // Distant volcano island with smoke
  const volc = new THREE.Group();
  const vb = mesh(new THREE.ConeGeometry(18, 22, 14, 1, true), toon(0x8d6e63), { cast: false });
  vb.position.y = 8;
  volc.add(vb);
  const lava = mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.6, 14), new THREE.MeshBasicMaterial({ color: 0xff6b1a }), { cast: false });
  lava.position.y = 18.5;
  volc.add(lava);
  const vbase = mesh(new THREE.CylinderGeometry(22, 24, 2, 16), toon(0x6fbf4f), { cast: false });
  vbase.position.y = -0.5;
  volc.add(vbase);
  volc.position.set(-70, -1, -110);
  scene.add(volc);
  const smoke = [];
  for (let i = 0; i < 8; i++) {
    const s = mesh(new THREE.SphereGeometry(2.5, 10, 8), toon(0xe9ecef, { transparent: true, opacity: 0.85, unique: true }), { cast: false });
    s.userData.t = i / 8;
    volc.add(s);
    smoke.push(s);
  }
  updaters.push((dt) => {
    for (const s of smoke) {
      s.userData.t = (s.userData.t + dt * 0.06) % 1;
      const t = s.userData.t;
      s.position.set(Math.sin(t * 6) * 2 + t * 10, 20 + t * 26, 0);
      s.scale.setScalar(0.6 + t * 2.2);
      s.material.opacity = 0.85 * (1 - t);
    }
  });
  // other small islands
  [[80, -90, 9], [110, 40, 7], [-110, 60, 8]].forEach(([x, z, r]) => {
    const isl = new THREE.Group();
    const s = mesh(new THREE.CylinderGeometry(r, r + 2, 1.6, 20), toon(0xffe8a3), { cast: false });
    isl.add(s);
    const g = mesh(new THREE.SphereGeometry(r * 0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7bd65a), { cast: false });
    g.scale.y = 0.5;
    g.position.y = 0.6;
    isl.add(g);
    for (let i = 0; i < 3; i++) {
      const p = palmTree(5);
      p.position.set((i - 1) * r * 0.4, 0.6, (i % 2) * 2);
      isl.add(p);
    }
    isl.position.set(x, -0.6, z);
    scene.add(isl);
  });

  // Clouds
  for (let i = 0; i < 12; i++) {
    const c = makeCloud(2 + Math.random() * 2.5);
    const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120;
    c.position.set(Math.cos(a) * r, 25 + Math.random() * 30, Math.sin(a) * r);
    scene.add(c);
    const sp = 0.02 + Math.random() * 0.03;
    updaters.push((dt) => {
      const ang = Math.atan2(c.position.z, c.position.x) + sp * dt;
      const rr = Math.hypot(c.position.x, c.position.z);
      c.position.x = Math.cos(ang) * rr;
      c.position.z = Math.sin(ang) * rr;
    });
  }
  // Birds circling
  const bird = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    const wm = toon(0xffffff);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.BoxGeometry(0.9, 0.05, 0.3), wm, { cast: false });
      w.position.x = s * 0.45;
      w.userData.s = s;
      b.add(w);
    }
    b.position.set(i * 1.5, i * 0.6, i * 0.8);
    bird.add(b);
  }
  scene.add(bird);
  updaters.push((dt, t) => {
    bird.position.set(Math.cos(t * 0.15) * 30, 18, Math.sin(t * 0.15) * 30);
    bird.rotation.y = -t * 0.15;
    bird.children.forEach((b, i) => b.children.forEach((w) => (w.rotation.z = w.userData.s * Math.sin(t * 8 + i) * 0.5)));
  });
}

function refreshDecor(animateId) {
  for (const d of DECOR) {
    if (save.decor.includes(d.id) && !decorObjs[d.id]) {
      const g = buildDecor(d.id);
      g.position.set(d.pos[0], 0, d.pos[1]);
      g.lookAt(0, 0, 0);
      if (d.id === 'rainbow') g.rotation.y = 0;
      scene.add(g);
      decorObjs[d.id] = g;
      if (animateId === d.id) {
        g.userData.popT = 0;
        g.scale.setScalar(0.01);
        particles.burst(new THREE.Vector3(d.pos[0], 2, d.pos[1]), { count: 50, speed: 7, up: 8, size: 0.25 });
      }
    }
  }
}

// ---------- Dinos wandering ----------
function spawnDinos() {
  for (const a of dinoActors) scene.remove(a.dino.root);
  dinoActors = [];
  const list = save.dinos.slice(-12);
  list.forEach((d, i) => {
    const sp = SPECIES_BY_ID[d.species];
    const dino = buildDino(sp, { lite: list.length > 6 });
    const a = (i / Math.max(1, list.length)) * Math.PI * 2;
    dino.root.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 7);
    dino.setScale(1.0 + Math.min(d.level, 10) * 0.04);
    scene.add(dino.root);
    const need = emojiSprite('💬', 1.2);
    need.visible = false;
    need.position.y = 3.6;
    dino.root.add(need);
    dinoActors.push({ d, dino, target: null, wait: Math.random() * 3, speed: 0, hop: 0, need, flyer: sp.features.includes('flyer'), ang: a });
  });
  updateNeeds();
}

function updateNeeds() {
  for (const a of dinoActors) {
    const { d } = a;
    let e = null;
    if (d.hunger < 35) e = '🍖';
    else if (d.clean < 35) e = '🛁';
    else if (d.happy < 35) e = '🎾';
    else if (d.energy < 25) e = '💤';
    a.need.visible = !!e;
    if (e && a.need.userData.e !== e) {
      const s = emojiSprite(e, 1.3);
      a.need.material = s.material;
      a.need.userData.e = e;
    }
  }
}

function updateDinos(dt) {
  for (const a of dinoActors) {
    const p = a.dino.root.position;
    if (a.flyer) {
      a.ang += dt * 0.35;
      const r = 9;
      const tx = Math.cos(a.ang) * r, tz = Math.sin(a.ang) * r;
      p.x = tx; p.z = tz;
      p.y = 2.5 + Math.sin(time * 1.3) * 0.5;
      a.dino.root.rotation.y = -a.ang;
      a.dino.update(dt, 0.6);
      continue;
    }
    if (!a.target) {
      a.wait -= dt;
      a.speed = damp(a.speed, 0, 8, dt);
      if (a.wait <= 0) {
        const ang = Math.random() * Math.PI * 2, r = 3 + Math.random() * (ISLAND_R - 5);
        a.target = new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r);
        if (Math.random() < 0.25) { a.hop = 1; a.dino.setMode('happy'); }
      }
    } else {
      const dir = a.target.clone().sub(p);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.4) {
        a.target = null;
        a.wait = 2 + Math.random() * 4;
        a.dino.setMode('idle');
      } else {
        a.speed = damp(a.speed, 0.35, 4, dt);
        dir.normalize();
        p.addScaledVector(dir, a.speed * 4.5 * dt);
        const want = Math.atan2(dir.x, dir.z);
        let diff = want - a.dino.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.dino.root.rotation.y += diff * Math.min(1, dt * 5);
      }
    }
    // keep away from nest center
    const r = Math.hypot(p.x, p.z - 3);
    if (r < 2.2) { p.x *= 1.02; p.z = 3 + (p.z - 3) * 1.02; }
    if (a.hop > 0) {
      a.hop = Math.max(0, a.hop - dt * 1.4);
      a.dino.setJump(Math.abs(Math.sin(a.hop * Math.PI * 3)) * 0.7);
      if (a.hop === 0) a.dino.setMode('idle');
    } else a.dino.setJump(0);
    a.dino.update(dt, a.speed);
    a.need.position.y = 3.4 + Math.sin(time * 3) * 0.15;
  }
}

// ---------- UI ----------
function buildHud() {
  clearUI();
  if (titleMode) {
    const t = h(`<div class="title-wrap">
      <div class="logo"><span class="l1">DINO RESCUE</span><span class="l2">PARK</span><span class="tag">🦕 Hatch • Care • Rescue • Build 🌴</span></div>
      <button class="btn big green play">▶ PLAY</button></div>`);
    on(t, '.play', () => { titleMode = false; buildHud(); setBanner(true); sfx.cheer(); }, 'pop');
    uiRoot.appendChild(t);
    return;
  }
  const top = h(`<div class="hud-top"><div class="res"></div><div class="spacer"></div>
    <button class="btn white round gear" aria-label="Parents">⚙️</button></div>`);
  pills = resourcePills();
  top.querySelector('.res').appendChild(pills);
  on(top, '.gear', () => openParents());
  uiRoot.appendChild(top);

  const eggCount = save.eggs + save.rareEggs;
  const dock = h(`<div class="dock">
    <div class="dock-btn"><button class="btn pink book">📖</button><label>Dino Book</label></div>
    <div class="dock-btn"><button class="btn blue hatch">🥚</button>${eggCount ? `<span class="badge">${eggCount}</span>` : ''}<label>Hatch</label></div>
    <div class="dock-btn main"><button class="btn green run">🏃</button><label>Rescue!</label></div>
    <div class="dock-btn"><button class="btn orange shop">🛍️</button><label>Shop</label></div>
    </div>`);
  on(dock, '.run', () => openRunSetup());
  on(dock, '.hatch', () => engine.go('hatch'));
  on(dock, '.shop', () => openShop({ onBuyDecor: (id) => { refreshDecor(id); focusOn(id); }, onChange: () => buildHud() }));
  on(dock, '.book', () => openBook());
  uiRoot.appendChild(dock);

  let hint = '';
  if (save.dinos.length === 0) hint = '👆 Tap Hatch to meet your first dino!';
  else if (save.tutorial) hint = '👆 Tap a dino to play with it!';
  if (hint) uiRoot.appendChild(h(`<div class="hint pass">${hint}</div>`));
  hudRefresh = () => pills?.refresh();
}

function focusOn(id) {
  const d = DECOR.find((x) => x.id === id);
  if (!d) return;
  cam.targetYaw = Math.atan2(d.pos[0], d.pos[1]);
  sfx.cheer();
}

export const ParkMode = {
  enter(params = {}) {
    if (!built) { buildWorld(); built = true; }
    titleMode = !!params.title;
    refreshDecor();
    spawnDinos();
    buildHud();
    if (!titleMode) setBanner(true);
    if (params.newDecor) { refreshDecor(params.newDecor); focusOn(params.newDecor); }
  },
  exit() {
    setBanner(false);
    particles.clear();
    clearUI();
  },
  resize(w, h2) {
    camera.aspect = w / h2;
    camera.fov = w < h2 ? 55 : 42;
    camera.updateProjectionMatrix();
  },
  refresh() { buildHud(); },
  update(dt) {
    time += dt;
    for (const u of updaters) u(dt, time);
    for (const id in decorObjs) {
      const g = decorObjs[id];
      g.userData.update?.(dt, time);
      if (g.userData.popT !== undefined) {
        g.userData.popT = Math.min(1, g.userData.popT + dt * 1.4);
        g.scale.setScalar(Math.max(0.01, easeOutBack(g.userData.popT)));
        if (g.userData.popT >= 1) delete g.userData.popT;
      }
    }
    updateDinos(dt);
    particles.update(dt);

    if (!cam.dragging) {
      cam.autoT += dt;
      if (cam.autoT > 4 || titleMode) cam.targetYaw += dt * (titleMode ? 0.12 : 0.04);
    }
    cam.yaw = damp(cam.yaw, cam.targetYaw, 5, dt);
    const portrait = engine.w < engine.h;
    const dist = titleMode ? 38 : portrait ? 31 : cam.dist;
    camera.position.set(Math.sin(cam.yaw) * dist * Math.cos(cam.pitch), dist * Math.sin(cam.pitch), Math.cos(cam.yaw) * dist * Math.cos(cam.pitch));
    camera.lookAt(0, titleMode ? 4 : portrait ? -1.5 : 0, 0);
    hudRefresh?.();
  },
  render(r) {
    r.render(scene, camera);
  },
  pointer(type, p) {
    if (titleMode) return;
    if (type === 'down') {
      cam.dragging = true;
      cam.lastX = p.x;
      cam.moved = 0;
    } else if (type === 'move' && cam.dragging) {
      const dx = p.x - cam.lastX;
      cam.lastX = p.x;
      cam.moved += Math.abs(dx);
      cam.targetYaw -= dx * 0.008;
      cam.autoT = 0;
    } else if (type === 'up') {
      cam.dragging = false;
      if (cam.moved < 8) {
        const hits = pick(camera, p, dinoActors.map((a) => a.dino.root));
        if (hits.length) {
          let o = hits[0].object;
          while (o && !o.userData.dino) o = o.parent;
          const actor = dinoActors.find((a) => a.dino === o?.userData.dino);
          if (actor) {
            actor.dino.squish();
            sfx.giggle();
            const s = toScreen(actor.dino.root.position.clone().add(new THREE.Vector3(0, 3, 0)), camera);
            particles.burst(actor.dino.root.position.clone().add(new THREE.Vector3(0, 2.5, 0)), { count: 8, shape: 'heart', colors: [0xff6b9a, 0xff8fab], size: 0.25, speed: 2, up: 4 });
            save.tutorial = false;
            setTimeout(() => engine.go('care', { uid: actor.d.uid }), 350);
            void s;
          }
        }
      }
    }
  },
  onDataChanged() {
    updateNeeds();
    hudRefresh?.();
  },
};
