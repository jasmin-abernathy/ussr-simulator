import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES,createWorld,hydrateWorld,chooseCountry,getCooperation,cooperate,getWorldStats,celebrate,rewardAnthem } from '../web/world.js';
import {createState} from '../web/engine.js';
test('every non-US country is a valid starting point',()=>{
  assert.equal(COUNTRIES.length,49);
  for(const c of COUNTRIES.filter(c=>c.name!=='États-Unis')){const w=createWorld();assert.equal(chooseCountry(w,c.id).ok,true);assert.equal(chooseCountry(w,c.id).ok,false);}
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

test('every completed anthem grants 3 communism points without cooldown',()=>{
  const w=createWorld(),s=createState(1700000000000);
  assert.equal(rewardAnthem(w,s).ok,false);
  chooseCountry(w,'0');
  for(let i=0;i<5;i++){
    const result=rewardAnthem(w,s);
    assert.deepEqual(result,{ok:true,points:3});
    assert.equal(s.communism,(i+1)*3);
  }
  assert.deepEqual(hydrateWorld(JSON.parse(JSON.stringify(w))),w);
});
