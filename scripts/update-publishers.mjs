// Publisher names from Crossref DOI metadata (public REST API, no API key).
// Publisher site links are separate from the journal homepage links.
// Refresh known entries roughly every 90 days; new publications on next run.
import {PUBLICATIONS_FILE,normalizeDoi,readData,writeData,requestJson} from './common.mjs';
import {fromCrossrefPublisher} from './publisher-data.mjs';
const MAX_AGE_MS=90*86400*1000;

export function applyPublisher(p,message,now=new Date().toISOString()){
 const doi=normalizeDoi(p.doi);
 if(!doi || normalizeDoi(message?.DOI)!==doi || !message?.publisher)return p;
 const metadata=fromCrossrefPublisher(message.publisher);
 if(!metadata)return p;
 return {...p,...metadata,publisher_checked_at:now};
}
export async function updatePublishers(publications,{fetchRecord=requestJson,now=new Date().toISOString(),logger=console}={}){
 let fetched=0,updated=0,failed=0;
 const result=[];
 for(const p of publications){
   const doi=normalizeDoi(p.doi);
   const refreshed=Date.parse(p.publisher_checked_at||'')||0;
   // Preserve valid existing data; avoid repeating an API call on every 6h sync.
   if(!doi || (p.publisher && refreshed && Date.parse(now)-refreshed<MAX_AGE_MS)){
     result.push(p);continue;
   }
   try{
     const r=await fetchRecord(`https://api.crossref.org/works/${encodeURIComponent(doi)}`,{timeout:12000,attempts:2});
     const updatedPub=applyPublisher(p,r.message,now);
     fetched++;
     updated+=JSON.stringify(updatedPub)!==JSON.stringify(p)?1:0;
     // Successful lookup without a publisher is not evidence to erase an old value.
     result.push(updatedPub);
   }catch(error){
     failed++;
     if(failed<=3)logger.warn(`Crossref publisher lookup failed for ${doi}: ${error.message}`);
     result.push(p);
   }
 }
 return {publications:result,fetched,updated,failed};
}
async function main(){
 const current=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
 const result=await updatePublishers(current.publications||[]);
 if(JSON.stringify(result.publications)!==JSON.stringify(current.publications)){
   await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',{...current,publications:result.publications});
 }
 console.log(`Publisher DOI checks: fetched ${result.fetched}, updated ${result.updated}, temporarily unavailable ${result.failed}. Older valid publishers retained.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
