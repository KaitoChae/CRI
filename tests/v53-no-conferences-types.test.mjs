import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import '../assets/publication-policy.js';
import {readData} from '../scripts/common.mjs';
import {mergePublicationSets,mergeWork,getPublicationStats} from '../scripts/sync-publications.mjs';
import {applyPublisher,updatePublishers} from '../scripts/update-publishers.mjs';
const {isConferencePublication,publicationType}=globalThis.CRI_PUBLICATION_POLICY;
const conferenceDoi='10.1007/978-3-031-67398-6_195';
const confTitle='Application of Biohydrometallurgy in Carbon Capture, Utilization, and Storage (CCUS): Carbonate Precipitation by Bacillus subtilis as a Biocatalyst Using Calcium-Enriched Pregnant Leach Solutions from Steel Slag Bioleaching';

test('The specifically identified COM 2024 conference paper is permanently excluded even if indexed as a book chapter',()=>{
  assert.equal(isConferencePublication({doi:conferenceDoi,type:'book-chapter'}),true);
  assert.equal(isConferencePublication({title:confTitle,type:'book-chapter'}),true);
  assert.equal(isConferencePublication({doi:`https://doi.org/${conferenceDoi}`,type:'journal-article'}),true);
});
test('Generic conference types and a proceedings chapter are rejected without confusing legitimate journals',()=>{
  for(const t of ['conference paper','conference-paper','proceedings-article','conference-abstract'])assert.ok(isConferencePublication({type:t}),t);
  assert.ok(isConferencePublication({type:'book-chapter',book_title:'Proceedings of the 63rd Conference of Metallurgists'}));
  assert.ok(isConferencePublication({type:'book-chapter',source_type:'conference'}));
  assert.equal(isConferencePublication({type:'journal-article',journal:'Proceedings of the National Academy of Sciences'}),false);
  assert.equal(isConferencePublication({type:'book-chapter',book_title:'The Handbook of Environmental Chemistry'}),false);
  assert.equal(isConferencePublication({type:'review article',journal:'Applied Clay Science'}),false);
  assert.equal(isConferencePublication({type:'book-chapter',book_title:'Green Energy and Technology'}),false);
});
test('Automatic publication types distinguish research, review and book chapters',()=>{
  assert.equal(publicationType({type:'journal-article'}),'Research article');
  assert.equal(publicationType({type:'Review article'}),'Review article');
  assert.equal(publicationType({type:'journal-article',title:'Graphene-based materials for climate action: review'}),'Review article');
  assert.equal(publicationType({type:'book-chapter'}),'Book chapter');
  assert.equal(publicationType({type:'book-chapter',book_title:'Proceedings of the 63rd Conference of Metallurgists'}),'Conference paper');
});
test('OpenAlex sync never restores excluded conferences and computes only kept article metrics',()=>{
  const conf={doi:`https://doi.org/${conferenceDoi}`,title:confTitle,type:'book-chapter',publication_year:2026,cited_by_count:40};
  const art={doi:'https://doi.org/10.1234/regular',title:'Regular journal paper',type:'journal-article',publication_year:2026,cited_by_count:3};
  const old=[{doi:conferenceDoi,title:confTitle,type:'Conference paper',citations:10}, {doi:'10.1234/old',title:'Older book chapter',type:'Book chapter',citations:4}];
  const result=mergePublicationSets(old,[conf,art]);
  assert.equal(result.length,2);
  assert.ok(result.every(p=>!isConferencePublication(p)));
  assert.equal(getPublicationStats(result).citations,7);
  assert.equal(mergeWork(art).publication_type,'Research article');
});
test('Crossref DOI metadata identifies disguised proceedings and refreshes ordinary book chapters',async()=>{
  const com={doi:conferenceDoi,type:'book-chapter'};
  const recognized=applyPublisher(com,{DOI:conferenceDoi,publisher:'Springer Science and Business Media LLC',type:'book-chapter','container-title':['Proceedings of the 63rd Conference of Metallurgists']});
  assert.equal(recognized.conference_proceedings,true);
  const chapter=applyPublisher({doi:'10.1007/legitimate-chapter',type:'book-chapter'},{DOI:'10.1007/legitimate-chapter',publisher:'Springer Nature',type:'book-chapter','container-title':['The Handbook of Environmental Chemistry']});
  assert.equal(chapter.conference_proceedings,undefined);
  assert.equal(chapter.publication_type,'Book chapter');
  assert.ok(chapter.publisher_url);
  const batch=await updatePublishers([{doi:'10.1007/legitimate-chapter',type:'book-chapter'}],{fetchRecord:async()=>({message:{DOI:'10.1007/legitimate-chapter',publisher:'Springer Nature',type:'book-chapter','container-title':['The Handbook of Environmental Chemistry']}})});
  assert.equal(batch.publications[0].publication_type,'Book chapter');
});
test('Website only ships filtered publications; browser filters live updates; category appears in both lists',async()=>{
  const data=await readData('assets/publications.js','LAB_PUBLICATION_DATA');
  assert.ok(data.publications.every(p=>!isConferencePublication(p)));
  assert.equal(data.metrics.publications,data.publications.length);
  assert.equal(data.metrics.citations,getPublicationStats(data.publications).citations);
  assert.equal(data.publications.length,17);
  const app=await fs.readFile('assets/app.js','utf8');
  const html=await fs.readFile('index.html','utf8');
  const script=await fs.readFile('scripts/sync-publications.mjs','utf8');
  assert.match(html,/assets\/publication-policy\.js/);
  assert.match(app,/filter\(p=>!isConferencePublication\(p\)\)/);
  assert.match(app,/isConferencePublication\(\{\.\.\.work/);
  assert.match(app,/typeTagHtml\(p\)/);
  assert.match(app,/publicationTypeLabel\(p\)/);
  assert.match(script,/if\(isConferencePublication\(result\)\)continue/);
});
