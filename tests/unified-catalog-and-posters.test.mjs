import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVITIES} from '../web/runtime-anthem-v15/game-data.js';
import {
 createState,buyActivity,getCommunismPerMinute,corruptionGrossPerMinute,
 getActivityCorruptionRate,CORRUPTION_PURCHASE,exportState,hydrateState
} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
const ready=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=500;s.cash=1e9;return s;};
test('posters award communism and increase corruption without reducing political reward',()=>{
 const s=ready();const before=s.communism;
 assert.equal(CORRUPTION_PURCHASE.posters,2);
 assert.equal(getActivityCorruptionRate('posters'),.1);
 assert.equal(buyActivity(s,'posters').ok,true);
 assert.equal(s.communism,before+10);
 assert.equal(s.corruption,2);
 close(getCommunismPerMinute(s),.1);
 close(corruptionGrossPerMinute(s),.16);
});
test('existing poster ownership and historical propaganda agencies retain their saved benefits',()=>{
 const s=ready();
 assert.equal(buyActivity(s,'posters').ok,true);
 s.propagandaAgencies=2;
 const loaded=hydrateState(exportState(s,NOW),NOW);
 assert.equal(loaded.owned.posters,1);
 assert.equal(loaded.propagandaAgencies,2);
 close(getCommunismPerMinute(loaded),.2);
 close(corruptionGrossPerMinute(loaded),.4);
});
test('five sensitive investments are distributed into nine-per-page activity catalogue',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.equal(ACTIVITIES.length,22);
 assert.match(app,/const ACTIVITY_PAGE_SIZE=9/);
 assert.match(app,/const insertAfter=\[2,6,10,14,18\]/);
 assert.match(app,/list\.insertBefore\(card/);
 assert.match(app,/const eligible=\[\.\.\.list\.children\]/);
 assert.match(app,/\.filter\(card=>!card\.classList\.contains\('investment-propaganda'\)\)/);
 assert.match(html,/id="activity-pagination"/);
 assert.match(html,/id="activity-page-prev"/);
 assert.match(html,/id="activity-page-next"/);
 for(const id of ['import','bureaucracy','bilateral','mobilization','institute'])
  assert.match(html,new RegExp('id="'+id+'-buy"'));
 assert.match(css,/\.activity-list \.special-activity-card\[hidden\]/);
});
