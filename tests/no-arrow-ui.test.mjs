import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const visibleFiles=['index.html','assets/app.js','assets/site.css','assets/translations.js'];
const arrowChars=/[↗↖↘↙→←↑↓⇢➜➔➤❯❮⌄]/u;

test('No UI arrows remain in markup, runtime templates, stylesheet or any language',()=>{
  for(const name of visibleFiles){
    const code=fs.readFileSync(path.join(projectRoot,name),'utf8');
    assert.equal(arrowChars.test(code),false,`Arrow glyph found in ${name}`);
  }
});
test('Publications no longer render an arrow or reserve an arrow grid column',()=>{
  const js=fs.readFileSync(path.join(projectRoot,'assets/app.js'),'utf8');
  const css=fs.readFileSync(path.join(projectRoot,'assets/site.css'),'utf8');
  assert.doesNotMatch(js,/pub-arrow/);
  assert.doesNotMatch(css,/pub-arrow/);
  assert.match(css,/V45 — Arrow-free interface/);
  assert.match(css,/max-width: 720px/);
});
test('Links and buttons remain accessible and metrics retain source links',()=>{
  const html=fs.readFileSync(path.join(projectRoot,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(projectRoot,'assets/app.js'),'utf8');
  for(const part of ['id="langButton"','id="pubToggle"','id="menuButton"','class="qs-ranking"','id="pubList"']){
    assert.ok(html.includes(part),`Missing interface element: ${part}`);
  }
  assert.match(js,/const rankElement=/);
  assert.match(js,/const impactBadge=/);
  assert.match(js,/class="pub-row-link"/);
});
