// Audit layer: only use independently checked and traceable journal metrics.
// It complements (never replaces or fabricates) the official SCImago CSV.
import fs from 'node:fs/promises';
import {normalizeIssn,journalKey} from './common.mjs';
export const validQuartile=q=>/^Q[1-4]$/.test(String(q||'').toUpperCase());
export function auditedSjrIndex(data){
  const byIssn=new Map(),byJournal=new Map();
  for(const [rawIssn,item] of Object.entries(data||{})){
    const issn=normalizeIssn(rawIssn),score=Number(item?.sjr),year=Number(item?.year);
    if(!issn || !Number.isFinite(score) || score<=0 || score>200 || !validQuartile(item?.quartile) || !Number.isInteger(year) || year<2000 || year>2100 || !/^https:\/\//.test(item?.source_url||'') || !item?.journal)continue;
    const entry={sjr:score,quartile:item.quartile,sjr_year:year,sjr_source:item.source||'Audited journal rank directory',sjr_source_url:item.source_url,sjr_status:'audited',sjr_journal:item.journal,sjr_issn:issn};
    byIssn.set(issn,entry);byJournal.set(journalKey(item.journal),entry);
  }
  return {byIssn,byJournal};
}
export async function loadAuditedSjr(){
  const data=JSON.parse(await fs.readFile('assets/audited-sjr-overrides.json','utf8'));
  return auditedSjrIndex(data);
}
export function matchingAuditedSjr(index,{issns=[],journal=''}={}){
  // ISSN AND journal name must agree, preventing a recycled ISSN or bad
  // OpenAlex source match from applying rank to another journal.
  const name=journalKey(journal);
  for(const raw of issns){const found=index.byIssn.get(normalizeIssn(raw));if(found && journalKey(found.sjr_journal)===name)return found}
  return index.byJournal.get(name)||null;
}
export function bestRank(old={},update={}){
  const oldYear=Number(old.sjr_year)||0,newYear=Number(update.sjr_year)||0;
  const certified=['audited','scimago-export','publisher-listed'];
  const incomingGood=(Number.isFinite(Number(update.sjr)) && Number(update.sjr)>0 && validQuartile(update.quartile));
  const existingGood=(Number.isFinite(Number(old.sjr)) && Number(old.sjr)>0 && validQuartile(old.quartile));
  if(!incomingGood)return old;
  if(existingGood&&newYear<oldYear)return old;
  // A journal's canonical ISSN-matched verified record beats a historical
  // unproven data snapshot for the same ranking year.
  if(existingGood&&newYear===oldYear&&certified.includes(old.sjr_status)&&!certified.includes(update.sjr_status))return old;
  return {...old,...Object.fromEntries(Object.entries(update).filter(([k])=>k.startsWith('sjr')||k==='quartile'))};
}
