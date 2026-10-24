import {applyDesign,applyFraming} from './page-design.js?v=1';
// Saved text, formatting, and composition are shared by local previews.
// The overrides file sits beside this module, so pages under /marvel/ (and hosts that serve the site from a subpath) resolve it from the module URL rather than the page URL.
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
// The page key is relative to where this module is served from, so saved edits apply when the site lives under a
// subpath (GitHub Pages /marvel-labs-site/) as well as at a root.
const siteRoot=new URL('.',import.meta.url).pathname;
const page=('/'+(location.pathname.startsWith(siteRoot)?location.pathname.slice(siteRoot.length):location.pathname.replace(/^\//,''))).replace(/index\.html$/,'');
const properties=['fontSize','fontWeight','fontStyle','fontFamily','color','textAlign','lineHeight','letterSpacing'];
const records=new WeakMap();
let documentData={version:1,entries:{}},revision='',observer,queued=false;
let resolveReady;export const ready=new Promise(resolve=>{resolveReady=resolve;});
export const textOf=el=>{
 const clone=el.cloneNode(true);clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
 return clone.textContent.replace(/[\t ]+/g,' ').trim();
};
export function selectorFor(el){
 if(el.id)return '#'+CSS.escape(el.id);
 const parts=[];
 while(el&&el!==document.body){
  if(el.id){parts.unshift('#'+CSS.escape(el.id));break;}
  const siblings=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);
  parts.unshift(el.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(el)+1})`);el=el.parentElement;
 }
 return parts.join(' > ');
}
const keyFor=(selector,source)=>{
 let n=2166136261;for(const ch of page+'|'+selector+'|'+source)n=Math.imul(n^ch.charCodeAt(0),16777619);
 return 'text-'+(n>>>0).toString(16);
};
function original(el){
 const record=records.get(el);
 if(record&&textOf(el)===record.output)return record;
 if(record){for(const p of properties)el.style[p]=record.styles[p];for(const p of ['color','font-weight','font-style','font-family'])el.removeAttribute('data-page-edit-'+p);}
 const next={source:textOf(el),html:el.innerHTML,styles:Object.fromEntries(properties.map(p=>[p,el.style[p]])),output:textOf(el)};
 records.set(el,next);return next;
}
export function describe(el){
 const base=original(el),selector=selectorFor(el),key=keyFor(selector,base.source);
 return {key,entry:documentData.entries[key]||{page,selector,source:base.source,styles:{}},base};
}
function paint(el,entry){
 const base=original(el);
 if(base.source!==entry.source)return;
 const next=entry.text??base.source;
 if(entry.text!==undefined&&textOf(el)!==next){
  const nodes=[];next.split('\n').forEach((line,i)=>{if(i)nodes.push(document.createElement('br'));nodes.push(document.createTextNode(line));});el.replaceChildren(...nodes);
 }
 for(const p of properties){const value=entry.styles?.[p]??base.styles[p];if(el.style[p]!==value)el.style[p]=value;}
 for(const [p,attr] of [['color','color'],['fontWeight','font-weight'],['fontStyle','font-style'],['fontFamily','font-family']])el.toggleAttribute('data-page-edit-'+attr,entry.styles?.[p]!==undefined);
 base.output=textOf(el);
}
export function apply(){
 for(const entry of Object.values(documentData.entries)){
  if(entry.page!==page)continue;
  let el;try{el=document.querySelector(entry.selector);}catch{continue;}
  if(el&&!el.closest('#visual-editor'))paint(el,entry);
 }
 applyFraming(documentData.design,page);
}
export const getDesign=()=>structuredClone(documentData.design||{});
export function setDesign(design){documentData.design=structuredClone(design);applyDesign(documentData.design,page);}
export function update(el,entry){const {key}=describe(el);documentData.entries[key]=entry;paint(el,entry);return key;}
export function reset(el){
 const {key,base}=describe(el);delete documentData.entries[key];el.innerHTML=base.html;
 for(const p of properties)el.style[p]=base.styles[p];for(const p of ['color','font-weight','font-style','font-family'])el.removeAttribute('data-page-edit-'+p);base.output=textOf(el);
}
export async function save(){
 const response=await fetch('__editor/save',{method:'POST',headers:{'Content-Type':'application/json','X-Marvel-Editor':'1','If-Match':revision},body:JSON.stringify(documentData)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Save failed');revision=result.revision;
}
async function start(){
 const style=document.createElement('style');style.textContent=['color','font-weight','font-style','font-family'].map(p=>`[data-page-edit-${p}] *{${p}:inherit!important}`).join('');document.head.append(style);
 try{
  const response=await fetch(new URL('editor-overrides.json',import.meta.url),{cache:'no-cache'});
  if(response.ok){const raw=await response.text();documentData=JSON.parse(raw);revision=response.headers.get('ETag')||'';}
 }catch(error){console.warn('Saved page edits could not be loaded',error);}
 apply();applyDesign(documentData.design,page);
 resolveReady();
 addEventListener('resize',()=>applyFraming(documentData.design,page));
 observer=new MutationObserver(changes=>{
  if(queued||changes.every(m=>m.target.nodeType===1&&m.target.closest?.('#visual-editor')))return;
  queued=true;requestAnimationFrame(()=>{queued=false;apply();});
 });observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 if(local&&new URLSearchParams(location.search).has('edit')){
  const editor=await import('./editor-ui.js?v=10');editor.openEditor({describe,update,reset,save,textOf,getDesign,setDesign,page});
 }else if(local&&!document.body.hasAttribute('data-trailer-studio')){
  const link=document.createElement('a');link.id='local-page-editor-link';const url=new URL(location.href);url.searchParams.set('edit','1');link.href=url.href;link.textContent='Edit this page';
  const css=document.createElement('style');css.textContent='#local-page-editor-link{position:fixed;bottom:16px;left:16px;z-index:10000;padding:10px 15px;background:#eff5f2;color:#18392f;border:1px solid #52746c;border-radius:30px;font:600 12px system-ui;box-shadow:0 3px 18px #0003;text-decoration:none}#local-page-editor-link:focus-visible{outline:3px solid #4dd8e8;outline-offset:3px}';document.head.append(css);document.body.append(link);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
