// Run by GitHub Actions every six hours. Retains curated titles/translations
// and local graphical abstracts, while discovering new indexed works.
import {PUBLICATIONS_FILE,AUTHOR_ORCID,normalizeDoi,normalizeIssn,titleKey,readData,writeData,requestJson} from './common.mjs';
import '../assets/publication-policy.js';
const {isConferencePublication,publicationType}=globalThis.CRI_PUBLICATION_POLICY;

export function mergeWork(work,old={}){
  const doi=normalizeDoi(work.doi);const source=work.primary_location?.source||work.best_oa_location?.source||{};
  const authors=(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean);
  const b=work.biblio||{};
  const details=[b.volume,b.issue?`(${b.issue})`:'',b.first_page?[`, ${b.first_page}${b.last_page?'–'+b.last_page:''}`]:''].flat().join('').trim();
  const publication={
    ...old,
    // A different DOI must not inherit the publisher of the previous work.
    publisher:doi && normalizeDoi(old.doi)===doi ? (old.publisher||'') : '',
    publisher_url:doi && normalizeDoi(old.doi)===doi ? (old.publisher_url||'') : '',
    publisher_source:doi && normalizeDoi(old.doi)===doi ? (old.publisher_source||'') : '',
    publisher_checked_at:doi && normalizeDoi(old.doi)===doi ? (old.publisher_checked_at||'') : '',
    year:work.publication_year||old.year||'',
    publication_date:work.publication_date||old.publication_date||'',
    title:work.title||old.title||'',
    authors:authors.length?authors.join(', '):old.authors||'',
    journal:(source.type==='journal'?source.display_name:(old.journal||source.display_name))||'Research publication',
    details:details||old.details||'',
    citations:Number.isFinite(Number(work.cited_by_count))?Number(work.cited_by_count):old.citations||0,
    doi:doi||old.doi||'',
    url:work.doi||work.primary_location?.landing_page_url||old.url||'',
    issn:normalizeIssn(source.issn_l||source.issn?.[0]||old.issn||''),
    source_id:source.id||old.source_id||'',
    journal_url:(source.type==='journal'&&source.homepage_url)||((String(source.display_name||old.journal||'').toLowerCase()===String(old.journal||'').toLowerCase())?old.journal_url||'':''),
    type:work.type_crossref||work.type||old.type||'Journal article',
    crossref_type:doi&&normalizeDoi(old.doi)===doi ? (old.crossref_type||'') : '',
    source_type:source.type||old.source_type||'',
    book_title:old.book_title||'',
    conference_proceedings:doi&&normalizeDoi(old.doi)===doi ? old.conference_proceedings===true : false,
    open_access:work.open_access?.is_oa===true,
    oa_url:work.best_oa_location?.landing_page_url||work.open_access?.oa_url||old.oa_url||'',
    publisher_landing_url:work.primary_location?.landing_page_url||old.publisher_landing_url||'',
    pii:old.pii||'',
    title_translations:old.title_translations||{},
  };
  publication.publication_type=publicationType(publication);
  return publication;
}
export function mergePublicationSets(existing,works){
  existing=existing.filter(p=>!isConferencePublication(p));
  const byDoi=new Map(existing.filter(p=>normalizeDoi(p.doi)).map(p=>[normalizeDoi(p.doi),p]));
  const byTitle=new Map(existing.filter(p=>p.title).map(p=>[titleKey(p.title),p]));
  const merged=[];const covered=new Set();
  for(const work of works){
    if(isConferencePublication({...work,source_type:work.primary_location?.source?.type}))continue;
    if(!work.title||/(?:論文内容及び審査の要旨|全文の要約)/u.test(work.title))continue;
    const key=normalizeDoi(work.doi);
    const older=(key&&byDoi.get(key))||byTitle.get(titleKey(work.title))||{};
    const result=mergeWork(work,older);
    if(isConferencePublication(result))continue;
    const id=result.doi?`d:${normalizeDoi(result.doi)}`:`t:${titleKey(result.title)}`;
    if(covered.has(id))continue;covered.add(id);merged.push(result);
  }
  for(const old of existing){
    const id=old.doi?`d:${normalizeDoi(old.doi)}`:`t:${titleKey(old.title)}`;
    const titleCovered=merged.some(p=>titleKey(p.title)===titleKey(old.title));
    if(!isConferencePublication(old)&&!covered.has(id)&&!titleCovered){covered.add(id);merged.push({...old,publication_type:publicationType(old)})}
  }
  merged.sort((a,b)=>{
    const dateA=Date.parse(a.publication_date||'')||Date.UTC(Number(a.year)||0,0,1);
    const dateB=Date.parse(b.publication_date||'')||Date.UTC(Number(b.year)||0,0,1);
    return dateB-dateA;
  });
  return merged;
}
export async function getAuthorWorks(){
  const author=await requestJson(`https://api.openalex.org/authors/https://orcid.org/${AUTHOR_ORCID}`);
  if(!author.id)throw new Error('OpenAlex did not resolve ORCID');
  const all=[];let cursor='*';
  // Cursor pagination avoids silently dropping publications past the first 100.
  for(let page=0;page<12;page++){
    const url=`https://api.openalex.org/works?filter=author.id:${encodeURIComponent(author.id)}&sort=publication_date:desc&per-page=100&cursor=${encodeURIComponent(cursor)}`;
    const response=await requestJson(url);all.push(...(response.results||[]));
    cursor=response.meta?.next_cursor;
    if(!cursor||!response.results?.length)break;
  }
  return all;
}
export function getPublicationStats(publications){
  const counts=publications.map(p=>Math.max(0,Number(p.citations)||0)).sort((a,b)=>b-a);
  return {publications:counts.length,citations:counts.reduce((a,b)=>a+b,0),h_index:counts.reduce((n,c,i)=>c>=i+1?i+1:n,0),i10_index:counts.filter(c=>c>=10).length};
}
async function main(){
  const existing=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  let works;
  try{works=await getAuthorWorks()}catch(error){console.error('OpenAlex unavailable: keeping existing publication snapshot:',error.message);process.exitCode=1;return}
  if(!works.length){console.error('OpenAlex returned zero works; keeping curated data');process.exitCode=1;return}
  const publications=mergePublicationSets(existing.publications||[],works);
  const changed=JSON.stringify(publications)!==JSON.stringify(existing.publications||[]);
  const next={...existing,publications,metrics:getPublicationStats(publications),last_updated:changed?new Date().toISOString():existing.last_updated,source:'OpenAlex (ORCID) with curated corrections'};
  await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',next);
  console.log(`Synced ${publications.length} publications (${works.length} OpenAlex works); ${changed?'records changed':'only sync timestamp changed'}.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
