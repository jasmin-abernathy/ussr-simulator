import { ACTIVITIES, RULES } from './game-data.js?v=2026-11-27-investments-1';

const BY_ID = new Map(ACTIVITIES.map((item, index) => [item.id, { item, index }]));
const MAX_TIME = 8.64e15;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const cap = (value, maximum = RULES.maxNumber) => Math.min(maximum, Math.max(0, value));
const time = value => typeof value === 'number' && Number.isFinite(value)
  ? cap(value, MAX_TIME) : Date.now();
/** Hourly audit cooldown, persisted across reloads. No daily quota. */
export const AUDIT_COOLDOWN_MS=60*60*1000;
export const AUDIT_CORRUPTION_REDUCTION=.20;
export function getAuditCooldown(state,now=Date.now()){
 const current=time(now);
 const last=time(state.lastAuditAt||0);
 const remainingMs=last>0?Math.min(AUDIT_COOLDOWN_MS,Math.max(0,last+AUDIT_COOLDOWN_MS-current)):0;
 return {remainingMs,ready:remainingMs===0,nextAt:last+AUDIT_COOLDOWN_MS};
}
const emptyOffline = () => ({ elapsedMs: 0, creditedMs: 0, earned: 0, capped: false });
const addMoney = (state, amount) => {
  const credited = Math.min(cap(amount), RULES.maxNumber - state.cash);
  state.cash += credited;
  state.totalEarned = cap(state.totalEarned + credited);
  return credited;
};

/** Return a new version-1 state. All dates are UTC epoch milliseconds. */
export function createState(now = Date.now()) {
  return {
    version: RULES.saveVersion,
    cash: 0, totalEarned: 0, publicBudget: 0, publicTaxesCollected: 0, publicSpent: 0, publicServicesLevel: 0, internationalAidLevel: 0, publicTransportLevel: 0, publicHousingLevel: 0, publicNeedsPending: 0, publicNeedsGenerated: 0, publicNeedsResolved: 0, publicNeedNextScore: 1, publicNeedLastAt: 0, corruptionAudits: 0, lastAuditAt: 0, crisesPending: 0, crisesGenerated: 0, crisisRemainderMs: 0, clicks: 0, automaticSeconds: 0, communism: 0, corruption: 0, importsOwned: 0, bureaucracyOffices: 0, propagandaAgencies: 0, bilateralAgreements: 0, usCapitalist: true, worldEconomyEnabled: false, taxPolicy: 'balanced', secondRemainderMs: 0, communismRemainderMs: 0, economyTickMode: 'seconds-v1',
    owned: Object.fromEntries(ACTIVITIES.map(item => [item.id, 0])),
    counters: { production: RULES.initialProduction, taxes: 0, productionBonusPercent: 0, taxBonusPercent: 0 },
    productionSteps: 0, taxSteps: 0,
    lastUpdate: time(now), tickRemainderMs: 0,
    plan: { status: 'idle', remainingMs: 0, durationMs: 0, completed: 0 },
    offline: emptyOffline(), recovered: false,
  };
}

/**
 * Parse only known data fields. Invalid/unsupported saves recover to safe values.
 * This prevents invalid arithmetic and object-key injection, not save editing.
 * Loading also credits the elapsed time once, with an eight-hour limit.
 */
export function hydrateState(raw, now = Date.now()) {
  now = time(now);
  const state = createState(now);
  if (typeof raw === 'string') {
    if (new TextEncoder().encode(raw).length > RULES.maxSaveBytes) {
      state.recovered = true;
      return state;
    }
    try { raw = JSON.parse(raw); } catch { state.recovered = true; return state; }
  }
  if (!record(raw) || raw.version !== RULES.saveVersion) {
    state.recovered = raw != null;
    return state;
  }
  const readNumber = (value, fallback, maximum = RULES.maxNumber, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      state.recovered = true;
      return fallback;
    }
    const result = integer ? Math.floor(cap(value, maximum)) : cap(value, maximum);
    if (result !== value) state.recovered = true;
    return result;
  };
  const owned = record(raw.owned) ? raw.owned : {};
  const minimum = { production: RULES.initialProduction, taxes: 0, productionBonusPercent: 0, taxBonusPercent: 0, communism: 0 };
  for (const item of ACTIVITIES) {
    const count = readNumber(own(owned, item.id) ? owned[item.id] : undefined, 0, RULES.maxOwned, true);
    state.owned[item.id] = count;
    minimum.production += count * item.effects.production;
    minimum.taxes += count * item.effects.taxes;
    minimum.productionBonusPercent += count * item.effects.productionPercent;
    minimum.taxBonusPercent += count * item.effects.taxPercent;
    minimum.communism += count * item.effects.communism;
  }
  const counters = record(raw.counters) ? raw.counters : {};
  for (const key of Object.keys(state.counters)) {
    const value = readNumber(own(counters, key) ? counters[key] : undefined, minimum[key]);
    state.counters[key] = Math.max(minimum[key], value);
    if (state.counters[key] !== value) state.recovered = true;
  }
  state.corruption=raw.corruption===undefined?0:readNumber(raw.corruption,0,1e6);
  state.importsOwned=raw.importsOwned===undefined?0:readNumber(raw.importsOwned,0,10000,true);
  state.bureaucracyOffices=raw.bureaucracyOffices===undefined?0:readNumber(raw.bureaucracyOffices,0,1000,true);
  state.propagandaAgencies=raw.propagandaAgencies===undefined?0:readNumber(raw.propagandaAgencies,0,1000,true);
  state.bilateralAgreements=raw.bilateralAgreements===undefined?0:readNumber(raw.bilateralAgreements,0,48,true);
  state.usCapitalist=raw.usCapitalist===false?false:true;
  state.worldEconomyEnabled=raw.worldEconomyEnabled===true;
  state.taxPolicy=['social','balanced','solidarity'].includes(raw.taxPolicy)?raw.taxPolicy:'balanced';
  // Legacy saves used minute-long payout intervals. Preserve fractional
  // progress but do not grant 60 seconds of retroactive income on migration.
  const legacyRemainder=raw.minuteRemainderMs===undefined?0:readNumber(raw.minuteRemainderMs,0,59999.999);
  state.secondRemainderMs=raw.economyTickMode==='seconds-v1'
    ? (raw.secondRemainderMs===undefined?0:readNumber(raw.secondRemainderMs,0,999.999))
    : legacyRemainder%1000;
  state.economyTickMode='seconds-v1';
  // New passive-communism clock starts at zero on older saves; the elapsed
  // offline period is still credited once by advance() after hydration.
  state.communismRemainderMs=raw.communismRemainderMs===undefined
    ? 0 : readNumber(raw.communismRemainderMs,0,59999.999);
  // Existing roubles are untouched; only future tax income goes to the public budget.
  state.publicBudget=raw.publicBudget===undefined?0:readNumber(raw.publicBudget,0);
  state.publicTaxesCollected=raw.publicTaxesCollected===undefined?0:readNumber(raw.publicTaxesCollected,0);
  state.publicSpent=raw.publicSpent===undefined?0:readNumber(raw.publicSpent,0);
  state.publicServicesLevel=raw.publicServicesLevel===undefined?0:readNumber(raw.publicServicesLevel,0,10,true);
  state.internationalAidLevel=raw.internationalAidLevel===undefined?0:readNumber(raw.internationalAidLevel,0,8,true);
  state.publicTransportLevel=raw.publicTransportLevel===undefined?0:readNumber(raw.publicTransportLevel,0,12,true);
  state.publicHousingLevel=raw.publicHousingLevel===undefined?0:readNumber(raw.publicHousingLevel,0,10,true);
  state.corruptionAudits=raw.corruptionAudits===undefined?0:readNumber(raw.corruptionAudits,0,100000,true);
  state.lastAuditAt=raw.lastAuditAt===undefined?0:readNumber(raw.lastAuditAt,0,MAX_TIME,true);
  state.crisesPending=raw.crisesPending===undefined?0:readNumber(raw.crisesPending,0,3,true);
  state.crisesGenerated=raw.crisesGenerated===undefined?0:readNumber(raw.crisesGenerated,0,Number.MAX_SAFE_INTEGER,true);
  state.crisisRemainderMs=raw.crisisRemainderMs===undefined?0:readNumber(raw.crisisRemainderMs,0,899999.999);
  state.cash = readNumber(raw.cash, 0);
  state.totalEarned = Math.max(state.cash, readNumber(raw.totalEarned, state.cash));
  // Political costs may legitimately lower communism below the historical sum
  // of purchase bonuses. Preserve the saved value in world-economy games.
  state.communism = state.worldEconomyEnabled
    ? readNumber(raw.communism,minimum.communism)
    : Math.max(minimum.communism,readNumber(raw.communism,minimum.communism));
  state.clicks = readNumber(raw.clicks, 0, Number.MAX_SAFE_INTEGER, true);
  state.automaticSeconds = readNumber(raw.automaticSeconds, 0, Number.MAX_SAFE_INTEGER, true);
  state.publicNeedsPending=raw.publicNeedsPending===undefined?0:readNumber(raw.publicNeedsPending,0,3,true);
  state.publicNeedsGenerated=raw.publicNeedsGenerated===undefined?0:readNumber(raw.publicNeedsGenerated,0,Number.MAX_SAFE_INTEGER,true);
  state.publicNeedsResolved=raw.publicNeedsResolved===undefined?0:readNumber(raw.publicNeedsResolved,0,Number.MAX_SAFE_INTEGER,true);
  state.publicNeedLastAt=raw.publicNeedLastAt===undefined?now:readNumber(raw.publicNeedLastAt,now,MAX_TIME,true);
  // Existing saves start from their current level of development, not a backlog.
  state.publicNeedNextScore=raw.publicNeedNextScore===undefined
    ?getPublicNeedScore(state)+1:readNumber(raw.publicNeedNextScore,1,100000000,true);
  state.productionSteps = readNumber(raw.productionSteps, 0, RULES.productionInflationStep * RULES.maxInflation, true);
  state.taxSteps = readNumber(raw.taxSteps, 0, RULES.taxInflationStep * RULES.maxInflation, true);
  state.tickRemainderMs = readNumber(raw.tickRemainderMs, 0, 999.999999);
  const savedTime = readNumber(raw.lastUpdate, now, MAX_TIME);
  state.lastUpdate = Math.min(savedTime, now);
  if (savedTime > now) {
    state.recovered = true;
    state.tickRemainderMs = 0;
  }
  const plan = record(raw.plan) ? raw.plan : {};
  state.plan.completed = readNumber(plan.completed, 0, RULES.maxOwned, true);
  if (state.communism >= RULES.planUnlock && ['running', 'ready'].includes(plan.status)) {
    state.plan.status = plan.status;
    state.plan.durationMs = Math.max(RULES.minimumPlanDurationMs,
      readNumber(plan.durationMs, RULES.planDurationMs, RULES.planDurationMs));
    state.plan.remainingMs = plan.status === 'ready' ? 0 : readNumber(plan.remainingMs, state.plan.durationMs, state.plan.durationMs);
    if (state.plan.remainingMs === 0) state.plan.status = 'ready';
  } else if (plan.status !== 'idle') {
    state.recovered = true;
  }
  const result = advance(state, now);
  state.offline = { elapsedMs: result.elapsedMs, creditedMs: result.creditedMs, earned: result.earned, capped: result.capped };
  return state;
}

// Each custom rule visits the 22 items in their original order, repeatedly.
const visits = (purchases, index) => Math.floor(purchases / ACTIVITIES.length) + (index < purchases % ACTIVITIES.length ? 1 : 0);
const planDuration = state => Math.max(RULES.minimumPlanDurationMs,
  RULES.planDurationMs - state.owned.beer * RULES.beerReductionMs);
const planReward = state => Math.min(RULES.maxNumber,
  RULES.planReward * RULES.planRewardGrowth ** state.plan.completed);
const inflation = (steps, size) => Math.floor(steps / size);
const grossProduction = state => cap(state.counters.production * (1 + state.counters.productionBonusPercent / 100));
const grossTaxes = state => cap(state.counters.taxes * (1 + state.counters.taxBonusPercent / 100));
// In the world game, a manual action has a modest productivity bonus proportional
// to the actual (pre-tax) turnover of owned normal enterprises. Imports and
// political investments never enhance the manual button.
export function manualProductionBonus(state){
  if(!state.worldEconomyEnabled)return 0;
  let turnover=0;
  for(const [id,count] of Object.entries(state.owned||{})){
    if(!count)continue;
    const activity=activityBusinessRate(state,id);
    if(activity)turnover+=activity.grossPerSecond*Math.min(count,RULES.maxOwned);
  }
  // 25% of one second of factory turnover, rounded to the visible cent.
  return Math.round(Math.min(RULES.maxNumber,turnover*.25)*100)/100;
}
const production = state => state.worldEconomyEnabled
  ? cap(RULES.initialProduction+manualProductionBonus(state))
  : grossProduction(state) * (1 - inflation(state.productionSteps, RULES.productionInflationStep) / 100);
const taxes = state => grossTaxes(state) * (1-inflation(state.taxSteps,RULES.taxInflationStep)/100)
 * (1-Math.min(35,Math.floor((state.corruption||0)/25))/100);
const commerceRevenuePerSecond = state => state.worldEconomyEnabled?(
  (state.owned.gum||0)*4+(state.owned.beer||0)*8+(state.owned.trading||0)*20+
  (state.owned.soda||0)*25+(state.owned.grocery||0)*35+
  (state.owned['black-market']||0)*70+(state.importsOwned||0)*90):0;
/** Recurring business corruption is 5% of each unit's one-time penalty. */
export const CORRUPTION_PURCHASE=Object.freeze({gum:2,trading:0.5,'black-market':2});
/** Some controversial investments also undermine political support immediately. */
export const COMMUNISM_PURCHASE_PENALTY=Object.freeze({gum:1,trading:2,'black-market':4});
export const STAKHANOV_COMMUNISM_COST=.05;
export const applyCommunismPenalty=(state,points)=>{
 const previous=cap(state.communism);
 const lost=Math.min(previous,Math.max(0,Number(points)||0));
 state.communism=cap(previous-lost);
 return lost;
};
export const PASSIVE_CORRUPTION_RATIO=.05;
/** Even lawful commercial expansion requires oversight: rising activity raises structural risk. */
export const STRUCTURAL_CORRUPTION_PER_BUSINESS=.06;
export const RESALE_RATE=.40;
export const getActivityCorruptionRate=id=>(CORRUPTION_PURCHASE[id]||0)*PASSIVE_CORRUPTION_RATIO;
export const corruptionPerMinute = state =>
  (state.worldEconomyEnabled?Object.entries(CORRUPTION_PURCHASE).reduce(
    (sum,[id,risk])=>sum+(state.owned[id]||0)*risk*PASSIVE_CORRUPTION_RATIO,0):0)+
  (state.worldEconomyEnabled?Math.min(18,Object.entries(state.owned||{}).reduce((sum,[id,count])=>sum+(count>0&&ACTIVITIES.some(activity=>activity.id===id)?count:0),0)*STRUCTURAL_CORRUPTION_PER_BUSINESS):0)+
  (state.usCapitalist!==false?(state.importsOwned||0)*.15:0)+
  (state.bureaucracyOffices||0)*.09+
  (state.propagandaAgencies||0)*.12+
  (state.bilateralAgreements||0)*.10+
  (state.worldEconomyEnabled?(state.publicNeedsPending||0)*.06:0);

/** Derived values only; querying never changes the state or the clock. */
/** Industry passively yields 1% of its one-time communism bonus per minute.
 * Purchase rewards remain unchanged; fractional points accumulate normally.
 * Non-industry investments and international agreements are excluded.
 */
export function getCommunismPerMinute(state){
 let total=0;
 for(const item of ACTIVITIES){
  const count=state.owned?.[item.id]||0;
  if(count>0&&item.effects.communism>0){
   total=cap(total+cap(count,RULES.maxOwned)*item.effects.communism);
  }
 }
 return cap(total*.01+(state.worldEconomyEnabled?(state.propagandaAgencies||0)*.05:0));
}

/** Public services face new needs when economic activity and the population of
 * enterprises expand. Milestones are deterministic, with a fifteen-minute
 * minimum separation and no retroactive backlog for existing saves.
 */
export const PUBLIC_NEED_TYPES=Object.freeze([
 Object.freeze({name:'Renforcer les centres de santé',detail:'Les nouveaux quartiers ont besoin de soins accessibles.'}),
 Object.freeze({name:'Ouvrir des écoles de quartier',detail:'Le développement des activités demande davantage de places et de personnel.'}),
 Object.freeze({name:'Moderniser les réseaux d’eau',detail:'La production croissante sollicite les équipements collectifs.'}),
 Object.freeze({name:'Renforcer les services de proximité',detail:'Les habitants ont besoin d’accéder aux services essentiels.'}),
]);
export const PUBLIC_NEED_COOLDOWN_MS=15*60*1000;
export function getPublicNeedScore(state){
 const finances=getBusinessEconomy(state);
 return Math.floor(finances.owned/12)+
   Math.floor(Math.log2(1+finances.taxesPerSecond/20))+
   Math.floor((state.automaticSeconds||0)/3600);
}
export function generatePublicNeed(state,now=Date.now()){
 if(!state.worldEconomyEnabled||state.automaticSeconds<900||
    (state.publicNeedsPending||0)>=3)return false;
 const score=getPublicNeedScore(state);
 if(score<(state.publicNeedNextScore||1))return false;
 if(now-(state.publicNeedLastAt||0)<PUBLIC_NEED_COOLDOWN_MS)return false;
 state.publicNeedsPending=Math.min(3,(state.publicNeedsPending||0)+1);
 state.publicNeedsGenerated=Math.min(Number.MAX_SAFE_INTEGER,(state.publicNeedsGenerated||0)+1);
 state.publicNeedLastAt=time(now);
 state.publicNeedNextScore=Math.max((state.publicNeedNextScore||1)+1,score+1);
 return true;
}
/** Ring-fenced tax budget. Projects never spend the business treasury. */
export const PUBLIC_PROJECTS=Object.freeze({
 services:Object.freeze({name:'Services publics',description:'Augmente la collecte fiscale de 3 % par niveau (maximum 30 %).'}),
 solidarity:Object.freeze({name:'Solidarité internationale',description:'Réduit le coût des futures coopérations de 5 % par niveau (maximum 40 %).'}),
 crisis:Object.freeze({name:'Résoudre la crise',description:'Répare une crise économique : restaure la collecte fiscale et réduit la pression de corruption.'}),
 transport:Object.freeze({name:'Développer les transports publics',description:'Améliore durablement les revenus des activités grâce à une meilleure desserte.'}),
 housing:Object.freeze({name:'Construire des logements coopératifs',description:'Protège progressivement les recettes publiques pendant les crises.'}),
 audit:Object.freeze({name:'Contrôle des comptes',description:'Une inspection réduit de 20 % la corruption existante. Une nouvelle inspection est possible une heure plus tard.'}),
 maintenance:Object.freeze({name:'Entretenir les infrastructures',description:'Remet les équipements en état et soulage les tensions économiques.'}),
 needs:Object.freeze({name:'Répondre aux besoins collectifs',description:'Finance les nouveaux besoins issus du développement du pays.'}),
});
export function publicProjectOffers(state,now=Date.now()){
 const auditCooldown=getAuditCooldown(state,now);
 const services=state.publicServicesLevel||0;
 const aid=state.internationalAidLevel||0;
 const pending=state.crisesPending||0;
 const budget=state.publicBudget||0;
 const needs=state.publicNeedsPending||0;
 const needType=PUBLIC_NEED_TYPES[(state.publicNeedsResolved||0)%PUBLIC_NEED_TYPES.length];
 const offers={
  services:{...PUBLIC_PROJECTS.services,level:services,cost:Math.ceil(25*1.6**services),maxLevel:10,locked:services>=10},
  solidarity:{...PUBLIC_PROJECTS.solidarity,level:aid,cost:Math.ceil(40*1.7**aid),maxLevel:8,locked:aid>=8},
  crisis:{...PUBLIC_PROJECTS.crisis,level:pending,cost:20+15*pending,locked:pending===0},
  transport:{...PUBLIC_PROJECTS.transport,level:state.publicTransportLevel||0,cost:Math.ceil(180*1.55**(state.publicTransportLevel||0)),maxLevel:12,locked:(state.publicTransportLevel||0)>=12},
  housing:{...PUBLIC_PROJECTS.housing,level:state.publicHousingLevel||0,cost:Math.ceil(220*1.65**(state.publicHousingLevel||0)),maxLevel:10,locked:(state.publicHousingLevel||0)>=10},
  audit:{...PUBLIC_PROJECTS.audit,cost:Math.ceil(600*1.38**Math.min(24,state.corruptionAudits||0)+Math.min(2000,(state.corruption||0)*18)),locked:(state.corruption||0)<.01||!auditCooldown.ready,cooldownMs:auditCooldown.remainingMs,cooldownActive:!auditCooldown.ready},
  maintenance:{...PUBLIC_PROJECTS.maintenance,cost:Math.ceil(160+Math.min(900,(state.taxSteps||0)/30+(state.productionSteps||0)/40)),locked:(state.taxSteps||0)<250&&(state.productionSteps||0)<250},
  needs:{...PUBLIC_PROJECTS.needs,name:needType.name,description:needType.detail,pending:needs,
   cost:Math.ceil(150+Math.min(5000,((state.publicNeedsResolved||0)+1)*65+getPublicNeedScore(state)*25)),locked:needs===0},
 };
 for(const offer of Object.values(offers))offer.available=!offer.locked&&budget>=offer.cost;
 return offers;
}
export function spendPublicBudget(state,project,now=Date.now()){
 if(!state.worldEconomyEnabled)return {ok:false,reason:'unavailable'};
 const offer=publicProjectOffers(state,now)[project];
 if(!offer)return {ok:false,reason:'invalid-project'};
 if(offer.locked)return {ok:false,reason:project==='audit'&&offer.cooldownActive?'cooldown':'locked'};
 if(!offer.available)return {ok:false,reason:'funds'};
 state.publicBudget=Math.max(0,state.publicBudget-offer.cost);
 state.publicSpent=cap((state.publicSpent||0)+offer.cost);
 if(project==='services')state.publicServicesLevel++;
 if(project==='solidarity')state.internationalAidLevel++;
 if(project==='transport')state.publicTransportLevel++;
 if(project==='housing')state.publicHousingLevel++;
 if(project==='audit'){
  state.lastAuditAt=time(now);
  state.corruption=Math.max(0,(state.corruption||0)*(1-AUDIT_CORRUPTION_REDUCTION));
  state.corruptionAudits=Math.min(100000,(state.corruptionAudits||0)+1);
 }
 if(project==='needs'){
  state.publicNeedsPending=Math.max(0,(state.publicNeedsPending||0)-1);
  state.publicNeedsResolved=Math.min(Number.MAX_SAFE_INTEGER,(state.publicNeedsResolved||0)+1);
 }
 if(project==='maintenance'){
  state.taxSteps=Math.max(0,(state.taxSteps||0)-1500);
  state.productionSteps=Math.max(0,(state.productionSteps||0)-750);
 }
 if(project==='crisis'){
  state.crisesPending=Math.max(0,state.crisesPending-1);
  state.corruption=Math.max(0,(state.corruption||0)-1);
 }
 return {ok:true,spent:offer.cost,project};
}
export function getStats(state) {
  return {
    cash: state.cash, totalEarned: state.totalEarned, publicBudget:state.publicBudget||0, publicTaxesCollected:state.publicTaxesCollected||0, publicSpent:state.publicSpent||0, publicProjects:publicProjectOffers(state), crisesPending:state.crisesPending||0, communism: state.communism, communismPerMinute: getCommunismPerMinute(state), corruption: state.corruption||0, corruptionPerMinute:corruptionPerMinute(state), commerceRevenuePerSecond:commerceRevenuePerSecond(state), clicks: state.clicks,
    productionPerClick: production(state), manualProductionBonus: manualProductionBonus(state), taxesPerSecond: state.worldEconomyEnabled?0:taxes(state),
    business: getBusinessEconomy(state),
    totalOwned: Object.values(state.owned).reduce((total, count) => total + count, 0),
    unlockedCount: ACTIVITIES.filter(item => item.unlock <= state.communism).length,
    productionBase: state.counters.production, taxBase: state.counters.taxes,
    productionBonusPercent: state.counters.productionBonusPercent, taxBonusPercent: state.counters.taxBonusPercent,
    productionInflation: inflation(state.productionSteps, RULES.productionInflationStep),
    taxInflation: inflation(state.taxSteps, RULES.taxInflationStep),
    canReduceInflation: state.taxSteps >= RULES.taxInflationStep || ((state.corruption||0)>=1&&(!state.worldEconomyEnabled||(state.publicBudget||0)>=15)),
    plan: { unlocked: state.communism >= RULES.planUnlock, status: state.plan.status,
      remainingMs: state.plan.remainingMs,
      durationMs: state.plan.status === 'idle' ? planDuration(state) : state.plan.durationMs,
      nextDurationMs: planDuration(state),
      reward: planReward(state), completed: state.plan.completed },
    offline: { ...state.offline },
  };
}

function priceFor(item, index, owned, radioCount) {
  const discounts = visits(radioCount, index);
  const direct = item.initialPrice * RULES.priceGrowth ** owned / 3 ** discounts;
  if (Number.isFinite(direct) && direct > 0) {
    return Math.max(RULES.minimumPrice, Math.min(RULES.maxNumber, direct));
  }
  const logPrice = Math.log(item.initialPrice) + owned * Math.log(RULES.priceGrowth)
    - discounts * Math.log(3);
  return Math.max(RULES.minimumPrice, Math.min(RULES.maxNumber, Math.exp(logPrice)));
}

/** The effects shown are those of the NEXT purchase, including dissident boosts. */
export function getActivity(state, id) {
  const entry = BY_ID.get(id);
  if (!entry) return null;
  const { item, index } = entry;
  const multiplier = Math.min(RULES.maxNumber, 2 ** visits(state.owned.dissidence, index));
  const effects = Object.fromEntries(Object.entries(item.effects).map(([key, value]) =>
    [key, key === 'communism' ? value : cap(value * multiplier)]));
  const cost = priceFor(item, index, state.owned[id], state.owned.radio);
  const unlocked = state.communism >= item.unlock;
  return { ...item, effects, owned: state.owned[id], cost, unlocked,
    canBuy: unlocked && state.cash >= cost && state.owned[id] < RULES.maxOwned };
}

/**
 * Quote up to quantity affordable units; 'max' is limited to 1,000 per action.
 * Numeric batches may also be partial. Costs include the radio's self-discount.
 */
export function quotePurchase(state, id, quantity = 1) {
  const entry = BY_ID.get(id);
  if (!entry) return { ok: false, reason: 'unknown-activity', quantity: 0, cost: 0, requested: 0, maxReached: false };
  if (quantity !== 'max' && (!Number.isSafeInteger(quantity) || quantity < 1)) {
    return { ok: false, reason: 'invalid-quantity', quantity: 0, cost: 0, requested: 0, maxReached: false };
  }
  const requested = quantity === 'max' ? RULES.maxBatch : Math.min(RULES.maxBatch, quantity);
  const result = { ok: false, quantity: 0, cost: 0, requested, maxReached: false };
  if (state.communism < entry.item.unlock) return { ...result, reason: 'locked' };
  const available = Math.min(requested, RULES.maxOwned - state.owned[id]);
  if (available <= 0) return { ...result, reason: 'ownership-limit', maxReached: true };
  for (let count = 0; count < available; count += 1) {
    const cost = priceFor(entry.item, entry.index, state.owned[id] + count,
      state.owned.radio + (id === 'radio' ? count : 0));
    if (cost > state.cash - result.cost) break;
    result.cost += cost;
    result.quantity += 1;
  }
  result.ok = result.quantity > 0;
  result.maxReached = result.quantity === RULES.maxBatch || state.owned[id] + result.quantity === RULES.maxOwned;
  if (!result.ok) result.reason = 'insufficient-funds';
  return result;
}

/** Mutates state; a failed purchase leaves it unchanged. */
export function buyActivity(state, id, quantity = 1) {
  const quote = quotePurchase(state, id, quantity);
  if (!quote.ok) return { ok: false, reason: quote.reason, bought: 0, spent: 0 };
  state.cash = Math.max(0, state.cash - quote.cost);
  for (let count = 0; count < quote.quantity; count += 1) {
    const { effects } = getActivity(state, id);
    state.counters.production = cap(state.counters.production + effects.production);
    state.counters.taxes = cap(state.counters.taxes + effects.taxes);
    state.counters.productionBonusPercent = cap(state.counters.productionBonusPercent + effects.productionPercent);
    state.counters.taxBonusPercent = cap(state.counters.taxBonusPercent + effects.taxPercent);
    state.communism = cap(state.communism + effects.communism);
    if(state.worldEconomyEnabled)applyCommunismPenalty(state,COMMUNISM_PURCHASE_PENALTY[id]||0);
    const risk=CORRUPTION_PURCHASE[id]||0;
    if(risk&&(state.worldEconomyEnabled||id!=='gum'))
      state.corruption=Math.min(1e6,(state.corruption||0)+risk);
    // Increment AFTER applying effects: a doubling never alters already-owned items.
    state.owned[id] += 1;
  }
  return { ok: true, bought: quote.quantity, spent: quote.cost };
}

/** A converted commerce stays in service and changes its business type.
 * Its trade-in value offsets the new structure, without cashing out.
 */
export const CONVERSION_TARGETS=Object.freeze({
 gum:Object.freeze(['matches','soda','grocery']),
 trading:Object.freeze(['matches','soda','grocery']),
 'black-market':Object.freeze(['matches','soda','grocery']),
 'us-imports':Object.freeze(['matches','soda','grocery']),
});
export const CONVERSION_TRADE_IN_RATE=.40;
export function quoteActivityConversion(state,sourceId,targetId){
 if(!state.worldEconomyEnabled)return {ok:false,reason:'unavailable'};
 const options=CONVERSION_TARGETS[sourceId];
 if(!options)return {ok:false,reason:'not-convertible'};
 if(!options.includes(targetId))return {ok:false,reason:'invalid-target'};
 const count=sourceId==='us-imports'?(state.importsOwned||0):(state.owned?.[sourceId]||0);
 if(!Number.isSafeInteger(count)||count<1)return {ok:false,reason:'not-owned'};
 const target=getActivity(state,targetId);
 if(!target||!target.unlocked)return {ok:false,reason:'locked'};
 if(target.owned>=RULES.maxOwned)return {ok:false,reason:'ownership-limit'};
 const lastPrice=sourceId==='us-imports'
   ?Math.round(35000*Math.pow(1.18,count-1))
   :priceFor(BY_ID.get(sourceId).item,BY_ID.get(sourceId).index,count-1,state.owned.radio);
 const tradeInValue=Math.round(lastPrice*CONVERSION_TRADE_IN_RATE*100)/100;
 // Only a positive difference is payable; no cash is ever refunded.
 const cost=Math.max(0,Math.round((target.cost-tradeInValue)*100)/100);
 return {ok:true,sourceId,targetId,cost,tradeInValue,targetPrice:target.cost,
   available:state.cash>=cost,sourceCount:count,targetCount:target.owned};
}
export function convertActivity(state,sourceId,targetId){
 const quote=quoteActivityConversion(state,sourceId,targetId);
 if(!quote.ok)return quote;
 if(!quote.available)return {ok:false,reason:'funds',cost:quote.cost};
 state.cash=Math.max(0,state.cash-quote.cost);
 if(sourceId==='us-imports')state.importsOwned--;
 else state.owned[sourceId]--;
 state.owned[targetId]++;
 // The prior one-time awards remain, with no new free purchase award.
 // Passive income/communism/corruption derive from the replacement business.
 return {ok:true,sourceId,targetId,cost:quote.cost,tradeInValue:quote.tradeInValue,targetPrice:quote.targetPrice};
}

/** Dubious propaganda purchase, distinct from legitimate public services. */
export function getPropagandaOffer(state){
 const count=state.propagandaAgencies||0;
 const cost=Math.round(2500*Math.pow(1.35,count));
 return {count,cost,corruptionOnPurchase:3,corruptionPerMinute:.12,communismPenalty:3,
   communismPerMinute:.05,available:state.worldEconomyEnabled&&count<1000&&state.communism>=40&&state.cash>=cost};
}
export function buyPropagandaAgency(state){
 const offer=getPropagandaOffer(state);
 if(!offer.available)return {ok:false,reason:state.communism<40?'locked':'funds'};
 state.cash-=offer.cost;
 state.propagandaAgencies++;
 state.corruption=Math.min(1e6,(state.corruption||0)+offer.corruptionOnPurchase);
 const communismLost=applyCommunismPenalty(state,offer.communismPenalty);
 return {ok:true,spent:offer.cost,offer,communismLost};
}

/** Mutates state. The clock is advanced separately by the UI. */
export function clickProduce(state) {
  const earned = addMoney(state, production(state));
  const communismLost=state.worldEconomyEnabled?applyCommunismPenalty(state,STAKHANOV_COMMUNISM_COST):0;
  state.clicks = cap(state.clicks + 1, Number.MAX_SAFE_INTEGER);
  if(!state.worldEconomyEnabled)state.productionSteps = Math.min(RULES.productionInflationStep * RULES.maxInflation, state.productionSteps + 1);
  return { ok: true, earned, communismLost };
}

/** Sum historical per-second income, crossing at most 100 inflation boundaries. */
function collectTaxes(state, seconds) {
  let remaining = seconds;
  let earned = 0;
  const base = grossTaxes(state)*(1-Math.min(35,Math.floor((state.corruption||0)/25))/100);
  while (remaining > 0 && state.taxSteps < RULES.taxInflationStep * RULES.maxInflation) {
    const rate = inflation(state.taxSteps, RULES.taxInflationStep);
    const segment = Math.min(remaining, RULES.taxInflationStep - state.taxSteps % RULES.taxInflationStep);
    earned += base * (1 - rate / 100) * segment;
    state.taxSteps += segment;
    remaining -= segment;
  }
  const addedCorruption=corruptionPerMinute(state)*seconds/60;
  if(addedCorruption>0)state.corruption=Math.min(1e6,(state.corruption||0)+addedCorruption);
  state.productionSteps = Math.max(0, state.productionSteps - seconds);
  state.automaticSeconds = cap(state.automaticSeconds + seconds, Number.MAX_SAFE_INTEGER);
  return addMoney(state, earned+seconds*commerceRevenuePerSecond(state));
}

/**
 * Mutates state once per time interval. Fractional seconds are carried forward.
 * Backward clocks earn nothing; the previous watermark prevents double credit.
 */
export function advance(state, now = Date.now()) {
  now = time(now);
  const elapsedMs = Math.max(0, now - state.lastUpdate);
  const creditedMs = Math.min(elapsedMs, RULES.offlineCapMs);
  const result = { ok: true, earned: 0, communismEarned: 0, taxesEarned: 0, crisesCreated: 0, elapsedMs, creditedMs, capped: elapsedMs > creditedMs };
  if (elapsedMs === 0) return result;
  state.lastUpdate = now; // Discard time over the cap, rather than banking it.
  if(state.worldEconomyEnabled){
    const elapsed=state.secondRemainderMs+creditedMs;
    const seconds=Math.floor(elapsed/1000);
    state.secondRemainderMs=elapsed-seconds*1000;
    const communismElapsed=(state.communismRemainderMs||0)+creditedMs;
    const fullMinutes=Math.floor(communismElapsed/60000);
    state.communismRemainderMs=communismElapsed-fullMinutes*60000;
    if(fullMinutes>0){
      const rate=getCommunismPerMinute(state);
      result.communismEarned=Math.min(cap(rate*fullMinutes),RULES.maxNumber-state.communism);
      state.communism=cap(state.communism+result.communismEarned);
    }
    if(seconds>0){
      // A new crisis appears every 15 minutes of business activity (max 3).
      // Splitting at crisis boundaries avoids losing accuracy after long returns.
      let remaining=seconds;
      while(remaining>0){
        const finances=getBusinessEconomy(state);
        const runningBusiness=finances.owned>0;
        const untilCrisis=900-Math.floor((state.crisisRemainderMs||0)/1000);
        const segment=runningBusiness?Math.min(remaining,Math.max(1,untilCrisis)):remaining;
        result.earned+=addMoney(state,finances.netToTreasuryPerSecond*segment);
        const available=Math.max(0,RULES.maxNumber-state.publicBudget);
        const taxes=Math.min(cap(finances.taxesCollectedPerSecond*segment),available);
        state.publicBudget=cap(state.publicBudget+taxes);
        state.publicTaxesCollected=cap(state.publicTaxesCollected+taxes);
        result.taxesEarned+=taxes;
        state.automaticSeconds=cap(state.automaticSeconds+segment,Number.MAX_SAFE_INTEGER);
        const addedCorruption=corruptionPerMinute(state)*segment/60;
        if(addedCorruption>0)state.corruption=Math.min(1e6,(state.corruption||0)+addedCorruption);
        remaining-=segment;
        if(runningBusiness){
          state.crisisRemainderMs+=segment*1000;
          if(state.crisisRemainderMs>=900000){
            state.crisisRemainderMs-=900000;
            state.crisesGenerated=cap((state.crisesGenerated||0)+1,Number.MAX_SAFE_INTEGER);
            if(state.crisesPending<3){
              state.crisesPending++;
              state.corruption=Math.min(1e6,(state.corruption||0)+1);
              result.crisesCreated++;
            }
          }
        }
      }
    }
    if(seconds>0&&generatePublicNeed(state,now))result.publicNeedsCreated=1;
    if(state.plan.status==='running'){
      state.plan.remainingMs=Math.max(0,state.plan.remainingMs-creditedMs);
      if(state.plan.remainingMs===0)state.plan.status='ready';
    }
    return result;
  }
  const tickMs = state.tickRemainderMs + creditedMs;
  const seconds = Math.floor(tickMs / 1000);
  state.tickRemainderMs = tickMs - seconds * 1000;
  if (seconds > 0) result.earned = collectTaxes(state, seconds);
  if (state.plan.status === 'running') {
    state.plan.remainingMs = Math.max(0, state.plan.remainingMs - creditedMs);
    if (state.plan.remainingMs === 0) state.plan.status = 'ready';
  }
  return result;
}

/** Begin one plan. The duration is fixed when it starts. */
export function startPlan(state, now = Date.now()) {
  advance(state, now);
  if (state.communism < RULES.planUnlock) return { ok: false, reason: 'locked' };
  if (state.plan.status !== 'idle') return { ok: false, reason: 'plan-active' };
  state.plan.status = 'running';
  state.plan.remainingMs = planDuration(state);
  state.plan.durationMs = state.plan.remainingMs;
  return { ok: true, durationMs: state.plan.remainingMs };
}

/** Claim a completed plan exactly once; the following reward grows by 20%. */
export function claimPlan(state, now = Date.now()) {
  advance(state, now);
  if (state.plan.status !== 'ready') return { ok: false, reason: 'plan-not-ready', earned: 0 };
  const earned = addMoney(state, planReward(state));
  state.plan.completed = Math.min(RULES.maxOwned, state.plan.completed + 1);
  state.plan.status = 'idle';
  state.plan.remainingMs = 0;
  state.plan.durationMs = 0;
  return { ok: true, earned };
}

/** Historical anticorruption action: -1 inflation point, one tax tick, +1 communism. */
export function reduceInflation(state) {
  if((state.corruption||0)>=1){
    // In the world economy, restoring political confidence costs public
    // resources, avoiding an unlimited, free corruption-removal exploit.
    const cost=state.worldEconomyEnabled?15:0;
    if((state.publicBudget||0)<cost)return {ok:false,reason:'public-funds',required:cost};
    const removed=Math.min(5,state.corruption);
    state.publicBudget=Math.max(0,(state.publicBudget||0)-cost);
    state.publicSpent=cap((state.publicSpent||0)+cost);
    state.corruption=Math.max(0,state.corruption-removed);
    return {ok:true,earned:0,corruptionReduced:removed,spent:cost};
  }
  if (state.taxSteps < RULES.taxInflationStep) return { ok: false, reason: 'no-inflation', earned: 0 };
  state.taxSteps -= RULES.taxInflationStep;
  const earned = addMoney(state, taxes(state));
  state.communism = cap(state.communism + 1);
  return { ok: true, earned };
}

/** Advances state, then returns an independent JSON-compatible save object. */
export function exportState(state, now = Date.now()) {
  advance(state, now);
  const { offline, recovered, ...persistent } = state;
  return JSON.parse(JSON.stringify(persistent));
}

/** Informational milestones; they do not change balance or grant hidden rewards. */
export function getGoals(state) {
  const stats = getStats(state);
  const definitions = [
    ['first-workshop', 'Le premier atelier', 'Acheter une activité.', stats.totalOwned, 1],
    state.worldEconomyEnabled ? ['first-taxes', 'Des recettes régulières', 'Atteindre 1 rouble de taxes par seconde.', stats.business.taxesCollectedPerSecond, 1] : ['first-taxes', 'Des recettes régulières', 'Atteindre 10 roubles de taxes par seconde.', stats.taxesPerSecond, 10],
    ['new-frequency', 'Une autre fréquence', 'Atteindre 25 points de communisme pour débloquer la radio.', state.communism, 25],
    ['all-activities', 'Toute une économie', 'Débloquer les 22 activités historiques.', stats.unlockedCount, ACTIVITIES.length],
    ['first-plan', 'Le plan quinquennal', 'Atteindre 10 000 points de communisme.', state.communism, RULES.planUnlock],
  ];
  return definitions.map(([id, title, description, current, target]) =>
    ({ id, title, description, current, target, complete: current >= target, progress: Math.min(1, current / target) }));
}

/** Global economy: every owned enterprise pays once per minute.
 * Its turnover is divided between taxes and retained commercial profits.
 * 60% of post-tax profit is redistributed to the player's treasury.
 */
// Rebalance the old minute revenues to one quarter per minute.
// A shop now pays each second, but each payment is deliberately small.
export const BUSINESS_REBALANCE=0.25;
const BUSINESS_TYPES=Object.freeze({
 matches:[150,8],gum:[240,14],beer:[480,22],radio:[750,12],
 dissidence:[900,5],trading:[1050,27],soda:[1400,24],
 grocery:[1800,16],'black-market':[2600,38],posters:[3200,10],
 television:[4500,18],censorship:[4800,32],mausoleum:[5100,15],
 lenin:[5500,20],electrification:[7200,12],canning:[8200,21],
 candy:[9200,24],champagne:[11000,30],collectivisation:[13000,14],
 corn:[12500,9],'virgin-lands':[16000,12],cinema:[18500,23],
 'us-imports':[5400,40],
});
const TAX_POLICIES=Object.freeze({social:-10,balanced:0,solidarity:10});
export const TAX_POLICY_LABELS=Object.freeze({social:'Fiscalité allégée',balanced:'Fiscalité équilibrée',solidarity:'Fiscalité solidaire'});
export function setTaxPolicy(state,policy){
 if(!Object.prototype.hasOwnProperty.call(TAX_POLICIES,policy))return false;
 state.taxPolicy=policy;return true;
}
export function activityBusinessRate(state,id){
 const definition=BUSINESS_TYPES[id];
 if(!definition)return null;
 const rate=Math.max(5,Math.min(65,definition[1]+(TAX_POLICIES[state.taxPolicy]??0)));
 const grossPerSecond=definition[0]*BUSINESS_REBALANCE/60;
 return {grossPerSecond,taxRate:rate,
 taxesPerSecond:grossPerSecond*rate/100,
 treasuryPerSecond:grossPerSecond*(1-rate/100),
 // Keep compatibility fields for older developer tests and external consumers.
 grossPerMinute:grossPerSecond*60,
 taxesPerMinute:grossPerSecond*rate,
 treasuryPerMinute:grossPerSecond*(1-rate/100)*60};
}
export function getBusinessEconomyForPolicy(state,policy){
  if(!Object.prototype.hasOwnProperty.call(TAX_POLICIES,policy))return getBusinessEconomy(state);
  return getBusinessEconomy({...state,taxPolicy:policy});
}
export function getBusinessEconomy(state){
 let gross=0,taxes=0,treasury=0,owned=0;
 for(const [id,count] of Object.entries(state.owned||{})){
  if(!count)continue;
  const rate=activityBusinessRate(state,id);
  if(!rate)continue;
  const units=cap(count,RULES.maxOwned);owned+=units;
  gross+=rate.grossPerSecond*units;taxes+=rate.taxesPerSecond*units;treasury+=rate.treasuryPerSecond*units;
 }
 if(state.importsOwned){
  const rate=activityBusinessRate(state,'us-imports');
  gross+=rate.grossPerSecond*state.importsOwned;
  taxes+=rate.taxesPerSecond*state.importsOwned;
  treasury+=rate.treasuryPerSecond*state.importsOwned;
  owned+=state.importsOwned;
 }
 const leakage=Math.min(35,Math.floor((state.corruption||0)/25))/100;
 const administrationEfficiency=1+Math.min(0.20,(state.bureaucracyOffices||0)*0.02)+Math.min(.30,(state.publicServicesLevel||0)*.03);
 const bilateralTradeBonus=1+Math.min(0.15,(state.bilateralAgreements||0)*0.01);
 const housingProtection=Math.min(.05,(state.publicHousingLevel||0)*.005);
 const crisisLoss=Math.max(.05,.10-housingProtection);
 const collected=taxes*(1-leakage)*administrationEfficiency*(1-crisisLoss*Math.min(3,state.crisesPending||0))*(1-.04*Math.min(3,state.publicNeedsPending||0));
 const transportBonus=1+Math.min(.18,(state.publicTransportLevel||0)*.015);
 const businessIncome=treasury*bilateralTradeBonus*transportBonus;
 return {grossPerSecond:cap(gross),taxesPerSecond:cap(taxes),
 taxesCollectedPerSecond:cap(collected),businessIncomePerSecond:cap(businessIncome),
 netToTreasuryPerSecond:cap(businessIncome),
 grossPerMinute:cap(gross*60),taxesPerMinute:cap(taxes*60),
 taxesCollectedPerMinute:cap(collected*60),
 businessIncomePerMinute:cap(businessIncome*60),
 netToTreasuryPerMinute:cap(businessIncome*60),
 taxPolicy:state.taxPolicy||'balanced',owned,
 secondsUntilPayout:(1000-(state.secondRemainderMs||0))/1000};
}
