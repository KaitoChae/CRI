import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const app=readFileSync('assets/app.js','utf8');
const translations=readFileSync('assets/translations.js','utf8');
test('Small QS instruction removed, ranking links remain',()=>{
  assert.doesNotMatch(html,/education-rank-note|data-i18n="qs_rank_note"/);
  assert.match(html,/class="qs-ranking"/);
  assert.match(html,/QS 2027 <strong>#=379/);
});
test('Both publication explanations removed with no dynamic reinsertion',()=>{
  assert.doesNotMatch(html,/pubMetricSourceNote|data-i18n="metric_note"/);
  assert.doesNotMatch(app,/pubMetricSourceNote|JIF†/);
  assert.doesNotMatch(translations,/SJR\/Q: SCImago \(annual\)/);
});
test('Visible JIF badges have no dagger; provenance and source remain',()=>{
  assert.match(app,/const iff=hasOfficial\?`JIF /);
  assert.doesNotMatch(app,/const mark=|JIF\$\{mark\}|JIF†/);
  assert.match(app,/p\.impact_factor_source_url/);
});
test('Copyright shows only author name without site descriptor',()=>{
  assert.match(html,/<span data-i18n="footer_copyright">Chaerun Raudhatul Islam<\/span>/);
  assert.doesNotMatch(html,/personal academic website/i);
  assert.doesNotMatch(translations,/personal academic website/i);
});
