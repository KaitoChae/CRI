# v53 — No conference publications, automatic research categories

This bundle is built from v52 and retains the separated clickable journal + publisher elements, larger responsive font sizing, SCImago colors, citation badges, the owner's correctly bolded name, and journal metric checks.

## Removed and blocked from returning

The known conference work *Application of Biohydrometallurgy in Carbon Capture, Utilization, and Storage (CCUS): Carbonate Precipitation by Bacillus subtilis ...* (DOI `10.1007/978-3-031-67398-6_195`) was removed from the shipped `assets/publications.js`. Springer Nature identifies it as a chapter in the *Proceedings of the 63rd Conference of Metallurgists, COM 2024* (a conference collection): https://link.springer.com/book/10.1007/978-3-031-67398-6

The embedded data now has **17** records, down from 18; other publications discovered by the scheduled OpenAlex update may be added later. Counts and indices are calculated on the included items only.

## What remains visible

- **Research article**, **Review article**, **Book chapter**, **Book**, **Preprint** (when such records exist): shows a quiet type badge for each paper and a label on the Latest Work card. Publisher details and links remain in their separate right-side block.
- No conferences, conference abstracts, conference proceedings articles, or book chapters **identified as conference proceedings**. Legitimate non-conference book chapters are intentionally retained.
- A journal beginning with the word *Proceedings* is NOT automatically hidden just because of its name; the work must be indexed as a conference publication or the chapter must belong to documented conference proceedings.

## How ongoing updates enforce the exclusion

`assets/publication-policy.js` is a shared exclusion/type policy loaded by the static browser and the Node.js sync scripts. Both `scripts/sync-publications.mjs` and the live browser OpenAlex refresh use it, so the removed DOI is blocked even if its type is mistakenly tagged `book-chapter` by a bibliographic database.

The GitHub workflow continues running every six hours. `scripts/update-publishers.mjs` checks the exact DOI in Crossref and also reads the registered document type, container/book title and conference event details; identified conference works are removed, and statistics are recalculated. Other papers remain available even if a DOI cannot be resolved or Crossref is temporarily unavailable. The user-facing paper type is based on indexed metadata and, for explicit reviews, an unambiguous review title. As with all automated classification, metadata omissions can prevent confident identification of some newly added works; unknown items may require manual confirmation rather than arbitrary deletion.

**Deployment:** Upload the *contents* of the `CRI/` directory, including hidden `.github`, to the GitHub Pages repository root. Enable Actions' contents-write permission and run the workflow. Do a hard reload after Pages deployment. No actual GitHub deployment was performed as part of preparing this ZIP.

**Testing:** Run `node --test tests/*.test.mjs` (offline automated assertions); browser screenshot verification and live external API fetching could not be completed here because navigation/network access were blocked by the environment.
