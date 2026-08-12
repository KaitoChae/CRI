(() => {
  const intro = document.querySelector("#intro");
  const closeIntro = () => intro?.classList.add("gone");
  document.querySelector("#skipIntro")?.addEventListener("click", closeIntro);
  window.setTimeout(closeIntro, 5600);

  const profileUrl = "https://scholar.google.com/citations?user=do1Jx1wAAAAJ&hl=en";
  const list = document.querySelector("#publicationList");
  const status = document.querySelector("#publicationStatus");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);

  const safeLink = (value) => {
    try {
      const url = new URL(value || profileUrl);
      return ["http:", "https:"].includes(url.protocol) ? url.href : profileUrl;
    } catch {
      return profileUrl;
    }
  };

  async function updatePublications() {
    try {
      const authorResponse = await fetch("https://api.openalex.org/authors?search=Chaerun%20Raudhatul%20Islam&per-page=5");
      if (!authorResponse.ok) throw new Error("Author request failed");
      const authors = await authorResponse.json();
      const author = authors.results?.find((item) => /chaerun.*raudhatul.*islam/i.test(item.display_name)) || authors.results?.[0];
      if (!author?.id) return;

      const worksResponse = await fetch(`https://api.openalex.org/works?filter=author.id:${encodeURIComponent(author.id)}&sort=publication_date:desc&per-page=25`);
      if (!worksResponse.ok) throw new Error("Publication request failed");
      const works = (await worksResponse.json()).results?.filter((work) => work.title);
      if (!works?.length || !list || !status) return;

      list.innerHTML = works.map((work, index) => {
        const journal = work.primary_location?.source?.display_name || "Research publication";
        const href = safeLink(work.doi || work.primary_location?.landing_page_url);
        return `<a class="paper" href="${escapeHtml(href)}" target="_blank" rel="noopener"><span>${String(index + 1).padStart(2, "0")}</span><div><small>${escapeHtml(work.publication_year)} · ${escapeHtml(journal)}</small><h3>${escapeHtml(work.title)}</h3></div><b>↗</b></a>`;
      }).join("");
      status.textContent = "02 — Latest publications · automatically updated via OpenAlex";
    } catch {
      // The curated publications in index.html remain visible if the API is unavailable.
    }
  }

  updatePublications();
})();
