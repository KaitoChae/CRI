# Website update v47 — SCImago quartile badge colors

Based on `CRI_Website_Clean_Labels_v46.zip`.

- Q1: green (`#287d43`, white text).
- Q2: yellow (`#f3ce47`, dark text).
- Q3: orange (`#eb8d32`, dark text).
- Q4: red (`#bd3d42`, white text).
- `SJR Q n/a`: existing neutral styling (not mapped to a quartile).
- Fixed a pre-existing UI bug where `badgeClass()` received the *display string* (`SJR Q1`) instead of the normalized quartile (`Q1`). This previously returned `na` for every quartile and prevented the correct color from applying.
- Works in publication rows and latest-work cards on desktop/mobile, including freshly synced records.
- All prior v46 layout, arrow removal, JIF/SJR/Q data, links, and syncing workflows are unchanged.

SCImago source for the quartile-to-color key: https://www.scimagojr.com/journalsearch.php?q=20912&tip=sid

For GitHub Pages: upload the **contents** of `CRI/` to the repository root, including `.github`.
