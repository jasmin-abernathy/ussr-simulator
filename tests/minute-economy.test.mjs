import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,buyActivity,clickProduce,advance,hydrateState,exportState,getStats,getBusinessEconomy,activityBusinessRate,setTaxPolicy,getBusinessEconomyForPolicy} from '../web/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('matches factory starts paying only after one full minute; click remains 10',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=300;
 assert.equal(buyActivity(s,'matches').ok,true);const start=s.cash;
 assert.equal(getStats(s).productionPerClick,10);
 assert.equal(getStats(s).business.grossPerMinute,150);
 clickProduce(s);assert.equal(s.cash,start+10);assert.equal(getStats(s).productionPerClick,10);
 advance(s,NOW+59999);assert.equal(s.cash,start+10);
 advance(s,NOW+60000);
 const economy=getBusinessEconomy(s);close(s.cash,start+10+economy.netToTreasuryPerMinute);
 assert.equal(economy.taxesPerMinute,12);
});
test('taxation depends on sector and policies change real treasury income',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=10000;s.communism=5000;
 buyActivity(s,'matches');buyActivity(s,'beer');
 const baseline=getBusinessEconomy(s);assert.equal(activityBusinessRate(s,'matches').taxRate,8);
 assert.equal(activityBusinessRate(s,'beer').taxRate,22);
 assert.equal(setTaxPolicy(s,'social'),true);const social=getBusinessEconomy(s);
 assert.ok(social.netToTreasuryPerMinute<baseline.netToTreasuryPerMinute);
 assert.equal(setTaxPolicy(s,'solidarity'),true);
 assert.ok(getBusinessEconomy(s).netToTreasuryPerMinute>baseline.netToTreasuryPerMinute);
 assert.equal(setTaxPolicy(s,'invalid'),false);
});
test('time accumulation, reopening and offline earnings never double-credit a minute',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');s.cash=0;
 const rate=getBusinessEconomy(s).netToTreasuryPerMinute;
 advance(s,NOW+40000);assert.equal(s.cash,0);
 const save=exportState(s,NOW+45000);
 const resumed=hydrateState(save,NOW+57000);assert.equal(resumed.cash,0);
 advance(resumed,NOW+60000);close(resumed.cash,rate);
 advance(resumed,NOW+60000);close(resumed.cash,rate);
 advance(resumed,NOW+180000);close(resumed.cash,rate*3);
});
test('minute payout credits taxes and dividends but corruption leaks a portion of taxes',()=>{
 const clean=createState(NOW);clean.worldEconomyEnabled=true;clean.cash=500;buyActivity(clean,'matches');clean.cash=0;
 const dirty=structuredClone(clean);dirty.corruption=250;
 advance(clean,NOW+60000);advance(dirty,NOW+60000);
 assert.ok(clean.cash>dirty.cash);assert.ok(dirty.cash>0);
});

test('forecast is immediate for an existing factory even before the next payout',()=>{
 const s=createState(NOW);s.cash=500;s.worldEconomyEnabled=false;
 buyActivity(s,'matches');
 // Existing saves may still have the legacy economy flag; the dashboard must
 // forecast owned factories without making the player reset their progress.
 assert.equal(getBusinessEconomy(s).grossPerMinute,150);
 s.worldEconomyEnabled=true;
 assert.equal(getStats(s).business.netToTreasuryPerMinute,94.8);
 assert.equal(getStats(s).productionPerClick,10);
 assert.equal(getBusinessEconomyForPolicy(s,'balanced').taxesPerMinute,12);
 assert.ok(getBusinessEconomyForPolicy(s,'social').netToTreasuryPerMinute <
   getBusinessEconomyForPolicy(s,'solidarity').netToTreasuryPerMinute);
 assert.equal(s.taxPolicy,'balanced');
});
