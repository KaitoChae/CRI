const $=(s,c=document)=>c.querySelector(s);const $$=(s,c=document)=>[...c.querySelectorAll(s)];

// ------------------------- LANGUAGE SYSTEM -------------------------
const TRANSLATIONS=window.LAB_TRANSLATIONS||{en:{}};
const LANG_CODES=window.LAB_LANG_CODES||{en:'EN'};
const LANG_LOCALES=window.LAB_LANG_LOCALES||{en:'en-GB'};
const SUPPORTED_LANGS=Object.keys(TRANSLATIONS);
let activeLang='en';
let manualLanguageChosen=false;
function t(key){return (TRANSLATIONS[activeLang]&&TRANSLATIONS[activeLang][key])||(TRANSLATIONS.en&&TRANSLATIONS.en[key])||key}
function normalizeLanguage(raw=''){
  const v=String(raw).replace('_','-');
  if(SUPPORTED_LANGS.includes(v))return v;
  const lower=v.toLowerCase();
  if(lower.startsWith('zh-tw')||lower.startsWith('zh-hk')||lower.startsWith('zh-hant'))return 'zh-TW';
  if(lower.startsWith('zh'))return 'zh-CN';
  const base=lower.split('-')[0];
  return SUPPORTED_LANGS.includes(base)?base:'en';
}
function storedLanguage(){try{const saved=localStorage.getItem('criWebsiteLanguage');return saved?normalizeLanguage(saved):''}catch{return ''}}
function browserLanguage(){return normalizeLanguage((navigator.languages&&navigator.languages[0])||navigator.language||'en')}
const COUNTRY_LANGUAGE={
  ID:'id',JP:'ja',CN:'zh-CN',TW:'zh-TW',HK:'zh-TW',MO:'zh-TW',KR:'ko',
  DE:'de',AT:'de',CH:'de',LI:'de',FR:'fr',BE:'fr',LU:'fr',MC:'fr',
  ES:'es',MX:'es',AR:'es',CL:'es',CO:'es',PE:'es',VE:'es',EC:'es',UY:'es',PY:'es',BO:'es',CR:'es',PA:'es',DO:'es',GT:'es',HN:'es',SV:'es',NI:'es',CU:'es',
  IT:'it',SM:'it',VA:'it',PT:'pt',BR:'pt',AO:'pt',MZ:'pt',TR:'tr'
};
async function detectLanguageFromIp(){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),2800);
  try{
    const response=await fetch('https://api.country.is/',{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Country lookup failed');
    const payload=await response.json();return COUNTRY_LANGUAGE[String(payload.country||'').toUpperCase()]||'';
  }catch{return ''}finally{clearTimeout(timeout)}
}
function titleText(key,value){
  if(!['ja','zh-CN','zh-TW','ko'].includes(activeLang))return value;
  const isTitle=key==='page_title'||/^(?:hero|science|research\d|news|pub|join|footer)_title\d?$/.test(key);
  return isTitle?String(value).replace(/[.!?。．！？]+\s*$/u,''):value;
}
function applyStaticTranslations(){
  $$('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;el.textContent=titleText(key,t(key))});
  $$('[data-i18n-placeholder]').forEach(el=>{el.setAttribute('placeholder',t(el.dataset.i18nPlaceholder))});
  $$('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria))});
  const button=$('#langButton');if(button)button.setAttribute('aria-label',t('lang_aria'));
  const code=$('#currentLangCode');if(code)code.textContent=LANG_CODES[activeLang]||activeLang.toUpperCase();
  $$('#langMenu [data-lang]').forEach(btn=>{const on=btn.dataset.lang===activeLang;btn.classList.toggle('active',on);btn.setAttribute('aria-checked',String(on))});
  document.title=titleText('page_title',t('page_title'));
  const metaDesc=document.querySelector('meta[name="description"]');if(metaDesc)metaDesc.setAttribute('content',t('page_description'));
}

function setLanguage(lang,{persist=true,rerender=true}={}){
  activeLang=normalizeLanguage(lang);
  document.documentElement.lang=LANG_LOCALES[activeLang]||activeLang;
  document.documentElement.dataset.language=activeLang;
  if(persist){try{localStorage.setItem('criWebsiteLanguage',activeLang)}catch{}}
  applyStaticTranslations();
  if(rerender){renderPublications(filteredPublications());renderUpdates();updatePublicationMeta()}
}
function initLanguageSwitcher(){
  const switcher=$('#languageSwitcher'),button=$('#langButton'),menu=$('#langMenu');
  if(!switcher||!button||!menu)return;
  const close=()=>{switcher.classList.remove('open');button.setAttribute('aria-expanded','false')};
  button.addEventListener('click',e=>{e.stopPropagation();const open=switcher.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});
  $$('[data-lang]',menu).forEach(btn=>btn.addEventListener('click',()=>{manualLanguageChosen=true;setLanguage(btn.dataset.lang);close()}));
  document.addEventListener('click',e=>{if(!switcher.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}

// ------------------------- GLOBAL UI -------------------------
const header=$('#siteHeader'),progress=$('#progress');
function pageScrollY(){
  return Math.max(0,window.pageYOffset||0,window.scrollY||0,document.documentElement.scrollTop||0,document.body.scrollTop||0);
}
function scrollUI(){
  const y=pageScrollY(),max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
  if(progress) progress.style.width=`${Math.min(100,y/max*100)}%`;
  if(header) header.classList.toggle('scrolled',y>28);
}
let scrollTick=false;
function requestScrollUI(){
  if(scrollTick)return;
  scrollTick=true;
  requestAnimationFrame(()=>{scrollTick=false;scrollUI()});
}
addEventListener('scroll',requestScrollUI,{passive:true});
addEventListener('resize',requestScrollUI,{passive:true});
addEventListener('pageshow',()=>{scrollUI();setTimeout(scrollUI,80)});
addEventListener('hashchange',()=>setTimeout(scrollUI,0));
document.addEventListener('DOMContentLoaded',scrollUI,{once:true});
scrollUI();

const revealEls=$$('.reveal');
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}
  }),{threshold:.08,rootMargin:'0px 0px -4% 0px'});
  revealEls.forEach(el=>io.observe(el));
}else{revealEls.forEach(el=>el.classList.add('visible'))}

const menuButton=$('#menuButton'),mobileNav=$('#mobileNav');
if(menuButton&&mobileNav){
  menuButton.addEventListener('click',()=>{const open=mobileNav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open))});
  $$('a',mobileNav).forEach(a=>a.addEventListener('click',()=>{mobileNav.classList.remove('open');menuButton.setAttribute('aria-expanded','false')}));
}
const year=$('#year');if(year)year.textContent=new Date().getFullYear();

// ------------------------- PUBLICATIONS -------------------------
const data=window.LAB_PUBLICATION_DATA||{metrics:{},publications:[],last_updated:null,source:'embedded snapshot'};
const embeddedJournalMetrics=window.CRI_JOURNAL_METRICS||{by_issn:{},by_journal:{},by_doi:{}};
function journalMetricKey(v=''){return String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim()}
function embeddedMetricFor(p={}){
  const doi=String(p.doi||'').toLowerCase();const issn=normalizeIssn(p.issn);const journal=journalMetricKey(p.journal);
  return {...(embeddedJournalMetrics.by_journal?.[journal]||{}),...(embeddedJournalMetrics.by_issn?.[issn]||{}),...(embeddedJournalMetrics.by_doi?.[doi]||{})};
}
let pubs=(Array.isArray(data.publications)?data.publications:[]).map(p=>({...p,...embeddedMetricFor(p)}));
if(embeddedJournalMetrics.updated_at)data.last_updated=embeddedJournalMetrics.updated_at;
const PUBLICATION_PREVIEW_LIMIT=8;
function locale(){return LANG_LOCALES[activeLang]||'en-GB'}
function fmtDate(s){
  if(!s)return t('sync_embedded');
  const d=new Date(s);if(Number.isNaN(d.getTime()))return t('snapshot_loaded');
  return `${t('synced')} ${d.toLocaleDateString(locale(),{day:'2-digit',month:'short',year:'numeric'})}`;
}
function fillTemplate(str,vars={}){return String(str||'').replace(/\{(\w+)\}/g,(_,k)=>vars[k]??'')}
function cleanDisplayTitle(v=''){return String(v||'').trim().replace(/[.!?。．！？]+\s*$/u,'').trim()}
function translatedTitle(p={}){
  const tr=p.title_translations||p.translations||{};
  const candidate=activeLang==='en'?(p.title||''):(tr[activeLang]||p.title||'');
  return cleanDisplayTitle(candidate);
}
function originalTitle(p={}){return cleanDisplayTitle(p.title||'')}
function normalizedQuartile(q=''){
  const value=String(q).trim().toUpperCase();
  return /^[1-4]$/.test(value)?`Q${value}`:/^Q[1-4]$/.test(value)?value:'';
}
function badgeClass(q=''){const value=normalizedQuartile(q);return value?value.toLowerCase():'na'}
function normalizeIssn(v=''){const compact=String(v).toUpperCase().replace(/[^0-9X]/g,'');return compact.length===8?compact:''}
function safeText(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function safeUrl(v=''){try{const u=new URL(v,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
function safeImageSrc(v=''){
  const s=String(v||'').trim();if(!s)return '';
  if(/^(?:assets\/)[A-Za-z0-9._\/-]+$/.test(s) && !s.includes('..')) return s;
  try{const u=new URL(s,location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}
}
function visualFor(p={}){
  const raw=p.graphical_abstract||p.graphical_abstract_url||'';
  const src=safeImageSrc(raw);const kind=(p.graphical_abstract_kind||'').toLowerCase();
  return {src,kind,isGA:!!src&&kind!=='publisher_preview',isPreview:!!src&&kind==='publisher_preview'};
}
function removeBrokenVisual(img){
  const media=img.closest('.pub-thumb,.update-visual');const parent=img.closest('.pub-row,.update-card');
  if(parent)parent.classList.add('no-visual');if(media)media.remove();
}
function installImageFallbacks(root=document){
  $$('img[data-publication-visual]',root).forEach(img=>{
    if(img.dataset.fallbackReady)return;img.dataset.fallbackReady='1';
    img.addEventListener('error',()=>removeBrokenVisual(img),{once:true});
  });
}
function searchQuery(){return String($('#pubSearch')?.value||'').toLowerCase().trim()}
function publicationHaystack(p={}){
  const tr=Object.values(p.title_translations||p.translations||{}).join(' ');
  return `${p.title||''} ${tr} ${p.journal||''} ${p.authors||''} ${p.year||''} ${p.doi||''}`.toLowerCase();
}
function filteredPublications(){
  const q=searchQuery();
  if(!q)return pubs;
  return pubs.filter(p=>publicationHaystack(p).includes(q));
}
function updateSearchStatus(totalMatches=null){
  const host=$('#pubSearchStatus');if(!host)return;
  const total=pubs.length;const q=searchQuery();
  if(q){host.textContent=fillTemplate(t('pub_search_results'),{count:totalMatches??filteredPublications().length,total});}
  else{host.textContent=fillTemplate(t('pub_search_hint'),{shown:Math.min(PUBLICATION_PREVIEW_LIMIT,total),total});}
}
function renderPublications(list){
  const host=$('#pubList');if(!host)return;
  const q=searchQuery();const completeList=q?list:list.slice(0,PUBLICATION_PREVIEW_LIMIT);
  updateSearchStatus(q?list.length:null);
  if(!completeList.length){host.innerHTML=`<div class="empty">${safeText(t('pub_no_match'))}</div>`;return}
  host.innerHTML=completeList.map(p=>{
    const qtile=normalizedQuartile(p.quartile)||'Q n/a';
    const hasSjr=Number.isFinite(Number(p.sjr));
    const sjr=hasSjr?`SJR ${Number(p.sjr).toFixed(3)}`:'SJR n/a';
    const iff=p.impact_factor?`IF ${Number(p.impact_factor).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}`:(p.type||'').toLowerCase().includes('conference')?t('no_jif'):'IF n/a';
    const ifClass=p.impact_factor?'if':'na';
    const cite=Number.isFinite(+p.citations)?`<b class="badge">${+p.citations} ${safeText(t('cited'))}</b>`:'';
    const v=visualFor(p);const title=translatedTitle(p);const original=originalTitle(p);
    const showOriginal=activeLang!=='en'&&title&&original&&title!==original;
    const alt=v.isGA?t('graphical_abstract_alt'):t('publisher_visual_alt');
    const media=v.src?`<span class="pub-thumb ${v.isGA?'has-ga':'publisher-preview'}"><img src="${v.src}" data-publication-visual loading="lazy" decoding="async" alt="${safeText(alt)}, ${safeText(original||'publication')}">${v.isGA?`<em>${safeText(t('graphical_abstract'))}</em>`:''}</span>`:'';
    const originalLine=showOriginal?`<small class="pub-original"><b>${safeText(t('pub_original_title'))}:</b> ${safeText(original)}</small>`:'';
    const authors=p.authors?`<small class="pub-authors">${safeText(p.authors)}</small>`:'';
    const sjrTitle=[p.sjr_source,p.sjr_year].filter(Boolean).join(', ');
    const ifTitle=[p.impact_factor_source,p.impact_factor_year].filter(Boolean).join(', ');
    return `<a class="pub-row ${v.src?'has-visual':'no-visual'}" href="${safeUrl(p.url||'#')}" target="_blank" rel="noopener">${media}<span class="pub-year">${safeText(p.year||'n.d.')}</span><span class="pub-title">${safeText(title)}${authors}${originalLine}</span><span class="pub-journal">${safeText(p.journal||'')}</span><span class="badges"><b class="badge sjr ${hasSjr?'':'na'}" title="${safeText(sjrTitle)}">${safeText(sjr)}</b><b class="badge ${badgeClass(qtile)}" title="${safeText(sjrTitle)}">${safeText(qtile)}</b><b class="badge ${ifClass}" title="${safeText(ifTitle)}">${safeText(iff)}</b>${cite}</span><span class="pub-arrow">↗</span></a>`
  }).join('');
  installImageFallbacks(host);
}
function renderUpdates(){
  const host=$('#updateGrid');if(!host)return;
  const latest=[...pubs].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0,3);
  if(!latest.length){host.innerHTML=`<article class="update-card no-visual"><div class="update-body"><span class="date">${safeText(t('news_kicker'))}</span><h3>${safeText(cleanDisplayTitle(t('pub_future')))}</h3></div></article>`;return}
  host.innerHTML=latest.map(p=>{
    const v=visualFor(p);const alt=v.isGA?t('graphical_abstract_alt'):t('publisher_visual_alt');const title=translatedTitle(p);
    const media=v.src?`<a class="update-visual ${v.isGA?'has-ga':'publisher-preview'}" href="${safeUrl(p.url||'#')}" target="_blank" rel="noopener"><img src="${v.src}" data-publication-visual loading="lazy" decoding="async" alt="${safeText(alt)}, ${safeText(originalTitle(p)||'publication')}">${v.isGA?`<em>${safeText(t('graphical_abstract'))}</em>`:''}</a>`:'';
    const authors=p.authors?`<p class="update-authors">${safeText(p.authors)}</p>`:'';
    return `<article class="update-card ${v.src?'has-visual':'no-visual'} reveal visible">${media}<div class="update-body"><span class="date">${safeText(p.year||'')}, ${safeText(t('pub_new'))}</span><h3>${safeText(title)}</h3>${authors}<p>${safeText(p.journal||'')}${p.details?`, ${safeText(p.details)}`:''}</p><a class="update-link" href="${safeUrl(p.url||'#')}" target="_blank" rel="noopener">${safeText(t('pub_read'))}</a></div></article>`
  }).join('');
  installImageFallbacks(host);
}
function updatePublicationMeta(){
  const m=data.metrics||{};Object.entries(m).forEach(([k,v])=>{const el=document.querySelector(`[data-metric="${k}"]`);if(el&&v!==undefined&&v!==null)el.textContent=Number(v).toLocaleString(locale())});
  const last=$('#lastUpdated');if(last)last.textContent=fmtDate(data.last_updated);
  updateSearchStatus();
}
function initPublicationData(){updatePublicationMeta();renderPublications(filteredPublications());renderUpdates()}
const search=$('#pubSearch');if(search)search.addEventListener('input',()=>renderPublications(filteredPublications()));

async function refreshFromOpenAlex(){
  try{
    const authorResponse=await fetch('https://api.openalex.org/authors/https://orcid.org/0000-0002-1532-7343');
    if(!authorResponse.ok)throw new Error('Author request failed');
    const author=await authorResponse.json();
    if(!author?.id)return;
    const worksResponse=await fetch(`https://api.openalex.org/works?filter=author.id:${encodeURIComponent(author.id)}&sort=publication_date:desc&per-page=100`);
    if(!worksResponse.ok)throw new Error('Works request failed');
    const works=(await worksResponse.json()).results||[];
    const fallbackByDoi=new Map(pubs.filter(p=>p.doi).map(p=>[String(p.doi).toLowerCase(),p]));
    const fallbackByTitle=new Map(pubs.map(p=>[cleanDisplayTitle(p.title).toLowerCase(),p]));
    const fresh=works.filter(work=>work.title&&!/(?:論文内容及び審査の要旨|全文の要約)/u.test(work.title)).map(work=>{
      const doi=String(work.doi||'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
      const title=cleanDisplayTitle(work.title);
      const fallback=fallbackByDoi.get(doi.toLowerCase())||fallbackByTitle.get(title.toLowerCase())||{};
      const sourceObject=work.primary_location?.source||work.host_venue||{};
      const source=sourceObject.display_name||'Research publication';
      const issn=normalizeIssn(sourceObject.issn_l||sourceObject.issn?.[0]||fallback.issn||'');
      const authors=(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean);
      const publication={
        ...fallback,
        year:work.publication_year||fallback.year||'',title,
        authors:authors.length?`${authors.slice(0,7).join(', ')}${authors.length>7?' et al.':''}`:(fallback.authors||''),
        journal:source,details:work.biblio?.volume?[work.biblio.volume,work.biblio.issue].filter(Boolean).join('(')+(work.biblio.issue?')':''):(fallback.details||''),
        citations:Number.isFinite(+work.cited_by_count)?+work.cited_by_count:(fallback.citations||0),
        url:work.doi||work.primary_location?.landing_page_url||fallback.url||'https://scholar.google.com/citations?user=do1Jx1wAAAAJ&hl=en',
        doi,issn,source_id:sourceObject.id||fallback.source_id||'',type:work.type_crossref||work.type||fallback.type||'Journal',title_translations:fallback.title_translations||{}
      };
      return {...publication,...embeddedMetricFor(publication)};
    });
    if(!fresh.length)return;
    const liveKeys=new Set(fresh.flatMap(p=>[
      p.doi?`doi:${String(p.doi).toLowerCase()}`:'',
      `title:${cleanDisplayTitle(p.title).toLowerCase()}`
    ]).filter(Boolean));
    const curatedOnly=pubs.filter(p=>{
      const doiKey=p.doi?`doi:${String(p.doi).toLowerCase()}`:'';
      const titleKey=`title:${cleanDisplayTitle(p.title).toLowerCase()}`;
      return !(doiKey&&liveKeys.has(doiKey))&&!liveKeys.has(titleKey);
    });
    pubs=[...fresh,...curatedOnly].sort((a,b)=>(b.year||0)-(a.year||0));
    await refreshJournalMetrics();
    const citationCounts=pubs.map(p=>Number.isFinite(+p.citations)?+p.citations:0).sort((a,b)=>b-a);
    data.metrics={
      publications:pubs.length,
      citations:citationCounts.reduce((sum,value)=>sum+value,0),
      h_index:citationCounts.reduce((h,value,index)=>value>=index+1?index+1:h,0),
      i10_index:citationCounts.filter(value=>value>=10).length
    };
    data.last_updated=new Date().toISOString();
    data.source='OpenAlex live index';
    renderPublications(filteredPublications());renderUpdates();updatePublicationMeta();
  }catch{
    // The curated local snapshot remains fully usable if the live index is unavailable.
  }
}

async function refreshJournalMetrics(){
  const issns=[...new Set(pubs.map(p=>normalizeIssn(p.issn)).filter(Boolean))];
  if(!issns.length)return;
  let cached={};
  try{cached=JSON.parse(localStorage.getItem('criJournalMetrics')||'{}')||{}}catch{}
  pubs=pubs.map(p=>({...p,...(cached[normalizeIssn(p.issn)]||{})}));
  try{
    const response=await fetch(`/api/journal-metrics?issns=${encodeURIComponent(issns.join(','))}`);
    if(!response.ok)throw new Error('Journal metric request failed');
    const payload=await response.json();const byIssn=payload?.by_issn||{};
    pubs=pubs.map(p=>{
      const key=normalizeIssn(p.issn);const metric={...(cached[key]||{}),...(byIssn[key]||{})};
      return {...p,...metric};
    });
    const nextCache={...cached};
    Object.entries(byIssn).forEach(([key,value])=>{nextCache[key]={...(nextCache[key]||{}),...value}});
    try{localStorage.setItem('criJournalMetrics',JSON.stringify(nextCache))}catch{}
  }catch{
    // Keep the last verified values cached in the visitor's browser.
  }
}

// Apply a saved choice first. Otherwise show the browser language immediately,
// then refine it from the visitor's country without delaying the page.
initLanguageSwitcher();
const savedWebsiteLanguage=storedLanguage();
setLanguage(savedWebsiteLanguage||browserLanguage(),{persist:false,rerender:false});
initPublicationData();
if(!savedWebsiteLanguage){
  detectLanguageFromIp().then(ipLanguage=>{
    if(ipLanguage&&!manualLanguageChosen&&ipLanguage!==activeLang)setLanguage(ipLanguage,{persist:false,rerender:true});
  });
}
refreshFromOpenAlex();

// ------------------------- MOTION -------------------------
if(matchMedia('(pointer:fine)').matches){
  const center=$('.hero-center'),hero=$('#hero');
  if(center&&hero){
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5)*10;const y=((e.clientY-r.top)/r.height-.5)*8;
      center.style.setProperty('--hero-x',`${x}px`);center.style.setProperty('--hero-y',`${y}px`);
    });
    hero.addEventListener('pointerleave',()=>{center.style.setProperty('--hero-x','0px');center.style.setProperty('--hero-y','0px')});
  }
  $$('.story-art').forEach(card=>{
    const doodle=$('.story-doodle',card);if(!doodle)return;
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5)*18;const y=((e.clientY-r.top)/r.height-.5)*14;
      doodle.style.translate=`${x}px ${y}px`;
    });
    card.addEventListener('pointerleave',()=>{doodle.style.translate='0 0'});
  });
}


// ------------------------- V17 HERO ANIMATION RELIABILITY -------------------------
// Start the one-time SVG sequence only after all CSS/images have loaded.
// The explicit class also prevents mobile Safari from finishing the sequence before first paint.
function startHeroProcessOnce(){
  const host=document.querySelector('.hero-process');
  if(!host||host.dataset.started==='1')return;
  host.dataset.started='1';
  host.classList.remove('is-playing');
  void host.offsetWidth;
  host.classList.add('is-playing');
}
function queueHeroProcess(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(startHeroProcessOnce,220)));
}
if(document.readyState==='complete') queueHeroProcess();
else window.addEventListener('load',queueHeroProcess,{once:true});
