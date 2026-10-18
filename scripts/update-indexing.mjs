// Article-level indexing checks. NOT inferred from journal SJR, quartile, or JIF.
// Secure GitHub Actions secrets: ELSEVIER_API_KEY and CLARIVATE_WOS_API_KEY.
// A failure/unavailable API preserves existing positive DOI-verified records.
import {readData,writeData,normalizeDoi,requestJson, PUBLICATIONS_FILE} from './common.mjs';

const normalized=v=>normalizeDoi(v);
const first=v=>Array.isArray(v)?v[0]:v;
export function parseScopus(body,doi){
  const response=body?.['abstracts-retrieval-response'];
  const core=response?.coredata||{};
  const observed=normalized(core['prism:doi']||core.doi||'');
  const eid=core.eid||response?.eid||'';
  const number=String(core['dc:identifier']||'').match(/SCOPUS_ID:(\d+)/)?.[1]||'';
  const valid=/^2-s2\.0-\d+$/.test(String(eid))?eid:number?`2-s2.0-${number}`:'';
  if(!observed||observed!==normalized(doi)||!valid)return null;
  return {status:'indexed',id:valid,url:`https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(valid)}`};
}
export function parseWos(body,doi){
  const results=body?.hits||body?.documents||[];
  if(!Array.isArray(results))return null;
  for(const document of results){
    const identifiers=document.identifiers||{};
    const dois=[identifiers.doi,identifiers.DOI,document.doi].flat(Infinity).filter(Boolean);
    if(!dois.some(v=>normalized(v)===normalized(doi)))continue;
    const uid=String(document.uid||document.UID||'');
    if(!/^WOS:\d+$/i.test(uid))continue;
    const rawLinks=document.links||{};
    const remote=first(rawLinks.record||rawLinks['record'])||'';
    // Standard canonical record URL is based on the verified WOS UID.
    const url=typeof remote==='string'&&/^https:\/\/(?:www\.)?webofscience\.com\//i.test(remote)
      ?remote:`https://www.webofscience.com/wos/woscc/full-record/${uid}`;
    return {status:'indexed',id:uid,url};
  }
  return null;
}
async function checkScopus(doi,key,fetchRecord){
  const url=`https://api.elsevier.com/content/abstract/doi/${encodeURIComponent(doi)}?view=META`;
  return parseScopus(await fetchRecord(url,{headers:{'X-ELS-APIKey':key},timeout:15000,attempts:2}),doi);
}
async function checkWos(doi,key,fetchRecord){
  const url=`https://api.clarivate.com/apis/wos-starter/v1/documents?db=WOS&q=${encodeURIComponent(`DO=(${doi})`)}&limit=2&detail=full`;
  return parseWos(await fetchRecord(url,{headers:{'X-ApiKey':key},timeout:15000,attempts:2}),doi);
}
export async function updateIndexing(publications,{scopusKey=process.env.ELSEVIER_API_KEY,wosKey=process.env.CLARIVATE_WOS_API_KEY,fetchRecord=requestJson,now=new Date(),logger=console}={}){
  const results=[];let verified=0,attempted=0;
  const nowString=now.toISOString(),cutoff=now.getTime()-7*24*60*60*1000;
  for(const source of publications){
    const p={...source},doi=normalized(p.doi),indexing={...(p.indexing||{})};
    if(doi){
      for(const [kind,key,check] of [['scopus',scopusKey,checkScopus],['wos',wosKey,checkWos]]){
        if(!key)continue;
        const old=indexing[kind];
        if(old?.status==='indexed'&&Date.parse(old.checked_at||0)>cutoff)continue;
        attempted++;
        try{
          const match=await check(doi,key,fetchRecord);
          if(match){indexing[kind]={...match,doi,checked_at:nowString};verified++}
          // Zero search results are NOT proof of exclusion; keep prior verified
          // metadata or show an honest 'n/a'.
        }catch(error){logger.warn(`${kind} lookup unavailable for ${doi}: ${error.message}`)}
      }
    }
    if(Object.keys(indexing).length)p.indexing=indexing;
    results.push(p);
  }
  return {publications:results,verified,attempted};
}
async function main(){
  const existing=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  if(!process.env.ELSEVIER_API_KEY)console.log('ELSEVIER_API_KEY missing: Scopus n/a until configured.');
  if(!process.env.CLARIVATE_WOS_API_KEY)console.log('CLARIVATE_WOS_API_KEY missing: WoS n/a until configured.');
  const result=await updateIndexing(existing.publications||[]);
  if(JSON.stringify(result.publications)!==JSON.stringify(existing.publications)){
    await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',{...existing,publications:result.publications});
  }
  console.log(`DOI indexing: ${result.verified} records confirmed, ${result.attempted} lookups; no guessed badges.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
