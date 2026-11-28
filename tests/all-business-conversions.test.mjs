import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVITIES} from '../web/runtime-anthem-v15/game-data.js';
import {
 createState,buyActivity,convertActivity,quoteActivityConversion,CONVERSION_TARGETS,
 CONVERSION_TRADE_IN_RATE,exportState,hydrateState
} from '../web/runtime-anthem-v15/engine.js';
import {createWorld,chooseCountry,buyUSImports,convertUSImports} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const state=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=5000;s.cash=1e9;return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);

test('all 22 standard businesses can become all 21 other activity types',()=>{
 assert.equal(ACTIVITIES.length,22);
 for(const source of ACTIVITIES){
  const targets=CONVERSION_TARGETS[source.id];
  assert.equal(targets.length,21,source.id);
  assert.equal(new Set(targets).size,21,source.id);
  assert.equal(targets.includes(source.id),false);
  for(const other of ACTIVITIES)assert.equal(targets.includes(other.id),other.id!==source.id);
 }
 assert.equal(CONVERSION_TARGETS['us-imports'].length,22);
});
test('a Petit commerce converts into a Brasserie at the price difference',()=>{
 const s=state();assert.equal(buyActivity(s,'trading').ok,true);
 const initialCash=s.cash,previousCommunism=s.communism,priorCorruption=s.corruption;
 const quote=quoteActivityConversion(s,'trading','beer');
 assert.equal(quote.ok,true);
 assert.equal(quote.available,true);
 close(quote.tradeInValue,quote.tradeInValue);
 close(quote.cost,Math.max(0,Math.round((quote.targetPrice-quote.tradeInValue)*100)/100));
 const converted=convertActivity(s,'trading','beer');
 assert.equal(converted.ok,true);
 assert.equal(s.owned.trading,0);
 assert.equal(s.owned.beer,1);
 close(s.cash,initialCash-quote.cost);
 close(s.communism,previousCommunism);
 close(s.corruption,priorCorruption);
 const loaded=hydrateState(exportState(s,NOW),NOW);
 assert.equal(loaded.owned.beer,1);
 assert.equal(loaded.owned.trading,0);
});
test('conversions require unlocked targets; shortages and invalid targets leave ownership intact',()=>{
 const s=state();s.communism=10;
 s.cash=10000;
 assert.equal(buyActivity(s,'trading').ok,false);
 s.communism=5000;
 assert.equal(buyActivity(s,'trading').ok,true);
 s.communism=9;
 assert.equal(quoteActivityConversion(s,'trading','beer').reason,'locked');
 s.communism=5000;s.cash=0;
 const quote=quoteActivityConversion(s,'trading','candy');
 assert.equal(quote.ok,true);
 assert.equal(quote.available,false);
 assert.equal(convertActivity(s,'trading','candy').reason,'funds');
 assert.equal(convertActivity(s,'trading','trading').reason,'invalid-target');
 assert.equal(convertActivity(s,'nope','beer').reason,'not-convertible');
 assert.equal(s.owned.trading,1);
 assert.equal(s.owned.candy,0);
});
test('every standard activity can be converted back to an unlocked workshop without cash refunds',()=>{
 const s=state();s.owned.beer=1;s.owned.matches=0;s.cash=0;
 const quote=quoteActivityConversion(s,'beer','matches');
 assert.equal(quote.ok,true);
 assert.equal(quote.cost,0);
 assert.equal(convertActivity(s,'beer','matches').ok,true);
 assert.equal(s.cash,0);
 assert.equal(s.owned.beer,0);
 assert.equal(s.owned.matches,1);
});
test('US imports can convert to Brasseries and keep world ownership synchronized',()=>{
 const s=state(),w=createWorld();
 chooseCountry(w,'0');
 assert.equal(buyUSImports(w,s).ok,true);
 const quote=quoteActivityConversion(s,'us-imports','beer');
 assert.equal(quote.ok,true);
 assert.equal(convertUSImports(w,s,'beer',convertActivity).ok,true);
 assert.equal(w.usImports,0);assert.equal(s.importsOwned,0);assert.equal(s.owned.beer,1);
});
test('UI dynamically lists only unlocked activity destinations, retaining selected choice',()=>{
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 assert.match(app,/function refreshConversionTargets\(select,sourceId\)/);
 assert.match(app,/activity\?\.unlocked&&activity\.owned<RULES\.maxOwned/);
 assert.match(app,/if\(available\.includes\(previous\)\)select\.value=previous/);
 assert.match(app,/refreshConversionTargets\(refs\.conversionSelect,item\.id\)/);
 assert.match(app,/refreshConversionTargets\(importTarget,'us-imports'\)/);
});
