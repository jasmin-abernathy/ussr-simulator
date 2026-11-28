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
test('five sensitive investments are distributed across responsive activity catalogue pages',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.equal(ACTIVITIES.length,22);
 assert.match(app,/const activityPageSize=/);
 assert.match(app,/max-width: 700px/);
 assert.match(app,/max-width: 1100px/);
 assert.match(app,/matches\?8/);
 assert.match(app,/matches\?9:12/);
 assert.match(app,/eligible\.slice\(activityPage\*pageSize,\(activityPage\+1\)\*pageSize\)/);
 assert.match(app,/media\.addEventListener\('change'/);
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
 assert.match(css,/\.activity-list > \.special-activity-card\{\s*display:flex;/);
 assert.match(css,/\.activity-list > \.special-activity-card > \.investment-symbol\{[\s\S]*?align-self:center;/);
 assert.match(css,/\.activity-list > \.special-activity-card \.investment-stats,[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.activity-list > \.special-activity-card > \.country-action,[\s\S]*?margin-top:auto;/);
 assert.match(css,/\.activity-list > \.special-activity-card \.investment-actions\{\s*display:flex;/);
 assert.match(html,/Des pots-de-vin pour améliorer les recettes fiscales, au prix d’une corruption accrue/);
});

test('short sensitive investment cards do not stretch to match a taller neighbour',()=>{
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.activity-list\{\s*align-items:start;/);
 assert.match(css,/\.activity-list > \.activity-card\{\s*align-self:start;\s*height:auto;/);
 assert.match(css,/\.activity-list > \.special-activity-card > \.investment-details\{\s*flex:0 0 auto;/);
 assert.match(css,/\.activity-list > \.special-activity-card \.investment-stats,[\s\S]*?margin-top:0;/);
 assert.match(css,/\.activity-list > \.special-activity-card > \.country-action,[\s\S]*?margin-top:0;/);
});

test('all five added purchases reuse historic business metric components and buy-label/price stack',()=>{
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/runtime-anthem-v15/styles.css',import.meta.url),'utf8');
 assert.match(app,/function unifyInvestmentCard\(card,id\)/);
 assert.match(app,/stats\.classList\.add\('activity-effects'\)/);
 assert.match(app,/stats\.replaceChildren\(\.\.\.layout\.map/);
 assert.match(app,/risk\.className='activity-corruption'/);
 assert.match(app,/owned\.className='activity-owned'/);
 assert.match(app,/buy\.classList\.add\('buy-button','special-buy-button'\)/);
 assert.match(app,/function setInvestmentPurchase\(button,label,cost\)/);
 assert.match(app,/price\.className='activity-price'/);
 for(const id of ['import','bureaucracy','bilateral','mobilization','institute']){
   assert.match(app,new RegExp('setInvestmentPurchase\\(\\$\\(\\''+id+'-buy'));
   assert.match(app,new RegExp('id\\+\\'-risk'));
 }
 for(const id of ['import-gross','import-tax','import-net','bureaucracy-agents','bureaucracy-gain','bilateral-count','bilateral-gain','mobilization-benefit','mobilization-capacity','institute-benefit','institute-capacity'])
   assert.ok(app.includes("'"+id+"'"),id);
 assert.match(css,/\.unified-investment-card \.investment-stats > \.activity-metric-net/);
 assert.match(css,/\.unified-investment-card \.investment-stats > \.activity-corruption/);
 assert.match(css,/\.unified-investment-card \.investment-actions > \.special-buy-button/);
});
