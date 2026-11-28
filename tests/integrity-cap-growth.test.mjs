import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,getIntegrityInstitutionCaps,
 getCorruptionBreakdown,publicProjectOffers,spendPublicBudget,
} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const fresh=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.publicBudget=1e12;return s;};
test('anticorruption buildings reopen in stages as the economy grows',()=>{
 const s=fresh();
 assert.deepEqual(getIntegrityInstitutionCaps(s),{transparency:6,inspectorates:12});
 s.automaticSeconds=8*3600;
 assert.deepEqual(getIntegrityInstitutionCaps(s),{transparency:7,inspectorates:14});
 s.automaticSeconds=14*3600;
 assert.deepEqual(getIntegrityInstitutionCaps(s),{transparency:8,inspectorates:16});
 s.automaticSeconds=20*3600;
 assert.deepEqual(getIntegrityInstitutionCaps(s),{transparency:9,inspectorates:18});
 assert.equal(publicProjectOffers(s).transparency.maxLevel,9);
 assert.equal(publicProjectOffers(s).inspectorates.maxLevel,18);
 for(let i=0;i<9;i++)assert.equal(spendPublicBudget(s,'transparency').ok,true);
 for(let i=0;i<18;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 assert.equal(spendPublicBudget(s,'transparency').reason,'locked');
 assert.equal(spendPublicBudget(s,'inspectorates').reason,'locked');
 const protection=getCorruptionBreakdown(s);
 assert.ok(protection.prevention<1);
 assert.ok(protection.inspectorateReduction<1);
 assert.ok(protection.net>=0);
 const restored=hydrateState(exportState(s,NOW),NOW);
 assert.equal(restored.transparencyHouses,9);
 assert.equal(restored.citizensInspectorates,18);
});
test('existing capped buildings reopen when thresholds are reached and provide smaller extra returns',()=>{
 const s=fresh();
 s.transparencyHouses=6;s.citizensInspectorates=12;
 assert.equal(publicProjectOffers(s).transparency.locked,true);
 assert.equal(publicProjectOffers(s).inspectorates.locked,true);
 s.automaticSeconds=8*3600;
 assert.equal(publicProjectOffers(s).transparency.locked,false);
 assert.equal(publicProjectOffers(s).inspectorates.locked,false);
 assert.equal(spendPublicBudget(s,'transparency').ok,true);
 assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 assert.ok(Math.abs(getCorruptionBreakdown(s).prevention-.63)<1e-10);
 assert.ok(Math.abs(getCorruptionBreakdown(s).inspectorateReduction-.62)<1e-10);
});
