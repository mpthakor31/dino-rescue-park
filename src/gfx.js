import * as THREE from 'three';

// ---------- Toon (cartoon) shading ----------
const gradientMap = (() => {
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key) && !opts.unique) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap, ...stripOpts(opts) });
  if (!opts.unique) matCache.set(key, m);
  return m;
}
function stripOpts(o) {
  const { unique, ...rest } = o;
  return rest;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2b2340, side: THREE.BackSide });
// Inverted-hull outline: gives the bold cartoon edge look.
export function outline(mesh, thickness = 0.045) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.scale.setScalar(1 + thickness / Math.max(0.2, mesh.geometry.boundingSphere?.radius || 0.5));
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

export function mesh(geo, mat, { cast = true, receive = false, line = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (line) {
    geo.computeBoundingSphere();
    outline(m, line);
  }
  return m;
}

// ---------- Gradient sky dome ----------
export function makeSky(top, bottom) {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.4+0.25,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.8));
      float sun = pow(max(dot(vP, normalize(vec3(0.5,0.45,-0.7))),0.0), 60.0);
      gl_FragColor = vec4(c + vec3(1.0,0.95,0.8)*sun*0.6, 1.0);}`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -1;
  return sky;
}

export function setSkyColors(sky, top, bottom) {
  sky.material.uniforms.top.value.set(top);
  sky.material.uniforms.bottom.value.set(bottom);
}

// ---------- Animated water ----------
export function makeWater(size = 300, color = 0x4cc9f0) {
  const geo = new THREE.PlaneGeometry(size, size, 60, 60);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(color) }, deep: { value: new THREE.Color(0x1d7fc4) } },
    vertexShader: `uniform float t; varying vec2 vUv; varying float vH;
      void main(){ vUv = uv; vec3 p = position;
        float h = sin(p.x*0.18+t*1.2)*0.25 + cos(p.z*0.22+t*0.9)*0.25; p.y += h; vH = h;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform float t; uniform vec3 col; uniform vec3 deep; varying vec2 vUv; varying float vH;
      void main(){ float d = length(vUv-0.5)*2.0; vec3 c = mix(col, deep, smoothstep(0.1,0.9,d));
        float s = step(0.985, fract(sin(dot(floor(vUv*180.0+vec2(t*0.6,t*0.4)), vec2(12.9898,78.233)))*43758.5453));
        c += vec3(s)*0.6 + vH*0.25; gl_FragColor = vec4(c, 0.95);}`,
  });
  const w = new THREE.Mesh(geo, mat);
  w.receiveShadow = false;
  w.userData.update = (dt) => (mat.uniforms.t.value += dt);
  return w;
}

// ---------- Clouds ----------
export function makeCloud(scale = 1) {
  const g = new THREE.Group();
  const m = toon(0xffffff, { transparent: true, opacity: 0.95 });
  const parts = [[0, 0, 0, 1.6], [1.5, -0.2, 0.2, 1.2], [-1.5, -0.3, 0, 1.1], [0.6, 0.7, 0, 1.0], [-0.7, 0.5, 0.3, 0.9]];
  for (const [x, y, z, r] of parts) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
    s.position.set(x, y, z);
    g.add(s);
  }
  g.scale.setScalar(scale);
  return g;
}

// ---------- Particle bursts (confetti, bubbles, sparkles, hearts) ----------
export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  burst(pos, { count = 20, colors = [0xff6b6b, 0xffd43b, 0x51cf66, 0x339af0, 0xcc5de8], speed = 4, up = 4, size = 0.12, life = 1.4, gravity = 9, shape = 'box' } = {}) {
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      let geo;
      if (shape === 'sphere') geo = SPHERE;
      else if (shape === 'heart') geo = HEART;
      else if (shape === 'star') geo = STAR;
      else geo = BOX;
      const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: shape === 'sphere' ? 0.7 : 1 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      p.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      p.userData = {
        v: new THREE.Vector3(Math.cos(a) * sp, up * (0.6 + Math.random() * 0.8), Math.sin(a) * sp),
        life, max: life, gravity, spin: (Math.random() - 0.5) * 10,
      };
      this.scene.add(p);
      this.items.push(p);
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      const u = p.userData;
      u.life -= dt;
      u.v.y -= u.gravity * dt;
      p.position.addScaledVector(u.v, dt);
      p.rotation.x += u.spin * dt;
      p.rotation.y += u.spin * dt;
      p.material.opacity = Math.min(1, u.life / (u.max * 0.4));
      if (u.life <= 0) {
        this.scene.remove(p);
        p.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
  clear() {
    for (const p of this.items) { this.scene.remove(p); p.material.dispose(); }
    this.items = [];
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 0.3);
const SPHERE = new THREE.SphereGeometry(1, 10, 8);
const HEART = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.6);
  s.bezierCurveTo(-1.2, 0.2, -0.6, 1.1, 0, 0.5);
  s.bezierCurveTo(0.6, 1.1, 1.2, 0.2, 0, -0.6);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
  g.center();
  return g;
})();
const STAR = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false });
  g.center();
  return g;
})();

// ---------- Nature props ----------
export function palmTree(h = 5) {
  const g = new THREE.Group();
  const trunkMat = toon(0xa0703f);
  let y = 0;
  const segs = Math.round(h / 0.7);
  for (let i = 0; i < segs; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.28 - i * 0.012, 0.34 - i * 0.012, 0.7, 8), trunkMat);
    s.position.set(Math.sin(i * 0.25) * 0.4, y + 0.35, 0);
    s.rotation.z = -Math.cos(i * 0.25) * 0.08;
    g.add(s);
    y += 0.68;
  }
  const leafMat = toon(0x40c057);
  const top = new THREE.Group();
  top.position.set(Math.sin(segs * 0.25) * 0.4, y, 0);
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.45, 3, 4), leafMat);
    leaf.scale.z = 0.25;
    leaf.position.set(0, 0, 0);
    leaf.geometry.translate(0, 1.5, 0);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.rotation.x = 1.1 + Math.random() * 0.3;
    top.add(leaf);
  }
  const coco = toon(0x6b4423);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.SphereGeometry(0.22, 8, 6), coco);
    c.position.set(Math.cos(i * 2.1) * 0.3, -0.2, Math.sin(i * 2.1) * 0.3);
    top.add(c);
  }
  g.add(top);
  g.userData.top = top;
  return g;
}

export function roundTree(color = 0x51cf66, h = 2.5) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.25, 0.35, h, 7), toon(0x8b5a2b));
  t.position.y = h / 2;
  g.add(t);
  const m = toon(color);
  const blobs = [[0, h + 0.8, 0, 1.4], [0.8, h + 0.3, 0.3, 1.0], [-0.8, h + 0.4, -0.2, 1.0], [0.1, h + 1.6, 0.1, 0.9]];
  for (const [x, y, z, r] of blobs) {
    const b = mesh(new THREE.IcosahedronGeometry(r, 1), m);
    b.position.set(x, y, z);
    g.add(b);
  }
  return g;
}

export function pineTree(color = 0x2f9e44, h = 4, snow = false) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.2, 0.3, 1, 6), toon(0x6b4423));
  t.position.y = 0.5;
  g.add(t);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.ConeGeometry(1.5 - i * 0.35, 1.8, 8), toon(color));
    c.position.y = 1.4 + i * 1.0;
    g.add(c);
    if (snow) {
      const s = mesh(new THREE.ConeGeometry(0.75 - i * 0.18, 0.7, 8), toon(0xffffff));
      s.position.y = 2.0 + i * 1.0;
      g.add(s);
    }
  }
  g.scale.setScalar(h / 4);
  return g;
}

export function rock(size = 1, color = 0x9aa5b1) {
  const r = mesh(new THREE.DodecahedronGeometry(size, 0), toon(color));
  r.scale.y = 0.7;
  r.rotation.set(Math.random(), Math.random(), Math.random());
  return r;
}

export function bush(color = 0x37b24d, size = 1) {
  const g = new THREE.Group();
  const m = toon(color);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(size * (0.6 + Math.random() * 0.3), 1), m);
    b.position.set((i - 1) * size * 0.6, size * 0.4, (Math.random() - 0.5) * 0.4);
    g.add(b);
  }
  return g;
}

export function flower(color) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), toon(0x2f9e44), { cast: false });
  stem.position.y = 0.25;
  g.add(stem);
  const pm = toon(color);
  for (let i = 0; i < 5; i++) {
    const p = mesh(new THREE.SphereGeometry(0.11, 6, 5), pm, { cast: false });
    const a = (i / 5) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.13, 0.52, Math.sin(a) * 0.13);
    g.add(p);
  }
  const c = mesh(new THREE.SphereGeometry(0.08, 6, 5), toon(0xffd43b), { cast: false });
  c.position.y = 0.54;
  g.add(c);
  return g;
}

// Canvas texture with emoji/text (used for floating labels)
export function emojiSprite(emoji, size = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.font = '96px serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
