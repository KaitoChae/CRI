import fs from 'node:fs/promises';
import {readData,journalKey} from './common.mjs';
const pubs=await readData('assets/publications.js','LAB_PUBLICATION_DATA');
const m=await readData('assets/journal-metrics.js','CRI_JOURNAL_METRICS');
const all=[...new Set([...pubs.publications.map(x=>x.journal), 'Sustainable Chemistry for Climate Action'])].filter(Boolean).sort();
const lines=[
 '# Journal metrics audit / 2026-10-17',
 '',
 'Year **2025** unless explicitly noted. JIF† = independently reported; confirm against Clarivate JCR before making official claims. **SJR Q is SCImago Best Quartile**, not JCR or Scopus CiteScore quartile. Missing values intentionally show n/a rather than an OpenAlex IF proxy.',
 '',
 '| Journal | 2025 JIF | 2025 SJR | 2025 SCImago Best Q | JIF evidence | SJR/Q evidence |',
 '|---|---:|---:|:---:|---|---|'
];
for(const journal of all){
 const r=m.by_journal[journalKey(journal)]||{},
  jif=['jcr','reported_jif'].includes(r.impact_factor_kind)?`${r.impact_factor}${r.impact_factor_kind==='reported_jif'?'†':''}`:'n/a',
  sjr=(r.sjr_year===2025&&r.sjr>0)?r.sjr.toFixed(3):'n/a',
  q=sjr!=='n/a'?r.quartile:'n/a',
  href=x=>x?.startsWith('https://')?`[source](${x})`:'n/a';
 lines.push(`| ${journal} | ${jif} | ${sjr} | ${q} | ${href(r.impact_factor_source_url)} | ${href(r.sjr_source_url)} |`);
}
lines.push('','Note: the SCImago ranking CSV may be unavailable due to rate limiting; these are dated, externally audited last-known annual records. No guarantee that a future annual metric has been issued or retrieved.','');
await fs.writeFile('METRICS_SOURCE_AUDIT.md',lines.join('\n'));
console.log('Wrote',all.length,'journal audit lines.');
