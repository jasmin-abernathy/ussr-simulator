import test from 'node:test';
import assert from 'node:assert/strict';
import {
 COUNTRIES,INITIAL_COUNTRIES,START_COUNTRIES,USA_COUNTRY_ID,WORLD_WAVE_SIZE,
 createWorld,chooseCountry,hydrateWorld,getCooperation,cooperate,
 getCampaignOrder,getCampaignWaves,getCountryWave,getVisibleCountries,
 getWorldStage,getWorldStats,isCountryVisible,getPoliticalDifficulty,
} from '../web/world.js';
import {COUNTRY_GEOGRAPHY} from '../web/world-geography.js';
import {createState} from '../web/engine.js';
const USA=USA_COUNTRY_ID;
const rich=()=>{const s=createState(1700000000000);s.communism=1e6;s.cash=1e12;return s;};
const origin=id=>{const w=createWorld();assert.equal(chooseCountry(w,id).ok,true);return w;};
const joinWave=(w,n)=>{w.partners.push(...getCampaignWaves(w)[n-1].filter(c=>c.id!==w.origin&&!w.partners.includes(c.id)).map(c=>c.id));};
test('195 unique countries, original IDs and geographic metadata remain stable',()=>{
 assert.equal(INITIAL_COUNTRIES.length,49);
 assert.equal(START_COUNTRIES.length,48);
 assert.equal(COUNTRIES.length,195);
 assert.equal(WORLD_WAVE_SIZE,30);
 assert.equal(Object.keys(COUNTRY_GEOGRAPHY).length,195);
 assert.equal(new Set(COUNTRIES.map(c=>c.name)).size,195);
 assert.equal(new Set(COUNTRIES.map(c=>c.id)).size,195);
 assert.equal(COUNTRIES[0].name,'France');
 assert.equal(COUNTRIES[14].name,'États-Unis');
 for(const c of COUNTRIES) {
  const geo=COUNTRY_GEOGRAPHY[c.id];
  assert.ok(Array.isArray(geo)&&geo.length===5&&Number.isFinite(geo[0])&&Number.isFinite(geo[1]),c.name);
  assert.ok(getPoliticalDifficulty(c)?.threshold>0,c.name);
 }
 assert.equal(chooseCountry(createWorld(),'49').ok,false);
 assert.equal(chooseCountry(createWorld(),USA).ok,false);
});
test('all origins produce 6 waves of 30 and final wave of 15, with USA last',()=>{
 for(const initial of START_COUNTRIES){
  const w=origin(initial.id);
  const waves=getCampaignWaves(w);
  assert.equal(waves.length,7,initial.name);
  assert.deepEqual(waves.map(x=>x.length),[30,30,30,30,30,30,15],initial.name);
  assert.equal(waves[0][0].id,initial.id,initial.name);
  assert.equal(waves[6][14].id,USA,initial.name);
  const all=waves.flat();
  assert.equal(all.length,195);
  assert.equal(new Set(all.map(c=>c.id)).size,195);
  assert.equal(getCountryWave(w,initial.id),1);
  assert.equal(getCountryWave(w,USA),7);
  assert.equal(getWorldStage(w),1);
  assert.equal(getVisibleCountries(w).length,30);
 }
});
test('French wave begins with land neighbours instead of distant countries',()=>{
 const w=origin('0');
 const first=getCampaignOrder(w).slice(1,9).map(c=>c.name);
 assert.deepEqual(new Set(first),new Set(['Andorre','Belgique','Allemagne','Italie','Luxembourg','Monaco','Espagne','Suisse']));
 assert.equal(getCampaignOrder(w)[0].name,'France');
 assert.equal(getVisibleCountries(w).length,30);
 assert.ok(getCampaignWaves(w)[0].every(c=>COUNTRY_GEOGRAPHY[c.id][2]==='Europe'));
});
test('continent changes which countries appear first for Africa, Asia, Americas and Oceania',()=>{
 const origins=[['Sénégal','Africa'],['Népal','Asie'],['Cuba','Americas'],['Nouvelle-Zélande','Oceania']];
 for(const [name,continent] of origins){
  const c=COUNTRIES.find(x=>x.name===name);
  const w=origin(c.id);
  const wave=getCampaignWaves(w)[0];
  assert.equal(wave[0].name,name);
  assert.ok(wave.slice(0,Math.min(8,wave.length)).every(x=>COUNTRY_GEOGRAPHY[x.id][2]===continent),name);
  assert.equal(wave.length,30);
 }
 const w=origin(COUNTRIES.find(c=>c.name==='Népal').id);
 const first=getCampaignOrder(w).slice(1,3).map(c=>c.name);
 assert.deepEqual(new Set(first),new Set(['Chine','Inde']));
});
test('waves unlock only after ALL countries in current wave cooperate',()=>{
 const w=origin('0'),s=rich();
 const waves=getCampaignWaves(w);
 assert.equal(getWorldStage(w),1);
 const firstNext=waves[1][0];
 assert.equal(getCooperation(w,s,firstNext.id).available,false);
 assert.equal(cooperate(w,s,firstNext.id).reason,'stage-locked');
 const last=waves[0].at(-1);
 w.partners=waves[0].filter(c=>c.id!==w.origin&&c.id!==last.id).map(c=>c.id);
 assert.equal(getWorldStage(w),1);
 assert.equal(getVisibleCountries(w).length,30);
 assert.equal(cooperate(w,s,last.id).ok,true);
 assert.equal(getWorldStage(w),2);
 assert.equal(getVisibleCountries(w).length,60);
 assert.equal(getCooperation(w,s,firstNext.id).available,true);
 assert.equal(getWorldStats(w).waveTotal,30);
 assert.equal(getWorldStats(w).waveJoined,0);
});
test('the 15-country final wave keeps USA locked until all 194 other nations join',()=>{
 const w=origin('0'),s=rich();
 const waves=getCampaignWaves(w);
 for(let i=1;i<=6;i++)joinWave(w,i);
 assert.equal(getWorldStage(w),7);
 assert.equal(getWorldStats(w).waveTotal,15);
 assert.equal(getVisibleCountries(w).length,194);
 assert.equal(getCooperation(w,s,USA).available,false);
 assert.equal(cooperate(w,s,USA).reason,'stage-locked');
 const lastNonUSA=waves[6][13];
 w.partners.push(...waves[6].filter(c=>c.id!==lastNonUSA.id&&c.id!==USA).map(c=>c.id));
 assert.equal(getWorldStage(w),7);
 assert.equal(isCountryVisible(w,USA),false);
 assert.equal(cooperate(w,s,lastNonUSA.id).ok,true);
 assert.equal(getWorldStage(w),7);
 assert.equal(getVisibleCountries(w).length,195);
 assert.equal(getCooperation(w,s,USA).available,true);
 assert.equal(cooperate(w,s,USA).ok,true);
 assert.equal(getWorldStage(w),8);
 assert.equal(getWorldStats(w).totalJoined,195);
});
test('saved partner IDs from previous releases are preserved even outside current wave',()=>{
 const w=hydrateWorld({version:1,origin:'2',partners:['11','3','0','49'],bilateral:['1'],usImports:2,celebrated:[5]});
 assert.equal(w.origin,'2');
 assert.deepEqual(w.partners,['11','3','0','49']);
 assert.deepEqual(w.bilateral,['1']);assert.equal(w.usImports,2);
 assert.equal(getWorldStage(w),1);
 assert.equal(isCountryVisible(w,'49'),true);
 assert.equal(getCooperation(w,rich(),'49').joined,true);
 const restored=hydrateWorld(JSON.parse(JSON.stringify(w)));
 assert.deepEqual(restored,w);
});
test('geographic wave ordering is deterministic for the same origin and differs by origin',()=>{
 const fr=origin('0'),jp=origin(COUNTRIES.find(c=>c.name==='Japon').id);
 const a=getCampaignOrder(fr).map(c=>c.id);
 const b=getCampaignOrder(fr).map(c=>c.id);
 const c=getCampaignOrder(jp).map(c=>c.id);
 assert.deepEqual(a,b);
 assert.notDeepEqual(a.slice(0,30),c.slice(0,30));
 assert.equal(a.at(-1),USA);
 assert.equal(c.at(-1),USA);
});
