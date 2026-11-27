import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,buyActivity,clickProduce,advance,hydrateState,exportState,getStats,getBusinessEconomy,activityBusinessRate,setTaxPolicy,getBusinessEconomyForPolicy,BUSINESS_REBALANCE} from '../web/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('matches factory pays every second, at a quarter of previous per-minute earnings',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=300;
 assert.equal(buyActivity(s,'matches').ok,true);const start=s.cash;
 assert.equal(BUSINESS_REBALANCE,0.25);
 const business=getBusinessEconomy(s);
 close(business.grossPerSecond,.625);
 close(business.netToTreasuryPerSecond,.395);
 assert.equal(getStats(s).productionPerClick,10.16);
 clickProduce(s);close(s.cash,start+10.16);
 advance(s,NOW+999);close(s.cash,start+10.16);
 advance(s,NOW+1000);close(s.cash,start+10.16+business.netToTreasuryPerSecond);
 advance(s,NOW+60000);close(s.cash,start+10.16+60*business.netToTreasuryPerSecond);
});
test('rates still vary by sector and policies change the per-second income',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=10000;s.communism=5000;
 buyActivity(s,'matches');buyActivity(s,'beer');
 const baseline=getBusinessEconomy(s);
 assert.equal(activityBusinessRate(s,'matches').taxRate,8);
 assert.equal(activityBusinessRate(s,'beer').taxRate,22);
 assert.equal(setTaxPolicy(s,'social'),true);
 assert.ok(getBusinessEconomy(s).netToTreasuryPerSecond<baseline.netToTreasuryPerSecond);
 assert.equal(setTaxPolicy(s,'solidarity'),true);
 assert.ok(getBusinessEconomy(s).netToTreasuryPerSecond>baseline.netToTreasuryPerSecond);
 assert.equal(setTaxPolicy(s,'invalid'),false);
});
test('save, browser resume, offline ticks and repeated calls never double-credit a second',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');s.cash=0;
 const rate=getBusinessEconomy(s).netToTreasuryPerSecond;
 advance(s,NOW+400);close(s.cash,0);
 const save=exportState(s,NOW+450);
 const resumed=hydrateState(save,NOW+570);close(resumed.cash,0);
 advance(resumed,NOW+1000);close(resumed.cash,rate);
 advance(resumed,NOW+1000);close(resumed.cash,rate);
 advance(resumed,NOW+3000);close(resumed.cash,rate*3);
});
test('migration from minute saves does not grant 59 seconds of backdated income',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');s.cash=0;
 const old=exportState(s,NOW);
 delete old.economyTickMode;delete old.secondRemainderMs;old.minuteRemainderMs=59000;
 const restored=hydrateState(old,NOW);
 close(restored.cash,0);
 advance(restored,NOW+999);close(restored.cash,0);
 advance(restored,NOW+1000);close(restored.cash,getBusinessEconomy(restored).netToTreasuryPerSecond);
});
test('corruption reduces taxes rather than deleting legitimate dividends',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');s.cash=0;
 const dirty=structuredClone(s);dirty.corruption=250;
 advance(s,NOW+1000);advance(dirty,NOW+1000);
 assert.ok(s.cash>dirty.cash);assert.ok(dirty.cash>0);
});
test('forecast remains immediate and does not modify the chosen tax policy',()=>{
 const s=createState(NOW);s.cash=500;s.worldEconomyEnabled=false;buyActivity(s,'matches');
 close(getBusinessEconomy(s).grossPerSecond,.625);
 s.worldEconomyEnabled=true;close(getStats(s).business.netToTreasuryPerSecond,.395);
 assert.equal(getStats(s).productionPerClick,10.16);
 close(getBusinessEconomyForPolicy(s,'balanced').taxesPerSecond,.05);
 assert.ok(getBusinessEconomyForPolicy(s,'social').netToTreasuryPerSecond<
 getBusinessEconomyForPolicy(s,'solidarity').netToTreasuryPerSecond);
 assert.equal(s.taxPolicy,'balanced');
});
