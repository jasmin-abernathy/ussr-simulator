import {ADDITIONAL_COUNTRIES,ADDITIONAL_COUNTRY_DATA} from './world-expansion.js?v=2026-11-27-global-wave-1';
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
/** The cooperation campaign has 4 steps. No migration needed: stage derives
 * from the original saved origin and partner IDs, which remain unchanged.
 * Stage 1: initial 48 excluding USA; 2: 146 additional countries; 3: USA.
 */
export function getWorldStage(world){
 if(!world?.origin)return 0;
 const joined=new Set(world.partners||[]);
 if(!INITIAL_COUNTRIES.every(c=>c.id===USA_COUNTRY_ID||c.id===world.origin||joined.has(c.id)))return 1;
 if(!COUNTRIES.every(c=>c.id===USA_COUNTRY_ID||c.id===world.origin||joined.has(c.id)))return 2;
 return joined.has(USA_COUNTRY_ID)?4:3;
}
export function isCountryVisible(world,id){
 const country=byId.get(id);
 if(!country||!world?.origin)return false;
 const stage=getWorldStage(world);
 if(id===USA_COUNTRY_ID)return stage>=3;
 return Number(id)<INITIAL_COUNTRIES.length||stage>=2;
}
export function getVisibleCountries(world){
 return COUNTRIES.filter(c=>isCountryVisible(world,c.id));
}
export const MILESTONES=Object.freeze([[5,"Premier collectif créé : chaque geste compte !"],[25,"La solidarité s'organise : garde le cap !"],[100,"Ton économie coopérative trouve son élan !"],[250,"Les premières initiatives commencent à transformer le quotidien !"],[500,"De nouveaux possibles s'ouvrent à toi !"],[1000,"La coopération traverse les frontières !"],[2500,"Les solidarités se renforcent sur plusieurs continents !"],[5000,"Ton projet commun prend une dimension internationale !"],[10000,"Une fédération de coopérations se dessine. Bravo !"],[25000,"Les solidarités se multiplient : un autre monde se construit !"],[50000,"De pays en pays, les initiatives convergent !"]].map(([threshold,message])=>({threshold,message})));
export const ANTHEM_BONUS=3;
export const createWorld=()=>({version:1,origin:null,partners:[],celebrated:[],usImports:0,bilateral:[]});
export function hydrateWorld(raw){
  const w=createWorld();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return w;
  if(typeof raw.origin==='string'&&byId.has(raw.origin))w.origin=raw.origin;
  if(w.origin&&Array.isArray(raw.partners))w.partners=[...new Set(raw.partners.filter(x=>typeof x==='string'&&byId.has(x)&&x!==w.origin))];
  if(Number.isSafeInteger(raw.usImports)&&raw.usImports>=0&&raw.usImports<=10000)w.usImports=raw.usImports;
  if(Array.isArray(raw.bilateral))w.bilateral=[...new Set(raw.bilateral.filter(id=>typeof id==='string'&&byId.has(id)&&id!==w.origin&&!w.partners.includes(id)))];
  if(Array.isArray(raw.celebrated))w.celebrated=[...new Set(raw.celebrated.filter(x=>Number.isInteger(x)&&MILESTONES.some(m=>m.threshold===x)))];
  return w;
}
export function chooseCountry(w,id){if(id===USA_COUNTRY_ID||w.origin||!byId.has(id))return {ok:false};w.origin=id;return {ok:true,country:byId.get(id)};}
export function getCooperation(w,state,id){
  const c=byId.get(id);if(!c)return null;
  const index=Number(id);
  const political=getPoliticalDifficulty(c);
  const threshold=political.threshold;
  const cost=id===USA_COUNTRY_ID?USA_COOPERATION_COST:Math.round((1500+threshold*6.5)/50)*50;
  const joined=w.partners.includes(id),home=w.origin===id;
  const unlocked=home||joined||isCountryVisible(w,id);
  return {...c,threshold,cost,politicalContext:political.reason,stage:id===USA_COUNTRY_ID?3:ADDITIONAL_COUNTRY_DATA[c.name]?2:1,unlocked,joined,home,productionBonus:10+index*3,taxesBonus:5+index*2,communismBonus:5+Math.floor(index/3),available:Boolean(w.origin)&&unlocked&&!home&&!joined&&state.communism>=threshold&&state.cash>=cost};
}
export function cooperate(w,state,id){
  const c=getCooperation(w,state,id);if(!w.origin||!c||c.home||c.joined)return {ok:false,reason:"unavailable"};
  if(!c.unlocked)return {ok:false,reason:"stage-locked"};
  if(state.communism<c.threshold)return {ok:false,reason:"locked"};
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
export function getWorldStats(w){
 const partners=w.partners.filter(x=>byId.has(x)&&x!==w.origin);
 const regions=new Set([...(w.origin?[byId.get(w.origin).region]:[]),...partners.map(id=>byId.get(id).region)]);
 const initialJoined=INITIAL_COUNTRIES.filter(c=>c.id!==USA_COUNTRY_ID&&(c.id===w.origin||partners.includes(c.id))).length;
 return {origin:w.origin?byId.get(w.origin):null,partners:partners.length,regions:regions.size,
 stage:getWorldStage(w),initialJoined,initialTotal:48,
 totalJoined:partners.length+(w.origin?1:0),worldTotal:COUNTRIES.length,secondWaveTotal:ADDITIONAL_COUNTRIES.length};
}
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
 return {count,cost,capitalist,corruptionPerMinute:capitalist?0.35:0,corruptionOnPurchase:capitalist?5:0,
 available:count<10000&&state.cash>=cost&&state.communism>=150};
}
export function buyUSImports(w,state){
 const offer=getUSImportOffer(w,state);
 if(!offer.available)return {ok:false,reason:state.communism<150?'locked':'funds'};
 state.cash-=offer.cost;
 if(offer.capitalist)state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 w.usImports+=1;state.importsOwned=w.usImports;
 return {ok:true,spent:offer.cost,offer};
}

/** Compromises are separate investments, not additions to the 22 factories.
 * Bilateral arrangements are available only with countries that are not
 * yet cooperative partners. Their ongoing corruption ends on conversion.
 */
export function getBureaucracyOffer(state){
 const count=state.bureaucracyOffices||0;
 const cost=Math.round(1200*Math.pow(1.32,count));
 return {count,cost,corruptionOnPurchase:2,corruptionPerMinute:0.08,
  collectionBonusPercent:2,available:count<1000&&state.communism>=25&&state.cash>=cost};
}
export function buyBureaucracy(state){
 const offer=getBureaucracyOffer(state);
 if(!offer.available)return {ok:false,reason:state.communism<25?'locked':'funds'};
 state.cash-=offer.cost;
 state.bureaucracyOffices+=1;
 state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 return {ok:true,offer};
}
export function getBilateralOffer(world,state,id){
 const country=byId.get(id);
 if(!country||!world.origin||!isCountryVisible(world,id)||id===world.origin||world.partners.includes(id))return null;
 const signed=world.bilateral.includes(id);
 const cost=4500+Number(id)*350;
 return {...country,cost,signed,corruptionOnPurchase:4,corruptionPerMinute:0.16,
  dividendBonusPercent:1,
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
 return {ok:true,country:offer};
}
