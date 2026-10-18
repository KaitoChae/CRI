# v51 — Cleaner publication layout

- Removed Scopus and WoS pills from the main publication list and Latest Work cards (they share one badge renderer). Both are also no longer checked by the scheduled GitHub workflow; Elsevier and Clarivate index API keys are unnecessary for this UI.
- Preserved SJR, Q1–Q4, JIF, citations, original journal website links and the automatic publication/SJR/JIF refresh workflow.
- Journal title is a standalone, clickable right-side column on desktop/tablet instead of falling below each paper title. For very narrow mobile screens, it stacks to avoid unreadably small text.
- A blank thumbnail placeholder is reserved for papers without graphical abstracts on desktop to align the paper titles and journal columns; hidden on narrow mobile screens.
- Publication self-author highlighting remains only on the two full variants of Chaerun Raudhatul Islam (and their genuine initials).

Publish: extract the `CRI/` folder and copy its **contents** to your repository root. Verify the website with a local or live HTTP server. The GitHub workflow must have repository write permission to commit fresh public bibliographic data.
