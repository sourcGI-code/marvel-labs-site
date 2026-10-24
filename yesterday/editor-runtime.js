// Saved text and formatting are shared by the local and hosted website.
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const page=location.pathname.replace(/index\.html$/,'');
const properties=['fontSize','fontWeight','fontStyle','fontFamily','color','textAlign','lineHeight','letterSpacing'];
const records=new WeakMap();
let documentData={version:1,entries:{}},revision='',observer,queued=false;
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
}
export function update(el,entry){const {key}=describe(el);documentData.entries[key]=entry;paint(el,entry);return key;}
export function reset(el){
 const {key,base}=describe(el);delete documentData.entries[key];el.innerHTML=base.html;
 for(const p of properties)el.style[p]=base.styles[p];for(const p of ['color','font-weight','font-style','font-family'])el.removeAttribute('data-page-edit-'+p);base.output=textOf(el);
}
export async function save(){
 const response=await fetch('../__editor/save',{method:'POST',headers:{'Content-Type':'application/json','X-Marvel-Editor':'1','If-Match':revision},body:JSON.stringify(documentData)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Save failed');revision=result.revision;
}
async function start(){
 const style=document.createElement('style');style.textContent=['color','font-weight','font-style','font-family'].map(p=>`[data-page-edit-${p}] *{${p}:inherit!important}`).join('');document.head.append(style);
 try{
  const response=await fetch('../editor-overrides.json',{cache:'no-cache'});
  if(response.ok){const raw=await response.text();documentData=JSON.parse(raw);revision=response.headers.get('ETag')||'';}
 }catch(error){console.warn('Saved page edits could not be loaded',error);}
 apply();
 observer=new MutationObserver(changes=>{
  if(queued||changes.every(m=>m.target.nodeType===1&&m.target.closest?.('#visual-editor')))return;
  queued=true;requestAnimationFrame(()=>{queued=false;apply();});
 });observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 if(local&&new URLSearchParams(location.search).has('edit')){
  const editor=await import('./editor-ui.js?v=2');editor.openEditor({describe,update,reset,save,textOf});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
