import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,clickProduce,exportState,hydrateState,STAKHANOV_COMMUNISM_COST} from '../web/runtime-anthem-v15/engine.js';
const NOW=1700000000000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('Stakhanovist clicks earn roubles and progressively decrease communism without going negative',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=1;
 assert.equal(STAKHANOV_COMMUNISM_COST,.05);
 for(let i=0;i<10;i++){const result=clickProduce(s);assert.ok(result.earned>0);close(result.communismLost,.05);}
 close(s.communism,.5);
 for(let i=0;i<20;i++)clickProduce(s);
 assert.equal(s.communism,0);
 assert.equal(clickProduce(s).communismLost,0);
 assert.equal(s.clicks,31);
});
test('Stakhanovist political losses survive save and reload even below bonuses earned by owned activities',()=>{
 const s=createState(NOW);s.worldEconomyEnabled=true;s.communism=1;s.owned.matches=5;
 clickProduce(s);clickProduce(s);clickProduce(s);
 close(s.communism,.85);
 const saved=exportState(s,NOW);
 const loaded=hydrateState(saved,NOW);
 close(loaded.communism,.85);
 assert.equal(loaded.owned.matches,5);
 assert.equal(loaded.clicks,3);
});
test('legacy non-world engine retains its original click behaviour',()=>{
 const s=createState(NOW);s.communism=2;
 assert.equal(clickProduce(s).communismLost,0);
 assert.equal(s.communism,2);
});
test('Stakhanovist terminology, cost visibility and prior commentary are displayed',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 assert.match(html,/>Stakhanovisme</);
 assert.match(html,/>Pousser la production</);
 assert.match(html,/−0,05 communisme \/ clic/);
 assert.match(html,/Le camarade Stakhanov approuverait/);
 assert.match(html,/Tes entreprises renforcent légèrement ton effort et continuent de rapporter sans toi/);
});
