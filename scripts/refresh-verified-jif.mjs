// Best effort JIF updater. It ONLY reads explicit journal-specific annual
// values from a publisher or a year-tagged secondary report. It never uses
// OpenAlex's different 2-year citation-rate proxy as a JCR Impact Factor.
import fs from 'node:fs/promises';
import {journalKey,request} from './common.mjs';
export function textFromHtml(s){return String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim()}
export function explicitJif(html,provider,year){
 const text=textFromHtml(html),y=Number(year);
 if(!Number.isInteger(y)||y<2020||y>2100)return null;
 let match;
 if(provider==='bioxbio'){
   // The BioxBio table labels exactly which Clarivate metric year is meant:
   // 2025 (2026 update) | 10.6, whereas 2024 | 11.3.
   match=text.match(new RegExp(`\\b${y}\\s*\\(\\s*${y+1}\\s+update\\s*\\)\\s+(\\d+(?:\\.\\d+)?)\\b`,'i'));
 }else if(provider==='nature'){
   match=text.match(new RegExp(`Journal Impact Factor\\s*:\\s*(\\d+(?:\\.\\d+)?)\\s*\\(\\s*${y}\\s*\\)`,'i'));
 }else if(provider==='mdpi'){
   match=text.match(new RegExp(`Impact Factor\\s*:\\s*(\\d+(?:\\.\\d+)?)\\s*\\(\\s*${y}\\s*\\)`,'i'));
 }else if(provider==='tandf'){
   match=text.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*\\(\\s*${y}\\s*\\)\\s*Impact Factor`,'i'));
 }else if(provider==='researchcloud'){
   // Used only for journal-specific pages with a JCR/SJR year row. Avoid
   // scanning an arbitrary Elsevier 'calls for papers' list across journals.
   match=text.match(new RegExp(`\\b${y}\\s+\\|?\\s*(\\d+(?:\\.\\d+)?)\\s+Q[1-4]\\b`,'i'));
 }
 if(!match)return null;
 const value=Number(match[1]);return Number.isFinite(value)&&value>0&&value<1000?value:null;
}
export async function updateKnownJifEntries(data,{fetchHtml=async url=>(await request(url,{timeout:12000,attempts:2,headers:{Accept:'text/html'}})).text(),year=new Date().getUTCFullYear()-1}={}){
 let updated=0,skipped=0;const next=structuredClone(data);
 for(const entry of Object.values(next)){
   if(!entry.journal||!entry.refresh_provider||!entry.refresh_url){skipped++;continue}
   try{
     const html=await fetchHtml(entry.refresh_url);
     // Require exact journal name on the provider page, to avoid mixing
     // similarly named journals (e.g. Applied Surface Science vs Advances).
     if(!journalKey(textFromHtml(html)).includes(journalKey(entry.journal))){console.warn('Journal name mismatch:',entry.journal);skipped++;continue}
     const observed=explicitJif(html,entry.refresh_provider,year);
     if(observed===null){skipped++;continue}
     if(Number(entry.year)<year||entry.jif!==observed){
       entry.year=year;entry.jif=observed;entry.verified_at=new Date().toISOString().slice(0,10);
       entry.source=`${entry.refresh_provider} — explicitly dated ${year} JIF; ${entry.verification==='independent'?'independently reported, verify against JCR':'publisher supplied'}`;
       entry.source_url=entry.refresh_url;updated++;
     }
   }catch(error){console.warn('JIF source unavailable:',entry.journal,error.message);skipped++}
 }
 return {next,updated,skipped};
}
async function main(){
 const file='assets/jcr-jif-overrides.json',entries=JSON.parse(await fs.readFile(file,'utf8'));
 const result=await updateKnownJifEntries(entries);
 if(result.updated)await fs.writeFile(file,JSON.stringify(result.next,null,2)+'\n');
 console.log(`Publisher/annual JIF check: ${result.updated} changed, ${result.skipped} unavailable/not yet published; no undated substitutions.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
