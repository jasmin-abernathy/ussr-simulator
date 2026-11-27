import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 createState,advance,exportState,hydrateState,getBusinessEconomy,corruptionPerMinute,
 publicProjectOffers,spendPublicBudget,getPublicNeedScore,generatePublicNeed,
 PUBLIC_NEED_COOLDOWN_MS,PUBLIC_NEED_TYPES,
} from '../web/runtime-anthem-v15/engine.js';
const NOW=Date.UTC(2026,10,27,12,0,0);
const build=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.publicBudget=1000000;s.owned.matches=24;return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('public-service needs emerge as the economy grows after sustained activity',()=>{
 const s=build();
 assert.equal(PUBLIC_NEED_COOLDOWN_MS,900000);
 assert.ok(getPublicNeedScore(s)>=2);
 assert.equal(advance(s,NOW+899000).publicNeedsCreated,undefined);
 assert.equal(s.publicNeedsPending,0);
 const tick=advance(s,NOW+900000);
 assert.equal(tick.publicNeedsCreated,1);
 assert.equal(s.publicNeedsPending,1);
 assert.equal(s.publicNeedsGenerated,1);
 const first=publicProjectOffers(s, NOW+900000).needs;
 assert.equal(first.pending,1);
 assert.equal(first.name,PUBLIC_NEED_TYPES[0].name);
 assert.ok(first.available);
 assert.equal(generatePublicNeed(s,NOW+901000),false);
 assert.equal(s.publicNeedsPending,1);
});
test('unfunded needs strain the public treasury and allow some additional corruption',()=>{
 const s=build();
 const taxes=getBusinessEconomy(s).taxesCollectedPerSecond;
 const corruption=corruptionPerMinute(s);
 s.publicNeedsPending=2;
 close(getBusinessEconomy(s).taxesCollectedPerSecond,taxes*.92);
 close(corruptionPerMinute(s),corruption+.12);
 const cash=s.cash,spent=s.publicSpent;
 const offer=publicProjectOffers(s).needs;
 assert.equal(spendPublicBudget(s,'needs').ok,true);
 assert.equal(s.publicNeedsPending,1);
 assert.equal(s.publicNeedsResolved,1);
 assert.equal(s.cash,cash);
 close(s.publicSpent,spent+offer.cost);
 close(getBusinessEconomy(s).taxesCollectedPerSecond,taxes*.96);
 assert.equal(publicProjectOffers(s).needs.name,PUBLIC_NEED_TYPES[1].name);
});
test('a maximum of three requests can wait; progress is needed for additional requests',()=>{
 const s=build();s.automaticSeconds=1800;
 assert.equal(generatePublicNeed(s,NOW),true);
 assert.equal(generatePublicNeed(s,NOW+PUBLIC_NEED_COOLDOWN_MS),false);
 for(let i=0;i<2;i++){
  s.owned.matches+=12;
  assert.equal(generatePublicNeed(s,NOW+(i+1)*PUBLIC_NEED_COOLDOWN_MS),true);
 }
 assert.equal(s.publicNeedsPending,3);
 s.owned.matches+=200;
 assert.equal(generatePublicNeed(s,NOW+4*PUBLIC_NEED_COOLDOWN_MS),false);
 assert.equal(s.publicNeedsPending,3);
});
test('existing saves start at current development level without spawning retroactive demands',()=>{
 const s=build();s.automaticSeconds=10800;
 const saved=exportState(s,NOW);
 for(const key of ['publicNeedsPending','publicNeedsGenerated','publicNeedsResolved','publicNeedNextScore','publicNeedLastAt'])delete saved[key];
 const loaded=hydrateState(saved,NOW);
 assert.equal(loaded.publicNeedsPending,0);
 assert.equal(loaded.publicNeedNextScore,getPublicNeedScore(loaded)+1);
 assert.equal(generatePublicNeed(loaded,NOW+PUBLIC_NEED_COOLDOWN_MS),false);
 const restored=hydrateState(exportState(loaded,NOW),NOW);
 assert.equal(restored.publicNeedsPending,0);
 assert.equal(restored.publicNeedNextScore,loaded.publicNeedNextScore);
});
test('need purchases are refused when there is no request or insufficient budget',()=>{
 const s=build();
 assert.equal(spendPublicBudget(s,'needs').reason,'locked');
 s.publicNeedsPending=1;s.publicBudget=0;
 const prior=s.publicSpent;
 assert.equal(spendPublicBudget(s,'needs').reason,'funds');
 assert.equal(s.publicNeedsPending,1);
 assert.equal(s.publicSpent,prior);
});
test('new needs card stays hidden until required and uses real public budget actions',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.match(html,/id="public-needs-card" hidden/);
 assert.match(html,/id="public-project-needs"/);
 assert.match(app,/public-needs-card/);
 assert.match(app,/publicNeedsCreated/);
 assert.match(css,/\.public-project\[hidden\]/);
});
