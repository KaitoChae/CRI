/* Publication identity, used by the GitHub scheduled sync AND the browser.
   DOI equality wins; published titles are compared after Unicode normalization
   (CO₂/CO2, dashes, punctuation, whitespace). Different real articles remain.
   The input list is never mutated. */
(function (root) {
  'use strict';
  const normDoi = v => {
    let s=String(v||'').trim().replace(/^doi\s*:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
    try { s=decodeURIComponent(s); } catch {}
    return s.toLowerCase().replace(/[?#].*$/,'').replace(/[.\s]+$/,'').trim();
  };
  const titleKey = v => String(v||'')
    .replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c))
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\b(co)\s*[-–—]?\s*(2)\b/g,'$1$2')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  function editSimilarity(a,b){
    if(a===b)return 1;
    if(Math.abs(a.length-b.length)>Math.max(a.length,b.length)*.045)return 0;
    const prev=Array.from({length:b.length+1},(_,j)=>j);
    for(let i=1;i<=a.length;i++){
      let before=prev[0];prev[0]=i;
      let rowMin=prev[0];
      for(let j=1;j<=b.length;j++){
        const previous=prev[j];
        prev[j]=Math.min(prev[j]+1,prev[j-1]+1,before+(a[i-1]===b[j-1]?0:1));
        before=previous;rowMin=Math.min(rowMin,prev[j]);
      }
      if(rowMin>Math.ceil(Math.max(a.length,b.length)*.05))return 0;
    }
    return 1-prev[b.length]/Math.max(a.length,b.length);
  }
  function isSamePublication(a={},b={}){
    const da=normDoi(a.doi),db=normDoi(b.doi);
    if(da&&db&&da===db)return true;
    const ta=titleKey(a.title),tb=titleKey(b.title);
    if(!ta||!tb||Math.min(ta.length,tb.length)<22)return false;
    const ya=Number(a.year),yb=Number(b.year);
    if(Number.isFinite(ya)&&Number.isFinite(yb)&&ya>1800&&yb>1800&&Math.abs(ya-yb)>2)return false;
    if(ta===tb)return true;
    // Only near-identical LONG titles: do not merge legitimate sequels/parts.
    if(ta.length<62||tb.length<62)return false;
    if(editSimilarity(ta,tb)<.975)return false;
    const aa=titleKey(String(a.authors||'').split(',')[0]);
    const ab=titleKey(String(b.authors||'').split(',')[0]);
    // Guard near-matches against unrelated papers with similar titles.
    return !!(aa&&ab&&(aa===ab||aa.includes(ab)||ab.includes(aa)));
  }
  function weight(p={}){
    const doi=normDoi(p.doi);
    const journal=String(p.journal||'').toLowerCase();
    const kind=String(p.publication_type||p.type||'').toLowerCase();
    const generic=/^(?:research publication|elsevier ebooks|openalex|publication|unknown)$/.test(journal);
    let score=(doi?12:0)+(journal&&!generic?5:0)+(p.publisher?2:0)+(p.journal_url?2:0)+
      (p.graphical_abstract?5:0)+(p.graphical_abstract_kind==='graphical_abstract'?3:0)+
      (p.title_translations&&Object.keys(p.title_translations).length?2:0)+
      (p.authors?2:0)+(p.details?1:0)+(p.publication_date?1:0);
    if(/preprint|posted.content/.test(kind))score-=12;
    if(/research article|review article|conference paper|journal.article|proceedings.article/.test(kind))score+=5;
    return score;
  }
  const missing=v=>v===null||v===undefined||v===''||(Array.isArray(v)&&v.length===0);
  function unify(a,b){
    const lead=weight(a)>=weight(b)?a:b,other=lead===a?b:a;
    const merged={...lead};
    for(const [k,v] of Object.entries(other)){
      if(missing(merged[k])&&!missing(v))merged[k]=v;
    }
    const aC=Number(a.citations),bC=Number(b.citations);
    if(Number.isFinite(aC)||Number.isFinite(bC))merged.citations=Math.max(0,Number.isFinite(aC)?aC:0,Number.isFinite(bC)?bC:0);
    merged.title_translations={...(other.title_translations||{}),...(lead.title_translations||{})};
    // Retain a validated journal over a generic OpenAlex eBook source.
    if(/^(?:elsevier ebooks|research publication|unknown)$/i.test(String(merged.journal||''))
      &&other.journal&&!/^(?:elsevier ebooks|research publication|unknown)$/i.test(other.journal))merged.journal=other.journal;
    // Do not inherit an unrelated publisher URL or metric from a DIFFERENT DOI.
    // Same-title publication variants are treated as one work, but source URLs
    // and JIF/SJR must remain attached to the chosen journal ISSN.
    return merged;
  }
  function deduplicatePublications(list=[]){
    const unique=[];
    for(const record of list){
      if(!record||typeof record!=='object'||!record.title)continue;
      const i=unique.findIndex(other=>isSamePublication(record,other));
      if(i<0)unique.push({...record});
      else unique[i]=unify(unique[i],record);
    }
    return unique;
  }
  root.CRI_PUBLICATION_DEDUPE={normalizeDoi:normDoi,canonicalTitle:titleKey,isSamePublication,deduplicatePublications};
})(globalThis);
