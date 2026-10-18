# Website v48 — automatic research metadata, author highlighting and no collisions

Publication figures, year-scoped journal rankings and the complete website from v47 remain intact.

## Automatically bold author on every paper
The author list is taken **in full** from OpenAlex for newly fetched works, not truncated after seven names. UI re-renders for publication list, search results, latest-work cards and language changes. Only the configured complete name forms (Raudhatul Islam Chaerun; Chaerun Raudhatul Islam; Ronny Winarko; R. I. Chaerun) are highlighted. Other authors sharing the surname Chaerun are *not* highlighted. If the author's name is absent, it is not silently added.

## Scopus and Web of Science document indexing
**Configure these repository Actions secrets** (Settings → Secrets and variables → Actions):

* `ELSEVIER_API_KEY` — Scopus Abstract Retrieval by exact paper DOI, documented at https://dev.elsevier.com/documentation/AbstractRetrievalAPI.wadl
* `CLARIVATE_WOS_API_KEY` — Web of Science Starter API (`db=WOS`, document DOI query), documented at https://developer.clarivate.com/apis/wos-starter

Verified records appear as clickable `Scopus` / `WoS` labels linking to the matched indexed *article*; unverified results show `Scopus n/a` / `WoS n/a`. If access is restricted, a DOI has not appeared in the index yet, or a licensed API key is absent, the script deliberately **does not infer document-level indexing from journal SJR or quartile**. The lookup is repeated on scheduled runs; successful records are cached for seven days to manage quotas. Access to either API is governed by subscription and usage limits. Never put keys into index.html, public JS files, or workflow source.

## Schedule
GitHub Actions performs publication and citation discovery every six hours, with daily attempts to obtain latest yearly SCImago export. Newly verified JIF comes from year-specific verifiable public sources where available; **official Clarivate JCR JIF cannot be guaranteed without licensed data**, and JIF may not be available for all journals. Publisher abstracts are fetched on scheduled runs if available. Failed sources keep the last dated verified values rather than generating false data. No manual republishing is needed *after* GitHub Actions is enabled and credentials are configured, so long as the API endpoints and action permissions remain functional.

## User-visible changes
* No decorative arrows remain (v45 preserved).
* SJR quartile displayed as `Q1`, `Q2`, `Q3`, or `Q4`, with SCImago colors (v47 preserved).
* Text, graphical abstracts and badges have explicit grid columns and responsive breakpoints to prevent collisions.
* All original JIF, SJR, ranking and published works data preserved.

GitHub Actions' schedule timing is approximate and may occasionally be delayed by GitHub.
