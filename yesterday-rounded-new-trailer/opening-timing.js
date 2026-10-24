// Retain the authored camera poses while giving the arrival a fast time budget.
// The final trailer reveal keeps its original pace in playback and scrolling.
export const arrivalTime=1.5;
export const impactPose=.46;
export const duration=15.7;
const beats=[[0,0],[arrivalTime,impactPose],[2.9,.60],[duration,1]];
const clamp=v=>Math.max(0,Math.min(1,v));
function map(value,from,to){
 const i=beats.findIndex((b,j)=>j<beats.length-1&&value<=beats[j+1][from]);
 const a=beats[Math.max(0,i)],b=beats[Math.max(0,i)+1];
 return a[to]+(b[to]-a[to])*clamp((value-a[from])/(b[from]-a[from]));
}
export const sceneProgress=p=>map(clamp(p)*duration,0,1);
export const timelineProgress=pose=>map(clamp(pose),1,0)/duration;
