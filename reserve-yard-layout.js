// Metres, Three.js Y-up. Shared by the interactive yard and its still renders.
export const YARD_PARKING={'20':[1,.012,1.2],'16':[-2,.012,-3.6]};
export const YARD_VIEW_DIRECTION=[-.58,.045,1];
export const YARD_FOV=36;
export const YARD_MATERIALS={
 asphalt:{color:0x454a4c,roughness:.96},concrete:{color:0x8d908b,roughness:.9},
 wall:{color:0x737c7c,roughness:.86},cladding:{color:0x879393,roughness:.64,metalness:.28},
 rib:{color:0x788384,roughness:.65,metalness:.3},door:{color:0x526268,roughness:.6,metalness:.28},
 trim:{color:0x2c383d,roughness:.62,metalness:.2},rubber:{color:0x20292d,roughness:.94},
 yellow:{color:0xb99a40,roughness:.75},line:{color:0xb4b7ae,roughness:.97},
 pipe:{color:0x6b7778,roughness:.45,metalness:.65},wood:{color:0x796c51,roughness:.95},
 glass:{color:0x293c45,roughness:.27,metalness:.35}
};
export function yardLayout(){
 const items=[];
 const box=(name,material,position,size)=>items.push({name,type:'box',material,position,size});
 const cylinder=(name,material,position,radius,height)=>items.push({name,type:'cylinder',material,position,radius,height});
 box('Asphalt yard','asphalt',[0,-.08,0],[100,.16,100]);
 box('Loading apron','concrete',[0,.003,-16.5],[48,.012,8.5]);
 box('Factory lower wall','wall',[0,1.15,-22.8],[52,2.3,.5]);
 box('Factory upper wall','cladding',[0,5.3,-22.9],[52,6,.4]);
 box('Roof edge','trim',[0,8.38,-22.7],[52,.22,.6]);
 for(let x=-25.5;x<=26;x+=.5)box('Cladding seam','rib',[x,5.3,-22.66],[.045,5.9,.065]);
 for(const x of [-18,-9,0,9,18]){
  box('Dock surround','rubber',[x,2.25,-22.45],[4.6,4.5,.32]);
  box('Roller door','door',[x,2.25,-22.24],[3.95,4.25,.09]);
  for(let y=.35;y<4.4;y+=.27)box('Roller door joint','trim',[x,y,-22.17],[3.92,.018,.02]);
  box('Door lintel','trim',[x,4.58,-22.28],[4.85,.18,.44]);
  for(const side of [-1,1]){
   cylinder('Safety bollard','yellow',[x+side*2.58,.56,-21.3],.095,1.12);
   cylinder('Bollard foot','trim',[x+side*2.58,.12,-21.3],.11,.24);
   box('Dock bumper','rubber',[x+side*1.7,.45,-21.96],[.22,.9,.26]);
  }
 }
 box('Personnel door surround','trim',[23.5,1.15,-22.4],[1.35,2.3,.2]);
 box('Personnel door','door',[23.5,1.08,-22.25],[1.08,2.14,.08]);
 box('Door vision panel','glass',[23.5,1.53,-22.19],[.52,.62,.03]);
 box('Door handle','pipe',[23.87,1.05,-22.13],[.035,.21,.045]);
 for(const x of [-24,-12,12,24]){
  cylinder('Downpipe','pipe',[x,3.8,-22.22],.065,7.6);
  box('Wall light','trim',[x,5.1,-22.2],[.38,.17,.4]);
 }
 for(const x of [-12,-3,6,15])box('Parking bay line','line',[x,.006,-5],[.10,.012,10]);
 box('Parking bay end','line',[1.5,.006,-10],[27,.012,.10]);
 for(const x of [-14,18]){
  box('Wheel stop','concrete',[x,.09,-11.5],[2,.18,.22]);
  for(let layer=0;layer<3;layer++)for(let slat=0;slat<5;slat++)box('Pallet slat','wood',[x+(slat-2)*.23,.12+layer*.17,-19.8],[.19,.065,1.2]);
 }
 return items;
}
