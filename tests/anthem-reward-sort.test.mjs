import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,createState as blankState,exportState,hydrateState,getCommunismPerMinute} from '../web/engine.js';
import {
 COUNTRIES,createWorld,chooseCountry,getCooperation,getVisibleCountries,
 rankCountriesByCooperationCost,getAnthemReward,rewardAnthem,
} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const start=()=>{const w=createWorld();assert.equal(chooseCountry(w,'0').ok,true);return w;};
const state=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=1000;s.cash=1e10;return s;};
test('anthem begins at three and increases as the automatic communism/minute rate exceeds three',()=>{
 const s=state();
 assert.equal(getCommunismPerMinute(s),0);
 assert.equal(getAnthemReward(s),3);
 s.owned.matches=3;
 assert.equal(getAnthemReward(s),3);
 s.owned.matches=4;
 assert.equal(getAnthemReward(s),4);
 s.owned.matches=12;
 assert.equal(getAnthemReward(s),12);
 s.propagandaAgencies=2;
 assert.equal(getCommunismPerMinute(s),16);
 assert.equal(getAnthemReward(s),16);
});
test('full listening earns exactly the displayed scaled reward, repeatable; absent origin earns nothing',()=>{
 const s=state(),w=start();
 s.owned.matches=8;
 const before=s.communism;
 assert.deepEqual(rewardAnthem(w,s),{ok:true,points:8});
 assert.equal(s.communism,before+8);
 assert.deepEqual(rewardAnthem(w,s),{ok:true,points:8});
 assert.equal(s.communism,before+16);
 assert.equal(rewardAnthem(createWorld(),s).ok,false);
 assert.equal(s.communism,before+16);
});
test('anthem reward follows saved existing industries and cannot mutate state while only quoted',()=>{
 const s=state();s.owned.matches=13;
 const loaded=hydrateState(exportState(s,NOW),NOW);
 assert.equal(getAnthemReward(loaded),13);
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
test('active web page uses approved image, variable reward and cooperation cost ordering',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 const image=readFileSync(new URL('../web/assets/anthem-approved.webp',import.meta.url));
 assert.match(html,/assets\/anthem-approved\.webp/);
 assert.match(html,/runtime-anthem-v15\/app\.js/);
 assert.match(app,/getAnthemReward\(state\)/);
 assert.match(app,/rankCountriesByCooperationCost\(world,state/);
 assert.match(css,/conic-gradient/);
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.ok(image.length>4000);
});
