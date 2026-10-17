import fs from 'node:fs/promises';
import vm from 'node:vm';

export const PUBLICATIONS_FILE='assets/publications.js';
export const METRICS_FILE='assets/journal-metrics.js';
export const AUTHOR_ORCID='0000-0002-1532-7343';
export const normalizeDoi=v=>String(v||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();
export const normalizeIssn=v=>{const s=String(v||'').toUpperCase().replace(/[^0-9X]/g,'');return s.length===8?s:''};
export const journalKey=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
export const titleKey=v=>String(v||'').toLowerCase().trim().replace(/[.!?。．！？]+$/u,'').replace(/\s+/g,' ');
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function readData(path,prop){
  const content=await fs.readFile(path,'utf8');const context={window:{}};
  vm.runInNewContext(content,context,{filename:path,timeout:3000});return context.window[prop]||{};
}
export async function writeData(path,prop,object){
  await fs.writeFile(path,`window.${prop}=${JSON.stringify(object,null,2)};\n`);
}
export async function request(url,{timeout=16000,attempts=3,headers={},...opts}={}){
  let error;
  for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(url,{...opts,signal:controller.signal,headers:{'User-Agent':'CRI-Academic-Site-Update/2.0 (research profile maintenance)',...headers}});
      if(response.ok)return response;
      error=new Error(`${response.status} ${url}`);
      if(![408,429,500,502,503,504].includes(response.status))break;
    }catch(e){error=e}
    finally{clearTimeout(timer)}
    if(attempt<attempts-1)await sleep(450*(attempt+1)**2);
  }
  throw error;
}
export async function requestJson(url,opts){const response=await request(url,{...opts,headers:{Accept:'application/json',...(opts?.headers||{})}});return response.json()}
export function hasOwn(obj,key){return Object.prototype.hasOwnProperty.call(obj,key)}
