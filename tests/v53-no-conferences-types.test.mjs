import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import '../assets/publication-policy.js';
import {readData} from '../scripts/common.mjs';
import {mergePublicationSets,mergeWork,getPublicationStats} from '../scripts/sync-publications.mjs';
import {applyPublisher} from '../scripts/update-publishers.mjs';
const {isConferencePublication,publicationType}=globalThis.CRI_PUBLICATION_POLICY;
const ccusDoi='10.1007/978-3-031-67398-6_195';
test('COM 2024 published proceedings paper remains included',()=>{
 assert.equal(isConferencePublication({doi:ccusDoi,type:'book-chapter',conference_proceedings:true}),false);
 assert.equal(isConferencePublication({doi:ccusDoi,type:'conference-paper'}),false);
 assert.equal(publicationType({doi:ccusDoi,type:'book-chapter'}),'Conference paper');
});
test('Exclude bare conference presentations and meeting abstracts only',()=>{
 for(const type of ['conference','conference-presentation','oral-presentation','poster-presentation','meeting-abstract','conference-abstract'])assert.equal(isConferencePublication({type}),true,type);
 for(const type of ['proceedings-article','conference-paper','book-chapter','journal-article'])assert.equal(isConferencePublication({type,book_title:'Proceedings of the 63rd Conference of Metallurgists'}),false,type);
 assert.equal(isConferencePublication({type:'journal-article',journal:'Proceedings of the National Academy of Sciences'}),false);
});
test('Crossref proceedings metadata does not remove a published chapter',()=>{
 const pub=applyPublisher({doi:ccusDoi,type:'book-chapter'}, {DOI:ccusDoi,type:'book-chapter',publisher:'Springer Science and Business Media LLC','container-title':['Proceedings of the 63rd Conference of Metallurgists']});
 assert.equal(pub.conference_proceedings,true);
 assert.equal(pub.publication_type,'Conference paper');
 assert.equal(isConferencePublication(pub),false);
});
test('OpenAlex sync includes proceedings and filters conference-only presentations',()=>{
 const works=[
 {doi:`https://doi.org/${ccusDoi}`,title:'Biohydrometallurgy CCUS',type:'book-chapter',publication_year:2024,cited_by_count:4},
 {title:'Conference attendance',type:'conference',publication_year:2021,cited_by_count:0},
 {doi:'https://doi.org/10.1234/research',title:'Research article',type:'journal-article',publication_year:2025,cited_by_count:2}
 ];
 const pubs=mergePublicationSets([] ,works);
 assert.equal(pubs.length,2);assert.ok(pubs.some(p=>p.doi===ccusDoi));
 assert.equal(getPublicationStats(pubs).citations,6);
 assert.equal(mergeWork(works[0]).publication_type,'Conference paper');
});
test('Curated homepage snapshot contains CCUS, graphene review, and publisher/book entries',async()=>{
 const data=await readData('assets/publications.js','LAB_PUBLICATION_DATA');
 assert.ok(data.publications.some(p=>p.doi===ccusDoi));
 assert.ok(data.publications.some(p=>p.doi==='10.1016/j.scca.2026.100242'&&p.journal_url));
 assert.ok(data.publications.some(p=>p.title.includes('Transforming E-Waste Plastics')&&p.publisher==='Springer Nature'));
 assert.ok(data.publications.some(p=>p.doi==='10.3985/mcwmr.33.448'));
 assert.ok(data.publications.every(p=>!isConferencePublication(p)));
 assert.equal(data.metrics.publications,data.publications.length);
 const app=await fs.readFile('assets/app.js','utf8');
 assert.match(app,/hydrateCrossrefMetadata/);
 assert.match(app,/typeTagHtml\(p\)/);
});
