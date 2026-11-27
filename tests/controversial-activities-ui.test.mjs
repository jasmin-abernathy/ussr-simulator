import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,buyActivity,getCommunismPerMinute,exportState,hydrateState,COMMUNISM_PURCHASE_PENALTY} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const start=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=500;s.cash=1000000000;return s;};
test('black market decreases communism only, rather than simultaneously awarding +10 and imposing -4',()=>{
 const s=start();const before=s.communism;
 assert.equal(buyActivity(s,'black-market').ok,true);
 assert.equal(s.communism,before-4);
 assert.equal(s.owned['black-market'],1);
 assert.equal(s.corruption,2);
 assert.equal(getCommunismPerMinute(s),0);
 assert.equal(hydrateState(exportState(s,NOW),NOW).communism,before-4);
});
test('all politically penalized businesses avoid contradictory bonus on purchase and passive communism income',()=>{
 for(const [id,penalty] of Object.entries(COMMUNISM_PURCHASE_PENALTY)){
  const s=start(),before=s.communism;
  assert.equal(buyActivity(s,id).ok,true,id);
  assert.equal(s.communism,before-penalty,id);
  assert.equal(getCommunismPerMinute(s),0,id);
 }
});
test('ordinary cooperative enterprises still award purchase and passive communism',()=>{
 const s=start();const before=s.communism;
 assert.equal(buyActivity(s,'matches').ok,true);
 assert.equal(s.communism,before+1);
 assert.equal(getCommunismPerMinute(s),.01);
});
test('illicit cards show one political effect, warning spans both columns and idle conversion is hidden',()=>{
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.match(app,/if\(item.effects.communism&&!politicalPenalty\)/);
 assert.match(app,/−\$\{format\(politicalPenalty\)\} communisme/);
 assert.match(app,/refs.conversionBox.hidden=!convertible\|\|item.owned===0/);
 assert.match(css,/\.activity-card \.activity-effects \.activity-corruption/);
 assert.match(css,/grid-column:1\/-1/);
});
