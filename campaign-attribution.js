// Carry campaign labels through the visitor's chosen navigation. No cookies,
// browser storage, third-party requests, click IDs or personal details are used.
export const CAMPAIGN_KEYS=['utm_source','utm_medium','utm_campaign','utm_content'];
export function readCampaign(search=''){
  const params=new URLSearchParams(search),campaign={};
  for(const key of CAMPAIGN_KEYS){
    const value=params.get(key);
    if(value&&/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value))campaign[key]=value;
  }
  return campaign;
}
export function campaignLink(href,current){
  const base=new URL(current),url=new URL(href,base);
  if(url.origin!==base.origin||href.startsWith('#')||!(/\.html$/.test(url.pathname)||url.pathname.endsWith('/')))return null;
  for(const [key,value] of Object.entries(readCampaign(base.search)))if(!url.searchParams.has(key))url.searchParams.set(key,value);
  return url.href;
}
export function installCampaignLinks(doc,location){
  if(!Object.keys(readCampaign(location.search)).length)return;
  const follow=event=>{
    const link=event.target.closest?.('a[href]');if(!link||link.hasAttribute('download'))return;
    try{const url=campaignLink(link.getAttribute('href'),location.href);if(url)link.href=url;}catch{/* A non-navigation link keeps its original behavior. */}
  };
  doc.addEventListener('click',follow);doc.addEventListener('auxclick',follow);
}
