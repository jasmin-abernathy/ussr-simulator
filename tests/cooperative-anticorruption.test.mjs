import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVITIES} from '../web/runtime-anthem-v15/game-data.js';
import {
 createState,buyActivity,convertActivity,advance,exportState,hydrateState,
 corruptionGrossPerMinute,corruptionPerMinute,getCorruptionBreakdown,
 getCooperativePrevention,COOPERATIVE_CORRUPTION_PREVENTION,COOPERATIVE_PREVENTION_MAX,
} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} vs ${expected}`);
const world=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=5000;s.cash=1e10;return s;};
test('grocery card is renamed without changing its ID, price or save compatibility',()=>{
 const grocery=ACTIVITIES.find(activity=>activity.id==='grocery');
 assert.equal(grocery.name,'Épicerie coopérative');
 assert.equal(grocery.initialPrice,20000);
 assert.equal(grocery.unlock,180);
});
test('cooperative groceries, canneries and collectivisation offer distinct permanent prevention',()=>{
 const s=world();s.owned.gum=20;
 const gross=corruptionGrossPerMinute(s);
 assert.equal(getCooperativePrevention(s),0);
 assert.equal(buyActivity(s,'grocery').ok,true);
 close(getCooperativePrevention(s),.02);
 close(corruptionPerMinute(s),corruptionGrossPerMinute(s)*.98);
 assert.equal(buyActivity(s,'canning').ok,true);
 close(getCooperativePrevention(s),.04);
 assert.equal(buyActivity(s,'collectivisation').ok,true);
 close(getCooperativePrevention(s),.07);
 close(corruptionPerMinute(s),corruptionGrossPerMinute(s)*.93);
 assert.ok(gross>0);
});
test('per-type limits and overall cap prevent making all new corruption vanish',()=>{
 const s=world();
 s.owned.grocery=10000;s.owned.canning=10000;s.owned.collectivisation=10000;
 close(getCooperativePrevention(s),COOPERATIVE_PREVENTION_MAX);
 close(COOPERATIVE_PREVENTION_MAX,.50);
 close(COOPERATIVE_CORRUPTION_PREVENTION.grocery.maxUnits,10);
 close(COOPERATIVE_CORRUPTION_PREVENTION.canning.maxUnits,6);
 close(COOPERATIVE_CORRUPTION_PREVENTION.collectivisation.maxUnits,6);
 assert.ok(corruptionPerMinute(s)>0);
 const b=getCorruptionBreakdown(s);
 close(b.net,b.gross*.5);
 assert.equal(b.cooperativePrevention,.5);
});
test('cooperative prevention stacks multiplicatively with public measures and never reduces the historical stock',()=>{
 const s=world();s.corruption=100;s.owned.gum=10;s.owned.grocery=5;
 s.transparencyHouses=3;s.citizensInspectorates=3;
 const b=getCorruptionBreakdown(s);
 close(b.cooperativePrevention,.10);
 close(b.net,b.gross*.7*.85*.9);
 const before=s.corruption;
 advance(s,NOW+60000);
 close(s.corruption,before+b.net);
});
test('already-owned groceries and conversions immediately affect corruption; benefits survive save and offline time',()=>{
 const s=world();s.owned.trading=1;s.owned.gum=3;
 const baseline=getCorruptionBreakdown(s).cooperativePrevention;
 assert.equal(baseline,0);
 assert.equal(convertActivity(s,'trading','grocery').ok,true);
 close(getCooperativePrevention(s),.02);
 const saved=exportState(s,NOW);
 const restored=hydrateState(saved,NOW+60000);
 assert.equal(restored.owned.grocery,1);
 close(getCooperativePrevention(restored),.02);
 close(restored.corruption,s.corruption+corruptionPerMinute(s));
 assert.equal(convertActivity(restored,'grocery','trading').ok,true);
 close(getCooperativePrevention(restored),0);
});
test('legacy non-world economy retains original corruption behavior',()=>{
 const s=createState(NOW);s.owned.grocery=5;s.owned.collectivisation=5;
 assert.equal(getCooperativePrevention(s),0);
});
test('public status and business cards both explain cooperative anti-corruption effect',()=>{
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.match(app,/COOPERATIVE_CORRUPTION_PREVENTION\[item\.id\]/);
 assert.match(app,/activity-cooperative-effect/);
 assert.match(app,/integrity\.cooperativePrevention/);
 assert.match(css,/\.activity-cooperative-effect/);
});
