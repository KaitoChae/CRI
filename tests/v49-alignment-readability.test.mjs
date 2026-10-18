import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync('assets/site.css','utf8');
const html=readFileSync('index.html','utf8');
const v49=css.slice(css.indexOf('v49 — aligned publication columns'));

test('v49 uses identical desktop grid for publications with or without graphical abstracts',()=>{
  assert.match(v49,/\.pub-row\.has-visual, \.pub-row\.no-visual \{\s*grid-template-columns: 47px 128px/);
  assert.match(v49,/\.pub-row\.has-visual \.pub-title,\.pub-row\.no-visual \.pub-title \{grid-column:3!important;grid-row:1!important/);
  assert.match(v49,/\.pub-row\.has-visual \.badges,\.pub-row\.no-visual \.badges \{grid-column:5!important;grid-row:1!important/);
});
test('v49 increases small text sizes without changing publication data',()=>{
  assert.match(v49,/\.pub-row \.pub-authors \{font-size: clamp\(13px/);
  assert.match(v49,/\.pub-row \.badge \{font-size:12px!important/);
  assert.match(v49,/\.pub-row \.pub-title \{[\s\S]*?font-size: clamp\(21px/);
  assert.match(html,/assets\/site\.css\?v=50/);
});
test('v49 removes the old overflowing hover overlay',()=>{
  assert.match(v49,/\.pub-row::before \{content:none!important;\}/);
});
