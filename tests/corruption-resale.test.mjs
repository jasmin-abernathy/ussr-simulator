import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,buyActivity,advance,getStats,exportState,hydrateState,
 quoteActivityConversion,convertActivity,CONVERSION_TRADE_IN_RATE,CONVERSION_TARGETS,CORRUPTION_PURCHASE,PASSIVE_CORRUPTION_RATIO,
 getActivityCorruptionRate,getPropagandaOffer,buyPropagandaAgency,
 getCommunismPerMinute,getBusinessEconomy,spendPublicBudget} from '../web/engine.js';
import {createWorld,chooseCountry,buyUSImports,convertUSImports,getUSImportOffer,
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
test('reconversion consumes one risky shop and produces a cooperative workshop with no cash payout',()=>{
 const s=world();buyActivity(s,'gum',2);
 const previous=s.corruption,oldRate=getBusinessEconomy(s).businessIncomePerSecond;
 const offer=quoteActivityConversion(s,'gum','matches');
 assert.equal(offer.ok,true);assert.equal(CONVERSION_TRADE_IN_RATE,.4);
 assert.ok(offer.tradeInValue>0);
 close(offer.cost,Math.max(0,Math.round((offer.targetPrice-offer.tradeInValue)*100)/100));
 const oldCash=s.cash;const converted=convertActivity(s,'gum','matches');
 assert.equal(converted.ok,true);close(s.cash,oldCash-converted.cost);
 assert.equal(s.owned.gum,1);assert.equal(s.owned.matches,1);
 close(s.corruption,previous);
 close(getStats(s).corruptionPerMinute,.02);
 assert.notEqual(getBusinessEconomy(s).businessIncomePerSecond,oldRate);
 advance(s,NOW+60000);close(s.corruption,previous+.02);
 assert.equal(convertActivity(s,'gum','matches').ok,true);
 assert.equal(s.owned.gum,0);assert.equal(s.owned.matches,2);
 assert.equal(convertActivity(s,'gum','matches').reason,'not-owned');
 close(getStats(s).corruptionPerMinute,0);
});
test('reconversion charges the difference for an expensive new structure and nothing if trade-in covers its cost',()=>{
 const s=world();buyActivity(s,'gum');
 const pr=quoteActivityConversion(s,'gum','grocery');
 assert.equal(pr.ok,true);assert.ok(pr.cost>0);
 close(pr.cost,pr.targetPrice-pr.tradeInValue);
 const cash=s.cash;assert.equal(convertActivity(s,'gum','grocery').ok,true);
 close(s.cash,cash-pr.cost);
 const w=createWorld();chooseCountry(w,'0');
 assert.equal(buyUSImports(w,s).ok,true);
 const free=quoteActivityConversion(s,'us-imports','soda');
 assert.equal(free.ok,true);assert.equal(free.cost,0);
 assert.ok(free.tradeInValue>free.targetPrice);
 const before=s.cash;const result=convertUSImports(w,s,'soda',convertActivity);
 assert.equal(result.ok,true);close(s.cash,before);
 assert.equal(s.importsOwned,0);assert.equal(w.usImports,0);assert.equal(s.owned.soda,1);
});
test('no general resale or refunds: only risky shops can be reconverted to valid targets',()=>{
 const s=world();buyActivity(s,'matches');const oldCash=s.cash;
 assert.equal(convertActivity(s,'matches','gum').reason,'not-convertible');
 assert.equal(convertActivity(s,'invalid','matches').reason,'not-convertible');
 assert.equal(convertActivity(s,'gum','gum').reason,'invalid-target');
 close(s.cash,oldCash);
 assert.equal(Object.hasOwn(CONVERSION_TARGETS,'matches'),false);
});
test('insufficient funds and locked destinations never destroy the original shop',()=>{
 const s=world();s.communism=2;buyActivity(s,'gum');
 assert.equal(quoteActivityConversion(s,'gum','grocery').reason,'locked');
 s.communism=5000;s.cash=0;
 const quote=quoteActivityConversion(s,'gum','grocery');
 assert.equal(quote.ok,true);assert.equal(quote.available,false);
 assert.equal(convertActivity(s,'gum','grocery').reason,'funds');
 assert.equal(s.owned.gum,1);assert.equal(s.owned.grocery,0);
 close(s.cash,0);
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
test('American import establishments transform without refunds, and bilateral deals retain their own passive corruption',()=>{
 const s=world(),w=createWorld();chooseCountry(w,'0');
 assert.equal(buyUSImports(w,s).ok,true);close(s.corruption,5);
 close(getStats(s).corruptionPerMinute,.05);
 const original=s.cash;
 const conversion=convertUSImports(w,s,'matches',convertActivity);
 assert.equal(conversion.ok,true);
 assert.equal(conversion.cost,0);
 close(s.cash,original);
 assert.equal(w.usImports,0);assert.equal(s.importsOwned,0);assert.equal(s.owned.matches,1);
 close(s.corruption,5);close(getStats(s).corruptionPerMinute,0);
 assert.equal(convertUSImports(w,s,'matches',convertActivity).reason,'not-owned');
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
test('UI labels explicit dubious actions and commerce transformation',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-conversion-v14/app.js',import.meta.url),'utf8');
 assert.match(html,/Corrompre 5 agents publics/);
 assert.match(html,/Acheter une agence de propagande/);
 assert.match(html,/id="import-convert"/);
 assert.match(app,/activity-convert-button/);
 assert.match(app,/convertActivity\(state,definition\.id,targetId\)/);
 assert.match(app,/buyPropagandaAgency\(state\)/);
});
