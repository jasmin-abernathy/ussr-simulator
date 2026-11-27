import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,buyActivity,advance,getBusinessEconomy,activityBusinessRate,setTaxPolicy,exportState,hydrateState} from '../web/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('all enterprise revenue after taxes reaches treasury, no dividends',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');
 const a=activityBusinessRate(s,'matches');
 close(a.grossPerSecond,.625);close(a.taxesPerSecond,.05);close(a.treasuryPerSecond,.575);
 assert.equal(Object.hasOwn(a,'dividendsPerSecond'),false);
 const finance=getBusinessEconomy(s);close(finance.netToTreasuryPerSecond,.575);
 assert.equal(Object.hasOwn(finance,'dividendsPerSecond'),false);
 const previous=s.cash;advance(s,NOW+1000);
 close(s.cash-previous,.575);close(s.publicBudget,.05);
});
test('tax policy allocates full gross between taxes and business income',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');
 for(const policy of ['social','balanced','solidarity']){
  assert.equal(setTaxPolicy(s,policy),true);
  const a=activityBusinessRate(s,'matches');
  close(a.treasuryPerSecond+a.taxesPerSecond,a.grossPerSecond);
 }
});
test('existing save balances and owned industries survive',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=500;buyActivity(s,'matches');
 const restored=hydrateState(exportState(s,NOW),NOW);
 close(restored.cash,s.cash);assert.equal(restored.owned.matches,1);
});
test('current web runtime and interface have no dividend calculation or label',()=>{
 for(const path of ['../web/index.html','../web/runtime-income-v12/app.js','../web/runtime-income-v12/engine.js','../web/runtime-income-v12/world.js']){
  const text=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(text,/dividend/i,path);
 }
});
