import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const js = readFileSync('assets/app.js', 'utf8');
const css = readFileSync('assets/site.css', 'utf8');
const source = js.slice(js.indexOf('function normalizedQuartile('), js.indexOf('function normalizeIssn('));
const badgeSource = js.slice(js.indexOf('function publicationMetricBadges('), js.indexOf('function updatePublicationToggle('));
const render = runInNewContext(`${source}\n${badgeSource}\npublicationMetricBadges`, {
  safeImageSrc: value => value || '',
  safeText: value => String(value || ''),
  t: () => 'citations',
});

test('All four SCImago badge colors render with correct CSS class for BOTH lists', () => {
  const desired = {Q1:'#287d43', Q2:'#f3ce47', Q3:'#eb8d32', Q4:'#bd3d42'};
  for (const [q, hex] of Object.entries(desired)) {
    const badge = render({quartile:q, sjr:1.234, sjr_source_url:'https://www.scimagojr.com/journalsearch.php?q=20912&tip=sid'}, true);
    assert.match(badge, new RegExp(`class="badge ${q.toLowerCase()}"`), `${q} not mapped to the correct class`);
    assert.match(badge, new RegExp(`SJR ${q}`));
    assert.match(css, new RegExp(`\\.badge\\.${q.toLowerCase()} \\{\\s*background-color: ${hex.replace('#','\\#')};`));
    assert.doesNotMatch(badge, new RegExp(`class="badge na"[^>]*>SJR ${q}<`));
  }
});

test('Missing quartiles never display a misleading SCImago color', () => {
  for (const input of [{quartile:'Q1',sjr:0}, {quartile:null,sjr:1.0}, {quartile:'Q5',sjr:1.0}]) {
    const badges = render(input);
    assert.match(badges, /SJR Q n\/a/);
    assert.doesNotMatch(badges,/class="badge q[1-4]"/);
  }
});

test('JIF and numeric SJR badges do not inherit Q1-Q4 colors', () => {
  const badges = render({quartile:'Q3',sjr:2.198,sjr_source_url:'https://www.scimagojr.com/',impact_factor:9.1,impact_factor_kind:'reported_jif',impact_factor_year:2025,impact_factor_source_url:'https://example.org/'});
  assert.match(badges,/class="badge sjr"/);
  assert.match(badges,/class="badge q3"/);
  assert.match(badges,/class="badge if"/);
  assert.match(badges,/JIF 9\.1 \(2025\)/);
  assert.doesNotMatch(badges,/†/);
});
