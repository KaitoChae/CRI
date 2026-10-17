import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePublicationSets,getPublicationStats,mergeWork} from '../scripts/sync-publications.mjs';
import {scimagoIndex,parseDelimited} from '../assets/update-journal-metrics.mjs';
import {metaImages} from '../scripts/update-publication-visuals.mjs';
import {readData,PUBLICATIONS_FILE} from '../scripts/common.mjs';

const sample={title:'New insights on waste',doi:'https://doi.org/10.1234/test',publication_year:2026,
  publication_date:'2026-10-11',cited_by_count:12,type:'article',primary_location:{source:{display_name:'New Journal',issn_l:'1234-5678',id:'https://openalex.org/S1234'}},
  authorships:[{author:{display_name:'A. Researcher'}}]};
test('A new journal from OpenAlex receives ISSN and source ID',()=>{
  const p=mergeWork(sample);
  assert.equal(p.issn,'12345678');assert.equal(p.source_id,'https://openalex.org/S1234');
  assert.equal(p.citations,12);
});
test('Visual and translations remain curated when live citation counts change',()=>{
  const old=[{title:'New insights on waste',doi:'10.1234/test',graphical_abstract:'assets/publications/curated.png',graphical_abstract_kind:'graphical_abstract',title_translations:{id:'Wawasan baru'},citations:2}];
  const p=mergePublicationSets(old,[sample])[0];
  assert.equal(p.citations,12);assert.equal(p.graphical_abstract,'assets/publications/curated.png');
  assert.equal(p.title_translations.id,'Wawasan baru');
});
test('New papers come before old works; curated-only records are kept',()=>{
  const old=[{title:'Curated old paper',year:2024,citations:3}];
  const arr=mergePublicationSets(old,[sample]);
  assert.equal(arr.length,2);assert.equal(arr[0].title,'New insights on waste');
  assert.equal(getPublicationStats(arr).citations,15);
});
test('SCImago CSV maps multiple ISSNs to actual annual SJR with Q',()=>{
  const snippet='Rank;Title;Issn;SJR;SJR Best Quartile;Total Docs. (2025)\n1;Journal X;1234-5678, 9876-543X;1,345;Q2;30\n';
  // parser alone also supports matching the year from the column label
  assert.equal(parseDelimited('"a;b";c\n')[0][0],'a;b');
  // fixture is intentionally short: export validity threshold prevents silently
  // replacing real SCImago datasets with partial/captcha pages.
  assert.throws(()=>scimagoIndex(snippet),/incomplete/);
  const records=Array.from({length:1100},(_,i)=>`${i+1};Journal ${i};${String(i).padStart(8,'0')};0,420;Q2;30`);
  records[0]='1;New Journal;1234-5678;1,345;Q1;30';
  const all='Rank;Title;Issn;SJR;SJR Best Quartile;Total Docs. (2025)\n'+records.join('\n');
  const indexed=scimagoIndex(all);
  assert.equal(indexed.get('12345678').sjr,1.345);
  assert.equal(indexed.get('12345678').quartile,'Q1');
  assert.equal(indexed.get('12345678').sjr_year,2025);
});
test('Graphical abstract meta preferred over generic publisher image',()=>{
  const html='<meta property="og:image" content="/cover.jpg"><meta name="citation_graphical_abstract" content="/figures/ga1.png">';
  const candidates=metaImages(html,'https://publisher.org/article/1');
  assert.equal(candidates[0].kind,'graphical_abstract');
  assert.equal(candidates[0].url,'https://publisher.org/figures/ga1.png');
  assert.equal(candidates[1].kind,'publisher_preview');
});
test('Image parser will not mistake publisher logo for a graphical abstract',()=>{
  assert.deepEqual(metaImages('<meta property="og:image" content="/assets/logo.png">','https://publisher.org/'),[]);
});
test('The shipped curated publication file is parseable',async()=>{
  const data=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  assert.ok(data.publications.length>=10);
});

// Verification regression tests for user-reported wrong JIF (4.374 vs 9.1)
const {indexVerifiedJif,verifiedJifFor,verifiedJifMetric,mergePreferJif}=await import('../scripts/verified-jif.mjs');
const fs=await import('node:fs/promises');
test('Year-scoped independent 9.1 (2025) cannot be replaced with OpenAlex proxy 4.374',async()=>{
  const verified=JSON.parse(await fs.readFile('assets/jcr-jif-overrides.json','utf8'));
  const idx=indexVerifiedJif(verified);
  const jifByIssn=verifiedJifFor(idx,{issn:'2772-8269',journal:'Sustainable Chemistry for Climate Action'});
  const jifByTitle=verifiedJifFor(idx,{issn:'1234-5678',journal:'Sustainable Chemistry for Climate Action'});
  assert.equal(jifByIssn.impact_factor,9.1);
  assert.equal(jifByIssn.impact_factor_year,2025);
  assert.equal(jifByIssn.impact_factor_kind,'reported_jif');
  assert.equal(jifByTitle.impact_factor,9.1);
  assert.match(jifByIssn.impact_factor_source_url,/minicod\.com/);
  const notJif={impact_factor:4.374,impact_factor_year:2025,impact_factor_kind:'openalex'};
  assert.equal(mergePreferJif(jifByIssn,notJif).impact_factor,9.1);
  assert.equal(mergePreferJif(notJif,jifByIssn).impact_factor,9.1);
});
test('Missing publisher provenance or invalid JIF cannot masquerade as official',()=>{
  assert.equal(verifiedJifMetric({jif:9.1,year:2025,verification:'publisher_and_year_check',source:'Undated claim',source_url:'https://publisher.test/'}),null);
  assert.equal(verifiedJifMetric({jif:9.1,year:2025}),null);
  assert.equal(verifiedJifMetric({jif:'',year:2025,source:'Elsevier',source_url:'https://publisher.test/'}),null);
  assert.equal(verifiedJifMetric({jif:9.1,year:2025,source:'Elsevier',source_url:'javascript:alert(1)'}),null);
});
test('Already-shipped website metrics include verified JIF for journal not yet in snapshot',async()=>{
  const m=await readData('assets/journal-metrics.js','CRI_JOURNAL_METRICS');
  assert.equal(m.by_issn['27728269'].impact_factor,9.1);
  assert.equal(m.by_journal['sustainable chemistry for climate action'].impact_factor_kind,'reported_jif');
});
test('2027 QS university ranking badges link to official rankings',async()=>{
  const html=await fs.readFile('index.html','utf8');
  assert.match(html,/Taiwan Tech QS World University Rankings 2027, tied 379th/);
  assert.match(html,/Hokkaido University QS World University Rankings 2027, tied 179th/);
  assert.match(html,/QS 2027 <strong>#=379<\/strong>/);
  assert.equal((html.match(/QS 2027 <strong>#=179<\/strong>/g)||[]).length,2);
  assert.match(html,/https:\/\/www\.topuniversities\.com\/universities\/hokkaido-university/);
});

test('Browser merger cannot hide publisher JIF under article-specific stale IF*',async()=>{
  const source=await fs.readFile('assets/app.js','utf8');
  const vm=await import('node:vm');
  const matcher=source.match(/function embeddedMetricFor\(p=\{\}\)\{[\s\S]*?\n\}/);
  assert.ok(matcher,'Browser has journal-metrics merger');
  const metrics=await readData('assets/journal-metrics.js','CRI_JOURNAL_METRICS');
  const doi='10.0000/example-new-paper';
  metrics.by_doi[doi]={impact_factor:4.374,impact_factor_kind:'openalex',impact_factor_year:2025};
  const ctx={embeddedJournalMetrics:metrics,
    normalizeIssn:v=>String(v||'').toUpperCase().replace(/[^0-9X]/g,'').slice(0,8),
    journalMetricKey:v=>String(v||'').toLowerCase().trim()};
  vm.runInNewContext(matcher[0]+'\nthis.metricFor=embeddedMetricFor;',ctx);
  for(const paper of [
    {journal:'Sustainable Chemistry for Climate Action',doi,issn:'2772-8269'},
    {journal:'Sustainable Chemistry for Climate Action',doi,issn:''}]){
    const resolved=ctx.metricFor(paper);
    assert.equal(resolved.impact_factor,9.1);
    assert.equal(resolved.impact_factor_kind,'reported_jif');
    assert.equal(resolved.impact_factor_year,2025);
  }
});

// Extra regression coverage for user-reported incorrect/wrong-year JIF,
// 2025 annual SJR/Q and unexpectedly wrapping JIF below Q on desktop.
const {loadAuditedSjr,matchingAuditedSjr,bestRank}=await import('../scripts/audited-metrics.mjs');
const {explicitJif}=await import('../scripts/refresh-verified-jif.mjs');
test('Audited SJR values and SCImago quartile are stored by annual year and journal title',async()=>{
  const idx=await loadAuditedSjr();
  const a=matchingAuditedSjr(idx,{journal:'Sustainable Chemistry for Climate Action',issns:['2772-8269']});
  assert.equal(a.sjr,1.091);assert.equal(a.quartile,'Q1');assert.equal(a.sjr_year,2025);
  const wrong=matchingAuditedSjr(idx,{journal:'Unrelated Journal',issns:['2772-8269']});
  assert.equal(wrong,null);
  assert.equal(bestRank(a,{sjr:9.99,quartile:'Q2',sjr_year:2024}).sjr,1.091);
  assert.equal(bestRank(a,{sjr:0,quartile:'Q1',sjr_year:2026}).sjr,1.091);
});
test('Never substitute a 2024 Impact Factor for its explicitly dated 2025 successor',async()=>{
  const v=JSON.parse(await fs.readFile('assets/jcr-jif-overrides.json','utf8'));
  for(const [issn,expected] of Object.entries({
    '01691317':5.2,'00088846':14,'03043894':10.6,
    '13835866':9.1,'01665162':7.3,'25726641':1.3
  })){
    assert.equal(v[issn].year,2025,issn);assert.equal(v[issn].jif,expected,issn);
  }
  const html='<h2>Journal of Hazardous Materials</h2><table><tr><td>2025 (2026 update)</td><td>10.6</td></tr><tr><td>2024</td><td>11.3</td></tr></table>';
  assert.equal(explicitJif(html,'bioxbio',2025),10.6);
  assert.equal(explicitJif(html,'bioxbio',2026),null);
  assert.equal(explicitJif('<div>Impact Factor: 13.1</div>','nature',2025),null);
});
test('No SCImago ranking year may be mislabelled when download serves older export',()=>{
  const rows=Array.from({length:1001},(_,i)=>`${i+1};Journal ${i};${String(i).padStart(8,'0')};1,234;Q1;10`).join('\n');
  const csv='Rank;Title;Issn;SJR;SJR Best Quartile;Total Docs. (2024)\n'+rows;
  assert.throws(()=>scimagoIndex(csv,2025),/does not match requested/);
});
test('University and publication label improvements: large font and single desktop metrics row',async()=>{
  const css=await fs.readFile('assets/site.css','utf8');
  const js=await fs.readFile('assets/app.js','utf8');
  assert.match(css,/V44: layout fix/);
  assert.match(css,/\.pub-row \.metric-group\{white-space:nowrap/);
  assert.match(css,/\.degree \.university-name\{font-size:14px!important/);
  assert.match(js,/SJR \${normalizedQuartile\(p.quartile\)}/);
  assert.match(js,/const iff=hasOfficial\?`JIF /); // dagger was intentionally removed in v46
  assert.match(js,/const byName=embeddedJournalMetrics.by_journal/);
});
test('Official publisher JIF wins equal-year independent reports in normal merging',()=>{
  const publisher={impact_factor:1.3,impact_factor_year:2025,impact_factor_kind:'jcr',impact_factor_source_url:'https://www.iom3.org/'};
  const patch={impact_factor:1.24,impact_factor_year:2025,impact_factor_kind:'reported_jif',impact_factor_source_url:'https://www.scijournal.org/'};
  assert.equal(mergePreferJif(publisher,patch).impact_factor,1.3);
  assert.equal(mergePreferJif(publisher,{...patch,impact_factor_year:2024}).impact_factor,1.3);
});
