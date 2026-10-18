import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import '../assets/publication-dedupe.js';
import {mergePublicationSets,getPublicationStats} from '../scripts/sync-publications.mjs';
const {canonicalTitle,isSamePublication,deduplicatePublications}=globalThis.CRI_PUBLICATION_DEDUPE;
const mainDoi='10.1016/j.scca.2026.100242';
const mainTitle='A thorough examination of graphene-based materials for CO₂ mitigation from storage to conversion: review';
const base={doi:mainDoi,year:2026,title:mainTitle,type:'Journal article',publication_type:'Review article',journal:'Sustainable Chemistry for Climate Action',citations:0,graphical_abstract:'assets/publications/example.jpg'};

test('DOI spelling variants and Unicode CO₂/CO2 collapse to one publication',()=>{
  const records=[base,{...base,doi:`https://doi.org/${mainDoi.toUpperCase()}`,title:mainTitle.replace('CO₂','CO2'),citations:11},{...base,doi:mainDoi.replace('10.','https://dx.doi.org/10.'),title:mainTitle.replace('CO₂','CO2'),citations:5}];
  const found=deduplicatePublications(records);
  assert.equal(found.length,1);
  assert.equal(found[0].citations,11);
  assert.equal(found[0].graphical_abstract,base.graphical_abstract);
  assert.equal(canonicalTitle('CO₂ capture – review'),canonicalTitle('CO2 capture - review'));
});

test('OpenAlex missing DOI vs indexed DOI is the same paper',()=>{
  const dup={...base,doi:'',citations:15,title:mainTitle.replace(/-/g,'–')};
  assert.equal(isSamePublication(base,dup),true);
  assert.equal(deduplicatePublications([base,dup]).length,1);
});

test('Near-duplicate long titles with the same first author collapse conservatively',()=>{
  const a={title:'A detailed study of alkali activated materials for safe immobilisation of radionuclides in waste matrices',authors:'Dr Q, Dr B',year:2025};
  const b={...a,title:'A detailed study of alkali-activated materials for safe immobilisation of radionuclides in waste matrices'};
  assert.equal(isSamePublication(a,b),true);
});

test('Two unrelated articles and genuine different-year publications stay separate',()=>{
  const other={...base,doi:'10.1016/j.other.2026.143871',title:'An experimental study of chloride-induced corrosion in steel reinforcements'};
  assert.equal(deduplicatePublications([base,other]).length,2);
  assert.equal(isSamePublication(base,{...base,doi:'10.1234/new',year:2015}),false);
});

test('GitHub automatic sync merges duplicate OpenAlex works with stored visual and largest citation count',()=>{
  const mk=(doi,title,citations)=>({doi,title,publication_year:2026,type:'article',type_crossref:'journal-article',cited_by_count:citations,authorships:[{author:{display_name:'Raudhatul Islam Chaerun'}}],primary_location:{source:{type:'journal',display_name:'Sustainable Chemistry for Climate Action'}}});
  const merged=mergePublicationSets([base],[mk(`https://doi.org/${mainDoi}`,mainTitle.replace('CO₂','CO2'),12),mk('',mainTitle,3)]);
  assert.equal(merged.length,1);
  assert.equal(merged[0].citations,12);
  assert.equal(merged[0].graphical_abstract,base.graphical_abstract);
  assert.equal(getPublicationStats(merged).publications,1);
});

test('Embedded publications have no duplicates and include requested COM 2024 paper',async()=>{
  const ctx={window:{}};
  vm.runInNewContext(await fs.readFile('assets/publications.js','utf8'),ctx);
  const records=ctx.window.LAB_PUBLICATION_DATA.publications;
  assert.equal(deduplicatePublications(records).length,records.length);
  assert.ok(records.some(p=>p.doi==='10.1007/978-3-031-67398-6_195'));
});

test('Frontend deduplicates embedded and live publications; page loads shared helper',async()=>{
  const [html,app,css]=await Promise.all(['index.html','assets/app.js','assets/site.css'].map(p=>fs.readFile(p,'utf8')));
  assert.ok(html.indexOf('assets/publication-dedupe.js')>html.indexOf('assets/publication-policy.js'));
  assert.ok(html.indexOf('assets/publication-dedupe.js')<html.indexOf('assets/app.js'));
  assert.match(app,/let pubs=sortPublications\(deduplicatePublications\(/);
  assert.match(app,/pubs=sortPublications\(deduplicatePublications\(\[\.\.\.fresh,\.\.\.curatedOnly\]\)\)/);
  assert.match(css,/v55 — FIX/);
  assert.match(css,/@media \(max-width:800px\)/);
  assert.match(css,/#pubList \.pub-row\.no-visual \.pub-title \{\s*grid-column:1!important;grid-row:2!important;/);
});
