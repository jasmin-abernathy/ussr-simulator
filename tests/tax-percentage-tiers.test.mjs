import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 createState,hydrateState,exportState,setTaxPolicy,TAX_POLICIES,
 activityBusinessRate,getBusinessEconomy,getBusinessEconomyForPolicy,
} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const fresh=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.owned.matches=2;s.owned.beer=1;return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('taxation policies are actual percentages of each company turnover',()=>{
 assert.deepEqual(TAX_POLICIES,{social:10,balanced:30,solidarity:50});
 for(const [name,rate] of Object.entries(TAX_POLICIES)){
  const s=fresh();
  assert.equal(setTaxPolicy(s,name),true);
  for(const id of ['matches','beer','us-imports']){
   const business=activityBusinessRate(s,id);
   assert.equal(business.taxRate,rate);
   close(business.taxesPerSecond,business.grossPerSecond*rate/100);
   close(business.treasuryPerSecond,business.grossPerSecond*(1-rate/100));
  }
 }
});
test('tax policy moves public collections and commercial revenue in opposing directions',()=>{
 const s=fresh();
 const light=getBusinessEconomyForPolicy(s,'social');
 const medium=getBusinessEconomyForPolicy(s,'balanced');
 const strong=getBusinessEconomyForPolicy(s,'solidarity');
 assert.ok(light.taxesCollectedPerSecond<medium.taxesCollectedPerSecond);
 assert.ok(medium.taxesCollectedPerSecond<strong.taxesCollectedPerSecond);
 assert.ok(light.businessIncomePerSecond>medium.businessIncomePerSecond);
 assert.ok(medium.businessIncomePerSecond>strong.businessIncomePerSecond);
 assert.equal(getBusinessEconomy(s).taxPolicy,'balanced');
 assert.equal(setTaxPolicy(s,'not-a-policy'),false);
});
test('existing saves retain the chosen named tax policy',()=>{
 const s=fresh();setTaxPolicy(s,'solidarity');
 const restored=hydrateState(exportState(s,NOW),NOW);
 assert.equal(restored.taxPolicy,'solidarity');
 assert.equal(activityBusinessRate(restored,'matches').taxRate,50);
});
test('the three UI cards show % prominently and rouble estimates only as secondary info',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 for(const [name,rate] of Object.entries(TAX_POLICIES)){
  assert.match(html,new RegExp('data-policy-preview="'+name+'">'+rate+' %'));
  assert.match(html,new RegExp('data-policy-estimate="'+name+'"'));
 }
 assert.match(app,/TAX_POLICIES\[button.dataset.taxPolicy\]/);
});
