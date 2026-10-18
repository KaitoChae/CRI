// Resolve publisher journal homepages via OpenAlex source IDs / exact-title matching.
// Never invent an official journal URL or link a book chapter to an unrelated journal.
import {PUBLICATIONS_FILE,readData,writeData,requestJson,journalKey,normalizeIssn} from './common.mjs';
const cleanUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!/(?:^|\.)openalex\.org$/i.test(u.hostname)?u.href:''}catch{return ''}};
const idOf=s=>String(s||'').match(/(?:^|\/)S\d+$/)?.[0]?.replace(/^\//,'')||'';
function matchingJournal(source,p){
  if(source?.type!=='journal'||!source.display_name)return false;
  const exactName=journalKey(source.display_name)===journalKey(p.journal);
  const sameIssn=p.issn&&[source.issn_l,...(source.issn||[])].some(v=>normalizeIssn(v)===normalizeIssn(p.issn));
  return exactName||Boolean(sameIssn);
}
export function applyJournalHomepage(p,source){
  if(!matchingJournal(source,p))return p;
  const url=cleanUrl(source.homepage_url);
  if(!url)return p;
  return {...p,journal_url:url,journal_url_source:'OpenAlex',journal_url_checked_at:new Date().toISOString(),source_id:p.source_id||source.id};
}
export async function updateJournalLinks(publications,{fetchRecord=requestJson,logger=console}={}){
  const byKey=new Map();
  for(const p of publications){
    const key=normalizeIssn(p.issn)||journalKey(p.journal);
    if(!key||!p.journal||p.journal==='Research publication'||byKey.has(key))continue;
    if(p.journal_url&&Date.parse(p.journal_url_checked_at||0)>Date.now()-14*86400000)continue;
    byKey.set(key,p);
  }
  const sources=new Map();
  for(const [key,p] of byKey){
    const id=idOf(p.source_id);
    try{
      let source;
      if(id)source=await fetchRecord(`https://api.openalex.org/sources/${id}`,{attempts:2});
      if(!source||!matchingJournal(source,p)){
        const q=p.issn?`filter=issn:${encodeURIComponent(p.issn)}`:`search=${encodeURIComponent(p.journal)}`;
        const found=await fetchRecord(`https://api.openalex.org/sources?${q}&per-page=8`,{attempts:2});
        source=(found.results||[]).find(candidate=>matchingJournal(candidate,p));
      }
      if(source)sources.set(key,source);
    }catch(error){logger.warn(`Journal homepage unavailable for ${p.journal}: ${error.message}`)}
  }
  const updated=publications.map(p=>{
    const key=normalizeIssn(p.issn)||journalKey(p.journal);
    return applyJournalHomepage(p,sources.get(key));
  });
  return {publications:updated,matched:[...sources.values()].length};
}
async function main(){
  const data=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  const result=await updateJournalLinks(data.publications||[]);
  if(JSON.stringify(result.publications)!==JSON.stringify(data.publications))
    await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',{...data,publications:result.publications});
  console.log(`Journal homepages: ${result.matched} exact matches checked. Unverified sources remain plain text.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
