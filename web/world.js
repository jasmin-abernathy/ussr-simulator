// Independent cooperative-world expansion, not part of the 2016 historical engine.
export const COUNTRIES = Object.freeze("France|Europe;Allemagne|Europe;Espagne|Europe;Italie|Europe;Portugal|Europe;Belgique|Europe;Pays-Bas|Europe;Suisse|Europe;Pologne|Europe;Suède|Europe;Norvège|Europe;Grèce|Europe;Ukraine|Europe;Royaume-Uni|Europe;États-Unis|Amérique du Nord;Canada|Amérique du Nord;Mexique|Amérique du Nord;Cuba|Amérique du Nord;Brésil|Amérique du Sud;Argentine|Amérique du Sud;Chili|Amérique du Sud;Colombie|Amérique du Sud;Pérou|Amérique du Sud;Bolivie|Amérique du Sud;Venezuela|Amérique du Sud;Maroc|Afrique;Algérie|Afrique;Sénégal|Afrique;Nigeria|Afrique;Ghana|Afrique;Égypte|Afrique;Kenya|Afrique;Afrique du Sud|Afrique;Russie|Europe et Asie;Turquie|Europe et Asie;Chine|Asie;Inde|Asie;Japon|Asie;Corée du Sud|Asie;Viêt Nam|Asie;Indonésie|Asie;Pakistan|Asie;Bangladesh|Asie;Thaïlande|Asie;Philippines|Asie;Népal|Asie;Iran|Asie;Australie|Océanie;Nouvelle-Zélande|Océanie".split(';').map((line,i)=>{const [name,region]=line.split('|');return Object.freeze({id:String(i),name,region});}));
const byId=new Map(COUNTRIES.map(c=>[c.id,c]));
export const MILESTONES=Object.freeze([[5,"Premier collectif créé : chaque geste compte !"],[25,"La solidarité s'organise : garde le cap !"],[100,"Ton économie coopérative trouve son élan !"],[250,"Les premières initiatives commencent à transformer le quotidien !"],[500,"De nouveaux possibles s'ouvrent à toi !"],[1000,"La coopération traverse les frontières !"],[2500,"Les solidarités se renforcent sur plusieurs continents !"],[5000,"Ton projet commun prend une dimension internationale !"],[10000,"Une fédération de coopérations se dessine. Bravo !"],[25000,"Les solidarités se multiplient : un autre monde se construit !"],[50000,"De pays en pays, les initiatives convergent !"]].map(([threshold,message])=>({threshold,message})));
export const ANTHEM_BONUS=3;
export const createWorld=()=>({version:1,origin:null,partners:[],celebrated:[]});
export function hydrateWorld(raw){
  const w=createWorld();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return w;
  if(typeof raw.origin==='string'&&byId.has(raw.origin))w.origin=raw.origin;
  if(w.origin&&Array.isArray(raw.partners))w.partners=[...new Set(raw.partners.filter(x=>typeof x==='string'&&byId.has(x)&&x!==w.origin))];
  if(Array.isArray(raw.celebrated))w.celebrated=[...new Set(raw.celebrated.filter(x=>Number.isInteger(x)&&MILESTONES.some(m=>m.threshold===x)))];
  return w;
}
export function chooseCountry(w,id){if(w.origin||!byId.has(id))return {ok:false};w.origin=id;return {ok:true,country:byId.get(id)};}
export function getCooperation(w,state,id){
  const c=byId.get(id);if(!c)return null;
  const index=Number(id),threshold=50+index*75,cost=1500+index*650;
  const joined=w.partners.includes(id),home=w.origin===id;
  return {...c,threshold,cost,joined,home,productionBonus:10+index*3,taxesBonus:5+index*2,communismBonus:5+Math.floor(index/3),available:Boolean(w.origin)&&!home&&!joined&&state.communism>=threshold&&state.cash>=cost};
}
export function cooperate(w,state,id){
  const c=getCooperation(w,state,id);if(!w.origin||!c||c.home||c.joined)return {ok:false,reason:"unavailable"};
  if(state.communism<c.threshold)return {ok:false,reason:"locked"};
  if(state.cash<c.cost)return {ok:false,reason:"funds"};
  state.cash-=c.cost;state.counters.production+=c.productionBonus;state.counters.taxes+=c.taxesBonus;state.communism+=c.communismBonus;
  w.partners.push(id);return {ok:true,country:c};
}
export function getWorldStats(w){const partners=w.partners.filter(x=>byId.has(x)&&x!==w.origin);const regions=new Set([...(w.origin?[byId.get(w.origin).region]:[]),...partners.map(id=>byId.get(id).region)]);return {origin:w.origin?byId.get(w.origin):null,partners:partners.length,regions:regions.size};}
export function celebrate(w,points){const result=[];for(const m of MILESTONES)if(points>=m.threshold&&!w.celebrated.includes(m.threshold)){w.celebrated.push(m.threshold);result.push(m);}return result;}

/** Call only when the audio element fires its natural "ended" event.
 * Pausing or starting the recording earns nothing. A full new listen earns
 * the same reward again with no cooldown or daily limit.
 */
export function rewardAnthem(world,state){
  if(!world.origin)return {ok:false,reason:'choose-origin'};
  state.communism=Math.min(1e100,Math.max(0,state.communism)+ANTHEM_BONUS);
  return {ok:true,points:ANTHEM_BONUS};
}
