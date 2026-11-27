import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,INITIAL_COUNTRIES,START_COUNTRIES,createWorld,hydrateWorld,chooseCountry,
 getCooperation,cooperate,getWorldStage,getWorldStats,getVisibleCountries,isCountryVisible,
 USA_COUNTRY_ID,rankCountriesByDifficulty, getPoliticalDifficulty} from '../web/world.js';
import {createState} from '../web/engine.js';
const USA=USA_COUNTRY_ID;
const initial=INITIAL_COUNTRIES.filter(c=>c.id!==USA);
const second=COUNTRIES.filter(c=>Number(c.id)>=49);
const rich=()=>{const s=createState(1700000000000);s.communism=1e6;s.cash=1e12;return s;};
const origin=()=>{const w=createWorld();chooseCountry(w,'0');return w;};
function allFirst(w){w.partners=initial.filter(c=>c.id!==w.origin).map(c=>c.id);}
function allOther(w){w.partners=COUNTRIES.filter(c=>c.id!==w.origin&&c.id!==USA).map(c=>c.id);}
test('195 states are enumerated, including 146 new states but excluding US from starting origin',()=>{
 assert.equal(INITIAL_COUNTRIES.length,49);
 assert.equal(START_COUNTRIES.length,48);
 assert.equal(COUNTRIES.length,195);
 assert.equal(second.length,146);
 assert.equal(new Set(COUNTRIES.map(c=>c.name)).size,195);
 assert.equal(new Set(COUNTRIES.map(c=>c.id)).size,195);
 const w=createWorld();
 assert.equal(chooseCountry(w,'49').ok,false);
 assert.equal(chooseCountry(w,USA).ok,false);
 assert.equal(chooseCountry(w,'0').ok,true);
});
test('second wave is invisible and cannot be bypassed with abundant money or communism',()=>{
 const w=origin(),s=rich();
 assert.equal(getWorldStage(w),1);
 assert.equal(getVisibleCountries(w).length,48);
 assert.equal(isCountryVisible(w,USA),false);
 assert.equal(isCountryVisible(w,'49'),false);
 assert.equal(getCooperation(w,s,'49').available,false);
 assert.equal(cooperate(w,s,'49').reason,'stage-locked');
 assert.equal(cooperate(w,s,USA).reason,'stage-locked');
 assert.equal(getWorldStats(w).initialJoined,1);
});
test('146 countries unlock precisely when all 48 original non-US countries cooperate',()=>{
 const w=origin(),s=rich();
 const last=initial.filter(c=>c.id!=='0').at(-1);
 w.partners=initial.filter(c=>c.id!=='0'&&c.id!==last.id).map(c=>c.id);
 assert.equal(getWorldStage(w),1);assert.equal(getVisibleCountries(w).length,48);
 const result=cooperate(w,s,last.id);
 assert.equal(result.ok,true);
 assert.equal(getWorldStage(w),2);
 assert.equal(getWorldStats(w).initialJoined,48);
 assert.equal(getVisibleCountries(w).length,194);
 assert.equal(getCooperation(w,s,'49').available,true);
 assert.equal(cooperate(w,s,USA).reason,'stage-locked');
 assert.equal(getCooperation(w,s,USA).available,false);
});
test('USA stays blocked until all additional countries are integrated, then is the final nation',()=>{
 const w=origin(),s=rich();allFirst(w);
 assert.equal(getWorldStage(w),2);
 const last=second.at(-1);
 w.partners.push(...second.filter(c=>c.id!==last.id).map(c=>c.id));
 assert.equal(getWorldStage(w),2);
 assert.equal(getVisibleCountries(w).length,194);
 assert.equal(getCooperation(w,s,USA).available,false);
 const lastResult=cooperate(w,s,last.id);
 assert.equal(lastResult.ok,true);
 assert.equal(getWorldStage(w),3);
 assert.equal(getVisibleCountries(w).length,195);
 assert.equal(getCooperation(w,s,USA).available,true);
 assert.equal(cooperate(w,s,USA).ok,true);
 assert.equal(getWorldStage(w),4);
 assert.equal(getWorldStats(w).totalJoined,195);
 assert.equal(getVisibleCountries(w).length,195);
});
test('stage and historic country IDs are inferred from old saves without migration',()=>{
 const save={version:1,origin:'2',partners:['11','3'],bilateral:['1'],usImports:2,celebrated:[5]};
 const w=hydrateWorld(save);
 assert.equal(w.origin,'2');assert.deepEqual(w.partners,['11','3']);
 assert.equal(getWorldStage(w),1);
 assert.equal(getWorldStats(w).initialJoined,3);
 assert.deepEqual(w.bilateral,['1']);assert.equal(w.usImports,2);
 const finalSave=hydrateWorld({...save,partners:COUNTRIES.filter(c=>c.id!=='2'&&c.id!==USA).map(c=>c.id)});
 assert.equal(getWorldStage(finalSave),3);
 assert.equal(getCooperation(finalSave,rich(),USA).unlocked,true);
});
test('new states have fictional difficulty thresholds above the first wave and below USA',()=>{
 for(const c of second){
  assert.ok(getPoliticalDifficulty(c)?.threshold>=3100,c.name);
  assert.ok(getPoliticalDifficulty(c)?.threshold<100000,c.name);
 }
 const sorted=rankCountriesByDifficulty(COUNTRIES);
 assert.equal(sorted[0].name,'Cuba');
 assert.equal(sorted.at(-1).id,USA);
});
