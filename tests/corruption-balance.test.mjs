import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,corruptionPerMinute,
 publicProjectOffers,spendPublicBudget,
} from '../web/runtime-anthem-v15/engine.js';
import {getUSImportOffer,getBureaucracyOffer,getBilateralOffer,createWorld,chooseCountry} from '../web/runtime-anthem-v15/world.js';
const fresh=()=>{const s=createState(1700000000000);s.worldEconomyEnabled=true;s.publicBudget=1e7;return s;};
const close=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-8,`${value} != ${expected}`);
test('ordinary shops steadily accrue structural corruption, even when legally operated',()=>{
 const state=fresh();
 close(corruptionPerMinute(state),0);
 state.owned.matches=16;
 close(corruptionPerMinute(state),.96);
 state.owned.gum=2;
 close(corruptionPerMinute(state),1.28);
});
test('sensitive contracts add appreciable corruption but never repeat purchase penalties each minute',()=>{
 const state=fresh();
 state.importsOwned=1;state.bureaucracyOffices=1;state.propagandaAgencies=1;state.bilateralAgreements=1;
 close(corruptionPerMinute(state),.15+.09+.12+.10);
 assert.equal(getUSImportOffer(createWorld(),state).corruptionPerMinute,.15);
 assert.equal(getBureaucracyOffer(state).corruptionPerMinute,.09);
});
test('the public audit costs rise with repeated interventions and cannot generate money',()=>{
 const state=fresh();state.cash=1000;state.corruption=30;
 let offer=publicProjectOffers(state).audit;
 assert.ok(offer.available);
 assert.ok(spendPublicBudget(state,'audit').ok);
 close(state.corruption,21);
 assert.equal(state.corruptionAudits,1);
 assert.equal(state.cash,1000);
 assert.ok(publicProjectOffers(state).audit.cost>offer.cost);
});
test('old saves keep holdings and acquire safe defaults for audit history',()=>{
 const state=fresh();state.owned.matches=4;
 const saved=exportState(state,1700000000000);
 delete saved.corruptionAudits;
 const loaded=hydrateState(saved,1700000000000);
 assert.equal(loaded.corruptionAudits,0);
 assert.equal(loaded.owned.matches,4);
 close(corruptionPerMinute(loaded),.24);
});
