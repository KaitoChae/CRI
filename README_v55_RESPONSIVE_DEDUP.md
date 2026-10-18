# CRI academic website v55 — responsive publications + duplicate protection

## Fixed display bug
At browser widths 601–760 CSS pixels, older rules incorrectly placed publication titles and citation badges inside the 40px year column. The final CSS in `assets/site.css` now uses a single full-width column for widths up to 800 CSS pixels. At widths 801px and above, the journal/publisher remains an independent column to the right, with metrics separately aligned. Publisher links, bold owner name, graphical abstract labels, and the existing metric badges are unchanged.

## Duplicate paper protection
`assets/publication-dedupe.js` is a shared browser and Node/Actions helper. It recognizes same work by normalized DOI or highly specific normalized title with publication year and author checks for near duplicates. It handles DOI URL variants, punctuation/dashes, case and unicode subscripts such as CO₂/CO2. For matching records it keeps one well-described version, verified image metadata and the highest available citation count. No unrelated publications are deleted merely because titles share a common research topic.

The helper runs:
- when the static embedded publication list is rendered;
- after live OpenAlex publication refresh in the browser;
- within `scripts/sync-publications.mjs` before GitHub Actions writes `assets/publications.js` and recomputes publication statistics.

Important: the prepackaged v54 data contained **22 records with no exact duplicates**; the risk was **during subsequent live sync**, where variant DOIs or title spellings could previously create multiple records. The new logic stops those duplicates before rendering and before writing GitHub data. The published COM 2024 paper remains included.

## Testing
Run `node --test tests/*.test.mjs` from the website root. The v55 release passes 69 offline tests. A local browser `set_content` regression check rendered all 22 publications at 16 widths (320, 360, 390, 500, 600, 601, 700, 760, 800, 801, 900, 1024, 1100, 1200, 1440 and 1920 pixels), without title–image, title–journal or title–badge collisions or horizontal scrolling. Direct navigation to local `file:///` and `http://localhost` URLs is blocked by the test environment, so actual GitHub Pages deployment remains to be verified.

## Upload to GitHub
Unzip this archive. Copy the **contents** of `CRI/` (including hidden `.github/`) into the root of your GitHub Pages repository, overwriting the old files. Allow GitHub Actions write permission, then use Actions > Sync publications, journal metrics and graphical abstracts > Run workflow. After workflow completes, hard-refresh the site using Ctrl+Shift+R. New CSS and JS asset URLs use `?v=55` to avoid stale browser caches.
