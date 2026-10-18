# CRI website v54 — Published proceedings restored; publisher/graphics metadata improvements

## Publication policy
- COM 2024, DOI `10.1007/978-3-031-67398-6_195`, has been **restored** as a **Conference paper** published in Springer Nature's *Proceedings of the 63rd Conference of Metallurgists, COM 2024*.
- **Published conference papers and proceedings chapters remain visible**. Only conference-only records (presentations, posters, standalone meeting abstracts), including the specified 2021 Fukushima Daiichi conference-only entry, are excluded.
- The policy is shared between browser and GitHub sync in `assets/publication-policy.js`. Rechecked metadata never filters COM 2024 solely because it is inside published conference proceedings.

## Journal, book series, publisher
- Site includes curated bibliographic sources for the 2026 graphene review, COM 2024, a 2022 J-STAGE review, plus the 2026 *Handbook of Environmental Chemistry* and Elsevier eBooks chapters seen in the user's screenshots. Sources include J-GLOBAL, Springer Nature, Elsevier, and CiNii/J-STAGE. Unresolved DOI/source-homepage links are not fabricated.
- The graphene review `10.1016/j.scca.2026.100242` has verified journal name, publisher link and journal-homepage link.
- Crossref's DOI-deposited publisher and container/book-title metadata is fetched both in scheduled GitHub Actions and, for newly found entries with DOI, in the browser. For generic "Elsevier eBooks" records, the verified `container-title` replaces the vague source label.
- Journal/series link is a separate element from publisher link. An official homepage is linked when confidently known; no misleading homepages are guessed. Incomplete records remain visible and are rechecked.

## Graphical abstracts and publisher previews
- `scripts/update-publication-visuals.mjs` tries multiple publisher landing pages, known Elsevier article PII image assets, actual labelled GA metadata and publisher previews, downloading **only an image that returns valid raster bytes**. It distinguishes a real graphical abstract from a publisher preview.
- **Open access does not guarantee a graphical abstract exists**. A missing official GA cannot be manufactured. A journal cover/logo does not count as an article GA. If none can be verified, the article is displayed cleanly without a thumbnail.
- This environment did not have access to resolve the live image download CDN; therefore there is **no claim that all missing GAs have been downloaded**. The GitHub Actions workflow attempts again every six hours (subject to rate limits and publisher availability).

## Deployment
1. Unzip. Upload **contents of `CRI/`** to your site repository root, including hidden `.github/`.
2. GitHub Actions > `Sync publications, journal metrics and graphical abstracts` > Run workflow.
3. Confirm `contents: write` permission and workflow run/commit. Verify new images under `assets/publications/`.
4. Reload browser with cache refresh. A static local `file:///` preview cannot persist GitHub Actions updates by itself.

## Tests and limitations
- `node --test tests/*.test.mjs` passes all 62 local tests at build time.
- Exact publisher GA availability, upstream Crossref/OpenAlex data quality, and scheduled GitHub runs **must still be verified after deployment**. API/live network access was unavailable to the build container.
- The file `README_v53_PUBLICATIONS_FILTER.md` is historical; this v54 document supersedes its older conference-exclusion policy.
