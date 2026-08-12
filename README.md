# Chaerun Raudhatul Islam — Personal Academic Website

This package is ready for GitHub Pages. Upload every item in this folder directly to the root of the repository. Keep the `assets` and `.github` folders unchanged. No installation or build command is required.

The website uses a compact one-time hero sequence: hazardous atoms enter a disordered Si–O–Al network, the same network is shown locked inside a concrete waste form at a larger scale, the concrete moves to underground disposal, and the sequence resolves into the CRI logo. It also includes publication graphical abstracts, the official JAEA affiliation, the author's ORCID profile, responsive layouts, and 12 languages.

On a visitor's first visit, the website selects a language from the visitor's country when the country lookup is available. The browser language is the fallback. A language chosen manually is saved on that device and always takes priority. English, Indonesian, Japanese, Simplified Chinese, Traditional Chinese, Korean, German, French, Spanish, Italian, Portuguese, and Turkish are included.

## GitHub Pages

1. Open the repository on GitHub.
2. Upload all files and keep the same structure.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.

The publication list checks OpenAlex through the author's ORCID whenever the page loads, refreshing citations and the open two-year impact metric. A weekly GitHub workflow refreshes SCImago SJR and quartile data in `journal-metrics.js`. The last verified values stay available if an external service temporarily blocks a request. If OpenAlex cannot be reached, the 18-work curated snapshot in `publications.js` remains visible. Google Scholar, Researchmap, DOI, and JAEA profile links are included as references.
