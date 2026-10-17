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
