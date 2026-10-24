export const neighborhoodEnabled=()=>document.body.dataset.neighborhood==='true';
export function fieldProgress(original){const end=Number(document.body.dataset.fieldTimelineFrames)>1?Number(document.body.dataset.fieldTimelineFrames)-1:neighborhoodEnabled()?1671:1380;return Math.min(1,(neighborhoodEnabled()?Math.max(68,original*1919)+291:original*1919)/end);}
