import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,publicProjectOffers,
 spendPublicBudget,getDailyAuditUsage,MAX_DAILY_AUDITS,AUDIT_CORRUPTION_REDUCTION,
} from '../web/runtime-anthem-v15/engine.js';
const DAY=86400000;
const NOW=Date.UTC(2026,10,27,12,0,0);
const build=()=>{const state=createState(NOW);state.worldEconomyEnabled=true;state.corruption=30;state.publicBudget=1000000;return state;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);

test('exactly two inspections per UTC day, each removes 20% of remaining corruption',()=>{
 const s=build();
 assert.equal(MAX_DAILY_AUDITS,2);
 assert.equal(AUDIT_CORRUPTION_REDUCTION,.2);
 assert.equal(getDailyAuditUsage(s,NOW).remaining,2);
 assert.equal(spendPublicBudget(s,'audit',NOW).ok,true);
 close(s.corruption,24);
 assert.equal(publicProjectOffers(s,NOW).audit.remainingToday,1);
 assert.equal(spendPublicBudget(s,'audit',NOW+1000).ok,true);
 close(s.corruption,19.2);
 assert.equal(publicProjectOffers(s,NOW).audit.remainingToday,0);
 const budget=s.publicBudget,spent=s.publicSpent,corruption=s.corruption,history=s.corruptionAudits;
 const refused=spendPublicBudget(s,'audit',NOW+2000);
 assert.equal(refused.ok,false);assert.equal(refused.reason,'daily-limit');
 assert.equal(s.publicBudget,budget);assert.equal(s.publicSpent,spent);
 assert.equal(s.corruption,corruption);assert.equal(s.corruptionAudits,history);
});
test('daily quota persists through saves and resets next UTC day',()=>{
 const s=build();spendPublicBudget(s,'audit',NOW);spendPublicBudget(s,'audit',NOW+1000);
 const saved=exportState(s,NOW+2000);
 const loaded=hydrateState(saved,NOW+2000);
 assert.equal(publicProjectOffers(loaded,NOW+2000).audit.remainingToday,0);
 assert.equal(spendPublicBudget(loaded,'audit',NOW+2000).reason,'daily-limit');
 assert.equal(publicProjectOffers(loaded,NOW+DAY).audit.remainingToday,2);
 assert.equal(spendPublicBudget(loaded,'audit',NOW+DAY).ok,true);
 close(loaded.corruption,15.36);
 assert.equal(publicProjectOffers(loaded,NOW+DAY).audit.remainingToday,1);
});
test('a small corruption balance is not zeroed and old saves get a free quota',()=>{
 const s=build();s.corruption=1.39;
 const old=exportState(s,NOW);
 delete old.auditDay;delete old.auditsToday;
 const loaded=hydrateState(old,NOW);
 assert.equal(publicProjectOffers(loaded,NOW).audit.remainingToday,2);
 assert.equal(spendPublicBudget(loaded,'audit',NOW).ok,true);
 close(loaded.corruption,1.112);
 assert.ok(loaded.corruption>0);
});
