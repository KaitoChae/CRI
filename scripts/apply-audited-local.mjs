// Prepares the distributed offline snapshot without network access.
// Requires that every curated number be year-scoped and link to its evidence.
import fs from 'node:fs/promises';
import {readData,writeData,METRICS_FILE,normalizeIssn,journalKey} from './common.mjs';
import {indexVerifiedJif,mergePreferJif} from './verified-jif.mjs';
import {loadAuditedSjr,bestRank} from './audited-metrics.mjs';
const current=await readData(METRICS_FILE,'CRI_JOURNAL_METRICS');
const official=indexVerifiedJif(JSON.parse(await fs.readFile('assets/jcr-jif-overrides.json','utf8')));
const audited=await loadAuditedSjr();
const clean={...current,by_issn:{...current.by_issn},by_journal:{...current.by_journal},by_doi:{}};
const apply=(source,destination,{authoritativeJif=false}={})=>{
 for(const [key,patch] of source){
  const before=destination[key]||{};
  const next=mergePreferJif(before,patch);
  if(authoritativeJif && ['jcr','reported_jif'].includes(patch.impact_factor_kind)){
    for(const k of ['impact_factor','impact_factor_year','impact_factor_kind','impact_factor_source','impact_factor_source_url','impact_factor_verified_at','impact_factor_journal']){
      if(k in patch)next[k]=patch[k];else delete next[k];
    }
  }
  const preferredRank=bestRank(before,patch);
  for(const k of Object.keys(next))if(k==='quartile'||k.startsWith('sjr'))delete next[k];
  for(const [k,v] of Object.entries(preferredRank))if(k==='quartile'||k.startsWith('sjr'))next[k]=v;
  for(const k of ['citations','issn'])delete next[k];
  destination[key]=next;
 }
};
apply(audited.byIssn,clean.by_issn);apply(audited.byJournal,clean.by_journal);
apply(official.byIssn,clean.by_issn,{authoritativeJif:true});apply(official.byJournal,clean.by_journal,{authoritativeJif:true});
// Metrics retain the *last actual fetch* timestamp, never fake a new remote
// sync just because this local release re-verified their provenance.
clean.sjr_update_status='2025 SJR/Q audited by ISSN and journal title; official CSV retry scheduled daily';
clean.sjr_last_audited_at='2026-10-17';
await writeData(METRICS_FILE,'CRI_JOURNAL_METRICS',clean);
console.log('Curated SJR/Q entries:',audited.byJournal.size,'Year-checked JIFs:',official.byJournal.size);
