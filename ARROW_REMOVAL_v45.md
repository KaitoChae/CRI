# UI update v45 — all visible arrow icons removed

This release is based on `CRI_Website_IF_SJR_Q_Verified_v44.zip`.
It changes the interface only; it does **not** alter publication metadata, SJR, quartiles, JIF values, ranking data, images, research content, or GitHub Actions.

## Changes

- Removed external-link arrow symbols from all profile links, QS-ranking badges, footers, collaboration links, publication read links, and translated labels in all twelve supported languages.
- Removed arrows from dynamically created SJR, SCImago quartile, and JIF badges. Source links remain active and accessible.
- Removed the arrow at the end of every publication row and the decorative arrows on latest-publication cards with no image.
- Removed the language-picker downward chevron; the language selector still opens when clicked.
- Removed CSS classes/styles used solely to display publication arrows, and reallocated their space for the article information and journal metric badges at desktop/tablet/mobile breakpoints.
- Incremented the CSS, JavaScript, and translation query versions to 45 for fresh browser loading.

## Validation

- `node --test tests/*.test.mjs` — 20 tests passed (17 original and 3 UI-specific).
- Responsive CSS layout verified using headless Chromium at 1440, 1024, 768, 390, and 320 px; no horizontal overflow in publication rows.
- All visible arrow glyphs removed from the HTML, CSS, JS-rendered publication templates, and translation files.

## Publishing to GitHub Pages

Extract the ZIP. Upload/overwrite the *contents of `CRI/`* into the website repository root, including the hidden `.github/` directory. Existing unrelated repository settings need not be changed. Normal repository deployment will publish the interface; the journal-metric update workflow is unchanged.
