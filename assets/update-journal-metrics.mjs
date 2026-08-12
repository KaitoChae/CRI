import fs from "node:fs/promises";
import vm from "node:vm";

const OPENALEX_AUTHOR = "https://api.openalex.org/authors/https://orcid.org/0000-0002-1532-7343";
const SCIMAGO_EXPORT = "https://www.scimagojr.com/journalrank.php?out=xls";
const OUTPUT = "journal-metrics.js";

function normalizeIssn(value = "") {
  const compact = String(value).toUpperCase().replace(/[^0-9X]/g, "");
  return compact.length === 8 ? compact : "";
}

function journalKey(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function csvRows(text) {
  const parsed = parseDelimited(text.replace(/^\uFEFF/, ""));
  const headers = parsed.shift()?.map((header) => header.trim()) ?? [];
  return parsed.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function firstValue(row, candidates) {
  const key = Object.keys(row).find((header) =>
    candidates.includes(header.trim().toLowerCase()),
  );
  return key ? row[key] : "";
}

function numberValue(value = "") {
  const numeric = Number.parseFloat(String(value).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "CRI academic website metrics updater" },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function requestedIssns() {
  const author = await fetchJson(OPENALEX_AUTHOR);
  const worksUrl = `https://api.openalex.org/works?filter=author.id:${encodeURIComponent(author.id)}&per-page=200`;
  const works = (await fetchJson(worksUrl)).results ?? [];
  return new Set(
    works.flatMap((work) => {
      const source = work.primary_location?.source ?? work.host_venue ?? {};
      return [source.issn_l, ...(source.issn ?? [])].map(normalizeIssn).filter(Boolean);
    }),
  );
}

async function existingSnapshot() {
  try {
    const source = await fs.readFile(OUTPUT, "utf8");
    const context = { window: {} };
    vm.runInNewContext(source, context);
    return context.window.CRI_JOURNAL_METRICS ?? {};
  } catch {
    return {};
  }
}

const requested = await requestedIssns();
const response = await fetch(SCIMAGO_EXPORT, {
  headers: {
    Accept: "text/csv,text/plain,application/vnd.ms-excel;q=0.9,*/*;q=0.8",
    "User-Agent": "CRI academic website metrics updater",
  },
});
if (!response.ok) throw new Error(`SCImago returned ${response.status}`);

const existing = await existingSnapshot();
const byIssn = { ...(existing.by_issn ?? {}) };
const byJournal = { ...(existing.by_journal ?? {}) };
const metricYear = new Date().getUTCFullYear() - 1;
let matched = 0;

for (const row of csvRows(await response.text())) {
  const rowIssns = firstValue(row, ["issn"])
    .split(/[,;\s]+/)
    .map(normalizeIssn)
    .filter(Boolean);
  const matches = rowIssns.filter((issn) => requested.has(issn));
  if (!matches.length) continue;
  const sjr = numberValue(firstValue(row, ["sjr"]));
  const quartile = firstValue(row, ["sjr best quartile", "best quartile"]).trim().toUpperCase();
  if (sjr === null || !/^Q[1-4]$/.test(quartile)) continue;
  const journalTitle = firstValue(row, ["title"]);
  const metric = {
    sjr,
    quartile,
    sjr_year: metricYear,
    sjr_source: "SCImago Journal & Country Rank",
  };
  for (const issn of matches) byIssn[issn] = metric;
  if (journalTitle) byJournal[journalKey(journalTitle)] = metric;
  matched += 1;
}

if (!matched) throw new Error("SCImago download contained no matching journals; keeping the previous snapshot.");

const snapshot = {
  updated_at: new Date().toISOString(),
  metric_year: metricYear,
  source: "SCImago Journal & Country Rank (Scopus data)",
  by_issn: byIssn,
  by_journal: byJournal,
  by_doi: existing.by_doi ?? {},
};
await fs.writeFile(OUTPUT, `window.CRI_JOURNAL_METRICS=${JSON.stringify(snapshot, null, 2)};\n`);
