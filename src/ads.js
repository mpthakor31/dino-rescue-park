// AdMob wrapper — kids (Google Play Families Policy) safe settings.
//  * tagForChildDirectedTreatment = true  (COPPA)
//  * tagForUnderAgeOfConsent      = true  (GDPR kids)
//  * maxAdContentRating           = General (G-rated ads only)
//  * npa = true  -> only non-personalised ads
// On the web (browser preview) a friendly demo ad is shown instead.
import { Capacitor } from '@capacitor/core';
import { ADMOB } from './config.js';
import { duckMusic } from './audio.js';
import { save } from './save.js';

const native = Capacitor.isNativePlatform();
let AdMob = null;
let ready = false;
let rewardedLoaded = false;
let interstitialLoaded = false;

export async function initAds() {
  if (!native) return;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMob = mod.AdMob;
    await AdMob.initialize({
      initializeForTesting: ADMOB.testing,
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: mod.MaxAdContentRating.General,
    });
    ready = true;
    queueBanner();
    preloadRewarded();
    preloadInterstitial();
  } catch (e) {
    console.warn('AdMob init failed', e);
  }
}

async function preloadRewarded() {
  if (!ready) return;
  try {
    await AdMob.prepareRewardVideoAd({ adId: ADMOB.rewardedId, isTesting: ADMOB.testing, npa: true });
    rewardedLoaded = true;
  } catch (e) {
    rewardedLoaded = false;
    setTimeout(preloadRewarded, 30000);
  }
}

async function preloadInterstitial() {
  if (!ready) return;
  try {
    await AdMob.prepareInterstitial({ adId: ADMOB.interstitialId, isTesting: ADMOB.testing, npa: true });
    interstitialLoaded = true;
  } catch (e) {
    interstitialLoaded = false;
    setTimeout(preloadInterstitial, 30000);
  }
}

// Resolves true if the child watched the whole video and earned the reward.
export async function showRewarded() {
  duckMusic(true);
  try {
    if (native) {
      if (!ready || !rewardedLoaded) return false;
      rewardedLoaded = false;
      const reward = await AdMob.showRewardVideoAd();
      preloadRewarded();
      return !!reward;
    }
    return await demoAd('Reward video', 4);
  } catch (e) {
    preloadRewarded();
    return false;
  } finally {
    duckMusic(!save.music);
  }
}

export function rewardedAvailable() {
  return native ? rewardedLoaded : true;
}

export async function maybeShowInterstitial() {
  if (save.runs === 0 || save.runs % ADMOB.interstitialEveryRuns !== 0) return;
  duckMusic(true);
  try {
    if (native) {
      if (!ready || !interstitialLoaded) return;
      interstitialLoaded = false;
      await AdMob.showInterstitial();
      preloadInterstitial();
    } else {
      await demoAd('Short ad', 3);
    }
  } catch (e) {
    preloadInterstitial();
  } finally {
    duckMusic(!save.music);
  }
}

// ---- Banner ----
// The banner is shown only on the park screen, and hidden whenever a popup
// is open, so it never covers buttons (and kids don't tap it by accident).
let bannerShown = false;
let bannerWanted = false;
let popupCount = 0;
let bannerBusy = Promise.resolve();

function setBannerSpace(h) {
  document.body.style.setProperty('--banner', (h > 0 ? Math.ceil(h) + 4 : 0) + 'px');
}

async function applyBanner() {
  const visible = bannerWanted && popupCount === 0;
  if (!native || !ready || !ADMOB.showBanner) { setBannerSpace(0); return; }
  try {
    const mod = await import('@capacitor-community/admob');
    if (visible && !bannerShown) {
      if (!applyBanner.listening) {
        applyBanner.listening = true;
        AdMob.addListener(mod.BannerAdPluginEvents.SizeChanged, (info) => {
          setBannerSpace(bannerWanted && popupCount === 0 ? info?.height || 0 : 0);
        });
      }
      await AdMob.showBanner({
        adId: ADMOB.bannerId, isTesting: ADMOB.testing, npa: true,
        adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
        position: mod.BannerAdPosition.BOTTOM_CENTER, margin: 0,
      });
      bannerShown = true;
    } else if (visible) {
      await AdMob.resumeBanner();
    } else if (bannerShown) {
      setBannerSpace(0);
      await AdMob.hideBanner();
    }
  } catch (e) { /* no banner */ }
  if (!visible) setBannerSpace(0);
}

function queueBanner() {
  bannerBusy = bannerBusy.then(applyBanner, applyBanner);
}

export function setBanner(visible) {
  bannerWanted = visible;
  queueBanner();
}

// Called by every popup: open -> hide banner, close -> show it again
export function popupOpened() { popupCount++; queueBanner(); }
export function popupClosed() { popupCount = Math.max(0, popupCount - 1); queueBanner(); }
export function popupReset() { if (popupCount) { popupCount = 0; queueBanner(); } }

// Browser-only stand-in so every reward flow can be tested without a phone.
function demoAd(label, seconds) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'demo-ad';
    el.innerHTML = `<div class="demo-ad-box"><div class="demo-ad-tag">AD · DEMO</div>
      <div class="demo-ad-emoji">🎬</div><div class="demo-ad-title">${label}</div>
      <div class="demo-ad-note">Real AdMob ads play here in the Android app</div>
      <div class="demo-ad-count">${seconds}</div></div>`;
    document.body.appendChild(el);
    let left = seconds;
    const iv = setInterval(() => {
      left--;
      el.querySelector('.demo-ad-count').textContent = left > 0 ? left : '✓';
      if (left <= 0) {
        clearInterval(iv);
        setTimeout(() => { el.remove(); resolve(true); }, 400);
      }
    }, 1000);
  });
}
