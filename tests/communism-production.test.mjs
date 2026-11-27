import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createState,hydrateState,exportState,buyActivity,advance,getStats,getCommunismPerMinute
} from '../web/engine.js';
import {ACTIVITIES} from '../web/game-data.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
const world=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=1e12;s.communism=5000;return s;};
test('purchase awards immediate communism, plus a separate recurring per-minute rate',()=>{
 const s=world();const before=s.communism;
 assert.equal(buyActivity(s,'matches').ok,true);
 close(s.communism,before+1);
 assert.equal(getCommunismPerMinute(s),1);
 assert.equal(getStats(s).communismPerMinute,1);
 advance(s,NOW+59999);close(s.communism,before+1);
 const result=advance(s,NOW+60000);
 close(result.communismEarned,1);
 close(s.communism,before+2);
 advance(s,NOW+120000);close(s.communism,before+3);
});
test('all industries with a purchase communism effect generate the same points per minute per owned unit',()=>{
 const s=world();
 assert.equal(buyActivity(s,'matches',3).ok,true);
 assert.equal(buyActivity(s,'beer',2).ok,true);
 assert.equal(buyActivity(s,'radio').ok,true);
 assert.equal(getCommunismPerMinute(s),7); // 3 × 1 + 2 × 2; radio yields 0
 const start=s.communism;
 advance(s,NOW+180000);
 close(s.communism,start+21);
 assert.equal(getStats(s).communismPerMinute,7);
});
test('every activity follows its original one-time communism bonus, without boosting imports or political offices',()=>{
 const s=world();
 for(const item of ACTIVITIES){
  s.owned[item.id]=2;
 }
 const expected=ACTIVITIES.reduce((sum,item)=>sum+2*item.effects.communism,0);
 close(getCommunismPerMinute(s),expected);
 s.importsOwned=99;s.bureaucracyOffices=10;s.bilateralAgreements=7;
 close(getCommunismPerMinute(s),expected);
});
test('fractional minute carries across saves and earns exactly once',()=>{
 const s=world();buyActivity(s,'matches');const start=s.communism;
 advance(s,NOW+35000);
 assert.equal(s.communismRemainderMs,35000);
 const saved=exportState(s,NOW+35000);
 const restored=hydrateState(saved,NOW+45000);
 assert.equal(restored.communismRemainderMs,45000);
 close(restored.communism,start);
 advance(restored,NOW+60000);close(restored.communism,start+1);
 advance(restored,NOW+60000);close(restored.communism,start+1);
 advance(restored,NOW+121000);close(restored.communism,start+2);
});
test('existing saves get the new income clock without losing any factories or replaying past minutes',()=>{
 const s=world();buyActivity(s,'matches');const saved=exportState(s,NOW);
 delete saved.communismRemainderMs;
 const reloaded=hydrateState(saved,NOW);
 assert.equal(reloaded.owned.matches,1);
 assert.equal(reloaded.communismRemainderMs,0);
 const start=reloaded.communism;
 advance(reloaded,NOW+59000);close(reloaded.communism,start);
 advance(reloaded,NOW+60000);close(reloaded.communism,start+1);
});
test('offline communism gain obeys the existing 8h cap and ignores excess elapsed time',()=>{
 const s=world();buyActivity(s,'matches');const start=s.communism;
 const result=advance(s,NOW+10*60*60*1000);
 assert.equal(result.capped,true);
 close(result.communismEarned,8*60);
 close(s.communism,start+8*60);
 const second=advance(s,NOW+10*60*60*1000);
 close(second.communismEarned,0);
});
test('legacy non-world engine does not retroactively grant new per-minute rewards',()=>{
 const s=createState(NOW);s.cash=10000;
 assert.equal(buyActivity(s,'matches').ok,true);
 const start=s.communism;
 advance(s,NOW+120000);
 close(s.communism,start);
});
