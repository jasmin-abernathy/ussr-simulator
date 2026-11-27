import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,buyActivity,applyCommunismPenalty,COMMUNISM_PURCHASE_PENALTY,
 buyPropagandaAgency,exportState,hydrateState
} from '../web/runtime-anthem-v15/engine.js';
import {ACTIVITIES} from '../web/runtime-anthem-v15/game-data.js';
import {
 createWorld,chooseCountry,buyBureaucracy,buyBilateralAgreement,buyUSImports,
 getBureaucracyOffer,getBilateralOffer,getUSImportOffer
} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const fresh=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=1e12;s.communism=5000;return s;};
const origin=()=>{const w=createWorld();assert.equal(chooseCountry(w,'0').ok,true);return w;};
test('dubious shops spend communism immediately, ordinary shops do not',()=>{
 const s=fresh();
 for(const id of ['gum','trading','black-market']){
  const before=s.communism;
  const result=buyActivity(s,id);
  assert.equal(result.ok,true,id);
  const effect=ACTIVITIES.find(a=>a.id===id).effects.communism;
  assert.equal(s.communism,before+effect-COMMUNISM_PURCHASE_PENALTY[id]);
 }
 const before=s.communism;
 const result=buyActivity(s,'matches');
 assert.equal(result.ok,true);
 assert.equal(s.communism,before+ACTIVITIES.find(a=>a.id==='matches').effects.communism);
});
test('political compromises spend communism once, never on a rejected purchase',()=>{
 const s=fresh(),w=origin();
 const before=s.communism;
 assert.equal(getUSImportOffer(w,s).communismPenalty,5);
 assert.equal(buyUSImports(w,s).communismLost,5);
 assert.equal(s.communism,before-5);
 assert.equal(getBureaucracyOffer(s).communismPenalty,4);
 assert.equal(buyBureaucracy(s).communismLost,4);
 assert.equal(getBilateralOffer(w,s,'1').communismPenalty,6);
 assert.equal(buyBilateralAgreement(w,s,'1').communismLost,6);
 const already=s.communism;
 assert.equal(buyBilateralAgreement(w,s,'1').ok,false);
 assert.equal(s.communism,already);
 assert.equal(buyPropagandaAgency(s).communismLost,3);
 assert.equal(s.communism,before-18);
});
test('communism loss is capped at available balance and never goes negative',()=>{
 const s=fresh();s.communism=2;
 assert.equal(applyCommunismPenalty(s,6),2);
 assert.equal(s.communism,0);
 assert.equal(applyCommunismPenalty(s,6),0);
 assert.equal(s.communism,0);
});
test('political costs apply only to new actions, and saved amounts are preserved',()=>{
 const s=fresh();
 const previous=s.communism;
 const restored=hydrateState(exportState(s,NOW),NOW);
 assert.equal(restored.communism,previous);
 assert.equal(restored.owned.gum,s.owned.gum);
});
