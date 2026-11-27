import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,createState as blankState,exportState,hydrateState,getCommunismPerMinute} from '../web/runtime-anthem-v15/engine.js';
import {
 COUNTRIES,createWorld,chooseCountry,getCooperation,getVisibleCountries,
 rankCountriesByCooperationCost,getAnthemReward,rewardAnthem,
} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const start=()=>{const w=createWorld();assert.equal(chooseCountry(w,'0').ok,true);return w;};
const state=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=1000;s.cash=1e10;return s;};
test('anthem grants at least 2 communism, then 2.5x when passive production exceeds 0.8/min',()=>{
 const s=state();
 assert.equal(getCommunismPerMinute(s),0);
 assert.equal(getAnthemReward(s),2);
 s.owned.matches=16;
 assert.equal(getCommunismPerMinute(s),.16);
 assert.equal(getAnthemReward(s),2);
 s.owned.matches=80;
 assert.equal(getCommunismPerMinute(s),.8);
 assert.equal(getAnthemReward(s),2);
 s.owned.matches=81;
 assert.equal(getAnthemReward(s),2.025);
 s.owned.matches=800;
 assert.equal(getCommunismPerMinute(s),8);
 assert.equal(getAnthemReward(s),20);
 s.propagandaAgencies=2;
 assert.equal(getCommunismPerMinute(s),8.1);
 assert.equal(getAnthemReward(s),20.25);
});
test('full listening pays exactly the computed fractional reward and remains repeatable',()=>{
 const s=state(),w=start();
 s.owned.matches=20;
 const before=s.communism;
 assert.equal(getAnthemReward(s),2);
 assert.deepEqual(rewardAnthem(w,s),{ok:true,points:2});
 assert.equal(s.communism,before+2);
 assert.deepEqual(rewardAnthem(w,s),{ok:true,points:.5});
 assert.equal(s.communism,before+4);
 assert.equal(rewardAnthem(createWorld(),s).ok,false);
 assert.equal(s.communism,before+1);
});
test('anthem reward follows saved existing industries and cannot mutate state while only quoted',()=>{
 const s=state();s.owned.matches=800;
 const loaded=hydrateState(exportState(s,NOW),NOW);
 assert.equal(getAnthemReward(loaded),20);
 const previous=loaded.communism;
 getAnthemReward(loaded);
 assert.equal(loaded.communism,previous);
});
test('currently available countries sort strictly by actual cooperation price, without changing waves',()=>{
 const w=start(),s=state();
 const visible=getVisibleCountries(w);
 assert.equal(visible.length,30);
 const before=visible.map(c=>c.id);
 const ranked=rankCountriesByCooperationCost(w,s,visible);
 assert.equal(ranked.length,30);
 assert.deepEqual(new Set(ranked.map(c=>c.id)),new Set(before));
 const costs=ranked.map(c=>getCooperation(w,s,c.id).cost);
 assert.deepEqual(costs,[...costs].sort((a,b)=>a-b));
 assert.deepEqual(getVisibleCountries(w).map(c=>c.id),before);
 // The financial solidarity discount affects the price used in sorting.
 s.internationalAidLevel=4;
 const discounted=rankCountriesByCooperationCost(w,s,visible);
 const discountedCosts=discounted.map(c=>getCooperation(w,s,c.id).cost);
 assert.deepEqual(discountedCosts,[...discountedCosts].sort((a,b)=>a-b));
});
test('USA retains its final-wave lock even when sorting by cost',()=>{
 const w=start(),s=state();
 const ranked=rankCountriesByCooperationCost(w,s,COUNTRIES);
 assert.equal(ranked.at(-1).name,'États-Unis');
 assert.equal(getVisibleCountries(w).some(c=>c.name==='États-Unis'),false);
});
test('active web page uses sharp art, live reward and origin-first cooperation cost ordering',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 const image=readFileSync(new URL('../web/assets/anthem-globe-traced.svg',import.meta.url),'utf8');
 assert.match(html,/assets\/anthem-globe-traced\.svg/);
 assert.match(html,/runtime-anthem-v15\/app\.js/);
 assert.match(app,/getAnthemReward\(state\)/);
 assert.match(app,/rankCountriesByCooperationCost\(world,state/);
 assert.match(app,/originCountry\?\[originCountry,\.\.\.otherCountries\]/);
 assert.match(css,/conic-gradient/);
 assert.match(image,/<svg/);
 assert.ok(image.length>1000);
});
