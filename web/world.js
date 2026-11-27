// Independent cooperative-world expansion, not part of the 2016 historical engine.
export const COUNTRIES = Object.freeze("France|Europe;Allemagne|Europe;Espagne|Europe;Italie|Europe;Portugal|Europe;Belgique|Europe;Pays-Bas|Europe;Suisse|Europe;Pologne|Europe;Suède|Europe;Norvège|Europe;Grèce|Europe;Ukraine|Europe;Royaume-Uni|Europe;États-Unis|Amérique du Nord;Canada|Amérique du Nord;Mexique|Amérique du Nord;Cuba|Amérique du Nord;Brésil|Amérique du Sud;Argentine|Amérique du Sud;Chili|Amérique du Sud;Colombie|Amérique du Sud;Pérou|Amérique du Sud;Bolivie|Amérique du Sud;Venezuela|Amérique du Sud;Maroc|Afrique;Algérie|Afrique;Sénégal|Afrique;Nigeria|Afrique;Ghana|Afrique;Égypte|Afrique;Kenya|Afrique;Afrique du Sud|Afrique;Russie|Europe et Asie;Turquie|Europe et Asie;Chine|Asie;Inde|Asie;Japon|Asie;Corée du Sud|Asie;Viêt Nam|Asie;Indonésie|Asie;Pakistan|Asie;Bangladesh|Asie;Thaïlande|Asie;Philippines|Asie;Népal|Asie;Iran|Asie;Australie|Océanie;Nouvelle-Zélande|Océanie".split(';').map((line,i)=>{const [name,region]=line.split('|');return Object.freeze({id:String(i),name,region});}));
const byId=new Map(COUNTRIES.map(c=>[c.id,c]));
export const USA_COUNTRY_ID='14';
export const START_COUNTRIES=Object.freeze(COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID));
export const USA_COOPERATION_COST=50000000;
export const USA_COMMUNISM_THRESHOLD=100000;
export const MILESTONES=Object.freeze([[5,"Premier collectif créé : chaque geste compte !"],[25,"La solidarité s'organise : garde le cap !"],[100,"Ton économie coopérative trouve son élan !"],[250,"Les premières initiatives commencent à transformer le quotidien !"],[500,"De nouveaux possibles s'ouvrent à toi !"],[1000,"La coopération traverse les frontières !"],[2500,"Les solidarités se renforcent sur plusieurs continents !"],[5000,"Ton projet commun prend une dimension internationale !"],[10000,"Une fédération de coopérations se dessine. Bravo !"],[25000,"Les solidarités se multiplient : un autre monde se construit !"],[50000,"De pays en pays, les initiatives convergent !"]].map(([threshold,message])=>({threshold,message})));
export const ANTHEM_BONUS=3;
export const createWorld=()=>({version:1,origin:null,partners:[],celebrated:[],usImports:0});
export function hydrateWorld(raw){
  const w=createWorld();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return w;
  if(typeof raw.origin==='string'&&byId.has(raw.origin))w.origin=raw.origin;
  if(w.origin&&Array.isArray(raw.partners))w.partners=[...new Set(raw.partners.filter(x=>typeof x==='string'&&byId.has(x)&&x!==w.origin))];
  if(Number.isSafeInteger(raw.usImports)&&raw.usImports>=0&&raw.usImports<=10000)w.usImports=raw.usImports;
  if(Array.isArray(raw.celebrated))w.celebrated=[...new Set(raw.celebrated.filter(x=>Number.isInteger(x)&&MILESTONES.some(m=>m.threshold===x)))];
  return w;
}
export function chooseCountry(w,id){if(id===USA_COUNTRY_ID||w.origin||!byId.has(id))return {ok:false};w.origin=id;return {ok:true,country:byId.get(id)};}
export function getCooperation(w,state,id){
  const c=byId.get(id);if(!c)return null;
  const index=Number(id),threshold=id===USA_COUNTRY_ID?USA_COMMUNISM_THRESHOLD:50+index*75,cost=id===USA_COUNTRY_ID?USA_COOPERATION_COST:1500+index*650;
  const joined=w.partners.includes(id),home=w.origin===id;
  return {...c,threshold,cost,joined,home,productionBonus:10+index*3,taxesBonus:5+index*2,communismBonus:5+Math.floor(index/3),available:Boolean(w.origin)&&!home&&!joined&&state.communism>=threshold&&state.cash>=cost};
}
export function cooperate(w,state,id){
  const c=getCooperation(w,state,id);if(!w.origin||!c||c.home||c.joined)return {ok:false,reason:"unavailable"};
  if(state.communism<c.threshold)return {ok:false,reason:"locked"};
  if(state.cash<c.cost)return {ok:false,reason:"funds"};
  state.cash-=c.cost;state.counters.production+=c.productionBonus;state.counters.taxes+=c.taxesBonus;state.communism+=c.communismBonus;
  w.partners.push(id);
  if(id===USA_COUNTRY_ID)state.usCapitalist=false;
  return {ok:true,country:c};
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

/** Additional trade, independent of the 22 historical activity definitions. */
export function getUSImportOffer(w,state){
 const count=w.usImports||0;
 const cost=Math.round(35000*Math.pow(1.18,count));
 const capitalist=!w.partners.includes(USA_COUNTRY_ID);
 return {count,cost,capitalist,taxesPerSecond:60,revenuePerSecond:90,corruptionOnPurchase:capitalist?5:0,
 available:count<10000&&state.cash>=cost&&state.communism>=150};
}
export function buyUSImports(w,state){
 const offer=getUSImportOffer(w,state);
 if(!offer.available)return {ok:false,reason:state.communism<150?'locked':'funds'};
 state.cash-=offer.cost;
 state.counters.taxes=Math.min(1e100,state.counters.taxes+offer.taxesPerSecond);
 if(offer.capitalist)state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 w.usImports+=1;state.importsOwned=w.usImports;
 return {ok:true,spent:offer.cost,offer};
}
