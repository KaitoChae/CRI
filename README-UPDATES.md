# CRI Academic Website — metric audit + automatic refresh (release v44, 17 Oct 2026)

This is the **full GitHub Pages static website**, including all images, JavaScript, and the `.github/workflows/sync-research.yml` workflow. It contains a year-scoped, source-linked SJR, SCImago Best Quartile and JIF audit, and an improved publication badge layout. The audit list is in `METRICS_SOURCE_AUDIT.md`.

## How to deploy

1. **Back up your GitHub repository.** Unzip this archive. Copy the contents of the `CRI/` folder, **including the hidden `.github/` directory**, over the files in your current repository's website root. Push/commit them to the GitHub Pages default branch. This file is a backup/replacement bundle, *not an actual GitHub deployment*.
2. In GitHub **Settings → Actions → General → Workflow permissions**, allow workflow read and write. Then open **Actions → Sync publications, journal metrics and graphical abstracts → Run workflow**. In the run log, inspect both the *Recheck explicitly dated journal Impact Factors* and *Refresh all distinct journal sources* steps. They log unavailability rather than silently claiming success.
3. Open GitHub Pages after Pages rebuilds, hard refresh the browser (`Ctrl+Shift+R`). Asset versions are now `?v=44` to avoid old browser caches. Check a number of papers, including journals whose current JIF differs from the former 2024 value.

## Which data automatically refreshes?

| Type | Schedule / logic | Reliability requirements |
|---|---|---|
| Publications, article citations, journal discovery, missing graphical abstracts | Four times a day, at 00:13/06:13/12:13/18:13 UTC | OpenAlex publisher data may lag or restrict images. Visuals only are shown as graphical abstracts when publisher metadata supports that identity. |
| Live OpenAlex journal 2-year citedness | Every 6h in GitHub Actions; once per day per visited browser/source | **Not the Clarivate Journal Impact Factor**. Never presented as JIF. Browser verifies matching journal name before merging. |
| **2025 SJR and SCImago Best Quartile** | Daily check at 03:47 UTC against year-scoped SCImago CSV export | The official export can block automated downloads; last audited values stay visible with dated source, log flags failure. **Annual** values, not per-article events. Export's inferred year must agree with requested year. |
| 2025 JIF | Source-by-source check against clearly year-dated publisher websites or identified independent bibliometric pages | **No universal free source or open API for official JCR**; cached publisher data or reports remain if unverified/blocked. Independent reports carry **JIF†** for the user to check and must not be presented as publisher-verified JIF. |

**No guaranteed always-correct automatic JIF or SJR.** They are controlled annually by Clarivate (JCR) and SCImago and depend on publication/release dates and external access. **JCR quartile and SCImago Best Quartile are different**, and both may differ from **Scopus CiteScore quartile**. The site labels the latter **SJR Q1–Q4** precisely, to avoid implying it is a JCR quartile. Source links and year-specific provenance are attached to SJR, Q and JIF badges.

Examples of *distinct* quartile families: **Mineral Processing and Extractive Metallurgy** has JCR Q1 in the IOM3 2025 report, but 2025 **SCImago Best Quartile Q3**. **ACS Sustainable Resource Management** has 2025 **SJR Best Quartile Q2**, while its 2025 **Scopus CiteScore category quartiles are Q3**. This is not a contradiction; the indicator basis/category differs. We cannot guarantee a numerical indicator for a journal without an identified supporting source. Those render `n/a` rather than invented data. The ACS publisher currently shows **Impact Factor: N/A**; therefore we intentionally **do not** assign it the 3.660 number reported on unrelated IF directories.

## Corrected 2025 annual Impact Factors

The former website labeled some **2024 Elsevier publisher-listed metrics as 2025**. The 2025 values were cross-checked against a *dated* table or publisher/institute announcement:

| Journal | 2024 (older) | 2025 (shown) | Source status |
|---|---:|---:|---|
| Applied Clay Science | 5.8 | **5.2** | Independently reported; BioxBio 2025 (2026 update) |
| Cement and Concrete Research | 13.1 | **14.0** | Independently reported; BioxBio |
| Journal of Hazardous Materials | 11.3 | **10.6** | Independently reported; BioxBio |
| Separation and Purification Technology | 9.0 | **9.1** | Independently reported; BioxBio |
| International Journal of Coal Geology | 5.7 | **7.3** | Independently reported; BioxBio |
| Mineral Processing and Extractive Metallurgy | (see IOM3) | **1.3** | Explicit 2025 announcement by professional body IOM3 |
| Sustainable Chemistry for Climate Action | (separate OpenAlex proxy 4.374) | **9.1†** | An independently reported figure, **not verified from licensed JCR**. |

The **†** means a third-party 2025 JIF report, NOT a confirmed JCR figure. The reported SCCA 9.1 should NOT be treated as guaranteed official JIF until confirmed in the user's JCR access. Beware that some websites label **Scopus 2-year citations/doc = 9.1** as an 'Impact Factor' even when this is not Clarivate JIF. This website now labels the report explicitly and links its source rather than asserting an official JIF without evidence.

## Technical details

- `assets/jcr-jif-overrides.json`: verified-by-publisher 2025 or explicitly marked independent JIF reports by canonical 8-digit ISSN, including year and source URL. Automated updater only matches **journal-specific, explicitly dated** 2025 rows on its known source list (`scripts/refresh-verified-jif.mjs`). When no matching dated source is found, previously audited value is retained and unavailable status logged.
- `assets/audited-sjr-overrides.json`: 2025 SJR and best quartile for 16 audited journals, by ISSN, journal title, year and evidence URL, used when the official SCImago export is unavailable. Unlike a fabricated auto-recalculation, these values retain their annual reporting year.
- `assets/update-journal-metrics.mjs`: official SCImago export import and independent OpenAlex journal data; rejects incomplete/wrong-year exports and mismatched source journal names. Optional `SCIMAGO_CSV_FILE=/path/to/official-2025-export.csv node assets/update-journal-metrics.mjs --scimago` for a downloaded SCImago official CSV when API disallows automated access. GitHub Actions normally tries the live download.
- `assets/app.js`, `assets/site.css`: large, single-line **[SJR] [SJR Q] [JIF]** metric group on desktop, bigger education/university/QS text, adaptive mobile layout, separate clickable source links. `JIF n/a` instead of calling OpenAlex proxy a real JIF.
- `assets/publications/`: publisher pictures and validated graphical abstract images; the existing automated image downloader is retained.

## Local validation

Requires Node.js >= 22. Run `node --test tests/*.test.mjs`; there are **17 offline tests**, including wrong-year JIF regression tests, duplicate ISSN matching, year-aligned SCImago export checks, source matching and CSS/JS layout rules. `node --check assets/app.js` checks syntax. The browser was **not visually rendered** in this environment (headless browsing access was blocked by the administrator), nor could the actual GitHub Actions fetch to third-party websites be executed here; this local passing test status is not proof of a successful live sync or deployment. Audit the live GitHub Actions logs after push.
