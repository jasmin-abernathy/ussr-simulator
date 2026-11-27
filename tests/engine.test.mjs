import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, RULES } from '../web/game-data.js';
import { createState, hydrateState, getStats, getActivity, quotePurchase, clickProduce,
  buyActivity, advance, startPlan, claimPlan, reduceInflation, exportState, getGoals } from '../web/engine.js';

const NOW = 1700000000000;
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-11,
  message ?? `${actual} ≈ ${expected}`);
const funded = () => Object.assign(createState(NOW), { cash: 1e15, totalEarned: 1e15, communism: 10000 });

test('all 22 historical prices and unlock thresholds are retained', () => {
  assert.deepEqual(ACTIVITIES.map(item => [item.initialPrice, item.unlock]), [
    [200, 0], [400, 5], [800, 10], [1500, 25], [3000, 40], [6000, 80],
    [10000, 120], [20000, 180], [50000, 220], [223200, 250], [250000, 280],
    [300000, 500], [500000, 600], [800000, 650], [1100000, 700], [1100000, 800],
    [1350000, 900], [2200000, 1000], [2500000, 1200], [2500000, 1300],
    [1000000, 1500], [2500000, 1800],
  ]);
  assert.equal(new Set(ACTIVITIES.map(item => item.id)).size, 22);
  assert.equal(ACTIVITIES.find(item => item.id === 'black-market').effects.productionPercent, 2);
  assert.equal(ACTIVITIES.find(item => item.id === 'electrification').effects.productionPercent, 5);
  assert.equal(ACTIVITIES.find(item => item.id === 'collectivisation').effects.taxPercent, 2);
});

test('a fresh player can build the first workshop with twenty clicks', () => {
  const state = createState(NOW);
  assert.equal(getStats(state).productionPerClick, 10);
  assert.equal(getStats(state).taxesPerSecond, 0);
  assert.equal(getActivity(state, 'matches').cost, 200);
  for (let count = 0; count < 20; count += 1) clickProduce(state);
  assert.deepEqual(buyActivity(state, 'matches'), { ok: true, bought: 1, spent: 200 });
  assert.equal(state.cash, 0);
  assert.equal(state.totalEarned, 200);
  assert.equal(getStats(state).productionPerClick, 20);
  assert.equal(state.communism, 1);
  close(getActivity(state, 'matches').cost, 230);
  assert.equal(getActivity(state, 'gum').unlocked, false);
});

test('a locked or invalid purchase cannot spend money or mutate the game', () => {
  const state = createState(NOW);
  state.cash = 100000;
  const before = structuredClone(state);
  assert.equal(buyActivity(state, 'gum').reason, 'locked');
  assert.equal(buyActivity(state, 'no-such-item').reason, 'unknown-activity');
  for (const bad of [0, -1, NaN, Infinity, 1.5, '10', {}, '__proto__']) {
    assert.equal(buyActivity(state, 'matches', bad).reason, 'invalid-quantity');
  }
  assert.deepEqual(state, before);
  assert.equal(getActivity(state, '__proto__'), null);
});

test('batch quotes are read-only, affordable, and match real successive purchases', () => {
  const state = createState(NOW);
  state.cash = 1000;
  const before = structuredClone(state);
  const quote = quotePurchase(state, 'matches', 10);
  assert.equal(quote.quantity, 4);
  close(quote.cost, 998.675);
  assert.deepEqual(state, before);
  const bought = buyActivity(state, 'matches', 10);
  assert.equal(bought.bought, 4);
  close(bought.spent, quote.cost);
  close(state.cash, 1.325);
  assert.equal(state.owned.matches, 4);
  assert.equal(getStats(state).productionPerClick, 50);
  assert.equal(quotePurchase(state, 'matches', 'max').quantity, 0);
});

test('communism unlocks activities at the exact historical threshold', () => {
  const state = createState(NOW);
  state.cash = 1e6;
  buyActivity(state, 'matches', 4);
  assert.equal(getActivity(state, 'gum').unlocked, false);
  buyActivity(state, 'matches');
  assert.equal(getActivity(state, 'gum').unlocked, true);
  buyActivity(state, 'gum');
  assert.equal(getStats(state).taxesPerSecond, 10);
  assert.equal(state.communism, 6);
});

test('percentage bonuses add to the base and apply to future flat production too', () => {
  const state = funded();
  buyActivity(state, 'matches');
  buyActivity(state, 'black-market', 2);
  buyActivity(state, 'electrification');
  buyActivity(state, 'collectivisation');
  let stats = getStats(state);
  close(stats.productionPerClick, 21.8); // (10 + 10) × (1 + 2% + 2% + 5%).
  close(stats.taxesPerSecond, 163.2); // (80 + 80) × 1.02.
  buyActivity(state, 'matches');
  stats = getStats(state);
  close(stats.productionPerClick, 32.7);
  assert.equal(stats.productionBonusPercent, 9);
  assert.equal(stats.taxBonusPercent, 2);
});

test('custom rules cycle through activities, and doubles affect only future purchases', () => {
  const state = funded();
  buyActivity(state, 'matches');
  buyActivity(state, 'dissidence');
  assert.equal(getActivity(state, 'matches').effects.production, 20);
  assert.equal(getActivity(state, 'matches').effects.communism, 1);
  assert.equal(state.counters.production, 180); // Existing matches remain +10.
  buyActivity(state, 'matches');
  assert.equal(state.counters.production, 200);
  const matchesPrice = getActivity(state, 'matches').cost;
  buyActivity(state, 'radio');
  close(getActivity(state, 'matches').cost, matchesPrice / 3);
  buyActivity(state, 'radio');
  close(getActivity(state, 'gum').cost, 400 / 3);
  buyActivity(state, 'radio', 20); // First full round now completed.
  close(getActivity(state, 'matches').cost, matchesPrice / 3);
  buyActivity(state, 'radio');
  close(getActivity(state, 'matches').cost, matchesPrice / 9);
});

test('radio batch quotes include the self-discount and match single purchases', () => {
  const batch = funded();
  const single = funded();
  const quote = quotePurchase(batch, 'radio', 30);
  const bought = buyActivity(batch, 'radio', 30);
  let spent = 0;
  for (let n = 0; n < 30; n += 1) spent += buyActivity(single, 'radio').spent;
  close(quote.cost, spent);
  close(bought.spent, spent);
  close(batch.cash, single.cash);
  assert.deepEqual(batch.owned, single.owned);
  assert.deepEqual(batch.counters, single.counters);
});

test('milliseconds accumulate without losing passive income on frequent saves', () => {
  const state = funded();
  buyActivity(state, 'gum');
  state.cash = 0;
  assert.equal(advance(state, NOW + 350).earned, 0);
  let saved = exportState(state, NOW + 750);
  let restored = hydrateState(saved, NOW + 950);
  assert.equal(restored.cash, 0);
  assert.equal(advance(restored, NOW + 1000).earned, 10);
  saved = exportState(restored, NOW + 1250);
  restored = hydrateState(JSON.stringify(saved), NOW + 2000);
  assert.equal(restored.cash, 20);
  assert.equal(restored.tickRemainderMs, 0);
});

test('chunked and single time advancement agree across inflation boundaries', () => {
  const whole = funded();
  buyActivity(whole, 'gum');
  whole.cash = 0;
  whole.productionSteps = 8000;
  const chunks = structuredClone(whole);
  advance(whole, NOW + 7000500);
  for (let ms = 137; ms < 7000500; ms += 137) advance(chunks, NOW + ms);
  advance(chunks, NOW + 7000500);
  close(whole.cash, 69100); // 2,000×10 + 2,000×9.9 + 2,000×9.8 + 1,000×9.7.
  close(chunks.cash, whole.cash);
  assert.equal(chunks.taxSteps, whole.taxSteps);
  assert.equal(chunks.productionSteps, 1000);
  assert.equal(chunks.tickRemainderMs, 500);
});

test('return income is capped at eight hours, discarded excess cannot be reclaimed', () => {
  const state = funded();
  buyActivity(state, 'gum');
  state.cash = 0;
  const saved = exportState(state, NOW);
  const expected = structuredClone(state);
  advance(expected, NOW + RULES.offlineCapMs);
  const restored = hydrateState(saved, NOW + 72 * 60 * 60 * 1000);
  close(restored.cash, expected.cash);
  assert.equal(restored.offline.capped, true);
  assert.equal(restored.offline.creditedMs, RULES.offlineCapMs);
  assert.equal(restored.automaticSeconds, 28800);
  assert.equal(advance(restored, restored.lastUpdate).earned, 0);
  assert.equal(restored.automaticSeconds, 28800);
});

test('backward clocks and future save dates never grant duplicate or negative income', () => {
  const state = funded();
  buyActivity(state, 'gum');
  state.cash = 0;
  advance(state, NOW + 10000);
  assert.equal(advance(state, NOW + 1000).earned, 0);
  assert.equal(advance(state, NOW + 10000).earned, 0);
  assert.equal(state.cash, 100);
  const restored = hydrateState(exportState(state, NOW + 10000), NOW);
  assert.equal(restored.offline.earned, 0);
  assert.equal(restored.cash, 100);
  assert.equal(restored.recovered, true);
  assert.equal(restored.lastUpdate, NOW);
});

test('inflation uses pre-increment income and anticorruption grants only one valid reward', () => {
  const state = funded();
  buyActivity(state, 'gum');
  state.cash = 0;
  state.taxSteps = 1999;
  state.productionSteps = 999;
  assert.equal(clickProduce(state).earned, 10);
  close(getStats(state).productionPerClick, 9.9);
  assert.equal(advance(state, NOW + 1000).earned, 10);
  assert.equal(getStats(state).productionPerClick, 10);
  assert.equal(getStats(state).taxInflation, 1);
  const communism = state.communism;
  assert.equal(reduceInflation(state).earned, 10);
  assert.equal(state.communism, communism + 1);
  assert.equal(getStats(state).taxesPerSecond, 10);
  assert.equal(reduceInflation(state).ok, false);
});

test('plans take four hours, pay exactly once, and increase the next reward by 20%', () => {
  const state = createState(NOW);
  assert.equal(startPlan(state, NOW).reason, 'locked');
  state.communism = 10000;
  assert.equal(startPlan(state, NOW).durationMs, 14400000);
  assert.equal(startPlan(state, NOW).reason, 'plan-active');
  assert.equal(claimPlan(state, NOW + 14399999).reason, 'plan-not-ready');
  assert.equal(claimPlan(state, NOW + 14400000).earned, 5000000);
  assert.equal(claimPlan(state, NOW + 14400000).ok, false);
  assert.equal(getStats(state).plan.reward, 6000000);
  assert.equal(state.plan.completed, 1);
});

test('beer shortens only future plans and preserves the historical 25-minute floor', () => {
  const state = funded();
  startPlan(state, NOW);
  buyActivity(state, 'beer');
  assert.equal(state.plan.remainingMs, 14400000);
  assert.equal(getStats(state).plan.durationMs, 14400000);
  assert.equal(getStats(state).plan.nextDurationMs, 14100000);
  buyActivity(state, 'beer', 100);
  assert.equal(getStats(state).plan.durationMs, 14400000);
  assert.equal(getStats(state).plan.nextDurationMs, 1500000);
  const restored = hydrateState(exportState(state, NOW), NOW + 8 * 3600000);
  assert.equal(restored.plan.status, 'ready');
  assert.equal(claimPlan(restored, restored.lastUpdate).ok, true);
  assert.equal(startPlan(restored, restored.lastUpdate).durationMs, 1500000);
});

test('malformed saves produce finite bounded states without extra or prototype keys', () => {
  for (const bad of ['{', 'null', '[]', '"hello"', '{"version":99}', ' '.repeat(RULES.maxSaveBytes + 1)]) {
    const state = hydrateState(bad, NOW);
    assert.equal(state.cash, 0);
    assert.equal(state.version, 1);
  }
  const bad = JSON.parse('{"version":1,"owned":{"matches":-3,"gum":1e300,"__proto__":{"polluted":true}},"cash":-100,"totalEarned":"3","communism":null,"counters":{"production":-100,"taxes":"infinite"},"taxSteps":-12,"productionSteps":1e300,"plan":{"status":"ready","completed":-1},"lastUpdate":1e300}');
  bad.cash = Infinity;
  bad.clicks = NaN;
  const state = hydrateState(bad, NOW);
  assert.equal(state.cash, 0);
  assert.equal(state.owned.matches, 0);
  assert.equal(state.owned.gum, RULES.maxOwned);
  assert.equal(Object.keys(state.owned).length, 22);
  assert.equal({}.polluted, undefined);
  assert.equal(state.recovered, true);
  assert.equal(state.taxSteps, 0);
  const assertNumbers = value => {
    if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
    else if (value && typeof value === 'object') Object.values(value).forEach(assertNumbers);
  };
  assertNumbers(state);
  for (const item of ACTIVITIES) assertNumbers(getActivity(state, item.id));
  assertNumbers(getStats(state));
});

test('normal exports survive reload exactly and do not share mutable references', () => {
  const state = funded();
  buyActivity(state, 'matches', 5);
  buyActivity(state, 'dissidence', 2);
  buyActivity(state, 'gum', 3);
  buyActivity(state, 'radio', 7);
  clickProduce(state);
  const saved = exportState(state, NOW + 1234);
  const restored = hydrateState(saved, NOW + 1234);
  assert.equal(restored.recovered, false);
  assert.deepEqual(exportState(restored, NOW + 1234), saved);
  saved.owned.matches = 999;
  assert.equal(state.owned.matches, 5);
  assert.equal(restored.owned.matches, 5);
});

test('numeric limits never make a batch free or overflow prices and rewards', () => {
  const state = funded();
  state.cash = RULES.maxNumber;
  state.owned.matches = 9999;
  const quote = quotePurchase(state, 'matches', 'max');
  assert.equal(quote.quantity, 1);
  assert.equal(quote.cost, RULES.maxNumber);
  buyActivity(state, 'matches', 'max');
  assert.equal(state.cash, 0);
  assert.equal(buyActivity(state, 'matches').reason, 'ownership-limit');
  state.plan.completed = RULES.maxOwned;
  assert.equal(getStats(state).plan.reward, RULES.maxNumber);
  for (const item of ACTIVITIES) state.owned[item.id] = RULES.maxOwned;
  for (const item of ACTIVITIES) {
    const activity = getActivity(state, item.id);
    assert.ok(Number.isFinite(activity.cost) && activity.cost > 0);
    assert.ok(Object.values(activity.effects).every(Number.isFinite));
  }
});

test('milestones are informational and bounded', () => {
  const state = createState(NOW);
  const before = structuredClone(state);
  assert.ok(getGoals(state).every(goal => goal.progress >= 0 && goal.progress <= 1));
  assert.deepEqual(state, before);
  state.communism = 10000;
  assert.equal(getGoals(state).find(goal => goal.id === 'first-plan').complete, true);
});
