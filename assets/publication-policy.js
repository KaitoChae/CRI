/* v54: publication records vs. conference-only activities.
 * Include peer-reviewed/published proceedings papers and proceedings chapters;
 * exclude bare conference sessions, abstracts and presentations without a
 * published paper. A published conference paper is a legitimate publication. */
(function(root){
  'use strict';
  const publishedProceedingsDoi='10.1007/978-3-031-67398-6_195';
  function doi(v){return String(v||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();}
  function typeOf(p={}){return String(p.crossref_type||p.type_crossref||p.publication_type_raw||p.type||'').trim().toLowerCase().replace(/[_\s]+/g,'-');}
  function isConferencePublication(p={}){
    const id=doi(p.doi),type=typeOf(p);
    // User-selected conference-only abstract/presentation, not a paper.
    if(/^research and development on preceding processing methods for contaminated water management waste at fukushima daiichi nuclear power station$/i.test(String(p.title||'').replace(/[.?!]+$/g,'').trim()))return true;
    // Published conference papers are intentionally ALLOWED, including COM 2024.
    if(id===publishedProceedingsDoi||p.publication_type==='Conference paper')return false;
    if(['proceedings-article','conference-paper','conference-article','published-conference-paper','book-chapter'].includes(type))return false;
    if(p.conference_presentation===true||p.presentation_only===true)return true;
    // A lone event, presentation, meeting abstract, or conference entry is not
    // a published proceedings paper. Do not reject articles just for an event.
    return /^(?:conference|conference-presentation|oral-presentation|poster-presentation|presentation|meeting-abstract|conference-abstract|abstract-only|meeting)$/.test(type);
  }
  function publicationType(p={}){
    const raw=typeOf(p),alt=String(p.type||'').toLowerCase();
    if(p.publication_type==='Conference paper'||raw==='proceedings-article'||raw==='conference-paper'||doi(p.doi)===publishedProceedingsDoi||p.conference_proceedings===true)return 'Conference paper';
    if(/review/.test(alt)||/review/.test(raw)||/\b(?:a\s+)?(?:comprehensive|systematic|critical|scoping|literature|narrative)?\s*review\s*$/i.test(String(p.title||'')))return 'Review article';
    if(/(?:book|chapter)/.test(raw))return /^book$/.test(raw)?'Book':'Book chapter';
    if(/preprint|posted-content/.test(raw))return 'Preprint';
    if(/^(?:journal-)?article$|research-(?:article|paper)|journal-paper|paper/.test(raw)||/journal/.test(raw))return 'Research article';
    return p.publication_type||'Publication';
  }
  root.CRI_PUBLICATION_POLICY={isConferencePublication,publicationType,doi,publishedProceedingsDoi};
})(globalThis);
