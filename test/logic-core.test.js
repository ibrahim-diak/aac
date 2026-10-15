import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRecommendationScore,
  rankVideos,
  calculateUserLevel,
  updateDailyStreak
} from '../js/logic-core.js';

test('calculateRecommendationScore gives category boost', () => {
  const video = { id: 'v1', category: 'Comédie & Sketchs', likes: 1000 };
  const baseScore = calculateRecommendationScore(video, {});
  const boostedScore = calculateRecommendationScore(video, {
    likedCategories: { 'Comédie & Sketchs': 3 }
  });
  assert.ok(boostedScore > baseScore, 'Boosted score should exceed base score');
});

test('calculateRecommendationScore penalizes skipped videos', () => {
  const video = { id: 'v2', category: 'Danse', likes: 500 };
  const normal = calculateRecommendationScore(video, {});
  const skipped = calculateRecommendationScore(video, { skippedIds: ['v2'] });
  assert.ok(skipped < normal, 'Skipped score should be lower than normal score');
});

test('rankVideos preserves count and prioritizes user taste', () => {
  const videos = [
    { id: 'v1', category: 'Danse', likes: 100 },
    { id: 'v2', category: 'Comédie', likes: 200 },
    { id: 'v3', category: 'Danse', likes: 300 }
  ];
  const ranked = rankVideos(videos, { likedCategories: { 'Comédie': 5 } }, 3);
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].id, 'v2', 'Preferred category video should be top-ranked');
});

test('calculateUserLevel computes correct level boundaries', () => {
  const lvl1 = calculateUserLevel(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.progress, 0);

  const lvl2 = calculateUserLevel(100);
  assert.equal(lvl2.level, 2);

  const lvl3 = calculateUserLevel(400);
  assert.equal(lvl3.level, 3);
});

test('updateDailyStreak handles streak increments and breaks', () => {
  const day1 = updateDailyStreak(null, 0, new Date('2026-10-15T12:00:00Z'));
  assert.equal(day1.newStreak, 1);
  assert.equal(day1.isNewDay, true);

  const sameDay = updateDailyStreak('2026-10-15', 1, new Date('2026-10-15T18:00:00Z'));
  assert.equal(sameDay.newStreak, 1);
  assert.equal(sameDay.isNewDay, false);

  const nextDay = updateDailyStreak('2026-10-15', 1, new Date('2026-10-16T10:00:00Z'));
  assert.equal(nextDay.newStreak, 2);
  assert.equal(nextDay.isNewDay, true);

  const brokenStreak = updateDailyStreak('2026-10-10', 5, new Date('2026-10-16T10:00:00Z'));
  assert.equal(brokenStreak.newStreak, 1);
});
