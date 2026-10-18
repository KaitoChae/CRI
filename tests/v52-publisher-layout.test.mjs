import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fromCrossrefPublisher,legacyPublisher} from '../scripts/publisher-data.mjs';
import {applyPublisher,updatePublishers} from '../scripts/update-publishers.mjs';
const app=readFileSync('assets/app.js','utf8');
const css=readFileSync('assets/site.css','utf8');
const workflow=readFileSync('.github/workflows/sync-research.yml','utf8');

test('renders independent journal and publisher link; journal underlining removed',()=>{
  assert.match(app,/class="pub-source"/);
  assert.match(app,/journalLinkHtml\(p\)\}\$\{publisherLinkHtml\(p\)/);
  assert.match(css,/\.pub-source a\.pub-journal[\s\S]*?border-bottom:0!important/);
  assert.match(css,/\.publisher-label/);
  assert.match(css,/\.publisher-name/);
});
test('Crossref name maps only verified publishers to official publisher websites',()=>{
  assert.deepEqual(fromCrossrefPublisher('Elsevier BV').publisher,'Elsevier');
  assert.deepEqual(fromCrossrefPublisher('American Chemical Society (ACS)').publisher,'ACS Publications');
  assert.deepEqual(fromCrossrefPublisher('Springer Science and Business Media LLC').publisher,'Springer Nature');
  assert.equal(fromCrossrefPublisher('Unrecognized Publisher Ltd').publisher_url,'');
  assert.equal(fromCrossrefPublisher(''),null);
  assert.equal(legacyPublisher('https://www.sciencedirect.com/journal/chemosphere','10.1016/x').publisher,'Elsevier');
});
test('publisher from mismatched DOI is rejected; never inherit stale publisher',()=>{
  const pub={doi:'10.1016/j.clay.2026.108330',publisher:'Elsevier'};
  assert.equal(applyPublisher(pub,{DOI:'10.9999/wrong',publisher:'Taylor & Francis'}),pub);
  const correct=applyPublisher(pub,{DOI:pub.doi,publisher:'Elsevier BV'},'2026-10-18T00:00:00Z');
  assert.equal(correct.publisher_url,'https://www.elsevier.com/');
  assert.equal(correct.publisher_checked_at,'2026-10-18T00:00:00Z');
});
test('new publication automatically resolves; cached publisher requires no API call',async()=>{
  const a={title:'A',doi:'10.1021/abc'};
  const b={title:'B',doi:'10.1016/xyz',publisher:'Elsevier',publisher_checked_at:'2026-10-17T00:00:00.000Z'};
  const r=await updatePublishers([a,b],{now:'2026-10-18T00:00:00.000Z',fetchRecord:async()=>({message:{DOI:'10.1021/abc',publisher:'American Chemical Society'}})});
  assert.equal(r.fetched,1);
  assert.equal(r.publications[0].publisher,'ACS Publications');
  assert.equal(r.publications[1].publisher,'Elsevier');
});
test('workflow updates publisher alongside papers and commits publisher fields',()=>{
  assert.match(workflow,/node scripts\/update-publishers\.mjs/);
  assert.match(workflow,/git add assets\/publications\.js/);
  assert.match(app,/publicationSourceHtml\(p\)/);
  assert.match(app,/publisherLinkHtml\(p,'update-publisher-link'\)/);
});
