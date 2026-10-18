import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseScopus,parseWos,updateIndexing} from '../scripts/update-indexing.mjs';
import {mergeWork} from '../scripts/sync-publications.mjs';
const app=readFileSync('assets/app.js','utf8');
const css=readFileSync('assets/site.css','utf8');
const authors=app.slice(app.indexOf('function safeText('),app.indexOf('function safeUrl('));
const names=vm.runInNewContext(`${authors}\n({authorListHtml,isWebsiteAuthorName})`);

test('Owner names are bold on both publication and Latest Work; coauthors remain plain',()=>{
  const rendered=names.authorListHtml('Siti Khodijah Chaerun, Raudhatul Islam Chaerun, Ronny Winarko, Chaerun Raudhatul Islam, Another author');
  assert.match(rendered,/<strong class="publication-self-author">Raudhatul Islam Chaerun<\/strong>/);
  assert.doesNotMatch(rendered,/<strong class="publication-self-author">Ronny Winarko<\/strong>/);
  assert.match(rendered,/Raudhatul Islam Chaerun/);
  assert.match(rendered,/<strong class="publication-self-author">Chaerun Raudhatul Islam<\/strong>/);
  assert.doesNotMatch(rendered,/<strong[^>]*>Siti Khodijah Chaerun/);
  assert.equal((app.match(/authorListHtml\(p.authors\)/g)||[]).length,2);
});
test('Author names are escaped and only bolded when actually present',()=>{
  assert.equal(names.authorListHtml('Other Researcher, Siti Khodijah Chaerun').includes('<strong'),false);
  assert.match(names.authorListHtml('<img src=x>, Raudhatul Islam Chaerun'),/&lt;img src=x&gt;/);
  assert.doesNotMatch(names.authorListHtml('<img src=x>'),/<img/);
});
test('OpenAlex keeps full author list beyond seventh coauthor',()=>{
  const namesArray=['A','B','C','D','E','F','G','Raudhatul Islam Chaerun'];
  const p=mergeWork({title:'Test',authorships:namesArray.map(name=>({author:{display_name:name}}))});
  assert.match(p.authors,/G, Raudhatul Islam Chaerun$/);
});
test('Quarter badges are just Q1–Q4 and verified index badge links are independent',()=>{
  assert.match(app,/const qtile=hasRank\?normalizedQuartile/);
  assert.doesNotMatch(app,/const qtile=hasRank\?`SJR \$\{normalizedQuartile/);
  assert.match(app,/indexing\?\.\[kind\]/);
});
test('All 3 viewport layouts have explicit image/title/metrics tracks',()=>{
  assert.match(css,/v48 — Collision-free publication rows/);
  assert.match(css,/\.pub-row\.has-visual \.pub-thumb \{grid-column:2!important;grid-row:1!important/);
  assert.match(css,/max-width:1200px/);
  assert.match(css,/max-width:720px/);
  assert.match(css,/\.publication-self-author/);
});
test('Scopus requires DOI match and verified EID',()=>{
  const positive={'abstracts-retrieval-response':{coredata:{'prism:doi':'10.1111/Test','eid':'2-s2.0-1234567'}}};
  assert.equal(parseScopus(positive,'10.1111/test').id,'2-s2.0-1234567');
  assert.equal(parseScopus(positive,'10.2222/wrong'),null);
  assert.equal(parseScopus({'abstracts-retrieval-response':{}},'10.1111/test'),null);
});
test('WoS confirms exact DOI before indexing',()=>{
  const response={hits:[{uid:'WOS:001234567890001',identifiers:{doi:'10.1111/Test'}}]};
  assert.equal(parseWos(response,'10.1111/test').status,'indexed');
  assert.equal(parseWos(response,'10.2222/test'),null);
  assert.equal(parseWos({hits:[]},'10.1111/test'),null);
});
test('Failed/unconfigured APIs never fabricate indexing or erase verified badges',async()=>{
  const p={doi:'10.1111/test',indexing:{scopus:{status:'indexed',id:'2-s2.0-12345',url:'https://www.scopus.com/',checked_at:'2025-01-01'}}};
  const disabled=await updateIndexing([p],{scopusKey:'',wosKey:''});
  assert.deepEqual(disabled.publications[0],p);
  const error=await updateIndexing([p],{scopusKey:'bad',wosKey:'bad',fetchRecord:async()=>{throw Error('403')},logger:{warn(){}}});
  assert.equal(error.publications[0].indexing.scopus.id,'2-s2.0-12345');
  assert.equal(error.publications[0].indexing.wos,undefined);
});
test('Both API lookups update verifiable papers without exposing secret keys',async()=>{
  const papers=[{doi:'10.1111/test'}];
  const calls=[];
  const result=await updateIndexing(papers,{scopusKey:'privateA',wosKey:'privateB',fetchRecord:async(url,opts)=>{
    calls.push({url,opts});
    if(url.includes('elsevier'))return {'abstracts-retrieval-response':{coredata:{'prism:doi':'10.1111/test',eid:'2-s2.0-123'}}};
    return {hits:[{uid:'WOS:000123456789123',identifiers:{doi:'10.1111/test'}}]};
  }});
  assert.equal(result.verified,2);
  assert.equal(result.publications[0].indexing.scopus.status,'indexed');
  assert.equal(result.publications[0].indexing.wos.status,'indexed');
  assert.equal(JSON.stringify(result.publications).includes('privateA'),false);
  assert.equal(calls[1].opts.headers['X-ApiKey'],'privateB');
});
