import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES,createWorld,chooseCountry,getCooperation,rankCountriesByDifficulty,getPoliticalDifficulty,POLITICAL_DIFFICULTY,USA_COUNTRY_ID,USA_COOPERATION_COST,USA_COMMUNISM_THRESHOLD,hydrateWorld } from '../web/world.js';
import {createState} from '../web/engine.js';
test('every one of the 49 countries has explicit fictional political thresholds and context',()=>{
 assert.equal(COUNTRIES.length,49);
 assert.equal(Object.keys(POLITICAL_DIFFICULTY).length,COUNTRIES.length);
 for(const country of COUNTRIES){
  const record=getPoliticalDifficulty(country);
  assert.ok(Number.isInteger(record?.threshold)&&record.threshold>0,country.name);
  assert.ok(record.reason.length>=20,country.name);
 }
});
test('southern European radical-left traditions precede German entry',()=>{
 const t=name=>getPoliticalDifficulty(name).threshold;
 assert.ok(t('Portugal')<t('Allemagne'));
 assert.ok(t('Grèce')<t('Allemagne'));
 assert.ok(t('Espagne')<t('Allemagne'));
 assert.ok(t('Portugal')<t('Grèce')&&t('Grèce')<t('Espagne'));
});
test('cooperation lists sort by political thresholds, never country array index',()=>{
 const sorted=rankCountriesByDifficulty(COUNTRIES);
 assert.equal(sorted[0].name,'Cuba');
 assert.equal(sorted.at(-1).id,USA_COUNTRY_ID);
 for(let i=1;i<sorted.length;i++)
  assert.ok(getPoliticalDifficulty(sorted[i-1]).threshold<=getPoliticalDifficulty(sorted[i]).threshold);
 const europe=rankCountriesByDifficulty(COUNTRIES.filter(c=>c.region==='Europe'));
 assert.ok(europe.findIndex(c=>c.name==='Grèce')<europe.findIndex(c=>c.name==='Allemagne'));
});
test('cash cost and political requirement are aligned; America remains unique final challenge',()=>{
 const w=createWorld(),s=createState(1700000000000);chooseCountry(w,'0');
 const usa=getCooperation(w,s,USA_COUNTRY_ID);
 assert.equal(usa.threshold,USA_COMMUNISM_THRESHOLD);
 assert.equal(usa.cost,USA_COOPERATION_COST);
 for(const country of COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID&&c.id!==w.origin)){
  const offer=getCooperation(w,s,country.id);
  assert.equal(offer.threshold,getPoliticalDifficulty(country).threshold);
  assert.ok(offer.threshold<usa.threshold&&offer.cost<usa.cost);
 }
 assert.ok(getCooperation(w,s,'2').cost<getCooperation(w,s,'1').cost);
 assert.ok(getCooperation(w,s,'11').cost<getCooperation(w,s,'1').cost);
});
test('changing difficulty preserves origins, signed bilateral deals and partnerships in existing saves',()=>{
 const saved={version:1,origin:'2',partners:['11','3'],bilateral:['1'],usImports:2,celebrated:[5]};
 const w=hydrateWorld(saved);
 assert.equal(w.origin,'2');assert.deepEqual(w.partners,['11','3']);
 assert.deepEqual(w.bilateral,['1']);assert.equal(w.usImports,2);
});
