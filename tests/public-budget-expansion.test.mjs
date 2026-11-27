import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 createState,hydrateState,exportState,getStats,getBusinessEconomy,publicProjectOffers,
 spendPublicBudget,
} from '../web/runtime-anthem-v15/engine.js';
const fresh=()=>{
 const state=createState(1700000000000);
 state.worldEconomyEnabled=true;
 state.publicBudget=100000;
 state.owned.matches=20;
 return state;
};
test('new public projects can be purchased and spending never touches private cash',()=>{
 const state=fresh();
 state.cash=5000;
 const before=getBusinessEconomy(state).businessIncomePerSecond;
 assert.ok(publicProjectOffers(state).transport.available);
 assert.ok(spendPublicBudget(state,'transport').ok);
 assert.equal(state.publicTransportLevel,1);
 assert.equal(state.cash,5000);
 assert.ok(getBusinessEconomy(state).businessIncomePerSecond>before);
 assert.ok(spendPublicBudget(state,'housing').ok);
 assert.equal(state.publicHousingLevel,1);
});
test('public housing protects part of the tax collection during crises',()=>{
 const state=fresh();
 state.crisesPending=2;
 const before=getBusinessEconomy(state).taxesCollectedPerSecond;
 spendPublicBudget(state,'housing');
 const after=getBusinessEconomy(state).taxesCollectedPerSecond;
 assert.ok(after>before);
 assert.ok(after<getBusinessEconomy({...state,crisesPending:0}).taxesCollectedPerSecond);
});
test('audits and maintenance offer repeatable budget decisions with sensible locks',()=>{
 const state=fresh();
 state.corruption=12;
 state.taxSteps=4500;
 state.productionSteps=3000;
 assert.ok(spendPublicBudget(state,'audit').ok);
 assert.equal(state.corruption,7);
 assert.ok(spendPublicBudget(state,'audit').ok);
 assert.equal(state.corruption,2);
 assert.ok(spendPublicBudget(state,'maintenance').ok);
 assert.equal(state.taxSteps,3000);
 assert.equal(state.productionSteps,2250);
 assert.equal(spendPublicBudget(state,'unknown').ok,false);
 assert.equal(spendPublicBudget(state,'audit').ok,true);
 assert.equal(state.corruption,0);
 assert.equal(publicProjectOffers(state).audit.locked,true);
});
test('previous saves recover with zero additional public-project levels',()=>{
 const state=fresh();
 const old=exportState(state,1700000000000);
 delete old.publicTransportLevel;
 delete old.publicHousingLevel;
 const restored=hydrateState(old,1700000000000);
 assert.equal(restored.publicTransportLevel,0);
 assert.equal(restored.publicHousingLevel,0);
 assert.ok(getStats(restored).publicProjects.transport);
});
test('mobile navigation uses five matching vector pictograms and no mixed emoji tabs',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const nav=html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((nav.match(/data-screen=/g)||[]).length,5);
 assert.equal((nav.match(/<svg aria-hidden="true" viewBox=/g)||[]).length,5);
 assert.match(nav,/data-screen="public"/);
 assert.match(nav,/viewBox="0 0 24 24"/);
 assert.doesNotMatch(nav,/<use href=/);
 assert.doesNotMatch(nav,/🏛/);
});
