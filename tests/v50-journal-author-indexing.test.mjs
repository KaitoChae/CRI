import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {updateJournalLinks,applyJournalHomepage} from '../scripts/update-journal-links.mjs';
import {updateIndexing} from '../scripts/update-indexing.mjs';
const app=readFileSync('assets/app.js','utf8');
const css=readFileSync('assets/site.css','utf8');
const names=vm.runInNewContext(`${app.slice(app.indexOf('function safeText('),app.indexOf('function safeUrl('))}\n({authorListHtml,isWebsiteAuthorName})`);
test('Ronny Winarko is NEVER bold, but Chaerun Raudhatul Islam is',()=>{
  assert.equal(names.isWebsiteAuthorName('Ronny Winarko'),false);
  assert.equal(names.isWebsiteAuthorName('Raudhatul Islam Chaerun'),true);
  assert.equal(names.isWebsiteAuthorName('Chaerun Raudhatul Islam'),true);
  assert.equal(names.isWebsiteAuthorName('Siti Khodijah Chaerun'),false);
  const html=names.authorListHtml('Ronny Winarko, Raudhatul Islam Chaerun, Siti Khodijah Chaerun');
  assert.match(html,/^Ronny Winarko, <strong class="publication-self-author">Raudhatul Islam Chaerun<\/strong>, Siti Khodijah Chaerun$/);
});
test('Publication and Latest Work journal names get verified publisher homepages',()=>{
  assert.match(app,/\$\{journalLinkHtml\(p\)\}/);
  assert.match(app,/journalLinkHtml\(p,'update-journal-link'\)/);
  assert.match(css,/#pubList \.pub-row a\.pub-journal/);
  assert.match(app,/journal_url/);
});
test('Journal homepage matching rejects a different title and book source',()=>{
  const base={journal:'Applied Clay Science',issn:'0169-1317'};
  const other=applyJournalHomepage(base,{type:'journal',display_name:'Journal of Hazardous Materials',homepage_url:'https://example.com/wrong'});
  assert.deepEqual(other,base);
  const changed=applyJournalHomepage(base,{type:'journal',display_name:'Applied Clay Science',homepage_url:'https://www.sciencedirect.com/journal/applied-clay-science'});
  assert.equal(changed.journal_url,'https://www.sciencedirect.com/journal/applied-clay-science');
  assert.deepEqual(applyJournalHomepage(base,{type:'book',display_name:'Applied Clay Science',homepage_url:'https://example.com'}),base);
});
test('Journal homepages resolve from OpenAlex and reuse across papers with the same venue',async()=>{
  let queries=0;
  const papers=[{journal:'Applied Clay Science',source_id:'https://openalex.org/S123',issn:'0169-1317'},{journal:'Applied Clay Science',source_id:'https://openalex.org/S123',issn:'0169-1317'}];
  const data=await updateJournalLinks(papers,{fetchRecord:async()=>{queries++;return {id:'https://openalex.org/S123',type:'journal',display_name:'Applied Clay Science',homepage_url:'https://www.sciencedirect.com/journal/applied-clay-science'}}});
  assert.equal(queries,1);
  assert.equal(data.publications[0].journal_url,data.publications[1].journal_url);
});
test('An empty Scopus/WoS result is not called "not indexed", and avoids API quota waste',async()=>{
  const calls=[];
  const now=new Date('2026-10-18T00:00:00Z');
  const options={now,scopusKey:'mock',wosKey:'mock',fetchRecord:async(url)=>{calls.push(url);return url.includes('elsevier')?{'abstracts-retrieval-response':{}}:{hits:[]}}};
  const one=await updateIndexing([{doi:'10.1111/example'}],options);
  assert.equal(one.attempted,2);
  assert.equal(one.publications[0].indexing.scopus.status,'not_verified');
  assert.equal(one.publications[0].indexing.wos.status,'not_verified');
  const two=await updateIndexing(one.publications,options);
  assert.equal(two.attempted,0);
  assert.equal(calls.length,2);
});
test('Mobile, compact windows, and desktop have explicit nonoverlapping grid arrangements',()=>{
  assert.match(css,/#pubList \.pub-row\.has-visual,#pubList \.pub-row\.no-visual/);
  assert.match(css,/@media\(min-width:761px\) and \(max-width:1150px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
});
