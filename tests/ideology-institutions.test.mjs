import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 createState,exportState,hydrateState,advance,
 getIdeologyInstitutionOffer,buyIdeologyInstitution,
 getCommunismPerMinute,corruptionGrossPerMinute,corruptionPerMinute,
 spendPublicBudget,IDEOLOGY_INSTITUTIONS
} from '../web/runtime-anthem-v15/engine.js';
import {getAnthemReward} from '../web/runtime-anthem-v15/world.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
const ready=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.cash=1e9;s.publicBudget=1e9;s.communism=500;return s;};
test('two political institution types make passive communism AND passive corruption',()=>{
 const s=ready();
 assert.deepEqual(Object.keys(IDEOLOGY_INSTITUTIONS),['mobilization','institute']);
 const first=getIdeologyInstitutionOffer(s,'mobilization');
 const second=getIdeologyInstitutionOffer(s,'institute');
 assert.equal(first.cost,6000);assert.equal(second.cost,24000);
 assert.equal(first.corruptionOnPurchase,1);assert.equal(second.corruptionOnPurchase,3);
 assert.equal(buyIdeologyInstitution(s,'mobilization').ok,true);
 assert.equal(buyIdeologyInstitution(s,'institute').ok,true);
 assert.equal(s.corruption,4);
 close(getCommunismPerMinute(s),.35);
 close(corruptionGrossPerMinute(s),.60);
 close(corruptionPerMinute(s),.60);
 close(getAnthemReward(s),.875);
 const before=s.communism;
 advance(s,NOW+60000);
 close(s.communism,before+.35);
 close(s.corruption,4+.60);
});
test('existing anticorruption measures may slow the increase but cannot reverse it passively',()=>{
 const s=ready();
 buyIdeologyInstitution(s,'mobilization');
 buyIdeologyInstitution(s,'institute');
 for(let i=0;i<6;i++)assert.equal(spendPublicBudget(s,'transparency').ok,true);
 for(let i=0;i<12;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 close(corruptionPerMinute(s),.60*.4*.4);
 const prev=s.corruption;
 advance(s,NOW+60000);
 assert.ok(s.corruption>prev);
});
test('establishment limits, unlocks and cash rejection keep game state unchanged',()=>{
 const s=ready();s.communism=20;
 assert.equal(buyIdeologyInstitution(s,'mobilization').reason,'locked');
 s.communism=500;s.cash=0;
 assert.equal(buyIdeologyInstitution(s,'institute').reason,'funds');
 s.cash=1e99;
 for(let i=0;i<12;i++)assert.equal(buyIdeologyInstitution(s,'mobilization').ok,true,i);
 assert.equal(buyIdeologyInstitution(s,'mobilization').reason,'limit');
 for(let i=0;i<8;i++)assert.equal(buyIdeologyInstitution(s,'institute').ok,true,i);
 assert.equal(buyIdeologyInstitution(s,'institute').reason,'limit');
 assert.equal(getIdeologyInstitutionOffer(s,'invalid'),null);
 assert.equal(buyIdeologyInstitution(s,'invalid').reason,'invalid-institution');
});
test('save reload retains both centers and passive income including offline time',()=>{
 const s=ready();buyIdeologyInstitution(s,'mobilization');buyIdeologyInstitution(s,'institute');
 const restored=hydrateState(exportState(s,NOW),NOW+60000);
 assert.equal(restored.mobilizationHouses,1);
 assert.equal(restored.ideologyInstitutes,1);
 close(restored.communism,s.communism+.35);
 close(restored.corruption,s.corruption+.60);
 const raw=exportState(s,NOW);
 delete raw.mobilizationHouses;delete raw.ideologyInstitutes;
 const old=hydrateState(raw,NOW);
 assert.equal(old.mobilizationHouses,0);assert.equal(old.ideologyInstitutes,0);
});
test('institution cards display both recurring effects and connect their buy buttons',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 for(const id of ['mobilization','institute']){
  assert.match(html,new RegExp('id="'+id+'-buy"'));
  assert.match(html,new RegExp('id="'+id+'-benefit"'));
  assert.match(html,new RegExp('id="'+id+'-risk"'));
 }
 assert.match(app,/getIdeologyInstitutionOffer\(state,id\)/);
 assert.match(app,/buyIdeologyInstitution\(state,id\)/);
});
