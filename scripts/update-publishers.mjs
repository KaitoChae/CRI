// Publisher names from Crossref DOI metadata (public REST API, no API key).
// Publisher site links are separate from the journal homepage links.
// Refresh known entries roughly every 90 days; new publications on next run.
import {PUBLICATIONS_FILE,normalizeDoi,readData,writeData,requestJson} from './common.mjs';
import {fromCrossrefPublisher} from './publisher-data.mjs';
import '../assets/publication-policy.js';
import {getPublicationStats} from './sync-publications.mjs';
const {isConferencePublication,publicationType}=globalThis.CRI_PUBLICATION_POLICY;
const MAX_AGE_MS=90*86400*1000;

export function applyPublisher(p,message,now=new Date().toISOString()){
 const doi=normalizeDoi(p.doi);
 if(!doi || normalizeDoi(message?.DOI)!==doi)return p;
 const metadata=fromCrossrefPublisher(message.publisher)||{};
 const crossrefType=String(message.type||'').trim();
 const container=Array.isArray(message['container-title'])?message['container-title'][0]:message['container-title'];
 const result={...p,...metadata};
 if(crossrefType)result.crossref_type=crossrefType;
 if(container&&/book|chapter|proceedings/i.test(crossrefType))result.book_title=container;
 if(message.event?.name)result.event=message.event.name;
 if(isConferencePublication(result))result.conference_proceedings=true;
 result.publication_type=publicationType(result);
 result.publisher_checked_at=now;
 return result;
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
 const publications=result.publications.filter(p=>!isConferencePublication(p));
 const excluded=result.publications.length-publications.length;
 if(JSON.stringify(publications)!==JSON.stringify(current.publications)){
   await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',{...current,publications,metrics:getPublicationStats(publications)});
 }
 console.log(`Publisher/type DOI checks: fetched ${result.fetched}, updated ${result.updated}, conference entries excluded ${excluded}, temporarily unavailable ${result.failed}.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
