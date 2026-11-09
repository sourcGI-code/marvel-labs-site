// A radial trailer tire, in the supplied wheel's local XY plane (axle on Z).
// Keep the authored radius, width and axle locations; replace only the rubber.
export function createTireMesh(radius, halfWidth, segments=256) {
  if (!(radius>0 && halfWidth>0 && segments>=64)) throw new Error('Invalid tire dimensions');
  const side=[[.60,.78],[.63,.87],[.68,.94],[.75,.985],[.83,1],[.90,.97],[.955,.88],[.985,.76]];
  const profile=side.map(([r,z])=>({r:r*radius,z:z*halfWidth,tread:false}));
  for(let i=0;i<=48;i++){
    const z=.70-i*1.40/48;
    const groove=Math.max(...[-.36,0,.36].map(at=>Math.max(0,1-Math.abs(z-at)/.055)));
    profile.push({r:radius*(1-.008*(z/.70)**2-.014*groove),z:z*halfWidth,tread:true});
  }
  profile.push(...side.slice().reverse().map(([r,z])=>({r:r*radius,z:-z*halfWidth,tread:false})));
  const positions=[],indices=[];
  for(const p of profile)for(let i=0;i<segments;i++){
    const theta=i*2*Math.PI/segments;
    const phase=((i/segments*36+p.z/halfWidth*.7)%1+1)%1;
    const notch=p.tread?Math.max(0,1-Math.min(phase,1-phase)/.11)*radius*.005:0;
    const r=p.r-notch;
    positions.push(r*Math.cos(theta),r*Math.sin(theta),p.z);
  }
  for(let row=0;row<profile.length;row++)for(let i=0;i<segments;i++){
    const next=(i+1)%segments,a=row*segments+i,b=row*segments+next;
    const c=((row+1)%profile.length)*segments+i,d=((row+1)%profile.length)*segments+next;
    indices.push(a,c,b,b,c,d);
  }
  return {positions,indices,radius,halfWidth};
}
