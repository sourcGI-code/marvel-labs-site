export const neighborhoodEnabled=()=>document.body.dataset.neighborhood==='true';
// How it works (10-26): the tour film opens with the operator beats and the drop-off; the old field film starts
// fieldLeadFrames into it (set by original-display-framework.js from film-sources.json).
export function fieldProgress(original){const lead=Number(document.body.dataset.fieldLeadFrames)||0;const end=Number(document.body.dataset.fieldTimelineFrames)>1?Number(document.body.dataset.fieldTimelineFrames)-1:neighborhoodEnabled()?1671:1380;return Math.min(1,((neighborhoodEnabled()?Math.max(68,original*1919)+291:original*1919)+lead)/end);}
