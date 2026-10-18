/* v53 — one publication policy used by both the browser and the GitHub sync.
 * Keep journal papers, review papers and ordinary book chapters. Exclude
 * confirmed conference papers, including proceedings chapters which some
 * index providers incorrectly call generic "book-chapter" records. */
(function(root){
  'use strict';
  const excludedDois=new Set([
    // Springer Nature: Proceedings of the 63rd Conference of Metallurgists,
    // COM 2024, chapter 195. Metadata can appear as book-chapter in Crossref.
    '10.1007/978-3-031-67398-6_195'
  ]);
  const excludedTitles=new Set([
    'application of biohydrometallurgy in carbon capture utilization and storage ccus carbonate precipitation by bacillus subtilis as a biocatalyst using calcium enriched pregnant leach solutions from steel slag bioleaching'
  ]);
  function doi(v){return String(v||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();}
  function title(v){return String(v||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function typeOf(p={}){return String(p.crossref_type||p.type_crossref||p.publication_type_raw||p.type||'').trim().toLowerCase().replace(/[_\s]+/g,'-');}
  function isConferencePublication(p={}){
    if(excludedDois.has(doi(p.doi))||excludedTitles.has(title(p.title)))return true;
    if(p.conference_proceedings===true||p.is_conference===true)return true;
    const type=typeOf(p);
    if(/(?:^|-)conference(?:-|$)|(?:^|-)proceedings?(?:-|$)|^meeting-(?:abstract|paper)$/.test(type))return true;
    if(/^(?:conference|proceedings)$/i.test(String(p.source_type||'')))return true;
    const event=p.event;
    if(event && (typeof event==='string'?event.trim():event.name))return true;
    // Be conservative: a JOURNAL named Proceedings of X remains a journal.
    // A book chapter inside explicitly conference-titled proceedings is not.
    if(/(?:book|chapter)/.test(type)){
      const container=String(p.book_title||p.container_title||p.proceedings_title||p.journal||'');
      if(/(?:^|\b)proceedings\s+of\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)?\s+)?(?:international\s+|annual\s+|world\s+)?(?:conference|congress|symposium|meeting)|\bconference\s+proceedings\b|\bproceedings\s+of\s+the\s+\d+/i.test(container))return true;
    }
    return false;
  }
  function publicationType(p={}){
    if(isConferencePublication(p))return 'Conference paper';
    const raw=typeOf(p);
    const alt=String(p.type||'').trim().toLowerCase();
    if(/review/.test(alt)||/review/.test(raw)||/\b(?:a\s+)?(?:comprehensive|systematic|critical|scoping|literature|narrative)?\s*review\s*$/i.test(String(p.title||'')))return 'Review article';
    if(/(?:book|chapter)/.test(raw))return /^book$/.test(raw)?'Book':'Book chapter';
    if(/preprint|posted-content/.test(raw))return 'Preprint';
    if(/^(?:journal-)?article$|research-(?:article|paper)|journal-paper|paper/.test(raw))return 'Research article';
    if(/journal/.test(raw))return 'Research article';
    return p.publication_type||'Publication';
  }
  root.CRI_PUBLICATION_POLICY={isConferencePublication,publicationType,doi,excludedDois:[...excludedDois]};
})(globalThis);
