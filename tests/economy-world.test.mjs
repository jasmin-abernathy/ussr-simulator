import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,hydrateState,getStats,buyActivity,advance,reduceInflation,exportState} from '../web/engine.js';
import {createWorld,chooseCountry,getCooperation,cooperate,USA_COUNTRY_ID,COUNTRIES,START_COUNTRIES,getUSImportOffer,buyUSImports} from '../web/world.js';
const NOW=1700000000000;
test('United States cannot be a starting country and is hardest to cooperate with',()=>{
 const w=createWorld(),s=createState(NOW);assert.equal(chooseCountry(w,USA_COUNTRY_ID).ok,false);
 assert.equal(START_COUNTRIES.length,48);assert.equal(chooseCountry(w,'0').ok,true);
 const usa=getCooperation(w,s,USA_COUNTRY_ID);
 for(const c of COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID)){
  const offer=getCooperation(w,s,c.id);assert.ok(usa.cost>offer.cost);assert.ok(usa.threshold>offer.threshold);
 }
});
test('American imports create passive taxes and corruption until USA cooperation',()=>{
 const w=createWorld(),s=createState(NOW);chooseCountry(w,'0');s.cash=1e9;s.communism=1e6;
 s.worldEconomyEnabled=true;
 assert.equal(buyActivity(s,'gum').ok,true);
 assert.equal(getUSImportOffer(w,s).available,true);
 assert.equal(buyUSImports(w,s).ok,true);assert.equal(w.usImports,1);assert.equal(s.importsOwned,1);
 assert.equal(s.corruption,5);assert.ok(getStats(s).business.taxesPerMinute>=60);
 assert.ok(getStats(s).business.grossPerMinute>=5640);
 const cash=s.cash,corruption=s.corruption;advance(s,NOW+60000);
 assert.ok(s.cash>cash);assert.ok(s.corruption>corruption);
 assert.equal(cooperate(w,s,USA_COUNTRY_ID).ok,true);assert.equal(getStats(s).corruptionPerMinute,0);
 const value=s.corruption;assert.equal(buyUSImports(w,s).ok,true);assert.equal(s.corruption,value);
 const saved=exportState(s,NOW+60000),restored=hydrateState(saved,NOW+60000);
 assert.equal(restored.importsOwned,2);assert.equal(restored.usCapitalist,false);assert.equal(restored.corruption,value);
 assert.equal(restored.worldEconomyEnabled,true);
});
test('anticorruption removes points without granting duplicate tax revenue',()=>{
 const s=createState(NOW);s.corruption=12;const cash=s.cash;
 assert.equal(reduceInflation(s).ok,true);assert.equal(s.corruption,7);assert.equal(s.cash,cash);
});
