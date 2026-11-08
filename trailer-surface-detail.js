// Small, world-scaled surface variation. Geometry and silhouette stay intact.
// Derivative filtering suppresses grain once it is smaller than a screen pixel.
export function addSurfaceDetail(material,kind){
  const previous=material.onBeforeCompile;
  const frequency=kind==='rubber'?650:kind==='floor'?85:520;
  const amplitude=kind==='rubber'?.00014:kind==='floor'?.00025:.000035;
  material.onBeforeCompile=shader=>{
    previous(shader);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTrailerSurface;').replace('#include <project_vertex>','#include <project_vertex>\nvTrailerSurface=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vTrailerSurface;
float surfaceHash(vec3 p){p=fract(p*0.3183099+vec3(.13,.31,.73));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor*(.95+.10*surfaceNoise(vTrailerSurface*35.)),.04,1.);
`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 surfaceP=vTrailerSurface*${frequency.toFixed(1)};
float surfaceFilter=1.-smoothstep(.35,1.2,max(length(dFdx(surfaceP)),length(dFdy(surfaceP))));
float surfaceHeight=surfaceNoise(surfaceP)*${amplitude.toFixed(7)}*surfaceFilter;
vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
vec3 surfaceR1=cross(surfaceDy,normal),surfaceR2=cross(normal,surfaceDx);
float surfaceDet=dot(surfaceDx,surfaceR1)*faceDirection;
normal=normalize(abs(surfaceDet)*normal-sign(surfaceDet)*(dFdx(surfaceHeight)*surfaceR1+dFdy(surfaceHeight)*surfaceR2));
`);
  };
  material.customProgramCacheKey=()=>`trailer-surface-v3-${kind}`;
  material.needsUpdate=true;
}
