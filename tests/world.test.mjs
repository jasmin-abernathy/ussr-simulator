import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES,createWorld,hydrateWorld,chooseCountry,getCooperation,cooperate,getWorldStats,celebrate,rewardAnthem,ANTHEM_COOLDOWN_MS } from '../web/world.js';
import {createState} from '../web/engine.js';
test('every one of the 49 countries is a valid starting point',()=>{
  assert.equal(COUNTRIES.length,49);
  for(const c of COUNTRIES){const w=createWorld();assert.equal(chooseCountry(w,c.id).ok,true);assert.equal(chooseCountry(w,c.id).ok,false);}
});
test('cooperation only once, when unlock and cost requirements are met',()=>{
  const w=createWorld(),s=createState(1700000000000);assert.equal(cooperate(w,s,'1').ok,false);
  chooseCountry(w,'0');const offer=getCooperation(w,s,'1');assert.equal(cooperate(w,s,'1').ok,false);
  s.communism=offer.threshold;s.cash=offer.cost;
  assert.equal(cooperate(w,s,'1').ok,true);assert.equal(s.cash,0);assert.equal(s.communism,offer.threshold+offer.communismBonus);
  assert.equal(cooperate(w,s,'1').ok,false);assert.equal(getWorldStats(w).partners,1);
});
test('malformed saves are sanitized and messages occur only once',()=>{
  const w=hydrateWorld({version:1,origin:'0',partners:['0','1','1','bogus'],celebrated:[5,5,999]});
  assert.deepEqual(w.partners,['1']);assert.deepEqual(celebrate(w,100).map(m=>m.threshold),[25,100]);
  assert.equal(celebrate(w,100).length,0);assert.deepEqual(hydrateWorld(w),w);
});

test('anthem grants only on successful play start, rate limited across saved games',()=>{
 const w=createWorld(),s=createState(1700000000000),t=1700000000000;
 assert.equal(rewardAnthem(w,s,t).ok,false);
 chooseCountry(w,'0');
 let result=rewardAnthem(w,s,t);
 assert.equal(result.ok,true);assert.equal(result.points,3);assert.equal(s.communism,3);
 assert.equal(rewardAnthem(w,s,t+1000).reason,'cooldown');
 const restored=hydrateWorld(JSON.parse(JSON.stringify(w)));
 assert.equal(rewardAnthem(restored,s,t+ANTHEM_COOLDOWN_MS-1).ok,false);
 assert.equal(rewardAnthem(restored,s,t+ANTHEM_COOLDOWN_MS).ok,true);
 assert.equal(s.communism,6);
 assert.equal(rewardAnthem(restored,s,t-5000).ok,false);
 assert.equal(rewardAnthem(restored,s,NaN).reason,'invalid-time');
});
