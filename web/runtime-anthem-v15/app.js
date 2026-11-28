const APP_VERSION='2026-11-28-unified-investment-data-1';
import { ACTIVITIES, RULES } from './game-data.js?v=2026-11-28-anthem-hidden-penalty-1';
import {
  createState, hydrateState, getStats, getActivity, quotePurchase,
  clickProduce, buyActivity, quoteActivityConversion, convertActivity, CONVERSION_TARGETS, getActivityCorruptionRate, CORRUPTION_PURCHASE, COOPERATIVE_CORRUPTION_PREVENTION, COOPERATIVE_PREVENTION_MAX, COMMUNISM_PURCHASE_PENALTY, getPropagandaOffer, buyPropagandaAgency, getIdeologyInstitutionOffer, buyIdeologyInstitution, advance, startPlan, claimPlan, publicProjectOffers, spendPublicBudget,
  reduceInflation, exportState, getGoals, activityBusinessRate, setTaxPolicy, TAX_POLICIES, TAX_POLICY_LABELS, getBusinessEconomyForPolicy,
} from './engine.js?v=2026-11-28-anthem-hidden-penalty-1';
import { COUNTRIES, MILESTONES, createWorld, hydrateWorld, chooseCountry, getCooperation, cooperate, rankCountriesByCooperationCost, getWorldStats, celebrate, rewardAnthem, getAnthemReward, START_COUNTRIES, USA_COUNTRY_ID, getVisibleCountries, getWorldStage, getCampaignWaves, getUSImportOffer, buyUSImports, convertUSImports, getBureaucracyOffer, buyBureaucracy, getBilateralOffer, buyBilateralAgreement } from './world.js?v=2026-11-28-anthem-hidden-penalty-1';
import { ANTHEM_END_SECONDS, anthemClipFinished } from './anthem-clip.js?v=2026-11-28-anthem-hidden-penalty-1';

const SAVE_KEY = 'ussr-simulator:save:v1';
const BACKUP_KEY = 'ussr-simulator:backup:v1';
const WORLD_KEY = 'communist-world:world:v1';
const $ = id => document.getElementById(id);
const numbers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const format = number => number > 0 && number < 0.01 ? '< 0,01' : Math.abs(number) >= 1000000 ? compact.format(number) : numbers.format(number);
const money = number => `${format(number)} ₽`;
const setText = (element, value) => {
  if (element && element.textContent !== String(value)) element.textContent = String(value);
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let canWrite = !('locks' in navigator);
let releaseSession;
let sessionRequested = false;
const sessionChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('ussr-simulator-active-tab'):null;
let filter = 'all';
let search = '';
let quantity = 1;
const activityPageSize=()=>window.matchMedia('(max-width: 700px)').matches?8:
  window.matchMedia('(max-width: 1100px)').matches?9:12;
let activityPage=0;
let lastActivityPageSize=activityPageSize();
const specialCards=[];
let worldFilter='all';
let worldDisplayLimit=30;
let lastWorldDisplayStage=0;
let selectedBilateralCountry='';
let toastTimeout;
let installPrompt;
let dirty = false;
let lastAnnouncement = 0;
let rawSave = null;

function storageFailure() {
  const warning = $('storage-warning');
  if (warning) {
    warning.hidden = false;
    setText(warning, 'La sauvegarde automatique est indisponible dans ce navigateur. Exporte ta partie depuis le menu Partie pour la conserver.');
  }
  setText($('save-status'), 'Sauvegarde indisponible');
}

try { rawSave = localStorage.getItem(SAVE_KEY); } catch { storageFailure(); }
let state = rawSave ? hydrateState(rawSave) : createState();
let world = createWorld();
try { const stored=localStorage.getItem(WORLD_KEY);if(stored)world=hydrateWorld(JSON.parse(stored)); } catch { storageFailure(); }
state.importsOwned=world.usImports;state.usCapitalist=!world.partners.includes(USA_COUNTRY_ID);state.bilateralAgreements=world.bilateral.length;state.worldEconomyEnabled=true;

function notify(message) {
  const toast = $('toast');
  if (!toast) return;
  clearTimeout(toastTimeout);
  setText(toast, message);
  toast.hidden = false;
  toast.classList.add('is-visible');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, 4200);
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function save({ backup = false } = {}) {
  if (!canWrite) return;
  try {
    if (backup) {
      const previous = localStorage.getItem(SAVE_KEY);
      if (previous) localStorage.setItem(BACKUP_KEY, previous);
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(exportState(state)));
    localStorage.setItem(WORLD_KEY, JSON.stringify(world));
    dirty = false;
    if ($('storage-warning')) $('storage-warning').hidden = true;
    setText($('save-status'), 'Partie sauvegardée sur cet appareil');
  } catch { storageFailure(); }
}

function changed() {
  const reached=world.origin?celebrate(world,state.communism):[];
  if(reached.length)notify(reached[reached.length-1].message);
  dirty = true;
  render();
  save();
}

function duration(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  if (minutes) return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`;
  return `${seconds} s`;
}

// Small original pictograms: no external font, image service or tracker.
const glyphs = {
  factory: '<path d="M4 27V13l8 5v-5l8 5V6h6v21H4Z"/><path d="M8 22h2m4 0h2m6 0h1M20 10h6"/>',
  shop: '<path d="M5 14h22l-3-8H8l-3 8Z"/><path d="M7 14v13h18V14M12 27v-9h8v9M12 6l-1 8m9-8 1 8"/>',
  radio: '<rect x="4" y="12" width="24" height="15" rx="2"/><path d="m9 12 15-8M8 18h7m-7 4h7"/><circle cx="22" cy="20" r="3"/>',
  culture: '<rect x="5" y="5" width="22" height="22" rx="1"/><path d="m13 11 8 5-8 5V11ZM5 9h3m16 0h3M5 23h3m16 0h3"/>',
  monument: '<path d="M7 27h18M10 23h12v4M12 12h8v11M13 12l-1-4 4-4 4 4-1 4M9 16h14"/>',
  fields: '<path d="M4 27c4-8 12-12 24-12M11 27c3-5 8-8 17-8M19 27c2-2 5-4 9-4M5 18V6m0 7L2 9m3 0 4-4"/><circle cx="23" cy="7" r="3"/>',
};
const glyphFor = id => ['radio', 'dissidence', 'television'].includes(id) ? 'radio'
  : ['gum', 'trading', 'soda', 'grocery', 'black-market'].includes(id) ? 'shop'
    : ['posters', 'censorship', 'cinema'].includes(id) ? 'culture'
      : ['mausoleum', 'lenin'].includes(id) ? 'monument'
        : ['collectivisation', 'corn', 'virgin-lands'].includes(id) ? 'fields' : 'factory';
const cards = new Map();

/** Keep the selector aligned with all activities that the player can buy.
 * Only unlocked destinations are listed; switching from any owned source
 * never requires discarding the original business without compensation.
 */
function refreshConversionTargets(select,sourceId){
 if(!select)return;
 const available=CONVERSION_TARGETS[sourceId]?.filter(id=>{
   const activity=getActivity(state,id);
   return activity?.unlocked&&activity.owned<RULES.maxOwned;
 })||[];
 const signature=available.join(',');
 if(select.dataset.targets===signature)return;
 const previous=select.value;
 const fragment=document.createDocumentFragment();
 for(const id of available){
   const activity=getActivity(state,id);
   const option=document.createElement('option');
   option.value=id;
   option.textContent=activity.name;
   fragment.append(option);
 }
 select.replaceChildren(fragment);
 select.dataset.targets=signature;
 if(available.includes(previous))select.value=previous;
}
// Sensitive investments share the exact same metric components as the historic
// activity catalogue. All existing IDs and action nodes are preserved.
function investmentMetric(label,id,extraClass='') {
  const box=document.createElement('span');
  box.className='activity-metric '+extraClass;
  const caption=document.createElement('small');
  caption.textContent=label;
  const value=document.createElement('strong');
  value.id=id;
  box.append(caption,value);
  return box;
}
function setInvestmentPurchase(button,label,cost) {
  if(!button)return;
  const heading=document.createElement('span');
  heading.className='activity-buy-label';
  heading.textContent=label;
  const price=document.createElement('strong');
  price.className='activity-price';
  price.textContent=cost==null?'':money(cost);
  button.replaceChildren(heading,price);
}
function unifyInvestmentCard(card,id) {
  const details=card.querySelector('.investment-details');
  const stats=details?.querySelector('.investment-stats');
  const owned=details?.querySelector('#'+id+'-owned');
  const buy=card.querySelector('#'+id+'-buy');
  if(!details||!stats||!owned||!buy)return;
  card.classList.add('unified-investment-card');
  details.querySelector('h4')?.classList.add('activity-title');
  details.querySelector('p')?.classList.add('activity-description');
  stats.classList.add('activity-effects');
  const oldRisk=details.querySelector('#'+id+'-risk');
  const risk=document.createElement('span');
  risk.id=id+'-risk';
  risk.className='activity-corruption';
  if(oldRisk)oldRisk.remove();
  // Keep the existing IDs for the runtime, in well-labelled, separate cells.
  const layout={
    import:[['CA / s','import-gross','activity-metric-gross'],['Taxe','import-tax','activity-metric-tax'],['Trésorerie / s','import-net','activity-metric-net']],
    bureaucracy:[['Agents concernés','bureaucracy-agents'],['Gain fiscal / groupe','bureaucracy-gain','activity-metric-benefit']],
    bilateral:[['Accords conclus','bilateral-count'],['Gain commercial / accord','bilateral-gain','activity-metric-benefit']],
    mobilization:[['Communisme / min','mobilization-benefit','activity-metric-benefit'],['Établissements','mobilization-capacity']],
    institute:[['Communisme / min','institute-benefit','activity-metric-benefit'],['Établissements','institute-capacity']],
  }[id]||[];
  stats.replaceChildren(...layout.map(([label,field,cls])=>investmentMetric(label,field,cls)),risk);
  // Match the historic cards: stock count immediately before the buy button,
  // with the country selector (where relevant) positioned with its action.
  let actions=card.querySelector('.investment-actions');
  if(!actions){
    actions=document.createElement('div');
    actions.className='investment-actions';
    buy.before(actions);
    actions.append(buy);
  }
  owned.remove();
  owned.className='activity-owned';
  actions.insertBefore(owned,buy);
  const partner=details.querySelector('.bilateral-select-label');
  if(partner)actions.insertBefore(partner,buy);
  buy.classList.add('buy-button','special-buy-button');
}
function createActivityCards() {
  const list = $('activity-list');
  const fragment = document.createDocumentFragment();
  for (const definition of ACTIVITIES) {
    const card = document.createElement('article');
    card.className = 'activity-card';
    card.dataset.activityId = definition.id;
    // This template contains only fixed application markup; imported save data
    // and display text are always assigned through textContent below.
    card.innerHTML = `<div class="activity-icon" aria-hidden="true"><svg class="activity-glyph" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyphs[glyphFor(definition.id)]}</svg></div><div class="activity-copy"><h3 class="activity-title"></h3><p class="activity-description"></p><div class="activity-meta"><span class="activity-effects"></span><span class="activity-unlock"></span></div></div><div class="activity-purchase"><span class="activity-owned"></span><button class="buy-button" type="button"><span class="activity-buy-label"></span><strong class="activity-price"></strong></button><div class="activity-conversion" hidden><label class="conversion-label">Transformer en <select class="activity-conversion-target conversion-select" aria-label="Nouvelle activité"></select></label><button class="activity-convert-button" type="button">Transformer 1 commerce</button></div></div>`;
    const refs = Object.fromEntries(['title', 'description', 'owned', 'effects', 'unlock', 'buy-label', 'price'].map(name => [name, card.querySelector(`.activity-${name}`)]));
    refs.button = card.querySelector('.buy-button');
    refs.conversionBox=card.querySelector('.activity-conversion');
    refs.conversionSelect=card.querySelector('.activity-conversion-target');
    refs.convertButton=card.querySelector('.activity-convert-button');
    // Destinations are populated on render as the player unlocks activities.
    refs.card = card;
    setText(refs.title, definition.name);
    setText(refs.description, definition.description);
    refs.button.addEventListener('click', () => {
      if (!canWrite) return;
      advance(state);
      const result = buyActivity(state, definition.id, quantity);
      if (!result.ok) { render(); return; }
      changed();
      notify(`${result.bought} × ${definition.name} · ${money(result.spent)}`);
    });
    refs.conversionSelect?.addEventListener('change',()=>renderActivities());
    refs.convertButton?.addEventListener('click',()=>{
      if(!canWrite)return;
      advance(state);
      const targetId=refs.conversionSelect.value;
      const converted=convertActivity(state,definition.id,targetId);
      if(!converted.ok){render();return;}
      changed();
      const target=ACTIVITIES.find(activity=>activity.id===targetId);
      notify(`Commerce transformé en ${target?.name||targetId} · ${money(converted.cost)} de frais`);
    });
    cards.set(definition.id, refs);
    fragment.append(card);
  }
  list.replaceChildren(fragment);
  // Place sensitive investments among ordinary purchases, never buried below.
  const section=document.querySelector('.investments-section');
  if(section){
    const special=[...section.querySelectorAll('.investment-grid > article')]
      .filter(card=>!card.classList.contains('investment-propaganda'));
    const insertAfter=[2,6,10,14,18];
    for(const [index,card] of special.entries()){
      const id=card.querySelector('button[id$="-buy"]')?.id?.replace(/-buy$/,'');
      if(!id)continue;
      card.classList.add('activity-card','special-activity-card');
      card.dataset.investmentId=id;
      unifyInvestmentCard(card,id);
      const at=Math.min(list.children.length,insertAfter[index]+index+1);
      list.insertBefore(card,list.children[at]||null);
      specialCards.push({id,card});
    }
    // Legacy agencies retain their saved benefits, but new ones are merged
    // into the poster workshop rather than sold as a second purchase.
    section.remove();
  }
}

function effectsText(effects) {
  const result = [];
  if (effects.production) result.push(`+${format(effects.production)} ₽ / clic`);
  if (effects.taxes) result.push(`+${format(effects.taxes)} ₽ / s`);
  if (effects.productionPercent) result.push(`+${format(effects.productionPercent)} % production`);
  if (effects.taxPercent) result.push(`+${format(effects.taxPercent)} % taxes`);
  if (effects.communism) result.push(`+${format(effects.communism)} communisme`);
  return result.join(' · ');
}

function renderActivities() {
  const list=$('activity-list');
  const normalize=value=>value.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const specialOwned=id=>id==='import'?world.usImports||0:
    id==='bureaucracy'?state.bureaucracyOffices||0:
    id==='bilateral'?world.bilateral.length:
    id==='mobilization'?state.mobilizationHouses||0:
    id==='institute'?state.ideologyInstitutes||0:0;
  const specialUnlocked=id=>id==='import'||id==='institute'?state.communism>=150:
    id==='bureaucracy'?state.communism>=25:
    id==='mobilization'?state.communism>=40:
    id==='bilateral'?!!world.origin:false;
  const eligible=[...list.children].filter(card=>{
    if(card.dataset.activityId){
      const item=getActivity(state,card.dataset.activityId);
      return (!search||normalize(item.name+' '+item.description).includes(search))&&
        (filter==='all'||filter==='available'&&item.unlocked||filter==='owned'&&item.owned>0);
    }
    const id=card.dataset.investmentId;
    if(!id)return false;
    return (!search||normalize(card.textContent).includes(search))&&
      (filter==='all'||filter==='available'&&specialUnlocked(id)||filter==='owned'&&specialOwned(id)>0);
  });
  const pageSize=activityPageSize();
  const pages=Math.max(1,Math.ceil(eligible.length/pageSize));
  activityPage=Math.min(activityPage,pages-1);
  const showing=new Set(eligible.slice(activityPage*pageSize,(activityPage+1)*pageSize));
  for(const {card} of specialCards)card.hidden=!showing.has(card);
  let visible = 0;
  for (const definition of ACTIVITIES) {
    const item = getActivity(state, definition.id);
    const refs = cards.get(item.id);
    const matchesSearch = !search || `${item.name} ${item.description}`.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(search);
    const matchesFilter = filter === 'all' || (filter === 'available' && item.unlocked) || (filter === 'owned' && item.owned > 0);
    refs.card.hidden = !matchesSearch || !matchesFilter || !showing.has(refs.card);
    if (refs.card.hidden) continue;
    visible++;
    const quote = quotePurchase(state, item.id, quantity);
    refs.card.classList.toggle('is-locked', !item.unlocked);
    refs.card.classList.toggle('is-owned', item.owned > 0);
    refs.card.classList.toggle('can-afford', quote.ok);
    setText(refs.owned, `×${integer.format(item.owned)}`);
    refs.owned.setAttribute('aria-label', `${integer.format(item.owned)} unité${item.owned > 1 ? 's' : ''} possédée${item.owned > 1 ? 's' : ''}`);
    const rate=activityBusinessRate(state,item.id);
    if(rate){
      const metric=(label,value,extraClass='')=>{
        const span=document.createElement('span');
        span.className='activity-metric '+extraClass;
        const caption=document.createElement('small');caption.textContent=label;
        const number=document.createElement('strong');number.textContent=value;
        span.append(caption,number);
        return span;
      };
      refs.effects.replaceChildren(
        metric('CA / s',money(rate.grossPerSecond),'activity-metric-gross'),
        metric('Taxe',`${rate.taxRate} %`,'activity-metric-tax'),
        metric('Trésorerie / s',money(rate.treasuryPerSecond),'activity-metric-net'),
      );
      const politicalPenalty=state.worldEconomyEnabled?(COMMUNISM_PURCHASE_PENALTY[item.id]||0):0;
      if(Object.hasOwn(CORRUPTION_PURCHASE,item.id)){
        const risk=document.createElement('span');
        risk.className='activity-corruption';
        const corruption=CORRUPTION_PURCHASE[item.id];
        const perMinute=getActivityCorruptionRate(item.id);
        risk.textContent=politicalPenalty
          ? `⚠ À l’achat : −${format(politicalPenalty)} communisme · +${format(corruption)} corruption. Ensuite +${format(perMinute)} corruption/min.`
          : `⚠ Corruption : +${format(corruption)} à l’achat, puis +${format(perMinute)}/min.`;
        refs.effects.append(risk);
      }
      if(item.effects.communism&&!politicalPenalty){
        const communism=document.createElement('span');
        communism.className='activity-communism';
        communism.textContent=`+${format(item.effects.communism)} communisme à l’achat · progression lente et continue`;
        refs.effects.append(communism);
      }
      if(item.id==='posters'&&(state.propagandaAgencies||0)>0){
        const legacy=document.createElement('span');
        legacy.className='activity-legacy-note';
        legacy.textContent=`Anciennes agences de propagande : ×${integer.format(state.propagandaAgencies)} · effets conservés dans ta sauvegarde`;
        refs.effects.append(legacy);
      }
    } else setText(refs.effects,effectsText(item.effects));
    const cooperative=COOPERATIVE_CORRUPTION_PREVENTION[item.id];
    if(cooperative){
      const safeguard=document.createElement('span');
      safeguard.className='activity-cooperative-effect';
      const effectiveCount=Math.min(item.owned,cooperative.maxUnits);
      safeguard.textContent=`🛡️ −${format(cooperative.perUnit*100)} % de corruption nouvelle par établissement · protection actuelle : ${format(effectiveCount*cooperative.perUnit*100)} % (jusqu'à ${cooperative.maxUnits} établissements)`;
      refs.effects.append(safeguard);
    }
    refs.unlock.hidden = item.unlocked;
    setText(refs.unlock, `Déblocage à ${format(item.unlock)} de communisme`);
    const convertible=Object.hasOwn(CONVERSION_TARGETS,item.id);
    refs.conversionBox.hidden=!convertible||item.owned===0;
    if(convertible){
      refreshConversionTargets(refs.conversionSelect,item.id);
      const offer=quoteActivityConversion(state,item.id,refs.conversionSelect.value);
      refs.convertButton.disabled=!canWrite||!offer.ok||!offer.available;
      setText(refs.convertButton,offer.ok?
        `Transformer 1 · frais ${money(offer.cost)}`:
        !refs.conversionSelect.options.length?'Aucun autre établissement débloqué':
        offer.reason==='not-owned'?'Aucun commerce à transformer':
        'Transformation indisponible');
    }
    refs.button.disabled = !canWrite || !quote.ok;
    setText(refs['buy-label'], !item.unlocked ? 'Verrouillé' : item.owned >= RULES.maxOwned ? 'Maximum atteint' : `Acheter${quote.quantity > 1 ? ` ×${integer.format(quote.quantity)}` : ''}`);
    const cost = quote.ok ? quote.cost : item.cost;
    setText(refs.price, money(cost));
    refs.button.setAttribute('aria-label', !item.unlocked ? `${item.name} : déblocage à ${format(item.unlock)} de communisme` : `Acheter ${quote.quantity || 1} ${item.name}, ${format(cost)} roubles`);
    refs.button.title = !item.unlocked ? `Il manque ${format(item.unlock - state.communism)} points de communisme.` : !quote.ok ? 'Produis davantage de roubles pour cet achat.' : 'Les achats par lot utilisent le budget disponible.';
  }
  if ($('activity-empty')) $('activity-empty').hidden = eligible.length > 0;
  setText($('activity-count'),`${eligible.length} achats · page ${activityPage+1}/${pages}`);
  setText($('activity-page-status'),`Page ${activityPage+1} sur ${pages}`);
  const prev=$('activity-page-prev'),next=$('activity-page-next');
  if(prev)prev.disabled=activityPage===0;
  if(next)next.disabled=activityPage>=pages-1;
  $('activity-pagination')?.toggleAttribute('hidden',pages===1);
}

const goalNodes = new Map();
function renderGoals() {
  const list = $('goals-list');
  if (!list) return;
  for (const goal of getGoals(state)) {
    if (!goalNodes.has(goal.id)) {
      const item = document.createElement('li');
      item.className = 'goal-item';
      item.innerHTML = '<span class="goal-marker" aria-hidden="true"></span><div class="goal-copy"><strong class="goal-title"></strong><p class="goal-description"></p><span class="goal-count"></span><progress class="goal-progress" max="1"></progress></div>';
      list.append(item);
      goalNodes.set(goal.id, item);
    }
    const item = goalNodes.get(goal.id);
    item.classList.toggle('is-complete', goal.complete);
    setText(item.querySelector('.goal-marker'), goal.complete ? '✓' : String([...goalNodes.keys()].indexOf(goal.id) + 1).padStart(2, '0'));
    setText(item.querySelector('.goal-title'), goal.title);
    setText(item.querySelector('.goal-description'), goal.description);
    setText(item.querySelector('.goal-count'), goal.complete ? 'Accompli' : `${format(Math.min(goal.current, goal.target))} / ${format(goal.target)}`);
    const progress = item.querySelector('progress');
    progress.value = goal.progress;
    progress.setAttribute('aria-label', goal.title);
  }
}

function syncStakhanovPenaltyVisibility() {
  const audio=$('anthem-audio');
  const penalty=document.querySelector('.production-ideology-cost');
  if(penalty)penalty.hidden=Boolean(audio&&!audio.paused&&!audio.ended&&audio.currentTime<ANTHEM_END_SECONDS);
}

function render() {
  syncStakhanovPenaltyVisibility();
  const stats = getStats(state);
  const anthemReward=getAnthemReward(state);
  $('anthem-button')?.classList.toggle('has-scaled-reward',anthemReward>2);
  setText($('anthem-status'),`+${format(anthemReward)} points communisme`);
  $('anthem-button')?.setAttribute('aria-label',
    `Écouter L’Internationale · +${format(anthemReward)} points de communisme à la fin`);
  $('produce-button').disabled = !canWrite;
  for (const id of ['import-save', 'reset-open', 'reset-confirm']) { if ($(id)) $(id).disabled = !canWrite; }
  setText($('balance'), format(stats.cash));
  setText($('home-balance'),format(stats.cash));
  setText($('home-communism'),format(stats.communism));
  setText($('home-production'),format(stats.productionPerClick));
  setText($('home-taxes'),format(stats.business.taxesCollectedPerSecond));
  setText($('home-commerce'),format(stats.business.businessIncomePerSecond));
  setText($('home-corruption'),`${format(stats.corruption)} points`);
  const worldTrust=stats.communism+stats.corruption>0?stats.communism/(stats.communism+stats.corruption):1;
  setText($('home-confidence'),`${format(worldTrust*100)} % de confiance`);
  setText($('corruption-value'),format(stats.corruption));
  const offer=getUSImportOffer(world,state);
  setText($('import-owned'),`×${integer.format(offer.count)}`);
  const importRate=activityBusinessRate(state,'us-imports');
  setText($('import-gross'),money(importRate.grossPerSecond));
  setText($('import-tax'),`${importRate.taxRate} %`);
  setText($('import-net'),money(importRate.treasuryPerSecond));
  $('import-risk')?.classList.toggle('activity-communism',!offer.capitalist);
  $('import-risk')?.classList.toggle('activity-corruption',offer.capitalist);
  setText($('import-risk'),offer.capitalist?'⚠ À l’achat : −5 communisme · +5 corruption. Ensuite +0,15 corruption/min par importation.':'Échanges apaisés avec les États-Unis.');
  if($('import-buy')){
    $('import-buy').disabled=!canWrite||!offer.available;
    setInvestmentPurchase($('import-buy'),state.communism<150?'Verrouillé':'Acheter',offer.cost);
  }
  const importTarget=$('import-conversion-target');
  const importButton=$('import-convert');
  if(importTarget&&importButton){
    refreshConversionTargets(importTarget,'us-imports');
    const conversion=quoteActivityConversion(state,'us-imports',importTarget.value);
    importButton.disabled=!canWrite||!conversion.ok||!conversion.available;
    setText(importButton,conversion.ok?
      `Transformer 1 · frais ${money(conversion.cost)}`:
      'Aucune importation à transformer');
  }
  const bureau=getBureaucracyOffer(state);
  setText($('bureaucracy-risk'),'⚠ À l’achat : −4 communisme · +2 corruption. Ensuite +0,09 corruption/min par groupe.');
  setText($('bureaucracy-agents'),integer.format(bureau.count*5));
  setText($('bureaucracy-gain'),'+2 %');
  setText($('bureaucracy-owned'),`×${integer.format(bureau.count)}`);
  if($('bureaucracy-buy')){
    $('bureaucracy-buy').disabled=!canWrite||!bureau.available;
    setInvestmentPurchase($('bureaucracy-buy'),state.communism<25?'Verrouillé':'Renforcer',bureau.cost);
  }
  const propaganda=getPropagandaOffer(state);
  setText($('propaganda-risk'),'⚠ Corruption accrue · −3 communisme à l’achat');
  setText($('propaganda-owned'),`${propaganda.count} agence${propaganda.count>1?'s':''}`);
  if($('propaganda-buy')){
    $('propaganda-buy').disabled=!canWrite||!propaganda.available;
    setText($('propaganda-buy'),state.communism<40?'Déblocage à 40 communisme':`Acheter · ${money(propaganda.cost)}`);
  }
  for(const id of ['mobilization','institute']){
    const offer=getIdeologyInstitutionOffer(state,id);
    if(!offer)continue;
    setText($(id+'-owned'),`×${integer.format(offer.count)}`);
    setText($(id+'-benefit'),`+${format(offer.communismPerMinute)}`);
    setText($(id+'-capacity'),`${integer.format(offer.count)} / ${integer.format(offer.max)}`);
    setText($(id+'-risk'),`⚠ À l’achat : +${format(offer.corruptionOnPurchase)} corruption. Ensuite +${format(offer.corruptionPerMinute)} corruption/min par établissement.`);
    const button=$(id+'-buy');
    if(button){
      button.disabled=!canWrite||!offer.available;
      setInvestmentPurchase(button,offer.count>=offer.max?'Maximum atteint':
        offer.locked?'Verrouillé':'Construire',offer.count>=offer.max?null:offer.cost);
    }
  }
  setText($('bilateral-owned'),`×${integer.format(world.bilateral.length)}`);
  setText($('bilateral-count'),integer.format(world.bilateral.length));
  setText($('bilateral-gain'),'+1 %');
  setText($('bilateral-risk'),'⚠ À la signature : −6 communisme · +4 corruption. Ensuite +0,10 corruption/min par accord.');
  setText($('investments-corruption'),format(stats.corruption));
  setText($('investments-corruption-rate'),`+${format(stats.corruptionPerMinute)} / min`);
  refreshBilateralSelector();
  const bilateralId=$('bilateral-country')?.value;
  const agreement=bilateralId?getBilateralOffer(world,state,bilateralId):null;
  if($('bilateral-buy')){
    $('bilateral-buy').disabled=!canWrite||!agreement?.available;
    setInvestmentPurchase($('bilateral-buy'),!agreement?'Aucun pays disponible':agreement.signed?'Accord déjà conclu':
      state.communism<100?'Verrouillé':'Signer',agreement?.cost??null);
  }
  setText($('production-rate'), format(stats.productionPerClick));
  setText($('tax-rate'), format(stats.business.netToTreasuryPerSecond));
  setText($('communism'), format(stats.communism));
  setText($('communism-per-minute'), `+${format(stats.communismPerMinute)} / min`);
  setText($('home-communism-per-minute'), `+${format(stats.communismPerMinute)} / min`);
  setText($('owned-count'), integer.format(stats.totalOwned));
  setText($('owned-label'), stats.totalOwned > 1 ? ' activités' : ' activité');
  setText($('produce-gain'), `+${money(stats.productionPerClick)} / clic`);
  setText($('finance-gross'),money(stats.business.grossPerSecond));
  setText($('finance-taxes'),money(stats.business.taxesCollectedPerSecond));
  setText($('finance-business-income'),money(stats.business.businessIncomePerSecond));
  setText($('finance-net'),money(stats.business.netToTreasuryPerSecond));
  setText($('finance-countdown'),duration(stats.business.secondsUntilPayout*1000));
  setText($('public-budget'),money(stats.publicBudget));
  const publicNetRate=stats.business.taxesCollectedPerSecond-stats.business.infrastructure.costPerSecond;
  setText($('public-budget-rate'),`${publicNetRate>=0?'+':'−'}${money(Math.abs(publicNetRate))} / s · solde public`);
  setText($('public-collected'),money(stats.publicTaxesCollected));
  const infrastructure=stats.business.infrastructure;
  const missingInfrastructure=Object.values(infrastructure.missing).some(count=>count>0);
  const infrastructureStatus=$('public-infrastructure-status');
  if(infrastructureStatus){
    infrastructureStatus.hidden=!missingInfrastructure;
    if(missingInfrastructure){
      const taxes=stats.business.taxesCollectedPerSecond;
      const shortage=Math.max(0,infrastructure.costPerSecond-taxes);
      setText(infrastructureStatus,`⚠ Équipements insuffisants : entretien d’urgence −${money(infrastructure.costPerSecond)}/s sur la caisse publique. ${shortage>0?`Risque de perte de trésorerie : −${money(shortage)}/s après épuisement de la caisse.`:'Les recettes fiscales couvrent encore les frais, mais les moyens disponibles pour investir diminuent.'}`);
    }
  }
  setText($('public-crises'),stats.crisesPending?
    `⚠ ${stats.crisesPending} difficulté${stats.crisesPending>1?'s':''} en cours · les services publics ont besoin de soutien.`:
    '✓ Situation stable · aucun incident à gérer pour le moment.');
  $('public-crises')?.classList.toggle('has-crisis',stats.crisesPending>0);
  const integrity=stats.corruptionBreakdown;
  setText($('public-integrity-status'),`🛡️ Prévention : ${format(integrity.prevention*100)} % par la transparence, ${format(integrity.inspectorateReduction*100)} % du reste par les inspections, puis ${format(integrity.cooperativePrevention*100)} % du reste par les coopératives (max ${format(COOPERATIVE_PREVENTION_MAX*100)} %) · corruption nouvelle : +${format(integrity.net)} /min`);
  $('public-integrity-status')?.classList.toggle('is-improving',integrity.prevention>0||integrity.inspectorateReduction>0||integrity.cooperativePrevention>0);
  const projects=stats.publicProjects;
  const needs=projects.needs;
  if($('public-needs-card'))$('public-needs-card').hidden=!needs.pending;
  setText($('public-needs-title'),needs.name);
  setText($('public-needs-description'),needs.description);
  for(const name of ['services','solidarity','crisis','transport','housing','audit','maintenance','needs','transparency','inspectorates']){
    const offer=projects[name];
    const button=$('public-project-'+name);
    const progress=name==='transparency'?`${offer.level}/${offer.maxLevel} établissements · ${format(Math.min(6,offer.level)*10+Math.max(0,offer.level-6)*3)} % de corruption nouvelle évitée`:
      name==='inspectorates'?`${offer.level}/${offer.maxLevel} établissements · ${format(Math.min(12,offer.level)*5+Math.max(0,offer.level-12)*2)} % du reste de corruption nouvelle évitée`:
      name==='needs'?`${offer.pending} besoin${offer.pending>1?'s':''} collectif${offer.pending>1?'s':''} en attente · les équipements demandent du soutien`:
      name==='crisis'?`${stats.crisesPending} intervention${stats.crisesPending>1?'s':''} nécessaire${stats.crisesPending>1?'s':''}`:
      name==='audit'?`${offer.charges}/${offer.maxCharges} inspections en réserve · ${offer.charges===offer.maxCharges?'réserve pleine':`prochaine charge dans ${duration(offer.cooldownMs)}`} · −30 % de corruption par inspection`:
      name==='maintenance'?'Mission renouvelable · entretien préventif':
      `Développement ${offer.level}/${offer.maxLevel}${offer.locked&&!offer.fullyDeveloped?' · nouveaux paliers avec la croissance':''}${['services','transport','housing'].includes(name)&&infrastructure.required[name]>0?` · minimum requis ${infrastructure.required[name]}${infrastructure.missing[name]>0?' ⚠ insuffisant':' ✓'}`:''}`;
    setText($('public-project-'+name+'-level'),progress);
    if(button){
      button.disabled=!canWrite||!offer.available;
      setText(button,offer.locked?(name==='crisis'?'Aucune crise':name==='audit'?(offer.cooldownActive?`Disponible dans ${duration(offer.cooldownMs)}`:'Comptes assainis'):name==='needs'?'Aucune demande en attente':name==='maintenance'?'Équipements en état':offer.fullyDeveloped?'Programme achevé':'En attente de développement'):
        `${name==='audit'?`Inspecter (${offer.charges}/${offer.maxCharges})`:name==='transparency'?'Construire':name==='inspectorates'?'Ouvrir':name==='needs'?'Financer':name==='maintenance'?'Entretenir':name==='crisis'?'Intervenir':'Investir'} · ${money(offer.cost)}`);
    }
  }
  for(const button of document.querySelectorAll('[data-tax-policy]')){
    const active=button.dataset.taxPolicy===stats.business.taxPolicy;
    const forecast=getBusinessEconomyForPolicy(state,button.dataset.taxPolicy);
    const preview=button.querySelector('[data-policy-preview]');
    if(preview)setText(preview,`${TAX_POLICIES[button.dataset.taxPolicy]} %`);
    const estimate=button.querySelector('[data-policy-estimate]');
    if(estimate)setText(estimate,`≈ ${money(forecast.taxesCollectedPerSecond)}/s pour la caisse`);
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));button.disabled=!canWrite;
  }
  setText($('finance-tip'),stats.business.owned
    ? `${integer.format(stats.business.owned)} entreprise${stats.business.owned>1?'s':''} · recettes après impôt en trésorerie et taxes dans la caisse publique chaque seconde.`
    : 'Achète une entreprise pour percevoir des revenus chaque seconde.');
  setText($('session-stats'), `${integer.format(stats.clicks)} clics · ${format(stats.totalEarned)} roubles produits · ${integer.format(stats.plan.completed)} plans terminés`);
  setText($('inflation-value'), `${stats.taxInflation} % inflation · ${format(stats.corruption)} corruption`);
  const inflationButton = $('inflation-button');
  if(inflationButton){
    inflationButton.disabled=!canWrite||!stats.canReduceInflation;
    setText(inflationButton,stats.corruption>=1&&state.worldEconomyEnabled
      ? 'Assainir · 15 ₽ de caisse publique'
      : stats.corruption>=1?'Réduire la corruption':'Réduire l’inflation');
  }
  const plan = stats.plan;
  const planButton = $('plan-button');
  const progress = $('plan-progress');
  if (progress) {
    const ratio = plan.unlocked ? plan.status === 'ready' ? 1 : plan.status === 'running' ? Math.max(0, 1 - plan.remainingMs / plan.durationMs) : 0 : Math.min(1, stats.communism / RULES.planUnlock);
    if ('value' in progress) { progress.max = 1; progress.value = ratio; }
    else { progress.style.width = `${ratio * 100}%`; progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100))); }
  }
  if (planButton) {
    planButton.disabled = !canWrite || !plan.unlocked || plan.status === 'running';
    setText(planButton, !plan.unlocked ? 'Plan verrouillé' : plan.status === 'ready' ? `Recevoir ${money(plan.reward)}` : plan.status === 'running' ? 'Plan en cours' : 'Lancer le plan');
  }
  setText($('plan-status'), !plan.unlocked ? `À ${format(RULES.planUnlock)} points de communisme` : plan.status === 'ready' ? 'Objectif atteint. La récompense est prête.' : plan.status === 'running' ? 'La production suit son cours.' : `Récompense : ${money(plan.reward)}`);
  setText($('plan-reward'), money(plan.reward));
  setText($('plan-countdown'), !plan.unlocked ? `${format(stats.communism)} / ${format(RULES.planUnlock)}` : plan.status === 'ready' ? 'Terminé' : plan.status === 'running' ? duration(plan.remainingMs) : duration(plan.durationMs));
  renderActivities();
  renderGoals();
  renderWorld();
}

function showOffline(info) {
  if (!info || info.earned <= 0 || info.elapsedMs < 60000) return;
  setText($('offline-earned'), format(info.earned));
  setText($('offline-duration'), `${duration(info.creditedMs)} de recettes${info.capped ? ' — absence limitée à 8 heures de gains' : ' pendant ton absence'}.`);
  openDialog('offline-dialog');
}

createActivityCards();
render();

$('produce-button').addEventListener('click', event => {
  if (!canWrite) return;
  advance(state);
  const anthemPlaying=Boolean(anthemAudio&&!anthemAudio.paused&&!anthemAudio.ended&&anthemAudio.currentTime<ANTHEM_END_SECONDS);
  const result = clickProduce(state,{anthemPlaying});
  changed();
  if (!reduceMotion.matches) {
    const button = event.currentTarget;
    button.classList.remove('is-pressed');
    requestAnimationFrame(() => button.classList.add('is-pressed'));
    setTimeout(() => button.classList.remove('is-pressed'), 160);
  }
  // One concise announcement per second avoids flooding screen readers.
  if (Date.now() - lastAnnouncement > 1000) {
    $('produce-button').setAttribute('aria-label', anthemPlaying
      ? `Pousser la production : ${numbers.format(result.earned)} roubles gagnés`
      : `Pousser la production : ${numbers.format(result.earned)} roubles gagnés, ${numbers.format(result.communismLost)} communisme perdu`);
    lastAnnouncement = Date.now();
  }
});

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    activityPage=0;
    for (const other of document.querySelectorAll('[data-filter]')) {
      other.classList.toggle('is-active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    }
    renderActivities();
  });
}
$('activity-search')?.addEventListener('input', event => {
  search = event.currentTarget.value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  activityPage=0;
  renderActivities();
});
for(const width of ['(max-width: 700px)','(max-width: 1100px)']){
  const media=window.matchMedia(width);
  media.addEventListener('change',()=>{
    const oldPageSize=lastActivityPageSize;
    const nextPageSize=activityPageSize();
    activityPage=Math.floor(activityPage*oldPageSize/nextPageSize);
    lastActivityPageSize=nextPageSize;
    renderActivities();
  });
}
for(const [id,delta] of [['activity-page-prev',-1],['activity-page-next',1]]){
  $(id)?.addEventListener('click',()=>{
    activityPage=Math.max(0,activityPage+delta);
    renderActivities();
    document.querySelector('.activity-toolbar')?.scrollIntoView({block:'start',behavior:reduceMotion.matches?'auto':'smooth'});
  });
}
$('buy-quantity')?.addEventListener('change', event => {
  quantity = event.currentTarget.value === 'max' ? 'max' : Number(event.currentTarget.value);
  renderActivities();
});
$('plan-button')?.addEventListener('click', () => {
  if (!canWrite) return;
  advance(state);
  const plan = getStats(state).plan;
  const result = plan.status === 'ready' ? claimPlan(state) : startPlan(state);
  if (result.ok) { changed(); notify(result.earned ? `Plan accompli : +${money(result.earned)}` : 'Le plan quinquennal est lancé.'); }
});
$('inflation-button')?.addEventListener('click', () => {
  if (!canWrite) return;
  advance(state);
  const result = reduceInflation(state);
  if(result.ok){
    changed();
    notify(result.corruptionReduced
      ? `Corruption réduite de ${format(result.corruptionReduced)} · ${money(result.spent||0)} de budget public mobilisés`
      : `Inflation des taxes : −1 point · +1 communisme · +${money(result.earned)}`);
  } else if(result.reason==='public-funds'){
    notify('Caisse publique insuffisante pour financer une enquête anticorruption.');
  }
});

function updateNavigation() {
  const selected = location.hash || '#command-panel';
  for (const link of document.querySelectorAll('.mobile-nav a')) {
    const active = link.getAttribute('href') === selected;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', updateNavigation);
updateNavigation();

$('help-button')?.addEventListener('click', () => openDialog('help-dialog'));
$('settings-button')?.addEventListener('click', () => openDialog('settings-dialog'));
for (const button of document.querySelectorAll('[data-open-dialog]')) {
  button.addEventListener('click', () => openDialog(button.dataset.openDialog));
}
for (const button of document.querySelectorAll('[data-close-dialog]')) {
  button.addEventListener('click', () => closeDialog(button.closest('dialog')));
}
$('offline-dismiss')?.addEventListener('click', () => closeDialog($('offline-dialog')));
$('reset-open')?.addEventListener('click', () => { closeDialog($('settings-dialog')); openDialog('reset-dialog'); });
$('reset-confirm')?.addEventListener('click', () => {
  if (!canWrite) return;
  state = createState();
  world = createWorld();
  selectedBilateralCountry='';
  save({ backup: true });
  requestAnimationFrame(showCountryDialog);
  render();
  closeDialog($('reset-dialog'));
  notify('Nouvelle partie. La première fabrique t’attend.');
});

$('export-save')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({...exportState(state),world}, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ussr-simulator-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  notify('Sauvegarde exportée. Conserve ce fichier pour retrouver ta partie.');
});
$('import-save')?.addEventListener('change', async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > RULES.maxSaveBytes) throw new Error('Fichier trop volumineux : la limite est de 1 Mo.');
    const raw = JSON.parse(await file.text());
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== RULES.saveVersion || !raw.owned || typeof raw.owned !== 'object' || Array.isArray(raw.owned) || typeof raw.cash !== 'number') {
      throw new Error('Ce fichier n’est pas une sauvegarde compatible de cette version du jeu.');
    }
    if (!canWrite) throw new Error('La partie est active dans un autre onglet. Ferme-le avant de réessayer.');
    const imported = hydrateState(raw);
    state = imported;
    world=hydrateWorld(raw.world);
    state.importsOwned=world.usImports;state.usCapitalist=!world.partners.includes(USA_COUNTRY_ID);state.bilateralAgreements=world.bilateral.length;state.worldEconomyEnabled=true;
    save({ backup: true });
    if(!world.origin)requestAnimationFrame(showCountryDialog);
    render();
    closeDialog($('settings-dialog'));
    notify(imported.recovered ? 'Partie importée. Quelques valeurs invalides ont été corrigées.' : 'Partie importée. Bon retour !');
  } catch (error) {
    notify(error instanceof SyntaxError ? 'Le fichier JSON est illisible. Ta partie actuelle est conservée.' : error.message || 'Import impossible. Ta partie actuelle est conservée.');
  } finally { input.value = ''; }
});

// Wall-clock deltas are accounted for by the engine, including a suspended tab.
setInterval(() => {
  if (document.hidden || !canWrite) return;
  const result = advance(state);
  if (result.elapsedMs > 0) dirty = true;
  render();
  if(result.publicNeedsCreated)notify('Un nouveau besoin de services publics apparaît : consulte la caisse.');
}, 500);
setInterval(() => { if (!document.hidden && dirty) save(); }, 2500);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else if (canWrite) {
    const result = advance(state);
    render();
    showOffline(result);
    save();
  }
});
window.addEventListener('pagehide', () => {
  save();
  if (releaseSession) { releaseSession(); releaseSession = null; canWrite = false; sessionRequested = false; }
});
window.addEventListener('pageshow', event => { if (event.persisted) acquireSession(); });
window.addEventListener('storage', event => {
  if (event.key !== SAVE_KEY || !event.newValue) return;
  // Keep multiple open tabs in step instead of repeatedly overwriting one save.
  try { if (localStorage.getItem(SAVE_KEY) !== event.newValue) return; } catch { return; }
  const incoming = hydrateState(event.newValue);
  if (!incoming.recovered) { state = incoming;try { const other=localStorage.getItem(WORLD_KEY);if(other)world=hydrateWorld(JSON.parse(other));state.importsOwned=world.usImports;state.usCapitalist=!world.partners.includes(USA_COUNTRY_ID);state.bilateralAgreements=world.bilateral.length;state.worldEconomyEnabled=true; } catch {} dirty = false; render(); }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if ($('install-button')) $('install-button').hidden = false;
});
$('install-button')?.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('install-button').hidden = true;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if ($('install-button')) $('install-button').hidden = true;
  notify('Le jeu est installé sur ton appareil.');
});
// During browser playtesting, no service worker is registered.
// The index page unregisters older workers without altering localStorage.

if (state.recovered) {
  try { if (rawSave) localStorage.setItem(BACKUP_KEY, rawSave); } catch { /* The visible storage warning covers this case. */ }
  notify('La sauvegarde contenait des valeurs invalides. Une partie récupérée a été chargée.');
}
// A single writer prevents two game tabs from overwriting each other's actions.
// Web Locks are origin-scoped and are automatically released with the page.
function showSessionWarning(){
 let warning=$('other-tab-warning');
 if(!warning){
   warning=document.createElement('div');
   warning.id='other-tab-warning';
   warning.className='storage-warning game-session-warning';
   warning.setAttribute('role','status');
   const message=document.createElement('p');
   message.textContent='Une autre page garde la main sur cette partie. Tu peux reprendre les achats ici sans effacer ta sauvegarde.';
   const button=document.createElement('button');
   button.id='takeover-session';
   button.type='button';
   button.textContent='Reprendre la partie sur cet onglet';
   button.addEventListener('click',()=>{
     sessionChannel?.postMessage({type:'release-request'});
     acquireSession(true);
   });
   warning.append(message,button);
   // Keep recovery accessible from every screen, even if the settings panel is hidden.
   document.body.append(warning);
 }
 warning.hidden=false;
}
sessionChannel?.addEventListener('message',event=>{
 if(event.data?.type!=='release-request'||!canWrite)return;
 save();
 canWrite=false;
 if(releaseSession){const resolve=releaseSession;releaseSession=null;resolve();}
 showSessionWarning();
 render();
});
function acquireSession(force=false){
 // A forced takeover must not wait behind an obsolete tab's lock.
 // The existing save is reloaded only after this tab obtains ownership.
 if(sessionRequested)return;
 sessionRequested=true;
 if(!('locks' in navigator)){
   canWrite=true;sessionRequested=false;render();showOffline(getStats(state).offline);save();return;
 }
 if(!canWrite)showSessionWarning();
 const options=force?{steal:true}:{ifAvailable:true};
 navigator.locks.request(SAVE_KEY,options,async lock=>{
   if(!lock){sessionRequested=false;showSessionWarning();return;}
   try{
     const current=localStorage.getItem(SAVE_KEY);
     if(current)state=hydrateState(current);
     const other=localStorage.getItem(WORLD_KEY);
     if(other)world=hydrateWorld(JSON.parse(other));
     state.importsOwned=world.usImports;
     state.usCapitalist=!world.partners.includes(USA_COUNTRY_ID);
     state.bilateralAgreements=world.bilateral.length;
     state.worldEconomyEnabled=true;
   }catch{storageFailure();}
   canWrite=true;
   const warning=$('other-tab-warning');if(warning)warning.hidden=true;
   render();
   showOffline(getStats(state).offline);
   save();
   await new Promise(resolve=>{releaseSession=resolve;});
   canWrite=false;
   sessionRequested=false;
 }).catch(()=>{
   // Browser APIs may be restricted; retain the ability to play locally.
   sessionRequested=false;
   canWrite=true;
   const warning=$('other-tab-warning');if(warning)warning.hidden=true;
   render();
   save();
 });
}
acquireSession();


$('import-buy')?.addEventListener('click',()=>{
  if(!canWrite)return;advance(state);
  const bought=buyUSImports(world,state);if(!bought.ok)return;
  changed();notify(bought.communismLost?`Importation ouverte : −${format(bought.communismLost)} communisme, corruption en hausse.`:'Importation ouverte : échanges commerciaux renforcés.');
});
function refreshBilateralSelector(){
  const select=$('bilateral-country');
  if(!select)return;
  const choices=getVisibleCountries(world).filter(c=>c.id!==world.origin&&!world.partners.includes(c.id));
  const signature=JSON.stringify([world.origin,world.partners,getWorldStage(world)]);
  if(select.dataset.signature!==signature){
    select.dataset.signature=signature;
    const frag=document.createDocumentFragment();
    for(const c of choices){
      const option=document.createElement('option');
      option.value=c.id;
      option.textContent=c.name+(world.bilateral.includes(c.id)?' · accord actif':'');
      frag.append(option);
    }
    select.replaceChildren(frag);
    if(choices.some(c=>c.id===selectedBilateralCountry))select.value=selectedBilateralCountry;
    else if(choices.length)select.value=choices.find(c=>!world.bilateral.includes(c.id))?.id||choices[0].id;
  }
}
$('bilateral-country')?.addEventListener('change',()=>{
  selectedBilateralCountry=$('bilateral-country').value;
  render();
});
for(const project of ['services','solidarity','crisis','transport','housing','audit','maintenance','needs','transparency','inspectorates']){
  $('public-project-'+project)?.addEventListener('click',()=>{
    if(!canWrite)return;
    advance(state);
    const result=spendPublicBudget(state,project);
    if(!result.ok){render();return;}
    changed();
    notify(`${publicProjectOffers(state)[project].name} : action réalisée pour ${money(result.spent)}.`);
  });
}
$('import-conversion-target')?.addEventListener('change',()=>render());
$('import-convert')?.addEventListener('click',()=>{
  if(!canWrite)return;advance(state);
  const targetId=$('import-conversion-target')?.value;
  const result=convertUSImports(world,state,targetId,convertActivity);
  if(!result.ok){render();return;}
  changed();
  const target=ACTIVITIES.find(activity=>activity.id===targetId);
  notify(`Importation transformée en ${target?.name||targetId} · frais ${money(result.cost)}`);
});
for(const id of ['mobilization','institute']){
  $(id+'-buy')?.addEventListener('click',()=>{
    if(!canWrite)return;
    advance(state);
    const result=buyIdeologyInstitution(state,id);
    if(!result.ok){render();return;}
    changed();
    notify(`${result.offer.name} : +${format(result.offer.communismPerMinute)} communisme/min · +${format(result.offer.corruptionPerMinute)} corruption/min.`);
  });
}
$('propaganda-buy')?.addEventListener('click',()=>{
  if(!canWrite)return;advance(state);
  const result=buyPropagandaAgency(state);
  if(!result.ok){render();return;}
  changed();notify(`Agence ouverte : −${format(result.communismLost)} communisme et corruption accrue.`);
});
$('bureaucracy-buy')?.addEventListener('click',()=>{
  if(!canWrite)return;
  advance(state);
  const result=buyBureaucracy(state);
  if(!result.ok){render();return;}
  changed();notify(`Cinq agents corrompus : −${format(result.communismLost)} communisme et corruption accrue.`);
});
$('bilateral-buy')?.addEventListener('click',()=>{
  if(!canWrite)return;
  advance(state);
  const id=$('bilateral-country')?.value;
  const result=buyBilateralAgreement(world,state,id);
  if(!result.ok){render();return;}
  selectedBilateralCountry=id;
  changed();notify(`Accord signé avec ${result.country.name} : −${format(result.communismLost)} communisme, corruption accrue.`);
});
for(const button of document.querySelectorAll('[data-tax-policy]'))button.addEventListener('click',()=>{
  if(!canWrite)return;advance(state);
  if(setTaxPolicy(state,button.dataset.taxPolicy)){
    changed();notify(`Politique appliquée : ${TAX_POLICY_LABELS[state.taxPolicy]}`);
  }
});
const anthemAudio = document.getElementById('anthem-audio');
const anthemButton = document.getElementById('anthem-button');
if (anthemAudio && anthemButton) {
  let rewardedThisListen = false;
  let progressFrame = null;
  const mediaSession = ('mediaSession' in navigator) ? navigator.mediaSession : null;
  const setRing = fraction => anthemButton.style.setProperty(
    '--anthem-progress',
    `${Math.min(100, Math.max(0, fraction * 100))}%`
  );
  setRing(1);

  function stopRing() {
    if (progressFrame !== null) cancelAnimationFrame(progressFrame);
    progressFrame = null;
  }
  function updateRing() {
    setRing(anthemAudio.currentTime / ANTHEM_END_SECONDS);
    // Browsers throttle animation frames in background tabs. Audio playback
    // MUST NOT depend on this loop; the real media clock remains authoritative.
    if (!document.hidden && !anthemAudio.paused && !anthemAudio.ended) {
      progressFrame = requestAnimationFrame(updateRing);
    } else {
      progressFrame = null;
    }
  }
  function updateMediaSession() {
    if (!mediaSession) return;
    mediaSession.playbackState = anthemAudio.paused ? 'paused' : 'playing';
    if (typeof mediaSession.setPositionState === 'function') {
      try {
        mediaSession.setPositionState({
          duration: ANTHEM_END_SECONDS,
          playbackRate: 1,
          position: Math.min(ANTHEM_END_SECONDS, Math.max(0, anthemAudio.currentTime)),
        });
      } catch { /* Older Android browsers may not expose media position. */ }
    }
  }

  function updateAnthem() {
    syncStakhanovPenaltyVisibility();
    const playing = !anthemAudio.paused && !anthemAudio.ended;
    anthemButton.setAttribute('aria-pressed', String(playing));
    anthemButton.classList.toggle('is-playing', playing);
    document.getElementById('anthem-label').textContent = playing
      ? 'Mettre en pause L’Internationale' : 'Écouter L’Internationale';
    document.getElementById('anthem-control-symbol').textContent = playing ? 'Ⅱ' : '▶';
    const currentBonus=getAnthemReward(state);
    document.getElementById('anthem-status').textContent = `+${format(currentBonus)} points communisme`;
    anthemButton.classList.toggle('has-scaled-reward',currentBonus>2);
    anthemButton.setAttribute('aria-label',
      `${playing?'Mettre en pause':'Écouter'} L’Internationale · +${format(currentBonus)} points de communisme à la fin`);
    updateMediaSession();
  }

  function finishAnthem() {
    // Listen through the 135-second excerpt of the French-language performance. The audio element's clock,
    // not timers or document visibility, decides whether playback completed.
    if (rewardedThisListen || !anthemClipFinished(anthemAudio.currentTime)) return;
    rewardedThisListen = true;
    stopRing();
    setRing(1);
    anthemAudio.pause();
    anthemAudio.currentTime = 0;
    if (canWrite) {
      const bonus = rewardAnthem(world, state);
      if (bonus.ok) {
        // changed() persists the reward immediately, even in a hidden tab.
        changed();
        notify(`Camaraderie renforcée : +${format(bonus.points)} communisme !`);
      }
    }
    updateAnthem();
  }

  async function startAnthem() {
    // Ensure the player element itself is not muted after a device or page switch.
    anthemAudio.muted=false;
    anthemAudio.volume=1;
    if (anthemAudio.currentTime === 0) {
      rewardedThisListen = false;
      setRing(0);
    }
    try {
      await anthemAudio.play();
    } catch {
      updateAnthem();
      notify('Lecture impossible : vérifie que le navigateur autorise le son.');
    }
  }
  function pauseAnthem() { anthemAudio.pause(); }
  function stopAnthem() {
    pauseAnthem();
    anthemAudio.currentTime = 0;
    rewardedThisListen = false;
    setRing(0);
    updateAnthem();
  }

  anthemButton.addEventListener('click', () => {
    if (anthemAudio.paused) startAnthem();
    else pauseAnthem();
  });
  anthemAudio.addEventListener('play', () => {
    stopRing();
    updateRing();
    updateAnthem();
  });
  anthemAudio.addEventListener('pause', () => {
    stopRing();
    // Keep the 100%-green completed state until the next listening session.
    setRing(rewardedThisListen ? 1 : anthemAudio.currentTime / ANTHEM_END_SECONDS);
    updateAnthem();
  });
  anthemAudio.addEventListener('timeupdate', () => {
    setRing(anthemAudio.currentTime / ANTHEM_END_SECONDS);
    finishAnthem();
    updateMediaSession();
  });
  anthemAudio.addEventListener('ended', finishAnthem);
  anthemAudio.addEventListener('error', () => {
    syncStakhanovPenaltyVisibility();
    stopRing();
    setRing(0);
    updateAnthem();
  });
  document.addEventListener('visibilitychange', () => {
    // Do not pause audio on tab switch or when the screen turns off.
    // Synchronize the progress ring on the next foreground visit.
    stopRing();
    if (!document.hidden && !anthemAudio.paused) updateRing();
    updateMediaSession();
  });

  if (mediaSession && 'MediaMetadata' in window) {
    try {
      mediaSession.metadata = new MediaMetadata({
        title: 'L’Internationale',
        artist: 'L’Internationale — chant français',
        album: 'Version française · Wikimedia Commons (CC0)',
        artwork: [
          { src: new URL('./assets/anthem-world.png', location.href).href, sizes: '96x96', type: 'image/png' },
        ],
      });
    } catch { /* Metadata is optional; audio still plays normally. */ }
  }
  if (mediaSession && typeof mediaSession.setActionHandler === 'function') {
    for (const [action, handler] of [
      ['play', startAnthem],
      ['pause', pauseAnthem],
      ['stop', stopAnthem],
    ]) {
      try { mediaSession.setActionHandler(action, handler); }
      catch { /* Some platforms do not offer every media command. */ }
    }
  }
  updateAnthem();
}

/* Mobile screens and international cooperation. */
function setScreen(screen) {
  if(!['home','work','public','world','plan'].includes(screen))return;
  document.body.dataset.screen=screen;
  for(const b of document.querySelectorAll('.mobile-nav [data-screen]')){
    const yes=b.dataset.screen===screen;
    b.classList.toggle('is-active',yes);
    if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  }
  window.scrollTo({top:0,behavior:'instant'});
}
for(const b of document.querySelectorAll('[data-screen]'))b.addEventListener('click',()=>setScreen(b.dataset.screen));
setScreen('home');
const choice=document.getElementById('country-choice');
for(const c of START_COUNTRIES){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;choice.append(option);}
function showCountryDialog(){if(!world.origin)openDialog('country-dialog');}
document.getElementById('country-confirm')?.addEventListener('click',()=>{
  if(!canWrite)return;
  const result=chooseCountry(world,choice.value);
  if(!result.ok)return;
  closeDialog(document.getElementById('country-dialog'));
  state.worldEconomyEnabled=true;
  changed();notify(`Bienvenue en ${result.country.name} ! Fais grandir la coopération.`);
});
document.getElementById('world-filter')?.addEventListener('change',e=>{worldFilter=e.currentTarget.value;worldDisplayLimit=30;renderWorld();});
document.getElementById('world-more')?.addEventListener('click',()=>{worldDisplayLimit+=30;renderWorld();});
function renderWorld(){
  const target=document.getElementById('world-list');if(!target)return;
  const stats=getWorldStats(world);
  setText(document.getElementById('world-origin'),stats.origin?.name||'À choisir');
  setText(document.getElementById('world-partners'),stats.partners);
  setText(document.getElementById('world-regions'),stats.regions);
  setText($('world-counter'),stats.stage===0?'Choisis un départ':
    stats.stage>stats.waveCount?'195 / 195 pays':
    `Vague ${stats.waveNumber}/${stats.waveCount} · ${stats.waveJoined}/${stats.waveTotal}`);
  const waveMessages=stats.stage===0
    ? ['Choisis ton pays de départ','La première vague commencera autour de ce pays.']
    : stats.stage>stats.waveCount
      ? ['🏆 Le monde entier coopère !','195 pays réunis : la coopération mondiale est complète !']
      : stats.stage===stats.waveCount
        ? [`🌍 Dernière vague · ${stats.waveTotal} pays`,
           `${stats.waveRemaining} pays à intégrer. Les États-Unis seront débloqués seulement après les 194 autres.`]
        : [`🌍 Vague ${stats.waveNumber} sur ${stats.waveCount} · ${stats.waveTotal} pays`,
           `Depuis ${stats.origin.name}, les voisins passent d’abord, puis les pays du même continent. ${stats.waveRemaining} à intégrer pour débloquer la vague suivante.`];
  setText($('world-stage-title'),waveMessages[0]);
  setText($('world-stage-description'),waveMessages[1]);
  const trust=state.communism+state.corruption>0?state.communism/(state.communism+state.corruption):1;
  setText($('world-confidence'),`Confiance : ${format(trust*100)} % · minimum 85 % pour coopérer`);
  $('world-confidence')?.classList.toggle('is-low-confidence',trust<.85);
  const reached=MILESTONES.filter(m=>m.threshold<=state.communism);
  if(reached.length)setText(document.getElementById('milestone-message'),reached.at(-1).message);
  if(lastWorldDisplayStage!==stats.stage){
    worldDisplayLimit=30;
    lastWorldDisplayStage=stats.stage;
  }
  // Keep the starting country pinned at the top. Sort only the other
  // visible countries by actual cooperation cost (cheapest first).
  // Geographic wave availability and regional filtering stay unchanged.
  const visibleCountries=getVisibleCountries(world);
  const originCountry=visibleCountries.find(c=>c.id===world.origin);
  const otherCountries=rankCountriesByCooperationCost(world,state,
    visibleCountries.filter(c=>c.id!==world.origin&&(worldFilter==='all'||c.region===worldFilter)));
  const countries=originCountry?[originCountry,...otherCountries]:otherCountries;
  const showLimited=stats.stage>=2;
  const items=(showLimited?countries.slice(0,worldDisplayLimit):countries).map(c=>getCooperation(world,state,c.id));
  const remaining=Math.max(0,countries.length-worldDisplayLimit);
  const more=$('world-more');
  if(more){
    more.hidden=!showLimited||remaining===0;
    more.textContent=`Afficher ${Math.min(30,remaining)} pays supplémentaires · ${remaining} restants`;
  }
  const signature=JSON.stringify([world.origin,world.partners,world.bilateral,state.communism,Math.floor(state.cash),Math.floor(state.corruption*100),state.internationalAidLevel,worldFilter,'origin-first-cost-v2',stats.stage,worldDisplayLimit]);
  if(target.dataset.signature===signature)return;
  target.dataset.signature=signature;
  const frag=document.createDocumentFragment();
  for(const item of items){
    const card=document.createElement('article');card.className='country-card';
    if(item.home)card.classList.add('is-home');if(item.joined)card.classList.add('is-partner');
    const heading=document.createElement('div'),name=document.createElement('strong'),region=document.createElement('small');
    name.textContent=item.name;region.textContent=item.region;heading.append(name,region);
    const status=document.createElement('p');status.className='country-status';
    status.textContent=item.home?'Pays de départ':item.joined?'Coopération active':item.id===USA_COUNTRY_ID?`Objectif final · ${format(item.threshold)} communisme`:`Vague ${item.stage} · ${format(item.threshold)} communisme`;
    const confidence=document.createElement('p');
    confidence.className='country-confidence'+(item.confidenceOk?'':' is-low');
    confidence.textContent=`Confiance : ${format(item.confidence*100)} % · minimum 85 %`;
    const context=document.createElement('p');
    context.className='country-context';
    context.textContent=item.politicalContext;
    const funding=document.createElement('p');
    funding.className='country-funding';
    funding.textContent=item.home||item.joined?'':`Investissement : ${money(item.cost)}`;
    const bonus=document.createElement('p');bonus.className='country-bonus';bonus.textContent=`+${format(item.productionBonus)} production · +${format(item.taxesBonus)} taxes · +${format(item.communismBonus)} communisme`;
    const button=document.createElement('button');button.type='button';button.className='country-action';button.disabled=!canWrite||!item.available;
    button.textContent=item.home?'Point de départ':item.joined?'Partenaire ✓':state.communism<item.threshold?'À débloquer':!item.confidenceOk?'Corruption trop élevée':state.cash<item.cost?'Financement insuffisant':`Coopérer · ${money(item.cost)}`;
    button.addEventListener('click',()=>{
      if(!canWrite)return;advance(state);const previousStage=getWorldStage(world);const result=cooperate(world,state,item.id);
      if(!result.ok){renderWorld();return;}
      changed();
      const stage=getWorldStage(world);
      const waves=getCampaignWaves(world);
      const message=stage>previousStage ?
        stage>waves.length?'🏆 Victoire mondiale : les 195 pays coopèrent !':
        `🎉 Vague ${stage}/${waves.length} débloquée : ${waves[stage-1].length} pays à découvrir !` :
        `Coopération avec ${item.name} : +${result.country.communismBonus} communisme !`;
      notify(message);
    });
    card.append(heading,status,confidence,context,funding,bonus,button);frag.append(card);
  }
  target.replaceChildren(frag);
}
if(!world.origin)requestAnimationFrame(showCountryDialog);
