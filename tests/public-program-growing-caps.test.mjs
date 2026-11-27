import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,getPublicProgramCaps,publicProjectOffers,
 spendPublicBudget,getBusinessEconomy,getPublicNeedScore,
} from '../web/runtime-anthem-v15/engine.js';
import {createWorld,chooseCountry,getCooperation} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const fresh=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.publicBudget=1e10;s.cash=1e10;return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('original project ceilings remain initially, then lift with economic milestones',()=>{
 const s=fresh();
 assert.deepEqual(getPublicProgramCaps(s),{services:10,solidarity:8,transport:12,housing:10});
 s.publicServicesLevel=10;s.internationalAidLevel=8;s.publicTransportLevel=12;s.publicHousingLevel=10;
 for(const id of ['services','solidarity','transport','housing'])assert.equal(publicProjectOffers(s)[id].locked,true);
 s.owned.matches=72;
 assert.ok(getPublicNeedScore(s)>=5);
 const caps=getPublicProgramCaps(s);
 assert.ok(caps.services>10);
 assert.ok(caps.solidarity>8);
 assert.ok(caps.transport>12);
 assert.ok(caps.housing>10);
 for(const id of ['services','solidarity','transport','housing'])assert.equal(publicProjectOffers(s)[id].locked,false);
});
test('reopened levels can be funded and advanced bonuses continue with diminishing returns',()=>{
 const s=fresh();s.owned.matches=150;
 s.publicServicesLevel=10;s.internationalAidLevel=8;s.publicTransportLevel=12;s.publicHousingLevel=10;
 s.crisesPending=2;
 const before=getBusinessEconomy(s);
 const budget=s.publicBudget;
 for(const id of ['services','solidarity','transport','housing'])assert.equal(spendPublicBudget(s,id).ok,true,id);
 assert.equal(s.publicServicesLevel,11);
 assert.equal(s.internationalAidLevel,9);
 assert.equal(s.publicTransportLevel,13);
 assert.equal(s.publicHousingLevel,11);
 assert.ok(s.publicBudget<budget);
 const after=getBusinessEconomy(s);
 assert.ok(after.taxesCollectedPerSecond>before.taxesCollectedPerSecond);
 assert.ok(after.businessIncomePerSecond>before.businessIncomePerSecond);
});
test('hard upper bounds, existing owned levels and save restoration remain safe',()=>{
 const s=fresh();s.owned.matches=500;s.automaticSeconds=864000;
 assert.deepEqual(getPublicProgramCaps(s),{services:16,solidarity:11,transport:18,housing:16});
 for(const [key,level] of [['publicServicesLevel',16],['internationalAidLevel',11],['publicTransportLevel',18],['publicHousingLevel',16]])s[key]=level;
 const caps=getPublicProgramCaps(s);
 assert.deepEqual(caps,{services:16,solidarity:11,transport:18,housing:16});
 for(const id of Object.keys(caps)){const o=publicProjectOffers(s)[id];assert.equal(o.locked,true);assert.equal(o.fullyDeveloped,true);}
 const restored=hydrateState(exportState(s,NOW),NOW);
 for(const key of ['publicServicesLevel','internationalAidLevel','publicTransportLevel','publicHousingLevel'])assert.equal(restored[key],s[key]);
 s.owned.matches=0;s.automaticSeconds=0;
 for(const id of Object.keys(caps))assert.equal(getPublicProgramCaps(s)[id],caps[id]);
});
test('baseline economic effects remain unchanged through the original 10 or 8 levels',()=>{
 const s=fresh();s.owned.matches=20;s.crisesPending=2;
 const base=getBusinessEconomy(s);
 s.publicServicesLevel=10;s.publicHousingLevel=10;s.publicTransportLevel=12;
 const developed=getBusinessEconomy(s);
 assert.ok(developed.taxesCollectedPerSecond>base.taxesCollectedPerSecond);
 assert.ok(developed.businessIncomePerSecond>base.businessIncomePerSecond);
 close(developed.businessIncomePerSecond,base.businessIncomePerSecond*1.18);
});
