// Interpolate wheel steps from their first frame, then settle quickly. No
// debounce, scroll interception or mandatory snapping between chapters.
export function createScrollMotion(initial=0){
 let value=initial,lastTime=0,target=initial;
 const clamp=v=>Math.max(0,Math.min(1,v));
 return {
  snap(next){value=target=clamp(next);lastTime=0;return value;},
  step(next,time,instant=false){
   target=clamp(next);
   const dt=lastTime?Math.min(.05,Math.max(0,(time-lastTime)/1000)):1/60;
   lastTime=time;
   if(instant||Math.abs(target-value)>.12)value=target;
   else value+=(target-value)*(1-Math.exp(-dt/.065));
   if(Math.abs(target-value)<.000002)value=target;
   return value;
  },
  get moving(){return value!==target;}
 };
}
