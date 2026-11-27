import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 createState,hydrateState,exportState,advance,
 publicProjectOffers,spendPublicBudget,
 corruptionPerMinute,corruptionGrossPerMinute,getCorruptionBreakdown,
 TRANSPARENCY_PREVENTION_PER_HOUSE,INSPECTORATE_FLOW_REDUCTION_PER_UNIT
} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
const world=()=>{const s=createState(NOW);s.worldEconomyEnabled=true;s.publicBudget=1e9;s.owned.matches=12;return s;};
test('transparency houses reduce incoming corruption, not existing corruption',()=>{
 const s=world();
 close(corruptionGrossPerMinute(s),.72);
 close(corruptionPerMinute(s),.72);
 assert.equal(TRANSPARENCY_PREVENTION_PER_HOUSE,.10);
 assert.equal(publicProjectOffers(s).transparency.cost,480);
 const budget=s.publicBudget;
 assert.equal(spendPublicBudget(s,'transparency').ok,true);
 assert.equal(s.publicBudget,budget-480);
 assert.equal(s.transparencyHouses,1);
 close(getCorruptionBreakdown(s).prevention,.10);
 close(corruptionPerMinute(s),.72*.9);
 s.corruption=2;
 advance(s,NOW+60000);
 close(s.corruption,2+.72*.9);
});
test('citizen inspectorates reduce the incoming flow proportionally without erasing accumulated corruption offline',()=>{
 const s=world();s.corruption=2;
 assert.equal(INSPECTORATE_FLOW_REDUCTION_PER_UNIT,.05);
 assert.equal(publicProjectOffers(s).inspectorates.cost,700);
 assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 close(getCorruptionBreakdown(s).inspectorateReduction,.05);
 close(getCorruptionBreakdown(s).net,.72*.95);
 const restored=hydrateState(exportState(s,NOW),NOW+60000);
 assert.equal(restored.citizensInspectorates,1);
 close(restored.corruption,2+.72*.95);
});
test('with no new corruption generated, even a dozen inspectorates cannot passively reduce the old stock',()=>{
 const s=world();s.owned.matches=0;s.corruption=12;
 for(let i=0;i<12;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 close(corruptionPerMinute(s),0);
 const restored=hydrateState(exportState(s,NOW),NOW+3600000);
 close(restored.corruption,12);
});
test('both programs complement each other and never make passive corruption shrink',()=>{
 const s=world();s.corruption=5;
 for(let i=0;i<4;i++)assert.equal(spendPublicBudget(s,'transparency').ok,true);
 for(let i=0;i<2;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 const breakdown=getCorruptionBreakdown(s);
 close(breakdown.prevention,.40);
 close(breakdown.inspectorateReduction,.10);
 close(breakdown.net,.72*.6*.9);
 advance(s,NOW+60000);
 assert.ok(s.corruption>5);
});
test('at maximum institutional investment at least 16 percent of generated corruption remains',()=>{
 const s=world();s.corruption=20;
 for(let i=0;i<6;i++)assert.equal(spendPublicBudget(s,'transparency').ok,true);
 for(let i=0;i<12;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 const breakdown=getCorruptionBreakdown(s);
 close(breakdown.prevention,.60);
 close(breakdown.inspectorateReduction,.60);
 close(breakdown.net,.72*.16);
 assert.ok(breakdown.net>0);
 const t=s.corruption;
 advance(s,NOW+60000);
 assert.ok(s.corruption>t);
 assert.equal(publicProjectOffers(s).transparency.locked,true);
 assert.equal(publicProjectOffers(s).inspectorates.locked,true);
});
test('limits and unavailable budget reject purchases without changing stored levels',()=>{
 const s=world();s.publicBudget=0;
 assert.equal(spendPublicBudget(s,'transparency').reason,'funds');
 assert.equal(s.transparencyHouses,0);
 s.publicBudget=1e9;
 for(let i=0;i<6;i++)assert.equal(spendPublicBudget(s,'transparency').ok,true);
 assert.equal(spendPublicBudget(s,'transparency').reason,'locked');
 for(let i=0;i<12;i++)assert.equal(spendPublicBudget(s,'inspectorates').ok,true);
 assert.equal(spendPublicBudget(s,'inspectorates').reason,'locked');
 const saved=hydrateState(exportState(s,NOW),NOW);
 assert.equal(saved.transparencyHouses,6);
 assert.equal(saved.citizensInspectorates,12);
});
test('older save files have zero anticorruption institutions by default',()=>{
 const s=world();const raw=exportState(s,NOW);
 delete raw.transparencyHouses;delete raw.citizensInspectorates;
 const restored=hydrateState(raw,NOW);
 assert.equal(restored.transparencyHouses,0);
 assert.equal(restored.citizensInspectorates,0);
 close(corruptionPerMinute(restored),corruptionGrossPerMinute(restored));
});
test('public budget cards and integrity status are wired through the live UI',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 assert.match(html,/id="public-project-transparency"/);
 assert.match(html,/id="public-project-inspectorates"/);
 assert.match(html,/id="public-integrity-status"/);
 assert.doesNotMatch(html,/Font diminuer la corruption existante en continu/);
 assert.match(app,/stats.corruptionBreakdown/);
 assert.match(app,/for\(const project of \['services','solidarity','crisis','transport','housing','audit','maintenance','needs','transparency','inspectorates'\]\)/);
});
