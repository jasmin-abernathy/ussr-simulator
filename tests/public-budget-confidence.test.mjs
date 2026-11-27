import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,buyActivity,getStats,advance,exportState,hydrateState,getBusinessEconomy,
 publicProjectOffers,spendPublicBudget,getCommunismPerMinute} from '../web/engine.js';
import {createWorld,chooseCountry,getCooperation,cooperate} from '../web/world.js';
const NOW=1700000000000;
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
const world=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=1e7;s.communism=5000;return s;};
test('chewing gum adds exactly +2 corruption when purchased, never recurring',()=>{
 const s=world();
 assert.equal(buyActivity(s,'matches').ok,true);assert.equal(s.corruption,0);
 assert.equal(buyActivity(s,'gum',2).ok,true);assert.equal(s.corruption,4);
 const rate=getCommunismPerMinute(s);
 advance(s,NOW+60000);
 close(s.corruption,4);
 assert.equal(getCommunismPerMinute(s),rate);
});
test('taxes go exclusively into public budget and dividends to ordinary cash',()=>{
 const s=world();buyActivity(s,'matches');
 const beginning=s.cash,fin=getBusinessEconomy(s);
 close(fin.taxesCollectedPerSecond,.05);close(fin.netToTreasuryPerSecond,.345);
 const r=advance(s,NOW+1000);
 close(s.cash-beginning,fin.dividendsPerSecond);
 close(s.publicBudget,fin.taxesCollectedPerSecond);
 close(s.publicTaxesCollected,s.publicBudget);
 close(r.earned,fin.netToTreasuryPerSecond);close(r.taxesEarned,fin.taxesCollectedPerSecond);
});
test('services are financed by public budget, never ordinary cash, and improve collection',()=>{
 const s=world();buyActivity(s,'matches');
 const baseline=getBusinessEconomy(s).taxesCollectedPerSecond;
 s.publicBudget=100;const oldCash=s.cash;
 const r=spendPublicBudget(s,'services');
 assert.equal(r.ok,true);assert.equal(r.spent,25);
 close(s.publicBudget,75);close(s.cash,oldCash);
 assert.equal(s.publicServicesLevel,1);assert.ok(getBusinessEconomy(s).taxesCollectedPerSecond>baseline);
 assert.equal(publicProjectOffers(s).services.cost,40);
});
test('international fiscal solidarity decreases future cooperation cash cost, not threshold',()=>{
 const s=world(),w=createWorld();chooseCountry(w,'0');
 const first=getCooperation(w,s,'1');
 s.publicBudget=300;const cash=s.cash;
 assert.equal(spendPublicBudget(s,'solidarity').ok,true);
 const next=getCooperation(w,s,'1');
 assert.equal(next.threshold,first.threshold);assert.ok(next.cost<first.cost);
 assert.equal(s.internationalAidLevel,1);close(s.cash,cash);
});
test('cooperation requires at least 85% confidence in communism versus corruption',()=>{
 const s=world(),w=createWorld();chooseCountry(w,'0');
 const id='1';const first=getCooperation(w,s,id);
 s.cash=first.cost+1000;s.communism=first.threshold;
 s.corruption=300;
 assert.ok(getCooperation(w,s,id).confidence<.85);
 assert.equal(cooperate(w,s,id).reason,'corruption');
 assert.equal(getCooperation(w,s,id).available,false);
 s.corruption=10;
 assert.equal(getCooperation(w,s,id).confidenceOk,true);
 assert.equal(cooperate(w,s,id).ok,true);
 assert.equal(w.partners.includes(id),true);
});
test('a crisis arrives every 15 active minutes and limits collected taxes until funded',()=>{
 const s=world();buyActivity(s,'matches');
 advance(s,NOW+900000);
 assert.equal(s.crisesPending,1);assert.equal(s.crisesGenerated,1);
 assert.equal(s.corruption,1);
 const taxWithCrisis=getBusinessEconomy(s).taxesCollectedPerSecond;
 s.publicBudget=500;
 const cash=s.cash;
 const fixed=spendPublicBudget(s,'crisis');
 assert.equal(fixed.ok,true);
 assert.equal(s.crisesPending,0);assert.equal(s.corruption,0);
 assert.ok(getBusinessEconomy(s).taxesCollectedPerSecond>taxWithCrisis);
 close(s.cash,cash);
 assert.equal(spendPublicBudget(s,'crisis').reason,'locked');
});
test('crisis ticks and tax income are consistent for 30 minutes at once or in pieces',()=>{
 const first=world();buyActivity(first,'matches');
 const second=hydrateState(exportState(first,NOW),NOW);
 advance(first,NOW+1800000);
 for(let t=1000;t<=1800000;t+=1000)advance(second,NOW+t);
 close(first.cash,second.cash,1e-5);
 close(first.publicBudget,second.publicBudget,1e-6);
 close(first.corruption,second.corruption);
 assert.equal(first.crisesPending,2);
 assert.equal(second.crisesPending,2);
});
test('legacy saves keep all pre-update cash, owned factories, and existing country alliances',()=>{
 const s=world();buyActivity(s,'matches');
 const before=exportState(s,NOW);
 for(const key of ['publicBudget','publicTaxesCollected','publicSpent','publicServicesLevel','internationalAidLevel','crisesPending','crisesGenerated','crisisRemainderMs'])delete before[key];
 const restored=hydrateState(before,NOW);
 assert.equal(restored.cash,s.cash);assert.equal(restored.publicBudget,0);
 assert.equal(restored.publicServicesLevel,0);assert.equal(restored.crisesPending,0);
 assert.equal(restored.owned.matches,1);
 const r=advance(restored,NOW+1000);
 assert.ok(r.taxesEarned>0);
});
test('public budget survives save and cannot be spent from nonworld economy or on unknown projects',()=>{
 const s=world();s.publicBudget=200;
 spendPublicBudget(s,'services');spendPublicBudget(s,'solidarity');
 const restored=hydrateState(exportState(s,NOW),NOW);
 close(restored.publicBudget,s.publicBudget);
 close(restored.publicSpent,65);
 assert.equal(restored.publicServicesLevel,1);assert.equal(restored.internationalAidLevel,1);
 assert.equal(spendPublicBudget(restored,'invalid').reason,'invalid-project');
 restored.worldEconomyEnabled=false;
 assert.equal(spendPublicBudget(restored,'services').reason,'unavailable');
});
test('capped offline duration credits public budget at most 8 hours, never twice',()=>{
 const s=world();buyActivity(s,'matches');
 const r=advance(s,NOW+10*3600000);
 assert.equal(r.capped,true);assert.equal(s.crisesPending,3);
 const cash=s.cash,budget=s.publicBudget;
 advance(s,NOW+10*3600000);
 close(s.cash,cash);close(s.publicBudget,budget);
});
