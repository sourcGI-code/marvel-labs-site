// Shared metre-based shape for the live model and the editable Blender exports.
// This is illustrative geometry, not a structural engineering specification.
export function trailerChassisParts(feet){
 const length=feet*.3048,parts=[];
 for(const z of [-1.04,1.04])parts.push({name:'Main frame rail',size:[length,.15,.065],at:[0,.735,z]});
 for(let x=-length/2+.06;x<=length/2;x+=.61)parts.push({name:'Floor crossmember',size:[.045,.09,2.08],at:[x,.765,0]});
 for(const z of [-1.14,1.14])parts.push({name:'Straight lower box edge',size:[length,.13,.025],at:[0,.875,z]});
 for(const x of [-length/2,length/2])parts.push({name:'Box end edge',size:[.025,.13,2.28],at:[x,.875,0]});
 return parts;
}
export const trailerWheelCenters=feet=>[feet*.3048/2-2.08,feet*.3048/2-1.292];
export function keepTrailerWheelTriangle(points,feet){
 return trailerWheelCenters(feet).some(x=>points.every(p=>(p[0]-x)**2+(p[1]-.48)**2<=.478**2));
}
