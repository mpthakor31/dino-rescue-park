import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import { engine } from './engine.js';
import { initAudio } from './audio.js';
import { initAds } from './ads.js';
import { makeThumbnails } from './ui.js';
import { ParkMode } from './modes/park.js';
import { CareMode } from './modes/care.js';
import { HatchMode } from './modes/hatch.js';
import { RunnerMode } from './modes/runner.js';

engine.register('park', ParkMode);
engine.register('care', CareMode);
engine.register('hatch', HatchMode);
engine.register('runner', RunnerMode);

// Sound can only start after the first touch (browser/Android rule)
const unlock = () => { initAudio(); window.removeEventListener('pointerdown', unlock, true); };
window.addEventListener('pointerdown', unlock, true);

async function boot() {
  try { await document.fonts.ready; } catch (e) { /* ignore */ }
  makeThumbnails();
  initAds();
  await engine.go('park', { title: true });
  const b = document.getElementById('boot');
  b.classList.add('hide');
  setTimeout(() => b.remove(), 600);
}
boot();

// Android back button: close a popup, go back to the park, or leave the app
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', () => {
      const m = document.querySelector('.modal-bg');
      if (m) { m.querySelector('.close')?.click(); return; }
      if (engine.mode !== ParkMode) engine.go('park');
      else App.exitApp();
    });
    // pause music when the app goes to the background
    App.addListener('appStateChange', ({ isActive }) => { if (!isActive) engine.mode?.onHide?.(); });
  });
}
