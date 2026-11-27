import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,buyActivity,advance,getStats,exportState,hydrateState,
 quoteActivitySale,sellActivity,CORRUPTION_PURCHASE,PASSIVE_CORRUPTION_RATIO,
 RESALE_RATE,getActivityCorruptionRate,getPropagandaOffer,buyPropagandaAgency,
 getCommunismPerMinute,getBusinessEconomy,spendPublicBudget} from '../web/engine.js';
import {createWorld,chooseCountry,buyUSImports,sellUSImports,getUSImportOffer,
 buyBureaucracy,getBureaucracyOffer,buyBilateralAgreement,getBilateralOffer} from '../web/world.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,String(a)+' vs '+String(b));
const world=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=1e9;s.communism=5000;return s;};
test('buy penalty recurs at only 1% per minute per active shop',()=>{
 const s=world();buyActivity(s,'gum',3);
 close(s.corruption,6);close(getStats(s).corruptionPerMinute,.06);
 assert.equal(PASSIVE_CORRUPTION_RATIO,.01);assert.equal(CORRUPTION_PURCHASE.gum,2);
 advance(s,NOW+60000);close(s.corruption,6.06);
});
test('resale refunds 40%, stops income and recurring corruption but not existing points',()=>{
 const s=world();buyActivity(s,'gum',2);
 const previous=s.corruption,pre=getBusinessEconomy(s).businessIncomePerSecond;
 const offer=quoteActivitySale(s,'gum');assert.equal(offer.ok,true);
 assert.equal(RESALE_RATE,.4);
 const oldCash=s.cash;const sale=sellActivity(s,'gum');
 assert.equal(sale.ok,true);close(s.cash-oldCash,sale.refunded);close(sale.refunded,offer.refund);
 assert.equal(s.owned.gum,1);close(s.corruption,previous);
 close(getActivityCorruptionRate('gum'),.02);close(getStats(s).corruptionPerMinute,.02);
 assert.ok(getBusinessEconomy(s).businessIncomePerSecond<pre);
 advance(s,NOW+60000);close(s.corruption,previous+.02);
 assert.equal(sellActivity(s,'gum').ok,true);assert.equal(s.owned.gum,0);
 assert.equal(sellActivity(s,'gum').reason,'not-owned');close(getStats(s).corruptionPerMinute,0);
});
test('non risky businesses cannot be sold and invalid actions preserve cash',()=>{
 const s=world();buyActivity(s,'matches');const oldCash=s.cash;
 assert.equal(sellActivity(s,'matches').reason,'not-resellable');
 assert.equal(sellActivity(s,'invalid').reason,'not-resellable');close(s.cash,oldCash);
});
test('three risky shop types use same fraction, legacy gum has no ongoing risk',()=>{
 for(const id of ['gum','trading','black-market']){
  const s=world();buyActivity(s,id);
  close(getStats(s).corruptionPerMinute,CORRUPTION_PURCHASE[id]*.01);
 }
 const old=createState(NOW);old.cash=1500;old.worldEconomyEnabled=false;
 buyActivity(old,'gum');close(old.corruption,0);advance(old,NOW+60000);close(old.corruption,0);
});
test('public services do not corrupt, corrupting five agents does',()=>{
 const s=world();s.publicBudget=100;const old=s.corruption;
 assert.equal(spendPublicBudget(s,'services').ok,true);close(s.corruption,old);
 const offer=getBureaucracyOffer(s);close(offer.corruptionPerMinute,.02);
 assert.equal(buyBureaucracy(s).ok,true);close(s.corruption,2);close(getStats(s).corruptionPerMinute,.02);
});
test('propaganda agencies accrue 1% risk and +2 communism per minute',()=>{
 const s=world();const offer=getPropagandaOffer(s);
 assert.equal(offer.available,true);assert.equal(offer.cost,2500);
 const oldComm=s.communism;assert.equal(buyPropagandaAgency(s).ok,true);
 assert.equal(s.propagandaAgencies,1);close(s.corruption,3);
 close(getCommunismPerMinute(s),2);
 advance(s,NOW+60000);close(s.communism,oldComm+2);close(s.corruption,3.03);
 const loaded=hydrateState(exportState(s,NOW+60000),NOW+60000);
 assert.equal(loaded.propagandaAgencies,1);close(getStats(loaded).corruptionPerMinute,.03);
});
test('imports may be sold and bilateral agreements have 1% ongoing risk',()=>{
 const s=world(),w=createWorld();chooseCountry(w,'0');
 assert.equal(buyUSImports(w,s).ok,true);close(s.corruption,5);
 close(getStats(s).corruptionPerMinute,.05);
 const before=s.cash;const sale=sellUSImports(w,s);assert.equal(sale.ok,true);
 assert.ok(s.cash>before);assert.equal(w.usImports,0);assert.equal(s.importsOwned,0);
 close(s.corruption,5);close(getStats(s).corruptionPerMinute,0);
 assert.equal(sellUSImports(w,s).reason,'not-owned');
 assert.equal(getBilateralOffer(w,s,'1').available,true);
 assert.equal(buyBilateralAgreement(w,s,'1').ok,true);
 close(getStats(s).corruptionPerMinute,.04);
});
test('old saves keep shops and corruption but default to zero agencies',()=>{
 const s=world();buyActivity(s,'gum');const before=exportState(s,NOW);
 delete before.propagandaAgencies;
 const loaded=hydrateState(before,NOW);
 assert.equal(loaded.propagandaAgencies,0);assert.equal(loaded.owned.gum,1);
 close(loaded.corruption,2);close(getStats(loaded).corruptionPerMinute,.02);
});
test('UI labels explicit dubious actions and offers commerce resale',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-risk-v13/app.js',import.meta.url),'utf8');
 assert.match(html,/Corrompre 5 agents publics/);
 assert.match(html,/Acheter une agence de propagande/);
 assert.match(html,/id="import-sell"/);
 assert.match(app,/activity-sell-button/);
 assert.match(app,/sellActivity\(state,definition\.id\)/);
 assert.match(app,/buyPropagandaAgency\(state\)/);
});
