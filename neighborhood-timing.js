export const neighborhoodEnabled=()=>document.body.dataset.neighborhood==='true';
// How it works (10-26): the tour film opens with the operator beats and the drop-off; the old field film starts
// fieldLeadFrames into it (set by original-display-framework.js from film-sources.json). Job first (owner 11-21) has
// no lead. A trimmed film (field_order.py: the aerial shortened, the drive-off cut) also carries fieldTimeMap, knots
// [timeline frame, film frame]: a chapter's place on the untrimmed timeline is carried to the film through it.
const timeMap=()=>{try{const k=JSON.parse(document.body.dataset.fieldTimeMap||'null');return Array.isArray(k)&&k.length>1?k:null;}catch{return null;}};
const throughMap=(knots,s)=>{if(!knots)return s;if(s<=knots[0][0])return knots[0][1]+s-knots[0][0];for(let i=1;i<knots.length;i++)if(s<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i];return x+(s-a)*(y-x)/(b-a);}return knots.at(-1)[1];};
export function fieldProgress(original){const lead=Number(document.body.dataset.fieldLeadFrames)||0;const end=Number(document.body.dataset.fieldTimelineFrames)>1?Number(document.body.dataset.fieldTimelineFrames)-1:neighborhoodEnabled()?1671:1380;return Math.min(1,throughMap(timeMap(),(neighborhoodEnabled()?Math.max(68,original*1919)+291:original*1919)+lead)/end);}
