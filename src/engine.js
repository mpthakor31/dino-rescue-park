import * as THREE from 'three';

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const modes = {};
let current = null;
let switching = false;
const fade = document.getElementById('fade');

export const engine = {
  renderer,
  canvas: renderer.domElement,
  get w() { return window.innerWidth; },
  get h() { return window.innerHeight; },
  get mode() { return current; },
  register(name, mode) { modes[name] = mode; },
  async go(name, params = {}) {
    if (switching) return;
    switching = true;
    if (current) {
      fade.classList.add('on');
      await wait(280);
      current.exit?.();
    }
    current = modes[name];
    current.enter(params);
    current.resize?.(window.innerWidth, window.innerHeight);
    // render one frame behind the fade so there's no pop
    current.update(0.016);
    current.render(renderer);
    fade.classList.remove('on');
    switching = false;
  },
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Resize ----------
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  current?.resize?.(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------- Input ----------
const ptr = { x: 0, y: 0, down: false };
function nd(e) {
  return { x: e.clientX, y: e.clientY, nx: (e.clientX / window.innerWidth) * 2 - 1, ny: -(e.clientY / window.innerHeight) * 2 + 1 };
}
renderer.domElement.addEventListener('pointerdown', (e) => { ptr.down = true; current?.pointer?.('down', nd(e), e); });
window.addEventListener('pointermove', (e) => { current?.pointer?.('move', nd(e), e); });
window.addEventListener('pointerup', (e) => { if (ptr.down) current?.pointer?.('up', nd(e), e); ptr.down = false; });
window.addEventListener('keydown', (e) => current?.key?.(e.key));

// ---------- Loop ----------
let last = performance.now();
let paused = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!current || paused) return;
  current.update(dt);
  current.render(renderer);
}
requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  last = performance.now();
  if (document.hidden) current?.onHide?.();
});

// Raycast helper
const ray = new THREE.Raycaster();
export function pick(camera, p, objects) {
  ray.setFromCamera(new THREE.Vector2(p.nx, p.ny), camera);
  return ray.intersectObjects(objects, true);
}
export function toScreen(vec3, camera) {
  const v = vec3.clone().project(camera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (-v.y + 1) / 2 * window.innerHeight };
}
