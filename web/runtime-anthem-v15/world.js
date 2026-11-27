import {getCommunismPerMinute,applyCommunismPenalty} from './engine.js?v=2026-11-27-politics-cost-1';
import {COUNTRY_GEOGRAPHY} from './world-geography.js?v=2026-11-27-anthem-scaled-1';
import {ADDITIONAL_COUNTRIES,ADDITIONAL_COUNTRY_DATA} from './world-expansion.js?v=2026-11-27-anthem-scaled-1';
// Independent cooperative-world expansion, not part of the 2016 historical engine.
export const INITIAL_COUNTRIES = Object.freeze("France|Europe;Allemagne|Europe;Espagne|Europe;Italie|Europe;Portugal|Europe;Belgique|Europe;Pays-Bas|Europe;Suisse|Europe;Pologne|Europe;Suède|Europe;Norvège|Europe;Grèce|Europe;Ukraine|Europe;Royaume-Uni|Europe;États-Unis|Amérique du Nord;Canada|Amérique du Nord;Mexique|Amérique du Nord;Cuba|Amérique du Nord;Brésil|Amérique du Sud;Argentine|Amérique du Sud;Chili|Amérique du Sud;Colombie|Amérique du Sud;Pérou|Amérique du Sud;Bolivie|Amérique du Sud;Venezuela|Amérique du Sud;Maroc|Afrique;Algérie|Afrique;Sénégal|Afrique;Nigeria|Afrique;Ghana|Afrique;Égypte|Afrique;Kenya|Afrique;Afrique du Sud|Afrique;Russie|Europe et Asie;Turquie|Europe et Asie;Chine|Asie;Inde|Asie;Japon|Asie;Corée du Sud|Asie;Viêt Nam|Asie;Indonésie|Asie;Pakistan|Asie;Bangladesh|Asie;Thaïlande|Asie;Philippines|Asie;Népal|Asie;Iran|Asie;Australie|Océanie;Nouvelle-Zélande|Océanie".split(';').map((line,i)=>{const [name,region]=line.split('|');return Object.freeze({id:String(i),name,region});}));
export const COUNTRIES=Object.freeze([...INITIAL_COUNTRIES,...ADDITIONAL_COUNTRIES]);
const byId=new Map(COUNTRIES.map(c=>[c.id,c]));
export const USA_COUNTRY_ID='14';
export const START_COUNTRIES=Object.freeze(INITIAL_COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID));
export const USA_COOPERATION_COST=50000000;
export const USA_COMMUNISM_THRESHOLD=100000;
/** Fictional cooperation thresholds calibrated for historical traditions,
 * contemporary institutions and game balance, not an opinion poll or forecast.
 * All 49 states are named explicitly; country array position never determines
 * difficulty. See docs/political-difficulty.md for methodology and sources.
 */
export const POLITICAL_DIFFICULTY = Object.freeze({
  "France": Object.freeze({threshold:580,reason:"Gauche et syndicats historiques, mais institutions pluralistes solides."}),
  "Allemagne": Object.freeze({threshold:1450,reason:"Héritage de la RDA et Die Linke, face à une économie sociale de marché ancrée."}),
  "Espagne": Object.freeze({threshold:260,reason:"PCE, Izquierda Unida et mouvements contre l’austérité."}),
  "Italie": Object.freeze({threshold:420,reason:"Héritage du PCI, des syndicats et des coopératives."}),
  "Portugal": Object.freeze({threshold:160,reason:"Révolution des Œillets, PCP et fortes traditions syndicales."}),
  "Belgique": Object.freeze({threshold:810,reason:"PTB/PVDA et syndicats, mais politique de coalition complexe."}),
  "Pays-Bas": Object.freeze({threshold:1320,reason:"Culture de coalition et économie marchande bien installée."}),
  "Suisse": Object.freeze({threshold:1970,reason:"Fédéralisme, démocratie directe et puissant secteur privé."}),
  "Pologne": Object.freeze({threshold:1800,reason:"Mémoire de la période socialiste et institutions conservatrices."}),
  "Suède": Object.freeze({threshold:1240,reason:"État social développé, mais modèle social-démocrate de marché."}),
  "Norvège": Object.freeze({threshold:1430,reason:"Protection sociale étendue et économie pétrolière marchande."}),
  "Grèce": Object.freeze({threshold:210,reason:"Héritage du KKE, de Syriza et des mobilisations sociales."}),
  "Ukraine": Object.freeze({threshold:2700,reason:"Contexte de guerre et grandes contraintes de reconstruction."}),
  "Royaume-Uni": Object.freeze({threshold:1750,reason:"Tradition travailliste, mais institutions financières puissantes."}),
  "États-Unis": Object.freeze({threshold:100000,reason:"Poids financier mondial et institutions fédérales : défi final."}),
  "Canada": Object.freeze({threshold:1720,reason:"Traditions syndicales, fédéralisme et économie marchande."}),
  "Mexique": Object.freeze({threshold:640,reason:"Longue histoire de mobilisations populaires et de politiques sociales."}),
  "Cuba": Object.freeze({threshold:85,reason:"Parti communiste au pouvoir ; coopération internationale à construire."}),
  "Brésil": Object.freeze({threshold:610,reason:"Mouvements syndicaux, PT et fortes disparités régionales."}),
  "Argentine": Object.freeze({threshold:560,reason:"Mobilisations syndicales et histoire de conflits économiques."}),
  "Chili": Object.freeze({threshold:440,reason:"Gauche organisée, héritage d’Allende et mouvements sociaux."}),
  "Colombie": Object.freeze({threshold:510,reason:"Mouvements sociaux et gauche parlementaire, pays fragmenté."}),
  "Pérou": Object.freeze({threshold:350,reason:"Traditions populaires et gauche plurielle, institutions instables."}),
  "Bolivie": Object.freeze({threshold:410,reason:"Héritage du MAS, mais alternance et recomposition politiques en 2025."}),
  "Venezuela": Object.freeze({threshold:650,reason:"Héritage chaviste et fortes tensions politiques et économiques."}),
  "Maroc": Object.freeze({threshold:1500,reason:"Gauche et syndicats présents, institutions monarchiques fortes."}),
  "Algérie": Object.freeze({threshold:750,reason:"Héritage de l’indépendance, intervention publique et mouvements sociaux."}),
  "Sénégal": Object.freeze({threshold:1170,reason:"Mobilisations civiques et pluralisme électoral."}),
  "Nigeria": Object.freeze({threshold:2200,reason:"Fédéralisme, grande diversité et disparités territoriales."}),
  "Ghana": Object.freeze({threshold:1300,reason:"Pluralisme électoral établi et économie mixte."}),
  "Égypte": Object.freeze({threshold:2100,reason:"Poids de l’appareil d’État et espace politique restreint."}),
  "Kenya": Object.freeze({threshold:1690,reason:"Économie régionale dynamique et coalitions politiques mouvantes."}),
  "Afrique du Sud": Object.freeze({threshold:540,reason:"Héritage anti-apartheid, ANC, SACP et syndicats."}),
  "Russie": Object.freeze({threshold:2500,reason:"Héritage soviétique, pouvoir centralisé et obstacles institutionnels."}),
  "Turquie": Object.freeze({threshold:2180,reason:"Mouvement ouvrier historique, forte polarisation et centralisation."}),
  "Chine": Object.freeze({threshold:780,reason:"Parti communiste au pouvoir, mais modèle économique et échelle singuliers."}),
  "Inde": Object.freeze({threshold:1450,reason:"Partis communistes régionaux, fédéralisme et immense diversité."}),
  "Japon": Object.freeze({threshold:3000,reason:"Parti communiste ancien, mais domination conservatrice prolongée."}),
  "Corée du Sud": Object.freeze({threshold:2710,reason:"Syndicalisme actif, contexte sécuritaire et institutions concurrentielles."}),
  "Viêt Nam": Object.freeze({threshold:110,reason:"Parti communiste au pouvoir et longue histoire de planification."}),
  "Indonésie": Object.freeze({threshold:1790,reason:"Héritage anticommuniste et diversité politique et insulaire."}),
  "Pakistan": Object.freeze({threshold:2300,reason:"Institutions puissantes, instabilité et priorités sécuritaires."}),
  "Bangladesh": Object.freeze({threshold:890,reason:"Mobilisations sociales et profondes transformations politiques."}),
  "Thaïlande": Object.freeze({threshold:2050,reason:"Influence militaire et alternances institutionnelles complexes."}),
  "Philippines": Object.freeze({threshold:1600,reason:"Mouvements de gauche, mais élites politiques enracinées."}),
  "Népal": Object.freeze({threshold:280,reason:"Partis communistes importants, mais divisions et recompositions."}),
  "Iran": Object.freeze({threshold:2450,reason:"Institutions religieuses et contrôle politique important."}),
  "Australie": Object.freeze({threshold:2550,reason:"Système parlementaire stable et économie de marché structurée."}),
  "Nouvelle-Zélande": Object.freeze({threshold:1490,reason:"Tradition sociale-démocrate et institutions marchandes stables."}),
  ...Object.fromEntries(Object.entries(ADDITIONAL_COUNTRY_DATA).map(
    ([name,data])=>[name,Object.freeze({threshold:data.threshold,reason:data.reason})]
  )),
});
export function getPoliticalDifficulty(country) {
  const name=typeof country==='string'?country:country?.name;
  return POLITICAL_DIFFICULTY[name]||null;
}
export function rankCountriesByDifficulty(countries) {
  return [...countries].sort((a,b)=>
    getPoliticalDifficulty(a).threshold-getPoliticalDifficulty(b).threshold||
    a.name.localeCompare(b.name,'fr'));
}
/** Geographic campaign: six waves of 30 states, final wave of 15.
 * The origin is the very first country; USA is always at position 195.
 * Bordering countries of the SAME continent come first, then the rest
 * of that continent by distance, then other continents by distance.
 * Distances are approximate great-circle distances between country centers.
 * Different origins yield different deterministic campaigns.
 * Existing save IDs never change, and stage is derived from saved partners.
 */
export const WORLD_WAVE_SIZE=30;
const WAVE_COUNT=Math.ceil(COUNTRIES.length/WORLD_WAVE_SIZE);
const waveCache=new Map();
function greatCircleKm(a,b){
 const radians=Math.PI/180;
 const p1=a[0]*radians,p2=b[0]*radians;
 const dp=(b[0]-a[0])*radians,dl=(b[1]-a[1])*radians;
 const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function getCampaign(origin){
 if(!byId.has(origin))return null;
 if(waveCache.has(origin))return waveCache.get(origin);
 const start=COUNTRY_GEOGRAPHY[origin];
 const others=COUNTRIES.filter(c=>c.id!==origin&&c.id!==USA_COUNTRY_ID);
 const score=c=>{
  const geo=COUNTRY_GEOGRAPHY[c.id];
  const sameContinent=start[2]===geo[2];
  const landNeighbor=sameContinent&&(start[4].includes(geo[3])||geo[4].includes(start[3]));
  return [landNeighbor?0:sameContinent?1:2,greatCircleKm(start,geo)];
 };
 others.sort((a,b)=>{
  const left=score(a),right=score(b);
  return left[0]-right[0]||left[1]-right[1]||a.name.localeCompare(b.name,'fr');
 });
 const order=[byId.get(origin),...others,byId.get(USA_COUNTRY_ID)];
 const waves=[];
 const byWave=new Map();
 for(let offset=0;offset<order.length;offset+=WORLD_WAVE_SIZE){
  const current=Object.freeze(order.slice(offset,offset+WORLD_WAVE_SIZE));
  waves.push(current);
  for(const c of current)byWave.set(c.id,waves.length);
 }
 const result={order:Object.freeze(order),waves:Object.freeze(waves),byWave};
 waveCache.set(origin,result);
 return result;
}
export function getCampaignOrder(world){
 return getCampaign(world?.origin)?.order||[];
}
export function getCampaignWaves(world){
 return getCampaign(world?.origin)?.waves||[];
}
export function getCountryWave(world,id){
 return getCampaign(world?.origin)?.byWave.get(id)||null;
}
export function getWorldStage(world){
 if(!world?.origin)return 0;
 const joined=new Set(world.partners||[]);
 const waves=getCampaignWaves(world);
 for(let i=0;i<waves.length;i++){
  if(waves[i].some(c=>c.id!==world.origin&&!joined.has(c.id)))return i+1;
 }
 return waves.length+1; // 8 = victory across 195 countries
}
export function isCountryVisible(world,id){
 if(!byId.has(id)||!world?.origin)return false;
 const stage=getWorldStage(world),wave=getCountryWave(world,id);
 if(!wave)return false;
 if(id===USA_COUNTRY_ID){
  return stage>WAVE_COUNT||COUNTRIES.every(c=>
    c.id===USA_COUNTRY_ID||c.id===world.origin||world.partners.includes(c.id));
 }
 return wave<=stage||id===world.origin||world.partners.includes(id);
}
export function getVisibleCountries(world){
 const ordered=getCampaignOrder(world);
 return ordered.filter(c=>isCountryVisible(world,c.id));
}
export const MILESTONES=Object.freeze([[5,"Premier collectif créé : chaque geste compte !"],[25,"La solidarité s'organise : garde le cap !"],[100,"Ton économie coopérative trouve son élan !"],[250,"Les premières initiatives commencent à transformer le quotidien !"],[500,"De nouveaux possibles s'ouvrent à toi !"],[1000,"La coopération traverse les frontières !"],[2500,"Les solidarités se renforcent sur plusieurs continents !"],[5000,"Ton projet commun prend une dimension internationale !"],[10000,"Une fédération de coopérations se dessine. Bravo !"],[25000,"Les solidarités se multiplient : un autre monde se construit !"],[50000,"De pays en pays, les initiatives convergent !"]].map(([threshold,message])=>({threshold,message})));
export const ANTHEM_BONUS=3;
export const createWorld=()=>({version:1,origin:null,partners:[],celebrated:[],usImports:0,bilateral:[]});
export function hydrateWorld(raw){
  const w=createWorld();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return w;
  if(typeof raw.origin==='string'&&START_COUNTRIES.some(c=>c.id===raw.origin))w.origin=raw.origin;
  if(w.origin&&Array.isArray(raw.partners))w.partners=[...new Set(raw.partners.filter(x=>typeof x==='string'&&byId.has(x)&&x!==w.origin))];
  if(Number.isSafeInteger(raw.usImports)&&raw.usImports>=0&&raw.usImports<=10000)w.usImports=raw.usImports;
  if(Array.isArray(raw.bilateral))w.bilateral=[...new Set(raw.bilateral.filter(id=>typeof id==='string'&&byId.has(id)&&id!==w.origin&&!w.partners.includes(id)))];
  if(Array.isArray(raw.celebrated))w.celebrated=[...new Set(raw.celebrated.filter(x=>Number.isInteger(x)&&MILESTONES.some(m=>m.threshold===x)))];
  return w;
}
export function chooseCountry(w,id){if(w.origin||!START_COUNTRIES.some(c=>c.id===id))return {ok:false};w.origin=id;return {ok:true,country:byId.get(id)};}
export function getCooperation(w,state,id){
  const c=byId.get(id);if(!c)return null;
  const index=Number(id);
  const political=getPoliticalDifficulty(c);
  const threshold=political.threshold;
  const baseCost=id===USA_COUNTRY_ID?USA_COOPERATION_COST:Math.round((1500+threshold*6.5)/50)*50;
  const cost=Math.ceil(baseCost*(1-Math.min(.40,(state.internationalAidLevel||0)*.05)));
  const joined=w.partners.includes(id),home=w.origin===id;
  const unlocked=home||joined||isCountryVisible(w,id);
  const confidence=state.communism<=0?(state.corruption>0?0:1):state.communism/(state.communism+Math.max(0,state.corruption||0));
  const confidenceRequired=.85;
  const confidenceOk=confidence>=confidenceRequired;
  return {...c,threshold,cost,politicalContext:political.reason,stage:getCountryWave(w,id),unlocked,joined,home,confidence,confidenceRequired,confidenceOk,productionBonus:10+index*3,taxesBonus:5+index*2,communismBonus:5+Math.floor(index/3),available:Boolean(w.origin)&&unlocked&&!home&&!joined&&state.communism>=threshold&&confidenceOk&&state.cash>=cost};
}
export function cooperate(w,state,id){
  const c=getCooperation(w,state,id);if(!w.origin||!c||c.home||c.joined)return {ok:false,reason:"unavailable"};
  if(!c.unlocked)return {ok:false,reason:"stage-locked"};
  if(state.communism<c.threshold)return {ok:false,reason:"locked"};
  if(!c.confidenceOk)return {ok:false,reason:"corruption"};
  if(state.cash<c.cost)return {ok:false,reason:"funds"};
  state.cash-=c.cost;state.counters.production+=c.productionBonus;state.counters.taxes+=c.taxesBonus;state.communism+=c.communismBonus;
  w.partners.push(id);
  if(w.bilateral.includes(id)){
    w.bilateral=w.bilateral.filter(x=>x!==id);
    state.bilateralAgreements=w.bilateral.length;
  }
  if(id===USA_COUNTRY_ID)state.usCapitalist=false;
  return {ok:true,country:c};
}
/** Cooperation price ascending, including solidarity-level discounts.
 * Geographic waves govern visibility, never card ordering.
 */
export function rankCountriesByCooperationCost(world,state,countries=COUNTRIES){
 return [...countries].sort((a,b)=>{
  const left=getCooperation(world,state,a.id)?.cost??Infinity;
  const right=getCooperation(world,state,b.id)?.cost??Infinity;
  return left-right||a.name.localeCompare(b.name,'fr');
 });
}

export function getWorldStats(w){
 const partners=w.partners.filter(x=>byId.has(x)&&x!==w.origin);
 const joined=new Set(partners);
 const regions=new Set([...(w.origin?[byId.get(w.origin).region]:[]),...partners.map(id=>byId.get(id).region)]);
 const initialJoined=INITIAL_COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID&&(c.id===w.origin||joined.has(c.id))).length;
 const stage=getWorldStage(w);
 const waves=getCampaignWaves(w);
 const wave=waves[Math.min(stage, waves.length)-1]||[];
 const waveJoined=wave.filter(c=>c.id===w.origin||joined.has(c.id)).length;
 return {origin:w.origin?byId.get(w.origin):null,partners:partners.length,regions:regions.size,
 stage,initialJoined,initialTotal:48,totalJoined:partners.length+(w.origin?1:0),
 worldTotal:COUNTRIES.length,waveNumber:Math.min(stage,waves.length),
 waveCount:waves.length,waveTotal:wave.length,waveJoined,
 waveRemaining:wave.length-waveJoined};
}
export function celebrate(w,points){const result=[];for(const m of MILESTONES)if(points>=m.threshold&&!w.celebrated.includes(m.threshold)){w.celebrated.push(m.threshold);result.push(m);}return result;}

/** Call only when the audio element fires its natural "ended" event.
 * Pausing or starting the recording earns nothing. A full new listen earns
 * the same reward again with no cooldown or daily limit.
 */
/** The anthem stays valuable when industrial communism surpasses +3/min.
 * The reward is determined at actual playback completion, and never
 * decreases below the original +3. The bonus is half the passive rate,
 * rounded up, so replaying the song does not overwhelm progression.
 */
export function getAnthemReward(state){
 const rate=getCommunismPerMinute(state);
 return Math.max(ANTHEM_BONUS,Math.ceil((Number.isFinite(rate)?rate:0)*.5));
}
export function rewardAnthem(world,state){
 if(!world.origin)return {ok:false,reason:'choose-origin'};
 const points=getAnthemReward(state);
 const previous=Math.max(0,state.communism);
 state.communism=Math.min(1e100,previous+points);
 return {ok:true,points:state.communism-previous};
}

/** Additional trade, independent of the 22 historical activity definitions. */
export function getUSImportOffer(w,state){
 const count=w.usImports||0;
 const cost=Math.round(35000*Math.pow(1.18,count));
 const capitalist=!w.partners.includes(USA_COUNTRY_ID);
 return {count,cost,capitalist,corruptionPerMinute:capitalist?0.15:0,corruptionOnPurchase:capitalist?5:0,communismPenalty:capitalist?5:0,
 available:count<10000&&state.cash>=cost&&state.communism>=150};
}
export function buyUSImports(w,state){
 const offer=getUSImportOffer(w,state);
 if(!offer.available)return {ok:false,reason:state.communism<150?'locked':'funds'};
 state.cash-=offer.cost;
 if(offer.capitalist)state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 const communismLost=applyCommunismPenalty(state,offer.communismPenalty);
 w.usImports+=1;state.importsOwned=w.usImports;
 return {ok:true,spent:offer.cost,offer,communismLost};
}

/** Keep the partner-world import count consistent with the economic save.
 * Conversion is one-for-one, never cashes out an establishment.
 * Conversion logic is injected by the caller so the world module remains
 * independent of the economic engine and circular imports are avoided.
 */
export function convertUSImports(w,state,targetId,convert){
 if(!w||!state||!Number.isSafeInteger(w.usImports)||w.usImports<1||
    w.usImports!==state.importsOwned||typeof convert!=='function')
   return {ok:false,reason:'not-owned'};
 const result=convert(state,'us-imports',targetId);
 if(result.ok)w.usImports=state.importsOwned;
 return result;
}

/** Compromises are separate investments, not additions to the 22 factories.
 * Bilateral arrangements are available only with countries that are not
 * yet cooperative partners. Their ongoing corruption ends on conversion.
 */
export function getBureaucracyOffer(state){
 const count=state.bureaucracyOffices||0;
 const cost=Math.round(1200*Math.pow(1.32,count));
 return {count,cost,corruptionOnPurchase:2,corruptionPerMinute:0.09,communismPenalty:4,
  collectionBonusPercent:2,available:count<1000&&state.communism>=25&&state.cash>=cost};
}
export function buyBureaucracy(state){
 const offer=getBureaucracyOffer(state);
 if(!offer.available)return {ok:false,reason:state.communism<25?'locked':'funds'};
 state.cash-=offer.cost;
 state.bureaucracyOffices+=1;
 state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 const communismLost=applyCommunismPenalty(state,offer.communismPenalty);
 return {ok:true,offer,communismLost};
}
export function getBilateralOffer(world,state,id){
 const country=byId.get(id);
 if(!country||!world.origin||!isCountryVisible(world,id)||id===world.origin||world.partners.includes(id))return null;
 const signed=world.bilateral.includes(id);
 const cost=4500+Number(id)*350;
 return {...country,cost,signed,corruptionOnPurchase:4,corruptionPerMinute:0.10,communismPenalty:6,
  businessIncomeBonusPercent:1,
  available:!signed&&state.cash>=cost&&state.communism>=100};
}
export function buyBilateralAgreement(world,state,id){
 const offer=getBilateralOffer(world,state,id);
 if(!offer||offer.signed)return {ok:false,reason:'unavailable'};
 if(!offer.available)return {ok:false,reason:state.communism<100?'locked':'funds'};
 state.cash-=offer.cost;
 world.bilateral.push(id);
 state.bilateralAgreements=world.bilateral.length;
 state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 const communismLost=applyCommunismPenalty(state,offer.communismPenalty);
 return {ok:true,country:offer,communismLost};
}
