// OpenAlex 2-year mean citedness is NOT the licensed Clarivate JCR Journal
// Impact Factor. We preserve that distinction throughout the UI and data.
import fs from "node:fs/promises";
import {PUBLICATIONS_FILE,METRICS_FILE,normalizeIssn,normalizeDoi,journalKey,readData,writeData,request,requestJson} from '../scripts/common.mjs';
import {indexVerifiedJif,verifiedJifFor,mergePreferJif} from '../scripts/verified-jif.mjs';

const TARGET_SCIMAGO_YEAR=new Date().getUTCFullYear()-1;
const SCIMAGO_URL=`https://www.scimagojr.com/journalrank.php?out=xls&year=${TARGET_SCIMAGO_YEAR}`;
export const parseDelimited=(input,separator=';')=>{
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){
      if(quoted&&input[i+1]==='"'){cell+='"';i++}else quoted=!quoted;
    }else if(c===separator&&!quoted){row.push(cell.trim());cell=''}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[]}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row)}
  return rows;
};
export function scimagoIndex(text,selectedYear=null){
  const first=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0];
  const delimiter=first.split(';').length>=first.split('\t').length?';':'\t';
  const rows=parseDelimited(text.replace(/^\uFEFF/,''),delimiter);
  const columns=(rows.shift()||[]).map(x=>x.toLowerCase());
  const get=(cells,headers)=>{const i=columns.findIndex(x=>headers.includes(x));return i>=0?cells[i]||'':''};
  if(!columns.includes('sjr')||!columns.includes('issn'))throw new Error('Unexpected SCImago export headers');
  // The official export may omit a separate Year column; its year-scoped
  // download URL identifies the dataset, or the 'Total Docs. (YYYY)' header.
  const inferredYear=Number(columns.find(c=>/^total docs\. \(\d{4}\)$/.test(c))?.match(/(\d{4})/)?.[1]||0);
  const exportYear=selectedYear||inferredYear;
  const index=new Map();
  for(const cells of rows){
    const score=Number.parseFloat(get(cells,['sjr']).replace(/\s/g,'').replace(',','.'));
    const quartile=get(cells,['sjr best quartile','best quartile']).toUpperCase();
    const year=Number(get(cells,['year']))||exportYear;
    const metric={...(Number.isFinite(score)?{sjr:score}:{}),...(/^Q[1-4]$/.test(quartile)?{quartile}:{}),
      ...(year>=1990&&year<=2100?{sjr_year:year}:{}),sjr_source:'SCImago Journal & Country Rank (Scopus)'};
    for(const token of get(cells,['issn']).split(/[,;\s]+/)){
      const issn=normalizeIssn(token);if(!issn)continue;
      // Some journals have multiple historical rows; prefer actual newer year.
      const previous=index.get(issn);
      if(!previous||(metric.sjr_year||0)>(previous.sjr_year||0))index.set(issn,metric);
    }
  }
  if(index.size<1000)throw new Error('SCImago export is incomplete; do not overwrite stored rankings');
  return index;
}
async function fetchScimago(){
  const response=await request(SCIMAGO_URL,{timeout:45000,attempts:2});
  const text=await response.text();return scimagoIndex(text,TARGET_SCIMAGO_YEAR);
}
async function sourceFor(publication){
  let id=String(publication.source_id||'').match(/S\d+$/)?.[0];
  if(!id&&publication.doi){
    const work=await requestJson(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(normalizeDoi(publication.doi))}`);
    id=work?.primary_location?.source?.id?.match(/S\d+$/)?.[0];
  }
  if(id)return requestJson(`https://api.openalex.org/sources/${id}`);
  const issn=normalizeIssn(publication.issn);
  if(!issn)return null;
  const found=await requestJson(`https://api.openalex.org/sources?filter=issn:${issn}&per-page=1`);
  return found.results?.[0]||null;
}
function bestMetric(original,patch){
  const result=mergePreferJif(original,patch);
  if(result.impact_factor_kind==='openalex'){
    result.impact_factor_source='OpenAlex 2-year mean citedness (not Clarivate JIF)';
    delete result.impact_factor_source_url;
  }
  return result;
}

async function main(){
  const snapshot=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  let existing={updated_at:null,by_issn:{},by_journal:{},by_doi:{}};
  try{existing=await readData(METRICS_FILE,'CRI_JOURNAL_METRICS')}catch{}
  const next={updated_at:existing.updated_at,by_issn:{...existing.by_issn},by_journal:{...existing.by_journal},by_doi:{...existing.by_doi}};
  let scimago=new Map();
  if(process.argv.includes('--scimago')){
    try{scimago=await fetchScimago();console.log('SCImago: indexed',scimago.size,'ISSNs')}
    catch(error){console.warn('SCImago download failed; retaining previous verified SJR values:',error.message)}
  }
  // JIF entries require a traceable, publisher-verified citation (not OpenAlex).
  let jcrOverrides={};
  try{jcrOverrides=JSON.parse(await fs.readFile('assets/jcr-jif-overrides.json','utf8'))}catch{}
  const verified=indexVerifiedJif(jcrOverrides);
  // Seed all verified journals, even if no paper has been added to the local
  // publication snapshot yet. This supports new papers fetched in the browser.
  for(const [issn,metric] of verified.byIssn){
    next.by_issn[issn]=bestMetric(next.by_issn[issn]||{},metric);
  }
  for(const [journal,metric] of verified.byJournal){
    next.by_journal[journal]=bestMetric(next.by_journal[journal]||{},metric);
  }
  const sourceCache=new Map();let successful=0;
  for(const pub of snapshot.publications||[]){
    const doi=normalizeDoi(pub.doi);const issn=normalizeIssn(pub.issn);
    const journal=journalKey(pub.journal);
    const cacheKey=pub.source_id||issn||doi;
    let source=null;
    try{
      if(sourceCache.has(cacheKey))source=sourceCache.get(cacheKey);
      else{source=await sourceFor(pub);sourceCache.set(cacheKey,source)}
    }catch(error){console.warn('Source metrics unavailable:',pub.journal,error.message)}
    const realIssn=normalizeIssn(source?.issn_l||source?.issn?.[0]||issn);
    const impact=Number(source?.summary_stats?.['2yr_mean_citedness']);
    const oaImpact=(source?.type==='journal'&&source?.summary_stats?.['2yr_mean_citedness']!=null&&Number.isFinite(impact))?{
      impact_factor:Number(impact.toFixed(3)),impact_factor_year:new Date().getUTCFullYear()-1,
      impact_factor_source:'OpenAlex 2-year mean citedness (not Clarivate JIF)',impact_factor_kind:'openalex'
    }:{};
    const fromScimago=[realIssn,issn,...(source?.issn||[]).map(normalizeIssn)].map(id=>scimago.get(id)).find(Boolean)||{};
    const official=verifiedJifFor(verified,{issn,sourceIssns:[realIssn,...(source?.issn||[])],journal:pub.journal})||{};
    const metric={...fromScimago,...oaImpact,...official};
    if(Object.keys(metric).length)successful++;
    if(realIssn)next.by_issn[realIssn]=bestMetric(next.by_issn[realIssn]||{},metric);
    if(issn&&issn!==realIssn)next.by_issn[issn]=bestMetric(next.by_issn[issn]||{},metric);
    if(journal)next.by_journal[journal]=bestMetric(next.by_journal[journal]||{},metric);
    if(doi)next.by_doi[doi]=bestMetric(next.by_doi[doi]||{},metric);
  }
  // If every remote API failed, still preserve newly verified publisher JIFs
  // without pretending remote journal/citation data have been refreshed.
  if(!successful){
    if(!verified.byIssn.size){console.error('No journal metrics could be refreshed; snapshot unchanged');process.exitCode=1;return}
    console.warn('No live journal metrics available; retaining existing SJR/OpenAlex and verified publisher JIF only');
  }
  next.updated_at=successful?new Date().toISOString():existing.updated_at;
  await writeData(METRICS_FILE,'CRI_JOURNAL_METRICS',next);
  console.log(`Refreshed metrics for ${successful} journal entries; SJR export ${scimago.size?'fresh':'previous data preserved'}.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
