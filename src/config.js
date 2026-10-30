// =============================================================
//  GAME CONFIG  —  Yahan apni AdMob IDs daalni hain (sirf yahi file badalni hai)
// =============================================================
// Abhi Google ki official TEST IDs lagi hain. Test IDs se kabhi account ban nahi hota.
// Play Store par daalne se pehle AdMob account se apni REAL IDs yahan paste karein
// aur android/app/src/main/AndroidManifest.xml mein APPLICATION_ID bhi badlein.

export const ADMOB = {
  // true = test ads (development ke liye). Real launch par false karein.
  testing: true,
  rewardedId: 'ca-app-pub-3940256099942544/5224354917',
  interstitialId: 'ca-app-pub-3940256099942544/1033173712',
  bannerId: 'ca-app-pub-3940256099942544/6300978111',
  // Har kitne rescue missions ke baad ek full-screen ad dikhe (kids ke liye kam rakhein)
  interstitialEveryRuns: 2,
  // Park screen ke neeche chhota banner
  showBanner: true,
};

// Parents area se khulne wala privacy policy link (Play Store ke liye zaroori)
export const PRIVACY_POLICY_URL = 'https://example.com/dino-rescue-park/privacy';

export const ECONOMY = {
  startCoins: 120,
  eggPrice: 150,
  rareEggPrice: 400,
  levelUpReward: 40,
};
