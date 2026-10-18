import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {metaImages} from '../scripts/update-publication-visuals.mjs';
import {mergeWork} from '../scripts/sync-publications.mjs';
import {applyPublisher} from '../scripts/update-publishers.mjs';

test('GA and publisher preview are tagged distinctly, no unrelated logo',()=>{
  const html=`<meta property="og:image" content="/image/figure1.png"><meta name="citation_graphical_abstract" content="/graphical-abstract.jpg"><img alt="Graphical abstract" data-src="/ga2.png"><img src="/journal-cover.jpg">`;
  const got=metaImages(html,'https://publisher.example/works/1');
  assert.equal(got[0].kind,'graphical_abstract');
  assert.ok(got.some(p=>p.url.endsWith('/ga2.png')&&p.kind==='graphical_abstract'));
  assert.ok(got.some(p=>p.url.endsWith('/image/figure1.png')&&p.kind==='publisher_preview'));
  assert.ok(!got.some(p=>p.url.includes('journal-cover.jpg')));
});
test('DOI same work retains verified visuals when OpenAlex refreshes',()=>{
 const old={doi:'10.1000/a',graphical_abstract:'assets/publications/a.jpg',graphical_abstract_kind:'graphical_abstract',journal:'The Handbook of Environmental Chemistry',publisher:'Springer Nature',journal_url:'',citations:2};
 const pub=mergeWork({doi:'https://doi.org/10.1000/a',title:'Test book chapter',type:'book-chapter',publication_year:2026,primary_location:{source:{type:'ebook',display_name:'Elsevier eBooks'}}},old);
 assert.equal(pub.graphical_abstract,old.graphical_abstract);
 assert.equal(pub.journal,'The Handbook of Environmental Chemistry');
 assert.equal(pub.publisher,'Springer Nature');
});
test('Crossref replaces generic eBook source with deposited book title',()=>{
 const p={doi:'10.1016/B978-0-12-345678-9.12345-6',journal:'Elsevier eBooks',type:'book-chapter'};
 const enriched=applyPublisher(p,{DOI:p.doi,type:'book-chapter',publisher:'Elsevier','container-title':['Coal Geochemistry']});
 assert.equal(enriched.journal,'Coal Geochemistry');
 assert.equal(enriched.publisher,'Elsevier');
 assert.equal(enriched.publication_type,'Book chapter');
});
test('Frontend hydrates Crossref publisher for browser-local current publications',async()=>{
 const source=await fs.readFile('assets/app.js','utf8');
 assert.match(source,/void hydrateCrossrefMetadata\(\)/);
 assert.match(source,/https:\/\/api\.crossref\.org\/works\//);
 assert.match(source,/isGA:!!src&&kind==='graphical_abstract'/);
 const script=await fs.readFile('scripts/update-publication-visuals.mjs','utf8');
 assert.match(script,/publisher_landing_url/);
 assert.match(script,/ars\.els-cdn\.com/);
});
