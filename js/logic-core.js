/**
 * Logic Core for Plateforme Z
 * Pure JavaScript calculations for recommendations, user progression and game mechanics.
 * Pure functions: safe for Node.js unit testing and browser usage.
 */

/**
 * Computes a recommendation score for a video based on user behavior.
 * @param {Object} video
 * @param {Object} profile - { likedCategories: {}, skippedIds: Set|Array, favoriteIds: Set|Array, watchTimeByCat: {} }
 * @returns {number}
 */
export function calculateRecommendationScore(video, profile = {}) {
  let score = 50; // Neutral baseline score

  const likedCats = profile.likedCategories || {};
  const cat = video.category || 'Général';
  if (likedCats[cat]) {
    score += Math.min(likedCats[cat] * 15, 60); // Up to +60 for category affinity
  }

  // Watch time bonus
  const watchTimes = profile.watchTimeByCat || {};
  if (watchTimes[cat]) {
    score += Math.min(Math.floor(watchTimes[cat] / 10) * 5, 30);
  }

  // Favorites check
  const favs = new Set(profile.favoriteIds || []);
  if (favs.has(video.id)) {
    score += 40;
  }

  // Skips penalty
  const skips = new Set(profile.skippedIds || []);
  if (skips.has(video.id)) {
    score -= 45;
  }

  // Base popularity factor
  const likes = Number(video.likes) || 0;
  score += Math.min(Math.floor(likes / 500), 15);

  return Math.max(score, 1);
}

/**
 * Re-ranks a list of videos according to recommendations with exploration diversity.
 * @param {Array} videos
 * @param {Object} profile
 * @param {number} maxCount
 * @returns {Array}
 */
export function rankVideos(videos = [], profile = {}, maxCount = 50) {
  if (!videos || !videos.length) return [];

  // If user profile has no history yet, return balanced exploration mix
  const hasHistory = profile.likedCategories && Object.keys(profile.likedCategories).length > 0;
  if (!hasHistory) {
    return [...videos].slice(0, maxCount);
  }

  const scored = videos.map(v => ({
    video: v,
    score: calculateRecommendationScore(v, profile)
  }));

  scored.sort((a, b) => b.score - a.score);

  // Apply diversity interleaving (prevent >3 videos of same category in a row)
  const result = [];
  const pool = scored.map(item => item.video);
  let lastCategory = '';
  let repeatCount = 0;

  while (pool.length > 0 && result.length < maxCount) {
    let pickIndex = 0;
    for (let i = 0; i < Math.min(pool.length, 5); i++) {
      if (pool[i].category !== lastCategory || repeatCount < 2) {
        pickIndex = i;
        break;
      }
    }
    const [picked] = pool.splice(pickIndex, 1);
    if (picked.category === lastCategory) {
      repeatCount++;
    } else {
      lastCategory = picked.category;
      repeatCount = 1;
    }
    result.push(picked);
  }

  return result;
}

/**
 * Calculates user level and progression from XP.
 * @param {number} xp
 * @returns {{ level: number, currentXp: number, nextLevelXp: number, progress: number, title: string }}
 */
export function calculateUserLevel(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  const currentLevelBase = Math.pow(level - 1, 2) * 100;
  const nextLevelBase = Math.pow(level, 2) * 100;
  const range = nextLevelBase - currentLevelBase;
  const progress = range > 0 ? Math.min(100, Math.round(((safeXp - currentLevelBase) / range) * 100)) : 0;

  const titles = [
    'Novice Curieux',
    'Explorateur Z',
    'Amateur de Défis',
    'Virtuose du Quiz',
    'Maître Réflexe',
    'Cinéphile Averti',
    'Légende de la Plateforme Z'
  ];
  const title = titles[Math.min(level - 1, titles.length - 1)];

  return {
    level,
    xp: safeXp,
    currentLevelBase,
    nextLevelBase,
    progress,
    title
  };
}

/**
 * Computes daily streak state.
 * @param {string|null} lastDateStr - ISO date string YYYY-MM-DD
 * @param {number} currentStreak
 * @param {Date} now
 * @returns {{ newStreak: number, isNewDay: boolean, streakSaved: boolean }}
 */
export function updateDailyStreak(lastDateStr, currentStreak = 0, now = new Date()) {
  const todayStr = now.toISOString().split('T')[0];
  if (!lastDateStr) {
    return { newStreak: 1, isNewDay: true, streakSaved: false };
  }

  if (lastDateStr === todayStr) {
    return { newStreak: currentStreak, isNewDay: false, streakSaved: false };
  }

  const lastDate = new Date(lastDateStr);
  const todayDate = new Date(todayStr);
  const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, isNewDay: true, streakSaved: false };
  } else {
    // Streak broken, restart at 1
    return { newStreak: 1, isNewDay: true, streakSaved: false };
  }
}
