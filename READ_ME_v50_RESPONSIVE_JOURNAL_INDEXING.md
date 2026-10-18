# CRI website v50 — author highlight, responsive layout, journal links, indexing

## What changed

- **Only Raudhatul Islam Chaerun / Chaerun Raudhatul Islam** (including clearly matching initials) is bolded in the publication authors, never Ronny Winarko or other Chaerun coauthors. The same rule applies automatically to newly discovered publications, Latest Work, search results, and language changes.
- **Responsive publication cards** reserve identical thumbnail columns in a wide window. Narrower windows reorganise into three-column and single-column layouts, with journal title and badges always visible. The former overlapping four/five-column narrow-title layout is no longer used.
- **Click the journal title** to open its journal homepage in a new tab. Seeded publisher URLs are provided for known journals. GitHub Actions resolves and periodically checks new journal homepages using OpenAlex Source metadata (validates title/ISSN). Book chapters/conference publications are not assigned a fabricated journal link.
- The manuscript title or publication row still links to the individual article. Journal name links to the journal's homepage; these are different destinations.
- **Scopus and Web of Science indexing** are *article-level* checks, never inferred from a journal's SJR, quartile, OpenAlex data, or title. Verified records link to their official database records.
- If Scopus/WoS has not yet been verified, the indicator displays `n/a`; it does **not** mean the article is not indexed. Unverified API results are checked no more frequently than once per 7 days, to conserve provider quotas, while new articles are checked as soon as discovered. Existing verified statuses persist through temporary provider failures.

## How to install

1. Extract the ZIP, open the `CRI/` folder, and copy its **contents** into the root of your GitHub Pages repository (including the hidden `.github` folder). Do not put the `CRI` folder inside the repository unless Pages is explicitly configured for that structure.
2. In **GitHub > Settings > Secrets and variables > Actions**, configure `ELSEVIER_API_KEY` (Scopus) and `CLARIVATE_WOS_API_KEY` (WoS) if you have the required account access/entitlement. These cannot be embedded in public HTML/JavaScript or committed to the repository.
3. Run **Actions > Sync publications, journal metrics and graphical abstracts > Run workflow** once and review its log. Subsequent runs are scheduled automatically at four six-hour intervals each day; SJR/Quartile checks are scheduled daily (source values are annual).
4. Refresh GitHub Pages after deployment (a hard refresh may be needed to clear cached JavaScript/CSS).

**Important:** Scopus API access requires Elsevier entitlements, not just possession of an API key; Web of Science Starter API also requires a registered key and has usage plans/quotas. The website cannot responsibly invent a Yes/No result without a successful provider lookup. A successful local JavaScript test is not proof of live indexing, and journal index membership is not proof that every article is indexed.

## Developer verification

`node --test tests/*.test.mjs`

The automated tests cover author highlighting rules, journal homepage DOI/journal disambiguation, permission-safe indexing status and API quota caching, stylesheet breakpoint structures, and existing data merge logic. Browser screenshot verification could not be completed in this environment due browser navigation being blocked; inspect at 390px, 768px, 1024px and a wide desktop after deploying.
