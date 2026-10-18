// Stable homepage catalogue for *known* publishers. The associated
// Crossref DOI work record supplies the actual publisher name.
// Do not substitute the journal URL for the publisher URL.
export const PUBLISHERS=[
  {name:'Elsevier',url:'https://www.elsevier.com/',test:/\belsevier\b/i},
  {name:'ACS Publications',url:'https://pubs.acs.org/',test:/\bamerican chemical society\b|^acs publications$/i},
  {name:'Springer Nature',url:'https://www.springernature.com/',test:/springer|nature portfolio|nature publishing group|biomed central|palgrave macmillan/i},
  {name:'Wiley',url:'https://www.wiley.com/',test:/\bwiley\b|john wiley/i},
  {name:'Sage',url:'https://journals.sagepub.com/',test:/\bsage\b/i},
  {name:'Taylor & Francis',url:'https://www.tandfonline.com/',test:/taylor\s*(?:&|and)\s*francis|informa uk|routledge/i},
  {name:'MDPI',url:'https://www.mdpi.com/',test:/\bmdpi\b/i},
  {name:'Royal Society of Chemistry',url:'https://pubs.rsc.org/',test:/royal society of chemistry/i},
  {name:'Oxford University Press',url:'https://academic.oup.com/',test:/oxford university press/i},
  {name:'Cambridge University Press',url:'https://www.cambridge.org/',test:/cambridge university press/i},
  {name:'Frontiers',url:'https://www.frontiersin.org/',test:/frontiers media|frontiers in/i},
  {name:'IOP Publishing',url:'https://iopscience.iop.org/',test:/iop publishing|institute of physics/i},
  {name:'AIP Publishing',url:'https://pubs.aip.org/',test:/aip publishing|american institute of physics/i},
  {name:'IEEE',url:'https://www.ieee.org/',test:/\bieee\b/i},
];
export function fromCrossrefPublisher(value){
 const text=String(value||'').trim();
 if(!text)return null;
 const entry=PUBLISHERS.find(p=>p.test.test(text));
 return {publisher:entry?.name||text,publisher_url:entry?.url||'',publisher_source:'Crossref (publisher-deposited DOI metadata)'};
}
// Explicitly known initial legacy journal homepage domains. Not a fallback for
// unknown journal names: source MUST be an actual known journal homepage.
export function legacyPublisher(journalUrl,doi){
 let host='';try{host=new URL(journalUrl).hostname.toLowerCase()}catch{}
 let known=null;
 if(host==='www.sciencedirect.com'||host==='sciencedirect.com')known=PUBLISHERS[0];
 if(host==='pubs.acs.org')known=PUBLISHERS[1];
 if(host==='link.springer.com')known=PUBLISHERS[2];
 if(host==='journals.sagepub.com')known=PUBLISHERS[4];
 if(host==='www.tandfonline.com')known=PUBLISHERS[5];
 if(host==='www.mdpi.com')known=PUBLISHERS[6];
 // Specific cross-check: an article published with SAGE that was previously
 // assigned an obsolete publisher-domain journal link during a transfer.
 if(/^10\.1177\//i.test(String(doi||''))&&host==='www.tandfonline.com')known=PUBLISHERS[4];
 return known?{publisher:known.name,publisher_url:known.url,publisher_source:'existing official journal homepage (initial)'}:null;
}
