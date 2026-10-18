# v52 — Journal + publisher, clean layout

Website changes
- Journal remains in an independent right-hand column for desktop and tablet, with all underline/border-bottom decorations removed. Hover/focus only changes text color; journal remains a normal clickable external link.
- Publisher appears **separately below** the journal in a subtle box with its own clickable link to the **publisher organisation**, not the paper or the journal. Example: Elsevier / ACS Publications / Springer Nature / Sage / MDPI.
- Latest Work cards also show the publisher in a separated box under the journal.
- Responsive layout stacks the publisher under the journal on mobile to prevent collisions.
- Search now matches publisher names as well as journals, authors, titles.
- Retains existing journal metrics, quartile colors, bold author logic, previous no-arrow UI and GitHub publication refresh schedules.

Publisher data update
- Initial publisher names are included for all 18 existing curated papers using known journal domains / DOI publishing groups, with a correction for the journal transfer of Mineral Processing and Extractive Metallurgy to Sage.
- The existing GitHub Actions workflow runs `node scripts/update-publishers.mjs` after the publication sync. It fetches Crossref public `/works/{doi}` metadata, verifies the **exact DOI**, resolves recognised publisher organisations to their **official company publishing homepages**, and caches verified records for 90 days (new DOI records are checked immediately).
- If a publisher is not yet verified, the website does not invent a name or link. A Crossref name without a known company URL may appear as non-clickable text until the publisher homepage is mapped. A temporary API error does not delete verified publisher information.
- Some DOIs may not resolve through Crossref (e.g. registered via another DOI registration agency), so not every publication can be guaranteed to update automatically.
- This ZIP was statically checked with Node tests. The browser-based visual run was blocked by the current execution environment; verify on deployed GitHub Pages at mobile/tablet widths after upload.

Deploy
Copy the **contents** of `CRI/` to the GitHub Pages repository root. Ensure Actions has `contents: write` permission; enable the scheduled workflow in GitHub Actions. No Crossref API key required.
