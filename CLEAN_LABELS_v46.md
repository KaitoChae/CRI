# UI cleanup v46

Based on `CRI_Website_All_Arrows_Removed_v45.zip`.

- Removed the small paragraph below education reading "QS World University Rankings 2027 · Click a ranking to check QS" in every language. The three QS 2027 ranking badges and their source links remain.
- Removed the dagger symbol appended to JIF labels everywhere they are generated, retaining the number, year, and source/provenance link. Third-party provenance information remains in the link tooltip and source records; hiding the symbol does not independently verify JIF values.
- Removed both journal-metric explanatory paragraphs and the JavaScript code that dynamically generated one of them, so they will not reappear on refresh. The SJR/Q/JIF badges and annual-metric update code remain untouched.
- Removed the "personal academic website" footer description in all languages, leaving the researcher name. Updated the English SEO description accordingly.
- Kept the v45 arrow-free interface, publication listing and data files, image assets and GitHub Actions.

For GitHub Pages: upload the contents of the `CRI/` directory, including hidden `.github` workflows, into the website repo.
