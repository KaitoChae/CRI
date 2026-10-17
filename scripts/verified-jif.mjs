// Publisher-verified Journal Impact Factor records (as reported by the publisher).
// OpenAlex 2-year mean citedness must NEVER be labeled as official JIF.
import {normalizeIssn,journalKey} from './common.mjs';

export function verifiedJifMetric(entry){
  if(!entry || typeof entry !== 'object')return null;
  const year=Number(entry.year);const value=Number(entry.jif);
  if(entry.jif === '' || entry.jif === null || entry.jif === undefined ||
     !Number.isFinite(value) || value<0 || value>1000 ||
     !Number.isInteger(year) || year<2000 || year>2100 ||
     !String(entry.source||'').trim() || !/^https:\/\//.test(entry.source_url||''))return null;
  return {
    impact_factor:value, impact_factor_year:year,
    impact_factor_kind:'jcr',
    impact_factor_source:String(entry.source),
    impact_factor_source_url:String(entry.source_url)
  };
}
export function indexVerifiedJif(entries){
  const byIssn=new Map(),byJournal=new Map();
  for(const [key,entry] of Object.entries(entries||{})){
    const value=verifiedJifMetric(entry);
    if(!value)continue;
    const issn=normalizeIssn(key);
    if(issn)byIssn.set(issn,value);
    if(entry.journal)byJournal.set(journalKey(entry.journal),value);
  }
  return {byIssn,byJournal};
}
export function verifiedJifFor(index,{issn,sourceIssns=[],journal}={}){
  for(const token of [issn,...sourceIssns]){
    const metric=index.byIssn.get(normalizeIssn(token));
    if(metric)return metric;
  }
  return index.byJournal.get(journalKey(journal))||null;
}
// Live OpenAlex cannot downgrade a previously verified/publisher-supplied JIF.
export function mergePreferJif(previous={},patch={}){
  const next={...previous,...patch};
  if(previous.impact_factor_kind==='jcr' && patch.impact_factor_kind!=='jcr'){
    for(const key of ['impact_factor','impact_factor_year','impact_factor_kind','impact_factor_source','impact_factor_source_url']){
      if(key in previous)next[key]=previous[key];
      else delete next[key];
    }
  }
  return next;
}
