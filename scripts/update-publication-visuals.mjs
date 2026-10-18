// Retrieves publisher-provided graphical abstracts; if unavailable, a verified
// publisher preview image. Open access does not itself imply a GA exists.
import fs from 'node:fs/promises';
import path from 'node:path';
import {PUBLICATIONS_FILE,normalizeDoi,readData,writeData,request} from './common.mjs';

const OVERRIDES='assets/publication-visual-overrides.json';
const IMAGE_DIR='assets/publications';
const IMAGE_LIMIT=7*1024*1024;
const avoidImage=/(?:favicon|\/logo|default[-_]image|banner|profile|avatar|journal[-_]cover|placeholder|1x1|tracking|pixel)/i;
export function metaImages(html,base){
  const list=[];
  const normalize=(s,kind)=>{
    if(!s||s.startsWith('data:'))return;
    try{const url=new URL(s.replaceAll('&amp;','&'),base);
      if(url.protocol==='https:'&&!avoidImage.test(url.pathname)&&!list.some(x=>x.url===url.href))list.push({url:url.href,kind});
    }catch{}
  };
  // Supports meta attributes regardless of ordering or quote styles.
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const attrs={};
    for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:(["'])(.*?)\2|([^\s>]+))/g))attrs[m[1].toLowerCase()]=(m[3]||m[4]||'').trim();
    const prop=(attrs.name||attrs.property||attrs.itemprop||'').toLowerCase();
    if(/graphical.?abstract/.test(prop))normalize(attrs.content,'graphical_abstract');
    else if(['og:image','og:image:url','twitter:image','citation_image'].includes(prop))normalize(attrs.content,'publisher_preview');
  }
  // Various publisher pages expose the GA through asset URL in full-text markup.
  const urlRegex=/(?:https?:\/\/[^\s"'<>]+|\/[^\s"'<>]+)(?:graphical[_-]?abstract|\bga1\b)[^\s"'<>]*?\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/ig;
  for(const match of html.matchAll(urlRegex))normalize(match[0],'graphical_abstract');
  for(const img of html.match(/<(?:img|source)\b[^>]*>/gi)||[]){
    if(!/(graphical[-_ ]?abstract|graphicalabstract|\bga[-_]?[0-9]\b)/i.test(img))continue;
    const src=img.match(/\b(?:data-src|data-original|src)=['"]([^'"]+)['"]/i)?.[1]
      ||img.match(/\b(?:data-srcset|srcset)=['"]([^'",\s]+)/i)?.[1];
    normalize(src,'graphical_abstract');
  }
  // Some publisher templates put a GA figure inside a labelled figure tag.
  for(const figure of html.match(/<figure\b[^>]*graphical[-_\s]?abstract[^>]*>[\s\S]{0,6000}?<\/figure>/gi)||[]){
    const tag=figure.match(/<img\b[^>]*>/i)?.[0]||'';
    const src=tag.match(/\b(?:data-src|data-original|src)=['"]([^'"]+)['"]/i)?.[1];
    normalize(src,'graphical_abstract');
  }
  return [...list.filter(x=>x.kind==='graphical_abstract'),...list.filter(x=>x.kind!=='graphical_abstract')];
}
async function saveImage(url,doi){
  const response=await request(url,{timeout:16000,attempts:1,headers:{Accept:'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*'}});
  if(Number(response.headers.get('content-length')||0)>IMAGE_LIMIT)throw new Error('image too large');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<1000||bytes.length>IMAGE_LIMIT)throw new Error('invalid image size');
  let ext='';
  if(bytes.subarray(0,3).toString('hex')==='ffd8ff')ext='jpg';
  else if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')ext='png';
  else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')ext='webp';
  else if(bytes.subarray(0,3).toString()==='GIF')ext='gif';
  if(!ext)throw new Error('not a supported raster image');
  const slug=doi.replace(/[^a-z0-9]+/ig,'-').slice(0,95)||'untitled';
  const filename=`${IMAGE_DIR}/publisher-${slug}.${ext}`;
  await fs.mkdir(IMAGE_DIR,{recursive:true});await fs.writeFile(filename,bytes);
  return filename;
}
async function candidatesFor(pub){
  const pages=[pub.publisher_landing_url,pub.url,pub.oa_url,pub.doi?`https://doi.org/${normalizeDoi(pub.doi)}`:null].filter(Boolean);
  const seen=new Set();let results=[];
  // Elsevier identifiers from a verified publisher article URL or metadata.
  // This is only a CANDIDATE: saveImage verifies actual raster bytes/response.
  const matchPii=String(pub.pii||pub.publisher_landing_url||'').match(/S\d{15,17}/i);
  if(matchPii&&/^10\.1016\//.test(normalizeDoi(pub.doi)))results.push({url:`https://ars.els-cdn.com/content/image/1-s2.0-${matchPii[0]}-ga1.jpg`,kind:'graphical_abstract'});
  for(const page of pages){
    if(seen.has(page))continue;seen.add(page);
    try{
      const response=await request(page,{attempts:1,timeout:14000,headers:{Accept:'text/html'}});
      if(!/html/i.test(response.headers.get('content-type')||''))continue;
      const html=(await response.text()).slice(0,2_500_000);
      results.push(...metaImages(html,response.url));
      // Elsevier's graphical abstracts frequently live on its static image CDN.
      // Only probe if an article PII is actually present in publisher markup;
      // verify that the URL returns raster bytes before displaying it.
      const pii=html.match(/(?:citation_pii|\bpii\b)[^\n]{0,180}?(S\d{15,17})/i)?.[1]
        ||html.match(/1-s2\.0-(S\d{15,17})/i)?.[1];
      if(pii&&/(?:elsevier|sciencedirect|els-cdn)/i.test(response.url)){
        results.unshift({url:`https://ars.els-cdn.com/content/image/1-s2.0-${pii}-ga1.jpg`,kind:'graphical_abstract'});
      }
      // Do not stop on the first *candidate*: it may return 404 when saved.
    }catch(error){console.warn('Publisher page unavailable:',normalizeDoi(pub.doi),error.message)}
  }
  return [...new Map([...results.filter(x=>x.kind==='graphical_abstract'),...results.filter(x=>x.kind!=='graphical_abstract')].map(x=>[x.url,x])).values()];
}
async function main(){
  const data=await readData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA');
  let overrides={};try{overrides=JSON.parse(await fs.readFile(OVERRIDES,'utf8'))}catch{}
  let found=0;
  for(const pub of data.publications||[]){
    const doi=normalizeDoi(pub.doi);if(!doi)continue;
    const custom=overrides[doi];
    // Existing curated graphical abstracts always take priority.
    if(pub.graphical_abstract&&pub.graphical_abstract_kind==='graphical_abstract'&&!custom)continue;
    const currentIsPreview=pub.graphical_abstract_kind==='publisher_preview';
    const overrideSrc=typeof custom==='string'?custom:custom?.url;
    const priority=overrideSrc?[{url:overrideSrc,kind:custom.kind||'graphical_abstract'}]:await candidatesFor(pub);
    for(const item of priority){
      if(currentIsPreview&&item.kind!=='graphical_abstract'&&!custom)continue;
      if(!custom&&!/^https:\/\//i.test(item.url))continue;
      try{
        const image=item.url.startsWith('assets/')?item.url:await saveImage(item.url,doi);
        pub.graphical_abstract=image;pub.graphical_abstract_kind=item.kind;found++;
        console.log(`${item.kind}: ${doi} -> ${image}`);break;
      }catch(error){console.warn(`Visual rejected for ${doi}: ${error.message}`)}
    }
  }
  if(found)await writeData(PUBLICATIONS_FILE,'LAB_PUBLICATION_DATA',data);
  console.log(`Updated ${found} publication images. Unavailable publisher images were not fabricated.`);
}
if(import.meta.url===`file://${process.argv[1]}`)await main();
