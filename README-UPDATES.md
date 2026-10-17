# CRI website — automatic publication and metrics updates

This is a **static HTML website** (works on GitHub Pages). There is no `/api/journal-metrics` server route. The provided GitHub Actions workflow replaces that broken route and republishes verified information into the existing JavaScript data files.

## What runs automatically

- **00:13, 06:13, 12:13 and 18:13 UTC (every day):** `scripts/sync-publications.mjs` syncs new and existing publications using the linked ORCID/OpenAlex author, and `assets/update-journal-metrics.mjs` refreshes OpenAlex *journal-specific* 2-year citedness for each distinct journal. `scripts/update-publication-visuals.mjs` looks for publisher-hosted graphical abstracts, including papers marked open access. Citation counts, source ISSN and newly discovered journals are refreshed. Locally curated abstracts and translated titles are retained.
- **03:47 UTC (daily):** as above, plus a new attempt to download and parse the latest **SCImago** journal ranking CSV. SJR and its best quartile are **annual journal-level metrics**, not values that change after each new paper.
- **On each page visit:** OpenAlex is also queried from the browser for newly indexed works and changes in journal 2-year mean citedness (the browser caches successful source queries for 24 hours). The embedded snapshot remains readable without internet. GitHub Actions automatically commits updated public data to the repository for all visitors.

**Deploy:** Unzip the project (without any prior `.git` folder), overwrite your website's files in the *existing* GitHub repo, including `.github/workflows/sync-research.yml`, and push to the default branch. Under GitHub **Settings → Actions → General → Workflow permissions**, allow *Read and write permissions* for workflows if not already enabled. On GitHub → Actions → **Sync publications, journal metrics and graphical abstracts**, enable the workflow if GitHub prompts you and click **Run workflow** once to test. GitHub scheduled workflows can be delayed; they only run automatically while the repository/workflow is active. Review Actions logs if an upstream API is temporarily blocked or rate-limited.

## SJR, impact factor and JIF are not interchangeable

- **SJR** and **Q1–Q4** are from the SCImago ranking export by ISSN, with ranking year shown in each badge tooltip when available. Download blocking by SCImago preserves prior values instead of inventing new scores. Newly indexed journals may be unrated.
- **IF\*** on this site is **OpenAlex two-year mean citedness**. This is an IF-style open bibliometric approximation, **not** the Clarivate Journal Citation Reports (JCR) official Journal Impact Factor (JIF). OpenAlex source indicators usually refresh sooner than annual SJR; the source/year is shown on hover.
- **JIF** values require an independently verified journal/publisher or licensed JCR source. This release includes **Sustainable Chemistry for Climate Action: JIF 9.1 for 2025**, as shown on Elsevier's ScienceDirect page, verified 17 Oct 2026: https://www.sciencedirect.com/browse/calls-for-papers?subject=chemistry. ISSN 2772-8269. Earlier **4.374** values are the different, OpenAlex-derived **IF*** and must not be called the official JIF.
- Edit `assets/jcr-jif-overrides.json` to add official JIFs **only with a year, journal name, identifiable publisher source, and full source URL**. Example:

```json
{
  "27728269": {"jif": 9.1, "year": 2025,
    "journal": "Sustainable Chemistry for Climate Action",
    "source": "Elsevier / ScienceDirect — publisher-listed Journal Impact Factor",
    "source_url": "https://www.sciencedirect.com/browse/calls-for-papers?subject=chemistry"}
}
```

The publication list prefers a verified JIF over *any* stale OpenAlex number, including article-specific records. The rank/value badge links to the source when a URL exists; rankings and publisher indicators are not interchangeable. A **new journal** gets a refreshed OpenAlex IF* automatically, but **JIF cannot be fetched as a verified official value for every journal without a suitable reliable publisher/JCR source**. This system therefore never labels an unverified estimate 'JIF'. Annual SCImago data may also lag behind newly indexed journals.

## Graphical abstract images

The update script checks the publisher page and, where supplied, the open-access landing page. It recognizes dedicated publisher GA metadata, visually-labeled graphical abstract images, and Elsevier `ga1` image assets where it can extract an article identifier. If an image can be downloaded and validated, the workflow saves it under `assets/publications/` and displays it as a **Graphical abstract**. Otherwise it may use a publisher preview image, **clearly distinguished** from an actual GA. OA status alone does **not** guarantee a graphical abstract is published or that publisher access rules permit image download.

If a known GA is not discoverable automatically, use `assets/publication-visual-overrides.json` to supply its **verified, publisher-authorized URL** (or a local `assets/...` path). Example:

```json
{
  "10.1000/example": {"url": "https://publisher.example.org/graphical-abstract.jpg", "kind": "graphical_abstract"}
}
```

Committed visual overrides persist across OpenAlex syncs. Images that publishers restrict or don't expose cannot be automatically fetched or fabricated.

## Profile education

Degrees are displayed in the **About Me** section, with university emblems referenced from the universities' websites. The current **QS World University Rankings 2027** are placed next to each degree: Taiwan Tech **=379** and Hokkaido University **=179** (a shared/tied rank in both cases). QS source links appear beside each badge: https://www.topuniversities.com/universities/national-taiwan-university-science-technology-taiwan-tech and https://www.topuniversities.com/universities/hokkaido-university . These are university ranking-year 2027 values, not rankings at graduation. The information below interprets the request as **B.Sc. 2018 at Taiwan Tech, M.Eng. 2020 at Hokkaido University, and Ph.D. 2024 at Hokkaido University**. Confirm the years before publication if different. Because the universities host the original emblems, the image display depends on their sites permitting image linking. No unofficial emblem was fabricated.

## Local checks

Requirements: Node.js 22. Run `node --test tests/*.test.mjs` to validate the data merge, SCImago parsing, JIF source checks, university rankings and image metadata rules. Live sync requires network access and is intentionally not asserted by offline unit tests. You can manually run:

```
node scripts/sync-publications.mjs
node assets/update-journal-metrics.mjs --scimago
node scripts/update-publication-visuals.mjs
```
