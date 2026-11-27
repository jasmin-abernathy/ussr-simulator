import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../web/runtime-tabs-v11/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/runtime-tabs-v11/styles.css',import.meta.url),'utf8');
const section=(start,end)=>{
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,`Expected section markers: ${start}, ${end}`);
 return html.slice(a,b);
};
const work=section('<section class="activity-column" id="production-panel"','<section class="public-column" id="public-panel"');
const publicTab=section('<section class="public-column" id="public-panel"','<section class="world-column" id="world-panel"');

test('five navigation destinations include independent public-finances tab',()=>{
 const nav=section('<nav class="mobile-nav"','</nav>');
 const screens=[...nav.matchAll(/data-screen="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(screens,['home','work','public','world','plan']);
 assert.match(app,/\['home','work','public','world','plan'\]/);
 assert.match(html,/data-screen="public"><span>🏛<\/span>Caisse/);
 assert.match(html,/id="public-panel" aria-labelledby="public-screen-title"/);
});

test('tax policy, budget and every fiscal project exist only in the public tab',()=>{
 assert.match(publicTab,/class="finance-panel"/);
 assert.match(publicTab,/class="public-budget-panel"/);
 for(const id of ['finance-taxes','finance-dividends','public-budget','public-project-services','public-project-solidarity','public-project-crisis']){
  assert.match(publicTab,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(work,new RegExp('id="'+id+'"'));
 }
 for(const policy of ['social','balanced','solidarity'])
  assert.match(publicTab,new RegExp('data-tax-policy="'+policy+'"'));
});

test('work tab still owns enterprise purchases and corruption-sensitive investments',()=>{
 for(const id of ['activity-list','activity-search','investments-corruption','import-buy','bureaucracy-buy'])
  assert.match(work,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(publicTab,/id="activity-list"/);
 assert.match(app,/spendPublicBudget\(state,project\)/);
 assert.match(app,/setTaxPolicy\(state,button\.dataset\.taxPolicy\)/);
});

test('mobile CSS isolates the public tab and keeps five accessible destinations',()=>{
 assert.match(css,/body\[data-screen="work"\] \.public-column/);
 assert.match(css,/body\[data-screen="public"\] \.activity-column/);
 assert.match(css,/body\[data-screen="public"\] \.command-column/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\.mobile-nav button\{min-width:0/);
});

test('save keys and public budget engine data are unchanged by navigation',()=>{
 for(const key of ['ussr-simulator:save:v1','communist-world:world:v1'])
  assert.ok(app.includes(key));
 const engine=readFileSync(new URL('../web/runtime-tabs-v11/engine.js',import.meta.url),'utf8');
 assert.match(engine,/publicBudget: 0/);
 assert.match(engine,/export function spendPublicBudget/);
});
