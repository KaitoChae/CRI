import fs from "node:fs/promises";
import vm from "node:vm";

const SCIMAGO_EXPORT_URL="https://www.scimagojr.com/journalrank.php?out=xls";
const PUBLICATIONS_FILE="assets/publications.js";
const OUTPUT_FILE="assets/journal-metrics.js";

function normalizeIssn(value=""){
  const compact=String(value).toUpperCase().replace(/[^0-9X]/g,"");
  return compact.length===8?compact:"";
}
function journalKey(value=""){
  return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
}
function numberValue(value=""){
  const number=Number.parseFloat(String(value).trim().replace(/\s/g,"").replace(",","."));
  return Number.isFinite(number)?number:null;
}
function parseDelimited(text,delimiter=";"){
  const rows=[];let row=[],field="",quoted=false;
  for(let index=0;index<text.length;index+=1){
    const character=text[index];
    if(character==='"'){
      if(quoted&&text[index+1]==='"'){field+='"';index+=1}else quoted=!quoted;
    }else if(character===delimiter&&!quoted){row.push(field.trim());field=""}
    else if((character==="\n"||character==="\r")&&!quoted){
      if(character==="\r"&&text[index+1]==="\n")index+=1;
      row.push(field.trim());field="";if(row.some(Boolean))rows.push(row);row=[];
    }else field+=character;
  }
  if(field||row.length){row.push(field.trim());if(row.some(Boolean))rows.push(row)}
  return rows;
}
function csvObjects(text){
  const rows=parseDelimited(text.replace(/^\uFEFF/,""));
  const headers=(rows.shift()||[]).map(value=>value.trim());
  return rows.map(cells=>Object.fromEntries(headers.map((header,index)=>[header,cells[index]||""])));
}
function field(row,names){
  const key=Object.keys(row).find(value=>names.includes(value.trim().toLowerCase()));
  return key?row[key]:"";
}
async function readWindowAssignment(path,property){
  const source=await fs.readFile(path,"utf8");const context={window:{}};
  vm.runInNewContext(source,context,{filename:path});return context.window[property]||{};
}
async function fetchJson(url){
  const response=await fetch(url,{headers:{Accept:"application/json","User-Agent":"CRI-academic-website-metrics/1.0"}});
  if(!response.ok)throw new Error(`${response.status} from ${url}`);return response.json();
}
async function loadScimago(){
  const response=await fetch(SCIMAGO_EXPORT_URL,{headers:{Accept:"text/csv,text/plain,*/*","User-Agent":"Mozilla/5.0 CRI academic website updater"}});
  if(!response.ok)throw new Error(`SCImago returned ${response.status}`);
  const rows=csvObjects(await response.text());const map={};
  for(const row of rows){
    const sjr=numberValue(field(row,["sjr"]));const quartile=field(row,["sjr best quartile","best quartile"]).trim().toUpperCase();
    const title=field(row,["title"]);const issns=field(row,["issn"]).split(/[,;\s]+/).map(normalizeIssn).filter(Boolean);
    for(const issn of issns)map[issn]={...(sjr!==null?{sjr}:{}),...(quartile?{quartile}:{}),sjr_year:new Date().getUTCFullYear()-1,sjr_source:"SCImago Journal & Country Rank (Scopus data)",journal_title:title};
  }
  return map;
}

const publicationData=await readWindowAssignment(PUBLICATIONS_FILE,"LAB_PUBLICATION_DATA");
let existing={updated_at:null,by_issn:{},by_journal:{},by_doi:{}};
try{existing=await readWindowAssignment(OUTPUT_FILE,"CRI_JOURNAL_METRICS")}catch{}
let scimago={};try{scimago=await loadScimago()}catch(error){console.warn(error.message)}
const next={updated_at:new Date().toISOString(),by_issn:{...(existing.by_issn||{})},by_journal:{...(existing.by_journal||{})},by_doi:{...(existing.by_doi||{})}};

for(const publication of publicationData.publications||[]){
  const doi=String(publication.doi||"").toLowerCase();if(!doi)continue;
  try{
    const work=await fetchJson(`https://api.openalex.org/works/https://doi.org/${doi}`);
    const sourceSummary=work?.primary_location?.source||{};const issn=normalizeIssn(sourceSummary.issn_l||sourceSummary.issn?.[0]||"");
    let source={};if(sourceSummary.id)source=await fetchJson(sourceSummary.id.replace("https://openalex.org/","https://api.openalex.org/sources/"));
    const impact=Number(source?.summary_stats?.["2yr_mean_citedness"]);
    const metric={...(scimago[issn]||{}),...(Number.isFinite(impact)?{impact_factor:Number(impact.toFixed(3)),impact_factor_year:new Date().getUTCFullYear()-1,impact_factor_source:"OpenAlex 2-year mean citedness",impact_factor_kind:"openalex"}:{}),citations:Number(work?.cited_by_count||0),issn};
    if(issn)next.by_issn[issn]={...(next.by_issn[issn]||{}),...metric};
    next.by_journal[journalKey(publication.journal)]={...(next.by_journal[journalKey(publication.journal)]||{}),...metric};
    next.by_doi[doi]={...(next.by_doi[doi]||{}),...metric};
  }catch(error){console.warn(`${doi}: ${error.message}`)}
  await new Promise(resolve=>setTimeout(resolve,120));
}

await fs.writeFile(OUTPUT_FILE,`window.CRI_JOURNAL_METRICS=${JSON.stringify(next,null,2)};\n`);
