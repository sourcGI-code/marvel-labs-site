export const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
export function storyPose(section,value){
 const p=clamp(value);
 if(section==='top')return p<.32?{scene:'opening',p:p/.32}:{scene:'cargo',p:p===1?.5:(p-.32)/.68*.5};
 if(section==='inside')return {scene:'cargo',p:.5+p*.5};
 if(section==='route')return {scene:'field',p:p<.35?p/.35*.16:p<.60?.16+(p-.35)/.25*.42:p===1?.72:.58+(p-.60)/.40*.14};
 if(section==='production')return {scene:'field',p:.58+p*(1380/1919-.58)};
 return {scene:'showroom',p};
}
export function showroomPose(section,value,portrait=false){
 const p=clamp(value);return {angle:section==='founding'?1.12-p*.45:.58+p*.42,distance:portrait?13.5:10.6,height:portrait?4.5:3.6};
}
