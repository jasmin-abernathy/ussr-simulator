import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,publicProjectOffers,
 spendPublicBudget,getAuditCooldown,AUDIT_COOLDOWN_MS,AUDIT_CORRUPTION_REDUCTION,
} from '../web/runtime-anthem-v15/engine.js';
const HOUR=3600000;
const NOW=Date.UTC(2026,10,27,12,0,0);
const build=()=>{const state=createState(NOW);state.worldEconomyEnabled=true;state.corruption=30;state.publicBudget=1000000;return state;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('one audit per elapsed hour; inspections reduce 20% each, never a fixed number',()=>{
 const s=build();
 assert.equal(AUDIT_COOLDOWN_MS,HOUR);
 assert.equal(AUDIT_CORRUPTION_REDUCTION,.2);
 assert.equal(getAuditCooldown(s,NOW).ready,true);
 assert.equal(spendPublicBudget(s,'audit',NOW).ok,true);
 close(s.corruption,24);
 const offer=publicProjectOffers(s,NOW+1000).audit;
 assert.equal(offer.cooldownActive,true);
 assert.equal(offer.cooldownMs,HOUR-1000);
 const budget=s.publicBudget,history=s.corruptionAudits;
 assert.equal(spendPublicBudget(s,'audit',NOW+HOUR-1).reason,'cooldown');
 assert.equal(s.publicBudget,budget);assert.equal(s.corruptionAudits,history);
 assert.equal(spendPublicBudget(s,'audit',NOW+HOUR).ok,true);
 close(s.corruption,19.2);
 assert.equal(publicProjectOffers(s,NOW+HOUR).audit.cooldownActive,true);
 assert.equal(spendPublicBudget(s,'audit',NOW+2*HOUR).ok,true);
 close(s.corruption,15.36);
});
test('hourly cooldown survives export and reload, even after midnight',()=>{
 const s=build();
 assert.equal(spendPublicBudget(s,'audit',NOW).ok,true);
 const loaded=hydrateState(exportState(s,NOW+1000),NOW+1000);
 assert.equal(loaded.lastAuditAt,NOW);
 assert.equal(getAuditCooldown(loaded,NOW+HOUR-1).remainingMs,1);
 assert.equal(spendPublicBudget(loaded,'audit',NOW+HOUR-1).reason,'cooldown');
 assert.equal(spendPublicBudget(loaded,'audit',NOW+HOUR).ok,true);
 const nearMidnight=Date.UTC(2026,10,27,23,55,0);
 assert.equal(spendPublicBudget(loaded,'audit',nearMidnight).ok,true);
 assert.equal(spendPublicBudget(loaded,'audit',nearMidnight+10*60*1000).reason,'cooldown');
 assert.equal(spendPublicBudget(loaded,'audit',nearMidnight+HOUR).ok,true);
});
test('old saves keep holdings, fractional corruption, and have no inherited daily quota',()=>{
 const s=build();s.corruption=1.39;s.owned.matches=5;s.auditsToday=2;
 const old=exportState(s,NOW);
 delete old.lastAuditAt;
 const loaded=hydrateState(old,NOW);
 assert.equal(loaded.lastAuditAt,0);
 assert.equal(loaded.owned.matches,5);
 assert.equal(publicProjectOffers(loaded,NOW).audit.cooldownActive,false);
 assert.equal(spendPublicBudget(loaded,'audit',NOW).ok,true);
 close(loaded.corruption,1.112);
});
