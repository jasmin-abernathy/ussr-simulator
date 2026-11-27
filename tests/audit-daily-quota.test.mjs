import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,publicProjectOffers,
 spendPublicBudget,getAuditCooldown,AUDIT_COOLDOWN_MS,
 AUDIT_CORRUPTION_REDUCTION,AUDIT_MAX_CHARGES,
} from '../web/runtime-anthem-v15/engine.js';
const HOUR=3600000;
const NOW=Date.UTC(2026,10,27,12,0,0);
const build=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.corruption=100;s.publicBudget=1e9;return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);

test('start with one inspection, gain one charge each hour and cap at five',()=>{
 const s=build();
 assert.equal(AUDIT_COOLDOWN_MS,HOUR);
 assert.equal(AUDIT_MAX_CHARGES,5);
 assert.equal(AUDIT_CORRUPTION_REDUCTION,.30);
 assert.equal(getAuditCooldown(s,NOW).charges,1);
 assert.equal(getAuditCooldown(s,NOW+HOUR-1).charges,1);
 assert.equal(getAuditCooldown(s,NOW+HOUR).charges,2);
 assert.equal(getAuditCooldown(s,NOW+4*HOUR).charges,5);
 assert.equal(getAuditCooldown(s,NOW+100*HOUR).charges,5);
 assert.equal(getAuditCooldown(s,NOW+100*HOUR).full,true);
 assert.equal(getAuditCooldown(s,NOW+100*HOUR).remainingMs,0);
});
test('five banked inspections can be spent consecutively, reducing remaining corruption by 30% each',()=>{
 const s=build();
 const at=NOW+6*HOUR;
 const before=s.publicBudget;
 for(let n=0;n<5;n++){
  const offer=publicProjectOffers(s,at).audit;
  assert.equal(offer.charges,5-n);
  assert.equal(offer.available,true);
  assert.equal(spendPublicBudget(s,'audit',at).ok,true);
  close(s.corruption,100*.7**(n+1));
 }
 assert.ok(s.publicBudget<before);
 assert.equal(s.corruptionAudits,5);
 assert.equal(getAuditCooldown(s,at).charges,0);
 assert.equal(spendPublicBudget(s,'audit',at).reason,'cooldown');
 assert.equal(getAuditCooldown(s,at+HOUR-1).charges,0);
 assert.equal(getAuditCooldown(s,at+HOUR).charges,1);
});
test('spending before reaching five preserves fractional recharge progress',()=>{
 const s=build();
 const at=NOW+2*HOUR+HOUR/2;
 assert.equal(getAuditCooldown(s,at).charges,3);
 assert.equal(getAuditCooldown(s,at).remainingMs,HOUR/2);
 assert.equal(spendPublicBudget(s,'audit',at).ok,true);
 assert.equal(getAuditCooldown(s,at).charges,2);
 assert.equal(getAuditCooldown(s,at+HOUR/2).charges,3);
});
test('banked inspections survive save reloads, time passing offline and midnight',()=>{
 const s=build();
 const stored=hydrateState(exportState(s,NOW+1000),NOW+3*HOUR);
 assert.equal(getAuditCooldown(stored,NOW+3*HOUR).charges,4);
 assert.equal(spendPublicBudget(stored,'audit',NOW+3*HOUR).ok,true);
 const next=hydrateState(exportState(stored,NOW+3*HOUR),NOW+5*HOUR);
 assert.equal(getAuditCooldown(next,NOW+5*HOUR).charges,5);
 const night=Date.UTC(2026,10,27,23,55,0);
 assert.equal(getAuditCooldown(s,night+10*60*1000).charges,5);
});
test('old saves keep holdings and adapt existing audit cooldown to the new reserve',()=>{
 const s=build();s.corruption=1.39;s.owned.matches=5;
 assert.equal(spendPublicBudget(s,'audit',NOW).ok,true);
 const old=exportState(s,NOW+1000);
 delete old.auditCharges;delete old.auditChargeAt;
 const loaded=hydrateState(old,NOW+1000);
 assert.equal(loaded.owned.matches,5);
 assert.equal(getAuditCooldown(loaded,NOW+1000).charges,0);
 assert.equal(getAuditCooldown(loaded,NOW+HOUR).charges,1);
 const never=exportState(build(),NOW);
 delete never.auditCharges;delete never.auditChargeAt;delete never.lastAuditAt;
 const fresh=hydrateState(never,NOW);
 assert.equal(getAuditCooldown(fresh,NOW).charges,1);
});
