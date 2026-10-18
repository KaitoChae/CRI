import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('assets/app.js','utf8');
const css=readFileSync('assets/site.css','utf8');
const yaml=readFileSync('.github/workflows/sync-research.yml','utf8');
const badges=app.slice(app.indexOf('function publicationMetricBadges('),app.indexOf('function updatePublicationToggle()'));
test('Scopus and WoS are not displayed and no API verification job runs',()=>{
  assert.doesNotMatch(badges, /indexingBadge\(/);
  assert.doesNotMatch(badges, /indexing-group/);
  assert.doesNotMatch(yaml, /run: node scripts\/update-indexing\.mjs/);
  assert.doesNotMatch(yaml, /ELSEVIER_API_KEY|CLARIVATE_WOS_API_KEY/);
  assert.match(badges, /metric-group/);
});
test('Every publication, with or without an image, has a dedicated journal-right column',()=>{
  assert.match(app,/pub-thumb-placeholder/);
  assert.match(css,/#pubList \.pub-row \.pub-journal\{grid-column:4!important;grid-row:1!important/);
  assert.match(css,/@media\(min-width:1101px\)/);
  assert.match(css, /@media\(min-width:801px\) and \(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(app,/journalLinkHtml\(p\)/);
});
test('Latest Work badges wrap without overlapping',()=>{
  assert.match(css,/#updateGrid \.update-metrics \{[^}]*flex-wrap:wrap!important;/);
  assert.match(css,/#updateGrid \.update-metrics a\.badge \{[^}]*margin:0!important;/);
});
